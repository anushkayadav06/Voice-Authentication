// src/components/CyberBackground.jsx
import React, { useEffect, useRef } from "react";

export default function CyberBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animFrame;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Matrix rain columns ──────────────────────────
    const fontSize  = 13;
    const chars     = "01アイウエオカキクケコサシスセソABCDEF∑∆∇λΨΩ#@!%^&*<>{}[]";
    const getColumns = () => Math.floor(canvas.width / fontSize);
    let drops = Array(getColumns()).fill(1);

    // ── Floating nodes ───────────────────────────────
    const NODE_COUNT = 38;
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x:   Math.random() * window.innerWidth,
      y:   Math.random() * window.innerHeight,
      r:   Math.random() * 2 + 1.5,
      dx:  (Math.random() - 0.5) * 0.4,
      dy:  (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.5 + 0.2,
    }));

    // ── Scan line ────────────────────────────────────
    let scanY = 0;

    const draw = () => {
      // Fade trail
      ctx.fillStyle = "rgba(18, 21, 46, 0.07)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Matrix rain
      ctx.font      = `${fontSize}px monospace`;
      drops = drops.length === getColumns() ? drops : Array(getColumns()).fill(1);

      drops.forEach((y, i) => {
        const char  = chars[Math.floor(Math.random() * chars.length)];
        const x     = i * fontSize;
        const alpha = Math.random() * 0.15 + 0.03;

        // head char — brighter
        ctx.fillStyle = `rgba(0, 212, 255, ${alpha + 0.15})`;
        ctx.fillText(char, x, y * fontSize);

        // trail chars — dimmer green/blue
        ctx.fillStyle = `rgba(67, 97, 238, ${alpha})`;
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, (y - 1) * fontSize);

        if (y * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      });

      // Node connections
      nodes.forEach((a, i) => {
        nodes.forEach((b, j) => {
          if (j <= i) return;
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.12;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(67, 97, 238, ${alpha})`;
            ctx.lineWidth   = 0.5;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        });

        // Draw node dot
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${a.opacity})`;
        ctx.fill();

        // Move
        a.x += a.dx;
        a.y += a.dy;
        if (a.x < 0 || a.x > canvas.width)  a.dx *= -1;
        if (a.y < 0 || a.y > canvas.height)  a.dy *= -1;
      });

      // Scan line
      const grad = ctx.createLinearGradient(0, scanY - 6, 0, scanY + 6);
      grad.addColorStop(0,   "rgba(0, 212, 255, 0)");
      grad.addColorStop(0.5, "rgba(0, 212, 255, 0.04)");
      grad.addColorStop(1,   "rgba(0, 212, 255, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 6, canvas.width, 12);
      scanY = (scanY + 0.8) % canvas.height;

      animFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        opacity: 0.55,
      }}
    />
  );
}