"""ML integrity tests. Run: cd ml && python -m pytest tests -q"""
import json
import os
import shutil

import numpy as np
import pandas as pd
import pytest
from sklearn.model_selection import StratifiedGroupKFold, train_test_split

import common as C
import train_oasis2_model as O
from generate_cognitive_dataset import generate
from risk_predictor import (CognitiveRiskPredictor, InsufficientDataError, InvalidInputError, get_model_report)
from train_risk_model import CATEGORIES, CATEGORICAL, NUMERIC

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(HERE, "saved_models", "cognitive_risk_model.joblib")

FULL_LOW = dict(age=63, education_years=16, family_history="no", ad8_score=0,
                card_match_metrics={"moves": 16, "time_sec": 36.5, "error_rate": 0.12},
                stroop_metrics={"accuracy": 95, "avg_reaction_ms": 620, "interference_ms": 130},
                sequence_metrics={"max_span": 7})
FULL_HIGH = dict(age=78, education_years=10, family_history="yes", ad8_score=6,
                 card_match_metrics={"moves": 52, "time_sec": 145, "error_rate": 0.62},
                 stroop_metrics={"accuracy": 55, "avg_reaction_ms": 1780, "interference_ms": 680},
                 sequence_metrics={"max_span": 3})


# ----------------------------------------------------------------- data/leakage
def test_generator_is_labelled_synthetic_and_separation_reduces_signal():
    easy, hard = generate(2000, seed=1, separation=1.0), generate(2000, seed=1, separation=0.5)
    assert easy.groupby("risk_level")["ad8_score"].mean().diff().dropna().mean() > \
           hard.groupby("risk_level")["ad8_score"].mean().diff().dropna().mean()


def test_preprocessing_statistics_come_from_training_data_only():
    df = generate(1500, seed=3)
    X, y = df[NUMERIC + CATEGORICAL], df["risk_level"]
    Xtr, Xte, ytr, _ = train_test_split(X, y, test_size=0.3, random_state=0, stratify=y)
    pipe, _ = C.candidate_models(0, 3, NUMERIC, CATEGORICAL, CATEGORIES)["Logistic Regression"]
    pipe.fit(Xtr, ytr)
    prep = pipe.named_steps["prep"]
    scaler = prep.named_transformers_["num"].named_steps["scale"]
    imputer = prep.named_transformers_["num"].named_steps["impute"]
    assert np.allclose(scaler.mean_, Xtr[NUMERIC].mean().values, atol=1e-6)
    assert not np.allclose(scaler.mean_, X[NUMERIC].mean().values, atol=1e-9)   # would be equal if fit on all data
    assert np.allclose(imputer.statistics_, Xtr[NUMERIC].median().values)


def test_family_history_unknown_is_not_ordinal():
    df = generate(300, seed=2)
    pipe, _ = C.candidate_models(0, 3, NUMERIC, CATEGORICAL, CATEGORIES)["Logistic Regression"]
    pipe.fit(df[NUMERIC + CATEGORICAL], df["risk_level"])
    names = pipe.named_steps["prep"].get_feature_names_out()
    assert {"family_history_no", "family_history_unknown", "family_history_yes"} <= set(names)


def test_missing_values_are_imputed_inside_pipeline():
    df = generate(600, seed=4)
    X = df[NUMERIC + CATEGORICAL].copy()
    X.loc[::7, "stroop_accuracy"] = np.nan
    pipe, _ = C.candidate_models(0, 3, NUMERIC, CATEGORICAL, CATEGORIES)["Random Forest"]
    pipe.fit(X, df["risk_level"])
    assert np.isfinite(pipe.predict_proba(X)).all()


# ----------------------------------------------------------------- OASIS-2 track
def _schema_fixture(n_subjects=60, seed=0):
    """SYNTHETIC FIXTURE - exists ONLY to exercise code paths with the OASIS-2
    column schema. It is not real data and is never saved or used for training."""
    rng = np.random.default_rng(seed)
    rows = []
    for s in range(n_subjects):
        age0 = rng.integers(60, 90)
        impaired = rng.random() < 0.45
        for v in range(1, rng.integers(2, 4) + 1):
            rows.append({
                "Subject ID": f"FIX_{s:03d}", "Visit": v, "M/F": rng.choice(["M", "F"]), "Age": age0 + v,
                "EDUC": rng.integers(6, 20), "SES": rng.choice([1, 2, 3, 4, 5, np.nan]),
                "MMSE": np.clip(rng.normal(22 if impaired else 29, 3), 5, 30),
                "CDR": rng.choice([0.5, 1.0]) if impaired else 0.0,
                "eTIV": rng.normal(1500, 150), "nWBV": np.clip(rng.normal(0.70 if impaired else 0.75, 0.03), 0.6, 0.85),
            })
    d = pd.DataFrame(rows)
    d["ASF"] = 1755.0 / d["eTIV"]     # deterministic like the real column
    return d


def test_oasis_loader_rejects_wrong_schema():
    with pytest.raises(ValueError, match="missing required columns"):
        O.load_oasis2(df=pd.DataFrame({"foo": [1]}))


def test_oasis_label_from_cdr_and_cdr_excluded_and_asf_dropped():
    d = O.load_oasis2(df=_schema_fixture())
    assert set(d["y"].unique()) == {0, 1} and ((d["cdr"] > 0).astype(int) == d["y"]).all()
    sets, notes = O.feature_sets(d)
    for cols, cats in sets.values():
        assert "cdr" not in cols + cats
    assert "asf" not in sets["demographics_mri"][0] and any("ASF dropped" in n for n in notes)


def test_oasis_splits_are_subject_disjoint_and_pipeline_runs(tmp_path):
    d = O.load_oasis2(df=_schema_fixture())
    groups = d["subject_id"].values
    for tr, te in StratifiedGroupKFold(5, shuffle=True, random_state=0).split(d, d["y"], groups):
        assert set(groups[tr]).isdisjoint(groups[te])
    res = O.run_on_dataframe(d, str(tmp_path / "rep"), str(tmp_path / "mod"), n_iter=2, n_outer=3,
                             provenance={"synthetic": True, "note": "unit-test fixture"}, verbose=False, tag="fixture")
    assert set(res) == {"demographics_mri", "plus_mmse"}
    assert 0.0 <= res["plus_mmse"]["pooled_oof_metrics"]["roc_auc"] <= 1.0
    assert (tmp_path / "rep" / "fixture" / "report.json").exists()


# ----------------------------------------------------------------- predictor
@pytest.fixture(scope="module")
def predictor():
    return CognitiveRiskPredictor(MODEL)


def test_predictions_come_from_model_and_respond_to_inputs(predictor):
    lo, hi = predictor.predict(**FULL_LOW), predictor.predict(**FULL_HIGH)
    for r in (lo, hi):
        assert abs(sum(r["class_probabilities"].values()) - 1) < 1e-3
    assert lo["risk_level_code"] == 0 and hi["risk_level_code"] == 2
    assert hi["risk_score"] > lo["risk_score"]
    expected = predictor.pipeline.predict_proba(predictor.extract_features(**FULL_HIGH))[0]
    assert np.allclose(list(hi["class_probabilities"].values()), expected, atol=1e-4)


def test_response_is_stamped_with_validation_status(predictor):
    r = predictor.predict(**FULL_LOW)
    assert r["model_info"]["trained_on_synthetic_data"] is True
    assert "SYNTHETIC" in r["disclaimer"] and "NOT been clinically validated" in r["disclaimer"]


def test_missing_inputs_are_reported_not_invented(predictor):
    partial = dict(FULL_LOW); partial.pop("sequence_metrics")
    r = predictor.predict(**partial)
    assert "sequence_max_span" in r["imputed_features"] and r["reliability"] != "full_inputs"
    assert r["features_evaluated"]["sequence_max_span"] is None


def test_insufficient_and_invalid_inputs_rejected(predictor):
    with pytest.raises(InsufficientDataError):
        predictor.predict(age=70, ad8_score=3)
    with pytest.raises(InsufficientDataError):
        predictor.predict(age=70, education_years=12, family_history="no")
    bad = dict(FULL_LOW, stroop_metrics={"accuracy": 150, "avg_reaction_ms": 600, "interference_ms": 100})
    with pytest.raises(InvalidInputError):
        predictor.predict(**bad)
    with pytest.raises(InvalidInputError):
        predictor.predict(**dict(FULL_LOW, family_history="maybe"))


def test_tampered_artifact_is_refused(tmp_path):
    for ext in (".joblib", ".manifest.json"):
        shutil.copy(MODEL.replace(".joblib", ext), tmp_path / f"m{ext}")
    with open(tmp_path / "m.joblib", "ab") as fh:
        fh.write(b"\x00")
    with pytest.raises(RuntimeError, match="hash"):
        CognitiveRiskPredictor(str(tmp_path / "m.joblib"))


# ----------------------------------------------------------------- report sanity
def test_report_has_all_required_metrics_and_honest_status():
    rep = get_model_report()
    t = rep["test_metrics"]
    for k in ("accuracy", "precision_macro", "recall_macro", "specificity_macro", "f1_macro", "roc_auc_macro_ovr", "confusion_matrix"):
        assert k in t
    for c in t["per_class"].values():
        assert {"precision", "recall_sensitivity", "specificity", "f1", "roc_auc", "average_precision"} <= set(c)
    assert rep["validation_status"].startswith("SYNTHETIC")
    assert t["accuracy"] <= rep["generator_accuracy_ceiling"] + 0.03      # cannot honestly beat the label-noise ceiling by much
    for p in rep["plots"].values():
        assert os.path.exists(os.path.join(HERE, "reports", "risk_model", p))
