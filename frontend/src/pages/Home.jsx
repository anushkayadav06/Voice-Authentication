import React from "react";
import { useNavigate } from "react-router-dom";
import CyberBackground from "../components/CyberBackground";



const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
  </svg>
);

const DnaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8 2 5 5 5 8s3 4 7 4-7 1-7 4 3 6 7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 2c4 0 7 3 7 6s-3 4-7 4 7 1 7 4-3 6-7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="6" y1="6" x2="18" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="6" y1="18" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L4 6v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V6l-8-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="12" width="4" height="9" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="10" y="7" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="17" y="3" width="4" height="18" rx="1" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="8" y1="17" x2="12" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const features = [
  { icon: <DnaIcon />,    label: "ECAPA-TDNN", desc: "State-of-the-art speaker verification model" },
  { icon: <ShieldIcon />, label: "AASIST",     desc: "Anti-spoofing deepfake audio detection" },
  { icon: <ChartIcon />,  label: "GradCAM",    desc: "Explainable AI for model decisions" },
  { icon: <FileIcon />,   label: "PDF Reports",desc: "Downloadable authentication reports" },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <CyberBackground />
      <div className="orb orb-blue" />
      <div className="orb orb-purple" />
      <div className="orb orb-cyan" />

      <div className="home-inner">

        {/* Hero */}
        <section className="hero">
          <div className="hero-badge fade-in">
            <span className="live-dot" /> AI-Powered Biometric Security
          </div>

          <h1 className="hero-title fade-in-delay-1">
            Secure Voice{" "}
            <span className="gradient-text">Authentication</span>
          </h1>

          <p className="hero-subtitle fade-in-delay-2">
            Biometric voice verification powered by deep learning — with real-time
            deepfake audio detection to prevent spoofing attacks.
          </p>

          <div className="hero-actions fade-in-delay-3">
            <button className="btn btn-primary btn-lg" onClick={() => navigate("/register")}>
              <MicIcon /> Register Voice
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => navigate("/login")}>
              <LockIcon /> Login
            </button>
          </div>
        </section>

        {/* Cards */}
        <section className="home-cards fade-in-delay-3">
          <div className="home-card" onClick={() => navigate("/register")}>
            <div className="home-card-icon" style={{ background: "linear-gradient(135deg,#06d6a0,#4361ee)", color: "#fff" }}>
              <MicIcon />
            </div>
            <h3>Register Voice</h3>
            <p>Enroll your voice biometric for secure identity verification using ECAPA-TDNN.</p>
            <div className="home-card-footer">
              <span className="badge badge-green">New User</span>
              <span className="card-arrow">→</span>
            </div>
          </div>

          <div className="home-card" onClick={() => navigate("/login")}>
            <div className="home-card-icon" style={{ background: "linear-gradient(135deg,#4361ee,#7b2ff7)", color: "#fff" }}>
              <LockIcon />
            </div>
            <h3>Authenticate</h3>
            <p>Login using your voice with real-time deepfake detection and speaker verification.</p>
            <div className="home-card-footer">
              <span className="badge badge-blue">Existing User</span>
              <span className="card-arrow">→</span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="features fade-in-delay-4">
          {features.map((f) => (
            <div key={f.label} className="feature-chip">
              <span className="feature-icon">{f.icon}</span>
              <div>
                <div className="feature-name">{f.label}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </section>

      </div>
    </div>
  );
}