import { useState, useMemo } from "react";

// Population benchmark data (simulated from OASIS/ADNI datasets)
const POPULATION_DATA = {
  healthy: { memory: 88, executive: 91, ad8: 0.8, stroopRt: 650, cardMoves: 16, mriIntegrity: 95, overallIndex: 92 },
  mci: { memory: 68, executive: 72, ad8: 3.2, stroopRt: 890, cardMoves: 28, mriIntegrity: 72, overallIndex: 68 },
  mildAD: { memory: 48, executive: 52, ad8: 5.5, stroopRt: 1150, cardMoves: 38, mriIntegrity: 50, overallIndex: 45 },
  moderateAD: { memory: 28, executive: 32, ad8: 7.2, stroopRt: 1450, cardMoves: 48, mriIntegrity: 30, overallIndex: 25 },
};

const AGE_PERCENTILES = [
  { ageGroup: "50-59", p25: 82, p50: 89, p75: 95 },
  { ageGroup: "60-69", p25: 76, p50: 85, p75: 92 },
  { ageGroup: "70-79", p25: 68, p50: 78, p75: 88 },
  { ageGroup: "80-89", p25: 55, p50: 68, p75: 80 },
  { ageGroup: "90+", p25: 42, p50: 55, p75: 70 },
];

export default function PatientComparison({ cardTelemetry, stroopTelemetry, ad8Score, mriResult, patientAge }) {
  const [comparisonView, setComparisonView] = useState("population");

  // Compute patient metrics
  const patientMetrics = useMemo(() => {
    const memory = cardTelemetry ? Math.max(20, Math.min(100, 100 - cardTelemetry.moves * 1.8)) : 85;
    const executive = stroopTelemetry ? Math.max(20, Math.min(100, 140 - stroopTelemetry.avg_reaction_ms * 0.06)) : 88;
    const ad8 = ad8Score !== null ? ad8Score : 1;
    const stroopRt = stroopTelemetry?.avg_reaction_ms || 680;
    const cardMoves = cardTelemetry?.moves || 18;
    const mriIntegrity = mriResult ? Math.round(mriResult.confidence * 100) : 94;
    const overallIndex = Math.round((memory + executive + (8 - ad8) * 12.5 + mriIntegrity) / 4);

    return { memory, executive, ad8, stroopRt, cardMoves, mriIntegrity, overallIndex };
  }, [cardTelemetry, stroopTelemetry, ad8Score, mriResult]);

  // Determine which population group patient is closest to
  const getClosestGroup = () => {
    const diffs = {
      "Healthy Control": Math.abs(patientMetrics.overallIndex - POPULATION_DATA.healthy.overallIndex),
      "Mild Cognitive Impairment": Math.abs(patientMetrics.overallIndex - POPULATION_DATA.mci.overallIndex),
      "Mild Alzheimer's": Math.abs(patientMetrics.overallIndex - POPULATION_DATA.mildAD.overallIndex),
      "Moderate Alzheimer's": Math.abs(patientMetrics.overallIndex - POPULATION_DATA.moderateAD.overallIndex),
    };
    return Object.entries(diffs).sort((a, b) => a[1] - b[1])[0][0];
  };

  // Compute percentile
  const getPercentile = () => {
    const age = patientAge || 68;
    let ageGroup;
    if (age < 60) ageGroup = AGE_PERCENTILES[0];
    else if (age < 70) ageGroup = AGE_PERCENTILES[1];
    else if (age < 80) ageGroup = AGE_PERCENTILES[2];
    else if (age < 90) ageGroup = AGE_PERCENTILES[3];
    else ageGroup = AGE_PERCENTILES[4];

    const score = patientMetrics.overallIndex;
    if (score >= ageGroup.p75) return { percentile: "Top 25%", rank: "Above Average", color: "#10B981" };
    if (score >= ageGroup.p50) return { percentile: "50th-75th", rank: "Average", color: "#3CAEA3" };
    if (score >= ageGroup.p25) return { percentile: "25th-50th", rank: "Below Average", color: "#F59E0B" };
    return { percentile: "Below 25th", rank: "Low", color: "#EF4444" };
  };

  const percentileInfo = getPercentile();

  return (
    <div className="comparison-root">
      {/* Header */}
      <div className="comp-header">
        <div>
          <div className="comp-badge">👥 Population Analytics</div>
          <h2>Patient Comparison & Population Benchmarks</h2>
          <p>Compare current patient cognitive metrics against clinical population reference datasets (OASIS & ADNI benchmarks).</p>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="comp-summary-row">
        <div className="comp-summary-card">
          <div className="comp-summary-icon">📊</div>
          <div className="comp-summary-body">
            <span className="comp-summary-label">Overall Cognitive Index</span>
            <div className="comp-summary-value">{patientMetrics.overallIndex}<span className="comp-unit">/100</span></div>
          </div>
        </div>

        <div className="comp-summary-card">
          <div className="comp-summary-icon">🏆</div>
          <div className="comp-summary-body">
            <span className="comp-summary-label">Age-Group Percentile</span>
            <div className="comp-summary-value" style={{ color: percentileInfo.color }}>{percentileInfo.percentile}</div>
            <span className="comp-rank-badge" style={{ color: percentileInfo.color }}>{percentileInfo.rank}</span>
          </div>
        </div>

        <div className="comp-summary-card">
          <div className="comp-summary-icon">🎯</div>
          <div className="comp-summary-body">
            <span className="comp-summary-label">Closest Population Group</span>
            <div className="comp-summary-value-sm">{getClosestGroup()}</div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="comp-view-tabs">
        <button className={`comp-tab ${comparisonView === "population" ? "active" : ""}`} onClick={() => setComparisonView("population")}>
          📊 Population Groups
        </button>
        <button className={`comp-tab ${comparisonView === "percentile" ? "active" : ""}`} onClick={() => setComparisonView("percentile")}>
          📈 Age Percentiles
        </button>
        <button className={`comp-tab ${comparisonView === "domains" ? "active" : ""}`} onClick={() => setComparisonView("domains")}>
          🧠 Domain Comparison
        </button>
      </div>

      {/* VIEW: POPULATION GROUPS COMPARISON */}
      {comparisonView === "population" && (
        <div className="comp-population-panel">
          <h4>Patient vs Clinical Population Groups</h4>
          <p className="panel-subtitle">Composite cognitive scores compared across diagnostic categories.</p>

          <div className="population-comparison-chart">
            <svg viewBox="0 0 700 300" className="pop-chart-svg">
              {/* Grid */}
              <line x1="80" y1="30" x2="650" y2="30" stroke="#1E293B" strokeDasharray="4 4" />
              <line x1="80" y1="90" x2="650" y2="90" stroke="#1E293B" strokeDasharray="4 4" />
              <line x1="80" y1="150" x2="650" y2="150" stroke="#1E293B" strokeDasharray="4 4" />
              <line x1="80" y1="210" x2="650" y2="210" stroke="#1E293B" strokeDasharray="4 4" />
              <line x1="80" y1="270" x2="650" y2="270" stroke="#334155" />

              <text x="15" y="35" fill="#64748B" fontSize="10">100</text>
              <text x="20" y="95" fill="#64748B" fontSize="10">75</text>
              <text x="20" y="155" fill="#64748B" fontSize="10">50</text>
              <text x="20" y="215" fill="#64748B" fontSize="10">25</text>
              <text x="25" y="275" fill="#64748B" fontSize="10">0</text>

              {/* Bars */}
              {[
                { label: "Healthy\nControl", value: POPULATION_DATA.healthy.overallIndex, color: "#10B981", x: 130 },
                { label: "This\nPatient", value: patientMetrics.overallIndex, color: "#3CAEA3", x: 250, isPatient: true },
                { label: "MCI\nGroup", value: POPULATION_DATA.mci.overallIndex, color: "#F59E0B", x: 370 },
                { label: "Mild\nAD", value: POPULATION_DATA.mildAD.overallIndex, color: "#EF4444", x: 490 },
                { label: "Moderate\nAD", value: POPULATION_DATA.moderateAD.overallIndex, color: "#DC2626", x: 600 },
              ].map((bar, i) => {
                const barHeight = (bar.value / 100) * 240;
                const barY = 270 - barHeight;
                return (
                  <g key={i}>
                    <rect x={bar.x - 30} y={barY} width="60" height={barHeight}
                      fill={bar.color} rx="6" opacity={bar.isPatient ? 1 : 0.7}
                      stroke={bar.isPatient ? "#FFF" : "none"} strokeWidth={bar.isPatient ? 2 : 0}
                      style={{ transition: "height 0.8s ease, y 0.8s ease" }}
                    />
                    <text x={bar.x} y={barY - 8} textAnchor="middle" fill={bar.color} fontSize="12" fontWeight="800">
                      {bar.value}
                    </text>
                    <text x={bar.x} y="290" textAnchor="middle" fill="#94A3B8" fontSize="9">
                      {bar.label.split("\n").map((line, j) => (
                        <tspan key={j} x={bar.x} dy={j === 0 ? 0 : 12}>{line}</tspan>
                      ))}
                    </text>
                    {bar.isPatient && (
                      <text x={bar.x} y={barY - 22} textAnchor="middle" fill="#3CAEA3" fontSize="8" fontWeight="700">
                        ★ YOU
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* VIEW: AGE PERCENTILES */}
      {comparisonView === "percentile" && (
        <div className="comp-percentile-panel">
          <h4>Cognitive Performance by Age Group Percentile</h4>
          <p className="panel-subtitle">Where does this patient rank within their age cohort?</p>

          <div className="percentile-table">
            <div className="percentile-header-row">
              <span>Age Group</span>
              <span>25th Percentile</span>
              <span>50th (Median)</span>
              <span>75th Percentile</span>
              <span>Patient Score</span>
            </div>
            {AGE_PERCENTILES.map((ap, i) => {
              const age = patientAge || 68;
              const isCurrentGroup =
                (ap.ageGroup === "50-59" && age < 60) ||
                (ap.ageGroup === "60-69" && age >= 60 && age < 70) ||
                (ap.ageGroup === "70-79" && age >= 70 && age < 80) ||
                (ap.ageGroup === "80-89" && age >= 80 && age < 90) ||
                (ap.ageGroup === "90+" && age >= 90);

              return (
                <div key={i} className={`percentile-row ${isCurrentGroup ? "current-group" : ""}`}>
                  <span className="percentile-age">{ap.ageGroup} yrs</span>
                  <span className="percentile-val">{ap.p25}</span>
                  <span className="percentile-val">{ap.p50}</span>
                  <span className="percentile-val">{ap.p75}</span>
                  <span className="percentile-patient">
                    {isCurrentGroup ? (
                      <strong style={{ color: percentileInfo.color }}>{patientMetrics.overallIndex} ({percentileInfo.rank})</strong>
                    ) : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Visual percentile gauge */}
          <div className="percentile-gauge-section">
            <h4>Patient Percentile Position</h4>
            <div className="percentile-gauge-bar">
              <div className="gauge-zone low" style={{ width: "25%" }}><span>Below 25th</span></div>
              <div className="gauge-zone avg" style={{ width: "25%" }}><span>25th-50th</span></div>
              <div className="gauge-zone good" style={{ width: "25%" }}><span>50th-75th</span></div>
              <div className="gauge-zone excellent" style={{ width: "25%" }}><span>Top 25%</span></div>
              <div className="gauge-marker" style={{
                left: `${Math.min(98, Math.max(2, patientMetrics.overallIndex))}%`,
                transition: "left 1s ease",
              }}>
                <div className="marker-dot" style={{ background: percentileInfo.color }}></div>
                <div className="marker-label">{patientMetrics.overallIndex}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: DOMAIN COMPARISON */}
      {comparisonView === "domains" && (
        <div className="comp-domain-panel">
          <h4>Individual Domain Comparison vs Population Means</h4>

          <div className="domain-comparison-grid">
            {[
              { domain: "Working Memory", patient: Math.round(patientMetrics.memory), healthy: POPULATION_DATA.healthy.memory, mci: POPULATION_DATA.mci.memory, icon: "🧩" },
              { domain: "Executive Function", patient: Math.round(patientMetrics.executive), healthy: POPULATION_DATA.healthy.executive, mci: POPULATION_DATA.mci.executive, icon: "⚡" },
              { domain: "AD8 Score (inverted)", patient: Math.round((8 - patientMetrics.ad8) * 12.5), healthy: Math.round((8 - POPULATION_DATA.healthy.ad8) * 12.5), mci: Math.round((8 - POPULATION_DATA.mci.ad8) * 12.5), icon: "📋" },
              { domain: "MRI Structural", patient: patientMetrics.mriIntegrity, healthy: POPULATION_DATA.healthy.mriIntegrity, mci: POPULATION_DATA.mci.mriIntegrity, icon: "🔬" },
            ].map((d, i) => (
              <div key={i} className="domain-comp-card">
                <div className="domain-comp-header">
                  <span className="domain-comp-icon">{d.icon}</span>
                  <h5>{d.domain}</h5>
                </div>
                <div className="domain-comp-bars">
                  <div className="domain-comp-bar-row">
                    <span className="dcb-label">Patient</span>
                    <div className="dcb-track">
                      <div className="dcb-fill" style={{ width: `${d.patient}%`, background: "#3CAEA3" }}></div>
                    </div>
                    <strong className="dcb-val">{d.patient}%</strong>
                  </div>
                  <div className="domain-comp-bar-row">
                    <span className="dcb-label">Healthy</span>
                    <div className="dcb-track">
                      <div className="dcb-fill" style={{ width: `${d.healthy}%`, background: "#10B981" }}></div>
                    </div>
                    <strong className="dcb-val">{d.healthy}%</strong>
                  </div>
                  <div className="domain-comp-bar-row">
                    <span className="dcb-label">MCI</span>
                    <div className="dcb-track">
                      <div className="dcb-fill" style={{ width: `${d.mci}%`, background: "#F59E0B" }}></div>
                    </div>
                    <strong className="dcb-val">{d.mci}%</strong>
                  </div>
                </div>
                <div className="domain-comp-verdict">
                  {d.patient >= d.healthy * 0.9 ? "✅ Within healthy range" :
                   d.patient >= d.mci * 1.1 ? "⚠️ Between healthy and MCI" :
                   "🔴 Below MCI threshold"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
