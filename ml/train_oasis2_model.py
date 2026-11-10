"""Train/evaluate a dementia-vs-nondemented model on REAL OASIS-2 tabular data.

    python train_oasis2_model.py --csv /path/to/oasis_longitudinal_demographics.csv

The CSV is NOT shipped with this repository and cannot be: OASIS requires every
user to sign the OASIS Data Use Agreement (https://sites.wustl.edu/oasisbrains/)
and forbids redistribution. Apply, download OASIS-2 yourself, and acknowledge it:
  "Data were provided [in part] by OASIS-2: Longitudinal: Principal Investigators:
   D. Marcus, R. Buckner, J. Csernansky, J. Morris; P50 AG05681, P01 AG03991,
   P01 AG026276, R01 AG021910, P20 MH071616, U24 RR021382"

Methodological safeguards
-------------------------
* Repeated visits: 373 sessions come from only 150 subjects. All splitting is
  SUBJECT-grouped (StratifiedGroupKFold), asserted disjoint at runtime.
* Label := (CDR > 0). CDR is therefore EXCLUDED from the features (it defines
  the label). ASF is dropped if it is (near-)deterministically related to eTIV.
* Two feature sets are reported separately because they answer different questions:
    - "demographics_mri":  Age, Sex, Education, SES, eTIV, nWBV     (no cognitive test)
    - "plus_mmse":         the above + MMSE (clinician-administered cognitive test;
                           strongly entangled with the clinical dementia rating,
                           so performance here is expected to be optimistic).
* Nested CV: hyper-parameters are tuned in an inner grouped CV inside every
  outer training fold; outer folds are used only for scoring.
* Controls: prior-only baseline and Age-only baseline (nWBV declines with age, so
  a brain-volume model must beat Age alone to claim any added value).
* Uncertainty: subject-cluster bootstrap 95% CIs on pooled out-of-fold predictions.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import warnings
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import RandomizedSearchCV, StratifiedGroupKFold
from sklearn.pipeline import Pipeline

import common as C

HERE = os.path.dirname(os.path.abspath(__file__))
CLASS_NAMES = ["Nondemented (CDR=0)", "Demented (CDR>0)"]

ALIASES = {
    "subject id": "subject_id", "subject_id": "subject_id",
    "m/f": "sex", "sex": "sex", "gender": "sex",
    "age": "age", "educ": "educ", "education": "educ",
    "ses": "ses", "mmse": "mmse", "cdr": "cdr",
    "etiv": "etiv", "nwbv": "nwbv", "asf": "asf", "visit": "visit", "group": "group",
}
REQUIRED = ["subject_id", "sex", "age", "educ", "ses", "mmse", "cdr", "etiv", "nwbv", "asf"]


def load_oasis2(csv_path: str | None = None, df: pd.DataFrame | None = None, first_visit_only: bool = False) -> pd.DataFrame:
    raw = df.copy() if df is not None else pd.read_csv(csv_path)
    raw.columns = [ALIASES.get(str(c).strip().lower(), str(c).strip().lower()) for c in raw.columns]
    missing = [c for c in REQUIRED if c not in raw.columns]
    if missing:
        raise ValueError(
            f"OASIS-2 file is missing required columns {missing}. Found: {list(raw.columns)}. "
            "Expected the OASIS-2 demographics sheet (Subject ID, M/F, Age, EDUC, SES, MMSE, CDR, eTIV, nWBV, ASF)."
        )
    raw["sex"] = raw["sex"].astype(str).str.strip().str.upper().str[0].map({"M": "M", "F": "F"})
    for c in ("age", "educ", "ses", "mmse", "cdr", "etiv", "nwbv", "asf"):
        raw[c] = pd.to_numeric(raw[c], errors="coerce")
    if raw["cdr"].isna().any():
        raise ValueError("CDR is missing for some rows; the label cannot be defined. Inspect and remove those rows explicitly.")
    if first_visit_only and "visit" in raw.columns:
        raw = raw.sort_values(["subject_id", "visit"]).groupby("subject_id", as_index=False).first()
    raw["y"] = (raw["cdr"] > 0).astype(int)
    return raw.reset_index(drop=True)


def feature_sets(df: pd.DataFrame):
    base_num = ["age", "educ", "ses", "etiv", "nwbv"]
    notes = []
    if abs(df[["etiv", "asf"]].corr(method="spearman").iloc[0, 1]) >= 0.98:  # rank corr: ASF=1755/eTIV is monotone but non-linear
        notes.append("ASF dropped: |Spearman(eTIV, ASF)| >= 0.98 (ASF is a deterministic transform of eTIV).")
    else:
        base_num.append("asf")
    return {
        "demographics_mri": (base_num, ["sex"]),
        "plus_mmse": (base_num + ["mmse"], ["sex"]),
    }, notes


def nested_cv(pipe, dist, X, y, groups, seed, n_outer=5, n_inner=3, n_iter=10):
    outer = StratifiedGroupKFold(n_splits=n_outer, shuffle=True, random_state=seed)
    oof = np.zeros((len(y), 2))
    folds = []
    for tr, te in outer.split(X, y, groups):
        assert set(groups[tr]).isdisjoint(groups[te]), "SUBJECT LEAKAGE between train and test fold"
        if dist:
            inner = StratifiedGroupKFold(n_splits=n_inner, shuffle=True, random_state=seed)
            model = RandomizedSearchCV(pipe, dist, n_iter=n_iter, cv=inner, scoring="roc_auc", random_state=seed, n_jobs=1)
            model.fit(X.iloc[tr], y.iloc[tr], groups=groups[tr])
        else:
            model = pipe.fit(X.iloc[tr], y.iloc[tr])
        oof[te] = model.predict_proba(X.iloc[te])
        if y.iloc[te].nunique() == 2:
            folds.append(C.evaluate(y.iloc[te], oof[te], CLASS_NAMES))
    return oof, folds


def run_on_dataframe(df: pd.DataFrame, out_dir: str, model_dir: str, seed: int = 42, n_iter: int = 10,
                     n_outer: int = 5, provenance: dict | None = None, verbose: bool = True, tag: str = "oasis2"):
    warnings.filterwarnings("ignore")
    log = print if verbose else (lambda *a, **k: None)
    if df["subject_id"].nunique() < 30 or df["y"].nunique() < 2:
        raise ValueError("Need >= 30 subjects and both classes present.")
    groups = df["subject_id"].astype(str).values
    sets, notes = feature_sets(df)
    y = df["y"]
    results = {}

    for set_name, (num, cat) in sets.items():
        cols = num + cat
        X = df[cols]
        cats = {"sex": ["F", "M"]}
        log(f"\n=== feature set: {set_name} {cols} | rows={len(df)} subjects={df.subject_id.nunique()} ===")

        dummy = Pipeline([("prep", C.build_preprocessor(num, cat, cats)), ("clf", DummyClassifier(strategy="prior"))])
        age_only = Pipeline([("prep", C.build_preprocessor(["age"], [], None)), ("clf", LogisticRegression(max_iter=1000))])
        base = {}
        for name, pipe, sub in (("Prior-only (Dummy)", dummy, X), ("Age-only Logistic Regression", age_only, X[["age"]])):
            oof, _ = nested_cv(pipe, None, sub, y, groups, seed, n_outer)
            base[name] = C.evaluate(y, oof, CLASS_NAMES)

        cand = C.candidate_models(seed, 2, num, cat, cats)
        per_model, summary = {}, {}
        for name, (pipe, dist) in cand.items():
            oof, folds = nested_cv(pipe, dist, X, y, groups, seed, n_outer, n_iter=n_iter)
            aucs = np.array([f["roc_auc"] for f in folds])
            per_model[name] = {"oof": oof, "metrics": C.evaluate(y, oof, CLASS_NAMES)}
            summary[name] = {"cv_mean": float(aucs.mean()), "cv_sd": float(aucs.std(ddof=1)), "cv_se": float(aucs.std(ddof=1) / np.sqrt(len(aucs)))}
            log(f"  {name:20s} outer-fold AUC {aucs.mean():.3f} +/- {aucs.std(ddof=1):.3f}")

        chosen = C.select_by_one_se(summary)
        oof = per_model[chosen]["oof"]
        m = per_model[chosen]["metrics"]
        ci = {k: C.bootstrap_ci(y.values, oof, groups=groups, metric=k, class_names=CLASS_NAMES, n_boot=500, seed=seed)
              for k in ("roc_auc", "accuracy", "f1_macro")}

        rdir = os.path.join(out_dir, tag, set_name)
        C.plot_confusion_matrix(m["confusion_matrix"], CLASS_NAMES, os.path.join(rdir, "confusion_matrix.png"), f"{chosen}: pooled out-of-fold")
        C.plot_roc_pr(y, oof, CLASS_NAMES, os.path.join(rdir, "roc_curve.png"), os.path.join(rdir, "pr_curve.png"), "(nested CV, OOF)")
        C.plot_calibration(y, oof, os.path.join(rdir, "calibration.png"))

        # deployable model: tune on ALL data with grouped CV
        pipe, dist = cand[chosen]
        final = RandomizedSearchCV(pipe, dist, n_iter=n_iter, cv=StratifiedGroupKFold(5, shuffle=True, random_state=seed),
                                   scoring="roc_auc", random_state=seed, n_jobs=1)
        final.fit(X, y, groups=groups)
        os.makedirs(model_dir, exist_ok=True)
        apath = os.path.join(model_dir, f"{tag}_{set_name}.joblib")
        joblib.dump({
            "pipeline": final.best_estimator_, "model_name": chosen, "feature_columns": cols,
            "class_names": CLASS_NAMES, "validation_status": "RETROSPECTIVE_INTERNAL_VALIDATION_ONLY",
            "trained_at": datetime.now(timezone.utc).isoformat(), "data_provenance": provenance or {},
        }, apath)

        results[set_name] = {
            "features": cols, "chosen_model": chosen, "selection_cv_auc": summary,
            "pooled_oof_metrics": {k: v for k, v in m.items()}, "bootstrap_95ci_subject_cluster": ci,
            "baselines_pooled_oof": base,
            "beats_age_only_auc": bool(m["roc_auc"] > base["Age-only Logistic Regression"]["roc_auc"]),
            "notes": notes + (["MMSE is a cognitive test closely tied to the clinical rating: results optimistic for screening."] if "mmse" in cols else []),
        }
    C.dump_json({"provenance": provenance, "n_rows": len(df), "n_subjects": int(df.subject_id.nunique()), "results": results},
                os.path.join(out_dir, tag, "report.json"))
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True, help="OASIS-2 demographics CSV you obtained under the OASIS DUA")
    ap.add_argument("--first-visit-only", action="store_true")
    ap.add_argument("--n-iter", type=int, default=20)
    ap.add_argument("--seed", type=int, default=42)
    a = ap.parse_args()
    with open(a.csv, "rb") as fh:
        sha = hashlib.sha256(fh.read()).hexdigest()
    df = load_oasis2(a.csv, first_visit_only=a.first_visit_only)
    prov = {"synthetic": False, "source": "OASIS-2 (Marcus et al., 2010, doi:10.1162/jocn.2009.21407)", "sha256": sha,
            "license": "OASIS Data Use Agreement (non-commercial research, no redistribution)", "first_visit_only": a.first_visit_only}
    run_on_dataframe(df, os.path.join(HERE, "reports"), os.path.join(HERE, "saved_models"), a.seed, a.n_iter, provenance=prov)


if __name__ == "__main__":
    main()
