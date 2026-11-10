const API_BASE = "http://127.0.0.1:8000";

const TOKEN_KEY = "mindcare_auth_token";
const USER_KEY = "mindcare_auth_user";
const HISTORY_KEY = "mindcare_assessment_history";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function saveAuth(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logoutUser() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function errorDetail(res, fallback) {
  const body = await res.json().catch(() => ({}));
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail)) return body.detail.map((d) => d.msg).join("; ");
  return fallback;
}

// A failed login is a failed login. (The previous version caught EVERY error,
// including "wrong password", and signed the user in as a fake demo clinician.)
export async function loginUser(email, password) {
  let res;
  try {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);
    res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
  } catch {
    return { success: false, error: "Cannot reach the server. Is the backend running on " + API_BASE + "?" };
  }
  if (!res.ok) {
    return { success: false, error: await errorDetail(res, "Incorrect email or password") };
  }
  const data = await res.json();
  try {
    const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${data.access_token}` } });
    if (!meRes.ok) throw new Error("profile");
    const userProfile = await meRes.json();
    saveAuth(data.access_token, userProfile);
    return { success: true, user: userProfile, token: data.access_token };
  } catch {
    return { success: false, error: "Signed in but could not load your profile. Please try again." };
  }
}

export async function registerUser(userData) {
  let res;
  try {
    res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: userData.fullName || userData.full_name,
        email: userData.email,
        password: userData.password,
        role: userData.role === "caregiver" ? "caregiver" : "patient",
        age: userData.age ? parseInt(userData.age, 10) : null,
        education_years: userData.educationYears ? parseInt(userData.educationYears, 10) : null,
        family_history: userData.familyHistory || "unknown",
      }),
    });
  } catch {
    return { success: false, error: "Cannot reach the server. Is the backend running on " + API_BASE + "?" };
  }
  if (!res.ok) {
    return { success: false, error: await errorDetail(res, "Registration failed") };
  }
  return await loginUser(userData.email, userData.password);
}

// NOTE: history lives in this browser's localStorage only (not per-account, not
// synced). It starts EMPTY; the original seeded two invented patient records.
export function getStoredAssessments() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Stores what was actually measured/predicted; missing values stay null (never
// replaced by invented defaults such as "15.0" or "92% confidence").
export function saveAssessmentToHistory(assessment) {
  try {
    const list = getStoredAssessments();
    const newEntry = {
      id: `MC-${Date.now().toString(36).toUpperCase()}`,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      patientName: assessment.patientName || "Anonymous Subject",
      age: assessment.age ?? null,
      educationYears: assessment.educationYears ?? null,
      familyHistory: assessment.familyHistory ?? null,
      riskLevel: assessment.riskLevel ?? null,
      riskScore: assessment.riskScore ?? null,
      confidence: assessment.confidence ?? null,
      ad8Score: assessment.ad8Score ?? null,
      cardMoves: assessment.cardMoves ?? null,
      stroopRt: assessment.stroopRt ?? null,
      mriStage: assessment.mriStage ?? null,
      notes: assessment.notes ?? "",
      result: assessment.result ?? null, // full model response incl. probabilities, flags, model_info
      payload: assessment.payload ?? null, // exact inputs sent to the model
    };
    list.unshift(newEntry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    return newEntry;
  } catch (e) {
    console.error("Failed to save history", e);
    return null;
  }
}

export async function checkBackendStatus() {
  try {
    const res = await fetch(`${API_BASE}/`, { method: "GET" });
    if (!res.ok) throw new Error("Backend not responding");
    return { online: true, data: await res.json() };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

// Returns { success:true, ...modelOutput } or { success:false, error, status }.
// There is deliberately NO client-side fallback: if the model cannot answer, the
// UI must say so instead of showing an invented score.
export async function predictCognitiveRisk(payload) {
  try {
    const res = await fetch(`${API_BASE}/ml/predict-risk/quick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { success: false, status: res.status, error: await errorDetail(res, `Prediction failed (HTTP ${res.status})`) };
    }
    return { success: true, ...(await res.json()) };
  } catch {
    return { success: false, status: 0, error: "Cannot reach the prediction server. Start the backend and try again." };
  }
}

export async function getModelInfo() {
  try {
    const res = await fetch(`${API_BASE}/ml/model-info`);
    if (!res.ok) return { success: false, error: await errorDetail(res, "Model report unavailable") };
    return { success: true, ...(await res.json()) };
  } catch {
    return { success: false, error: "Cannot reach the server." };
  }
}

export function getModelPlotUrl(path) {
  return `${API_BASE}${path}`;
}

export async function getMriStatus() {
  try {
    const res = await fetch(`${API_BASE}/ml/mri-status`);
    return res.ok ? await res.json() : { available: false, reason: "MRI status unavailable" };
  } catch {
    return { available: false, reason: "Cannot reach the server." };
  }
}

export async function downloadPdfReport(reportData) {
  try {
    const res = await fetch(`${API_BASE}/reports/download-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportData),
    });

    if (!res.ok) {
      throw new Error(`Failed to generate PDF report: status ${res.status}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `neuroguard_clinical_report_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return { success: true };
  } catch (err) {
    console.error("PDF download error:", err);
    // If backend PDF fails, invoke native browser print dialog for the report
    window.print();
    return { success: false, fallbackPrint: true, error: err.message };
  }
}

export async function getSampleMriScans() {
  try {
    const res = await fetch(`${API_BASE}/ml/sample-scans`);
    if (!res.ok) throw new Error("Failed to load sample scans");
    return await res.json();
  } catch {
    return { samples: [], synthetic: true };
  }
}

export function getSampleMriImageUrl(filename) {
  return `${API_BASE}/ml/sample-scans/${filename}`;
}

async function postMri(url, options) {
  try {
    const res = await fetch(url, options);
    if (res.status === 503) {
      return { success: false, unavailable: true, error: await errorDetail(res, "MRI model unavailable") };
    }
    if (!res.ok) {
      return { success: false, error: await errorDetail(res, `MRI analysis failed (HTTP ${res.status})`) };
    }
    return { success: true, ...(await res.json()) };
  } catch {
    return { success: false, error: "Cannot reach the server." };
  }
}

export async function predictMriUpload(file) {
  const formData = new FormData();
  formData.append("file", file);
  return postMri(`${API_BASE}/ml/predict-mri`, { method: "POST", body: formData });
}

export async function predictMriSample(sampleId) {
  return postMri(`${API_BASE}/ml/predict-mri/sample/${sampleId}`, { method: "POST" });
}
