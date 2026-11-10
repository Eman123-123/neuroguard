"""Training pipeline for the digital-screening risk model (3-class, ordinal).

!!! Trained on SYNTHETIC data (see generate_cognitive_dataset.py). The reported
metrics measure how well the pipeline recovers the generator's rules; they are
NOT clinical performance estimates and the artifact is stamped accordingly. !!!

Protocol (no information from the test split is used for any decision):
  1. Stratified 80/20 train/test split. Test set is touched once, at the end.
  2. Reference baselines: prior-only Dummy and AD8-only logistic regression.
  3. Candidates (LR, RF, XGBoost) are tuned with RandomizedSearchCV using
     stratified 5-fold CV on the TRAINING split only. All preprocessing sits in
     the pipeline, so it is re-fitted inside every fold.
  4. Model choice: one-standard-error rule on CV macro-F1 (simplest model within
     1 SE of the best).
  5. Probability calibration (sigmoid) kept only if it lowers out-of-fold
     log-loss on the training split.
  6. Single evaluation on the held-out test split + a harder, overlapping
     "stress" dataset (different seed, class separation reduced).
  7. Artifact + SHA-256 manifest + plots + JSON report are written.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import warnings
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.dummy import DummyClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import log_loss
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, cross_val_predict, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline

import common as C
from generate_cognitive_dataset import generate

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(HERE, "data", "synthetic_cognitive_screening.csv")
MODEL_DIR = os.path.join(HERE, "saved_models")
REPORT_DIR = os.path.join(HERE, "reports", "risk_model")

NUMERIC = [
    "age", "education_years", "ad8_score",
    "card_match_moves", "card_match_time_sec", "card_match_error_rate",
    "stroop_accuracy", "stroop_avg_reaction_ms", "stroop_interference_ms",
    "sequence_max_span",
]
CATEGORICAL = ["family_history"]
# 'unknown' is its own category: ordinal-encoding it between 'no' and 'yes'
# (as the previous version did) invents an ordering that does not exist.
CATEGORIES = {"family_history": ["no", "unknown", "yes"]}
FEATURES = NUMERIC + CATEGORICAL
TARGET = "risk_level"
CLASS_NAMES = ["Low Risk", "Moderate Risk", "High Risk"]
ARTIFACT_NAME = "cognitive_risk_model.joblib"


def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _cv_stats(pipe, X, y, cv):
    s = cross_val_score(pipe, X, y, cv=cv, scoring="f1_macro")
    return {"cv_mean": float(s.mean()), "cv_sd": float(s.std(ddof=1)), "cv_se": float(s.std(ddof=1) / np.sqrt(len(s)))}


def run(data_path=DATA_PATH, model_dir=MODEL_DIR, report_dir=REPORT_DIR, seed=42, n_iter=12, cv_folds=5, verbose=True):
    log = print if verbose else (lambda *a, **k: None)
    warnings.filterwarnings("ignore")

    df = pd.read_csv(data_path)
    meta_path = data_path.replace(".csv", ".meta.json")
    data_meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {"synthetic": None}
    is_synth = bool(data_meta.get("synthetic", True))  # unknown provenance is treated as synthetic
    X, y = df[FEATURES], df[TARGET].astype(int)

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.20, random_state=seed, stratify=y)
    log(f"train={len(X_tr)} test={len(X_te)} | synthetic={is_synth}")
    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=seed)

    # ---- reference baselines --------------------------------------------------
    baselines = {}
    dummy = Pipeline([("prep", C.build_preprocessor(NUMERIC, CATEGORICAL, CATEGORIES)), ("clf", DummyClassifier(strategy="prior"))])
    ad8_only = Pipeline([("prep", C.build_preprocessor(["ad8_score"], [], None)), ("clf", LogisticRegression(max_iter=1000, class_weight="balanced"))])
    for name, pipe, cols in (("Prior-only (Dummy)", dummy, FEATURES), ("AD8-only Logistic Regression", ad8_only, ["ad8_score"])):
        stats = _cv_stats(pipe, X_tr[cols], y_tr, cv)
        pipe.fit(X_tr[cols], y_tr)
        baselines[name] = {**stats, "test": C.evaluate(y_te, pipe.predict_proba(X_te[cols]), CLASS_NAMES)}
        log(f"[baseline] {name}: CV F1 {stats['cv_mean']:.3f}")

    # ---- candidate search (training split only) -------------------------------
    searched, cv_summary = {}, {}
    for name, (pipe, dist) in C.candidate_models(seed, 3, NUMERIC, CATEGORICAL, CATEGORIES).items():
        search = RandomizedSearchCV(pipe, dist, n_iter=n_iter, cv=cv, scoring="f1_macro", random_state=seed, n_jobs=1, refit=True)
        search.fit(X_tr, y_tr)
        i = search.best_index_
        sd = float(search.cv_results_["std_test_score"][i])
        cv_summary[name] = {"cv_mean": float(search.best_score_), "cv_sd": sd, "cv_se": sd / np.sqrt(cv_folds),
                            "best_params": {k: (float(v) if isinstance(v, (np.floating, float)) else int(v) if isinstance(v, (np.integer, int)) else v)
                                            for k, v in search.best_params_.items()}}
        searched[name] = search.best_estimator_
        log(f"[search] {name}: CV macro-F1 {cv_summary[name]['cv_mean']:.4f} +/- {sd:.4f}")

    chosen = C.select_by_one_se(cv_summary)
    log(f"[selection] one-SE rule chose: {chosen}")
    best_pipe = searched[chosen]

    # ---- calibration decision (out-of-fold, training split only) -------------
    inner = StratifiedKFold(n_splits=3, shuffle=True, random_state=seed + 1)
    raw_oof = cross_val_predict(clone(best_pipe), X_tr, y_tr, cv=inner, method="predict_proba")
    cal_candidate = CalibratedClassifierCV(clone(best_pipe), method="sigmoid", cv=3)
    cal_oof = cross_val_predict(cal_candidate, X_tr, y_tr, cv=inner, method="predict_proba")
    ll_raw, ll_cal = log_loss(y_tr, raw_oof), log_loss(y_tr, cal_oof)
    use_cal = ll_cal < ll_raw - 0.002
    final = CalibratedClassifierCV(clone(best_pipe), method="sigmoid", cv=5) if use_cal else clone(best_pipe)
    final.fit(X_tr, y_tr)
    log(f"[calibration] OOF logloss raw={ll_raw:.4f} sigmoid={ll_cal:.4f} -> {'calibrated' if use_cal else 'raw'}")

    # ---- one-time test evaluation ---------------------------------------------
    proba_te = final.predict_proba(X_te)
    test_metrics = C.evaluate(y_te, proba_te, CLASS_NAMES)
    ci = {m: C.bootstrap_ci(y_te.values, proba_te, metric=m, class_names=CLASS_NAMES, n_boot=500, seed=seed)
          for m in ("accuracy", "f1_macro", "roc_auc_macro_ovr")}
    log(f"[test] acc={test_metrics['accuracy']:.4f} F1={test_metrics['f1_macro']:.4f} AUC={test_metrics['roc_auc_macro_ovr']:.4f}")

    # Generator ceiling: with adjacent-label noise p, no classifier can exceed ~1-p accuracy
    noise = (data_meta.get("parameters") or {}).get("label_noise", 0.04)
    ceiling = 1.0 - noise

    # ---- stress test: overlapping classes, new seed ---------------------------
    stress_df = generate(n_samples=2000, seed=seed + 1000, separation=0.6, label_noise=noise)
    stress = C.evaluate(stress_df[TARGET], final.predict_proba(stress_df[FEATURES]), CLASS_NAMES)
    log(f"[stress separation=0.6] acc={stress['accuracy']:.4f} F1={stress['f1_macro']:.4f}")

    # ---- global importance (held-out) -----------------------------------------
    imp = permutation_importance(final, X_te, y_te, scoring="f1_macro", n_repeats=10, random_state=seed, n_jobs=1)
    importance = sorted(
        [{"feature": f, "importance_mean": float(m), "importance_sd": float(s)} for f, m, s in zip(FEATURES, imp.importances_mean, imp.importances_std)],
        key=lambda r: -r["importance_mean"],
    )

    # ---- plots ------------------------------------------------------------------
    os.makedirs(report_dir, exist_ok=True)
    tag = "SYNTHETIC DATA" if is_synth else ""
    C.plot_confusion_matrix(test_metrics["confusion_matrix"], CLASS_NAMES, os.path.join(report_dir, "confusion_matrix.png"), f"Confusion matrix (test) {tag}".strip())
    C.plot_roc_pr(y_te, proba_te, CLASS_NAMES, os.path.join(report_dir, "roc_curve.png"), os.path.join(report_dir, "pr_curve.png"), f"[{tag}]" if tag else "")
    C.plot_calibration(y_te, proba_te, os.path.join(report_dir, "calibration.png"))
    C.plot_importance([r["feature"] for r in importance], [r["importance_mean"] for r in importance], [r["importance_sd"] for r in importance], os.path.join(report_dir, "feature_importance.png"))

    # ---- artifact ----------------------------------------------------------------
    trained_at = datetime.now(timezone.utc).isoformat()
    validation_status = "SYNTHETIC_PROTOTYPE_NOT_CLINICALLY_VALIDATED" if is_synth else "RETROSPECTIVE_INTERNAL_VALIDATION_ONLY"
    report = {
        "model_name": chosen,
        "validation_status": validation_status,
        "task": "3-class ordinal screening risk (Low / Moderate / High)",
        "data_provenance": data_meta,
        "split": {"n_train": int(len(X_tr)), "n_test": int(len(X_te)), "stratified": True, "seed": seed, "cv_folds": cv_folds},
        "selection": {"rule": "one-standard-error on CV macro-F1 (training split only)", "cv": cv_summary, "chosen": chosen,
                      "calibration": {"used": bool(use_cal), "oof_logloss_raw": float(ll_raw), "oof_logloss_sigmoid": float(ll_cal)}},
        "baselines": baselines,
        "test_metrics": test_metrics,
        "test_metrics_95ci_bootstrap": ci,
        "stress_test_overlapping_classes": {"separation": 0.6, "metrics": stress},
        "generator_accuracy_ceiling": ceiling,
        "feature_importance_permutation": importance,
        "interpretation": (
            "Test accuracy is bounded by the label-noise ceiling of the generator and the held-out set shares the "
            "generator's distribution, so these numbers demonstrate pipeline correctness, not diagnostic accuracy."
            if is_synth else "Internal retrospective validation; external validation is required before any clinical claim."
        ),
        "plots": {k: f"{k}.png" for k in ("confusion_matrix", "roc_curve", "pr_curve", "calibration", "feature_importance")},
    }
    C.dump_json(report, os.path.join(report_dir, "model_report.json"))

    os.makedirs(model_dir, exist_ok=True)
    artifact_path = os.path.join(model_dir, ARTIFACT_NAME)
    joblib.dump({
        "pipeline": final,
        "model_name": chosen,
        "numeric_features": NUMERIC,
        "categorical_features": CATEGORICAL,
        "feature_columns": FEATURES,
        "class_names": CLASS_NAMES,
        "validation_status": validation_status,
        "trained_at": trained_at,
        "versions": {"python": platform.python_version(), "scikit-learn": sklearn.__version__},
        "data_provenance": data_meta,
        "headline_metrics": {k: test_metrics[k] for k in ("accuracy", "f1_macro", "roc_auc_macro_ovr", "balanced_accuracy")},
    }, artifact_path)
    manifest = {"artifact": ARTIFACT_NAME, "sha256": _sha256(artifact_path), "trained_at": trained_at, "validation_status": validation_status}
    C.dump_json(manifest, os.path.join(model_dir, "cognitive_risk_model.manifest.json"))
    log("saved:", artifact_path)
    return report


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=DATA_PATH)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--n-iter", type=int, default=12)
    a = ap.parse_args()
    run(a.data, seed=a.seed, n_iter=a.n_iter)
