import { useState } from "react";

const CATEGORIES = [
  {
    id: "exercise",
    icon: "🏃",
    title: "Physical Exercise",
    color: "#10B981",
    tips: [
      { title: "Aerobic Exercise", desc: "30 minutes of brisk walking, swimming, or cycling 5 days/week increases hippocampal volume by 2% and improves BDNF production.", intensity: "High Impact", evidence: "Strong (RCT)" },
      { title: "Strength Training", desc: "Resistance training 2-3x/week improves executive function and working memory through IGF-1 signaling pathways.", intensity: "Moderate Impact", evidence: "Strong (Meta-analysis)" },
      { title: "Yoga & Tai Chi", desc: "Mind-body exercises reduce cortisol, enhance gray matter density in prefrontal cortex, and improve attention span.", intensity: "Moderate Impact", evidence: "Moderate (Cohort)" },
      { title: "Dance & Coordination", desc: "Complex motor activities combining physical movement with cognitive challenge provide dual stimulation benefits.", intensity: "High Impact", evidence: "Moderate (RCT)" },
    ],
  },
  {
    id: "diet",
    icon: "🥗",
    title: "Nutrition & Diet",
    color: "#F59E0B",
    tips: [
      { title: "MIND Diet", desc: "Combines Mediterranean and DASH diets. Emphasizes leafy greens, berries, nuts, whole grains, fish. Reduces AD risk by 53% with strict adherence.", intensity: "High Impact", evidence: "Strong (Longitudinal)" },
      { title: "Omega-3 Fatty Acids", desc: "DHA and EPA from fatty fish (salmon, mackerel) support synaptic membrane integrity and reduce neuroinflammation.", intensity: "Moderate Impact", evidence: "Strong (Meta-analysis)" },
      { title: "Antioxidant-Rich Foods", desc: "Blueberries, dark chocolate, and green tea contain flavonoids that protect neurons from oxidative stress damage.", intensity: "Moderate Impact", evidence: "Moderate (Cohort)" },
      { title: "Limit Processed Foods", desc: "Ultra-processed foods increase systemic inflammation and are associated with faster cognitive decline in longitudinal studies.", intensity: "High Impact", evidence: "Strong (Cohort)" },
    ],
  },
  {
    id: "cognitive",
    icon: "🧠",
    title: "Cognitive Training",
    color: "#8B5CF6",
    tips: [
      { title: "Learn a New Language", desc: "Bilingualism delays dementia onset by 4-5 years. Language learning strengthens prefrontal executive networks.", intensity: "High Impact", evidence: "Strong (Meta-analysis)" },
      { title: "Musical Instrument", desc: "Playing music engages motor, auditory, and cognitive networks simultaneously, building robust cognitive reserve.", intensity: "High Impact", evidence: "Moderate (Longitudinal)" },
      { title: "Strategy Games & Puzzles", desc: "Chess, Sudoku, crosswords, and jigsaw puzzles maintain pattern recognition and working memory pathways.", intensity: "Moderate Impact", evidence: "Moderate (RCT)" },
      { title: "Reading & Writing", desc: "Regular reading and journaling maintain language processing, comprehension, and episodic memory encoding systems.", intensity: "Moderate Impact", evidence: "Moderate (Cohort)" },
    ],
  },
  {
    id: "sleep",
    icon: "😴",
    title: "Sleep Optimization",
    color: "#06B6D4",
    tips: [
      { title: "7-8 Hours Quality Sleep", desc: "The glymphatic system clears amyloid-beta during deep sleep. Chronic sleep deprivation increases AD pathology by 25-30%.", intensity: "High Impact", evidence: "Strong (Mechanistic)" },
      { title: "Consistent Sleep Schedule", desc: "Regular circadian rhythm supports melatonin production and hippocampal memory consolidation during REM cycles.", intensity: "Moderate Impact", evidence: "Strong (Cohort)" },
      { title: "Screen-Free Before Bed", desc: "Blue light exposure suppresses melatonin. Stop screens 1 hour before sleep. Use blue-light filters after sunset.", intensity: "Moderate Impact", evidence: "Moderate (RCT)" },
      { title: "Treat Sleep Apnea", desc: "Obstructive sleep apnea causes intermittent hypoxia that accelerates hippocampal atrophy. CPAP treatment is protective.", intensity: "High Impact", evidence: "Strong (RCT)" },
    ],
  },
  {
    id: "social",
    icon: "👥",
    title: "Social Engagement",
    color: "#EC4899",
    tips: [
      { title: "Regular Social Interaction", desc: "Social isolation increases dementia risk by 50%. Weekly group activities maintain prefrontal function and emotional regulation.", intensity: "High Impact", evidence: "Strong (Meta-analysis)" },
      { title: "Volunteer Work", desc: "Purpose-driven social engagement reduces depression and cognitive decline through sustained executive function demands.", intensity: "Moderate Impact", evidence: "Moderate (Cohort)" },
      { title: "Intergenerational Activities", desc: "Teaching or mentoring younger generations provides cognitive stimulation and emotional well-being benefits.", intensity: "Moderate Impact", evidence: "Moderate (Cohort)" },
      { title: "Group Learning", desc: "Book clubs, classes, and discussion groups combine social interaction with cognitive challenge for dual benefit.", intensity: "High Impact", evidence: "Moderate (RCT)" },
    ],
  },
  {
    id: "stress",
    icon: "🧘",
    title: "Stress Management",
    color: "#EF4444",
    tips: [
      { title: "Meditation & Mindfulness", desc: "8 weeks of mindfulness meditation increases cortical thickness, improves attention, and reduces cortisol by 23%.", intensity: "High Impact", evidence: "Strong (RCT)" },
      { title: "Deep Breathing Exercises", desc: "4-7-8 breathing technique activates parasympathetic nervous system, reducing amygdala reactivity and stress hormones.", intensity: "Moderate Impact", evidence: "Moderate (RCT)" },
      { title: "Nature Exposure", desc: "20 minutes in green spaces reduces cortisol significantly. Forest bathing (Shinrin-yoku) improves cognitive performance.", intensity: "Moderate Impact", evidence: "Moderate (RCT)" },
      { title: "Gratitude Journaling", desc: "Daily gratitude practice improves sleep quality, reduces inflammation markers, and enhances overall psychological well-being.", intensity: "Moderate Impact", evidence: "Moderate (Cohort)" },
    ],
  },
];

const DAILY_EXERCISES = [
  { time: "🌅 Morning", exercise: "5-min mindfulness meditation", benefit: "Reduces cortisol, improves focus", duration: "5 min" },
  { time: "🏋️ Mid-Morning", exercise: "20-min brisk walk or exercise", benefit: "Increases BDNF, hippocampal growth", duration: "20 min" },
  { time: "🧩 Afternoon", exercise: "Puzzle, Sudoku, or memory game", benefit: "Working memory & pattern recognition", duration: "15 min" },
  { time: "📖 Evening", exercise: "30-min reading or new skill", benefit: "Cognitive reserve building", duration: "30 min" },
  { time: "🧘 Night", exercise: "Deep breathing before sleep", benefit: "Glymphatic clearance, memory consolidation", duration: "10 min" },
];

export default function BrainHealthTips() {
  const [activeCategory, setActiveCategory] = useState("exercise");
  const category = CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div className="health-tips-root">
      {/* Header */}
      <div className="ht-header">
        <div>
          <div className="ht-badge">💡 Personalized Recommendations</div>
          <h2>Brain Health Tips & Daily Cognitive Exercises</h2>
          <p>Evidence-based lifestyle interventions to reduce Alzheimer's risk and optimize cognitive performance.</p>
        </div>
      </div>

      {/* Daily Exercise Schedule */}
      <div className="ht-daily-schedule">
        <h3>🗓️ Recommended Daily Brain Health Routine</h3>
        <div className="daily-exercise-timeline">
          {DAILY_EXERCISES.map((ex, i) => (
            <div key={i} className="daily-exercise-item">
              <div className="exercise-time-badge">{ex.time}</div>
              <div className="exercise-content">
                <strong>{ex.exercise}</strong>
                <span className="exercise-benefit">{ex.benefit}</span>
              </div>
              <div className="exercise-duration">{ex.duration}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="ht-category-tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`ht-cat-tab ${activeCategory === c.id ? "active" : ""}`}
            onClick={() => setActiveCategory(c.id)}
            style={{ "--cat-color": c.color }}
          >
            <span className="cat-icon">{c.icon}</span>
            <span className="cat-name">{c.title}</span>
          </button>
        ))}
      </div>

      {/* Category Tips Grid */}
      {category && (
        <div className="ht-tips-grid">
          {category.tips.map((tip, i) => (
            <div key={i} className="ht-tip-card" style={{ borderTopColor: category.color }}>
              <div className="tip-card-header">
                <h4>{tip.title}</h4>
                <span className="tip-intensity-badge" style={{
                  background: tip.intensity === "High Impact" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                  color: tip.intensity === "High Impact" ? "#10B981" : "#F59E0B",
                }}>
                  {tip.intensity}
                </span>
              </div>
              <p className="tip-description">{tip.desc}</p>
              <div className="tip-evidence">
                <span className="evidence-icon">📖</span>
                <span>Evidence: <strong>{tip.evidence}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Risk Reduction Impact Summary */}
      <div className="ht-impact-summary">
        <h3>📊 Cumulative Risk Reduction Potential</h3>
        <p className="panel-subtitle">Combined impact of adopting evidence-based lifestyle modifications.</p>
        <div className="impact-bars">
          {[
            { label: "Physical Exercise", reduction: 38, color: "#10B981" },
            { label: "MIND Diet Adherence", reduction: 53, color: "#F59E0B" },
            { label: "Cognitive Stimulation", reduction: 30, color: "#8B5CF6" },
            { label: "Quality Sleep (7-8h)", reduction: 25, color: "#06B6D4" },
            { label: "Social Engagement", reduction: 28, color: "#EC4899" },
            { label: "Stress Management", reduction: 20, color: "#EF4444" },
          ].map((item, i) => (
            <div key={i} className="impact-bar-row">
              <div className="impact-label">{item.label}</div>
              <div className="impact-track">
                <div className="impact-fill" style={{ width: `${item.reduction}%`, background: item.color, transition: "width 1s ease" }}></div>
              </div>
              <div className="impact-value">-{item.reduction}% risk</div>
            </div>
          ))}
        </div>
        <div className="impact-note">
          <strong>📖 Source:</strong> Lancet Commission on Dementia Prevention (2024) — Up to 40% of dementia cases are potentially preventable through combined lifestyle modifications.
        </div>
      </div>
    </div>
  );
}
