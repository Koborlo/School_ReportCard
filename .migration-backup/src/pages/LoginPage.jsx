// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { SCHOOL_NAME } from "../utils/constants";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Password reset state
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const profile = await login(email.trim(), password);
      navigate(profile.role === "admin" ? "/admin" : "/teacher");
    } catch (err) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setResetLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      setResetSent(true);
      toast.success("Password reset email sent!");
    } catch (err) {
      toast.error(err.message || "Failed to send reset email.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--pg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: 56, height: 56, background: "var(--dg)", borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px", fontSize: 20, fontWeight: 700,
            color: "var(--gd)", fontFamily: "'DM Mono', monospace",
          }}>SM</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--dg)" }}>SchoolMark GH</div>
          <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4, lineHeight: 1.5 }}>
            {SCHOOL_NAME}
          </div>
          <div style={{ fontSize: 11, color: "var(--mut)" }}>
            Terminal Report Management Portal
          </div>
        </div>

        {/* Card */}
        <div className="card">
          <div className="card-body" style={{ padding: "24px" }}>
            {showReset ? (
              /* ── Password Reset Form ── */
              <>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--dg)", marginBottom: 18 }}>
                  Reset your password
                </h2>

                {resetSent ? (
                  <div className="alert alert-success" style={{ marginBottom: 14 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Check your inbox for a reset link.
                  </div>
                ) : (
                  <form onSubmit={handleReset}>
                    <div className="form-group">
                      <label className="form-label">Email address</label>
                      <input
                        className="form-input"
                        type="email" required autoComplete="email"
                        placeholder="yourname@school.edu.gh"
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn btn-primary btn-lg"
                      type="submit" disabled={resetLoading}
                      style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
                    >
                      {resetLoading ? "Sending…" : "Send reset link"}
                    </button>
                  </form>
                )}

                <div style={{ textAlign: "center", marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn btn-link"
                    style={{ fontSize: 11, color: "var(--mg)", background: "none", border: "none", cursor: "pointer" }}
                    onClick={() => { setShowReset(false); setResetSent(false); setResetEmail(""); }}
                  >
                    ← Back to sign in
                  </button>
                </div>
              </>
            ) : (
              /* ── Login Form ── */
              <>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--dg)", marginBottom: 18 }}>
                  Sign in to your account
                </h2>

                {error && (
                  <div className="alert alert-danger" style={{ marginBottom: 14 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label className="form-label">Email address</label>
                    <input
                      className="form-input"
                      type="email" required autoComplete="email"
                      placeholder="yourname@school.edu.gh"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="form-input"
                        type={showPassword ? "text" : "password"}
                        required autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ paddingRight: 40 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        style={{
                          position: "absolute", right: 10, top: "50%",
                          transform: "translateY(-50%)", background: "none",
                          border: "none", cursor: "pointer", fontSize: 14,
                          color: "var(--mut)", padding: 4,
                        }}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-lg"
                    type="submit" disabled={loading}
                    style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
                  >
                    {loading ? "Signing in…" : "Sign in"}
                  </button>
                </form>

                <div style={{ textAlign: "center", marginTop: 14 }}>
                  <button
                    type="button"
                    style={{ fontSize: 11, color: "var(--mg)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => { setShowReset(true); setError(""); }}
                  >
                    Forgot your password?
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 10, color: "var(--mut)" }}>
          SchoolMark GH v1.0 · Ghana Education Service
        </p>
      </div>
    </div>
  );
}
