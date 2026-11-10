export default function Navbar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "game", label: "🧠 Memory Game", desc: "Visuospatial Telemetry" },
    { id: "stroop", label: "⚡ Stroop Test", desc: "Executive RT & Inhibition" },
    { id: "ad8", label: "📋 AD8 Survey", desc: "Clinical Questionnaire" },
    { id: "dashboard", label: "📊 AI Risk Dashboard", desc: "Multi-Modal Scoring" },
    { id: "mri", label: "🩻 MRI Classifier", desc: "Deep Learning Stage 3" },
  ];

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="brand-logo">🛡️</div>
        <div>
          <h1 className="brand-title">NeuroGuard</h1>
          <span className="brand-subtitle">Multi-Stage Alzheimer's & MCI Screening Platform</span>
        </div>
      </div>

      <nav className="navbar-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-label">{tab.label}</span>
            <span className="tab-desc">{tab.desc}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
