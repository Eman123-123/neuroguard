"""API integration tests. Run: cd backend && python -m pytest tests -q"""
import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)

LOW = dict(age=63, education_years=16, family_history="no", ad8_score=0,
           card_match_metrics={"moves": 16, "time_sec": 36.5, "error_rate": 0.12},
           stroop_metrics={"accuracy": 95, "avg_reaction_ms": 620, "interference_ms": 130},
           sequence_metrics={"max_span": 7})
HIGH = dict(age=78, education_years=10, family_history="yes", ad8_score=6,
            card_match_metrics={"moves": 52, "time_sec": 145, "error_rate": 0.62},
            stroop_metrics={"accuracy": 55, "avg_reaction_ms": 1780, "interference_ms": 680},
            sequence_metrics={"max_span": 3})


def test_quick_prediction_uses_trained_model_and_discloses_synthetic():
    lo = client.post("/ml/predict-risk/quick", json=LOW).json()
    hi = client.post("/ml/predict-risk/quick", json=HIGH).json()
    assert lo["risk_level"] == "Low Risk" and hi["risk_level"] == "High Risk"
    assert hi["risk_score"] > lo["risk_score"]
    assert lo["model_info"]["trained_on_synthetic_data"] is True
    assert "SYNTHETIC" in lo["disclaimer"]


def test_insufficient_and_invalid_input_return_422():
    assert client.post("/ml/predict-risk/quick", json={"age": 70, "ad8_score": 3}).status_code == 422
    bad = dict(LOW, stroop_metrics={"accuracy": 150, "avg_reaction_ms": 600, "interference_ms": 100})
    r = client.post("/ml/predict-risk/quick", json=bad)
    assert r.status_code == 422 and "Out-of-range" in r.json()["detail"]


def test_model_info_exposes_required_metrics_and_plots():
    r = client.get("/ml/model-info")
    assert r.status_code == 200
    j = r.json()
    assert j["validation_status"].startswith("SYNTHETIC")
    for k in ("accuracy", "precision_macro", "recall_macro", "specificity_macro", "f1_macro", "roc_auc_macro_ovr", "confusion_matrix"):
        assert k in j["test_metrics"]
    for url in j["plot_urls"].values():
        resp = client.get(url)
        assert resp.status_code == 200 and resp.headers["content-type"] == "image/png"
    assert client.get("/ml/model-report/../../etc/passwd").status_code == 404
    assert client.get("/ml/model-report/secret.png").status_code == 404


def test_mri_endpoints_refuse_to_fabricate_results():
    assert client.get("/ml/mri-status").json()["available"] is False
    img = io.BytesIO()
    Image.new("L", (64, 64), 120).save(img, format="PNG")
    r = client.post("/ml/predict-mri", files={"file": ("x.png", img.getvalue(), "image/png")})
    assert r.status_code == 503
    assert client.post("/ml/predict-mri/sample/non_demented_normal.jpg").status_code == 503


def test_mri_upload_validation():
    assert client.post("/ml/predict-mri", files={"file": ("x.txt", b"hello", "text/plain")}).status_code == 415
    assert client.post("/ml/predict-mri", files={"file": ("x.png", b"", "image/png")}).status_code == 400
    big = b"0" * (10 * 1024 * 1024 + 5)
    assert client.post("/ml/predict-mri", files={"file": ("x.png", big, "image/png")}).status_code == 413


def test_auth_flow_wrong_password_is_rejected_and_game_session_roundtrip():
    reg = {"full_name": "Test User", "email": "t@example.com", "password": "longenough1", "age": 66, "education_years": 12, "family_history": "no"}
    assert client.post("/auth/register", json=reg).status_code == 201
    assert client.post("/auth/register", json=reg).status_code == 400
    assert client.post("/auth/login", data={"username": "t@example.com", "password": "wrong-password"}).status_code == 401
    tok = client.post("/auth/login", data={"username": "t@example.com", "password": "longenough1"}).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    assert client.get("/auth/me", headers=h).json()["email"] == "t@example.com"
    assert client.get("/games/sessions").status_code == 401
    assert client.post("/games/sessions", json={"game_type": "stroop", "metrics": {"accuracy": 90}}, headers=h).status_code == 201
    assert client.post("/ad8", json={"answers": [True, False, True, False, False, False, False, False]}, headers=h).json()["score"] == 2
