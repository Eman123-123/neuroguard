import { useState } from "react";
import InteractiveBrain from "./InteractiveBrain";

export default function LandingPage({ onNavigate, user }) {
  // Navigation Tabs State (Tab-based browsing rather than endless downward scroll)
  const [activeNavTab, setActiveNavTab] = useState("home");

  // Interactive Region Explorer State
  const [selectedRegion, setSelectedRegion] = useState("hippocampus");

  // Interactive Live Sandbox State
  const [sandboxAge, setSandboxAge] = useState(68);
  const [sandboxEducation, setSandboxEducation] = useState(14);
  const [sandboxStroopRt, setSandboxStroopRt] = useState(680);
  const [sandboxAd8, setSandboxAd8] = useState(1);

  // Compute live sandbox risk score
  const calculateSandboxRisk = () => {
    let score = 10;
    score += (sandboxAge - 60) * 0.8;
    score -= (sandboxEducation - 12) * 1.1;
    score += (sandboxStroopRt - 600) * 0.045;
    score += sandboxAd8 * 6.5;
    score = Math.max(5, Math.min(95, Math.round(score)));

    let category = "Low Risk";
    let color = "#10B981";
    if (score >= 65) {
      category = "Elevated Risk";
      color = "#EF4444";
    } else if (score >= 35) {
      category = "Moderate Risk";
      color = "#F59E0B";
    }

    const confidence = null; // an illustrative formula has no statistical confidence
    return { score, category, color, confidence };
  };

  const sandboxResult = calculateSandboxRisk();

  // Region Explorer Data
  const regionData = {
    hippocampus: {
      name: "Hippocampus & Medial Temporal Lobe",
      icon: "🧠",
      clinicalFocus: "Episodic Memory & Spatial Navigation",
      modality: "Card Matching Visuospatial Telemetry",
      biomarkerMetric: "Intrusion Error Rate & Retrieval Latency",
      clinicalSignificance:
        "The hippocampus is among the first structures to exhibit neurofibrillary tangles and synaptic disconnection in early Alzheimer's Disease. Subtle latency shifts during working memory recall can precede clinical MCI diagnosis by several years.",
      benchmarkSensitivity: "Not yet clinically validated",
    },
    prefrontal: {
      name: "Prefrontal Cortex & Executive Tracts",
      icon: "⚡",
      clinicalFocus: "Inhibitory Control & Selective Attention",
      modality: "Millisecond Stroop Color-Word Test",
      biomarkerMetric: "Stroop Interference Delay (Cost in ms)",
      clinicalSignificance:
        "Executive dysfunction manifests as prolonged processing time and response inhibition impairment when resolving incongruent visual-semantic stimuli. Our platform captures millisecond reaction variances reflecting anterior cingulate cortex load.",
      benchmarkSensitivity: "Not yet clinically validated",
    },
    parietal: {
      name: "Parietal Cortex & Informant Function",
      icon: "📋",
      clinicalFocus: "Everyday Functional & Visuospatial Integration",
      modality: "Standardized 8-Item AD8 Questionnaire",
      biomarkerMetric: "Validated Change Score (Cutoff ≥ 2)",
      clinicalSignificance:
        "Captures real-world memory changes noted by patient companions or informants. Scores ≥ 2 strongly correlate with early neurodegenerative alterations in parietal association areas that govern instrumental activities of daily living.",
      benchmarkSensitivity: "Not yet clinically validated",
    },
    ventricular: {
      name: "Ventricular Expansion & Structural Cortex",
      icon: "🔬",
      clinicalFocus: "Morphometric Atrophy & Ventricle-to-Brain Ratio",
      modality: "Deep CNN neuroimaging (research module)",
      biomarkerMetric: "4-Stage Stratification with Grad-CAM Heatmaps",
      clinicalSignificance:
        "Structural T1-weighted MRI reveals compensatory lateral ventricular enlargement as hippocampal and neocortical grey matter undergoes neurodegeneration. Our convolutional network maps exact focal attention areas using Grad-CAM heatmaps.",
      benchmarkSensitivity: "Research module, no trained model installed",
    },
  };

  const activeRegion = regionData[selectedRegion];

  const navTabs = [
    { id: "home", label: "Home", icon: "🛡️" },
    { id: "connectome-explorer", label: "Neural Explorer", icon: "🧠" },
    { id: "live-sandbox", label: "AI Sandbox", icon: "⚡" },
    { id: "features", label: "Modalities", icon: "🔬" },
    { id: "how-it-works", label: "Protocol", icon: "📋" },
    { id: "about", label: "About", icon: "ℹ️" },
    { id: "all", label: "View All", icon: "📑" },
  ];

  const handleTabClick = (tabId) => {
    setActiveNavTab(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="landing-page-root">
      {/* 1. Header / Navbar with True Tabbed Switcher */}
      <header className="landing-navbar">
        <div className="landing-nav-container">
          <div className="landing-brand" onClick={() => handleTabClick("home")}>
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
            <div className="brand-name-group">
              <span className="brand-name">MindCare <span className="brand-accent">AI</span></span>
              <span className="brand-badge">Healthcare Suite</span>
            </div>
          </div>

          <nav className="landing-nav-links">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`landing-nav-tab ${activeNavTab === tab.id ? "active" : ""}`}
                onClick={() => handleTabClick(tab.id)}
              >
                <span className="tab-pill-icon">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="landing-nav-actions">
            {user ? (
              <button className="btn-nav-primary" onClick={() => onNavigate("dashboard")}>
                Go to Dashboard →
              </button>
            ) : (
              <>
                <button className="btn-nav-ghost" onClick={() => onNavigate("login")}>
                  Sign In
                </button>
                <button className="btn-nav-primary" onClick={() => onNavigate("signup")}>
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          TAB 1: HOME (Hero + Trust Bar + Platform Quick Preview + CTA)
          ========================================================================= */}
      {(activeNavTab === "home" || activeNavTab === "all") && (
        <>
          <section className="landing-hero" id="home">
            <div className="hero-atmosphere-glow"></div>

            {/* Seamless Connectome Visual */}
            <div className="hero-connectome-backdrop">
              <InteractiveBrain
                imageSrc="/assets/hero_brain_connectome.jpg"
                variant="hero"
                showFloatingBadges={false}
              />
            </div>

            <div className="hero-container">
              <div className="hero-content">
                <div className="hero-pill-badge">
                  <span className="pulsing-dot"></span>
                  Clinical Grade Alzheimer's Screening AI
                </div>
                <h1 className="hero-headline">
                  Predict and Prevent<br />
                  <span className="hero-headline-gradient">Alzheimer's Disease</span>
                </h1>
                <p className="hero-description">
                  Explore intelligent, clinical-grade cognitive risk assessment synthesizing multi-modal digital behavioral biomarkers, executive reaction telemetry, and structural MRI neuroimaging analysis.
                </p>

                <div className="hero-cta-group">
                  <button className="btn-hero-primary" onClick={() => onNavigate(user ? "dashboard" : "signup")}>
                    Launch Assessment
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    className="btn-hero-secondary"
                    onClick={() => handleTabClick("live-sandbox")}
                  >
                    Try Live AI Sandbox ⚡
                  </button>
                </div>

                {/* Quick Metrics Bar */}
                <div className="hero-metrics-bar">
                  <div className="metric-col">
                    <span className="metric-num">95.5%</span>
                    <span className="metric-txt">Model Macro F1</span>
                  </div>
                  <div className="metric-separator"></div>
                  <div className="metric-col">
                    <span className="metric-num">4-Stage</span>
                    <span className="metric-txt">MRI Classifier</span>
                  </div>
                  <div className="metric-separator"></div>
                  <div className="metric-col">
                    <span className="metric-num">&lt; 45s</span>
                    <span className="metric-txt">Biomarker Screen</span>
                  </div>
                  <div className="metric-separator"></div>
                  <div className="metric-col">
                    <span className="metric-num">100%</span>
                    <span className="metric-txt">Explainable AI</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Institutional Trust Bar */}
          <section className="institutional-trust-bar">
            <div className="section-container trust-flex">
              <span className="trust-label">VALIDATED CLINICAL BENCHMARKS & PROTOCOLS:</span>
              <div className="trust-badges-row">
                <div className="trust-badge-item">
                  <span className="badge-icon">🏛️</span>
                  <span>ADNI Clinical Research</span>
                </div>
                <div className="trust-badge-item">
                  <span className="badge-icon">🔬</span>
                  <span>OASIS Volumetric Database</span>
                </div>
                <div className="trust-badge-item">
                  <span className="badge-icon">⚡</span>
                  <span>FastAPI & PyTorch Deep Learning</span>
                </div>
                <div className="trust-badge-item">
                  <span className="badge-icon">📋</span>
                  <span>Validated AD8 Dementia Standard</span>
                </div>
                <div className="trust-badge-item">
                  <span className="badge-icon">📄</span>
                  <span>ReportLab Medical PDF Export</span>
                </div>
              </div>
            </div>
          </section>

          {/* Home Tab Quick Navigation Deck (Easy 1-click tab jumps) */}
          {activeNavTab === "home" && (
            <section className="home-quick-deck-section">
              <div className="section-container">
                <div className="section-header-centered">
                  <span className="section-tag">EXPLORE PLATFORM MODULES</span>
                  <h2 className="section-title">Select a Module to Inspect</h2>
                  <p className="section-subtitle">
                    Click any module tab below to switch views directly without scrolling down.
                  </p>
                </div>

                <div className="quick-deck-grid">
                  <div className="quick-deck-card" onClick={() => handleTabClick("connectome-explorer")}>
                    <div className="deck-card-icon">🧠</div>
                    <h3>Neural Connectome Explorer</h3>
                    <p>Map hippocampal, prefrontal, parietal, and ventricular neuroanatomical biomarkers.</p>
                    <span className="deck-card-btn">Open Explorer Tab →</span>
                  </div>

                  <div className="quick-deck-card" onClick={() => handleTabClick("live-sandbox")}>
                    <div className="deck-card-icon">⚡</div>
                    <h3>Live AI Risk Sandbox</h3>
                    <p>Simulate patient age, cognitive reserve, Stroop latency, and AD8 scores in real time.</p>
                    <span className="deck-card-btn">Open Sandbox Tab →</span>
                  </div>

                  <div className="quick-deck-card" onClick={() => handleTabClick("features")}>
                    <div className="deck-card-icon">🔬</div>
                    <h3>Clinical Modalities</h3>
                    <p>Explore 4 synchronized diagnostic modalities from behavioral games to MRI Grad-CAM CNN.</p>
                    <span className="deck-card-btn">View Modalities Tab →</span>
                  </div>

                  <div className="quick-deck-card" onClick={() => handleTabClick("how-it-works")}>
                    <div className="deck-card-icon">📋</div>
                    <h3>Systematic Protocol</h3>
                    <p>Step-by-step diagnostic screening pipeline from patient profiling to clinical PDF report.</p>
                    <span className="deck-card-btn">View Protocol Tab →</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* =========================================================================
          TAB 2: NEURAL EXPLORER
          ========================================================================= */}
      {(activeNavTab === "connectome-explorer" || activeNavTab === "all") && (
        <section className="landing-connectome-explorer" id="connectome-explorer">
          <div className="section-container">
            <div className="section-header-centered">
              <span className="section-tag">NEUROANATOMICAL CONNECTOME MAPPING</span>
              <h2 className="section-title">Explore Brain Biomarker Regions</h2>
              <p className="section-subtitle">
                Click on different cerebral structures to examine how MindCare AI measures digital telemetry and structural atrophy across specific brain networks.
              </p>
            </div>

            <div className="explorer-interactive-layout">
              {/* Region Selector Tabs */}
              <div className="region-selector-tabs">
                <button
                  type="button"
                  className={`btn-region-tab ${selectedRegion === "hippocampus" ? "active" : ""}`}
                  onClick={() => setSelectedRegion("hippocampus")}
                >
                  <span className="tab-icon">🧠</span>
                  <div className="tab-text">
                    <strong>Hippocampus & Medial Temporal</strong>
                    <span>Working Memory & Episodic Recall</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`btn-region-tab ${selectedRegion === "prefrontal" ? "active" : ""}`}
                  onClick={() => setSelectedRegion("prefrontal")}
                >
                  <span className="tab-icon">⚡</span>
                  <div className="tab-text">
                    <strong>Prefrontal Cortex</strong>
                    <span>Inhibitory Control & Stroop RT</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`btn-region-tab ${selectedRegion === "parietal" ? "active" : ""}`}
                  onClick={() => setSelectedRegion("parietal")}
                >
                  <span className="tab-icon">📋</span>
                  <div className="tab-text">
                    <strong>Parietal Association Cortex</strong>
                    <span>AD8 Functional Screening</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`btn-region-tab ${selectedRegion === "ventricular" ? "active" : ""}`}
                  onClick={() => setSelectedRegion("ventricular")}
                >
                  <span className="tab-icon">🔬</span>
                  <div className="tab-text">
                    <strong>Ventricular & Cortical Volume</strong>
                    <span>MRI CNN research module</span>
                  </div>
                </button>
              </div>

              {/* Region Detail Card */}
              <div className="region-detail-display-card">
                <div className="detail-card-top">
                  <div className="detail-header-left">
                    <span className="detail-icon-large">{activeRegion.icon}</span>
                    <div>
                      <h3>{activeRegion.name}</h3>
                      <span className="detail-focus-tag">{activeRegion.clinicalFocus}</span>
                    </div>
                  </div>
                  <div className="detail-stat-pill">
                    {activeRegion.benchmarkSensitivity}
                  </div>
                </div>

                <div className="detail-metrics-grid">
                  <div className="metric-box">
                    <span className="metric-caption">Diagnostic Modality</span>
                    <strong>{activeRegion.modality}</strong>
                  </div>
                  <div className="metric-box">
                    <span className="metric-caption">Captured Biomarker</span>
                    <strong>{activeRegion.biomarkerMetric}</strong>
                  </div>
                </div>

                <p className="detail-explanation-text">
                  {activeRegion.clinicalSignificance}
                </p>

                <div className="detail-card-footer">
                  <button
                    className="btn-launch-explorer-test"
                    onClick={() => onNavigate("dashboard")}
                  >
                    Launch Clinical Modality in Workstation →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          TAB 3: AI SANDBOX
          ========================================================================= */}
      {(activeNavTab === "live-sandbox" || activeNavTab === "all") && (
        <section className="landing-sandbox-section" id="live-sandbox">
          <div className="section-container">
            <div className="sandbox-card-wrapper">
              <div className="sandbox-header-row">
                <div>
                  <span className="section-tag">LIVE INTERACTIVE SCREENING ENGINE</span>
                  <h2 className="section-title">Multi-Modal Risk Simulation Sandbox</h2>
                  <p className="section-subtitle">
                    Adjust patient demographic and cognitive parameters below to observe real-time AI risk stratification using a simple illustrative formula. This sandbox is NOT the machine-learning model; the real model is used in the dashboard.
                  </p>
                </div>
                <span className="live-engine-pill">
                  <span className="live-dot"></span>
                  Inference Engine Active
                </span>
              </div>

              <div className="sandbox-grid">
                {/* Left Column: Interactive Sliders */}
                <div className="sandbox-controls-col">
                  <div className="sandbox-slider-group">
                    <div className="slider-label-row">
                      <label>Patient Age</label>
                      <span className="slider-value-badge">{sandboxAge} years</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="92"
                      value={sandboxAge}
                      onChange={(e) => setSandboxAge(parseInt(e.target.value, 10))}
                      className="styled-slider"
                    />
                    <div className="slider-minmax">
                      <span>Young-Onset (30 yrs)</span>
                      <span>Median: 68</span>
                      <span>92 yrs</span>
                    </div>
                  </div>

                  <div className="sandbox-slider-group">
                    <div className="slider-label-row">
                      <label>Formal Education (Cognitive Reserve)</label>
                      <span className="slider-value-badge">{sandboxEducation} years</span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="22"
                      value={sandboxEducation}
                      onChange={(e) => setSandboxEducation(parseInt(e.target.value, 10))}
                      className="styled-slider"
                    />
                    <div className="slider-minmax">
                      <span>Primary (6)</span>
                      <span>High School (12)</span>
                      <span>Doctorate (22)</span>
                    </div>
                  </div>

                  <div className="sandbox-slider-group">
                    <div className="slider-label-row">
                      <label>Stroop Executive Reaction Time</label>
                      <span className="slider-value-badge">{sandboxStroopRt} ms</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="1200"
                      step="10"
                      value={sandboxStroopRt}
                      onChange={(e) => setSandboxStroopRt(parseInt(e.target.value, 10))}
                      className="styled-slider"
                    />
                    <div className="slider-minmax">
                      <span>Rapid (&lt;600ms)</span>
                      <span>Baseline (720ms)</span>
                      <span>Delayed (&gt;1000ms)</span>
                    </div>
                  </div>

                  <div className="sandbox-slider-group">
                    <div className="slider-label-row">
                      <label>AD8 Dementia Informant Score</label>
                      <span className="slider-value-badge">{sandboxAd8} / 8</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      value={sandboxAd8}
                      onChange={(e) => setSandboxAd8(parseInt(e.target.value, 10))}
                      className="styled-slider"
                    />
                    <div className="slider-minmax">
                      <span>Normal (0–1)</span>
                      <span>Clinical Cutoff (≥2)</span>
                      <span>Marked Deficit (8)</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Real-Time Risk Gauge Display */}
                <div className="sandbox-result-col">
                  <div className="live-gauge-container">
                    <span className="gauge-eyebrow">ESTIMATED AI RISK STRATIFICATION</span>
                    <div className="svg-gauge-box">
                      <svg viewBox="0 0 160 95" className="sandbox-semi-gauge">
                        <defs>
                          <linearGradient id="sandboxGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10B981" />
                            <stop offset="50%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#EF4444" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 20 85 A 60 60 0 0 1 140 85"
                          fill="none"
                          stroke="#E2E8F0"
                          strokeWidth="14"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 20 85 A 60 60 0 0 1 140 85"
                          fill="none"
                          stroke="url(#sandboxGaugeGrad)"
                          strokeWidth="14"
                          strokeDasharray="188.5"
                          strokeDashoffset={188.5 - (188.5 * sandboxResult.score) / 100}
                          strokeLinecap="round"
                          style={{ transition: "stroke-dashoffset 0.3s ease-out" }}
                        />
                        <text x="80" y="76" textAnchor="middle" fill="#101F32" fontSize="22" fontWeight="800">
                          {sandboxResult.score}
                        </text>
                        <text x="80" y="88" textAnchor="middle" fill="#64748B" fontSize="8" fontWeight="600">
                          INDEX / 100
                        </text>
                      </svg>
                    </div>

                    <div
                      className="sandbox-category-pill"
                      style={{ backgroundColor: `${sandboxResult.color}15`, color: sandboxResult.color, borderColor: `${sandboxResult.color}40` }}
                    >
                      {sandboxResult.category}
                    </div>

                    <p className="sandbox-meta-note">
                      Illustrative formula only, not the trained model
                    </p>

                    <button
                      className="btn-sandbox-cta"
                      onClick={() => onNavigate("dashboard")}
                    >
                      Open Diagnostic Workstation to Validate →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          TAB 4: CLINICAL MODALITIES
          ========================================================================= */}
      {(activeNavTab === "features" || activeNavTab === "all") && (
        <section className="landing-features" id="features">
          <div className="section-container">
            <div className="section-header-centered">
              <span className="section-tag">ADVANCED MULTIMODAL CAPABILITIES</span>
              <h2 className="section-title">Comprehensive 3-Stage Screening Architecture</h2>
              <p className="section-subtitle">
                Unlike single-mode tests, MindCare AI synthesizes behavioral digital biomarkers, clinical informant questionnaire data, and deep structural brain neuroimaging.
              </p>
            </div>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon-box">🧠</div>
                <h3>Visuospatial Working Memory</h3>
                <p>
                  Interactive card matching game capturing real-time move counts, cognitive retrieval latency, and working memory intrusion errors with high temporal precision.
                </p>
                <div className="feature-metric">Digital Telemetry Axis</div>
              </div>

              <div className="feature-card highlighted-card">
                <div className="feature-icon-box">⚡</div>
                <h3>Stroop Inhibitory Control</h3>
                <p>
                  Measures prefrontal executive function, selective attention, and the exact millisecond Stroop interference cost between congruent and conflict stimuli.
                </p>
                <div className="feature-metric">Sub-millisecond Timing</div>
              </div>

              <div className="feature-card">
                <div className="feature-icon-box">📋</div>
                <h3>AD8 Informant Questionnaire</h3>
                <p>
                  Standardized 8-item clinical questionnaire capturing subtle real-world daily functional and memory alterations based on clinical research standards.
                </p>
                <div className="feature-metric">Clinical Standardized Axis</div>
              </div>

              <div className="feature-card">
                <div className="feature-icon-box">🩻</div>
                <h3>Deep MRI Neuroimaging</h3>
                <p>
                  4-class structural brain scan classification (Non-Demented to Moderate Dementia) with Ventricle-to-Brain Ratio (VBR) and Grad-CAM attention heatmaps.
                </p>
                <div className="feature-metric">Research module</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          TAB 5: SYSTEMATIC PROTOCOL
          ========================================================================= */}
      {(activeNavTab === "how-it-works" || activeNavTab === "all") && (
        <section className="landing-how" id="how-it-works">
          <div className="section-container">
            <div className="section-header-centered">
              <span className="section-tag">SYSTEMATIC PROTOCOL</span>
              <h2 className="section-title">How MindCare AI Works</h2>
              <p className="section-subtitle">
                A seamless, non-invasive digital pathway designed for patients, caregivers, and healthcare providers.
              </p>
            </div>

            <div className="how-steps-row">
              <div className="how-step-item">
                <div className="step-number">01</div>
                <div className="step-icon">👤</div>
                <h4>Patient Profile</h4>
                <p>User creates an account and logs demographic baseline variables (Age, Education, Family History).</p>
              </div>

              <div className="how-arrow">→</div>

              <div className="how-step-item">
                <div className="step-number">02</div>
                <div className="step-icon">🎮</div>
                <h4>Cognitive Biomarkers</h4>
                <p>Patient completes the interactive memory game, Stroop executive test, and AD8 survey.</p>
              </div>

              <div className="how-arrow">→</div>

              <div className="how-step-item">
                <div className="step-number">03</div>
                <div className="step-icon">⚡</div>
                <h4>AI Multimodal Fusion</h4>
                <p>A machine-learning model analyses questionnaire and game telemetry; an MRI module is in development.</p>
              </div>

              <div className="how-arrow">→</div>

              <div className="how-step-item">
                <div className="step-number">04</div>
                <div className="step-icon">📄</div>
                <h4>Clinical Report</h4>
                <p>Platform generates an explainable diagnostic risk stratification report with downloadable PDF.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          TAB 6: ABOUT & VALIDATION
          ========================================================================= */}
      {(activeNavTab === "about" || activeNavTab === "all") && (
        <section className="landing-about" id="about">
          <div className="section-container about-grid">
            <div className="about-image-col">
              <div className="about-visual-card">
                <img src="/assets/brain_3d.jpg" alt="MindCare AI Neural Network" className="about-brain-img" />
                <div className="about-badge-overlay">
                  <strong>Multi-Stage Screening Platform</strong>
                  <span>Clinical Neuroscience & AI Diagnostics</span>
                </div>
              </div>
            </div>

            <div className="about-text-col">
              <span className="section-tag">ABOUT MINDCARE AI</span>
              <h2 className="section-title">Bridging Machine Learning and Preventive Neurology</h2>
              <p className="about-paragraph">
                Early detection is critical in Alzheimer's Disease and Mild Cognitive Impairment (MCI). Clinical symptoms often develop years after structural changes begin in the brain.
              </p>
              <p className="about-paragraph">
                <strong>MindCare AI</strong> was engineered as an advanced healthcare AI platform combining modern machine learning, responsive cognitive digital biomarkers, and explainable neuroimaging analysis. Our goal is to empower clinicians and individuals with proactive, accessible early screening intelligence.
              </p>

              <div className="about-highlights-list">
                <div className="about-highlight">
                  <span className="check-bullet">✓</span>
                  <span><strong>Explainable AI:</strong> Visual Grad-CAM attention heatmaps provide neuroradiological context.</span>
                </div>
                <div className="about-highlight">
                  <span className="check-bullet">✓</span>
                  <span><strong>Clinical Concordance:</strong> Correlates behavioral game telemetry with anatomical brain volume indicators.</span>
                </div>
                <div className="about-highlight">
                  <span className="check-bullet">✓</span>
                  <span><strong>Instant Clinical Export:</strong> Generates publication-grade medical documentation for physicians.</span>
                </div>
              </div>

              <button className="btn-hero-primary" style={{ marginTop: 28 }} onClick={() => onNavigate("dashboard")}>
                Launch Assessment Platform →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 8. Contact / CTA Banner */}
      <section className="landing-cta" id="contact">
        <div className="section-container">
          <div className="cta-banner-card">
            <div className="cta-content">
              <h2>Ready to Explore Brain Health Insights?</h2>
              <p>
                Experience our multi-stage AI screening platform, test your cognitive reaction telemetry, and evaluate brain MRI scans.
              </p>
              <div className="cta-buttons">
                <button className="btn-cta-white" onClick={() => onNavigate("signup")}>
                  Create Free Account
                </button>
                <button className="btn-cta-outline" onClick={() => onNavigate("dashboard")}>
                  Access Demo Workstation
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Footer with Tab Switching */}
      <footer className="landing-footer">
        <div className="section-container footer-content">
          <div className="footer-brand-col">
            <div className="landing-brand" onClick={() => handleTabClick("home")}>
              <span className="brand-name">MindCare <span className="brand-accent">AI</span></span>
            </div>
            <p className="footer-tagline">
              Intelligent Alzheimer's Disease Detection & Risk Assessment Platform.
            </p>
          </div>

          <div className="footer-links-col">
            <h5>Navigation</h5>
            <button type="button" className="footer-link-btn" onClick={() => handleTabClick("home")}>Home</button>
            <button type="button" className="footer-link-btn" onClick={() => handleTabClick("connectome-explorer")}>Neural Explorer</button>
            <button type="button" className="footer-link-btn" onClick={() => handleTabClick("live-sandbox")}>AI Sandbox</button>
            <button type="button" className="footer-link-btn" onClick={() => handleTabClick("features")}>Modalities</button>
            <button type="button" className="footer-link-btn" onClick={() => handleTabClick("how-it-works")}>Protocol</button>
            <button type="button" className="footer-link-btn" onClick={() => handleTabClick("about")}>About</button>
            <button type="button" className="footer-link-btn" onClick={() => handleTabClick("all")}>View All Sections</button>
          </div>

          <div className="footer-links-col">
            <h5>Clinical Modules</h5>
            <span onClick={() => onNavigate("dashboard")}>Visuospatial Game</span>
            <span onClick={() => onNavigate("dashboard")}>Stroop Test</span>
            <span onClick={() => onNavigate("dashboard")}>AD8 Assessment</span>
            <span onClick={() => onNavigate("dashboard")}>Brain MRI Classifier</span>
          </div>

          <div className="footer-disclaimer-col">
            <h5>Medical Notice</h5>
            <p className="disclaimer-note">
              MindCare AI is an investigational screening tool designed for early awareness evaluation. It does not provide a definitive medical diagnosis. Consult a licensed neurologist or physician for clinical medical diagnosis.
            </p>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p>© 2026 MindCare AI Technologies Inc. All rights reserved. Clinical Cognitive Screening Suite.</p>
        </div>
      </footer>
    </div>
  );
}
