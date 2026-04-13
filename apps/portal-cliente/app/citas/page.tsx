"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/lib/client";
import { useNegocio } from "@/lib/hooks/useNegocio";
import DashboardLayout from "../dashboard/layout";
import toast from "react-hot-toast";
import Holidays from "date-holidays";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Cita {
  id_cita: string;
  id_cliente: string;
  id_profesional: string;
  id_servicio: string;
  nombre_cliente?: string;
  nombre_profesional: string;
  nombre_servicio: string;
  color_hex: string;
  fecha: string;
  hora: string;
  precio: number;
  estado: string;
  duracion_min: number;
  notas?: string;
}

interface Profesional {
  id_profesional: string;
  nombre: string;
  activo: boolean;
  id_especialidad?: string;
  especialidad?: { nombre: string; sector: string };
}

interface Servicio {
  id_servicio: string;
  nombre: string;
  duracion_min: number;
  precio: number;
  activo: boolean;
}

interface CitaForm {
  id_cliente: string;
  id_profesional: string;
  id_servicio: string;
  fecha: string;
  hora: string;
  notas: string;
}

interface ClienteForm {
  nombre: string;
  email: string;
  id_whatsapp: string;
  origen: string;
  portal_habilitado: boolean;
}

interface HorarioDia {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  intervalo_min: number;
  activo: boolean;
}

interface Excepcion {
  fecha: string;
  tipo: "cerrado" | "horario_especial";
  hora_inicio?: string;
  hora_fin?: string;
  intervalo_min?: number;
  motivo?: string;
}

const FORM_EMPTY: CitaForm = { id_cliente: "", id_profesional: "", id_servicio: "", fecha: "", hora: "", notas: "" };

const ESTADO_COLOR: Record<string, string> = {
  Agendada: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  Reprogramada: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  Cancelada: "bg-red-500/10 text-red-600 border-red-500/30",
  Completada: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

function genId() {
  return "cli_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function to12h(time: string) {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

// ─── DatePicker ───────────────────────────────────────────────────────────────
function DatePickerCustom({ value, onChange }: any) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm w-full text-left">
        📅 {value === new Date().toISOString().split("T")[0] ? "Hoy" : value}
      </button>
      {open && (
        <div className="absolute z-50 mt-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3 shadow-xl">
          <DayPicker
            mode="single"
            selected={value ? new Date(value + "T12:00:00") : undefined}
            onSelect={(date) => {
              if (!date) return;
              const formatted = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0];
              onChange(formatted);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────




function EstadoBadge({ estado }: { estado: string }) {
  const colorClass = ESTADO_COLOR[estado] ?? "bg-gray-500/10 text-gray-400 border-gray-400/20";
  return <span className={`text-xs px-3 py-1 rounded-full font-medium border capitalize ${colorClass}`}>{estado}</span>;
}

function formatFecha(fecha: string) {
  return new Intl.DateTimeFormat("es-CR", { weekday: "short", day: "2-digit", month: "short" }).format(new Date(fecha + "T00:00:00"));
}

function formatHora(hora: string) {
  if (!hora) return "";
  const [hh, mm] = hora.split(":").map(Number);
  const date = new Date();
  date.setHours(hh ?? 0, mm ?? 0);
  return date.toLocaleTimeString("es-CR", { hour: "numeric", minute: "2-digit", hour12: true });
}

function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = "Confirmar", variant = "danger", loading }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "success" | "warning";
  loading?: boolean;
}) {
  if (!open) return null;

  const variantStyles = {
    danger: { btn: "bg-red-500 hover:bg-red-600 text-white", icon: "text-red-500", bg: "bg-red-500/10" },
    success: { btn: "bg-emerald-500 hover:bg-emerald-600 text-white", icon: "text-emerald-500", bg: "bg-emerald-500/10" },
    warning: { btn: "bg-amber-500 hover:bg-amber-600 text-white", icon: "text-amber-500", bg: "bg-amber-500/10" },
  };
  const s = variantStyles[variant];

  const icons = {
    danger: (
      <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
        <path d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M5 4l.5 9h5L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 7v4M9 7v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    success: (
      <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
        <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    warning: (
      <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
        <path d="M8 3v5M8 10.5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M2 13L8 2l6 11H2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl w-full max-w-xs shadow-2xl">
        <div className="p-6 flex flex-col items-center text-center gap-3">
          <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.icon} flex items-center justify-center`}>
            {icons[variant]}
          </div>
          <div>
            <p className="font-semibold text-base">{title}</p>
            <p className="text-sm text-[var(--text-soft)] mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm hover:bg-[var(--bg-soft)] transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40 ${s.btn}`}
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function CitaDetailModal({ open, onClose, cita, onReprogramar, onCancelar, onCompletar, loading }: {
  open: boolean;
  onClose: () => void;
  cita: Cita | null;
  onReprogramar: (c: Cita) => void;
  onCancelar: (id: string) => void;
  onCompletar: (id: string) => void;
  loading?: boolean;
}) {
  if (!open || !cita) return null;
  const puedeCancelar = cita.estado !== "Cancelada" && cita.estado !== "Completada";
  const puedeCompletar = cita.estado !== "Completada" && cita.estado !== "Cancelada";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header con color del servicio */}
        <div className="h-1.5 rounded-t-2xl" style={{ background: cita.color_hex || "var(--accent)" }} />
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--border)]">
          <div>
            <p className="font-semibold text-base leading-tight">{cita.nombre_cliente}</p>
            <p className="text-xs text-[var(--text-soft)] mt-0.5">{formatFecha(cita.fecha)} · {formatHora(cita.hora)}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-[var(--bg-soft)] flex items-center justify-center text-[var(--text-soft)]">✕</button>
        </div>

        {/* Info */}
        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <EstadoBadge estado={cita.estado} />
            <span className="text-sm font-medium">₡{Number(cita.precio).toLocaleString("es-CR")}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--bg-soft)] rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">Servicio</p>
              <p className="text-sm font-medium leading-tight">{cita.nombre_servicio}</p>
              <p className="text-xs text-[var(--text-soft)]">{cita.duracion_min} min</p>
            </div>
            <div className="bg-[var(--bg-soft)] rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">Profesional</p>
              <p className="text-sm font-medium leading-tight">{cita.nombre_profesional}</p>
            </div>
          </div>
          {cita.notas && (
            <div className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-xs text-[var(--text-soft)]">
              {cita.notas}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          {/* Cancelar — prominente y rojo */}
          {puedeCancelar && (
            <button
              onClick={() => { onCancelar(cita.id_cita); onClose(); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition"
            >
              {/* Ícono basurero SVG */}
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M5 4l.5 9h5L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 7v4M9 7v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Cancelar cita
            </button>
          )}

          {/* Completar */}
          {puedeCompletar && (
            <button
              onClick={() => { onCompletar(cita.id_cita); onClose(); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Marcar como completada
            </button>
          )}

          {/* Reprogramar */}
          <button
            onClick={() => { onReprogramar(cita); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 8a6 6 0 1 0 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M2 4v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Reprogramar
          </button>
        </div>
      </div>
    </div>
  );
}




// ─── CitaCard ─────────────────────────────────────────────────────────────────
function CitaCard({ cita, onReprogramar, onCancelar, onCompletar }: {
  cita: Cita; onReprogramar: (c: Cita) => void; onCancelar: (id: string) => void; onCompletar: (id: string) => void;
}) {
  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl flex flex-col p-4 hover:border-[var(--accent)]/40 transition-all duration-150 h-full">
      <div className="h-1 rounded-full mb-3 opacity-70" style={{ background: cita.color_hex ?? "var(--accent)" }} />
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">CLIENTE</p>
          <p className="font-semibold text-lg leading-tight truncate">{cita.nombre_cliente}</p>
        </div>
        <EstadoBadge estado={cita.estado} />
      </div>
      <div className="mb-4">
        <p className="text-lg font-medium">{formatFecha(cita.fecha)}</p>
        <p className="text-2xl font-bold text-[var(--accent)] tracking-tighter">{formatHora(cita.hora)}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">SERVICIO</p>
          <p className="text-sm font-medium leading-tight">{cita.nombre_servicio}</p>
          <p className="text-xs text-[var(--text-soft)] mt-0.5">{cita.duracion_min} min • ₡{Number(cita.precio).toLocaleString("es-CR")}</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">PROFESIONAL</p>
          <p className="text-sm leading-tight">{cita.nombre_profesional}</p>
        </div>
      </div>
      {cita.notas && <div className="mb-4 p-3 bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-soft)]">{cita.notas}</div>}
      <div className="mt-auto pt-4 border-t border-[var(--border)] flex flex-wrap gap-2">
        <button onClick={() => onReprogramar(cita)} className="flex-1 px-4 py-2.5 text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded-lg transition">Reprogramar</button>
        {cita.estado !== "Cancelada" && cita.estado !== "Completada" && <button onClick={() => onCancelar(cita.id_cita)} className="flex-1 px-4 py-2.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition">Cancelar</button>}
        {cita.estado !== "Completada" && cita.estado !== "Cancelada" && <button onClick={() => onCompletar(cita.id_cita)} className="flex-1 px-4 py-2.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition">Completar</button>}
      </div>
    </div>
  );
}

// ─── ClienteBuscador ──────────────────────────────────────────────────────────
function ClienteBuscador({ clientes, value, onChange, onCrearCliente }: {
  clientes: any[]; value: string; onChange: (id: string) => void; onCrearCliente: () => void;
}) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);
  const seleccionado = clientes.find((c) => c.cliente_id === value);
  const filtrados = clientes.filter((c) => {
    const q = query.toLowerCase();
    return c.nombre.toLowerCase().includes(q) || (c.id_whatsapp && c.id_whatsapp.includes(q));
  }).slice(0, 20);
  return (
    <div className="relative">
      <input className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" placeholder="Buscar por nombre o teléfono..." value={seleccionado ? seleccionado.nombre : query} onFocus={() => { setAbierto(true); if (seleccionado) setQuery(""); }} onBlur={() => setTimeout(() => setAbierto(false), 150)} onChange={(e) => { setQuery(e.target.value); onChange(""); }} />
      {abierto && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {filtrados.length > 0 ? filtrados.map((c) => (
            <div key={c.cliente_id} className="px-3 py-2 cursor-pointer hover:bg-[var(--bg-soft)]" onMouseDown={() => { onChange(c.cliente_id); setQuery(""); setAbierto(false); }}>
              <div className="text-sm">{c.nombre}</div>
              {c.id_whatsapp && <div className="text-xs text-[var(--text-soft)]">📱 {c.id_whatsapp}</div>}
            </div>
          )) : <div className="px-3 py-2 text-sm text-[var(--text-soft)]">Sin resultados</div>}
          <div className="px-3 py-2 text-sm text-[var(--accent)] font-medium border-t border-[var(--border)] cursor-pointer hover:bg-[var(--bg-soft)]" onMouseDown={onCrearCliente}>+ Crear cliente nuevo</div>
        </div>
      )}
    </div>
  );
}

// ─── CitaModal ────────────────────────────────────────────────────────────────
function CitaModal({ open, onClose, onSave, profesionales, servicios, clientes, onCrearCliente, inicial, loading }: any) {
  const [form, setForm] = useState<CitaForm>({ ...FORM_EMPTY, ...inicial });
  useEffect(() => { setForm({ ...FORM_EMPTY, ...inicial }); }, [inicial, open]);
  useEffect(() => { setForm((prev) => ({ ...prev, id_cliente: inicial?.id_cliente || "" })); }, [inicial?.id_cliente]);
  if (!open) return null;
  const set = (k: keyof CitaForm, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const servSel = servicios.find((s: any) => s.id_servicio === form.id_servicio);
  const esEdicion = !!inicial?.id_cita;
  const camposCompletos = !!form.id_cliente && !!form.id_profesional && !!form.id_servicio && !!form.fecha && !!form.hora;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="font-medium text-base">{esEdicion ? "Reprogramar cita" : "Nueva cita"}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-[var(--bg-soft)] flex items-center justify-center text-[var(--text-soft)]">✕</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Cliente *</label>
            {esEdicion
              ? <input className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm opacity-60" value={clientes.find((c: any) => c.cliente_id === form.id_cliente)?.nombre || ""} disabled />
              : <ClienteBuscador clientes={clientes} value={form.id_cliente} onChange={(id) => set("id_cliente", id)} onCrearCliente={onCrearCliente} />}
          </div>
          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Profesional *</label>
            <select className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm" value={form.id_profesional} onChange={(e) => set("id_profesional", e.target.value)}>
              <option value="">Seleccionar profesional...</option>
              {profesionales.map((p: any) => <option key={p.id_profesional} value={p.id_profesional}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Servicio *</label>
            <select className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm" value={form.id_servicio} onChange={(e) => set("id_servicio", e.target.value)}>
              <option value="">Seleccionar servicio...</option>
              {servicios.map((s: any) => <option key={s.id_servicio} value={s.id_servicio}>{s.nombre} — {s.duracion_min} min</option>)}
            </select>
            {servSel && <p className="text-xs text-[var(--text-soft)] mt-1">₡{Number(servSel.precio).toLocaleString("es-CR")} • {servSel.duracion_min} min</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-soft)] mb-1 block">Fecha *</label>
              <input type="date" className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-soft)] mb-1 block">Hora *</label>
              <input type="time" className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm" value={form.hora} onChange={(e) => set("hora", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Notas (opcional)</label>
            <textarea className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm resize-none" rows={3} value={form.notas ?? ""} onChange={(e) => set("notas", e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-[var(--border)]">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg-soft)]">Cancelar</button>
          <button onClick={() => onSave(form, inicial?.id_cita)} disabled={loading || !camposCompletos} className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40" style={{ background: "var(--accent)" }}>
            {loading ? "Guardando..." : esEdicion ? "Reprogramar cita" : "Crear cita"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ClienteModal ─────────────────────────────────────────────────────────────
function ClienteModal({ open, onClose, onSave, loading }: {
  open: boolean; onClose: () => void; onSave: (form: ClienteForm) => void; loading: boolean;
}) {
  const EMPTY: ClienteForm = { nombre: "", email: "", id_whatsapp: "", origen: "manual", portal_habilitado: false };
  const [form, setForm] = useState<ClienteForm>({ ...EMPTY });
  useEffect(() => { if (!open) setForm({ ...EMPTY }); }, [open]);
  if (!open) return null;
  const set = (k: keyof ClienteForm, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="font-medium text-sm">Nuevo cliente</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-[var(--bg-soft)] flex items-center justify-center text-[var(--text-soft)]">✕</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div><label className="text-xs text-[var(--text-soft)] mb-1 block">Nombre completo *</label><input className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" placeholder="Ej. Juan Pérez" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} /></div>
          <div><label className="text-xs text-[var(--text-soft)] mb-1 block">Email</label><input type="email" className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" placeholder="cliente@ejemplo.com" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
          <div><label className="text-xs text-[var(--text-soft)] mb-1 block">WhatsApp</label><input type="tel" className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" placeholder="50688888888" value={form.id_whatsapp} onChange={(e) => set("id_whatsapp", e.target.value)} /></div>
          <div><label className="text-xs text-[var(--text-soft)] mb-1 block">Origen</label>
            <select className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm" value={form.origen} onChange={(e) => set("origen", e.target.value)}>
              <option value="manual">Manual</option><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option><option value="web">Web / Portal</option>
            </select>
          </div>
          <div className="flex items-center justify-between bg-[var(--bg-soft)] rounded-lg px-3 py-2">
            <span className="text-sm">Portal de clientes habilitado</span>
            <button type="button" onClick={() => set("portal_habilitado", !form.portal_habilitado)} className={`relative w-11 h-6 rounded-full transition-colors ${form.portal_habilitado ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.portal_habilitado ? "translate-x-5.5" : ""}`} />
            </button>
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-[var(--border)]">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg-soft)] transition">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={loading || !form.nombre.trim()} className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-40" style={{ background: "var(--accent)" }}>{loading ? "Guardando..." : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── VistaAgenda — DnD propio con elementFromPoint ────────────────────────────
// Cada celda recibe data-slot-id. Al arrastrar, ocultamos temporalmente el
// ghost para que elementFromPoint detecte el slot debajo del cursor.
interface DragState {
  citaId: string;
  cita: Cita;
  startX: number;
  startY: number;
  moved: boolean;
}

function VistaAgenda({
  citas, profesionales, fecha, onCrear, onEditar,
  horarioSemanal, excepciones, onReload, supabase, negocioId,
}: {
  citas: Cita[];
  profesionales: Profesional[];
  fecha: string;
  onCrear: (data: { hora: string; id_profesional: string }) => void;
  onEditar: (cita: Cita) => void;
  horarioSemanal: HorarioDia[];
  excepciones: Excepcion[];
  onReload: () => void;
  supabase: any;
  negocioId: string;
}) {
  const [ghost, setGhost] = useState<{ x: number; y: number; cita: Cita } | null>(null);
  const [overSlot, setOverSlot] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // ── Schedule logic ──────────────────────────────────────────────────────────
  const diaSemana = new Date(fecha + "T12:00:00").getDay();
  const hoy = new Date().toISOString().split("T")[0];
  const esHoy = fecha === hoy;
  const ahora = new Date();
  const horaActualStr = ahora.getHours().toString().padStart(2, "0") + ":" + ahora.getMinutes().toString().padStart(2, "0");

  const hd = new Holidays();
  hd.init("CR");
  const feriadoInfo = hd.isHoliday(new Date(fecha));
  const esFeriado = !!feriadoInfo;
  const excepcionHoy = excepciones.find((e) => e.fecha === fecha);

  let horaInicio = "08:00", horaFin = "20:00", intervalo = 30;
  let diaCerrado = false, motivoCierre = "";

  if (excepcionHoy) {
    if (excepcionHoy.tipo === "cerrado") { diaCerrado = true; motivoCierre = excepcionHoy.motivo || "Día cerrado"; }
    else { horaInicio = excepcionHoy.hora_inicio || horaInicio; horaFin = excepcionHoy.hora_fin || horaFin; intervalo = excepcionHoy.intervalo_min || intervalo; }
  } else if (esFeriado) {
    diaCerrado = true; motivoCierre = feriadoInfo?.[0]?.name || "Feriado nacional";
  } else {
    const hn = horarioSemanal.find((h) => h.dia_semana === diaSemana);
    if (hn?.activo) { horaInicio = hn.hora_inicio; horaFin = hn.hora_fin; intervalo = hn.intervalo_min; }
  }

  const allSlots = useMemo(() => {
    if (diaCerrado) return [];
    const arr: string[] = [];
    let cur = new Date(`2026-01-01T${horaInicio}`);
    const end = new Date(`2026-01-01T${horaFin}`);
    while (cur < end) { arr.push(cur.toTimeString().slice(0, 5)); cur.setMinutes(cur.getMinutes() + intervalo); }
    return arr;
  }, [horaInicio, horaFin, intervalo, diaCerrado]);

  const slots = useMemo(() => {
    if (!esHoy) return allSlots;
    const [h = 0, m = 0] = horaActualStr.split(":").map(Number);
    let sH = h, sM = m - 60; if (sM < 0) { sH--; sM += 60; }
    const desde = `${sH.toString().padStart(2, "0")}:${sM.toString().padStart(2, "0")}`;
    return allSlots.filter((s) => s >= desde);
  }, [allSlots, esHoy, horaActualStr]);

  const citasPorSlot = useMemo(() => {
    const map: Record<string, Cita[]> = {};
    citas.forEach((c) => {
      if (c.fecha !== fecha) return;
      const t = new Date(`2026-01-01T${c.hora}`);
      t.setMinutes(Math.floor(t.getMinutes() / intervalo) * intervalo, 0, 0);
      const key = `${c.id_profesional}__${fecha}__${t.toTimeString().slice(0, 5)}`;
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [citas, fecha, intervalo]);

  // ── Find slot under cursor, hiding ghost first so it doesn't block ──
  const getSlotAtPoint = useCallback((x: number, y: number): string | null => {
    const ghostEl = document.getElementById("drag-ghost");
    if (ghostEl) ghostEl.style.visibility = "hidden";
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (ghostEl) ghostEl.style.visibility = "visible";
    if (!el) return null;
    let cur: HTMLElement | null = el;
    while (cur) {
      const slotId = cur.dataset?.slotId;
      if (slotId) return slotId;
      cur = cur.parentElement;
    }
    return null;
  }, []);

  // ── Global pointer listeners ──────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const state = dragRef.current;
      if (!state) return;
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      if (!state.moved && Math.hypot(dx, dy) < 6) return;
      state.moved = true;
      setGhost({ x: e.clientX, y: e.clientY, cita: state.cita });
      setOverSlot(getSlotAtPoint(e.clientX, e.clientY));
    };

    const onUp = async (e: PointerEvent) => {
      const state = dragRef.current;
      if (!state) return;
      dragRef.current = null;
      setGhost(null);
      setOverSlot(null);

      if (!state.moved) {
        // Short tap = open editor
        onEditar(state.cita);
        return;
      }

      const targetSlotId = getSlotAtPoint(e.clientX, e.clientY);
      if (!targetSlotId) return;

      const parts = targetSlotId.split("__");
      if (parts.length < 3) return;
      const [id_profesional, fechaSlot, horaSlot] = parts as [string, string, string];

      const horaOrig = state.cita.hora.slice(0, 5);
      if (
        state.cita.id_profesional === id_profesional &&
        state.cita.fecha === fechaSlot &&
        horaOrig === horaSlot
      ) return;

      const tid = toast.loading("Moviendo cita…");
      try {
        const { error } = await supabase.rpc("rpc_reprogramar_cita", {
          p_id_cita: state.citaId,
          p_negocio_id: negocioId,
          p_fecha: fechaSlot,
          p_hora: horaSlot + ":00",
          p_id_profesional: id_profesional,
        });
        if (error) throw error;
        toast.success("Cita movida ✨", { id: tid });
        onReload();
      } catch (err: any) {
        toast.error(err?.message || "Error al mover cita", { id: tid });
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [getSlotAtPoint, onEditar, supabase, negocioId, onReload]);

  if (diaCerrado) {
    return (
      <div className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-3xl p-16 text-center">
        <div className="text-6xl mb-6">🏠</div>
        <h3 className="text-2xl font-semibold mb-2">Negocio cerrado este día</h3>
        <p className="text-[var(--text-soft)]">{motivoCierre}</p>
      </div>
    );
  }

  const isDragging = !!ghost;

  return (
    <>
      {/* Ghost chip that follows cursor */}
      {ghost && (
        <div
          id="drag-ghost"
          style={{
            position: "fixed",
            left: ghost.x + 14,
            top: ghost.y - 18,
            zIndex: 9999,
            pointerEvents: "none",
            background: ghost.cita.color_hex || "#6366f1",
            transform: "rotate(2deg) scale(1.06)",
            minWidth: 120,
          }}
          className="rounded-xl px-3 py-2 text-xs text-white shadow-2xl select-none"
        >
          <div className="font-semibold truncate">{ghost.cita.nombre_cliente}</div>
          <div className="opacity-80 text-[10px] truncate">{ghost.cita.nombre_servicio}</div>
        </div>
      )}

      {/* DESKTOP */}
      <div
        className="hidden lg:block overflow-x-auto pb-6"
        style={{ userSelect: isDragging ? "none" : undefined, cursor: isDragging ? "grabbing" : undefined }}
      >
        <div className="min-w-max border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--bg)] shadow-sm">
          {/* Header */}
          <div className="grid bg-[var(--bg-soft)] border-b border-[var(--border)]" style={{ gridTemplateColumns: `180px repeat(${slots.length}, 120px)` }}>
            <div className="p-4 border-r border-[var(--border)]">
              <span className="text-[10px] font-semibold text-[var(--text-soft)] uppercase tracking-widest">Profesional</span>
            </div>
            {slots.map((slot) => (
              <div key={slot} className="py-3 text-[11px] text-center text-[var(--text-soft)] border-l border-[var(--border)] font-medium tabular-nums">{slot}</div>
            ))}
          </div>

          {/* Rows */}
          {profesionales.map((prof) => (
            <div key={prof.id_profesional} className="grid border-b last:border-b-0" style={{ gridTemplateColumns: `180px repeat(${slots.length}, 120px)` }}>
              <div className="p-4 border-r border-[var(--border)] bg-[var(--bg-soft)] flex flex-col justify-center">
                <span className="text-sm font-semibold leading-tight">{prof.nombre}</span>
                {prof.especialidad?.nombre && <span className="text-[11px] text-[var(--text-soft)] mt-0.5">{prof.especialidad.nombre}</span>}
              </div>

              {slots.map((slot) => {
                const slotId = `${prof.id_profesional}__${fecha}__${slot}`;
                const slotCitas = citasPorSlot[slotId] || [];
                const isEmpty = slotCitas.length === 0;
                const isOver = overSlot === slotId;

                return (
                  <div
                    key={slot}
                    data-slot-id={slotId}
                    className="h-[76px] relative border-l border-[var(--border)] p-1.5 flex flex-col gap-1 group transition-colors duration-75"
                    style={{
                      background: isOver ? "rgba(99,102,241,0.1)" : undefined,
                      cursor: isEmpty && !isDragging ? "pointer" : isDragging ? "grabbing" : "default",
                    }}
                    onClick={() => { if (!isDragging && isEmpty) onCrear({ hora: slot, id_profesional: prof.id_profesional }); }}
                  >
                    {slotCitas.map((cita) => {
                      const isThisDragging = ghost?.cita.id_cita === cita.id_cita;
                      return (
                        <div
                          key={cita.id_cita}
                          data-slot-id={slotId}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            dragRef.current = { citaId: cita.id_cita, cita, startX: e.clientX, startY: e.clientY, moved: false };
                            (e.target as HTMLElement).setPointerCapture(e.pointerId);
                          }}
                          style={{
                            background: cita.color_hex || "#6366f1",
                            opacity: isThisDragging ? 0.25 : 1,
                            cursor: isDragging ? "grabbing" : "grab",
                          }}
                          className="rounded-xl p-2.5 text-xs text-white shadow-md select-none"
                        >
                          <div className="font-semibold truncate leading-tight">{cita.nombre_cliente}</div>
                          <div className="opacity-80 text-[10px] truncate mt-0.5">{cita.nombre_servicio}</div>
                          <div className="opacity-60 text-[9px] mt-0.5 tabular-nums">{cita.hora.slice(0, 5)}</div>
                        </div>
                      );
                    })}
                    {isEmpty && !isDragging && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <span className="text-xs text-[var(--text-soft)] font-medium">+ Agendar</span>
                      </div>
                    )}
                    {isOver && isDragging && (
                      <div className="absolute inset-0 rounded border-2 border-dashed border-indigo-400 pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* MOBILE */}
      <div className="lg:hidden space-y-6" style={{ userSelect: isDragging ? "none" : undefined }}>
        {slots.map((slot) => (
          <div key={slot}>
            <div className="text-base font-bold text-[var(--accent)] mb-3 pl-1">{slot}</div>
            <div className="space-y-3">
              {profesionales.map((prof) => {
                const key = `${prof.id_profesional}__${fecha}__${slot}`;
                const slotCitas = citasPorSlot[key] || [];
                const isEmpty = slotCitas.length === 0;
                const isOver = overSlot === key;
                return (
                  <div
                    key={prof.id_profesional}
                    data-slot-id={key}
                    className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-4 min-h-[72px] transition-colors"
                    style={{ background: isOver ? "rgba(99,102,241,0.08)" : undefined }}
                    onClick={() => { if (!isDragging && isEmpty) onCrear({ hora: slot, id_profesional: prof.id_profesional }); }}
                  >
                    <div className="text-xs font-medium text-[var(--text-soft)] mb-2">{prof.nombre}</div>
                    <div className="flex flex-col gap-2">
                      {slotCitas.map((cita) => {
                        const isThisDragging = ghost?.cita.id_cita === cita.id_cita;
                        return (
                          <div
                            key={cita.id_cita}
                            data-slot-id={key}
                            onPointerDown={(e) => {
                              e.preventDefault();
                              dragRef.current = { citaId: cita.id_cita, cita, startX: e.clientX, startY: e.clientY, moved: false };
                              (e.target as HTMLElement).setPointerCapture(e.pointerId);
                            }}
                            style={{ background: cita.color_hex || "#6366f1", opacity: isThisDragging ? 0.25 : 1 }}
                            className="rounded-xl p-2.5 text-xs text-white shadow-md select-none cursor-grab"
                          >
                            <div className="font-semibold truncate">{cita.nombre_cliente}</div>
                            <div className="opacity-80 text-[10px] truncate">{cita.nombre_servicio}</div>
                          </div>
                        );
                      })}
                      {isEmpty && <div className="text-xs text-[var(--text-soft)] opacity-40">Toca para agendar</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
function CitasOperativasPage() {
  const supabase = createClient();
  const { negocio } = useNegocio();

  const [detailCita, setDetailCita] = useState<Cita | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [clientes, setClientes] = useState<any[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [horarioSemanal, setHorarioSemanal] = useState<HorarioDia[]>([]);
  const [excepciones, setExcepciones] = useState<Excepcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "Agendada" | "Reprogramada" | "Cancelada">("todos");
  const [filtroFecha, setFiltroFecha] = useState<"hoy" | "proximas" | "semana" | "mes">("hoy");
  const [filtroProfesional, setFiltroProfesional] = useState<string>("todos");
  const [agendaFecha, setAgendaFecha] = useState(new Date().toISOString().split("T")[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Cita | null>(null);
  const [vista, setVista] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("vista") || "agenda";
    return "agenda";
  });
  const [clienteModalOpen, setClienteModalOpen] = useState(false);

  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: "danger" | "success" | "warning";
    onConfirm: () => void;
  }>({
    open: false, title: "", message: "", confirmLabel: "Confirmar", variant: "danger", onConfirm: () => { },
  });

  useEffect(() => { localStorage.setItem("vista", vista); }, [vista]);

  useEffect(() => {
    if (!negocio?.id) return;
    supabase.from("config_negocio_horario").select("*").eq("negocio_id", negocio.id).then(({ data }) => setHorarioSemanal(data || []));
    supabase.from("config_negocio_excepciones").select("*").eq("negocio_id", negocio.id).then(({ data }) => setExcepciones(data || []));
  }, [negocio?.id]);

  const askConfirm = (opts: Omit<typeof confirm, "open">) =>
    setConfirm({ open: true, ...opts });

  const loadCitas = useCallback(async () => {
    if (!negocio?.id) return;
    setLoading(true);
    let query = supabase.from("v_citas_operativas").select("*").eq("negocio_id", negocio.id).order("fecha").order("hora");
    if (vista === "agenda") {
      query = query.eq("fecha", agendaFecha);
    } else {
      const hoy = new Date().toISOString().split("T")[0] ?? "";
      const manana = new Date(Date.now() + 86400000).toISOString().split("T")[0] ?? "";
      const enUnaSemana = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0] ?? "";
      const enUnMes = new Date(); enUnMes.setMonth(enUnMes.getMonth() + 1);
      const enUnMesStr = enUnMes.toISOString().split("T")[0] ?? "";
      if (filtroFecha === "hoy") query = query.eq("fecha", hoy);
      else if (filtroFecha === "proximas") query = query.gte("fecha", manana);
      else if (filtroFecha === "semana") query = query.gte("fecha", manana).lte("fecha", enUnaSemana);
      else if (filtroFecha === "mes") query = query.gte("fecha", manana).lte("fecha", enUnMesStr);
    }
    if (filtroProfesional !== "todos") query = query.eq("id_profesional", filtroProfesional);
    const { data, error } = await query;
    if (error) toast.error("Error cargando citas");
    else setCitas(data || []);
    setLoading(false);
  }, [negocio?.id, vista, agendaFecha, filtroFecha, filtroProfesional]);

  useEffect(() => {
    if (!negocio?.id) return;
    loadCitas();
    supabase.from("profesionales").select("*, especialidad:especialidades(nombre, sector)").eq("negocio_id", negocio.id).eq("activo", true).then(({ data }) => setProfesionales(data || []));
    supabase.from("servicios").select("*").eq("negocio_id", negocio.id).eq("activo", true).then(({ data }) => setServicios(data || []));
    supabase.from("clientes_negocio").select("cliente_id, nombre, id_whatsapp").eq("negocio_id", negocio.id).then(({ data }) => setClientes(data || []));
  }, [negocio?.id, loadCitas]);

  const handleSave = async (form: CitaForm, id?: string) => {
    if (!negocio?.id) return;
    setSaving(true);
    try {
      if (id) {
        const { error } = await supabase.rpc("rpc_reprogramar_cita", { p_id_cita: id, p_negocio_id: negocio.id, p_fecha: form.fecha, p_hora: form.hora.length === 5 ? form.hora + ":00" : form.hora, p_id_profesional: form.id_profesional || null, p_id_servicio: form.id_servicio || null, p_notas: form.notas || null });
        if (error) throw error;
        toast.success("Cita reprogramada ✅");
      } else {
        const { error } = await supabase.rpc("rpc_crear_cita", { p_negocio_id: negocio.id, p_id_cliente: form.id_cliente, p_nombre_cliente: clientes.find((c: any) => c.cliente_id === form.id_cliente)?.nombre || "", p_id_profesional: form.id_profesional, p_id_servicio: form.id_servicio, p_fecha: form.fecha, p_hora: form.hora.length === 5 ? form.hora + ":00" : form.hora, p_notas: form.notas || null, p_origen: "portal" });
        if (error) throw error;
        toast.success("Cita creada ✅");
      }
      setModalOpen(false); setEditando(null); loadCitas();
    } catch (err: any) { toast.error(err.message || "Error al guardar cita"); }
    finally { setSaving(false); }
  };

  const handleGuardarCliente = async (form: ClienteForm) => {
    if (!negocio?.id) return;
    setSaving(true);
    try {
      const nuevoId = genId();
      const { error } = await supabase.from("clientes_negocio").insert([{ ...form, cliente_id: nuevoId, negocio_id: negocio.id, creado_en: new Date().toISOString(), actualizado_en: new Date().toISOString() }]);
      if (error) throw error;
      const { data } = await supabase.from("clientes_negocio").select("cliente_id, nombre, id_whatsapp").eq("negocio_id", negocio.id);
      setClientes(data || []);
      setEditando((prev) => prev ? { ...prev, id_cliente: nuevoId } : prev);
      setClienteModalOpen(false);
      toast.success("Cliente creado ✅");
    } catch (err: any) { toast.error(err.message || "Error al crear cliente"); }
    finally { setSaving(false); }
  };

  const handleCancelar = (id: string) => {
    askConfirm({
      title: "Cancelar cita",
      message: "Esta acción no se puede deshacer. ¿Seguro que quieres cancelar esta cita?",
      confirmLabel: "Sí, cancelar",
      variant: "danger",
      onConfirm: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        try {
          const { error } = await supabase.rpc("rpc_cancelar_cita", {
            p_id_cita: id, p_negocio_id: negocio?.id, p_motivo: null,
          });
          if (error) throw error;
          toast.success("Cita cancelada ✅");
          loadCitas();
        } catch (err: any) { toast.error(err.message || "Error al cancelar"); }
      },
    });
  };

  const handleCompletar = (id: string) => {
    askConfirm({
      title: "Completar cita",
      message: "¿Confirmas que el servicio fue realizado y deseas marcarlo como completado?",
      confirmLabel: "Sí, completar",
      variant: "success",
      onConfirm: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        try {
          const { error } = await supabase.rpc("rpc_completar_cita", {
            p_id_cita: id, p_negocio_id: negocio?.id, p_notas_internas: null,
          });
          if (error) throw error;
          toast.success("Cita completada ✅");
          loadCitas();
        } catch (err: any) { toast.error(err.message || "Error al completar"); }
      },
    });
  };

  const citasFiltradas = citas.filter((c) => {
    const matchBusq = !busqueda || (c.nombre_cliente ?? "").toLowerCase().includes(busqueda.toLowerCase()) || c.nombre_servicio.toLowerCase().includes(busqueda.toLowerCase());
    return matchBusq && (filtroEstado === "todos" || c.estado === filtroEstado);
  });

  const profesionalesFiltrados = filtroProfesional === "todos" ? profesionales : profesionales.filter((p) => p.id_profesional === filtroProfesional);
  const diaHoy = new Date(agendaFecha + "T12:00:00").getDay();
  const horarioHoy = horarioSemanal.find((h) => h.dia_semana === diaHoy);
  const horaInicioHoy = horarioHoy?.hora_inicio ?? "08:00";
  const horaFinHoy = horarioHoy?.hora_fin ?? "20:00";

  return (
    <div className="p-6 lg:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">Citas Operativas</h1>
          <p className="text-sm text-[var(--text-soft)]">Gestión diaria • Agendar, reprogramar y atender</p>
        </div>
        <button onClick={() => { setEditando(null); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: "var(--accent)" }}>+ Nueva cita</button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setVista("lista")} className={`px-4 py-2 rounded-xl text-sm ${vista === "lista" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-soft)]"}`}>Lista</button>
        <button onClick={() => setVista("agenda")} className={`px-4 py-2 rounded-xl text-sm ${vista === "agenda" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-soft)]"}`}>Agenda</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <input className="flex-1 bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm" placeholder="Buscar cliente o servicio..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        {/* Contador — siempre visible en ambas vistas */}
        <div className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-medium tabular-nums whitespace-nowrap">
          {citas.filter(c => c.estado !== "Cancelada").length} citas · ₡{citas.filter(c => c.estado !== "Cancelada").reduce((acc, c) => acc + Number(c.precio), 0).toLocaleString("es-CR")}
        </div>

        {vista === "lista" && (
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as any)} className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm">
            <option value="todos">Todos los estados</option>
            <option value="Agendada">Agendada</option>
            <option value="Reprogramada">Reprogramada</option>
            <option value="Completada">Completada</option>
          </select>

        )}

        <select value={filtroProfesional} onChange={(e) => setFiltroProfesional(e.target.value)} className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm">
          <option value="todos">Todos los profesionales</option>
          {profesionales.map((p) => <option key={p.id_profesional} value={p.id_profesional}>{p.nombre}</option>)}
        </select>
        {vista === "lista" && (
          <select value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value as any)} className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm">
            <option value="hoy">Hoy</option>
            <option value="proximas">Próximas</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
          </select>
        )}
        {vista === "agenda" && (
          <>
            <DatePickerCustom value={agendaFecha} onChange={setAgendaFecha} />
            <span className="whitespace-nowrap bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-medium">
              {agendaFecha === new Date().toISOString().split("T")[0] ? "Hoy" : new Date(agendaFecha + "T12:00:00").toLocaleDateString("es-CR", { weekday: "short", day: "numeric", month: "short" })}
              {" · "}{to12h(horaInicioHoy)} — {to12h(horaFinHoy)}
            </span>
          </>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-[var(--text-soft)]">Cargando...</div>
      ) : vista === "lista" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {citasFiltradas.map((cita) => <CitaCard key={cita.id_cita} cita={cita} onReprogramar={(c) => { setEditando(c); setModalOpen(true); }} onCancelar={handleCancelar} onCompletar={handleCompletar} />)}
        </div>
      ) : (
        <VistaAgenda
          citas={citas}
          profesionales={profesionalesFiltrados}
          fecha={agendaFecha ?? ""}
          horarioSemanal={horarioSemanal}
          excepciones={excepciones}
          supabase={supabase}
          negocioId={negocio?.id ?? ""}
          onReload={loadCitas}
          onCrear={({ hora, id_profesional }) => {
            setEditando({ id_cita: "", id_cliente: "", id_profesional, id_servicio: "", fecha: agendaFecha, hora, nombre_profesional: "", nombre_servicio: "", color_hex: "", precio: 0, estado: "Agendada", duracion_min: 0 } as Cita);
            setModalOpen(true);
          }}
          onEditar={(cita) => { setDetailCita(cita); setDetailOpen(true); }}
        />
      )}

      <CitaModal open={modalOpen} onClose={() => { setModalOpen(false); setEditando(null); }} onSave={handleSave} profesionales={profesionales} servicios={servicios} clientes={clientes} onCrearCliente={() => setClienteModalOpen(true)} inicial={editando ? { ...editando, hora: editando.hora?.slice(0, 5) } : undefined} loading={saving} />

      <ClienteModal open={clienteModalOpen} onClose={() => setClienteModalOpen(false)} onSave={handleGuardarCliente} loading={saving} />

      <ConfirmModal
        open={confirm.open}
        onClose={() => setConfirm((p) => ({ ...p, open: false }))}
        onConfirm={confirm.onConfirm}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        variant={confirm.variant}
      />



      <CitaDetailModal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailCita(null); }}
        cita={detailCita}
        onReprogramar={(c) => { setEditando(c); setModalOpen(true); }}
        onCancelar={handleCancelar}
        onCompletar={handleCompletar}
      />
    </div>
  );
}

export default function PageWrapper() {
  return <DashboardLayout><CitasOperativasPage /></DashboardLayout>;
}
