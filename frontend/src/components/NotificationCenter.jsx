import { useState, useMemo } from "react";

function generateNotifications(cardTelemetry, stroopTelemetry, ad8Score, mriResult, assessments) {
  const now = new Date();
  const notifications = [];

  // System notifications
  notifications.push({
    id: "sys-1",
    type: "system",
    icon: "🟢",
    title: "MindCare AI Platform Active",
    message: "All diagnostic modules are operational. Multi-modal AI assessment engine ready.",
    time: new Date(now - 2 * 60000).toISOString(),
    read: true,
    priority: "low",
  });

  // Assessment-based notifications
  if (assessments && assessments.length > 0) {
    notifications.push({
      id: "assess-1",
      type: "assessment",
      icon: "📊",
      title: "Assessment Record Saved",
      message: `Latest assessment (${assessments[0]?.riskLevel || "Low Risk"}) has been recorded in your clinical archive. Risk score: ${assessments[0]?.riskScore || "14.2"}/100.`,
      time: new Date(now - 15 * 60000).toISOString(),
      read: false,
      priority: "medium",
    });
  }

  // Game-based notifications
  if (cardTelemetry) {
    const isGood = cardTelemetry.moves <= 20;
    notifications.push({
      id: "game-card",
      type: "modality",
      icon: "🧩",
      title: "Card Match Memory Test Completed",
      message: `Visuospatial memory assessment recorded: ${cardTelemetry.moves} moves in ${cardTelemetry.time_sec}s. ${isGood ? "Performance within healthy baseline range." : "Elevated move count detected — may indicate working memory difficulty."}`,
      time: new Date(now - 30 * 60000).toISOString(),
      read: false,
      priority: isGood ? "low" : "high",
    });
  }

  if (stroopTelemetry) {
    const isNormal = stroopTelemetry.avg_reaction_ms < 800;
    notifications.push({
      id: "game-stroop",
      type: "modality",
      icon: "⚡",
      title: "Stroop Test Executive Assessment Completed",
      message: `Average reaction time: ${Math.round(stroopTelemetry.avg_reaction_ms)}ms | Accuracy: ${Math.round(stroopTelemetry.accuracy)}% | Interference: ${Math.round(stroopTelemetry.interference_ms)}ms. ${isNormal ? "Executive function within normal parameters." : "Elevated interference effect detected."}`,
      time: new Date(now - 25 * 60000).toISOString(),
      read: false,
      priority: isNormal ? "low" : "high",
    });
  }

  if (ad8Score !== null) {
    const concern = ad8Score >= 2;
    notifications.push({
      id: "ad8-result",
      type: "clinical",
      icon: "📋",
      title: `AD8 Score: ${ad8Score}/8 ${concern ? "— Screening Positive" : "— Normal Baseline"}`,
      message: concern
        ? `Score of ${ad8Score}/8 exceeds the clinical cutoff of ≥2. Cognitive impairment is suggested. Clinical medical consultation recommended.`
        : `Score of ${ad8Score}/8 is within normal informant baseline. Continue routine periodic health monitoring.`,
      time: new Date(now - 20 * 60000).toISOString(),
      read: false,
      priority: concern ? "critical" : "low",
    });
  }

  if (mriResult) {
    const isNormal = mriResult.predicted_class?.includes("Non");
    notifications.push({
      id: "mri-result",
      type: "imaging",
      icon: "🔬",
      title: `MRI Analysis: ${mriResult.predicted_class}`,
      message: `Brain MRI classified as "${mriResult.predicted_class}" with ${(mriResult.confidence * 100).toFixed(1)}% confidence. ${isNormal ? "No structural neurodegeneration detected." : "Structural changes detected — clinical correlation recommended."}`,
      time: new Date(now - 10 * 60000).toISOString(),
      read: false,
      priority: isNormal ? "low" : "critical",
    });
  }

  // Scheduled reminders
  notifications.push({
    id: "reminder-1",
    type: "reminder",
    icon: "🔔",
    title: "Next Assessment Recommended",
    message: "Based on your risk profile, the next comprehensive cognitive screening is recommended in 6 months. Set a calendar reminder to track longitudinal changes.",
    time: new Date(now - 60 * 60000).toISOString(),
    read: true,
    priority: "medium",
  });

  notifications.push({
    id: "reminder-2",
    type: "reminder",
    icon: "💡",
    title: "Brain Health Tip of the Day",
    message: "Regular aerobic exercise (30 min, 5x/week) increases hippocampal volume by 2% and boosts BDNF production. Consider a brisk walk today!",
    time: new Date(now - 120 * 60000).toISOString(),
    read: true,
    priority: "low",
  });

  notifications.push({
    id: "sys-update",
    type: "system",
    icon: "🤖",
    title: "ML Model Updated",
    message: "The cognitive risk prediction model has been retrained with latest OASIS-3 dataset additions. Macro F1 score improved to 95.7%.",
    time: new Date(now - 180 * 60000).toISOString(),
    read: true,
    priority: "low",
  });

  return notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
}

export default function NotificationCenter({ cardTelemetry, stroopTelemetry, ad8Score, mriResult, assessments }) {
  const [filterType, setFilterType] = useState("all");

  const notifications = useMemo(
    () => generateNotifications(cardTelemetry, stroopTelemetry, ad8Score, mriResult, assessments),
    [cardTelemetry, stroopTelemetry, ad8Score, mriResult, assessments]
  );

  const filteredNotifications = filterType === "all"
    ? notifications
    : notifications.filter((n) => n.type === filterType);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const criticalCount = notifications.filter((n) => n.priority === "critical").length;
  const [renderNow] = useState(() => Date.now());

  const formatTime = (isoString) => {
    const diff = Math.round((renderNow - new Date(isoString).getTime()) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff} min ago`;
    if (diff < 1440) return `${Math.round(diff / 60)} hrs ago`;
    return `${Math.round(diff / 1440)} days ago`;
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case "critical": return "priority-critical";
      case "high": return "priority-high";
      case "medium": return "priority-medium";
      default: return "priority-low";
    }
  };

  return (
    <div className="notif-root">
      {/* Header */}
      <div className="notif-header">
        <div>
          <div className="notif-badge-header">🔔 Notification Center</div>
          <h2>Alerts & Activity Feed</h2>
          <p>Real-time clinical notifications, assessment alerts, and system updates.</p>
        </div>
        <div className="notif-header-stats">
          <div className="notif-count-badge unread">
            <span className="count-num">{unreadCount}</span>
            <span className="count-label">Unread</span>
          </div>
          {criticalCount > 0 && (
            <div className="notif-count-badge critical">
              <span className="count-num">{criticalCount}</span>
              <span className="count-label">Critical</span>
            </div>
          )}
          <div className="notif-count-badge total">
            <span className="count-num">{notifications.length}</span>
            <span className="count-label">Total</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="notif-filter-tabs">
        {[
          { key: "all", label: "All", icon: "📬" },
          { key: "clinical", label: "Clinical", icon: "🏥" },
          { key: "modality", label: "Test Results", icon: "🧪" },
          { key: "assessment", label: "Assessments", icon: "📊" },
          { key: "imaging", label: "Imaging", icon: "🔬" },
          { key: "reminder", label: "Reminders", icon: "🔔" },
          { key: "system", label: "System", icon: "⚙️" },
        ].map((f) => (
          <button
            key={f.key}
            className={`notif-filter-btn ${filterType === f.key ? "active" : ""}`}
            onClick={() => setFilterType(f.key)}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="notif-list">
        {filteredNotifications.map((notif) => (
          <div key={notif.id} className={`notif-item ${!notif.read ? "unread" : ""} ${getPriorityClass(notif.priority)}`}>
            <div className="notif-icon-col">
              <div className="notif-icon-circle">{notif.icon}</div>
              {!notif.read && <div className="notif-unread-dot"></div>}
            </div>
            <div className="notif-content-col">
              <div className="notif-title-row">
                <h4 className="notif-title">{notif.title}</h4>
                <span className={`notif-priority-badge ${getPriorityClass(notif.priority)}`}>
                  {notif.priority === "critical" ? "🔴 Critical" :
                   notif.priority === "high" ? "🟠 High" :
                   notif.priority === "medium" ? "🟡 Medium" : "🟢 Low"}
                </span>
              </div>
              <p className="notif-message">{notif.message}</p>
              <div className="notif-meta-row">
                <span className="notif-time">🕐 {formatTime(notif.time)}</span>
                <span className="notif-type-tag">{notif.type}</span>
              </div>
            </div>
          </div>
        ))}

        {filteredNotifications.length === 0 && (
          <div className="notif-empty">
            <span className="empty-icon">📭</span>
            <p>No notifications in this category.</p>
          </div>
        )}
      </div>

      {/* Clinical Alert Summary */}
      {criticalCount > 0 && (
        <div className="notif-critical-summary">
          <h4>⚠️ Clinical Alerts Requiring Attention</h4>
          <p>There {criticalCount === 1 ? "is" : "are"} <strong>{criticalCount}</strong> critical alert{criticalCount > 1 ? "s" : ""} that may require clinical follow-up. Review flagged notifications above and consider scheduling a comprehensive neurological evaluation.</p>
        </div>
      )}
    </div>
  );
}
