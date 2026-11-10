import { useState } from "react";
import { registerUser } from "../services/api";
import InteractiveBrain from "./InteractiveBrain";

export default function SignupPage({ onNavigate, onLoginSuccess }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Simple password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { label: "", score: 0, color: "#e2e8f0" };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { label: "Weak", score: 25, color: "#ef4444" };
    if (score === 2) return { label: "Fair", score: 50, color: "#f59e0b" };
    if (score === 3) return { label: "Good", score: 75, color: "#3b82f6" };
    return { label: "Strong", score: 100, color: "#10b981" };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName || !email || !password) {
      setErrorMsg("Please complete all required fields.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (!agreeTerms) {
      setErrorMsg("Please accept the Terms & Conditions to proceed.");
      return;
    }

    setLoading(true);
    const result = await registerUser({
      fullName,
      email,
      password,
      role: "patient",
    });
    setLoading(false);

    if (result.success) {
      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
      onNavigate("dashboard");
    } else {
      setErrorMsg(result.error || "Registration failed. Please check the details.");
    }
  };

  return (
    <div className="auth-split-layout">
      {/* LEFT SIDE: Dark Navy + 3D Realistic Brain */}
      <div className="auth-visual-side">
        <div className="auth-visual-atmosphere"></div>
        <div className="auth-back-nav" onClick={() => onNavigate("landing")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Homepage
        </div>

        <div className="auth-visual-content">
          <InteractiveBrain
            imageSrc="/assets/brain_3d.jpg"
            variant="auth"
            showFloatingBadges={false}
          />

          <div className="auth-visual-copy">
            <span className="auth-eyebrow">PREVENTIVE NEUROSCIENCE</span>
            <h2>Start Your Brain Health Journey.</h2>
            <p>
              Join MindCare AI and access intelligent brain health assessment powered by digital cognitive telemetry and deep learning neuroimaging.
            </p>
          </div>
        </div>

        <div className="auth-visual-footer">
          <span>MindCare AI • Early Alzheimer's Detection Platform</span>
        </div>
      </div>

      {/* RIGHT SIDE: Clean White Registration Form */}
      <div className="auth-form-side">
        <div className="auth-form-wrapper">
          <div className="auth-brand-logo" onClick={() => onNavigate("landing")}>
            <div className="brand-logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="#3CAEA3" strokeWidth="2" />
                <path d="M12 7V17M7 12H17" stroke="#3CAEA3" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="auth-brand-name">MindCare <span className="brand-accent">AI</span></span>
          </div>

          <div className="auth-form-header">
            <h1>Create Your Account</h1>
            <p>Join MindCare AI and access intelligent brain health assessment.</p>
          </div>

          {errorMsg && (
            <div className="auth-alert-error">
              <span>⚠️</span> {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group-custom">
              <label htmlFor="reg-fullname">Full Name</label>
              <div className="input-with-icon">
                <span className="input-icon">👤</span>
                <input
                  id="reg-fullname"
                  type="text"
                  placeholder="e.g. Eleanor Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
            </div>

            <div className="form-group-custom">
              <label htmlFor="reg-email">Email Address</label>
              <div className="input-with-icon">
                <span className="input-icon">✉️</span>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
            </div>

            <div className="form-group-custom">
              <label htmlFor="reg-password">Password</label>
              <div className="input-with-icon">
                <span className="input-icon">🔒</span>
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-eye"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "👁️" : "🙈"}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="password-strength-container">
                  <div className="strength-bar-track">
                    <div
                      className="strength-bar-fill"
                      style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
                    ></div>
                  </div>
                  <span className="strength-label" style={{ color: strength.color }}>
                    Strength: {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group-custom">
              <label htmlFor="reg-confirm">Confirm Password</label>
              <div className="input-with-icon">
                <span className="input-icon">🔒</span>
                <input
                  id="reg-confirm"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
            </div>

            <div className="auth-checkbox-row">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                <span className="checkmark"></span>
                <span>
                  I agree to the <a href="#terms" onClick={(e) => { e.preventDefault(); alert("MindCare AI Terms of Use: Designed for clinical research and early cognitive screening evaluation."); }}>Terms & Privacy Policy</a>
                </span>
              </label>
            </div>

            <button type="submit" disabled={loading} className="btn-auth-primary">
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="auth-footer-prompt">
            Already have an account?{" "}
            <button className="link-switch-auth" onClick={() => onNavigate("login")}>
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
