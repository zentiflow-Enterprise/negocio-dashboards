"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/lib/client";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SignUpPage() {
  const supabase = createClient();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Clave para forzar remount y limpiar estado
  const [mountKey, setMountKey] = useState(Date.now());

  // LIMPIEZA AGRESIVA AL ENTRAR
  useEffect(() => {
    const resetPage = async () => {
      // Cerrar sesión si existe
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await supabase.auth.signOut();
      }

      // Limpiar todo
      setForm({
        nombre: "",
        email: "",
        password: "",
      });
      setErrorMsg("");
      setShowPass(false);

      // Forzar remount
      setMountKey(Date.now());
    };

    resetPage();
  }, [supabase]);

  // Canvas animado (exactamente igual que tu login)
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

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { nombre: form.nombre },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (authError) {
        console.error("Auth error:", authError);

        // Manejo robusto de errores
        const errorMessage = authError.message.toLowerCase();

        if (
          errorMessage.includes("user already registered") ||
          errorMessage.includes("already registered") ||
          errorMessage.includes("already exists") ||
          errorMessage.includes("duplicate") ||
          errorMessage.includes("email address already in use")
        ) {
          setErrorMsg("Este correo electrónico ya está registrado. Por favor, inicia sesión o usa otro correo.");
        } else if (errorMessage.includes("password")) {
          setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
        } else if (errorMessage.includes("invalid email")) {
          setErrorMsg("El formato del correo electrónico no es válido.");
        } else if (errorMessage.includes("weak password")) {
          setErrorMsg("La contraseña es muy débil. Debe tener al menos 6 caracteres.");
        } else {
          setErrorMsg("Error al crear la cuenta: " + authError.message);
        }

        setLoading(false);
        return;
      }

      // Verificar si Supabase devolvió un usuario
      // Si confirmEmailRequired está activo, user existe pero no está confirmado
      if (!authData.user) {
        setErrorMsg("No se pudo crear la cuenta. El correo podría estar ya registrado.");
        setLoading(false);
        return;
      }

      // Si el email ya existe, Supabase a veces devuelve success sin crear el usuario
      // pero con un session null
      if (authData.session === null && authData.user.identities && authData.user.identities.length === 0) {
        setErrorMsg("Este correo electrónico ya está registrado. Por favor, inicia sesión.");
        setLoading(false);
        return;
      }

      // TODO BIEN - Mostrar modal de éxito
      setShowSuccessModal(true);

      // Redirigir después de 4 segundos
      setTimeout(() => {
        router.push("/login");
      }, 4000);

    } catch (err: any) {
      console.error("Error en signup:", err);
      setErrorMsg("Error inesperado al crear la cuenta. Por favor, intenta de nuevo.");
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

        .zf-atm {
          position: absolute;
          pointer-events: none;
          z-index: 0;
          border-radius: 50%;
        }
        .zf-atm-1 { width: 700px; height: 500px; top: -200px; left: 50%; transform: translateX(-50%); background: radial-gradient(ellipse, rgba(29,90,255,0.09) 0%, transparent 65%); }
        .zf-atm-2 { width: 500px; height: 400px; bottom: -150px; right: -100px; background: radial-gradient(ellipse, rgba(99,60,255,0.07) 0%, transparent 65%); }
        .zf-atm-3 { width: 300px; height: 300px; bottom: 10%; left: 5%; background: radial-gradient(ellipse, rgba(0,200,180,0.04) 0%, transparent 65%); }

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
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

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

        .zf-corner { position: absolute; width: 14px; height: 14px; }
        .zf-corner-tl { top: -1px; left: -1px; border-top: 2px solid #3884ff; border-left: 2px solid #3884ff; border-radius: 4px 0 0 0; }
        .zf-corner-tr { top: -1px; right: -1px; border-top: 2px solid #3884ff; border-right: 2px solid #3884ff; border-radius: 0 4px 0 0; }
        .zf-corner-bl { bottom: -1px; left: -1px; border-bottom: 2px solid #3884ff; border-left: 2px solid #3884ff; border-radius: 0 0 0 4px; }
        .zf-corner-br { bottom: -1px; right: -1px; border-bottom: 2px solid #3884ff; border-right: 2px solid #3884ff; border-radius: 0 0 4px 0; }

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
          to { opacity: 1; transform: translateY(0); }
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

        .zf-logo-mark::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(56,132,255,0.07) 10px, rgba(56,132,255,0.07) 11px),
            repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(56,132,255,0.07) 10px, rgba(56,132,255,0.07) 11px);
        }

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
          0% { left: -120%; }
          60% { left: 180%; }
          100% { left: 180%; }
        }

        .zf-logo-ring {
          position: absolute;
          inset: -4px;
          border-radius: 20px;
          border: 1px solid rgba(56,132,255,0.15);
          animation: ringPulse 3s ease-in-out infinite;
        }

        @keyframes ringPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
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
          50% { opacity: 0.25; }
        }

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

        .zf-field { margin-bottom: 0.95rem; }

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
        }

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
        }
        .zf-input-btn:hover { color: rgba(232,238,255,0.55); }

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
        }

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
        }

        .zf-btn-inner { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }

        .zf-spinner {
          width: 13px; height: 13px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .zf-footer {
          margin-top: 1rem;
          text-align: center;
          font-size: 0.62rem;
          color: rgba(232,238,255,0.15);
          letter-spacing: 0.06em;
        }

        /* SUCCESS MODAL STYLES */
        .zf-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(6, 8, 16, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: overlayFadeIn 0.3s ease forwards;
        }

        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .zf-success-modal {
          position: relative;
          width: 90%;
          max-width: 440px;
          background: rgba(6, 9, 20, 0.95);
          border: 1px solid rgba(56,132,255,0.25);
          border-radius: 20px;
          padding: 2.5rem 2rem;
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          animation: modalSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          text-align: center;
        }

        @keyframes modalSlideIn {
          from { 
            opacity: 0; 
            transform: translateY(-20px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }

        .zf-success-modal::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          padding: 1px;
          background: linear-gradient(140deg, rgba(56,132,255,0.5) 0%, rgba(0,200,180,0.3) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .zf-success-icon-wrap {
          width: 90px;
          height: 90px;
          margin: 0 auto 1.5rem;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .zf-success-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid rgba(56,132,255,0.2);
          animation: successRing 1.5s ease-in-out infinite;
        }

        .zf-success-ring:nth-child(2) {
          animation-delay: 0.3s;
        }

        .zf-success-ring:nth-child(3) {
          animation-delay: 0.6s;
        }

        @keyframes successRing {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        .zf-success-icon {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: linear-gradient(145deg, rgba(56,132,255,0.15), rgba(0,200,180,0.1));
          border: 2px solid rgba(56,132,255,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
          animation: iconBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.2s forwards;
          transform: scale(0);
        }

        @keyframes iconBounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .zf-success-icon svg {
          width: 42px;
          height: 42px;
          stroke: #78c4ff;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
        }

        .zf-success-checkmark {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: checkmarkDraw 0.6s ease forwards 0.5s;
        }

        @keyframes checkmarkDraw {
          to { stroke-dashoffset: 0; }
        }

        .zf-success-title {
          font-family: 'Syne', sans-serif;
          font-size: 1.6rem;
          font-weight: 700;
          color: #e8eeff;
          margin-bottom: 0.6rem;
          animation: fadeUp 0.5s ease forwards 0.4s;
          opacity: 0;
        }

        .zf-success-message {
          font-size: 0.875rem;
          line-height: 1.6;
          color: rgba(232,238,255,0.55);
          margin-bottom: 0.8rem;
          animation: fadeUp 0.5s ease forwards 0.5s;
          opacity: 0;
        }

        .zf-success-email {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(56,132,255,0.08);
          border: 1px solid rgba(56,132,255,0.2);
          border-radius: 8px;
          padding: 0.5rem 1rem;
          margin: 0.8rem 0 1.5rem;
          font-size: 0.82rem;
          font-weight: 500;
          color: #78c4ff;
          animation: fadeUp 0.5s ease forwards 0.6s;
          opacity: 0;
        }

        .zf-success-steps {
          text-align: left;
          background: rgba(56,132,255,0.04);
          border: 1px solid rgba(56,132,255,0.12);
          border-radius: 12px;
          padding: 1.2rem;
          margin-bottom: 1.5rem;
          animation: fadeUp 0.5s ease forwards 0.7s;
          opacity: 0;
        }

        .zf-success-steps-title {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(232,238,255,0.35);
          margin-bottom: 0.8rem;
        }

        .zf-success-step {
          display: flex;
          align-items: flex-start;
          gap: 0.8rem;
          margin-bottom: 0.8rem;
          font-size: 0.82rem;
          line-height: 1.5;
          color: rgba(232,238,255,0.6);
        }

        .zf-success-step:last-child {
          margin-bottom: 0;
        }

        .zf-success-step-num {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(56,132,255,0.12);
          border: 1px solid rgba(56,132,255,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 600;
          color: #78c4ff;
        }

        .zf-redirect-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: rgba(232,238,255,0.25);
          animation: fadeUp 0.5s ease forwards 0.8s;
          opacity: 0;
        }

        .zf-redirect-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(56,132,255,0.2);
          border-top-color: #3884ff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      `}</style>

      <div className="zf-root" key={mountKey}>
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

          <div className="zf-heading">Crear nueva cuenta</div>
          <div className="zf-sub">Comienza tu prueba gratuita</div>

          <form onSubmit={signUp}>
            <div className="zf-field">
              <div className="zf-label"><span>Nombre completo</span><div className="zf-label-line" /></div>
              <input
                type="text"
                className="zf-input"
                placeholder="Tu nombre completo"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>

            <div className="zf-field">
              <div className="zf-label"><span>Correo electrónico</span><div className="zf-label-line" /></div>
              <input
                type="email"
                className="zf-input"
                placeholder="usuario@empresa.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="zf-field">
              <div className="zf-label"><span>Contraseña</span><div className="zf-label-line" /></div>
              <div className="zf-input-wrap">
                <input
                  type={showPass ? "text" : "password"}
                  className="zf-input has-right"
                  placeholder="••••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="zf-input-btn"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {errorMsg && <div className="zf-error">{errorMsg}</div>}

            <button type="submit" className="zf-btn" disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <div className="text-center mt-6 text-sm">
            <Link href="/login" className="block text-[var(--accent)] hover:underline">
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </div>

          <div className="zf-footer">
            © {new Date().getFullYear()} Zentiflow · Todos los derechos reservados
          </div>
        </div>

        {/* SUCCESS MODAL */}
        {showSuccessModal && (
          <div className="zf-modal-overlay">
            <div className="zf-success-modal">
              <div className="zf-corner zf-corner-tl" />
              <div className="zf-corner zf-corner-tr" />
              <div className="zf-corner zf-corner-bl" />
              <div className="zf-corner zf-corner-br" />

              <div className="zf-success-icon-wrap">
                <div className="zf-success-ring" />
                <div className="zf-success-ring" />
                <div className="zf-success-ring" />
                <div className="zf-success-icon">
                  <svg viewBox="0 0 50 50">
                    <path
                      className="zf-success-checkmark"
                      d="M 10 25 L 20 35 L 40 15"
                    />
                  </svg>
                </div>
              </div>

              <div className="zf-success-title">¡Cuenta creada con éxito!</div>
              <div className="zf-success-message">
                Hemos enviado un correo de verificación a:
              </div>

              <div className="zf-success-email">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 7l-10 7L2 7" />
                </svg>
                {form.email}
              </div>

              <div className="zf-success-steps">
                <div className="zf-success-steps-title">Próximos pasos</div>
                <div className="zf-success-step">
                  <div className="zf-success-step-num">1</div>
                  <div>Revisa tu bandeja de entrada y abre el correo de Zentiflow</div>
                </div>
                <div className="zf-success-step">
                  <div className="zf-success-step-num">2</div>
                  <div>Haz clic en el enlace de verificación para activar tu cuenta</div>
                </div>
                <div className="zf-success-step">
                  <div className="zf-success-step-num">3</div>
                  <div>Inicia sesión y comienza a usar Zentiflow</div>
                </div>
              </div>

              <div className="zf-redirect-info">
                <div className="zf-redirect-spinner" />
                Redirigiendo a inicio de sesión...
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}