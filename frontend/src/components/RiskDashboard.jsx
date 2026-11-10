import { useState, useEffect } from "react";
import { predictCognitiveRisk, checkBackendStatus } from "../services/api";
import ClinicalReportModal from "./ClinicalReportModal";

export default function RiskDashboard({
  cardTelemetry,
  stroopTelemetry,
  ad8Score,
  mriResult,
  onNavigateToGame,
  onNavigateToStroop,
  onNavigateToAD8,
  onNavigateToMRI,
}) {
  // Patient demographic state
  const [age, setAge] = useState(68);
  const [educationYears, setEducationYears] = useState(14);
  const [familyHistory, setFamilyHistory] = useState("no");

  // Telemetry state (can be initialized from props or defaults)
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ online: false, checking: true });
  const [predictionResult, setPredictionResult] = useState(null);
  const [runError, setRunError] = useState("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Check if FastAPI backend is running
  useEffect(() => {
    checkBackendStatus().then((res) => {
      setBackendStatus({ online: res.online, checking: false });
    });
  }, []);

  const handleRunAssessment = async () => {
    setLoading(true);
    const payload = {
      age: parseInt(age, 10) || null,
      education_years: parseInt(educationYears, 10) || null,
      family_history: familyHistory,
      ad8_score: ad8Score !== null ? ad8Score : null,
      card_match_metrics: cardTelemetry || null,
      stroop_metrics: stroopTelemetry || null,
    };

    const res = await predictCognitiveRisk(payload);
    setPredictionResult(res.success ? res : null);
    setRunError(res.success ? "" : res.error);
    setLoading(false);
  };

  const getRiskColor = (level) => {
    if (level === "High Risk") return "#ef4444";
    if (level === "Moderate Risk") return "#f59e0b";
    return "#10b981";
  };

  return (
    <div className="risk-dashboard-container">
      <div className="game-header">
        <div>
          <h2>📊 Unified AI Cognitive Screening Dashboard</h2>
          <p className="subtitle">
            Combines demographic risk factors, AD8 clinical scores, and digital game telemetry into an explainable ML prediction.
          </p>
        </div>
        <div className={`status-pill ${backendStatus.online ? "online" : "offline"}`}>
          <span className="dot"></span>
          {backendStatus.checking
            ? "Checking ML server..."
            : backendStatus.online
            ? "FastAPI ML Server Active"
            : "Offline (Local Engine Active)"}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column: Input Indicators */}
        <div className="dashboard-card">
          <h3>👤 1. Patient Profile & Demographics</h3>
          <div className="form-group">
            <label>Age (Years): <strong>{age}</strong></label>
            <input
              type="range"
              min="50"
              max="92"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="slider"
            />
          </div>

          <div className="form-group">
            <label>Education (Years): <strong>{educationYears}</strong></label>
            <input
              type="range"
              min="2"
              max="22"
              value={educationYears}
              onChange={(e) => setEducationYears(e.target.value)}
              className="slider"
            />
          </div>

          <div className="form-group">
            <label>Family History of Dementia:</label>
            <div className="radio-group">
              {["no", "yes", "unknown"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`btn-choice-sm ${familyHistory === opt ? "active" : ""}`}
                  onClick={() => setFamilyHistory(opt)}
                >
                  {opt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <hr style={{ margin: "18px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />

          <h3>🎮 2. Screening Biomarkers</h3>
          <div className="biomarker-summary">
            <div className="biomarker-row">
              <div>
                <strong>AD8 Questionnaire Score:</strong>
                <p className="text-muted">
                  {ad8Score !== null ? `${ad8Score} / 8 points recorded` : "No questionnaire completed yet"}
                </p>
              </div>
              <button className="btn-link" onClick={onNavigateToAD8}>
                {ad8Score !== null ? "Edit AD8" : "Take AD8 Test →"}
              </button>
            </div>

            <div className="biomarker-row">
              <div>
                <strong>Card Match Telemetry:</strong>
                <p className="text-muted">
                  {cardTelemetry
                    ? `${cardTelemetry.moves} moves in ${cardTelemetry.time_sec}s (${cardTelemetry.errors} errors)`
                    : "No game played yet (using healthy baseline)"}
                </p>
              </div>
              <button className="btn-link" onClick={onNavigateToGame}>
                {cardTelemetry ? "Play Again" : "Play Game →"}
              </button>
            </div>

            <div className="biomarker-row">
              <div>
                <strong>Stroop Inhibitory Telemetry:</strong>
                <p className="text-muted">
                  {stroopTelemetry
                    ? `Latency: ${stroopTelemetry.avg_reaction_ms}ms | Interference: +${stroopTelemetry.interference_ms}ms (${stroopTelemetry.accuracy}% Acc)`
                    : "No Stroop test played yet (using healthy baseline)"}
                </p>
              </div>
              <button className="btn-link" onClick={onNavigateToStroop}>
                {stroopTelemetry ? "Retake Stroop" : "Take Stroop →"}
              </button>
            </div>

            <div className="biomarker-row">
              <div>
                <strong>Brain MRI Neuroimaging:</strong>
                <p className="text-muted">
                  {mriResult
                    ? `${mriResult.predicted_class} (Conf: ${(mriResult.confidence * 100).toFixed(0)}%, VBR: ${mriResult.ventricle_to_brain_ratio})`
                    : "No MRI scan evaluated yet"}
                </p>
              </div>
              <button className="btn-link" onClick={onNavigateToMRI}>
                {mriResult ? "Review MRI" : "Analyze MRI →"}
              </button>
            </div>
          </div>

          <button
            onClick={handleRunAssessment}
            disabled={loading}
            className="btn-primary btn-large"
            style={{ width: "100%", marginTop: 24 }}
          >
            {loading ? "⚡ Running ML Risk Analysis..." : "🚀 Compute Multi-Stage Risk Assessment"}
          </button>
        </div>

        {/* Right Column: AI Prediction Results */}
        <div className="dashboard-card">
          <h3>🩺 3. AI Diagnostic Risk Report</h3>
          {!predictionResult ? (
            <div className="empty-state">
              <span style={{ fontSize: "3rem" }}>🧠</span>
              {runError && <div className="mp-banner mp-banner-warn" role="alert"><strong>Could not compute.</strong> {runError}</div>}
              <p>Click <strong>"Compute Multi-Stage Risk Assessment"</strong> to run the trained Machine Learning model against these clinical parameters.</p>
            </div>
          ) : (
            <div className="results-container">
              {/* Risk Level Banner */}
              <div
                className="risk-banner"
                style={{
                  borderColor: getRiskColor(predictionResult.risk_level),
                  background: `${getRiskColor(predictionResult.risk_level)}15`,
                }}
              >
                <div className="risk-banner-header">
                  <div>
                    <span className="risk-tag" style={{ background: getRiskColor(predictionResult.risk_level) }}>
                      {predictionResult.risk_level}
                    </span>
                    <h3 style={{ margin: "6px 0 0", color: getRiskColor(predictionResult.risk_level) }}>
                      Cognitive Risk Index: {predictionResult.risk_score} / 100
                    </h3>
                  </div>
                  <div className="confidence-pill">
                    Confidence: {(predictionResult.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Class Probability Breakdown */}
              <div className="prob-section">
                <h4>Model Probability Distribution:</h4>
                {Object.entries(predictionResult.class_probabilities || {}).map(([cName, pVal]) => (
                  <div key={cName} className="prob-bar-row">
                    <span className="prob-name">{cName}</span>
                    <div className="prob-bar-track">
                      <div
                        className="prob-bar-fill"
                        style={{
                          width: `${(pVal * 100).toFixed(1)}%`,
                          background: getRiskColor(cName),
                        }}
                      ></div>
                    </div>
                    <span className="prob-pct">{(pVal * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>

              {/* Clinical Flags */}
              {predictionResult.clinical_flags && predictionResult.clinical_flags.length > 0 && (
                <div className="flags-box">
                  <h4>⚠️ Clinical Warning Indicators Detected:</h4>
                  <ul>
                    {predictionResult.clinical_flags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Medical Recommendation */}
              <div className="recommendation-card">
                <h4>📋 Clinical Action & Next Step:</h4>
                <p className="stage-highlight"><strong>{predictionResult.stage_advice}</strong></p>
                <p className="rec-text">{predictionResult.recommendation}</p>
              </div>

              {/* Disclaimer */}
              <p className="disclaimer-text">
                ⚠️ <em>{predictionResult.disclaimer}</em>
              </p>

              <button
                onClick={() => setIsReportModalOpen(true)}
                className="btn-primary"
                style={{ width: "100%", marginTop: 14, backgroundColor: "#0f766e" }}
              >
                📄 View & Download Clinical PDF Report →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Clinical PDF Report Modal */}
      <ClinicalReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        patientData={{
          age: parseInt(age, 10),
          education_years: parseInt(educationYears, 10),
          family_history: familyHistory,
          ad8_score: ad8Score !== null ? ad8Score : 0,
          card_match_metrics: cardTelemetry || {
            moves: 18,
            time_sec: 42.0,
            errors: 1,
          },
          stroop_metrics: stroopTelemetry || {
            accuracy: 90.0,
            avg_reaction_ms: 700.0,
            interference_ms: 160.0,
          },
          mri_result: mriResult,
        }}
        assessmentResult={predictionResult}
      />
    </div>
  );
}
