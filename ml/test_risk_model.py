"""Unit test and validation script for Cognitive Risk Predictor."""

from neuroguard.ml.risk_predictor import get_risk_predictor

def test_inference_scenarios():
    predictor = get_risk_predictor()

    print("=== Testing Scenario 1: Healthy Senior (Low Risk) ===")
    res1 = predictor.predict(
        age=63,
        education_years=16,
        family_history="no",
        ad8_score=0,
        card_match_metrics={"moves": 16, "time_sec": 36.5, "error_rate": 0.12},
        stroop_metrics={"accuracy": 95.0, "avg_reaction_ms": 620.0, "interference_ms": 130.0},
        sequence_metrics={"max_span": 7},
    )
    print("Predicted:", res1["risk_level"], f"(Score: {res1['risk_score']}/100, Confidence: {res1['confidence']*100:.1f}%)")
    print("Probabilities:", res1["class_probabilities"])
    print("Recommendation:", res1["stage_advice"])
    print()

    print("=== Testing Scenario 2: Patient with Early MCI Flags (Moderate Risk) ===")
    res2 = predictor.predict(
        age=71,
        education_years=12,
        family_history="yes",
        ad8_score=3,
        card_match_metrics={"moves": 32, "time_sec": 82.0, "error_rate": 0.36},
        stroop_metrics={"accuracy": 78.0, "avg_reaction_ms": 1120.0, "interference_ms": 380.0},
        sequence_metrics={"max_span": 4},
    )
    print("Predicted:", res2["risk_level"], f"(Score: {res2['risk_score']}/100, Confidence: {res2['confidence']*100:.1f}%)")
    print("Flags:", res2["clinical_flags"])
    print("Probabilities:", res2["class_probabilities"])
    print("Recommendation:", res2["stage_advice"])
    print()

    print("=== Testing Scenario 3: Patient with Significant Impairment (High Risk) ===")
    res3 = predictor.predict(
        age=78,
        education_years=10,
        family_history="yes",
        ad8_score=6,
        card_match_metrics={"moves": 52, "time_sec": 145.0, "error_rate": 0.62},
        stroop_metrics={"accuracy": 55.0, "avg_reaction_ms": 1780.0, "interference_ms": 680.0},
        sequence_metrics={"max_span": 3},
    )
    print("Predicted:", res3["risk_level"], f"(Score: {res3['risk_score']}/100, Confidence: {res3['confidence']*100:.1f}%)")
    print("Flags:", res3["clinical_flags"])
    print("Probabilities:", res3["class_probabilities"])
    print("Recommendation:", res3["stage_advice"])
    print()


if __name__ == "__main__":
    test_inference_scenarios()
