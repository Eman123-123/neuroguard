"""Shared, leakage-safe ML utilities for NeuroGuard.

Everything that learns from data (imputation statistics, scaling, one-hot
categories, class weights) lives INSIDE an sklearn Pipeline, so it is fitted
only on the training portion of whatever split/fold is being used.
"""
from __future__ import annotations

import json
import os
from typing import Dict, List, Sequence

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from scipy.stats import loguniform, randint, uniform  # noqa: E402
from sklearn.compose import ColumnTransformer  # noqa: E402
from sklearn.ensemble import RandomForestClassifier  # noqa: E402
from sklearn.impute import SimpleImputer  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import (  # noqa: E402
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    log_loss,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.pipeline import Pipeline  # noqa: E402
from sklearn.preprocessing import OneHotEncoder, StandardScaler, label_binarize  # noqa: E402
from xgboost import XGBClassifier  # noqa: E402

# Order of simplicity, used by the one-standard-error model selection rule.
COMPLEXITY_RANK = {"Logistic Regression": 0, "Random Forest": 1, "XGBoost": 2}


# --------------------------------------------------------------------------- #
# Preprocessing
# --------------------------------------------------------------------------- #
def build_preprocessor(numeric: Sequence[str], categorical: Sequence[str] = (),
                       categories: Dict[str, List[str]] | None = None, scale: bool = True) -> ColumnTransformer:
    """Median imputation (+ optional scaling) for numerics; most-frequent
    imputation + one-hot for categoricals. Unknown categories at inference are
    ignored (all-zero row) instead of raising."""
    num_steps = [("impute", SimpleImputer(strategy="median"))]
    if scale:
        num_steps.append(("scale", StandardScaler()))
    transformers = [("num", Pipeline(num_steps), list(numeric))]
    if categorical:
        cats = [categories[c] for c in categorical] if categories else "auto"
        transformers.append((
            "cat",
            Pipeline([
                ("impute", SimpleImputer(strategy="most_frequent")),
                ("onehot", OneHotEncoder(categories=cats, handle_unknown="ignore")),
            ]),
            list(categorical),
        ))
    return ColumnTransformer(transformers, remainder="drop", verbose_feature_names_out=False)


def candidate_models(seed: int, n_classes: int, numeric, categorical=(), categories=None):
    """Return {name: (Pipeline, param_distributions)}.

    Logistic Regression is the interpretable baseline. Random Forest and XGBoost
    are the two tree-ensemble families. HistGradientBoosting/LightGBM were
    deliberately NOT added: they are a third gradient-boosted-tree variant on a
    ~10-feature tabular problem and add no scientific information over XGBoost.
    Imbalance is mild (<=2.5:1). LR/RF use class_weight='balanced'; XGBoost is
    trained unweighted (it has no multiclass class_weight) and its per-class
    recall is reported so any bias stays visible. No resampling/SMOTE is used,
    which keeps validation folds free of synthetic points.
    """
    multi = n_classes > 2
    lr = Pipeline([
        ("prep", build_preprocessor(numeric, categorical, categories, scale=True)),
        ("clf", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=seed)),
    ])
    rf = Pipeline([
        ("prep", build_preprocessor(numeric, categorical, categories, scale=False)),
        ("clf", RandomForestClassifier(class_weight="balanced", random_state=seed, n_jobs=1)),
    ])
    xgb_kwargs = dict(random_state=seed, n_jobs=1, tree_method="hist", eval_metric="mlogloss" if multi else "logloss")
    xgb = Pipeline([
        ("prep", build_preprocessor(numeric, categorical, categories, scale=False)),
        ("clf", XGBClassifier(**xgb_kwargs)),
    ])
    return {
        "Logistic Regression": (lr, {"clf__C": loguniform(1e-2, 1e2)}),
        "Random Forest": (rf, {
            "clf__n_estimators": randint(150, 400),
            "clf__max_depth": randint(3, 14),
            "clf__min_samples_leaf": randint(2, 15),
            "clf__max_features": uniform(0.3, 0.6),
        }),
        "XGBoost": (xgb, {
            "clf__n_estimators": randint(80, 300),
            "clf__max_depth": randint(2, 6),
            "clf__learning_rate": loguniform(0.02, 0.3),
            "clf__subsample": uniform(0.6, 0.4),
            "clf__colsample_bytree": uniform(0.6, 0.4),
            "clf__min_child_weight": randint(1, 10),
            "clf__reg_lambda": loguniform(0.1, 10),
        }),
    }


def select_by_one_se(cv_results: Dict[str, Dict[str, float]]) -> str:
    """One-standard-error rule: among models whose CV score is within 1 SE of
    the best, pick the simplest. Guards against choosing a complex model for a
    difference that is within noise."""
    best = max(cv_results, key=lambda k: cv_results[k]["cv_mean"])
    threshold = cv_results[best]["cv_mean"] - cv_results[best]["cv_se"]
    eligible = [k for k, v in cv_results.items() if v["cv_mean"] >= threshold]
    return min(eligible, key=lambda k: COMPLEXITY_RANK.get(k, 99))


# --------------------------------------------------------------------------- #
# Metrics
# --------------------------------------------------------------------------- #
def expected_calibration_error(y_true, proba, n_bins: int = 10) -> float:
    """Multiclass ECE on the top-label confidence."""
    conf = proba.max(axis=1)
    pred = proba.argmax(axis=1)
    correct = (pred == np.asarray(y_true)).astype(float)
    bins = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for lo, hi in zip(bins[:-1], bins[1:]):
        m = (conf > lo) & (conf <= hi)
        if m.any():
            ece += m.mean() * abs(correct[m].mean() - conf[m].mean())
    return float(ece)


def evaluate(y_true, proba, class_names: Sequence[str]) -> dict:
    """Full evaluation from predicted probabilities (n_samples x n_classes)."""
    y_true = np.asarray(y_true)
    proba = np.asarray(proba)
    k = len(class_names)
    y_pred = proba.argmax(axis=1)
    labels = list(range(k))
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    y_bin = label_binarize(y_true, classes=labels)
    if k == 2:
        y_bin = np.column_stack([1 - y_bin[:, 0], y_bin[:, 0]])

    per_class = {}
    for i, name in enumerate(class_names):
        tp = cm[i, i]
        fn = cm[i].sum() - tp
        fp = cm[:, i].sum() - tp
        tn = cm.sum() - tp - fn - fp
        per_class[name] = {
            "precision": float(tp / (tp + fp)) if tp + fp else 0.0,
            "recall_sensitivity": float(tp / (tp + fn)) if tp + fn else 0.0,
            "specificity": float(tn / (tn + fp)) if tn + fp else 0.0,
            "f1": float(2 * tp / (2 * tp + fp + fn)) if (2 * tp + fp + fn) else 0.0,
            "roc_auc": float(roc_auc_score(y_bin[:, i], proba[:, i])),
            "average_precision": float(average_precision_score(y_bin[:, i], proba[:, i])),
            "support": int(cm[i].sum()),
        }
    out = {
        "n": int(len(y_true)),
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "precision_macro": float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
        "specificity_macro": float(np.mean([v["specificity"] for v in per_class.values()])),
        "f1_macro": float(f1_score(y_true, y_pred, average="macro")),
        "roc_auc_macro_ovr": float(np.mean([v["roc_auc"] for v in per_class.values()])),
        "average_precision_macro": float(np.mean([v["average_precision"] for v in per_class.values()])),
        "log_loss": float(log_loss(y_true, proba, labels=labels)),
        "brier_score": float(np.mean([brier_score_loss(y_bin[:, i], proba[:, i]) for i in range(k)])),
        "expected_calibration_error": expected_calibration_error(y_true, proba),
        "confusion_matrix": cm.tolist(),
        "class_names": list(class_names),
        "per_class": per_class,
    }
    if k == 2:  # report positive-class values under standard names too
        out["roc_auc"] = per_class[class_names[1]]["roc_auc"]
        out["sensitivity"] = per_class[class_names[1]]["recall_sensitivity"]
        out["specificity"] = per_class[class_names[1]]["specificity"]
        out["precision"] = per_class[class_names[1]]["precision"]
        out["f1"] = per_class[class_names[1]]["f1"]
    return out


def bootstrap_ci(y_true, proba, groups=None, metric="roc_auc_macro_ovr", class_names=None,
                 n_boot: int = 1000, seed: int = 0):
    """Percentile bootstrap CI. If `groups` is given, resamples whole subjects
    (cluster bootstrap) so repeated visits of one person are not treated as
    independent."""
    rng = np.random.default_rng(seed)
    y_true = np.asarray(y_true)
    proba = np.asarray(proba)
    k = proba.shape[1]
    class_names = class_names or [str(i) for i in range(k)]
    if groups is None:
        units = [np.array([i]) for i in range(len(y_true))]
    else:
        groups = np.asarray(groups)
        units = [np.where(groups == g)[0] for g in np.unique(groups)]
    vals = []
    for _ in range(n_boot):
        pick = rng.integers(0, len(units), len(units))
        idx = np.concatenate([units[i] for i in pick])
        if len(np.unique(y_true[idx])) < k:
            continue
        vals.append(evaluate(y_true[idx], proba[idx], class_names)[metric])
    lo, hi = np.percentile(vals, [2.5, 97.5])
    return float(lo), float(hi)


# --------------------------------------------------------------------------- #
# Plots
# --------------------------------------------------------------------------- #
def _save(fig, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)


def plot_confusion_matrix(cm, class_names, path, title="Confusion matrix"):
    cm = np.asarray(cm)
    fig, ax = plt.subplots(figsize=(5.2, 4.4))
    ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(class_names)), class_names, rotation=20)
    ax.set_yticks(range(len(class_names)), class_names)
    thresh = cm.max() / 2 if cm.max() else 1
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, int(cm[i, j]), ha="center", va="center", color="white" if cm[i, j] > thresh else "black")
    ax.set_xlabel("Predicted")
    ax.set_ylabel("True")
    ax.set_title(title)
    _save(fig, path)


def plot_roc_pr(y_true, proba, class_names, roc_path, pr_path, subtitle=""):
    y_true = np.asarray(y_true)
    k = len(class_names)
    y_bin = label_binarize(y_true, classes=list(range(k)))
    if k == 2:
        y_bin = np.column_stack([1 - y_bin[:, 0], y_bin[:, 0]])
    fig, ax = plt.subplots(figsize=(5.4, 4.6))
    for i, name in enumerate(class_names):
        fpr, tpr, _ = roc_curve(y_bin[:, i], proba[:, i])
        ax.plot(fpr, tpr, label=f"{name} (AUC {roc_auc_score(y_bin[:, i], proba[:, i]):.3f})")
    ax.plot([0, 1], [0, 1], "k--", lw=0.8)
    ax.set_xlabel("1 - Specificity (False-positive rate)")
    ax.set_ylabel("Sensitivity (True-positive rate)")
    ax.set_title(f"ROC curves (one-vs-rest) {subtitle}".strip())
    ax.legend(loc="lower right", fontsize=8)
    _save(fig, roc_path)

    fig, ax = plt.subplots(figsize=(5.4, 4.6))
    for i, name in enumerate(class_names):
        p, r, _ = precision_recall_curve(y_bin[:, i], proba[:, i])
        ax.plot(r, p, label=f"{name} (AP {average_precision_score(y_bin[:, i], proba[:, i]):.3f})")
        ax.axhline(y_bin[:, i].mean(), color="grey", lw=0.5, ls=":")
    ax.set_xlabel("Recall (Sensitivity)")
    ax.set_ylabel("Precision")
    ax.set_title(f"Precision-Recall curves {subtitle}".strip())
    ax.legend(loc="lower left", fontsize=8)
    _save(fig, pr_path)


def plot_calibration(y_true, proba, path, n_bins=10):
    y_true = np.asarray(y_true)
    conf = proba.max(axis=1)
    correct = (proba.argmax(axis=1) == y_true).astype(float)
    bins = np.linspace(0, 1, n_bins + 1)
    xs, ys = [], []
    for lo, hi in zip(bins[:-1], bins[1:]):
        m = (conf > lo) & (conf <= hi)
        if m.sum() >= 5:
            xs.append(conf[m].mean())
            ys.append(correct[m].mean())
    fig, ax = plt.subplots(figsize=(4.8, 4.4))
    ax.plot([0, 1], [0, 1], "k--", lw=0.8, label="Perfect")
    ax.plot(xs, ys, "o-", label="Model")
    ax.set_xlabel("Mean predicted confidence")
    ax.set_ylabel("Observed accuracy")
    ax.set_title("Reliability (calibration) diagram")
    ax.legend()
    _save(fig, path)


def plot_importance(names, means, stds, path, title="Permutation importance (macro-F1 drop)"):
    order = np.argsort(means)
    fig, ax = plt.subplots(figsize=(6, 4.4))
    ax.barh(np.array(names)[order], np.array(means)[order], xerr=np.array(stds)[order], color="#2563eb")
    ax.set_title(title)
    _save(fig, path)


def dump_json(obj, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        json.dump(obj, fh, indent=2)
