"""SYNTHETIC dataset generator for the NeuroGuard digital-screening prototype.

!!! THIS DATA IS NOT REAL PATIENT DATA !!!
No public dataset contains this app's feature set (AD8 + Card-Match + Stroop
telemetry with clinical labels), so a model trained on this file can NOT be
claimed to detect Alzheimer's disease. The file exists only to (a) exercise the
ML pipeline end-to-end and (b) let the UI be developed before real data is
collected. Every output is written together with a `.meta.json` provenance file
that the training pipeline propagates into the model artifact and the API.

Design notes
------------
* Class-conditional Gaussians are author-chosen assumptions, not clinical norms.
* Because labels are assigned first and features sampled afterwards, any model
  can only "rediscover" this generator. Reported accuracy is therefore an upper
  bound set by `label_noise` and `separation`, not a clinical performance.
* `separation` in (0, 1] pulls every class toward the pooled population so a
  harder, more overlapping stress-test set can be produced (see train script).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from datetime import datetime, timezone

import numpy as np
import pandas as pd

CLASS_NAMES = ["Low Risk", "Moderate Risk", "High Risk"]
PRIORS = np.array([0.48, 0.32, 0.20])

# feature -> per-class (mean, sd, lo, hi, dtype)
NUMERIC_SPEC = {
    "age":                    [(64, 8, 50, 88, int),     (70, 7, 54, 90, int),     (76, 7, 58, 94, int)],
    "education_years":        [(14.0, 3.0, 6, 22, int),  (12.0, 3.2, 4, 20, int),  (10.5, 3.5, 2, 18, int)],
    "card_match_moves":       [(18, 5, 12, 36, int),     (29, 7, 16, 50, int),     (46, 11, 24, 85, int)],
    "card_match_time_sec":    [(45, 14, 22, 95, float),  (78, 22, 40, 145, float), (130, 35, 65, 240, float)],
    "card_match_error_rate":  [(0.16, 0.08, 0, 0.40, float), (0.34, 0.11, 0.12, 0.62, float), (0.56, 0.13, 0.25, 0.90, float)],
    "stroop_accuracy":        [(92, 6, 75, 100, float),  (80, 8, 60, 95, float),   (63, 11, 35, 84, float)],
    "stroop_avg_reaction_ms": [(700, 140, 450, 1150, float), (1050, 220, 650, 1650, float), (1580, 320, 950, 2500, float)],
    "stroop_interference_ms": [(160, 60, 50, 360, float), (340, 100, 140, 600, float), (570, 150, 250, 950, float)],
    "sequence_max_span":      [(6.4, 1.2, 4, 9, int),    (4.7, 1.1, 3, 7, int),    (3.2, 0.9, 2, 5, int)],
}
# categorical features -> per-class probability vectors
AD8_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8]
AD8_P = [
    [0.72, 0.20, 0.06, 0.02, 0, 0, 0, 0, 0],
    [0, 0.12, 0.38, 0.30, 0.15, 0.05, 0, 0, 0],
    [0, 0, 0.04, 0.08, 0.22, 0.30, 0.20, 0.11, 0.05],
]
FAMILY_VALUES = ["no", "yes", "unknown"]
FAMILY_P = [[0.70, 0.20, 0.10], [0.45, 0.45, 0.10], [0.30, 0.60, 0.10]]


def _pooled(p_rows):
    return (PRIORS[:, None] * np.asarray(p_rows)).sum(axis=0)


def generate(n_samples: int = 5000, seed: int = 42, separation: float = 1.0,
             label_noise: float = 0.04) -> pd.DataFrame:
    if not 0 < separation <= 1:
        raise ValueError("separation must be in (0, 1]")
    rng = np.random.default_rng(seed)
    counts = (PRIORS * n_samples).astype(int)
    counts[-1] = n_samples - counts[:-1].sum()
    labels = np.repeat([0, 1, 2], counts)
    cols = {}

    for feat, spec in NUMERIC_SPEC.items():
        means = np.array([s[0] for s in spec], dtype=float)
        grand = float((PRIORS * means).sum())
        eff_means = grand + separation * (means - grand)
        out = np.empty(n_samples)
        for c in (0, 1, 2):
            _, sd, lo, hi, _ = spec[c]
            idx = labels == c
            out[idx] = np.clip(rng.normal(eff_means[c], sd, idx.sum()), lo, hi)
        dtype = spec[0][4]
        cols[feat] = np.round(out).astype(int) if dtype is int else np.round(out, 3 if feat == "card_match_error_rate" else 1)

    for name, values, probs in (("ad8_score", AD8_VALUES, AD8_P), ("family_history", FAMILY_VALUES, FAMILY_P)):
        pooled = _pooled(probs)
        col = np.empty(n_samples, dtype=object)
        for c in (0, 1, 2):
            p = separation * np.asarray(probs[c]) + (1 - separation) * pooled
            idx = labels == c
            col[idx] = rng.choice(values, size=idx.sum(), p=p / p.sum())
        cols[name] = col.astype(int) if name == "ad8_score" else col

    df = pd.DataFrame(cols)
    y = labels.copy()
    # adjacent-class label noise (diagnostic ambiguity)
    flip = rng.choice(n_samples, size=int(label_noise * n_samples), replace=False)
    for i in flip:
        y[i] = rng.choice([c for c in (0, 1, 2) if abs(c - y[i]) == 1])
    df["risk_level"] = y
    df["risk_label"] = [CLASS_NAMES[i] for i in y]
    return df.sample(frac=1.0, random_state=seed).reset_index(drop=True)


def write_dataset(path: str, **kwargs) -> dict:
    df = generate(**kwargs)
    df.to_csv(path, index=False)
    with open(path, "rb") as fh:
        sha = hashlib.sha256(fh.read()).hexdigest()
    meta = {
        "synthetic": True,
        "warning": "Synthetic data generated from author-assumed Gaussians. Not clinical data.",
        "generator": "generate_cognitive_dataset.py",
        "parameters": kwargs,
        "n_rows": int(len(df)),
        "sha256": sha,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    with open(path.replace(".csv", ".meta.json"), "w") as fh:
        json.dump(meta, fh, indent=2)
    return meta


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--n", type=int, default=5000)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--separation", type=float, default=1.0)
    ap.add_argument("--label-noise", type=float, default=0.04)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "data", "synthetic_cognitive_screening.csv"))
    a = ap.parse_args()
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    m = write_dataset(a.out, n_samples=a.n, seed=a.seed, separation=a.separation, label_noise=a.label_noise)
    print("SYNTHETIC dataset written:", a.out, "| rows:", m["n_rows"], "| sha256:", m["sha256"][:12])
