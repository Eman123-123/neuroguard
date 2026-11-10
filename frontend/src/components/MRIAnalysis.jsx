import { useState, useEffect, useRef } from "react";
import {
  getSampleMriScans,
  getSampleMriImageUrl,
  predictMriUpload,
  predictMriSample,
  checkBackendStatus,
  getMriStatus,
} from "../services/api";

export default function MRIAnalysis({ onMriAnalyzed }) {
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [backendOnline, setBackendOnline] = useState(true);
  const [mriStatus, setMriStatus] = useState(null);
  const [mriError, setMriError] = useState("");
  const fileInputRef = useRef(null);

  const selectSample = (sample) => {
    setSelectedSample(sample);
    setUploadedFile(null);
    const imgUrl = getSampleMriImageUrl(sample.id);
    setPreviewUrl(imgUrl);
    setPrediction(null);
  };

  useEffect(() => {
    checkBackendStatus().then((s) => setBackendOnline(s.online));
    getMriStatus().then(setMriStatus);
    getSampleMriScans().then((data) => {
      if (data && data.samples) {
        setSamples(data.samples);
        // Default to first sample
        if (data.samples.length > 0) {
          selectSample(data.samples[0]);
        }
      }
    });
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setSelectedSample(null);
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPrediction(null);
    }
  };

  const handleRunAnalysis = async () => {
    setLoading(true);
    let res;
    if (uploadedFile) {
      res = await predictMriUpload(uploadedFile);
    } else if (selectedSample) {
      res = await predictMriSample(selectedSample.id);
    }

    if (res && res.success) {
      setMriError("");
      setPrediction(res);
      if (onMriAnalyzed) {
        onMriAnalyzed(res);
      }
    } else if (res) {
      setPrediction(null);
      setMriError(res.error);
    }
    setLoading(false);
  };

  const getClassColor = (cName) => {
    if (!cName) return "#64748b";
    if (cName.includes("Moderate")) return "#ef4444";
    if (cName.includes("Mild") && !cName.includes("Very")) return "#f97316";
    if (cName.includes("Very Mild")) return "#f59e0b";
    return "#10b981";
  };

  return (
    <div className="mri-analysis-container">
      <div className="game-header">
        <div>
          <h2>🩻 Structural Brain MRI Neuroimaging Classifier</h2>
          <p className="subtitle">
            Stage 3 neuroimaging (research module): runs only when a trained, installed model is available.
          </p>
        </div>
        <div className={`status-pill ${backendOnline ? "online" : "offline"}`}>
          <span className="dot"></span>
          {!backendOnline ? "Backend offline" : mriStatus?.available ? "MRI model loaded (unvalidated)" : "MRI model not installed"}
        </div>
      </div>

      {mriStatus && !mriStatus.available && (
        <div className="mp-banner mp-banner-warn" role="note">
          <strong>No MRI result will be produced.</strong> {mriStatus.reason} The sample images below are synthetic
          illustrations, not real scans, and were never a validated classification target.
        </div>
      )}
      {mriError && <div className="mp-banner mp-banner-warn" role="alert">{mriError}</div>}

      <div className="dashboard-grid">
        {/* Left Column: Image Selector & Input */}
        <div className="dashboard-card">
          <h3>1. Select or Upload Axial T1 Brain MRI Scan</h3>
          
          <div className="benchmark-presets">
            <label className="section-small-label">Synthetic sample images (not real scans):</label>
            <div className="preset-buttons-grid">
              {samples.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`btn-preset ${selectedSample?.id === s.id ? "active" : ""}`}
                  onClick={() => selectSample(s)}
                >
                  <span className="preset-title">{s.label}</span>
                  <span className="preset-stage">{s.stage}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="upload-divider">
            <span>OR</span>
          </div>

          <div
            className="dropzone-box"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/jpg"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
            <span className="dropzone-icon">📤</span>
            <strong>{uploadedFile ? uploadedFile.name : "Upload Patient Brain MRI"}</strong>
            <p className="text-muted">Supports Axial/Sagittal T1-weighted .jpg or .png scans</p>
          </div>

          {/* Action Button */}
          <button
            onClick={handleRunAnalysis}
            disabled={loading || !previewUrl}
            className="btn-primary btn-large"
            style={{ width: "100%", marginTop: 20 }}
          >
            {loading ? "⚡ Processing Neural Network & CAM..." : "🧠 Classify Brain MRI & Generate Heatmap"}
          </button>
        </div>

        {/* Right Column: Dual Viewer & Diagnostic Report */}
        <div className="dashboard-card">
          <h3>2. Dual-Modality Visual Neuroimaging</h3>

          {previewUrl ? (
            <div className="dual-scan-viewer">
              <div className="scan-frame">
                <div className="scan-badge">Original Axial MRI</div>
                <img
                  src={previewUrl}
                  alt="Original MRI Scan"
                  className="mri-img"
                />
              </div>

              <div className="scan-frame">
                <div className="scan-badge heatmap-badge">AI Grad-CAM Attention Heatmap</div>
                {prediction && prediction.heatmap_image ? (
                  <img
                    src={prediction.heatmap_image}
                    alt="Attention Heatmap Overlay"
                    className="mri-img"
                  />
                ) : (
                  <div className="placeholder-scan">
                    <span>🔥</span>
                    <p>Click "Classify Brain MRI" to generate attention overlay</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <span style={{ fontSize: "3rem" }}>🩻</span>
              <p>Select a preset scan or upload an MRI slice to begin.</p>
            </div>
          )}

          {/* Prediction Results */}
          {prediction && (
            <div className="mri-results-section">
              <div
                className="risk-banner"
                style={{
                  borderColor: getClassColor(prediction.predicted_class),
                  background: `${getClassColor(prediction.predicted_class)}15`,
                  marginTop: 16,
                }}
              >
                <div className="risk-banner-header">
                  <div>
                    <span
                      className="risk-tag"
                      style={{ background: getClassColor(prediction.predicted_class) }}
                    >
                      {prediction.predicted_class}
                    </span>
                    <h3
                      style={{
                        margin: "6px 0 0",
                        color: getClassColor(prediction.predicted_class),
                      }}
                    >
                      Confidence: {(prediction.confidence * 100).toFixed(1)}%
                    </h3>
                  </div>
                  <div className="confidence-pill">
                    {prediction.ventricle_to_brain_ratio ? `VBR: ${prediction.ventricle_to_brain_ratio}` : null}
                  </div>
                </div>
              </div>

              {/* 4-Class Probability Distribution */}
              <div className="prob-section" style={{ marginTop: 16 }}>
                <h4>Model Class Probabilities (ResNet-50 / Feature Classifier):</h4>
                {Object.entries(prediction.class_probabilities || {}).map(([cName, pVal]) => (
                  <div key={cName} className="prob-bar-row">
                    <span className="prob-name" style={{ width: 140 }}>
                      {cName}
                    </span>
                    <div className="prob-bar-track">
                      <div
                        className="prob-bar-fill"
                        style={{
                          width: `${(pVal * 100).toFixed(1)}%`,
                          background: getClassColor(cName),
                        }}
                      ></div>
                    </div>
                    <span className="prob-pct">{(pVal * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>

              {/* Neuroimaging Biomarkers */}
              {prediction.biomarkers_detected && prediction.biomarkers_detected.length > 0 && (
                <div className="flags-box" style={{ marginTop: 16 }}>
                  <h4>🔍 Detected Morphometric Neuroimaging Findings:</h4>
                  <ul>
                    {prediction.biomarkers_detected.map((b, idx) => (
                      <li key={idx}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clinical Action */}
              <div className="recommendation-card" style={{ marginTop: 14 }}>
                <h4>📋 Clinical Action & Next Step:</h4>
                <p className="rec-text">{prediction.clinical_recommendation}</p>
              </div>

              <p className="disclaimer-text" style={{ marginTop: 10 }}>
                ⚠️ <em>{prediction.disclaimer}</em>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
