import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import UploadAudio from "../components/UploadAudio";
import { authenticateVoice } from "../services/api";
import CyberBackground from "../components/CyberBackground";

const LockIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

const WarningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 20h20L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <line x1="12" y1="10" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="17.5" r="1" fill="currentColor" />
  </svg>
);

export default function Login() {
  const [username, setUsername] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return setError("Please enter your username.");
    if (!audioBlob) return setError("Please record your voice first.");

    setLoading(true);
    setError(null);

    try {
      const result = await authenticateVoice(username.trim(), audioBlob);
      navigate("/result", { state: { data: result } });
    } catch (err) {
      setError(err.message || "Cannot connect to server. Make sure Flask is running on port 5000.");
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <CyberBackground />

      <div className="orb orb-blue" />
      <div className="orb orb-purple" />

      <div className="auth-container">

        <div className="auth-card fade-in">
          {/* Header */}
          <div className="auth-header">
            <div className="auth-icon" style={{ background: "linear-gradient(135deg,#4361ee,#7b2ff7)", color: "#fff" }}>
              <LockIcon />
            </div>
            <h1>Voice Authentication</h1>
            <p>Speak to verify your identity</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div className="input-group">
              <label className="input-label">Username</label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            {/* Audio Recorder */}
            <UploadAudio onRecordingComplete={setAudioBlob} label="Login Voice" />

            {/* Error */}
            {error && (
              <div className="alert alert-error">
                <WarningIcon /> {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary btn-full submit-btn"
              disabled={!audioBlob || !username || loading}
            >
              {loading ? <Spinner label="Authenticating..." /> : <><LockIcon /> Authenticate</>}
            </button>
          </form>

          <hr className="divider" />
          <p className="auth-switch">
            New user?{" "}
            <span className="link" onClick={() => navigate("/register")}>Register here</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner({ label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
      <span className="spinner" /> {label}
    </span>
  );
}