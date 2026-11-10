import { useState } from "react";

const AD8_QUESTIONS_LIST = [
  {
    id: 1,
    question: "Problems with judgment",
    detail: "E.g., falling for scams, bad financial choices, poor decision-making regarding safety.",
  },
  {
    id: 2,
    question: "Reduced interest in hobbies and routine activities",
    detail: "Loss of enthusiasm for personal pastimes, social gatherings, or regular routines.",
  },
  {
    id: 3,
    question: "Repeating the same questions, stories, or statements",
    detail: "Frequently asking the same question or recounting the same story within a short timeframe.",
  },
  {
    id: 4,
    question: "Trouble learning how to use tools, appliances, or gadgets",
    detail: "Struggling with previously familiar electronics, microwaves, remotes, or smartphones.",
  },
  {
    id: 5,
    question: "Forgetting the correct month or year",
    detail: "Disorientation regarding the date, day of the week, season, or current year.",
  },
  {
    id: 6,
    question: "Difficulty managing complicated financial affairs",
    detail: "Struggles with balancing a checkbook, paying monthly utility bills, or calculating expenses.",
  },
  {
    id: 7,
    question: "Trouble remembering scheduled appointments",
    detail: "Consistently missing doctor visits, family events, or time-sensitive commitments.",
  },
  {
    id: 8,
    question: "Daily, persistent problems with memory and thinking",
    detail: "Consistent confusion noticed across typical daily cognitive tasks.",
  },
];

export default function AD8Survey({ onSaveScore, onNavigateToRisk }) {
  const [answers, setAnswers] = useState(Array(8).fill(false));
  const [submitted, setSubmitted] = useState(false);

  const handleToggle = (index, value) => {
    const updated = [...answers];
    updated[index] = value;
    setAnswers(updated);
  };

  const score = answers.filter(Boolean).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (onSaveScore) {
      onSaveScore(score);
    }
  };

  return (
    <div className="survey-container">
      <div className="game-header">
        <div>
          <h2>📋 AD8 Dementia Screening Questionnaire</h2>
          <p className="subtitle">
            Answer whether you or your family member have noticed a consistent change in the following areas over the last several years.
          </p>
        </div>
        <div className="score-badge">
          <span>Current Score:</span>
          <strong>{score} / 8</strong>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="questions-list">
          {AD8_QUESTIONS_LIST.map((q, idx) => (
            <div key={q.id} className="question-item">
              <div className="question-text">
                <span className="q-num">{idx + 1}.</span>
                <div>
                  <div className="q-en">{q.question}</div>
                  <div className="q-ur">{q.detail}</div>
                </div>
              </div>
              <div className="question-choices">
                <button
                  type="button"
                  className={`btn-choice ${!answers[idx] ? "active-no" : ""}`}
                  onClick={() => handleToggle(idx, false)}
                >
                  No Change
                </button>
                <button
                  type="button"
                  className={`btn-choice ${answers[idx] ? "active-yes" : ""}`}
                  onClick={() => handleToggle(idx, true)}
                >
                  Yes, A Change
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="survey-footer">
          <button type="submit" className="btn-primary">
            💾 Save AD8 Score ({score}/8)
          </button>
        </div>
      </form>

      {submitted && (
        <div className={`ad8-result-box ${score >= 2 ? "warning" : "normal"}`}>
          <h4>
            {score >= 2
              ? "⚠️ Score 2 or higher: Cognitive change suggested"
              : "✅ Score 0–1: Within normal range"}
          </h4>
          <p>
            {score >= 2
              ? "A score of 2 or higher on the AD8 suggests that cognitive impairment may be present. A formal clinical evaluation is recommended."
              : "Scores of 0 or 1 indicate normal cognitive functioning based on clinical informant standards."}
          </p>
          <button
            className="btn-primary"
            style={{ marginTop: 12 }}
            onClick={() => onNavigateToRisk && onNavigateToRisk()}
          >
            📊 See Combined AI Risk Prediction →
          </button>
        </div>
      )}
    </div>
  );
}
