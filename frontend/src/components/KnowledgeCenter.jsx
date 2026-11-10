import { useState } from "react";

const STAGES = [
  {
    stage: 0,
    title: "No Impairment",
    subtitle: "Normal Cognitive Function",
    color: "#10B981",
    icon: "🟢",
    description: "No measurable symptoms of dementia. Memory, reasoning, and daily activities are fully intact. The brain functions optimally with healthy synaptic connections.",
    brainHealth: 100,
    duration: "Baseline",
    biomarkers: ["Normal hippocampal volume", "No amyloid plaques detected", "Intact white matter tracts"],
    tips: "Maintain cognitive stimulation through reading, puzzles, social engagement, and regular physical exercise.",
  },
  {
    stage: 1,
    title: "Very Mild Decline",
    subtitle: "Subjective Cognitive Decline (SCD)",
    color: "#34D399",
    icon: "🟡",
    description: "Subtle memory lapses that may be attributed to normal aging. Forgetting familiar words or misplacing everyday objects. No objective deficits on clinical testing.",
    brainHealth: 90,
    duration: "May persist for years",
    biomarkers: ["Early amyloid-beta accumulation", "Subtle synaptic changes", "Normal volumetric MRI"],
    tips: "Monitor changes over time. Maintain social connections and learn new skills to build cognitive reserve.",
  },
  {
    stage: 2,
    title: "Mild Decline",
    subtitle: "Mild Cognitive Impairment (MCI)",
    color: "#FBBF24",
    icon: "🟠",
    description: "Noticeable memory problems. Difficulty finding the right word, remembering names, or planning and organizing. Friends and family begin to notice changes.",
    brainHealth: 75,
    duration: "2-7 years",
    biomarkers: ["Measurable hippocampal atrophy", "Elevated tau protein", "Reduced glucose metabolism on PET"],
    tips: "Consult a neurologist for formal neuropsychological testing. Early intervention can slow progression.",
  },
  {
    stage: 3,
    title: "Moderate Decline",
    subtitle: "Early-Stage Alzheimer's Disease",
    color: "#F59E0B",
    icon: "🔴",
    description: "Clear-cut cognitive deficits. Difficulty with complex tasks, managing finances, or traveling to new locations. Reduced awareness of recent events.",
    brainHealth: 55,
    duration: "2-4 years",
    biomarkers: ["Significant temporal lobe atrophy", "Ventricular enlargement", "Widespread amyloid deposition"],
    tips: "Structured routines and support systems become essential. Consider medications like cholinesterase inhibitors.",
  },
  {
    stage: 4,
    title: "Moderately Severe",
    subtitle: "Mid-Stage Alzheimer's Disease",
    color: "#EF4444",
    icon: "🔴",
    description: "Major gaps in memory and cognitive function. Needs help with daily activities like choosing clothes or preparing meals. May become confused about time and place.",
    brainHealth: 35,
    duration: "1.5-3 years",
    biomarkers: ["Severe cortical thinning", "Significant VBR increase", "Disrupted default mode network"],
    tips: "Full-time caregiving support recommended. Ensure safe living environment and structured daily activities.",
  },
  {
    stage: 5,
    title: "Severe Decline",
    subtitle: "Late-Stage Alzheimer's Disease",
    color: "#DC2626",
    icon: "⚫",
    description: "Severe memory loss. May not recognize family members. Needs extensive help with all daily activities. Personality changes and loss of awareness of surroundings.",
    brainHealth: 15,
    duration: "1-3 years",
    biomarkers: ["Extreme brain volume loss", "Near-complete hippocampal atrophy", "Widespread neuronal death"],
    tips: "Palliative care focus. Comfort and quality of life become the primary goals of treatment.",
  },
];

const FACTS = [
  { icon: "🌍", stat: "55M+", label: "People living with dementia worldwide" },
  { icon: "📊", stat: "60-70%", label: "Of dementia cases are Alzheimer's" },
  { icon: "⏳", stat: "10-20 yrs", label: "Biomarker changes before symptoms" },
  { icon: "🧬", stat: "APOE-ε4", label: "Strongest genetic risk factor" },
  { icon: "💊", stat: "Lecanemab", label: "First disease-modifying therapy (2023)" },
  { icon: "🧠", stat: "86 Billion", label: "Neurons in the human brain" },
];

const RISK_FACTORS = [
  { factor: "Age (65+)", risk: 95, modifiable: false, icon: "🎂" },
  { factor: "Family History / APOE-ε4", risk: 85, modifiable: false, icon: "🧬" },
  { factor: "Physical Inactivity", risk: 70, modifiable: true, icon: "🏃" },
  { factor: "Social Isolation", risk: 60, modifiable: true, icon: "👥" },
  { factor: "Untreated Hearing Loss", risk: 55, modifiable: true, icon: "👂" },
  { factor: "Poor Sleep Quality", risk: 50, modifiable: true, icon: "😴" },
  { factor: "Hypertension / Diabetes", risk: 65, modifiable: true, icon: "❤️" },
  { factor: "Low Education", risk: 45, modifiable: true, icon: "📚" },
  { factor: "Excessive Alcohol Use", risk: 40, modifiable: true, icon: "🍷" },
  { factor: "Traumatic Brain Injury", risk: 55, modifiable: false, icon: "⚠️" },
];

export default function KnowledgeCenter() {
  const [activeStage, setActiveStage] = useState(0);
  const [activeTab, setActiveTab] = useState("stages");

  const stage = STAGES[activeStage];

  return (
    <div className="knowledge-center-root">
      {/* Header */}
      <div className="kc-header">
        <div>
          <div className="kc-badge">📚 Educational Resource</div>
          <h2>Alzheimer's Disease Knowledge Center</h2>
          <p>Comprehensive clinical education on neurodegenerative disease progression, biomarkers, and modifiable risk factors.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="kc-tabs">
        <button className={`kc-tab ${activeTab === "stages" ? "active" : ""}`} onClick={() => setActiveTab("stages")}>
          🧠 Disease Stages
        </button>
        <button className={`kc-tab ${activeTab === "facts" ? "active" : ""}`} onClick={() => setActiveTab("facts")}>
          📊 Global Statistics
        </button>
        <button className={`kc-tab ${activeTab === "risks" ? "active" : ""}`} onClick={() => setActiveTab("risks")}>
          ⚠️ Risk Factors
        </button>
        <button className={`kc-tab ${activeTab === "research" ? "active" : ""}`} onClick={() => setActiveTab("research")}>
          🔬 Latest Research
        </button>
      </div>

      {/* TAB: DISEASE STAGES */}
      {activeTab === "stages" && (
        <div className="kc-stages-layout">
          {/* Stage Selector Timeline */}
          <div className="kc-timeline-strip">
            {STAGES.map((s, i) => (
              <button
                key={i}
                className={`kc-timeline-node ${activeStage === i ? "active" : ""}`}
                onClick={() => setActiveStage(i)}
                style={{ "--node-color": s.color }}
              >
                <div className="timeline-dot" style={{ background: s.color }}>{s.icon}</div>
                <span className="timeline-label">Stage {s.stage}</span>
                <span className="timeline-sublabel">{s.title}</span>
              </button>
            ))}
            {/* Connecting line */}
            <div className="timeline-connector">
              <div className="timeline-progress" style={{ width: `${(activeStage / (STAGES.length - 1)) * 100}%` }}></div>
            </div>
          </div>

          {/* Stage Detail Card */}
          <div className="kc-stage-detail-card" style={{ borderLeftColor: stage.color }}>
            <div className="kc-stage-header-row">
              <div>
                <span className="kc-stage-badge" style={{ background: stage.color }}>Stage {stage.stage}</span>
                <h3>{stage.title}</h3>
                <p className="kc-stage-subtitle">{stage.subtitle}</p>
              </div>
              <div className="kc-brain-health-gauge">
                <svg viewBox="0 0 120 120" className="health-ring-svg">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#1E293B" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={stage.color}
                    strokeWidth="10"
                    strokeDasharray={`${stage.brainHealth * 3.14} 314`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{ transition: "stroke-dasharray 0.8s ease" }}
                  />
                  <text x="60" y="55" textAnchor="middle" fill="#FFFFFF" fontSize="22" fontWeight="800">
                    {stage.brainHealth}%
                  </text>
                  <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="9">
                    Brain Health
                  </text>
                </svg>
              </div>
            </div>

            <p className="kc-stage-description">{stage.description}</p>

            <div className="kc-stage-meta-grid">
              <div className="kc-meta-item">
                <span className="meta-label">⏱️ Typical Duration</span>
                <strong>{stage.duration}</strong>
              </div>
              <div className="kc-meta-item">
                <span className="meta-label">🧬 Key Biomarkers</span>
                <ul className="biomarker-list">
                  {stage.biomarkers.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
              <div className="kc-meta-item full-width">
                <span className="meta-label">💡 Clinical Recommendation</span>
                <p>{stage.tips}</p>
              </div>
            </div>
          </div>

          {/* Brain Volume Comparison Bar */}
          <div className="kc-volume-comparison">
            <h4>Brain Volume Comparison Across Stages</h4>
            <div className="volume-bars">
              {STAGES.map((s, i) => (
                <div key={i} className={`volume-bar-col ${activeStage === i ? "highlighted" : ""}`} onClick={() => setActiveStage(i)}>
                  <div className="volume-bar-track">
                    <div
                      className="volume-bar-fill"
                      style={{ height: `${s.brainHealth}%`, background: s.color, transition: "height 0.6s ease" }}
                    ></div>
                  </div>
                  <span className="volume-bar-label">S{s.stage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: GLOBAL STATISTICS */}
      {activeTab === "facts" && (
        <div className="kc-facts-grid">
          {FACTS.map((f, i) => (
            <div key={i} className="kc-fact-card">
              <div className="fact-icon">{f.icon}</div>
              <div className="fact-stat">{f.stat}</div>
              <div className="fact-label">{f.label}</div>
            </div>
          ))}

          <div className="kc-infographic-panel">
            <h4>Global Dementia Prevalence Projection</h4>
            <p className="panel-subtitle">WHO estimates & Lancet Commission 2024 projections.</p>
            <div className="projection-chart">
              <svg viewBox="0 0 600 220" className="projection-svg">
                <defs>
                  <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3CAEA3" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3CAEA3" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                <line x1="60" y1="30" x2="560" y2="30" stroke="#334155" strokeDasharray="4 4" />
                <line x1="60" y1="80" x2="560" y2="80" stroke="#334155" strokeDasharray="4 4" />
                <line x1="60" y1="130" x2="560" y2="130" stroke="#334155" strokeDasharray="4 4" />
                <line x1="60" y1="180" x2="560" y2="180" stroke="#334155" />

                <text x="10" y="35" fill="#94A3B8" fontSize="10">150M</text>
                <text x="10" y="85" fill="#94A3B8" fontSize="10">100M</text>
                <text x="15" y="135" fill="#94A3B8" fontSize="10">50M</text>
                <text x="20" y="183" fill="#94A3B8" fontSize="10">0</text>

                {/* Area fill */}
                <path d="M 100 170 L 200 160 L 300 140 L 400 105 L 500 55 L 500 180 L 100 180 Z" fill="url(#projGrad)" />
                {/* Line */}
                <path d="M 100 170 L 200 160 L 300 140 L 400 105 L 500 55" fill="none" stroke="#3CAEA3" strokeWidth="3" />
                {/* Data points */}
                <circle cx="100" cy="170" r="5" fill="#101F32" stroke="#3CAEA3" strokeWidth="2.5" />
                <circle cx="200" cy="160" r="5" fill="#101F32" stroke="#3CAEA3" strokeWidth="2.5" />
                <circle cx="300" cy="140" r="5" fill="#101F32" stroke="#3CAEA3" strokeWidth="2.5" />
                <circle cx="400" cy="105" r="5" fill="#101F32" stroke="#3CAEA3" strokeWidth="2.5" />
                <circle cx="500" cy="55" r="6" fill="#3CAEA3" stroke="#FFF" strokeWidth="3" />

                {/* Labels */}
                <text x="85" y="200" fill="#94A3B8" fontSize="10">2020</text>
                <text x="185" y="200" fill="#94A3B8" fontSize="10">2030</text>
                <text x="285" y="200" fill="#94A3B8" fontSize="10">2040</text>
                <text x="385" y="200" fill="#94A3B8" fontSize="10">2050</text>
                <text x="485" y="200" fill="#94A3B8" fontSize="10">2060</text>

                {/* Value labels */}
                <text x="85" y="163" fill="#E2E8F0" fontSize="9" fontWeight="700">55M</text>
                <text x="185" y="153" fill="#E2E8F0" fontSize="9" fontWeight="700">78M</text>
                <text x="285" y="133" fill="#E2E8F0" fontSize="9" fontWeight="700">104M</text>
                <text x="385" y="98" fill="#E2E8F0" fontSize="9" fontWeight="700">131M</text>
                <text x="485" y="48" fill="#E2E8F0" fontSize="9" fontWeight="700">152M</text>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* TAB: RISK FACTORS */}
      {activeTab === "risks" && (
        <div className="kc-risks-section">
          <div className="kc-risks-summary-row">
            <div className="risk-summary-card modifiable">
              <h4>Modifiable Risk Factors</h4>
              <div className="risk-count">7</div>
              <p>Factors you CAN change to reduce risk by up to <strong>40%</strong></p>
            </div>
            <div className="risk-summary-card non-modifiable">
              <h4>Non-Modifiable Risk Factors</h4>
              <div className="risk-count">3</div>
              <p>Genetic and demographic factors that cannot be altered</p>
            </div>
          </div>

          <div className="kc-risk-bars-list">
            {RISK_FACTORS.map((r, i) => (
              <div key={i} className={`kc-risk-bar-item ${r.modifiable ? "modifiable" : "fixed"}`}>
                <div className="risk-bar-left">
                  <span className="risk-bar-icon">{r.icon}</span>
                  <span className="risk-bar-name">{r.factor}</span>
                  <span className={`risk-mod-badge ${r.modifiable ? "yes" : "no"}`}>
                    {r.modifiable ? "✓ Modifiable" : "✕ Non-Modifiable"}
                  </span>
                </div>
                <div className="risk-bar-right">
                  <div className="risk-bar-track">
                    <div
                      className="risk-bar-fill"
                      style={{
                        width: `${r.risk}%`,
                        background: r.modifiable ? "#3CAEA3" : "#EF4444",
                        transition: "width 0.8s ease",
                      }}
                    ></div>
                  </div>
                  <span className="risk-bar-pct">{r.risk}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="kc-lancet-note">
            <strong>📖 Lancet Commission (2024):</strong> Up to 40% of dementia cases could be prevented or delayed by addressing 12 modifiable risk factors throughout life, including education, hearing loss, depression, physical inactivity, smoking, social isolation, air pollution, diabetes, hypertension, excessive alcohol, obesity, and traumatic brain injury.
          </div>
        </div>
      )}

      {/* TAB: LATEST RESEARCH */}
      {activeTab === "research" && (
        <div className="kc-research-section">
          <div className="research-cards-grid">
            <div className="research-card">
              <div className="research-card-tag">🏆 Breakthrough</div>
              <h4>Lecanemab (Leqembi™) FDA Approval</h4>
              <p>First anti-amyloid monoclonal antibody to receive full FDA approval. Demonstrated 27% slowing of cognitive decline in Phase 3 CLARITY-AD trial with 1,795 participants.</p>
              <div className="research-meta">
                <span>📅 Jan 2023</span>
                <span>📖 NEJM 388;1</span>
              </div>
            </div>

            <div className="research-card">
              <div className="research-card-tag">🧬 Genetics</div>
              <h4>Blood-Based Biomarker p-tau217</h4>
              <p>Plasma phosphorylated-tau 217 achieves 96% accuracy in detecting Alzheimer's pathology, potentially replacing invasive CSF sampling and expensive PET scans for diagnosis.</p>
              <div className="research-meta">
                <span>📅 2024</span>
                <span>📖 JAMA Neurology</span>
              </div>
            </div>

            <div className="research-card">
              <div className="research-card-tag">🤖 AI/ML</div>
              <h4>Deep Learning MRI Prediction</h4>
              <p>Convolutional neural networks (ResNet, EfficientNet) achieve &gt;95% accuracy in 4-class Alzheimer's staging from structural T1-MRI. Grad-CAM heatmaps provide interpretable neural attention maps.</p>
              <div className="research-meta">
                <span>📅 2024</span>
                <span>📖 Nature Medicine</span>
              </div>
            </div>

            <div className="research-card">
              <div className="research-card-tag">💊 Therapeutics</div>
              <h4>Donanemab Phase 3 Results</h4>
              <p>Eli Lilly's donanemab showed 35% slowing of clinical decline in TRAILBLAZER-ALZ 2 trial. Achieved amyloid plaque clearance in 68% of participants within 12 months.</p>
              <div className="research-meta">
                <span>📅 2024</span>
                <span>📖 JAMA 330;6</span>
              </div>
            </div>

            <div className="research-card">
              <div className="research-card-tag">🧠 Prevention</div>
              <h4>FINGER 2.0 Global Trial</h4>
              <p>Multi-domain lifestyle intervention (exercise, diet, cognitive training, vascular risk management) demonstrated 25% improvement in cognitive composite scores over 2 years.</p>
              <div className="research-meta">
                <span>📅 2025</span>
                <span>📖 Lancet Neurology</span>
              </div>
            </div>

            <div className="research-card">
              <div className="research-card-tag">📊 Digital</div>
              <h4>Digital Biomarkers for Early Detection</h4>
              <p>Smartphone-based cognitive assessments and digital phenotyping show promise in detecting subtle preclinical changes 5-10 years before clinical symptoms manifest.</p>
              <div className="research-meta">
                <span>📅 2025</span>
                <span>📖 npj Digital Medicine</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
