import { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import DashboardLayout from "./components/DashboardLayout";
import { getStoredUser, logoutUser } from "./services/api";
import "./App.css";

export default function App() {
  const [currentPage, setCurrentPage] = useState("landing");
  const [user, setUser] = useState(() => getStoredUser());

  // Cross-modal telemetry states
  const [cardTelemetry, setCardTelemetry] = useState(null);
  const [stroopTelemetry, setStroopTelemetry] = useState(null);
  const [ad8Score, setAd8Score] = useState(null);
  const [mriResult, setMriResult] = useState(null);

  const handleLoginSuccess = (authUser) => {
    setUser(authUser);
    setCurrentPage("dashboard");
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setCurrentPage("landing");
  };

  return (
    <div className="mindcare-app-root">
      {/* 1. Landing Page */}
      {currentPage === "landing" && (
        <LandingPage
          user={user}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {/* 2. Split-Screen Sign In / Login Page */}
      {currentPage === "login" && (
        <LoginPage
          onNavigate={(page) => setCurrentPage(page)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* 3. Split-Screen Sign Up / Registration Page */}
      {currentPage === "signup" && (
        <SignupPage
          onNavigate={(page) => setCurrentPage(page)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* 4. Healthcare SaaS Dashboard */}
      {currentPage === "dashboard" && (
        <DashboardLayout
          user={user}
          onLogout={handleLogout}
          onNavigateLanding={() => setCurrentPage("landing")}
          cardTelemetry={cardTelemetry}
          setCardTelemetry={setCardTelemetry}
          stroopTelemetry={stroopTelemetry}
          setStroopTelemetry={setStroopTelemetry}
          ad8Score={ad8Score}
          setAd8Score={setAd8Score}
          mriResult={mriResult}
          setMriResult={setMriResult}
        />
      )}
    </div>
  );
}
