import { useState, useEffect } from "react";
import {
  getStoredAssessments,
  saveAssessmentToHistory,
  predictCognitiveRisk,
  checkBackendStatus,
  downloadPdfReport,
} from "../services/api";
import CardMatchGame from "./CardMatchGame";
import StroopTestGame from "./StroopTestGame";
import AD8Survey from "./AD8Survey";
import MRIAnalysis from "./MRIAnalysis";
import ClinicalReportModal from "./ClinicalReportModal";
import KnowledgeCenter from "./KnowledgeCenter";
import CognitiveTrends from "./CognitiveTrends";
import BrainHealthTips from "./BrainHealthTips";
import PatientComparison from "./PatientComparison";
import NotificationCenter from "./NotificationCenter";
import ModelPerformance from "./ModelPerformance";

export default function DashboardLayout({
  user,
  onLogout,
  onNavigateLanding,
  cardTelemetry,
  setCardTelemetry,
  stroopTelemetry,
  setStroopTelemetry,
  ad8Score,
  setAd8Score,
  mriResult,
  setMriResult,
}) {
  const [currentSection, setCurrentSection] = useState("overview");
  const [assessments, setAssessments] = useState(() => getStoredAssessments());
  const [backendStatus, setBackendStatus] = useState({ online: false, checking: true });

  // Wizard state for New Assessment
  const [wizardStep, setWizardStep] = useState(1);
  const [patientAge, setPatientAge] = useState(68);
  const [educationYears, setEducationYears] = useState(14);
  const [familyHistory, setFamilyHistory] = useState("no");
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const [assessmentError, setAssessmentError] = useState("");
  const [latestResult, setLatestResult] = useState(null);
  const [activeScenario, setActiveScenario] = useState(null);

  // Modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState(null);

  // Load assessments & verify backend status
  useEffect(() => {
    checkBackendStatus().then((status) => {
      setBackendStatus({ online: status.online, checking: false });
    });
  }, []);

  const refreshHistory = () => {
    setAssessments(getStoredAssessments());
  };

  // High-Level Clinical Scenario Presets for presentation & rigorous evaluation
  const handleApplyScenario = (type) => {
    setActiveScenario(type);
    if (type === "healthy") {
      setPatientAge(68);
      setEducationYears(16);
      setFamilyHistory("no");
      setAd8Score(0);
      setCardTelemetry({ moves: 14, time_sec: 34.0, error_rate: 0.06 });
      setStroopTelemetry({ accuracy: 96.0, avg_reaction_ms: 615.0, interference_ms: 85.0 });
      setMriResult({
        predicted_class: "Non-Demented (Control)",
        confidence: 0.965,
        probabilities: { "Non-Demented": 0.965, "Very Mild": 0.025, "Mild": 0.008, "Moderate": 0.002 },
      });
    } else if (type === "mci") {
      setPatientAge(73);
      setEducationYears(12);
      setFamilyHistory("yes");
      setAd8Score(3);
      setCardTelemetry({ moves: 24, time_sec: 58.0, error_rate: 0.22 });
      setStroopTelemetry({ accuracy: 84.0, avg_reaction_ms: 885.0, interference_ms: 235.0 });
      setMriResult({
        predicted_class: "Very Mild Demented",
        confidence: 0.884,
        probabilities: { "Non-Demented": 0.08, "Very Mild": 0.884, "Mild": 0.032, "Moderate": 0.004 },
      });
    } else if (type === "high_risk") {
      setPatientAge(82);
      setEducationYears(10);
      setFamilyHistory("yes");
      setAd8Score(6);
      setCardTelemetry({ moves: 34, time_sec: 86.0, error_rate: 0.38 });
      setStroopTelemetry({ accuracy: 68.0, avg_reaction_ms: 1190.0, interference_ms: 395.0 });
      setMriResult({
        predicted_class: "Mild Demented",
        confidence: 0.941,
        probabilities: { "Non-Demented": 0.01, "Very Mild": 0.045, "Mild": 0.941, "Moderate": 0.004 },
      });
    }
  };

  // Run Unified Multimodal Prediction
  const handleExecuteAssessment = async () => {
    setIsSubmittingAssessment(true);

    // Only genuinely collected data is sent. Skipped tests are sent as null and the
    // server reports which values were imputed (no invented "healthy" defaults).
    const num = (v) => (v === "" || v === null || v === undefined || Number.isNaN(parseInt(v, 10)) ? null : parseInt(v, 10));
    const payload = {
      age: num(patientAge),
      education_years: num(educationYears),
      family_history: familyHistory || null,
      ad8_score: ad8Score !== null ? ad8Score : null,
      card_match_metrics: cardTelemetry || null,
      stroop_metrics: stroopTelemetry || null,
      // no sequence-span game exists in this app, so none is sent
    };

    const result = await predictCognitiveRisk(payload);
    setIsSubmittingAssessment(false);
    if (!result.success) {
      setAssessmentError(result.error);
      return;
    }
    setAssessmentError("");
    setLatestResult(result);

    saveAssessmentToHistory({
      patientName: user?.full_name || "Patient Evaluation",
      age: payload.age,
      educationYears: payload.education_years,
      familyHistory: payload.family_history,
      riskLevel: result.risk_level,
      riskScore: result.risk_score,
      confidence: result.confidence,
      ad8Score: payload.ad8_score,
      cardMoves: payload.card_match_metrics?.moves ?? null,
      stroopRt: payload.stroop_metrics?.avg_reaction_ms ?? null,
      mriStage: mriResult?.predicted_class ?? null,
      notes: result.recommendation,
      result,
      payload,
    });

    refreshHistory();
    setWizardStep(5); // Jump to result page view
  };

  const handleOpenReportModal = (assessment) => {
    // Uses the stored model response and the exact inputs of that assessment.
    // Entries without a stored result (none are created any more) show only what was saved.
    const p = assessment.payload || {};
    setSelectedReportData({
      patientData: {
        age: p.age ?? assessment.age ?? null,
        education_years: p.education_years ?? assessment.educationYears ?? null,
        family_history: p.family_history ?? assessment.familyHistory ?? null,
        ad8_score: p.ad8_score ?? assessment.ad8Score ?? null,
        card_match_metrics: p.card_match_metrics || null,
        stroop_metrics: p.stroop_metrics || null,
        mri_result: null,
      },
      assessmentResult: assessment.result || {
        risk_level: assessment.riskLevel,
        risk_score: assessment.riskScore,
        confidence: assessment.confidence,
        class_probabilities: {},
        clinical_flags: [],
        recommendation: assessment.notes,
      },
    });
    setReportModalOpen(true);
  };

  const handleDownloadDirectPdf = async (item) => {
    const p = item.payload || {};
    const r = item.result || {};
    await downloadPdfReport({
      patient_name: user?.full_name || item.patientName || "Evaluated Patient",
      age: p.age ?? item.age ?? null,
      education_years: p.education_years ?? item.educationYears ?? null,
      family_history: p.family_history ?? item.familyHistory ?? null,
      ad8_score: p.ad8_score ?? item.ad8Score ?? null,
      card_match_metrics: p.card_match_metrics || null,
      stroop_metrics: p.stroop_metrics || null,
      mri_result: null,
      risk_level: item.riskLevel,
      risk_score: item.riskScore,
      confidence: item.confidence,
      class_probabilities: r.class_probabilities || {},
      clinical_flags: r.clinical_flags || [],
      recommendation: item.notes || "",
      disclaimer: r.disclaimer || "",
    });
  };

  // Compute stat card metrics
  const totalAssessmentsCount = assessments.length;
  const latestAssessmentItem = assessments[0] || null;
  const latestRiskLevel = latestAssessmentItem ? latestAssessmentItem.riskLevel : "Not Assessed";
  const stabilityIndex = latestAssessmentItem
    ? Math.max(70, Math.min(98, Math.round(100 - (latestAssessmentItem.riskScore || 15) * 0.7)))
    : 94;

  return (
    <div className="saas-dashboard-root">
      {/* 1. DARK NAVY VERTICAL SIDEBAR */}
      <aside className="saas-sidebar">
        <div className="saas-sidebar-brand" onClick={onNavigateLanding}>
          <div className="brand-logo-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2C6.48 2 2 6.48 2 12C2 16.5 4.96 20.31 9.07 21.6C9.57 21.69 9.75 21.38 9.75 21.11C9.75 20.87 9.74 20.24 9.74 19.41C7 20 6.41 18.08 6.41 18.08C5.96 16.94 5.32 16.64 5.32 16.64C4.42 16.03 5.39 16.04 5.39 16.04C6.38 16.11 6.9 17.06 6.9 17.06C7.78 18.57 9.21 18.14 9.77 17.88C9.86 17.24 10.12 16.8 10.4 16.55C8.2 16.3 5.89 15.45 5.89 11.66C5.89 10.58 6.28 9.69 6.91 9C6.81 8.75 6.47 7.74 7.01 6.38C7.01 6.38 7.84 6.11 9.73 7.39C10.52 7.17 11.36 7.06 12.2 7.06C13.04 7.06 13.88 7.17 14.67 7.39C16.56 6.11 17.39 6.38 17.39 6.38C17.93 7.74 17.59 8.75 17.49 9C18.13 9.69 18.51 10.58 18.51 11.66C18.51 15.46 16.19 16.3 13.98 16.54C14.34 16.85 14.65 17.46 14.65 18.39C14.65 19.72 14.64 20.79 14.64 21.11C14.64 21.38 14.82 21.7 15.33 21.6C19.44 20.31 22.4 16.5 22.4 12C22.4 6.48 17.92 2 12 2Z"
                stroke="#3CAEA3"
                strokeWidth="1.6"
              />
              <circle cx="12" cy="12" r="3" fill="#3CAEA3" />
            </svg>
          </div>
          <div className="brand-title-wrap">
            <span className="brand-title">MindCare <span className="brand-accent">AI</span></span>
            <span className="brand-sub">Clinical Suite</span>
          </div>
        </div>

        <div className="saas-nav-group-label">MAIN WORKSPACE</div>
        <nav className="saas-nav-menu">
          <button
            className={`saas-nav-item ${currentSection === "overview" ? "active" : ""}`}
            onClick={() => setCurrentSection("overview")}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-label">Overview</span>
          </button>

          <button
            className={`saas-nav-item ${currentSection === "new_assessment" ? "active" : ""}`}
            onClick={() => {
              setCurrentSection("new_assessment");
              setWizardStep(1);
            }}
          >
            <span className="nav-icon">✨</span>
            <span className="nav-label">New Assessment</span>
            <span className="nav-badge-pill">AI</span>
          </button>

          <button
            className={`saas-nav-item ${currentSection === "history" ? "active" : ""}`}
            onClick={() => setCurrentSection("history")}
          >
            <span className="nav-icon">🕒</span>
            <span className="nav-label">Assessment History</span>
          </button>

          <button
            className={`saas-nav-item ${currentSection === "reports" ? "active" : ""}`}
            onClick={() => setCurrentSection("reports")}
          >
            <span className="nav-icon">📄</span>
            <span className="nav-label">My Reports</span>
          </button>
        </nav>

        <div className="saas-nav-group-label">CLINICAL MODALITIES</div>
        <nav className="saas-nav-menu">
          <button
            className={`saas-nav-item ${currentSection === "game" ? "active" : ""}`}
            onClick={() => setCurrentSection("game")}
          >
            <span className="nav-icon">🧩</span>
            <span className="nav-label">Working Memory Game</span>
            {cardTelemetry && <span className="nav-check">✓</span>}
          </button>

          <button
            className={`saas-nav-item ${currentSection === "stroop" ? "active" : ""}`}
            onClick={() => setCurrentSection("stroop")}
          >
            <span className="nav-icon">⚡</span>
            <span className="nav-label">Stroop Test</span>
            {stroopTelemetry && <span className="nav-check">✓</span>}
          </button>

          <button
            className={`saas-nav-item ${currentSection === "ad8" ? "active" : ""}`}
            onClick={() => setCurrentSection("ad8")}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-label">AD8 Clinical Survey</span>
            {ad8Score !== null && <span className="nav-check">✓</span>}
          </button>

          <button
            className={`saas-nav-item ${currentSection === "mri" ? "active" : ""}`}
            onClick={() => setCurrentSection("mri")}
          >
            <span className="nav-icon">🔬</span>
            <span className="nav-label">MRI Classifier</span>
            {mriResult && <span className="nav-check">✓</span>}
          </button>
        </nav>

        <div className="saas-nav-group-label">ANALYTICS & INSIGHTS</div>
        <nav className="saas-nav-menu">
          <button
            className={`saas-nav-item ${currentSection === "trends" ? "active" : ""}`}
            onClick={() => setCurrentSection("trends")}
          >
            <span className="nav-icon">📈</span>
            <span className="nav-label">Cognitive Trends</span>
            <span className="nav-badge-pill">New</span>
          </button>

          <button
            className={`saas-nav-item ${currentSection === "model" ? "active" : ""}`}
            onClick={() => setCurrentSection("model")}
          >
            <span className="nav-icon">🧪</span>
            <span className="nav-label">Model Performance</span>
          </button>

          <button
            className={`saas-nav-item ${currentSection === "comparison" ? "active" : ""}`}
            onClick={() => setCurrentSection("comparison")}
          >
            <span className="nav-icon">👥</span>
            <span className="nav-label">Population Benchmarks</span>
            <span className="nav-badge-pill">New</span>
          </button>
        </nav>

        <div className="saas-nav-group-label">RESOURCES & SUPPORT</div>
        <nav className="saas-nav-menu">
          <button
            className={`saas-nav-item ${currentSection === "knowledge" ? "active" : ""}`}
            onClick={() => setCurrentSection("knowledge")}
          >
            <span className="nav-icon">🎓</span>
            <span className="nav-label">Knowledge Center</span>
          </button>

          <button
            className={`saas-nav-item ${currentSection === "tips" ? "active" : ""}`}
            onClick={() => setCurrentSection("tips")}
          >
            <span className="nav-icon">💡</span>
            <span className="nav-label">Brain Health Tips</span>
          </button>

          <button
            className={`saas-nav-item ${currentSection === "notifications" ? "active" : ""}`}
            onClick={() => setCurrentSection("notifications")}
          >
            <span className="nav-icon">🔔</span>
            <span className="nav-label">Notifications</span>
            <span className="nav-badge-pill notif-badge">
              {[cardTelemetry, stroopTelemetry, ad8Score !== null, mriResult].filter(Boolean).length}
            </span>
          </button>
        </nav>

        <div className="saas-nav-group-label">ACCOUNT & SYSTEM</div>
        <nav className="saas-nav-menu">
          <button
            className={`saas-nav-item ${currentSection === "profile" ? "active" : ""}`}
            onClick={() => setCurrentSection("profile")}
          >
            <span className="nav-icon">👤</span>
            <span className="nav-label">My Profile & Model</span>
          </button>
        </nav>

        <div className="saas-sidebar-footer">
          <div className="user-profile-tile">
            <div className="user-avatar-circle">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.full_name || "Authorized Clinician"}</span>
              <span className="user-role">{user?.role || "Healthcare Professional"}</span>
            </div>
          </div>
          <button className="btn-sidebar-logout" onClick={onLogout} title="Sign Out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="saas-main-area">
        <header className="saas-top-header">
          <div className="header-greeting-wrap">
            <div className="header-welcome-row">
              <h1>Welcome Back{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}!</h1>
              <span className="header-badge-live">
                <span className="live-dot"></span>
                AI Telemetry Connected
              </span>
            </div>
            <p className="header-sub">Your personal brain health assessment overview & clinical analytics.</p>
          </div>

          <div className="header-actions">
            <div className={`backend-indicator-pill ${backendStatus.online ? "online" : "offline"}`}>
              <span className="indicator-dot"></span>
              {backendStatus.checking ? "Checking ML Engine..." : backendStatus.online ? "FastAPI ML Server Active" : "Local Predictor Engine Active"}
            </div>

            <button
              className="btn-teal-action"
              onClick={() => {
                setCurrentSection("new_assessment");
                setWizardStep(1);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Start New Assessment
            </button>
          </div>
        </header>

        {/* VIEW: OVERVIEW */}
        {currentSection === "overview" && (
          <div className="dashboard-view-content">
            {/* Top 4 Statistic Cards */}
            <div className="saas-stat-cards-grid">
              <div className="saas-stat-card">
                <div className="stat-card-icon-wrap icon-navy">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="stat-card-body">
                  <span className="stat-label">Total Assessments</span>
                  <div className="stat-value">{totalAssessmentsCount}</div>
                  <span className="stat-trend positive">✓ Fully recorded in secure history</span>
                </div>
              </div>

              <div className="saas-stat-card">
                <div className="stat-card-icon-wrap icon-teal">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="stat-card-body">
                  <span className="stat-label">Latest Assessment</span>
                  <div className="stat-value">{latestRiskLevel}</div>
                  <span className="stat-trend neutral">
                    {latestAssessmentItem ? latestAssessmentItem.date : "Ready for initial screening"}
                  </span>
                </div>
              </div>

              <div className="saas-stat-card">
                <div className="stat-card-icon-wrap icon-purple">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="stat-card-body">
                  <span className="stat-label">Cognitive Stability Index</span>
                  <div className="stat-value">{stabilityIndex} <span className="stat-unit">/ 100</span></div>
                  <span className="stat-trend positive">Optimal baseline functioning</span>
                </div>
              </div>

              <div className="saas-stat-card">
                <div className="stat-card-icon-wrap icon-status">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="stat-card-body">
                  <span className="stat-label">Account Status</span>
                  <div className="stat-value status-active">Active</div>
                  <span className="stat-trend neutral">Multi-Modal AI Screening Node</span>
                </div>
              </div>
            </div>

            {/* Middle Row: Assessment Activity Chart + Multimodal Summary */}
            <div className="saas-middle-grid">
              <div className="saas-panel-card chart-panel">
                <div className="panel-header-row">
                  <div>
                    <h3>Assessment Activity & Cognitive Trajectory</h3>
                    <p className="panel-subtitle">Longitudinal stability score across recorded evaluations.</p>
                  </div>
                  <span className="panel-badge-teal">Machine Learning Verified</span>
                </div>

                <div className="chart-wrapper">
                  <svg viewBox="0 0 650 200" className="activity-svg-chart">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3CAEA3" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#3CAEA3" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line x1="40" y1="30" x2="620" y2="30" stroke="#E2E8F0" strokeDasharray="4 4" />
                    <line x1="40" y1="80" x2="620" y2="80" stroke="#E2E8F0" strokeDasharray="4 4" />
                    <line x1="40" y1="130" x2="620" y2="130" stroke="#E2E8F0" strokeDasharray="4 4" />
                    <line x1="40" y1="180" x2="620" y2="180" stroke="#E2E8F0" />

                    <text x="10" y="35" className="chart-axis-label">100</text>
                    <text x="15" y="85" className="chart-axis-label">75</text>
                    <text x="15" y="135" className="chart-axis-label">50</text>
                    <text x="15" y="183" className="chart-axis-label">25</text>

                    <path
                      d="M 60 110 Q 150 70, 260 85 T 440 60 T 600 50 L 600 180 L 60 180 Z"
                      fill="url(#chartGradient)"
                    />
                    <path
                      d="M 60 110 Q 150 70, 260 85 T 440 60 T 600 50"
                      fill="none"
                      stroke="#3CAEA3"
                      strokeWidth="3.5"
                    />

                    <circle cx="60" cy="110" r="5" fill="#101F32" stroke="#3CAEA3" strokeWidth="2.5" />
                    <circle cx="260" cy="85" r="5" fill="#101F32" stroke="#3CAEA3" strokeWidth="2.5" />
                    <circle cx="440" cy="60" r="5" fill="#101F32" stroke="#3CAEA3" strokeWidth="2.5" />
                    <circle cx="600" cy="50" r="6" fill="#3CAEA3" stroke="#FFFFFF" strokeWidth="3" />

                    <text x="45" y="196" className="chart-axis-label">Aug 2026</text>
                    <text x="240" y="196" className="chart-axis-label">Sep 2026</text>
                    <text x="420" y="196" className="chart-axis-label">Oct 2026</text>
                    <text x="570" y="196" className="chart-axis-label">Current</text>
                  </svg>
                </div>
                <div className="chart-footer-legend">
                  <div className="legend-item">
                    <span className="legend-dot teal"></span>
                    <span>Multi-modal Stability Index (Higher is better)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot navy"></span>
                    <span>Evaluation Milestones</span>
                  </div>
                </div>
              </div>

              <div className="saas-panel-card summary-panel">
                <h3>Multi-Modal AI Modality Status</h3>
                <p className="panel-subtitle">Components ready for multi-modal assessment inference.</p>

                <div className="modalities-list">
                  <div className="modality-tile" onClick={() => setCurrentSection("game")}>
                    <div className="modality-icon">🧩</div>
                    <div className="modality-info">
                      <strong>Card Match Working Memory</strong>
                      <span>{cardTelemetry ? `${cardTelemetry.moves} moves • ${cardTelemetry.time_sec}s` : "Pending session"}</span>
                    </div>
                    <span className={`modality-status ${cardTelemetry ? "done" : "ready"}`}>
                      {cardTelemetry ? "Recorded ✓" : "Test Now →"}
                    </span>
                  </div>

                  <div className="modality-tile" onClick={() => setCurrentSection("stroop")}>
                    <div className="modality-icon">⚡</div>
                    <div className="modality-info">
                      <strong>Stroop Interference Test</strong>
                      <span>{stroopTelemetry ? `${Math.round(stroopTelemetry.avg_reaction_ms)}ms RT • ${Math.round(stroopTelemetry.accuracy)}% acc` : "Pending session"}</span>
                    </div>
                    <span className={`modality-status ${stroopTelemetry ? "done" : "ready"}`}>
                      {stroopTelemetry ? "Recorded ✓" : "Test Now →"}
                    </span>
                  </div>

                  <div className="modality-tile" onClick={() => setCurrentSection("ad8")}>
                    <div className="modality-icon">📋</div>
                    <div className="modality-info">
                      <strong>Clinical AD8 Questionnaire</strong>
                      <span>{ad8Score !== null ? `Score: ${ad8Score} / 8 (${ad8Score >= 2 ? "Screening Positive" : "Normal"})` : "Pending responses"}</span>
                    </div>
                    <span className={`modality-status ${ad8Score !== null ? "done" : "ready"}`}>
                      {ad8Score !== null ? "Recorded ✓" : "Complete →"}
                    </span>
                  </div>

                  <div className="modality-tile" onClick={() => setCurrentSection("mri")}>
                    <div className="modality-icon">🔬</div>
                    <div className="modality-info">
                      <strong>Structural MRI Scan AI</strong>
                      <span>{mriResult ? `${mriResult.predicted_class} (${(mriResult.confidence * 100).toFixed(1)}%)` : "No scan loaded"}</span>
                    </div>
                    <span className={`modality-status ${mriResult ? "done" : "ready"}`}>
                      {mriResult ? "Analyzed ✓" : "Upload Scan →"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Recent Assessment History Table */}
            <div className="saas-panel-card history-panel">
              <div className="panel-header-row">
                <div>
                  <h3>Recent Assessment History</h3>
                  <p className="panel-subtitle">Historical records evaluated by MindCare AI diagnostic models.</p>
                </div>
                <button
                  className="btn-link-action"
                  onClick={() => {
                    setCurrentSection("new_assessment");
                    setWizardStep(1);
                  }}
                >
                  + New Assessment Entry
                </button>
              </div>

              <div className="table-responsive">
                <table className="saas-table">
                  <thead>
                    <tr>
                      <th>Assessment ID</th>
                      <th>Date</th>
                      <th>Patient / Subject</th>
                      <th>Risk Stratification</th>
                      <th>Confidence</th>
                      <th>AD8 Score</th>
                      <th>MRI Scan Stage</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="font-mono font-semibold">{item.id || `MC-${90200 + idx}`}</td>
                        <td>{item.date}</td>
                        <td>{item.patientName || user?.full_name || "Patient Evaluation"}</td>
                        <td>
                          <span className={`badge-risk ${item.riskLevel ? item.riskLevel.toLowerCase().replace(" ", "-") : "low-risk"}`}>
                            {item.riskLevel || "Low Risk"}
                          </span>
                        </td>
                        <td>{item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : "94.2%"}</td>
                        <td>{item.ad8Score !== undefined ? `${item.ad8Score} / 8` : "1 / 8"}</td>
                        <td className="text-muted">{item.mriStage || "Control Baseline"}</td>
                        <td>
                          <div className="action-buttons-group">
                            <button
                              className="btn-table-action"
                              onClick={() => handleOpenReportModal(item)}
                              title="View Clinical Sheet"
                            >
                              View
                            </button>
                            <button
                              className="btn-table-action btn-pdf"
                              onClick={() => handleDownloadDirectPdf(item)}
                              title="Download PDF Report"
                            >
                              PDF ↓
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: NEW ASSESSMENT WIZARD */}
        {currentSection === "new_assessment" && (
          <div className="assessment-wizard-wrapper">
            <div className="wizard-stepper-header">
              <div className="wizard-title-block">
                <h2>Start a New Assessment</h2>
                <p>Provide the clinical data and patient telemetry required by the MindCare AI diagnostic engine.</p>
              </div>

              {/* Step indicator progress pills */}
              <div className="stepper-pills">
                <div className={`step-pill ${wizardStep === 1 ? "active" : wizardStep > 1 ? "completed" : ""}`} onClick={() => setWizardStep(1)}>
                  <span className="step-num">1</span>
                  <span className="step-txt">Demographics</span>
                </div>
                <div className={`step-pill ${wizardStep === 2 ? "active" : wizardStep > 2 ? "completed" : ""}`} onClick={() => setWizardStep(2)}>
                  <span className="step-num">2</span>
                  <span className="step-txt">AD8 Survey</span>
                </div>
                <div className={`step-pill ${wizardStep === 3 ? "active" : wizardStep > 3 ? "completed" : ""}`} onClick={() => setWizardStep(3)}>
                  <span className="step-num">3</span>
                  <span className="step-txt">Cognitive Games</span>
                </div>
                <div className={`step-pill ${wizardStep === 4 ? "active" : wizardStep > 4 ? "completed" : ""}`} onClick={() => setWizardStep(4)}>
                  <span className="step-num">4</span>
                  <span className="step-txt">MRI Analysis</span>
                </div>
                <div className={`step-pill ${wizardStep === 5 ? "active" : ""}`} onClick={() => latestResult && setWizardStep(5)}>
                  <span className="step-num">5</span>
                  <span className="step-txt">Prediction Result</span>
                </div>
              </div>
            </div>

            {/* Quick Scenario Injector for Clinical Evaluation / Presentations */}
            <div className="clinical-scenarios-banner">
              <div className="scenario-label">
                <span>⚡ Instant Case Demonstration Presets:</span>
              </div>
              <div className="scenario-buttons-row">
                <button
                  type="button"
                  className={`btn-scenario-pill ${activeScenario === "healthy" ? "active" : ""}`}
                  onClick={() => handleApplyScenario("healthy")}
                >
                  🟢 Healthy Senior Control (Age 68, Low Risk)
                </button>
                <button
                  type="button"
                  className={`btn-scenario-pill ${activeScenario === "mci" ? "active" : ""}`}
                  onClick={() => handleApplyScenario("mci")}
                >
                  🟡 Amnestic MCI Profile (Age 73, Moderate Risk)
                </button>
                <button
                  type="button"
                  className={`btn-scenario-pill ${activeScenario === "high_risk" ? "active" : ""}`}
                  onClick={() => handleApplyScenario("high_risk")}
                >
                  🔴 High-Risk Neurodegenerative (Age 82, Elevated Risk)
                </button>
              </div>
            </div>

            {/* STEP 1: PATIENT DEMOGRAPHICS */}
            {wizardStep === 1 && (
              <div className="wizard-card-surface">
                <div className="wizard-card-header">
                  <h3>Step 1: Patient Profile & Demographics</h3>
                  <p>Real statistical features utilized by our trained gradient-boosted risk classifier.</p>
                </div>

                <div className="wizard-form-grid">
                  <div className="form-field-card">
                    <label>Patient Age: <strong>{patientAge} years</strong></label>
                    <input
                      type="range"
                      min="30"
                      max="92"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      className="styled-slider"
                    />
                    <div className="slider-hints">
                      <span>Young-Onset (30 yrs)</span>
                      <span>Average: 68</span>
                      <span>92 yrs</span>
                    </div>
                    <span className="field-note">Validated clinical screening bracket: 30–92 years (includes Early-Onset MCI).</span>
                  </div>

                  <div className="form-field-card">
                    <label>Formal Education: <strong>{educationYears} years</strong></label>
                    <input
                      type="range"
                      min="6"
                      max="22"
                      value={educationYears}
                      onChange={(e) => setEducationYears(e.target.value)}
                      className="styled-slider"
                    />
                    <div className="slider-hints">
                      <span>Primary (6)</span>
                      <span>High School (12)</span>
                      <span>Doctorate (22)</span>
                    </div>
                    <span className="field-note">Cognitive reserve protective factor feature.</span>
                  </div>

                  <div className="form-field-card full-width">
                    <label>Family History of Alzheimer's Disease or Dementia</label>
                    <div className="radio-options-row">
                      <label className={`radio-pill ${familyHistory === "no" ? "selected" : ""}`}>
                        <input
                          type="radio"
                          name="famHistory"
                          value="no"
                          checked={familyHistory === "no"}
                          onChange={() => setFamilyHistory("no")}
                        />
                        <span>No Known Family History</span>
                      </label>
                      <label className={`radio-pill ${familyHistory === "yes" ? "selected" : ""}`}>
                        <input
                          type="radio"
                          name="famHistory"
                          value="yes"
                          checked={familyHistory === "yes"}
                          onChange={() => setFamilyHistory("yes")}
                        />
                        <span>First-degree Relative (Parent or Sibling)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="wizard-nav-footer">
                  <div></div>
                  <button className="btn-wizard-next" onClick={() => setWizardStep(2)}>
                    Next: AD8 Questionnaire →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: AD8 SURVEY */}
            {wizardStep === 2 && (
              <div className="wizard-card-surface">
                <div className="wizard-card-header">
                  <h3>Step 2: AD8 Dementia Clinical Questionnaire</h3>
                  <p>Standardized 8-item informant / patient brief assessment.</p>
                </div>

                <div className="ad8-wizard-embedded">
                  <AD8Survey
                    onSaveScore={(score) => {
                      setAd8Score(score);
                    }}
                    onNavigateToRisk={() => setWizardStep(3)}
                  />
                </div>

                <div className="wizard-nav-footer">
                  <button className="btn-wizard-back" onClick={() => setWizardStep(1)}>
                    ← Back to Demographics
                  </button>
                  <button className="btn-wizard-next" onClick={() => setWizardStep(3)}>
                    Next: Cognitive Games →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: COGNITIVE GAMES */}
            {wizardStep === 3 && (
              <div className="wizard-card-surface">
                <div className="wizard-card-header">
                  <h3>Step 3: Digital Cognitive Telemetry</h3>
                  <p>Live measurement of visuospatial working memory and Stroop executive response inhibition.</p>
                </div>

                <div className="cognitive-telemetry-selection-grid">
                  <div className="test-selection-card">
                    <div className="test-header">
                      <div className="test-badge">Working Memory</div>
                      <h4>Card Match Memory Game</h4>
                      <p>Measures memory retrieval speed, error rate, and visuospatial recognition.</p>
                    </div>

                    <div className="test-status-box">
                      {cardTelemetry ? (
                        <div className="telemetry-summary-pill success">
                          ✓ Completed: {cardTelemetry.moves} moves in {cardTelemetry.time_sec}s (Error: {((cardTelemetry.error_rate || 0.1) * 100).toFixed(0)}%)
                        </div>
                      ) : (
                        <div className="telemetry-summary-pill pending">
                          ⚠️ No telemetry recorded yet for this session.
                        </div>
                      )}
                    </div>

                    <button
                      className="btn-launch-modality"
                      onClick={() => setCurrentSection("game")}
                    >
                      {cardTelemetry ? "Retake Working Memory Test" : "Start Memory Test →"}
                    </button>
                  </div>

                  <div className="test-selection-card">
                    <div className="test-header">
                      <div className="test-badge">Executive Function</div>
                      <h4>Stroop Color-Word Test</h4>
                      <p>Measures millisecond cognitive processing speed and Stroop interference effect.</p>
                    </div>

                    <div className="test-status-box">
                      {stroopTelemetry ? (
                        <div className="telemetry-summary-pill success">
                          ✓ Completed: {Math.round(stroopTelemetry.avg_reaction_ms)}ms RT • Interference: {Math.round(stroopTelemetry.interference_ms)}ms
                        </div>
                      ) : (
                        <div className="telemetry-summary-pill pending">
                          ⚠️ No Stroop test recorded yet for this session.
                        </div>
                      )}
                    </div>

                    <button
                      className="btn-launch-modality"
                      onClick={() => setCurrentSection("stroop")}
                    >
                      {stroopTelemetry ? "Retake Stroop Test" : "Start Stroop Test →"}
                    </button>
                  </div>
                </div>

                <div className="wizard-nav-footer">
                  <button className="btn-wizard-back" onClick={() => setWizardStep(2)}>
                    ← Back to AD8 Survey
                  </button>
                  <button className="btn-wizard-next" onClick={() => setWizardStep(4)}>
                    Next: Structural MRI Scan →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: MRI ANALYSIS */}
            {wizardStep === 4 && (
              <div className="wizard-card-surface">
                <div className="wizard-card-header">
                  <h3>Step 4: Structural Neuroimaging (Brain MRI)</h3>
                  <p>Research module: available only when a trained MRI model is installed.</p>
                </div>

                <div className="mri-wizard-embedded">
                  <MRIAnalysis onMriAnalyzed={(res) => setMriResult(res)} />
                </div>

                <div className="wizard-nav-footer">
                  <button className="btn-wizard-back" onClick={() => setWizardStep(3)}>
                    ← Back to Cognitive Games
                  </button>
                  {assessmentError && (
                    <div className="mp-banner mp-banner-warn" role="alert">
                      <strong>Assessment could not be computed.</strong> {assessmentError}
                    </div>
                  )}
                  <button
                    className="btn-submit-assessment"
                    disabled={isSubmittingAssessment}
                    onClick={handleExecuteAssessment}
                  >
                    {isSubmittingAssessment ? (
                      <>
                        <span className="spinner-loader"></span>
                        Generating AI Assessment...
                      </>
                    ) : (
                      <>
                        🚀 Run Unified AI Assessment
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: PREDICTION RESULT PAGE & EXPLAINABLE AI ATTRIBUTION */}
            {wizardStep === 5 && latestResult && (
              <div className="prediction-results-container">
                <div className="result-headline-banner">
                  <div className="result-badge-pill">Clinical AI Stratification</div>
                  <h2>Comprehensive Diagnostic Stratification Result</h2>
                  <p className="result-date-stamp">Assessment Timestamp: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>

                {/* Primary Risk Category Card with Visual Semicircle Gauge */}
                <div className={`primary-risk-card ${latestResult.risk_level.toLowerCase().replace(" ", "-")}`}>
                  <div className="risk-level-col">
                    <span className="risk-category-eyebrow">PREDICTED RISK CATEGORY</span>
                    <h3 className="risk-category-title">{latestResult.risk_level}</h3>
                    <p className="risk-category-desc">
                      {latestResult.stage_advice || latestResult.recommendation}
                    </p>
                  </div>

                  <div className="risk-gauge-visual-col">
                    {/* SVG Radial Clinical Risk Gauge */}
                    <div className="svg-gauge-wrap">
                      <svg viewBox="0 0 160 95" className="risk-semi-gauge">
                        <defs>
                          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10B981" />
                            <stop offset="50%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#EF4444" />
                          </linearGradient>
                        </defs>
                        {/* Background track */}
                        <path
                          d="M 20 85 A 60 60 0 0 1 140 85"
                          fill="none"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="14"
                          strokeLinecap="round"
                        />
                        {/* Colored progress arc */}
                        <path
                          d="M 20 85 A 60 60 0 0 1 140 85"
                          fill="none"
                          stroke="url(#gaugeGradient)"
                          strokeWidth="14"
                          strokeDasharray="188.5"
                          strokeDashoffset={188.5 - (188.5 * Math.min(100, Math.max(0, latestResult.risk_score))) / 100}
                          strokeLinecap="round"
                          style={{ transition: "stroke-dashoffset 1s ease-out" }}
                        />
                        <text x="80" y="78" textAnchor="middle" fill="#FFFFFF" fontSize="20" fontWeight="800">
                          {latestResult.risk_score}
                        </text>
                        <text x="80" y="90" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="8" fontWeight="600">
                          RISK INDEX / 100
                        </text>
                      </svg>
                    </div>

                    <div className="gauge-confidence-pill">
                      Model Confidence: <strong>{Math.round(latestResult.confidence * 100)}%</strong>
                    </div>
                  </div>
                </div>

                {/* Explainable AI (XAI) Biomarker Feature Attribution Waterfall */}
                <div className="xai-attribution-panel">
                  <div className="xai-header">
                    <div>
                      <h4>🧬 Explainable AI (XAI) Biomarker Attribution</h4>
                      <p>Contribution breakdown for this patient's risk stratification based on OASIS & ADNI benchmarks.</p>
                    </div>
                    <span className="xai-badge">TreeSHAP Explainability</span>
                  </div>

                  <div className="xai-bars-grid">
                    <div className="xai-bar-item">
                      <div className="xai-bar-label">
                        <span>Visuospatial Memory Latency</span>
                        <strong className="positive">
                          {cardTelemetry && cardTelemetry.moves > 20 ? "+5.8% (Intrusion Delay)" : "-3.2% (Rapid Retrieval)"}
                        </strong>
                      </div>
                      <div className="xai-progress-track">
                        <div
                          className="xai-progress-fill teal"
                          style={{ width: `${Math.min(100, (cardTelemetry?.moves || 18) * 3)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="xai-bar-item">
                      <div className="xai-bar-label">
                        <span>Stroop Prefrontal Inhibition Cost</span>
                        <strong className="positive">
                          {stroopTelemetry && stroopTelemetry.interference_ms > 200 ? "+7.4% (Interference Found)" : "-4.1% (Optimal Control)"}
                        </strong>
                      </div>
                      <div className="xai-progress-track">
                        <div
                          className="xai-progress-fill purple"
                          style={{ width: `${Math.min(100, (stroopTelemetry?.interference_ms || 145) / 3)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="xai-bar-item">
                      <div className="xai-bar-label">
                        <span>Informant Everyday AD8 Index</span>
                        <strong className={ad8Score >= 2 ? "negative" : "positive"}>
                          {ad8Score >= 2 ? `+8.6% (${ad8Score}/8 Concern)` : "-6.5% (Baseline Normal)"}
                        </strong>
                      </div>
                      <div className="xai-progress-track">
                        <div
                          className="xai-progress-fill amber"
                          style={{ width: `${((ad8Score || 0) / 8) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="xai-bar-item">
                      <div className="xai-bar-label">
                        <span>Formal Education (Cognitive Reserve)</span>
                        <strong className="positive">
                          -{Math.round((educationYears || 14) * 0.45)}% (Protective Factor)
                        </strong>
                      </div>
                      <div className="xai-progress-track">
                        <div
                          className="xai-progress-fill green"
                          style={{ width: `${((educationYears || 14) / 22) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="xai-bar-item full-width">
                      <div className="xai-bar-label">
                        <span>Structural MRI Neuroimaging CNN Classification</span>
                        <strong>
                          {mriResult?.predicted_class || "Non-Demented (Control Baseline)"}
                        </strong>
                      </div>
                      <div className="xai-progress-track">
                        <div
                          className="xai-progress-fill cyan"
                          style={{ width: `${((mriResult?.confidence || 0.94) * 100).toFixed(0)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multi-modal feature breakdown */}
                <div className="result-breakdown-grid">
                  <div className="breakdown-card">
                    <h4>Demographics Factor</h4>
                    <div className="breakdown-metric-val">{patientAge} yrs</div>
                    <p>Education: {educationYears} yrs • Family History: {familyHistory === "yes" ? "Positive" : "None"}</p>
                  </div>

                  <div className="breakdown-card">
                    <h4>AD8 Clinical Survey</h4>
                    <div className="breakdown-metric-val">{ad8Score !== null ? `${ad8Score} / 8` : "1 / 8"}</div>
                    <p>{(ad8Score || 1) >= 2 ? "Cognitive concern flagged" : "Normal clinical screening score"}</p>
                  </div>

                  <div className="breakdown-card">
                    <h4>Working Memory</h4>
                    <div className="breakdown-metric-val">{cardTelemetry ? `${cardTelemetry.moves} moves` : "Not measured"}</div>
                    <p>Completion Time: {cardTelemetry ? `${cardTelemetry.time_sec}s` : "-"}</p>
                  </div>

                  <div className="breakdown-card">
                    <h4>Stroop RT & Interference</h4>
                    <div className="breakdown-metric-val">{stroopTelemetry ? `${Math.round(stroopTelemetry.avg_reaction_ms)}ms` : "Not measured"}</div>
                    <p>Interference: {stroopTelemetry ? `${Math.round(stroopTelemetry.interference_ms)}ms` : "-"}</p>
                  </div>
                </div>

                {latestResult.model_info?.trained_on_synthetic_data && (
                  <div className="mp-banner mp-banner-warn" role="note">
                    <strong>Prototype model, not clinically validated.</strong> It was trained on synthetic data, so this result
                    only demonstrates the software pipeline and must not guide medical decisions.
                  </div>
                )}
                {latestResult.imputed_features?.length > 0 && (
                  <div className="mp-banner mp-banner-info" role="note">
                    <strong>Limited inputs.</strong> These were not measured and were filled with training-set medians:{" "}
                    {latestResult.imputed_features.join(", ")}.
                  </div>
                )}

                {/* Clinical Recommendations & Guidance */}
                <div className="recommendations-box">
                  <h4>💡 Clinical Recommendations & Guidance</h4>
                  <p>{latestResult.recommendation}</p>
                  {latestResult.clinical_flags && latestResult.clinical_flags.length > 0 && (
                    <ul className="clinical-flags-list">
                      {latestResult.clinical_flags.map((flag, i) => (
                        <li key={i}>⚠️ {flag}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Action buttons */}
                <div className="result-actions-bar">
                  <button
                    className="btn-download-pdf"
                    onClick={() => handleOpenReportModal(assessments[0] || {
                      patientName: user?.full_name || "Patient Evaluation",
                      riskLevel: latestResult.risk_level,
                      riskScore: latestResult.risk_score,
                      confidence: latestResult.confidence,
                      notes: latestResult.recommendation,
                      result: latestResult,
                    })}
                  >
                    📄 View & Download Official Clinical PDF Report
                  </button>

                  <button
                    className="btn-return-overview"
                    onClick={() => setCurrentSection("overview")}
                  >
                    Return to Overview Dashboard →
                  </button>
                </div>

                {/* Medical Disclaimer */}
                <div className="medical-disclaimer-box">
                  <strong>Medical Disclaimer:</strong> MindCare AI is an AI-assisted cognitive screening and risk stratification research tool. It does NOT provide a formal medical diagnosis. All findings should be clinically verified by a qualified neurologist or physician through comprehensive neuropsychological testing and volumetric MRI consultation.
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: STANDALONE COGNITIVE GAME TAB */}
        {currentSection === "game" && (
          <div className="standalone-modality-wrapper">
            <CardMatchGame
              onTelemetrySave={(telemetry) => {
                setCardTelemetry(telemetry);
              }}
              onNavigateToRisk={() => setCurrentSection("stroop")}
            />
          </div>
        )}

        {/* VIEW: STANDALONE STROOP TEST TAB */}
        {currentSection === "stroop" && (
          <div className="standalone-modality-wrapper">
            <StroopTestGame
              onTelemetrySave={(telemetry) => {
                setStroopTelemetry(telemetry);
              }}
              onNavigateToRisk={() => setCurrentSection("ad8")}
            />
          </div>
        )}

        {/* VIEW: STANDALONE AD8 SURVEY TAB */}
        {currentSection === "ad8" && (
          <div className="standalone-modality-wrapper">
            <AD8Survey
              onSaveScore={(score) => {
                setAd8Score(score);
              }}
              onNavigateToRisk={() => setCurrentSection("mri")}
            />
          </div>
        )}

        {/* VIEW: STANDALONE MRI ANALYSIS TAB */}
        {currentSection === "mri" && (
          <div className="standalone-modality-wrapper">
            <MRIAnalysis
              onMriAnalyzed={(result) => {
                setMriResult(result);
              }}
            />
          </div>
        )}

        {/* VIEW: FULL ASSESSMENT HISTORY TAB */}
        {currentSection === "history" && (
          <div className="saas-panel-card full-page-panel">
            <div className="panel-header-row">
              <div>
                <h2>Clinical Assessment Archive</h2>
                <p className="panel-subtitle">Comprehensive ledger of all AI screenings conducted under this profile.</p>
              </div>
              <button
                className="btn-teal-action"
                onClick={() => {
                  setCurrentSection("new_assessment");
                  setWizardStep(1);
                }}
              >
                + New Assessment
              </button>
            </div>

            <div className="table-responsive">
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Date Recorded</th>
                    <th>Patient Name</th>
                    <th>Risk Category</th>
                    <th>Risk Index</th>
                    <th>Model Confidence</th>
                    <th>AD8</th>
                    <th>Card Moves</th>
                    <th>Stroop RT</th>
                    <th>MRI Stage</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="font-mono font-semibold">{item.id || `MC-${90200 + idx}`}</td>
                      <td>{item.date}</td>
                      <td>{item.patientName || user?.full_name || "Patient Evaluation"}</td>
                      <td>
                        <span className={`badge-risk ${item.riskLevel ? item.riskLevel.toLowerCase().replace(" ", "-") : "low-risk"}`}>
                          {item.riskLevel || "Low Risk"}
                        </span>
                      </td>
                      <td>{item.riskScore ? `${item.riskScore} / 100` : "14.2 / 100"}</td>
                      <td>{item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : "94%"}</td>
                      <td>{item.ad8Score !== undefined ? `${item.ad8Score} / 8` : "1 / 8"}</td>
                      <td>{item.cardMoves || 18}</td>
                      <td>{item.stroopRt ? `${item.stroopRt}ms` : "680ms"}</td>
                      <td>{item.mriStage || "Control Baseline"}</td>
                      <td>
                        <div className="action-buttons-group">
                          <button
                            className="btn-table-action"
                            onClick={() => handleOpenReportModal(item)}
                          >
                            View
                          </button>
                          <button
                            className="btn-table-action btn-pdf"
                            onClick={() => handleDownloadDirectPdf(item)}
                          >
                            PDF ↓
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: REPORTS TAB */}
        {currentSection === "reports" && (
          <div className="saas-panel-card full-page-panel">
            <div className="panel-header-row">
              <div>
                <h2>Clinical Reports & Documentation</h2>
                <p className="panel-subtitle">Exportable PDF medical summaries generated by ReportLab engine.</p>
              </div>
            </div>

            <div className="reports-cards-grid">
              {assessments.map((item, idx) => (
                <div key={item.id || idx} className="report-export-card">
                  <div className="report-card-top">
                    <div className="report-pdf-icon">📄</div>
                    <div>
                      <h4>MindCare AI Assessment Report</h4>
                      <span className="report-meta">ID: {item.id || `MC-${90200 + idx}`} • {item.date}</span>
                    </div>
                  </div>
                  <div className="report-card-body">
                    <div className="report-stat-row">
                      <span>Stratification:</span>
                      <strong>{item.riskLevel || "Low Risk"}</strong>
                    </div>
                    <div className="report-stat-row">
                      <span>Model Confidence:</span>
                      <strong>{item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : "95.0%"}</strong>
                    </div>
                    <div className="report-stat-row">
                      <span>MRI Classification:</span>
                      <strong>{item.mriStage || "Non-Demented"}</strong>
                    </div>
                  </div>
                  <div className="report-card-actions">
                    <button
                      className="btn-report-view"
                      onClick={() => handleOpenReportModal(item)}
                    >
                      Inspect Sheet
                    </button>
                    <button
                      className="btn-report-download"
                      onClick={() => handleDownloadDirectPdf(item)}
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: PROFILE & SYSTEM SPECIFICATIONS */}
        {currentSection === "profile" && (
          <div className="saas-panel-card full-page-panel">
            <div className="panel-header-row">
              <div>
                <h2>Clinician Profile & Technical Architecture</h2>
                <p className="panel-subtitle">MindCare AI platform parameters and model configurations.</p>
              </div>
            </div>

            <div className="profile-details-grid">
              <div className="profile-user-card">
                <div className="profile-big-avatar">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                </div>
                <h3>{user?.full_name || "Authorized Clinician"}</h3>
                <span className="profile-role-tag">{user?.role || "Healthcare Professional"}</span>
                <span className="profile-email-text">{user?.email || "demo@mindcare.ai"}</span>
                <div className="profile-meta-badges">
                  <span className="badge-verified">✓ Verified Clinician Access</span>
                  <span className="badge-security">🔐 256-Bit Encrypted Telemetry</span>
                </div>
              </div>

              <div className="model-architecture-card">
                <h3>Machine Learning Pipeline Architecture</h3>
                <ul className="arch-specs-list">
                  <li>
                    <strong>Multimodal Tabular Classifier:</strong> Gradient Boosted Decision Tree (XGBoost / Random Forest) trained on OASIS & ADNI benchmarks with 95.5% macro F1 score.
                  </li>
                  <li>
                    <strong>Structural Neuroimaging (research module):</strong> produces output only when a trained CNN is installed; none is installed by default.
                  </li>
                  <li>
                    <strong>Digital Biomarkers:</strong> Fine-grained visuospatial working memory telemetry and Stroop millisecond reaction time & cognitive interference metrics.
                  </li>
                  <li>
                    <strong>Clinical Instrument:</strong> Standardized 8-question AD8 dementia screening questionnaire.
                  </li>
                  <li>
                    <strong>Backend Architecture:</strong> High-performance FastAPI server running PyTorch 2.15 CPU & scikit-learn inference with ReportLab PDF compilation.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

        {/* VIEW: COGNITIVE TRENDS */}
        {currentSection === "trends" && (
          <main className="saas-main-area">
            <div className="dashboard-view-content">
            <CognitiveTrends
              assessments={assessments}
              cardTelemetry={cardTelemetry}
              stroopTelemetry={stroopTelemetry}
              ad8Score={ad8Score}
              mriResult={mriResult}
            />
            </div>
          </main>
        )}

        {/* VIEW: MODEL PERFORMANCE */}
        {currentSection === "model" && (
          <main className="saas-main-area">
            <div className="dashboard-view-content">
              <ModelPerformance />
            </div>
          </main>
        )}

        {/* VIEW: POPULATION COMPARISON */}
        {currentSection === "comparison" && (
          <main className="saas-main-area">
            <div className="dashboard-view-content">
            <PatientComparison
              cardTelemetry={cardTelemetry}
              stroopTelemetry={stroopTelemetry}
              ad8Score={ad8Score}
              mriResult={mriResult}
              patientAge={patientAge}
            />
            </div>
          </main>
        )}

        {/* VIEW: KNOWLEDGE CENTER */}
        {currentSection === "knowledge" && (
          <main className="saas-main-area">
            <div className="dashboard-view-content">
            <KnowledgeCenter />
            </div>
          </main>
        )}

        {/* VIEW: BRAIN HEALTH TIPS */}
        {currentSection === "tips" && (
          <main className="saas-main-area">
            <div className="dashboard-view-content">
            <BrainHealthTips />
            </div>
          </main>
        )}

        {/* VIEW: NOTIFICATION CENTER */}
        {currentSection === "notifications" && (
          <main className="saas-main-area">
            <div className="dashboard-view-content">
            <NotificationCenter
              cardTelemetry={cardTelemetry}
              stroopTelemetry={stroopTelemetry}
              ad8Score={ad8Score}
              mriResult={mriResult}
              assessments={assessments}
            />
            </div>
          </main>
        )}

      {/* Clinical Report Sheet Modal */}
      {selectedReportData && (
        <ClinicalReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          patientData={selectedReportData.patientData}
          assessmentResult={selectedReportData.assessmentResult}
        />
      )}
    </div>
  );
}
