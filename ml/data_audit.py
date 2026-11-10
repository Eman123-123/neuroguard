"""Dataset audit: quality, plausibility and leakage screening.

    python data_audit.py --csv data/synthetic_cognitive_screening.csv --target risk_level

Writes reports/data_audit_<name>.json and prints a summary. The audit is
descriptive: it flags problems, it never silently "fixes" the data.
"""
from __future__ import annotations

import argparse
import json
import os
from typing import Dict, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

# feature -> (unit, plausible_min, plausible_max). Values outside are physically
# or instrumentally impossible, not merely unusual.
FEATURE_DICTIONARY: Dict[str, Tuple[str, float, float]] = {
    "age": ("years", 18, 110),
    "education_years": ("years of schooling", 0, 30),
    "ad8_score": ("count of 'yes' items, 0-8", 0, 8),
    "card_match_moves": ("flips/attempts", 1, 500),
    "card_match_time_sec": ("seconds", 1, 3600),
    "card_match_error_rate": ("fraction 0-1", 0, 1),
    "stroop_accuracy": ("percent 0-100", 0, 100),
    "stroop_avg_reaction_ms": ("milliseconds", 150, 10000),
    "stroop_interference_ms": ("milliseconds (incongruent - congruent)", -500, 5000),
    "sequence_max_span": ("items", 1, 15),
    # OASIS-2 style columns
    "EDUC": ("years", 0, 30), "SES": ("Hollingshead 1-5", 1, 5), "MMSE": ("points 0-30", 0, 30),
    "CDR": ("0/0.5/1/2", 0, 3), "eTIV": ("mm^3", 900, 2500), "nWBV": ("fraction", 0.5, 0.9), "ASF": ("ratio", 0.5, 2.0),
    "Age": ("years", 18, 110),
}


def _iqr_outliers(s: pd.Series) -> int:
    q1, q3 = s.quantile([0.25, 0.75])
    iqr = q3 - q1
    return int(((s < q1 - 3 * iqr) | (s > q3 + 3 * iqr)).sum())  # 3*IQR = "extreme"


def audit(df: pd.DataFrame, target: str, group_col: str | None = None) -> dict:
    report: dict = {"n_rows": len(df), "n_cols": df.shape[1]}
    feats = [c for c in df.columns if c not in (target, group_col, "risk_label") and pd.api.types.is_numeric_dtype(df[c])]

    report["missing_per_column"] = {c: int(v) for c, v in df.isna().sum().items() if v}
    report["exact_duplicate_rows"] = int(df.duplicated().sum())
    feature_cols = [c for c in df.columns if c not in (target, "risk_label", "Group")]
    report["duplicate_feature_vectors_with_conflicting_labels"] = int(
        df.groupby(feature_cols)[target].nunique().gt(1).sum()
    ) if len(feature_cols) < 20 else None

    y = df[target]
    vc = y.value_counts(normalize=True).sort_index()
    report["class_balance"] = {str(k): round(float(v), 4) for k, v in vc.items()}
    report["imbalance_ratio_max_to_min"] = round(float(vc.max() / vc.min()), 2)

    plaus, extreme = {}, {}
    for c in feats:
        if c in FEATURE_DICTIONARY:
            unit, lo, hi = FEATURE_DICTIONARY[c]
            bad = int(((df[c] < lo) | (df[c] > hi)).sum())
            plaus[c] = {"unit": unit, "plausible_range": [lo, hi], "n_out_of_range": bad}
        extreme[c] = _iqr_outliers(df[c].dropna())
    report["range_check"] = plaus
    report["extreme_outliers_3xIQR"] = extreme
    report["constant_columns"] = [c for c in feats if df[c].nunique(dropna=True) <= 1]

    # ---- leakage screening -------------------------------------------------
    leakage = {"single_feature_auc_ge_0.95": [], "perfect_or_near_perfect_correlation_pairs": []}
    yb = (y == y.max()).astype(int) if y.nunique() > 2 else y
    for c in feats:
        s = df[c].fillna(df[c].median())
        if yb.nunique() == 2:
            a = roc_auc_score(yb, s)
            a = max(a, 1 - a)
            if a >= 0.95:
                leakage["single_feature_auc_ge_0.95"].append({"feature": c, "auc": round(float(a), 4)})
    corr = df[feats].corr(method="spearman", numeric_only=True).abs()  # rank corr catches monotone non-linear duplicates
    for i, a in enumerate(corr.columns):
        for b in corr.columns[i + 1:]:
            if corr.loc[a, b] >= 0.98:
                leakage["perfect_or_near_perfect_correlation_pairs"].append([a, b, round(float(corr.loc[a, b]), 4)])
    if group_col:
        per_group = df.groupby(group_col).size()
        leakage["repeated_measures"] = {
            "n_groups": int(per_group.size),
            "rows_per_group_mean": round(float(per_group.mean()), 2),
            "note": "Rows of one subject are correlated: random row-wise splits leak. Use grouped splits.",
        }
    leakage["notes"] = [
        "Single-feature AUC >= 0.95 on a screening task is a red flag for label-derived features or generated data.",
        "Any feature used to DEFINE the label (e.g. CDR for a CDR-based label) must be excluded.",
    ]
    report["leakage_screen"] = leakage
    return report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--target", required=True)
    ap.add_argument("--group-col", default=None)
    ap.add_argument("--out-dir", default=os.path.join(os.path.dirname(__file__), "reports"))
    a = ap.parse_args()
    df = pd.read_csv(a.csv)
    rep = audit(df, a.target, a.group_col)
    meta_path = a.csv.replace(".csv", ".meta.json")
    rep["provenance"] = json.load(open(meta_path)) if os.path.exists(meta_path) else {"synthetic": "unknown - no .meta.json"}
    os.makedirs(a.out_dir, exist_ok=True)
    out = os.path.join(a.out_dir, f"data_audit_{os.path.basename(a.csv).replace('.csv', '')}.json")
    with open(out, "w") as fh:
        json.dump(rep, fh, indent=2)
    print(json.dumps({k: rep[k] for k in ("n_rows", "missing_per_column", "exact_duplicate_rows", "class_balance", "constant_columns")}, indent=2))
    print("leakage screen:", json.dumps(rep["leakage_screen"]["single_feature_auc_ge_0.95"]))
    print("written:", out)


if __name__ == "__main__":
    main()
