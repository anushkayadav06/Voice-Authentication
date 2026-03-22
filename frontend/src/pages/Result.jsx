import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M3 12L12 3l9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 10v11h14V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RetryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.36 2.64L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M3 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function ParticleBanner({ granted }) {
  const canvasRef = useRef(null);
  const color = granted ? "#06d6a0" : "#f72585";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4, dy: (Math.random() - 0.5) * 0.4,
      o: Math.random() * 0.5 + 0.1,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.floor(p.o * 255).toString(16).padStart(2, "0");
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [color]);

  return (
    <canvas ref={canvasRef} style={{
      position: "absolute", inset: 0, width: "100%", height: "100%",
      borderRadius: "inherit", pointerEvents: "none",
    }} />
  );
}

function ScoreRing({ score, granted }) {
  const [animated, setAnimated] = useState(0);
  const radius = 54, stroke = 7;
  const circ = 2 * Math.PI * radius;
  const color = granted ? "#06d6a0" : score > 40 ? "#ffd166" : "#f72585";

  useEffect(() => {
    let start = null;
    const duration = 1200;
    const target = Math.min(100, Math.max(0, score));
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setAnimated((1 - Math.pow(1 - p, 3)) * target);
      if (p < 1) requestAnimationFrame(step);
    };
    const t = setTimeout(() => requestAnimationFrame(step), 300);
    return () => clearTimeout(t);
  }, [score]);

  const offset = circ - (animated / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx="65" cy="65" r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: "none", filter: `drop-shadow(0 0 6px ${color}66)` }} />
        <text x="65" y="60" textAnchor="middle"
          style={{ fill: color, fontSize: 22, fontWeight: 700, fontFamily: "var(--font-display)" }}>
          {Math.round(animated)}
        </text>
        <text x="65" y="76" textAnchor="middle"
          style={{ fill: "#94a3b8", fontSize: 10, fontFamily: "var(--font-body)" }}>
          SCORE
        </text>
      </svg>
      <span style={{ fontSize: "0.72rem", color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Security Score
      </span>
    </div>
  );
}

function ConfidenceMeter({ label, value, colorStart, colorEnd, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(100, Math.max(0, value))), 500 + delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div className="meter-item">
      <div className="meter-header">
        <span className="meter-label">{label}</span>
        <span className="meter-value">{value?.toFixed(1)}%</span>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${colorStart}, ${colorEnd})`,
          boxShadow: `0 0 8px ${colorEnd}66`,
        }} />
      </div>
    </div>
  );
}

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const data = location.state?.data;

  if (!data) {
    return (
      <div className="auth-page">
        <div className="auth-container" style={{ textAlign: "center" }}>
          <p style={{ color: "#94a3b8", marginBottom: 20 }}>No authentication result found.</p>
          <button className="btn btn-primary" onClick={() => navigate("/login")}>Go to Login</button>
        </div>
      </div>
    );
  }

  const isGranted = data.access === "Granted";
  const isFake    = data.status?.toLowerCase().includes("fake");
  const securityScore = isGranted
    ? Math.round((data.similarity + data.real_prob) / 2)
    : Math.round((data.fake_prob + (100 - data.similarity)) / 2);

  const accentColor = isGranted ? "#06d6a0" : isFake ? "#f72585" : "#ffd166";
  const heroBg      = isGranted ? "rgba(6,214,160,0.05)" : isFake ? "rgba(247,37,133,0.05)" : "rgba(255,209,102,0.05)";
  const label       = isGranted ? "ACCESS GRANTED" : isFake ? "SPOOFING DETECTED" : "ACCESS DENIED";

  const stats = [
    { label: "Similarity", value: data.similarity, color: "var(--cyan)"  },
    { label: "Real Prob.", value: data.real_prob,  color: "var(--green)" },
    { label: "Fake Prob.", value: data.fake_prob,  color: "var(--pink)"  },
    ...(data.distance != null ? [{ label: "Distance", value: data.distance, color: "var(--yellow)", raw: true }] : []),
  ];

  const hasSpectrograms = data.reg_spec || data.login_spec;
  const hasLime   = !!data.lime_img;
  const hasReport = !!data.report;

  return (
    <div className="result-page">
      <div className="orb orb-blue" />
      <div className="orb orb-purple" />

      <div className="result-dashboard">

        {/* ── Action bar ── */}
        <div className="result-topbar-actions">
          <button className="btn btn-ghost" onClick={() => navigate("/")}><HomeIcon /> Home</button>
          <button className="btn btn-ghost" onClick={() => navigate("/login")}><RetryIcon /> Try Again</button>
          {hasReport && (
            <a href={data.report} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ textDecoration: "none", marginLeft: "auto" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v12M8 11l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Download Report
            </a>
          )}
        </div>

        {/* ── Hero Banner ── */}
        <div className="result-topbar" style={{ borderLeftColor: accentColor, background: heroBg, boxShadow: `0 8px 32px ${accentColor}14` }}>
          <ParticleBanner granted={isGranted} />
          <div className="result-topbar-left">
            <div className="result-status-badge" style={{ background: accentColor + "22", border: `1px solid ${accentColor}44` }}>
              <span className="result-status-dot" style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: accentColor, letterSpacing: "0.1em" }}>{label}</span>
            </div>
            <h2 className="result-status-title" style={{ color: accentColor }}>{data.status}</h2>
            {data.reason && <p className="result-status-reason">{data.reason}</p>}
          </div>
          <div className="result-topbar-right">
            <ScoreRing score={securityScore} granted={isGranted} />
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            ROW 1 — [2×2 stat grid] + [Confidence Meters]
        ══════════════════════════════════════════════ */}
        <div className="result-row1">

          {/* 2×2 stat grid */}
          <div className="stats-grid-2x2">
            {stats.map((s) => (
              <div className="stat-card" key={s.label}>
                <div className="stat-value" style={{ color: s.color }}>
                  {s.raw ? s.value : `${s.value?.toFixed(1)}%`}
                </div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Confidence Meters */}
          <div className="result-section result-col-meters">
            <h3 className="section-title">Confidence Meters</h3>
            <div className="meters-body">
              <ConfidenceMeter label="Speaker Similarity" value={data.similarity} colorStart="#4361ee" colorEnd="#7b2ff7" delay={0} />
              <ConfidenceMeter label="Real Voice"         value={data.real_prob}  colorStart="#06d6a0" colorEnd="#059669" delay={120} />
              <ConfidenceMeter label="Deepfake Risk"      value={data.fake_prob}  colorStart="#f72585" colorEnd="#7b2ff7" delay={240} />
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════════
            ROW 2 — Spectrograms full width
        ══════════════════════════════════════════════ */}
        {hasSpectrograms && (
          <div className="result-section result-row-spec">
            <h3 className="section-title">Voice Spectrograms</h3>
            <div className="spec-row">
              {data.reg_spec && (
                <div className="spec-item">
                  <p className="spec-label">Registered Voice</p>
                  <img src={data.reg_spec} alt="Registered spectrogram" className="spec-img" />
                </div>
              )}
              {data.login_spec && (
                <div className="spec-item">
                  <p className="spec-label">Login Voice</p>
                  <img src={data.login_spec} alt="Login spectrogram" className="spec-img" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            ROW 3 — LIME full width
        ══════════════════════════════════════════════ */}
        {hasLime && (
          <div className="result-section result-row-lime" style={{ borderColor: "rgba(123,47,247,0.2)" }}>
            <h3 className="section-title" style={{ color: "var(--purple)" }}>Deepfake Explanation (LIME)</h3>
            <p className="lime-desc">
              LIME highlights the most influential audio segments that affected the model's deepfake prediction.
            </p>
            <div className="lime-img-wrap">
              <img src={data.lime_img} alt="LIME explanation" className="lime-img" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
