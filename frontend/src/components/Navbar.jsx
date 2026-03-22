import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <div className="navbar-logo" onClick={() => navigate("/")}>
          <div className="logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="11" width="18" height="11" rx="2"
                stroke="#00d4ff" strokeWidth="2" fill="none"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"
                stroke="#00d4ff" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1.5" fill="#00d4ff"/>
            </svg>
          </div>
          <span className="logo-text">VoiceAuth<span className="logo-accent">AI</span></span>
        </div>

        {/* Links */}
        <div className="navbar-links">
          <button className={`nav-link ${isActive("/") ? "active" : ""}`} onClick={() => navigate("/")}>
            Home
          </button>
          <button className={`nav-link ${isActive("/register") ? "active" : ""}`} onClick={() => navigate("/register")}>
            Register
          </button>
          <button className={`nav-link ${isActive("/login") ? "active" : ""}`} onClick={() => navigate("/login")}>
            Login
          </button>
        </div>

        {/* CTA */}
        <button className="btn btn-primary navbar-cta" onClick={() => navigate("/login")}>
          Authenticate →
        </button>
      </div>
    </nav>
  );
}