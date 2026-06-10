// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { SCHOOL_NAME } from "../utils/constants";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const profile = await login(email.trim(), password);
      navigate(profile.role === "admin" ? "/admin" : "/teacher");
    } catch (err) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
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

            <form onSubmit={handleSubmit}>
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
                <input
                  className="form-input"
                  type="password" required autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
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
              <a
                href="#reset"
                style={{ fontSize: 11, color: "var(--mg)", textDecoration: "none" }}
                onClick={e => { e.preventDefault(); alert("Contact your administrator to reset your password."); }}
              >
                Forgot your password?
              </a>
            </div>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 10, color: "var(--mut)" }}>
          SchoolMark GH v1.0 · Ghana Education Service
        </p>
      </div>
    </div>
  );
}
