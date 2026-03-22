import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import UploadAudio from "../components/UploadAudio";
import { registerVoice } from "../services/api";
import CyberBackground from "../components/CyberBackground";

const MicIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CheckIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const InfoIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <line x1="12" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="11" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const WarningIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 20h20L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <line x1="12" y1="10" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="17.5" r="1" fill="currentColor" />
  </svg>
);

export default function Register() {
  const [username, setUsername] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return setMessage({ type: "error", text: "Please enter a username." });
    if (!audioBlob) return setMessage({ type: "error", text: "Please record your voice first." });

    setLoading(true);
    setMessage(null);

    try {
      const result = await registerVoice(username.trim(), audioBlob);
      if (result.success) {
        setMessage({ type: "success", text: "Voice registered successfully! You can now login." });
        setUsername("");
        setAudioBlob(null);
      } else {
        setMessage({ type: "error", text: result.message || "Registration failed. Please try again." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Cannot connect to server. Make sure Flask is running on port 5000." });
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
            <div className="auth-icon" style={{ background: "linear-gradient(135deg,#06d6a0,#4361ee)", color: "#fff" }}>
              <MicIcon />
            </div>
            <h1>Voice Registration</h1>
            <p>Enroll your voice biometric for secure authentication</p>
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

            {/* Tip */}
            <div className="info-tip">
              <InfoIcon />
              <span>
                Speak clearly for <strong>5–7 seconds</strong> in a quiet environment for best accuracy.
              </span>
            </div>

            {/* Audio Recorder */}
            <UploadAudio onRecordingComplete={setAudioBlob} label="Enrollment Voice" />

            {/* Message */}
            {message && (
              <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`}>
                {message.type === "success" ? <CheckIcon size={16} /> : <WarningIcon />}
                {message.text}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary btn-full submit-btn"
              disabled={!audioBlob || !username || loading}
            >
              {loading ? <Spinner label="Registering..." /> : <><CheckIcon size={18} /> Register Voice</>}
            </button>
          </form>

          <hr className="divider" />
          <p className="auth-switch">
            Already registered?{" "}
            <span className="link" onClick={() => navigate("/login")}>Login here</span>
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