import { useEffect, useState } from "react";
import { getModelInfo, getModelPlotUrl } from "../services/api";

const pct = (v) => (v === null || v === undefined ? "-" : `${(v * 100).toFixed(1)}%`);

export default function ModelPerformance() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getModelInfo().then((r) => (r.success ? setInfo(r) : setError(r.error)));
  }, []);

  if (error) return <div className="mp-banner mp-banner-warn" role="alert">{error}</div>;
  if (!info) return <p>Loading model report…</p>;

  const t = info.test_metrics;
  const names = t.class_names;
  const synthetic = info.data_provenance?.synthetic !== false;
  const stress = info.stress_test_overlapping_classes?.metrics;
  const ci = info.test_metrics_95ci_bootstrap;

  return (
    <div className="mp-root">
      <div className="game-header">
        <div>
          <h2>Model Performance and Validation</h2>
          <p className="subtitle">
            {info.model_name} · {info.task} · {t.n} held-out records
          </p>
        </div>
      </div>

      {synthetic && (
        <div className="mp-banner mp-banner-warn" role="note">
          <strong>These figures describe synthetic data.</strong> {info.interpretation} Status: <code>{info.validation_status}</code>.
        </div>
      )}

      <div className="mp-kpis">
        {[
          ["Accuracy", t.accuracy, ci?.accuracy],
          ["Macro F1", t.f1_macro, ci?.f1_macro],
          ["ROC-AUC (macro OvR)", t.roc_auc_macro_ovr, ci?.roc_auc_macro_ovr],
          ["Sensitivity (macro)", t.recall_macro],
          ["Specificity (macro)", t.specificity_macro],
          ["Precision (macro)", t.precision_macro],
        ].map(([label, v, c]) => (
          <div className="mp-kpi" key={label}>
            <span className="mp-kpi-label">{label}</span>
            <strong>{pct(v)}</strong>
            {c && <span className="mp-kpi-ci">95% CI {pct(c[0])} to {pct(c[1])}</span>}
          </div>
        ))}
      </div>

      <div className="dashboard-card mp-section">
        <h3>Per-class results</h3>
        <div className="mp-scroll">
          <table className="mp-table">
            <thead>
              <tr><th>Class</th><th>Precision</th><th>Sensitivity</th><th>Specificity</th><th>F1</th><th>ROC-AUC</th><th>Avg. precision</th><th>n</th></tr>
            </thead>
            <tbody>
              {names.map((n) => {
                const c = t.per_class[n];
                return (
                  <tr key={n}>
                    <td>{n}</td><td>{pct(c.precision)}</td><td>{pct(c.recall_sensitivity)}</td><td>{pct(c.specificity)}</td>
                    <td>{pct(c.f1)}</td><td>{c.roc_auc.toFixed(3)}</td><td>{c.average_precision.toFixed(3)}</td><td>{c.support}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dashboard-card mp-section">
        <h3>Confusion matrix (rows: true class, columns: predicted)</h3>
        <div className="mp-scroll">
          <table className="mp-table mp-cm">
            <thead><tr><th></th>{names.map((n) => <th key={n}>{n}</th>)}</tr></thead>
            <tbody>
              {t.confusion_matrix.map((row, i) => (
                <tr key={names[i]}>
                  <th>{names[i]}</th>
                  {row.map((v, j) => <td key={j} className={i === j ? "mp-diag" : ""}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mp-plots">
        {[
          ["roc_curve", "ROC curves"],
          ["pr_curve", "Precision-recall curves"],
          ["calibration", "Calibration"],
          ["feature_importance", "Permutation importance"],
        ].map(([k, label]) => (
          <figure className="dashboard-card mp-fig" key={k}>
            <img src={getModelPlotUrl(info.plot_urls[k])} alt={label} loading="lazy" />
            <figcaption>{label}</figcaption>
          </figure>
        ))}
      </div>

      <div className="dashboard-card mp-section">
        <h3>How far can these numbers be trusted?</h3>
        <ul className="mp-notes">
          <li>Test accuracy {pct(t.accuracy)} sits against a ceiling of {pct(info.generator_accuracy_ceiling)} set by the label noise built into the data generator.</li>
          {stress && <li>On a harder, overlapping synthetic set the same model reaches {pct(stress.accuracy)} accuracy and {pct(stress.f1_macro)} macro F1.</li>}
          <li>
            Reference baselines (cross-validated macro F1): {Object.entries(info.baselines).map(([n, b]) => `${n} ${pct(b.cv_mean)}`).join(" · ")}.
          </li>
          <li>Model selection: {info.selection.rule}. Chosen: {info.selection.chosen}. Calibration {info.selection.calibration.used ? "applied" : "not needed"}.</li>
        </ul>
      </div>
    </div>
  );
}
