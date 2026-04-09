"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/lib/client";

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/dashboard");
    };
    checkSession();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Nodes — neural network style
    const NODE_COUNT = 55;
    type Node = {
      x: number; y: number;
      vx: number; vy: number;
      r: number;
      pulse: number;
      pulseSpeed: number;
      active: boolean;
      activeCooldown: number;
    };

    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 2 + 1,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.015 + Math.random() * 0.02,
      active: false,
      activeCooldown: 0,
    }));

    // Signal pulses traveling along edges
    type Signal = { fromIdx: number; toIdx: number; progress: number; speed: number; alpha: number };
    const signals: Signal[] = [];

    let frame = 0;
    let raf: number;

    const CONNECT_DIST = 130;

    const fireSignal = () => {
      if (signals.length > 18) return;
      const from = Math.floor(Math.random() * nodes.length);
      const candidates: number[] = [];
      for (let i = 0; i < nodes.length; i++) {
        if (i === from) continue;
        const dx = nodes[from]!.x - nodes[i]!.x;
        const dy = nodes[from]!.y - nodes[i]!.y;
        if (Math.sqrt(dx * dx + dy * dy) < CONNECT_DIST) candidates.push(i);
      }
      if (candidates.length === 0) return;
      const to = candidates[Math.floor(Math.random() * candidates.length)]!;
      signals.push({ fromIdx: from, toIdx: to, progress: 0, speed: 0.012 + Math.random() * 0.016, alpha: 1 });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      if (frame % 28 === 0) fireSignal();

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += n.pulseSpeed;
        if (n.x < 0) n.x = canvas.width;
        if (n.x > canvas.width) n.x = 0;
        if (n.y < 0) n.y = canvas.height;
        if (n.y > canvas.height) n.y = 0;
        if (n.activeCooldown > 0) n.activeCooldown--;
        else n.active = false;
      }

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i]!.x - nodes[j]!.x;
          const dy = nodes[i]!.y - nodes[j]!.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const a = (1 - dist / CONNECT_DIST) * 0.07;
            ctx.beginPath();
            ctx.moveTo(nodes[i]!.x, nodes[i]!.y);
            ctx.lineTo(nodes[j]!.x, nodes[j]!.y);
            ctx.strokeStyle = `rgba(56,132,255,${a})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw signals (traveling dots on edges)
      for (let s = signals.length - 1; s >= 0; s--) {
        const sig = signals[s];
        sig.progress += sig.speed;
        if (sig.progress >= 1) {
          nodes[sig.toIdx].active = true;
          nodes[sig.toIdx].activeCooldown = 18;
          signals.splice(s, 1);
          continue;
        }
        const from = nodes[sig.fromIdx];
        const to = nodes[sig.toIdx];
        const x = from.x + (to.x - from.x) * sig.progress;
        const y = from.y + (to.y - from.y) * sig.progress;
        const fade = sig.progress < 0.1 ? sig.progress / 0.1 : sig.progress > 0.85 ? (1 - sig.progress) / 0.15 : 1;

        // Signal trail
        ctx.beginPath();
        const grad = ctx.createLinearGradient(from.x, from.y, x, y);
        grad.addColorStop(0, "rgba(56,132,255,0)");
        grad.addColorStop(1, `rgba(56,132,255,${0.35 * fade})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.moveTo(from.x + (x - from.x) * Math.max(0, sig.progress - 0.18), from.y + (y - from.y) * Math.max(0, sig.progress - 0.18));
        ctx.lineTo(x, y);
        ctx.stroke();

        // Signal head
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120,180,255,${0.9 * fade})`;
        ctx.fill();
      }

      // Draw nodes
      for (const n of nodes) {
        const pulse = 0.5 + 0.5 * Math.sin(n.pulse);
        const baseAlpha = n.active ? 0.9 : 0.2 + 0.15 * pulse;
        const color = n.active ? `rgba(120,200,255,${baseAlpha})` : `rgba(56,132,255,${baseAlpha})`;

        // Outer ring (active nodes)
        if (n.active) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 3.5, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(56,132,255,0.2)";
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (n.active ? 1.6 : 1), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      // Horizontal scan line that sweeps down slowly
      const scanY = ((frame * 0.4) % (canvas.height + 60)) - 30;
      const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      scanGrad.addColorStop(0, "rgba(56,132,255,0)");
      scanGrad.addColorStop(0.5, "rgba(56,132,255,0.035)");
      scanGrad.addColorStop(1, "rgba(56,132,255,0)");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 30, canvas.width, 60);

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg("Correo o contraseña incorrectos");
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=Syne:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .zf-root {
          min-height: 100svh;
          background: #060810;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Space Grotesk', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .zf-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        /* Atmospheric glows */
        .zf-atm {
          position: absolute;
          pointer-events: none;
          z-index: 0;
          border-radius: 50%;
        }
        .zf-atm-1 {
          width: 700px; height: 500px;
          top: -200px; left: 50%;
          transform: translateX(-50%);
          background: radial-gradient(ellipse, rgba(29,90,255,0.09) 0%, transparent 65%);
        }
        .zf-atm-2 {
          width: 500px; height: 400px;
          bottom: -150px; right: -100px;
          background: radial-gradient(ellipse, rgba(99,60,255,0.07) 0%, transparent 65%);
        }
        .zf-atm-3 {
          width: 300px; height: 300px;
          bottom: 10%; left: 5%;
          background: radial-gradient(ellipse, rgba(0,200,180,0.04) 0%, transparent 65%);
        }

        /* Card */
        .zf-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 410px;
          margin: 1.5rem;
          background: rgba(6, 9, 20, 0.88);
          border: 1px solid rgba(56,132,255,0.18);
          border-radius: 20px;
          padding: 2.25rem 2rem 2rem;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          animation: cardIn 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(28px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Gradient border via pseudo */
        .zf-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          padding: 1px;
          background: linear-gradient(140deg, rgba(56,132,255,0.45) 0%, rgba(99,60,255,0.2) 40%, transparent 70%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        /* Corner brackets */
        .zf-corner { position: absolute; width: 14px; height: 14px; }
        .zf-corner-tl { top: -1px; left: -1px; border-top: 2px solid #3884ff; border-left: 2px solid #3884ff; border-radius: 4px 0 0 0; }
        .zf-corner-tr { top: -1px; right: -1px; border-top: 2px solid #3884ff; border-right: 2px solid #3884ff; border-radius: 0 4px 0 0; }
        .zf-corner-bl { bottom: -1px; left: -1px; border-bottom: 2px solid #3884ff; border-left: 2px solid #3884ff; border-radius: 0 0 0 4px; }
        .zf-corner-br { bottom: -1px; right: -1px; border-bottom: 2px solid #3884ff; border-right: 2px solid #3884ff; border-radius: 0 0 4px 0; }

        /* ── LOGO ── */
        .zf-logo-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1.75rem;
          animation: fadeUp 0.55s ease forwards 0.15s;
          opacity: 0;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .zf-logo-mark {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          margin-bottom: 0.85rem;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, #0e1e52, #080e2e);
          border: 1px solid rgba(56,132,255,0.35);
          overflow: hidden;
        }

        /* Inner grid lines inside logo */
        .zf-logo-mark::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(56,132,255,0.07) 10px, rgba(56,132,255,0.07) 11px),
            repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(56,132,255,0.07) 10px, rgba(56,132,255,0.07) 11px);
        }

        /* Shimmer sweep */
        .zf-logo-mark::after {
          content: '';
          position: absolute;
          top: 0; left: -120%;
          width: 70%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(100,170,255,0.18), transparent);
          animation: logoShimmer 2.8s ease-in-out infinite;
        }

        @keyframes logoShimmer {
          0%   { left: -120%; }
          60%  { left: 180%; }
          100% { left: 180%; }
        }

        /* Outer glow ring */
        .zf-logo-ring {
          position: absolute;
          inset: -4px;
          border-radius: 20px;
          border: 1px solid rgba(56,132,255,0.15);
          animation: ringPulse 3s ease-in-out infinite;
        }

        @keyframes ringPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.04); }
        }

        .zf-logo-ring-2 {
          position: absolute;
          inset: -9px;
          border-radius: 24px;
          border: 1px solid rgba(56,132,255,0.07);
          animation: ringPulse 3s ease-in-out infinite 0.5s;
        }

        .zf-z-svg {
          position: relative;
          z-index: 1;
          width: 36px;
          height: 36px;
        }

        .zf-brand {
          font-family: 'Syne', sans-serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: #e8eeff;
          letter-spacing: 0.06em;
          margin-bottom: 0.3rem;
        }

        .zf-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(56,132,255,0.07);
          border: 1px solid rgba(56,132,255,0.18);
          border-radius: 20px;
          padding: 0.18rem 0.65rem;
          font-size: 0.62rem;
          font-weight: 500;
          color: #6aabff;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .zf-badge-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #3884ff;
          animation: blink 2s ease infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }

        /* Heading */
        .zf-heading {
          font-family: 'Syne', sans-serif;
          font-size: 1.35rem;
          font-weight: 600;
          color: #e8eeff;
          margin-bottom: 0.25rem;
          animation: fadeUp 0.55s ease forwards 0.25s;
          opacity: 0;
        }

        .zf-sub {
          font-size: 0.78rem;
          color: rgba(232,238,255,0.3);
          font-weight: 300;
          margin-bottom: 1.6rem;
          animation: fadeUp 0.55s ease forwards 0.3s;
          opacity: 0;
        }

        /* Fields */
        .zf-field { margin-bottom: 0.95rem; }
        .zf-field-1 { animation: fadeUp 0.55s ease forwards 0.35s; opacity: 0; }
        .zf-field-2 { animation: fadeUp 0.55s ease forwards 0.4s;  opacity: 0; }

        .zf-label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(232,238,255,0.3);
          margin-bottom: 0.4rem;
        }
        .zf-label-line { flex: 1; height: 1px; background: rgba(56,132,255,0.1); }

        .zf-input-wrap { position: relative; }

        .zf-input {
          width: 100%;
          padding: 0.78rem 1rem 0.78rem 2.6rem;
          background: rgba(56,132,255,0.04);
          border: 1px solid rgba(56,132,255,0.14);
          border-radius: 10px;
          color: #e8eeff;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.875rem;
          font-weight: 400;
          outline: none;
          transition: all 0.22s;
          -webkit-appearance: none;
        }
        .zf-input::placeholder { color: rgba(232,238,255,0.18); }
        .zf-input:focus {
          border-color: rgba(56,132,255,0.45);
          background: rgba(56,132,255,0.07);
          box-shadow: 0 0 0 3px rgba(56,132,255,0.07);
        }
        .zf-input.has-right { padding-right: 2.6rem; }

        .zf-input-icon {
          position: absolute;
          left: 0.8rem;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(56,132,255,0.38);
          display: flex;
          pointer-events: none;
          transition: color 0.22s;
        }
        .zf-input-wrap:focus-within .zf-input-icon { color: rgba(56,132,255,0.75); }

        .zf-input-btn {
          position: absolute;
          right: 0.7rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(232,238,255,0.22);
          display: flex;
          padding: 0.25rem;
          transition: color 0.2s;
        }
        .zf-input-btn:hover { color: rgba(232,238,255,0.55); }

        /* Error */
        .zf-error {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background: rgba(220,60,60,0.07);
          border: 1px solid rgba(220,60,60,0.2);
          border-radius: 8px;
          padding: 0.6rem 0.85rem;
          margin-bottom: 0.9rem;
          color: #e87171;
          font-size: 0.77rem;
          animation: fadeUp 0.25s ease;
        }

        /* Button */
        .zf-btn {
          width: 100%;
          padding: 0.88rem 1rem;
          background: linear-gradient(130deg, #1a4fff 0%, #3884ff 60%, #5aaaff 100%);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.22s;
          position: relative;
          overflow: hidden;
          margin-top: 0.4rem;
          animation: fadeUp 0.55s ease forwards 0.45s;
          opacity: 0;
        }
        .zf-btn::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 55%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
          transition: left 0.45s ease;
        }
        .zf-btn:hover::after { left: 160%; }
        .zf-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(56,132,255,0.3); }
        .zf-btn:active { transform: scale(0.99); box-shadow: none; }
        .zf-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

        .zf-btn-inner { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }

        .zf-spinner {
          width: 13px; height: 13px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Status + footer */
        .zf-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          margin-top: 1.4rem;
          font-size: 0.62rem;
          color: rgba(56,132,255,0.45);
          letter-spacing: 0.1em;
          font-weight: 500;
          animation: fadeUp 0.55s ease forwards 0.5s;
          opacity: 0;
        }
        .zf-status-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #3884ff;
          opacity: 0.5;
          animation: blink 2.5s ease infinite;
        }

        .zf-footer {
          margin-top: 1rem;
          text-align: center;
          font-size: 0.62rem;
          color: rgba(232,238,255,0.15);
          letter-spacing: 0.06em;
          animation: fadeUp 0.55s ease forwards 0.55s;
          opacity: 0;
        }
      `}</style>

      <div className="zf-root">
        <canvas ref={canvasRef} className="zf-canvas" />
        <div className="zf-atm zf-atm-1" />
        <div className="zf-atm zf-atm-2" />
        <div className="zf-atm zf-atm-3" />

        <div className="zf-card">
          <div className="zf-corner zf-corner-tl" />
          <div className="zf-corner zf-corner-tr" />
          <div className="zf-corner zf-corner-bl" />
          <div className="zf-corner zf-corner-br" />

          {/* Logo */}
          <div className="zf-logo-wrap">
            <div style={{ position: "relative", marginBottom: "0.85rem" }}>
              <div className="zf-logo-ring" />
              <div className="zf-logo-ring-2" />
              <div className="zf-logo-mark">
                {/* Z as SVG path for crisp rendering */}
                <svg className="zf-z-svg" viewBox="0 0 36 36" fill="none">
                  <defs>
                    <linearGradient id="zGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#78c4ff" />
                      <stop offset="50%" stopColor="#3884ff" />
                      <stop offset="100%" stopColor="#1d5aff" />
                    </linearGradient>
                    <filter id="zGlow">
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  {/* Z shape */}
                  <path
                    d="M8 9h20l-20 18h20"
                    stroke="url(#zGrad)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#zGlow)"
                  />
                  {/* Top bar accent dots */}
                  <circle cx="8" cy="9" r="2" fill="#78c4ff" opacity="0.9" />
                  <circle cx="28" cy="9" r="2" fill="#3884ff" opacity="0.7" />
                  <circle cx="8" cy="27" r="2" fill="#3884ff" opacity="0.7" />
                  <circle cx="28" cy="27" r="2" fill="#78c4ff" opacity="0.9" />
                </svg>
              </div>
            </div>
            <div className="zf-brand">Zentiflow</div>
            <div className="zf-badge">
              <div className="zf-badge-dot" />
              Portal de gestión · IA
            </div>
          </div>

          <div className="zf-heading">Acceso al sistema</div>
          <div className="zf-sub">Plataforma de automatización inteligente</div>

          <form onSubmit={login}>
            <div className={`zf-field zf-field-1`}>
              <div className="zf-label">
                <span>Correo</span>
                <div className="zf-label-line" />
              </div>
              <div className="zf-input-wrap">
                <input
                  type="email"
                  className="zf-input"
                  placeholder="usuario@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <span className="zf-input-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
              </div>
            </div>

            <div className={`zf-field zf-field-2`}>
              <div className="zf-label">
                <span>Contraseña</span>
                <div className="zf-label-line" />
              </div>
              <div className="zf-input-wrap">
                <input
                  type={showPass ? "text" : "password"}
                  className="zf-input has-right"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <span className="zf-input-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <button type="button" className="zf-input-btn" onClick={() => setShowPass(!showPass)}>
                  {showPass ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="zf-error">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errorMsg}
              </div>
            )}

            <button type="submit" className="zf-btn" disabled={loading}>
              <span className="zf-btn-inner">
                {loading && <span className="zf-spinner" />}
                {loading ? "Autenticando..." : "Iniciar sesión"}
              </span>
            </button>
          </form>

          <div className="zf-status">
            <div className="zf-status-dot" />
            <span>Sistema operativo · Conexión cifrada</span>
          </div>

          <div className="zf-footer">
            © {new Date().getFullYear()} Zentiflow · Todos los derechos reservados
          </div>
        </div>
      </div>
    </>
  );
}
