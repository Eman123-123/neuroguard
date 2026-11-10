import { useState, useEffect, useRef } from "react";

const COLOR_PALETTE = [
  { id: "red", name: "RED", colorCode: "#dc2626", key: "1" },
  { id: "blue", name: "BLUE", colorCode: "#2563eb", key: "2" },
  { id: "green", name: "GREEN", colorCode: "#16a34a", key: "3" },
  { id: "yellow", name: "YELLOW", colorCode: "#ca8a04", key: "4" },
];

function generateTrials(count = 16) {
  const trials = [];
  const half = Math.floor(count / 2);

  // 1. Congruent trials (Word matches color)
  for (let i = 0; i < half; i++) {
    const col = COLOR_PALETTE[i % COLOR_PALETTE.length];
    trials.push({
      id: `c-${i}`,
      wordText: col.name,
      inkColor: col.colorCode,
      targetColorId: col.id,
      isCongruent: true,
    });
  }

  // 2. Incongruent trials (Word conflicts with color)
  for (let i = 0; i < half; i++) {
    const textCol = COLOR_PALETTE[i % COLOR_PALETTE.length];
    const availableInk = COLOR_PALETTE.filter((c) => c.id !== textCol.id);
    const inkCol = availableInk[(i + 1) % availableInk.length];
    trials.push({
      id: `inc-${i}`,
      wordText: textCol.name,
      inkColor: inkCol.colorCode,
      targetColorId: inkCol.id,
      isCongruent: false,
    });
  }

  // Shuffle trials
  return trials.sort(() => Math.random() - 0.5);
}

export default function StroopTestGame({ onTelemetrySave, onNavigateToRisk }) {
  const [stage, setStage] = useState("intro"); // 'intro' | 'countdown' | 'playing' | 'fixation' | 'finished'
  const [countdown, setCountdown] = useState(3);
  const [trials, setTrials] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong'

  const trialStartTimeRef = useRef(0);
  const fixationTimerRef = useRef(null);

  // Start countdown sequence
  const startTest = () => {
    setTrials(generateTrials(16));
    setCurrentIndex(0);
    setResponses([]);
    setFeedback(null);
    setCountdown(3);
    setStage("countdown");
  };

  // Countdown timer
  useEffect(() => {
    if (stage === "countdown") {
      if (countdown > 1) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 800);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setStage("playing");
          trialStartTimeRef.current = performance.now();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [stage, countdown]);

  // Calculate clinical telemetry
  const computeClinicalMetrics = (allResponses) => {
    if (!allResponses || allResponses.length === 0) return null;

    const totalTrials = allResponses.length;
    const correctResponses = allResponses.filter((r) => r.isCorrect);
    const accuracy = +((correctResponses.length / totalTrials) * 100).toFixed(1);

    // Mean RT for correct responses
    const allRt = correctResponses.map((r) => r.reactionTimeMs);
    const avgRt = allRt.length > 0 ? +(allRt.reduce((a, b) => a + b, 0) / allRt.length).toFixed(1) : 800;

    // Congruent vs Incongruent RT
    const congRt = correctResponses.filter((r) => r.isCongruent).map((r) => r.reactionTimeMs);
    const incongRt = correctResponses.filter((r) => !r.isCongruent).map((r) => r.reactionTimeMs);

    const avgCongRt = congRt.length > 0 ? +(congRt.reduce((a, b) => a + b, 0) / congRt.length).toFixed(1) : avgRt;
    const avgIncongRt = incongRt.length > 0 ? +(incongRt.reduce((a, b) => a + b, 0) / incongRt.length).toFixed(1) : avgRt + 150;

    // Interference Index = Incongruent RT - Congruent RT
    const interferenceMs = Math.max(0, +(avgIncongRt - avgCongRt).toFixed(1));

    return {
      accuracy,
      avg_reaction_ms: avgRt,
      interference_ms: interferenceMs,
      congruent_avg_ms: avgCongRt,
      incongruent_avg_ms: avgIncongRt,
      correct_count: correctResponses.length,
      total_trials: totalTrials,
      error_count: totalTrials - correctResponses.length,
    };
  };

  const finishTest = (finalResponses) => {
    setStage("finished");
    const telemetry = computeClinicalMetrics(finalResponses);
    if (onTelemetrySave && telemetry) {
      onTelemetrySave(telemetry);
    }
  };

  // Handle color selection
  const handleSelectColor = (selectedColorId) => {
    if (stage !== "playing") return;

    const rt = Math.round(performance.now() - trialStartTimeRef.current);
    const currentTrial = trials[currentIndex];
    const isCorrect = selectedColorId === currentTrial.targetColorId;

    const record = {
      trialIndex: currentIndex,
      isCongruent: currentTrial.isCongruent,
      wordText: currentTrial.wordText,
      inkColor: currentTrial.inkColor,
      targetColorId: currentTrial.targetColorId,
      selectedColorId,
      isCorrect,
      reactionTimeMs: rt,
    };

    const newResponses = [...responses, record];
    setResponses(newResponses);
    setFeedback(isCorrect ? "correct" : "wrong");

    // Transition to next trial or finish
    setStage("fixation");
    fixationTimerRef.current = setTimeout(() => {
      setFeedback(null);
      if (currentIndex + 1 < trials.length) {
        setCurrentIndex(currentIndex + 1);
        setStage("playing");
        trialStartTimeRef.current = performance.now();
      } else {
        finishTest(newResponses);
      }
    }, 450);
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (stage !== "playing") return;
      const key = e.key.toLowerCase();
      const match = COLOR_PALETTE.find(
        (c) => c.key === key || c.name[0].toLowerCase() === key
      );
      if (match) {
        handleSelectColor(match.id);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stage, currentIndex, trials, responses]);

  const currentMetrics = stage === "finished" ? computeClinicalMetrics(responses) : null;

  return (
    <div className="stroop-container">
      {/* Header */}
      <div className="game-header">
        <div>
          <h2>⚡ Stroop Color-Word Executive Function Test</h2>
          <p className="subtitle">
            Measures frontal-lobe inhibitory control, cognitive interference, and selective attention speed.
          </p>
        </div>
        {stage !== "intro" && (
          <button onClick={() => setStage("intro")} className="btn-secondary">
            🔄 Restart Test
          </button>
        )}
      </div>

      {/* Screen 1: Instructions & Protocol */}
      {stage === "intro" && (
        <div className="stroop-intro-card">
          <div className="protocol-badge">Clinical Neuropsychology Protocol</div>
          <h3>How This Test Works:</h3>
          <p>
            You will be shown words one by one. Your task is to <strong>name the INK COLOR</strong> of the word as quickly as possible, <em>ignoring the word itself</em>.
          </p>

          <div className="stroop-demo-box">
            <span className="demo-label">Example Trial:</span>
            <div className="demo-word" style={{ color: "#2563eb" }}>
              RED
            </div>
            <div className="demo-explanation">
              The word says "RED", but the ink color is <strong>BLUE</strong>.
              <br />
              👉 You must press <strong>BLUE</strong>!
            </div>
          </div>

          <div className="stroop-instructions-grid">
            <div className="instruction-item">
              <span className="inst-num">1</span>
              <div>
                <strong>Accuracy & Speed:</strong> Respond as quickly as possible without making mistakes.
              </div>
            </div>
            <div className="instruction-item">
              <span className="inst-num">2</span>
              <div>
                <strong>Keyboard or Touch:</strong> Click buttons or press keys <code>1</code>, <code>2</code>, <code>3</code>, <code>4</code>.
              </div>
            </div>
            <div className="instruction-item">
              <span className="inst-num">3</span>
              <div>
                <strong>Total Duration:</strong> 16 quick trials (takes ~45 seconds).
              </div>
            </div>
          </div>

          <button onClick={startTest} className="btn-primary btn-large" style={{ marginTop: 24, width: "100%" }}>
            🚀 Start Stroop Test
          </button>
        </div>
      )}

      {/* Screen 2: 3-2-1 Countdown */}
      {stage === "countdown" && (
        <div className="countdown-box">
          <div className="countdown-number">{countdown}</div>
          <p>Get ready... Focus on the <strong>FONT COLOR</strong>!</p>
        </div>
      )}

      {/* Screen 3: Live Test Trial */}
      {(stage === "playing" || stage === "fixation") && (
        <div className="stroop-play-area">
          {/* Progress Tracker */}
          <div className="stroop-progress-bar-track">
            <div
              className="stroop-progress-bar-fill"
              style={{ width: `${((currentIndex + 1) / trials.length) * 100}%` }}
            ></div>
          </div>
          <div className="stroop-trial-counter">
            Trial {currentIndex + 1} of {trials.length}
          </div>

          {/* Word Presentation Display */}
          <div className={`word-presentation-box ${feedback ? `feedback-${feedback}` : ""}`}>
            {stage === "fixation" ? (
              <span className="fixation-cross">+</span>
            ) : (
              <span
                className="stimulus-word"
                style={{ color: trials[currentIndex]?.inkColor }}
              >
                {trials[currentIndex]?.wordText}
              </span>
            )}
          </div>

          {/* Color Answer Buttons */}
          <div className="color-buttons-grid">
            {COLOR_PALETTE.map((col) => (
              <button
                key={col.id}
                onClick={() => handleSelectColor(col.id)}
                disabled={stage !== "playing"}
                className="btn-color-choice"
                style={{ borderColor: col.colorCode }}
              >
                <span className="color-indicator-circle" style={{ backgroundColor: col.colorCode }}></span>
                <span className="color-name">{col.name}</span>
                <span className="key-shortcut">Key {col.key}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Screen 4: Results & Clinical Telemetry Dashboard */}
      {stage === "finished" && currentMetrics && (
        <div className="stroop-results-card">
          <div className="results-header-banner">
            <div>
              <h3>🎉 Test Complete! Inhibitory Telemetry Recorded</h3>
              <p>Your executive control and latency metrics have been measured with millisecond precision.</p>
            </div>
            <div className="accuracy-pill">
              {currentMetrics.accuracy}% Accuracy
            </div>
          </div>

          <div className="metrics-strip" style={{ marginTop: 20 }}>
            <div className="metric-box">
              <span className="metric-label">⏱️ Mean Latency</span>
              <span className="metric-val">{currentMetrics.avg_reaction_ms} ms</span>
              <span className="metric-sub">
                {currentMetrics.avg_reaction_ms < 850
                  ? "🟢 Normal Baseline"
                  : currentMetrics.avg_reaction_ms < 1150
                  ? "🟡 Mild Slowing"
                  : "🔴 Significant Delay"}
              </span>
            </div>

            <div className="metric-box">
              <span className="metric-label">🧠 Stroop Interference</span>
              <span className="metric-val">+{currentMetrics.interference_ms} ms</span>
              <span className="metric-sub">Cognitive Incongruence Cost</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">🎯 Correct Answers</span>
              <span className="metric-val">
                {currentMetrics.correct_count} / {currentMetrics.total_trials}
              </span>
              <span className="metric-sub">{currentMetrics.error_count} errors</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">⚡ Congruent vs Incongruent</span>
              <span className="metric-val" style={{ fontSize: "1.1rem", marginTop: 4 }}>
                {currentMetrics.congruent_avg_ms}ms / {currentMetrics.incongruent_avg_ms}ms
              </span>
              <span className="metric-sub">Congruent / Conflict RT</span>
            </div>
          </div>

          {/* Neuropsychological Interpretation */}
          <div className="flags-box" style={{ marginTop: 20 }}>
            <h4>🩺 Clinical Neuropsychological Evaluation:</h4>
            <ul>
              {currentMetrics.avg_reaction_ms > 1100 && (
                <li>⚠️ Response latency is prolonged (&gt;1100ms), which may indicate reduced processing speed or early prefrontal executive inefficiency.</li>
              )}
              {currentMetrics.interference_ms > 300 && (
                <li>⚠️ Elevated Stroop interference (+{currentMetrics.interference_ms}ms) reflects difficulty suppressing automatic reading habits.</li>
              )}
              {currentMetrics.accuracy < 80 && (
                <li>⚠️ Accuracy rate ({currentMetrics.accuracy}%) is below normal elderly control benchmarks.</li>
              )}
              {currentMetrics.avg_reaction_ms <= 850 && currentMetrics.interference_ms <= 250 && currentMetrics.accuracy >= 85 && (
                <li>✅ Response latencies and interference control fall within healthy normative cognitive ranges.</li>
              )}
            </ul>
          </div>

          <div className="completion-actions" style={{ marginTop: 24 }}>
            <button
              className="btn-primary btn-large"
              onClick={() => onNavigateToRisk && onNavigateToRisk()}
            >
              📊 Feed Live Biomarkers into AI Risk Model →
            </button>
            <button className="btn-secondary" onClick={startTest}>
              🔄 Retake Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
