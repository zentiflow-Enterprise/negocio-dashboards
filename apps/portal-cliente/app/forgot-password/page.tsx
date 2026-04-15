"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/lib/client";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
    const supabase = createClient();
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cooldown, setCooldown] = useState(0);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Canvas (mismo que login)
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

        type Signal = { fromIdx: number; toIdx: number; progress: number; speed: number };
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
            signals.push({ fromIdx: from, toIdx: to, progress: 0, speed: 0.012 + Math.random() * 0.016 });
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            frame++;
            if (frame % 28 === 0) fireSignal();

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

            for (let s = signals.length - 1; s >= 0; s--) {
                const sig = signals[s];
                if (!sig) continue;
                sig.progress += sig.speed;

                const from = nodes[sig.fromIdx];
                const to = nodes[sig.toIdx];
                if (!from || !to) {
                    signals.splice(s, 1);
                    continue;
                }

                if (sig.progress >= 1) {
                    to.active = true;
                    to.activeCooldown = 18;
                    signals.splice(s, 1);
                    continue;
                }

                const x = from.x + (to.x - from.x) * sig.progress;
                const y = from.y + (to.y - from.y) * sig.progress;

                const fade = sig.progress < 0.1 ? sig.progress / 0.1 : sig.progress > 0.85 ? (1 - sig.progress) / 0.15 : 1;

                ctx.beginPath();
                const grad = ctx.createLinearGradient(from.x, from.y, x, y);
                grad.addColorStop(0, "rgba(56,132,255,0)");
                grad.addColorStop(1, `rgba(56,132,255,${0.35 * fade})`);
                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.2;
                ctx.moveTo(
                    from.x + (x - from.x) * Math.max(0, sig.progress - 0.18),
                    from.y + (y - from.y) * Math.max(0, sig.progress - 0.18)
                );
                ctx.lineTo(x, y);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(120,180,255,${0.9 * fade})`;
                ctx.fill();
            }

            for (const n of nodes) {
                const pulse = 0.5 + 0.5 * Math.sin(n.pulse);
                const baseAlpha = n.active ? 0.9 : 0.2 + 0.15 * pulse;
                const color = n.active ? `rgba(120,200,255,${baseAlpha})` : `rgba(56,132,255,${baseAlpha})`;

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

    const sendResetEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cooldown > 0) return;
        setLoading(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback`,
            });

            if (error) {
                setErrorMsg(error.message);
            } else {
                setSuccessMsg("✅ Enlace enviado. Revisa tu correo.");
                setCooldown(60);
                const interval = setInterval(() => {
                    setCooldown(c => {
                        if (c <= 1) { clearInterval(interval); return 0; }
                        return c - 1;
                    });
                }, 1000);
            }
        } catch {
            setErrorMsg("Error al enviar. Inténtalo de nuevo.");
        } finally {
            setLoading(false);
        }
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

        .zf-card {
          position: relative;
          z-index: 10; /* ← Esto es clave para que los inputs queden encima */
          width: 100%;
          max-width: 410px;
          margin: 1.5rem;
          background: rgba(6, 9, 20, 0.88);
          border: 1px solid rgba(56,132,255,0.18);
          border-radius: 20px;
          padding: 2.25rem 2rem 2rem;
          backdrop-filter: blur(24px);
        }

        .zf-corner { position: absolute; width: 14px; height: 14px; z-index: 11; }
        .zf-corner-tl { top: -1px; left: -1px; border-top: 2px solid #3884ff; border-left: 2px solid #3884ff; border-radius: 4px 0 0 0; }
        .zf-corner-tr { top: -1px; right: -1px; border-top: 2px solid #3884ff; border-right: 2px solid #3884ff; border-radius: 0 4px 0 0; }
        .zf-corner-bl { bottom: -1px; left: -1px; border-bottom: 2px solid #3884ff; border-left: 2px solid #3884ff; border-radius: 0 0 0 4px; }
        .zf-corner-br { bottom: -1px; right: -1px; border-bottom: 2px solid #3884ff; border-right: 2px solid #3884ff; border-radius: 0 0 4px 0; }

        .zf-logo-wrap { display: flex; flex-direction: column; align-items: center; margin-bottom: 1.75rem; }
        .zf-logo-mark {
          width: 64px; height: 64px; border-radius: 16px; margin-bottom: 0.85rem;
          position: relative; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(145deg, #0e1e52, #080e2e);
          border: 1px solid rgba(56,132,255,0.35);
        }

        .zf-brand {
          font-family: 'Syne', sans-serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: #e8eeff;
          letter-spacing: 0.06em;
        }

        .zf-badge {
          display: inline-flex; align-items: center; gap: 0.35rem;
          background: rgba(56,132,255,0.07); border: 1px solid rgba(56,132,255,0.18);
          border-radius: 20px; padding: 0.18rem 0.65rem;
          font-size: 0.62rem; font-weight: 500; color: #6aabff;
        }

        .zf-heading {
          font-family: 'Syne', sans-serif;
          font-size: 1.35rem;
          font-weight: 600;
          color: #e8eeff;
          margin-bottom: 0.25rem;
        }

        .zf-sub {
          font-size: 0.78rem;
          color: rgba(232,238,255,0.3);
          margin-bottom: 1.6rem;
        }

        .zf-field { margin-bottom: 0.95rem; }

        .zf-label {
          display: flex; align-items: center; gap: 0.4rem;
          font-size: 0.65rem; font-weight: 500; letter-spacing: 0.15em;
          text-transform: uppercase; color: rgba(232,238,255,0.3);
          margin-bottom: 0.4rem;
        }
        .zf-label-line { flex: 1; height: 1px; background: rgba(56,132,255,0.1); }

        .zf-input {
          width: 100%;
          padding: 0.78rem 1rem 0.78rem 2.6rem;
          background: rgba(56,132,255,0.04);
          border: 1px solid rgba(56,132,255,0.14);
          border-radius: 10px;
          color: #e8eeff;
          font-size: 0.875rem;
        }
        .zf-input:focus {
          border-color: rgba(56,132,255,0.45);
          background: rgba(56,132,255,0.07);
        }

        .zf-btn {
          width: 100%;
          padding: 0.88rem 1rem;
          background: linear-gradient(130deg, #1a4fff 0%, #3884ff 60%, #5aaaff 100%);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          margin-top: 0.4rem;
        }

        .zf-error {
          display: flex; align-items: center; gap: 0.45rem;
          background: rgba(220,60,60,0.07); border: 1px solid rgba(220,60,60,0.2);
          border-radius: 8px; padding: 0.6rem 0.85rem;
          margin-bottom: 0.9rem; color: #e87171; font-size: 0.77rem;
        }

        .zf-success {
          display: flex; align-items: center; gap: 0.45rem;
          background: rgba(34, 197, 151, 0.1); border: 1px solid rgba(34, 197, 151, 0.3);
          border-radius: 8px; padding: 0.6rem 0.85rem;
          margin-bottom: 0.9rem; color: #34d399; font-size: 0.77rem;
        }

        .zf-footer {
          margin-top: 1rem; text-align: center;
          font-size: 0.62rem; color: rgba(232,238,255,0.15);
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

                    <div className="zf-logo-wrap">
                        <div style={{ position: "relative", marginBottom: "0.85rem" }}>
                            <div className="zf-logo-ring" />
                            <div className="zf-logo-ring-2" />
                            <div className="zf-logo-mark">
                                <svg className="zf-z-svg" viewBox="0 0 36 36" fill="none">
                                    <defs>
                                        <linearGradient id="zGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#78c4ff" />
                                            <stop offset="50%" stopColor="#3884ff" />
                                            <stop offset="100%" stopColor="#1d5aff" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M8 9h20l-20 18h20" stroke="url(#zGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                        <div className="zf-brand">Zentiflow</div>
                        <div className="zf-badge">
                            <div className="zf-badge-dot" />
                            Portal de gestión · IA
                        </div>
                    </div>

                    <div className="zf-heading">¿Olvidaste tu contraseña?</div>
                    <div className="zf-sub">Te enviaremos un enlace para restablecerla</div>

                    <form onSubmit={sendResetEmail}>
                        <div className="zf-field">
                            <div className="zf-label"><span>Correo electrónico</span><div className="zf-label-line" /></div>
                            <input
                                type="email"
                                className="zf-input"
                                placeholder="usuario@empresa.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        {errorMsg && <div className="zf-error">{errorMsg}</div>}
                        {successMsg && <div className="zf-success">{successMsg}</div>}

                        <button
                            type="submit"
                            className="zf-btn"
                            disabled={loading || cooldown > 0}
                        >
                            {loading
                                ? "Enviando enlace..."
                                : cooldown > 0
                                    ? `Espera ${cooldown}s para reenviar`
                                    : "Enviar enlace de recuperación"
                            }
                        </button>
                    </form>

                    <div className="text-center mt-6 text-sm">
                        <Link href="/login" className="block text-[var(--accent)] hover:underline">
                            ← Volver al inicio de sesión
                        </Link>
                    </div>

                    <div className="zf-footer">
                        © {new Date().getFullYear()} Zentiflow · Todos los derechos reservados
                    </div>
                </div>
            </div>
        </>
    );
}