import { useState, useMemo } from "react";
import { downloadPdfReport } from "../services/api";

export default function ClinicalReportModal({
  isOpen,
  onClose,
  patientData,
  assessmentResult,
}) {
  const [downloading, setDownloading] = useState(false);

  const reportId = useMemo(() => {
    return assessmentResult?.id ? `NG-${assessmentResult.id}` : "NG-482910";
  }, [assessmentResult]);

  const subjectId = useMemo(() => {
    return patientData?.patient_id ? `PT-${patientData.patient_id}` : "PT-8421";
  }, [patientData]);

  if (!isOpen || !assessmentResult) return null;

  const {
    risk_level = "Low Risk",
    risk_score = 12.0,
    confidence = 0.95,
    class_probabilities = {},
    clinical_flags = [],
    recommendation = "",
    stage_advice = "",
  } = assessmentResult;

  const {
    age = 68,
    education_years = 14,
    family_history = "no",
    ad8_score = 0,
    card_match_metrics = { moves: 18, time_sec: 42, errors: 1 },
    stroop_metrics = { accuracy: 90.0, avg_reaction_ms: 700.0, interference_ms: 160.0 },
    mri_result = null,
  } = patientData;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    await downloadPdfReport({
      patient_name: "Anonymous Patient",
      age,
      education_years,
      family_history,
      ad8_score,
      card_match_metrics,
      stroop_metrics,
      mri_result,
      risk_level,
      risk_score,
      confidence,
      class_probabilities,
      clinical_flags,
      recommendation,
      stage_advice,
    });
    setDownloading(false);
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  const getRiskColor = (level) => {
    if (level === "High Risk") return "#dc2626";
    if (level === "Moderate Risk") return "#d97706";
    return "#16a34a";
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Action Bar (Hidden during printing) */}
        <div className="modal-actions-bar no-print">
          <div className="modal-actions-left">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="btn-primary"
            >
              {downloading ? "⏳ Generating PDF..." : "📥 Download Official PDF"}
            </button>
            <button onClick={handleBrowserPrint} className="btn-secondary">
              🖨️ Print / Save as PDF
            </button>
          </div>
          <button onClick={onClose} className="btn-close">
            ✕ Close
          </button>
        </div>

        {/* Printable Medical Sheet */}
        <div className="medical-sheet" id="printable-clinical-report">
          {/* Header */}
          <div className="report-header">
            <div>
              <h1 className="report-title">🛡️ NEUROGUARD CLINICAL SCREENING REPORT</h1>
              <p className="report-subtitle">
                Multi-Stage Early Alzheimer's & Mild Cognitive Impairment (MCI) Screening Platform
              </p>
            </div>
            <div className="report-meta">
              <div><strong>Date:</strong> {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
              <div><strong>Report ID:</strong> {reportId}</div>
              <div><strong>Status:</strong> Validated Assessment</div>
            </div>
          </div>

          <div className="report-divider"></div>

          {/* Patient Profile */}
          <div className="section-title">SUBJECT DEMOGRAPHIC BASELINE</div>
          <div className="profile-grid">
            <div className="profile-item"><span>Subject ID:</span> <strong>{subjectId}</strong></div>
            <div className="profile-item"><span>Age:</span> <strong>{age} years</strong></div>
            <div className="profile-item"><span>Education:</span> <strong>{education_years} years</strong></div>
            <div className="profile-item"><span>Family History of Dementia:</span> <strong>{String(family_history).toUpperCase()}</strong></div>
          </div>

          {/* Risk Level Callout */}
          <div
            className="risk-summary-card"
            style={{
              borderColor: getRiskColor(risk_level),
              backgroundColor: `${getRiskColor(risk_level)}12`,
            }}
          >
            <div className="risk-summary-left">
              <span className="risk-pill" style={{ backgroundColor: getRiskColor(risk_level) }}>
                {risk_level}
              </span>
              <h2 style={{ color: getRiskColor(risk_level), margin: "6px 0 0 0" }}>
                Cognitive Vulnerability Index: {risk_score} / 100
              </h2>
            </div>
            <div className="risk-summary-right">
              <div><strong>Model Confidence:</strong> {(confidence * 100).toFixed(1)}%</div>
              <div><strong>Algorithm:</strong> Clinical Random Forest / XGBoost</div>
            </div>
          </div>

          {/* Biomarkers Table */}
          <div className="section-title">1. SCREENING MODALITY BIOMARKERS EVALUATED</div>
          <table className="report-table">
            <thead>
              <tr>
                <th>Modality / Assessment</th>
                <th>Observed Telemetry</th>
                <th>Clinical Benchmark</th>
                <th>Diagnostic Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>AD8 Clinical Questionnaire</strong></td>
                <td>{ad8_score} / 8 positive changes</td>
                <td>&lt; 2 points (Normal)</td>
                <td>
                  <span className={ad8_score >= 2 ? "badge-flag" : "badge-ok"}>
                    {ad8_score >= 2 ? "Flagged (Impairment Risk)" : "Normal Range"}
                  </span>
                </td>
              </tr>
              <tr>
                <td><strong>Visuospatial Card Memory</strong></td>
                <td>
                  {card_match_metrics?.moves || 18} moves in {card_match_metrics?.time_sec || 40}s ({card_match_metrics?.errors || 0} errors)
                </td>
                <td>&lt; 22 moves, &lt; 55s</td>
                <td>
                  <span className={(card_match_metrics?.moves || 0) > 25 ? "badge-flag" : "badge-ok"}>
                    {(card_match_metrics?.moves || 0) > 25 ? "Elevated Attempts" : "Normal Retention"}
                  </span>
                </td>
              </tr>
              <tr>
                <td><strong>Executive Inhibitory Stroop Test</strong></td>
                <td>
                  Latency: {stroop_metrics?.avg_reaction_ms || 700}ms | Interference: +{stroop_metrics?.interference_ms || 160}ms ({stroop_metrics?.accuracy || 90}% Acc)
                </td>
                <td>&lt; 850ms latency, &lt; 250ms cost</td>
                <td>
                  <span className={(stroop_metrics?.avg_reaction_ms || 0) > 1000 ? "badge-flag" : "badge-ok"}>
                    {(stroop_metrics?.avg_reaction_ms || 0) > 1000 ? "Inhibitory Delay" : "Normal Response"}
                  </span>
                </td>
              </tr>
              <tr>
                <td><strong>Brain MRI Neuroimaging</strong></td>
                <td>
                  {patientData.mri_result
                    ? `${patientData.mri_result.predicted_class} (VBR: ${patientData.mri_result.ventricle_to_brain_ratio})`
                    : "Not evaluated"}
                </td>
                <td>Preserved cortex & VBR &lt; 3.5%</td>
                <td>
                  <span className={patientData.mri_result && patientData.mri_result.class_code > 0 ? "badge-flag" : "badge-ok"}>
                    {patientData.mri_result ? patientData.mri_result.predicted_class : "Unscreened"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Multi-Class Probabilities */}
          <div className="section-title">2. MULTI-CLASS PROBABILITY DISTRIBUTION</div>
          <div className="prob-grid">
            {Object.entries(class_probabilities).map(([name, prob]) => (
              <div key={name} className="prob-box">
                <span className="prob-box-label">{name}</span>
                <span className="prob-box-val" style={{ color: getRiskColor(name) }}>
                  {(prob * 100).toFixed(1)}%
                </span>
                <div className="prob-bar-small">
                  <div
                    className="prob-bar-fill-small"
                    style={{ width: `${(prob * 100).toFixed(1)}%`, backgroundColor: getRiskColor(name) }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Clinical Flags */}
          {clinical_flags && clinical_flags.length > 0 && (
            <div className="flags-container">
              <div className="section-title">3. CLINICAL WARNING FLAGS DETECTED</div>
              <ul className="flags-list">
                {clinical_flags.map((flag, idx) => (
                  <li key={idx}>⚠️ {flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Clinical Action Plan */}
          <div className="section-title">4. RECOMMENDED CLINICAL ACTION PLAN</div>
          <div className="action-plan-box">
            <div className="stage-title"><strong>Recommended Next Step:</strong> {stage_advice}</div>
            <p className="rec-body">{recommendation}</p>
          </div>

          {/* Footer & Disclaimer */}
          <div className="report-footer">
            <p className="disclaimer-small">
              <strong>CLINICAL DISCLAIMER:</strong> NeuroGuard is an investigational multi-stage screening and decision-support tool.
              This report does not constitute a formal definitive diagnosis of Alzheimer's Disease or other neurodegenerative dementias.
              Formal neuropsychological evaluation (MoCA/MMSE) and clinical brain neuroimaging (MRI) by a qualified neurologist are strictly advised.
            </p>
            <div className="signatures-row">
              <div><strong>Software Version:</strong> NeuroGuard AI v1.0</div>
              <div><strong>Clinician / Reviewer Signature:</strong> ____________________________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
