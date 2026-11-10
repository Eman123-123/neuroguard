import { useState } from "react";
import { loginUser } from "../services/api";
import InteractiveBrain from "./InteractiveBrain";

export default function LoginPage({ onNavigate, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email || !password) {
      setErrorMsg("Please enter both email address and password.");
      return;
    }

    setLoading(true);
    const result = await loginUser(email, password);
    setLoading(false);

    if (result.success) {
      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
      onNavigate("dashboard");
    } else {
      setErrorMsg(result.error || "Failed to sign in. Please verify your credentials.");
    }
  };

  const handleDemoLogin = async () => {
    setEmail("demo@mindcare.ai");
    setPassword("ClinicianDemo2026!");
    setLoading(true);
    const result = await loginUser("demo@mindcare.ai", "ClinicianDemo2026!");
    setLoading(false);
    if (result.success) {
      if (onLoginSuccess) onLoginSuccess(result.user);
      onNavigate("dashboard");
    } else {
      setErrorMsg("Demo account not found. Create it with: python backend/seed_demo_user.py  (" + result.error + ")");
    }
  };

  return (
    <div className="auth-split-layout">
      {/* LEFT SIDE: Dark Navy + 3D Realistic Brain Neural Atmosphere */}
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
            <span className="auth-eyebrow">INTELLIGENT MEDICAL ASSESSMENT</span>
            <h2>Your Journey to Better Brain Health Starts Here.</h2>
            <p>
              Access your personalized assessment platform and explore intelligent insights driven by cognitive telemetry and neuroimaging machine learning.
            </p>
          </div>
        </div>

        <div className="auth-visual-footer">
          <span>MindCare AI • Early Alzheimer's Detection Platform</span>
        </div>
      </div>

      {/* RIGHT SIDE: Clean White Medical Form */}
      <div className="auth-form-side">
        <div className="auth-form-wrapper">
          {/* Brand Logo */}
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
            <h1>Welcome Back</h1>
            <p>Sign in to continue to your personal dashboard.</p>
          </div>

          {errorMsg && (
            <div className="auth-alert-error">
              <span>⚠️</span> {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group-custom">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-with-icon">
                <span className="input-icon">✉️</span>
                <input
                  id="login-email"
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
              <div className="label-with-action">
                <label htmlFor="login-password">Password</label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Password reset is not implemented yet."); }} className="link-forgot">
                  Forgot Password?
                </a>
              </div>
              <div className="input-with-icon">
                <span className="input-icon">🔒</span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
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
            </div>

            <div className="auth-checkbox-row">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkmark"></span>
                Remember Me
              </label>
            </div>

            <button type="submit" disabled={loading} className="btn-auth-primary">
              {loading ? "Authenticating..." : "Sign In"}
            </button>

            {/* Quick Demo Login Option */}
            <div className="auth-demo-divider">
              <span>OR PRESENTATION DEMO</span>
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              className="btn-demo-access"
            >
              ⚡ 1-Click Clinician Demo Login
            </button>
          </form>

          <div className="auth-footer-prompt">
            Don't have an account?{" "}
            <button className="link-switch-auth" onClick={() => onNavigate("signup")}>
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
