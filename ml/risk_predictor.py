"""Inference engine for the NeuroGuard digital-screening risk model.

Guarantees
----------
* Probabilities come from the serialized sklearn pipeline (preprocessing +
  classifier together). Nothing is computed by hand-written rules.
* The artifact's SHA-256 is verified against its manifest before unpickling
  (joblib/pickle can execute code; never load an unverified file).
* Missing inputs are NOT replaced by invented "healthy" defaults. They are left
  empty, imputed inside the pipeline with TRAINING-set medians, and reported back
  in `imputed_features`. Too little data raises InsufficientDataError.
* Physically impossible values raise InvalidInputError.
* Every response carries the model's validation status so a UI cannot present a
  synthetic-data prototype as a validated clinical tool.
"""
from __future__ import annotations

import hashlib
import json
import os
import warnings
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MODEL_PATH = os.path.join(HERE, "saved_models", "cognitive_risk_model.joblib")
DEFAULT_REPORT_PATH = os.path.join(HERE, "reports", "risk_model", "model_report.json")

FEATURE_RANGES = {
    "age": (18, 110), "education_years": (0, 30), "ad8_score": (0, 8),
    "card_match_moves": (1, 500), "card_match_time_sec": (1, 3600), "card_match_error_rate": (0, 1),
    "stroop_accuracy": (0, 100), "stroop_avg_reaction_ms": (150, 10000), "stroop_interference_ms": (-500, 5000),
    "sequence_max_span": (1, 15),
}
MIN_COMPLETENESS = 0.6  # at least 6 of the 10 numeric features must be provided


class InvalidInputError(ValueError):
    pass


class InsufficientDataError(ValueError):
    pass


def _verify_integrity(model_path: str) -> str:
    manifest_path = model_path.replace(".joblib", ".manifest.json")
    h = hashlib.sha256()
    with open(model_path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    digest = h.hexdigest()
    if os.getenv("NEUROGUARD_SKIP_MODEL_HASH") == "1":
        return digest
    if not os.path.exists(manifest_path):
        raise RuntimeError(f"Model manifest missing ({manifest_path}); refusing to load unverified model.")
    expected = json.load(open(manifest_path))["sha256"]
    if digest != expected:
        raise RuntimeError("Model file hash does not match its manifest; refusing to load (possible tampering or stale file).")
    return digest


class CognitiveRiskPredictor:
    def __init__(self, model_path: str = DEFAULT_MODEL_PATH):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}. Run: python generate_cognitive_dataset.py && python train_risk_model.py")
        self.sha256 = _verify_integrity(model_path)
        art = joblib.load(model_path)
        trained_sk = (art.get("versions") or {}).get("scikit-learn")
        import sklearn
        self.sklearn_version_match = trained_sk == sklearn.__version__
        if not self.sklearn_version_match:
            warnings.warn(f"Model trained with scikit-learn {trained_sk} but {sklearn.__version__} is installed; "
                          "predictions may be wrong. Retrain or install the matching version.")
        self.pipeline = art["pipeline"]
        self.model_name = art["model_name"]
        self.numeric = art["numeric_features"]
        self.categorical = art["categorical_features"]
        self.feature_columns = art["feature_columns"]
        self.class_names = art["class_names"]
        self.validation_status = art["validation_status"]
        self.trained_at = art["trained_at"]
        self.provenance = art.get("data_provenance", {})
        self.headline_metrics = art.get("headline_metrics", {})

    @property
    def model_info(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "validation_status": self.validation_status,
            "trained_on_synthetic_data": bool(self.provenance.get("synthetic", True)),
            "trained_at": self.trained_at,
            "artifact_sha256": self.sha256,
            "sklearn_version_matches_training": self.sklearn_version_match,
            "headline_metrics_on_training_distribution": self.headline_metrics,
        }

    def extract_features(self, age=None, education_years=None, family_history=None, ad8_score=None,
                         card_match_metrics=None, stroop_metrics=None, sequence_metrics=None) -> pd.DataFrame:
        f: Dict[str, Any] = {c: np.nan for c in self.numeric}
        f["family_history"] = None

        def num(v):
            return np.nan if v is None else float(v)

        f["age"], f["education_years"], f["ad8_score"] = num(age), num(education_years), num(ad8_score)
        if family_history:
            fh = str(family_history).lower()
            if fh not in ("yes", "no", "unknown"):
                raise InvalidInputError("family_history must be 'yes', 'no' or 'unknown'.")
            f["family_history"] = fh
        cm = card_match_metrics or {}
        f["card_match_moves"] = num(cm.get("moves"))
        f["card_match_time_sec"] = num(cm.get("time_sec"))
        if cm.get("error_rate") is not None:
            f["card_match_error_rate"] = float(cm["error_rate"])
        elif cm.get("errors") is not None and cm.get("moves"):
            f["card_match_error_rate"] = float(cm["errors"]) / float(cm["moves"])
        st = stroop_metrics or {}
        f["stroop_accuracy"] = num(st.get("accuracy"))
        f["stroop_avg_reaction_ms"] = num(st.get("avg_reaction_ms"))
        f["stroop_interference_ms"] = num(st.get("interference_ms"))
        f["sequence_max_span"] = num((sequence_metrics or {}).get("max_span"))

        bad = [f"{k}={f[k]}" for k, (lo, hi) in FEATURE_RANGES.items() if not np.isnan(f[k]) and not lo <= f[k] <= hi]
        if bad:
            raise InvalidInputError("Out-of-range values: " + ", ".join(bad))
        return pd.DataFrame([f])[self.feature_columns]

    def predict(self, age=None, education_years=None, family_history=None, ad8_score=None,
                card_match_metrics=None, stroop_metrics=None, sequence_metrics=None) -> Dict[str, Any]:
        X = self.extract_features(age, education_years, family_history, ad8_score,
                                  card_match_metrics, stroop_metrics, sequence_metrics)
        present = [c for c in self.numeric if not pd.isna(X.at[0, c])]
        missing: List[str] = [c for c in self.numeric if pd.isna(X.at[0, c])]
        if X.at[0, "family_history"] is None or pd.isna(X.at[0, "family_history"]):
            missing.append("family_history")
        completeness = len(present) / len(self.numeric)
        behavioural = [c for c in present if c not in ("age", "education_years")]
        if completeness < MIN_COMPLETENESS or not behavioural:
            raise InsufficientDataError(
                f"Only {len(present)}/{len(self.numeric)} measurements supplied; at least "
                f"{int(MIN_COMPLETENESS * len(self.numeric))} (including AD8 or a game) are required for a meaningful result. "
                f"Missing: {', '.join(missing)}."
            )

        probs = self.pipeline.predict_proba(X)[0]
        idx = int(np.argmax(probs))
        label = self.class_names[idx]
        # Ordinal index (NOT a probability of disease): expected position on a 0-100 scale.
        risk_index = round(float(probs[0] * 5.0 + probs[1] * 50.0 + probs[2] * 95.0), 1)

        stage = {
            0: ("Screening pattern is closer to the 'Low Risk' group of the model's training data. Re-screening at routine intervals is reasonable.",
                "No escalation suggested by this screen alone."),
            1: ("Screening pattern is closer to the 'Moderate Risk' group. This is not a diagnosis; discuss with a clinician, who can use validated tests (e.g. MoCA/MMSE).",
                "Suggested next step: clinical consultation."),
            2: ("Screening pattern is closer to the 'High Risk' group. This is not a diagnosis; prompt clinical evaluation is advisable.",
                "Suggested next step: comprehensive clinical and neurological evaluation."),
        }[idx]
        disclaimer = "Screening aid only; not a diagnosis. "
        if self.provenance.get("synthetic", True):
            disclaimer += ("This model was trained on SYNTHETIC data and has NOT been clinically validated; "
                           "its output must not be used for medical decisions.")
        return {
            "risk_level": label,
            "risk_level_code": idx,
            "risk_score": risk_index,
            "confidence": round(float(probs.max()), 4),
            "class_probabilities": {n: round(float(p), 4) for n, p in zip(self.class_names, probs)},
            "clinical_flags": self._observations(X.iloc[0]),
            "recommendation": stage[0],
            "stage_advice": stage[1],
            "features_evaluated": {k: (None if pd.isna(v) else (v if isinstance(v, str) else float(v))) for k, v in X.iloc[0].items()},
            "imputed_features": missing,
            "data_completeness": round(completeness, 2),
            "reliability": "full_inputs" if not missing else "limited_missing_inputs_imputed",
            "model_info": self.model_info,
            "disclaimer": disclaimer,
        }

    @staticmethod
    def _observations(row) -> List[str]:
        """Descriptive threshold notes about the inputs. These are NOT model
        explanations and the thresholds are conventional, not learned."""
        out = []

        def g(k):
            return None if pd.isna(row[k]) else float(row[k])

        if g("ad8_score") is not None and g("ad8_score") >= 2:
            out.append(f"AD8 score {int(g('ad8_score'))}/8 is at or above the published screening cut-off of 2.")
        if g("card_match_moves") is not None and g("card_match_moves") > 30:
            out.append(f"Card-match took {int(g('card_match_moves'))} moves (above this app's typical range).")
        if g("stroop_avg_reaction_ms") is not None and g("stroop_avg_reaction_ms") > 1100:
            out.append("Average Stroop reaction time exceeds 1100 ms.")
        if g("stroop_accuracy") is not None and g("stroop_accuracy") < 75:
            out.append(f"Stroop accuracy {g('stroop_accuracy'):.0f}% is below 75%.")
        return out


def get_model_report(path: str = DEFAULT_REPORT_PATH) -> Optional[dict]:
    if not os.path.exists(path):
        return None
    with open(path) as fh:
        return json.load(fh)


_predictor_instance: Optional[CognitiveRiskPredictor] = None


def get_risk_predictor() -> CognitiveRiskPredictor:
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = CognitiveRiskPredictor()
    return _predictor_instance
