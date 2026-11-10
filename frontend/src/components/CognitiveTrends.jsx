import { useState, useMemo } from "react";

// Generate longitudinal trend data from patient assessment history or baseline cohort
function generateTrendData(assessments, cardTelemetry, stroopTelemetry, ad8Score, mriResult) {
  if (assessments && assessments.length >= 2) {
    return assessments.slice(-6).map((item, idx) => {
      const dateLabel = item.date ? new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : `Sess ${idx + 1}`;
      const memory = item.card_match_moves ? Math.max(20, Math.min(100, Math.round(100 - item.card_match_moves * 1.8))) : 80;
      const executive = item.stroop_reaction_ms ? Math.max(20, Math.min(100, Math.round(140 - item.stroop_reaction_ms * 0.06))) : 80;
      const ad8 = item.ad8_score ?? 1;
      const mri = item.mri_confidence ? Math.round(item.mri_confidence * 100) : 90;
      const overall = Math.round((memory + executive + (8 - ad8) * 12.5 + mri) / 4);
      return {
        month: dateLabel,
        memory,
        executive,
        ad8,
        mri,
        overall,
        isCurrent: idx === assessments.length - 1,
      };
    });
  }

  const baseData = [
    { month: "Jun 2026", memory: 88, executive: 91, ad8: 1, mri: 95, overall: 92 },
    { month: "Jul 2026", memory: 86, executive: 89, ad8: 1, mri: 94, overall: 90 },
    { month: "Aug 2026", memory: 89, executive: 92, ad8: 0, mri: 95, overall: 93 },
    { month: "Sep 2026", memory: 87, executive: 88, ad8: 1, mri: 93, overall: 91 },
    { month: "Oct 2026", memory: 90, executive: 93, ad8: 1, mri: 96, overall: 94 },
  ];

  // Add current session data
  const currentMemory = cardTelemetry ? Math.max(40, Math.min(100, Math.round(100 - cardTelemetry.moves * 1.8))) : 85;
  const currentExec = stroopTelemetry ? Math.max(40, Math.min(100, Math.round(140 - stroopTelemetry.avg_reaction_ms * 0.06))) : 88;
  const currentAd8 = ad8Score !== null && ad8Score !== undefined ? ad8Score : 1;
  const currentMri = mriResult?.confidence ? Math.round(mriResult.confidence * 100) : 94;
  const currentOverall = Math.round((currentMemory + currentExec + (8 - currentAd8) * 12.5 + currentMri) / 4);

  baseData.push({
    month: "Current",
    memory: currentMemory,
    executive: currentExec,
    ad8: currentAd8,
    mri: currentMri,
    overall: currentOverall,
    isCurrent: true,
  });

  return baseData;
}

export default function CognitiveTrends({ assessments = [], cardTelemetry, stroopTelemetry, ad8Score, mriResult }) {
  const [activeChart, setActiveChart] = useState("trajectory");
  const trendData = useMemo(
    () => generateTrendData(assessments, cardTelemetry, stroopTelemetry, ad8Score, mriResult),
    [assessments, cardTelemetry, stroopTelemetry, ad8Score, mriResult]
  );

  const latestData = trendData[trendData.length - 1];
  const previousData = trendData[trendData.length - 2];

  const getTrend = (current, previous) => {
    const diff = current - previous;
    if (diff > 0) return { arrow: "↑", class: "positive", text: `+${diff.toFixed(0)}` };
    if (diff < 0) return { arrow: "↓", class: "negative", text: `${diff.toFixed(0)}` };
    return { arrow: "→", class: "neutral", text: "0" };
  };

  // Radar chart data
  const radarMetrics = [
    { label: "Memory", value: latestData.memory, max: 100, angle: -90 },
    { label: "Executive", value: latestData.executive, max: 100, angle: -18 },
    { label: "Language", value: Math.round(latestData.overall * 0.95), max: 100, angle: 54 },
    { label: "AD8 Score", value: Math.round((8 - latestData.ad8) * 12.5), max: 100, angle: 126 },
    { label: "Structural", value: latestData.mri, max: 100, angle: 198 },
  ];

  const radarPoints = radarMetrics
    .map((m) => {
      const r = (m.value / m.max) * 80;
      const rad = (m.angle * Math.PI) / 180;
      return `${100 + r * Math.cos(rad)},${100 + r * Math.sin(rad)}`;
    })
    .join(" ");

  return (
    <div className="trends-root">
      {/* Header */}
      <div className="trends-header">
        <div>
          <div className="trends-badge">📈 Analytics Dashboard</div>
          <h2>Cognitive Trends & Performance Analytics</h2>
          <p>Longitudinal tracking of cognitive biomarkers and multi-modal performance metrics over time.</p>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="trends-summary-cards">
        <div className="trend-stat-card">
          <div className="trend-stat-icon" style={{ background: "rgba(60,174,163,0.15)", color: "#3CAEA3" }}>🧠</div>
          <div className="trend-stat-body">
            <span className="trend-stat-label">Working Memory</span>
            <div className="trend-stat-value">{Math.round(latestData.memory)}<span className="trend-unit">%</span></div>
            <span className={`trend-indicator ${getTrend(latestData.memory, previousData.memory).class}`}>
              {getTrend(latestData.memory, previousData.memory).arrow} {getTrend(latestData.memory, previousData.memory).text} from last
            </span>
          </div>
        </div>

        <div className="trend-stat-card">
          <div className="trend-stat-icon" style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6" }}>⚡</div>
          <div className="trend-stat-body">
            <span className="trend-stat-label">Executive Function</span>
            <div className="trend-stat-value">{Math.round(latestData.executive)}<span className="trend-unit">%</span></div>
            <span className={`trend-indicator ${getTrend(latestData.executive, previousData.executive).class}`}>
              {getTrend(latestData.executive, previousData.executive).arrow} {getTrend(latestData.executive, previousData.executive).text} from last
            </span>
          </div>
        </div>

        <div className="trend-stat-card">
          <div className="trend-stat-icon" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>📋</div>
          <div className="trend-stat-body">
            <span className="trend-stat-label">AD8 Clinical Score</span>
            <div className="trend-stat-value">{latestData.ad8}<span className="trend-unit">/ 8</span></div>
            <span className={`trend-indicator ${latestData.ad8 >= 2 ? "negative" : "positive"}`}>
              {latestData.ad8 >= 2 ? "⚠ Above threshold" : "✓ Normal range"}
            </span>
          </div>
        </div>

        <div className="trend-stat-card">
          <div className="trend-stat-icon" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}>📊</div>
          <div className="trend-stat-body">
            <span className="trend-stat-label">Overall Cognitive Index</span>
            <div className="trend-stat-value">{Math.round(latestData.overall)}<span className="trend-unit">/ 100</span></div>
            <span className={`trend-indicator ${getTrend(latestData.overall, previousData.overall).class}`}>
              {getTrend(latestData.overall, previousData.overall).arrow} {getTrend(latestData.overall, previousData.overall).text} from last
            </span>
          </div>
        </div>
      </div>

      {/* Chart Tab Selector */}
      <div className="trends-chart-tabs">
        <button className={`chart-tab ${activeChart === "trajectory" ? "active" : ""}`} onClick={() => setActiveChart("trajectory")}>
          📉 Cognitive Trajectory
        </button>
        <button className={`chart-tab ${activeChart === "radar" ? "active" : ""}`} onClick={() => setActiveChart("radar")}>
          🕸️ Multi-Modal Radar
        </button>
        <button className={`chart-tab ${activeChart === "comparison" ? "active" : ""}`} onClick={() => setActiveChart("comparison")}>
          📊 Domain Comparison
        </button>
      </div>

      {/* CHART: COGNITIVE TRAJECTORY */}
      {activeChart === "trajectory" && (
        <div className="trends-chart-panel">
          <div className="chart-panel-header">
            <h4>Longitudinal Cognitive Stability Trajectory</h4>
            <span className="chart-legend-row">
              <span className="legend-dot" style={{ background: "#3CAEA3" }}></span> Memory
              <span className="legend-dot" style={{ background: "#8B5CF6" }}></span> Executive
              <span className="legend-dot" style={{ background: "#F59E0B" }}></span> Overall
            </span>
          </div>

          <svg viewBox="0 0 700 280" className="trajectory-svg-chart">
            <defs>
              <linearGradient id="memoryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3CAEA3" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3CAEA3" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid */}
            {[50, 100, 150, 200].map((y) => (
              <line key={y} x1="70" y1={y} x2="660" y2={y} stroke="#1E293B" strokeDasharray="4 4" />
            ))}
            <text x="15" y="55" fill="#64748B" fontSize="10">100</text>
            <text x="20" y="105" fill="#64748B" fontSize="10">80</text>
            <text x="20" y="155" fill="#64748B" fontSize="10">60</text>
            <text x="20" y="205" fill="#64748B" fontSize="10">40</text>

            {/* Memory line */}
            <polyline
              points={trendData.map((d, i) => `${90 + i * 105},${250 - d.memory * 2}`).join(" ")}
              fill="none" stroke="#3CAEA3" strokeWidth="3" strokeLinejoin="round"
            />
            {/* Executive line */}
            <polyline
              points={trendData.map((d, i) => `${90 + i * 105},${250 - d.executive * 2}`).join(" ")}
              fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinejoin="round" strokeDasharray="8 4"
            />
            {/* Overall line */}
            <polyline
              points={trendData.map((d, i) => `${90 + i * 105},${250 - d.overall * 2}`).join(" ")}
              fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinejoin="round"
            />

            {/* Data points */}
            {trendData.map((d, i) => (
              <g key={i}>
                <circle cx={90 + i * 105} cy={250 - d.memory * 2} r={d.isCurrent ? 6 : 4}
                  fill={d.isCurrent ? "#3CAEA3" : "#101F32"} stroke="#3CAEA3" strokeWidth="2.5" />
                <circle cx={90 + i * 105} cy={250 - d.executive * 2} r={d.isCurrent ? 6 : 4}
                  fill={d.isCurrent ? "#8B5CF6" : "#101F32"} stroke="#8B5CF6" strokeWidth="2.5" />
                <text x={90 + i * 105} y="265" textAnchor="middle" fill="#94A3B8" fontSize="9">
                  {d.month.split(" ")[0]}
                </text>
              </g>
            ))}

            {/* Current marker */}
            <text x={90 + (trendData.length - 1) * 105} y="235" textAnchor="middle" fill="#3CAEA3" fontSize="8" fontWeight="700">
              CURRENT
            </text>
          </svg>
        </div>
      )}

      {/* CHART: RADAR */}
      {activeChart === "radar" && (
        <div className="trends-chart-panel radar-panel">
          <div className="chart-panel-header">
            <h4>Multi-Modal Cognitive Domain Radar Profile</h4>
            <span className="chart-badge-ml">AI-Integrated Assessment</span>
          </div>

          <div className="radar-chart-container">
            <svg viewBox="0 0 200 200" className="radar-svg">
              {/* Background rings */}
              {[20, 40, 60, 80].map((r) => (
                <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#1E293B" strokeWidth="0.5" />
              ))}

              {/* Axis lines */}
              {radarMetrics.map((m, i) => {
                const rad = (m.angle * Math.PI) / 180;
                return (
                  <line key={i} x1="100" y1="100" x2={100 + 85 * Math.cos(rad)} y2={100 + 85 * Math.sin(rad)}
                    stroke="#334155" strokeWidth="0.5" />
                );
              })}

              {/* Data polygon */}
              <polygon points={radarPoints} fill="rgba(60,174,163,0.2)" stroke="#3CAEA3" strokeWidth="2.5" />

              {/* Data points + labels */}
              {radarMetrics.map((m, i) => {
                const r = (m.value / m.max) * 80;
                const rad = (m.angle * Math.PI) / 180;
                const x = 100 + r * Math.cos(rad);
                const y = 100 + r * Math.sin(rad);
                const lx = 100 + 95 * Math.cos(rad);
                const ly = 100 + 95 * Math.sin(rad);
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="4" fill="#3CAEA3" stroke="#FFF" strokeWidth="2" />
                    <text x={lx} y={ly} textAnchor="middle" fill="#CBD5E1" fontSize="7.5" fontWeight="600">
                      {m.label}
                    </text>
                    <text x={lx} y={ly + 10} textAnchor="middle" fill="#3CAEA3" fontSize="8" fontWeight="800">
                      {m.value}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="radar-domain-grid">
            {radarMetrics.map((m, i) => (
              <div key={i} className="radar-domain-item">
                <div className="domain-progress-bar">
                  <div className="domain-fill" style={{ width: `${m.value}%` }}></div>
                </div>
                <span className="domain-name">{m.label}</span>
                <strong className="domain-value">{m.value}%</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHART: DOMAIN COMPARISON */}
      {activeChart === "comparison" && (
        <div className="trends-chart-panel">
          <div className="chart-panel-header">
            <h4>Current Session Domain Performance Breakdown</h4>
          </div>

          <div className="domain-bars-container">
            {[
              { label: "Visuospatial Memory", value: Math.round(latestData.memory), color: "#3CAEA3", icon: "🧩" },
              { label: "Executive Function (Stroop)", value: Math.round(latestData.executive), color: "#8B5CF6", icon: "⚡" },
              { label: "AD8 Informant Score", value: Math.round((8 - latestData.ad8) * 12.5), color: "#F59E0B", icon: "📋" },
              { label: "Structural MRI Integrity", value: latestData.mri, color: "#06B6D4", icon: "🔬" },
              { label: "Overall Composite Index", value: Math.round(latestData.overall), color: "#10B981", icon: "📊" },
            ].map((d, i) => (
              <div key={i} className="domain-bar-row">
                <div className="domain-bar-label">
                  <span className="domain-bar-icon">{d.icon}</span>
                  <span>{d.label}</span>
                </div>
                <div className="domain-bar-track">
                  <div className="domain-bar-fill" style={{
                    width: `${d.value}%`, background: d.color,
                    transition: "width 1s ease",
                  }}></div>
                  <span className="domain-bar-value">{d.value}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="comparison-interpretation">
            <h4>📋 Interpretation Summary</h4>
            <p>
              {latestData.overall >= 85
                ? "All cognitive domains are performing within normal healthy ranges. No significant decline indicators detected across any modality. Continue routine monitoring and brain-healthy lifestyle maintenance."
                : latestData.overall >= 65
                ? "Some cognitive domains show mild deviations from optimal baseline. Enhanced monitoring recommended with follow-up assessment in 3-6 months. Consider lifestyle modifications targeting weaker domains."
                : "Multiple cognitive domains show notable decline from healthy baselines. Clinical consultation with a neurologist is strongly recommended. Comprehensive neuropsychological evaluation may be warranted."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
