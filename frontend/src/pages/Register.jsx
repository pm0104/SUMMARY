import { useState } from "react";
import "./Auth.css";

function Register({ onLogin, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const register = async () => {
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      onLogin(data.token);
    } catch (err) {
      console.error(err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Floating particles */}
      <div className="auth-particles">
        <div className="auth-particle" />
        <div className="auth-particle" />
        <div className="auth-particle" />
        <div className="auth-particle" />
        <div className="auth-particle" />
        <div className="auth-particle" />
        <div className="auth-particle" />
        <div className="auth-particle" />
      </div>

      {/* Brand panel */}
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="auth-brand-icon">✦</div>
          <span className="auth-brand-name">SUMMARY</span>
        </div>
        <p className="auth-brand-tagline">Your AI-powered conversation hub</p>
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <h1 className="auth-card-title">Create account</h1>
          <p className="auth-card-subtitle">Get started with SUMMARY</p>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-input-group">
            <input
              id="register-name"
              type="text"
              placeholder=" "
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && register()}
            />
            <label htmlFor="register-name">Name</label>
          </div>

          <div className="auth-input-group">
            <input
              id="register-email"
              type="email"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && register()}
            />
            <label htmlFor="register-email">Email</label>
          </div>

          <div className="auth-input-group">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && register()}
            />
            <label htmlFor="register-password">Password</label>
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? "◉" : "◎"}
            </button>
          </div>

          <button
            className="auth-submit-btn"
            onClick={register}
            disabled={loading}
          >
            {loading && <span className="auth-spinner" />}
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <div className="auth-divider">or</div>

          <p className="auth-switch">
            Already have an account?{" "}
            <button
              type="button"
              className="auth-switch-btn"
              onClick={onSwitchToLogin}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
