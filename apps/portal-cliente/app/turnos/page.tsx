"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/lib/client";
import { useNegocio } from "@/lib/hooks/useNegocio";
import DashboardLayout from "../dashboard/layout";
import toast from "react-hot-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Turno {
  id_turno: string;
  negocio_id: string;
  nombre_turno: string;
  hora_entrada: string;
  hora_salida: string;
  dias_trabajo: string[];
  dia_libre: string;
  activo: boolean;
  creado_en: string;
}

interface TurnoForm {
  nombre_turno: string;
  hora_entrada: string;
  hora_salida: string;
  dias_trabajo: string[];
  dia_libre: string;
  activo: boolean;
}

const DIAS_SEMANA = [
  { key: "lunes", label: "Lun" },
  { key: "martes", label: "Mar" },
  { key: "miercoles", label: "Mié" },
  { key: "jueves", label: "Jue" },
  { key: "viernes", label: "Vie" },
  { key: "sabado", label: "Sáb" },
  { key: "domingo", label: "Dom" },
];

const FORM_EMPTY: TurnoForm = {
  nombre_turno: "",
  hora_entrada: "08:00",
  hora_salida: "17:00",
  dias_trabajo: ["lunes", "martes", "miercoles", "jueves", "viernes"],
  dia_libre: "",
  activo: true,
};

function genId() {
  return "turno_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatHora(hora: string) {
  if (!hora) return "";
  const [hh, mm] = hora.split(":").map(Number);
  const date = new Date();
  date.setHours(hh, mm);
  return date.toLocaleTimeString("es-CR", { hour: "numeric", minute: "2-digit", hour12: true });
}

// ─── Badge activo ─────────────────────────────────────────────────────────────
function ActiveBadge({ activo }: { activo: boolean }) {
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
        activo
          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          : "bg-gray-500/10 text-gray-400 border-gray-400/20"
      }`}
    >
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

// ─── Chips de días ────────────────────────────────────────────────────────────
function DiaChips({
  dias,
  interactive = false,
  onChange,
}: {
  dias: string[];
  interactive?: boolean;
  onChange?: (dias: string[]) => void;
}) {
  const toggle = (key: string) => {
    if (!onChange) return;
    const next = dias.includes(key) ? dias.filter((d) => d !== key) : [...dias, key];
    onChange(next);
  };

  return (
    <div className="flex gap-1 flex-wrap">
      {DIAS_SEMANA.map(({ key, label }) => {
        const activo = dias.includes(key);
        return (
          <button
            key={key}
            type="button"
            disabled={!interactive}
            onClick={() => toggle(key)}
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium border transition ${
              activo
                ? "border-transparent text-white"
                : "bg-transparent text-[var(--text-soft)] border-[var(--border)]"
            } ${interactive ? "cursor-pointer hover:opacity-90" : "cursor-default"}`}
            style={activo ? { background: "var(--accent)", borderColor: "var(--accent)" } : {}}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function TurnoModal({
  open,
  onClose,
  onSave,
  onDelete,
  inicial,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: TurnoForm, id?: string) => void;
  onDelete?: (id: string) => void;
  inicial?: Partial<TurnoForm> & { id_turno?: string };
  loading: boolean;
}) {
  const [form, setForm] = useState<TurnoForm>({ ...FORM_EMPTY, ...inicial });

  useEffect(() => {
    setForm({ ...FORM_EMPTY, ...inicial });
  }, [inicial, open]);

  if (!open) return null;

  const set = (k: keyof TurnoForm, v: string | boolean | string[]) =>
    setForm((p) => ({ ...p, [k]: v }));

  // Calcular horas trabajadas
  const calcHoras = () => {
    try {
      const [hE, mE] = form.hora_entrada.split(":").map(Number);
      const [hS, mS] = form.hora_salida.split(":").map(Number);
      const mins = hS * 60 + mS - (hE * 60 + mE);
      if (mins <= 0) return null;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}min` : `${h}h`;
    } catch {
      return null;
    }
  };

  const horas = calcHoras();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="font-medium text-base">
            {inicial?.id_turno ? "Editar turno" : "Nuevo turno"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-[var(--bg-soft)] flex items-center justify-center text-[var(--text-soft)]"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Nombre del turno *</label>
            <input
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="Ej. Turno mañana, Turno tarde..."
              value={form.nombre_turno}
              onChange={(e) => set("nombre_turno", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-soft)] mb-1 block">Hora entrada</label>
              <input
                type="time"
                className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.hora_entrada}
                onChange={(e) => set("hora_entrada", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-soft)] mb-1 block">Hora salida</label>
              <input
                type="time"
                className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.hora_salida}
                onChange={(e) => set("hora_salida", e.target.value)}
              />
            </div>
          </div>

          {horas && (
            <p className="text-xs text-[var(--text-soft)] -mt-2">
              Jornada de <span className="font-medium" style={{ color: "var(--accent)" }}>{horas}</span>
            </p>
          )}

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-2 block">Días de trabajo</label>
            <DiaChips
              dias={form.dias_trabajo}
              interactive
              onChange={(d) => set("dias_trabajo", d)}
            />
            <p className="text-xs text-[var(--text-soft)] mt-1">
              {form.dias_trabajo.length} día{form.dias_trabajo.length !== 1 ? "s" : ""} seleccionado{form.dias_trabajo.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">
              Día libre (opcional)
            </label>
            <select
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              value={form.dia_libre}
              onChange={(e) => set("dia_libre", e.target.value)}
            >
              <option value="">Sin día libre definido</option>
              {DIAS_SEMANA.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between bg-[var(--bg-soft)] rounded-lg px-3 py-2">
            <span className="text-sm">Estado</span>
            <button
              type="button"
              onClick={() => set("activo", !form.activo)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.activo ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              }`}
            >
              <span
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{ transform: form.activo ? "translateX(20px)" : "translateX(2px)" }}
              />
            </button>
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-[var(--border)]">
          {inicial?.id_turno && onDelete && (
            <button
              onClick={() => onDelete(inicial.id_turno!)}
              className="py-2 px-3 rounded-lg border border-red-400/30 text-sm text-red-500 hover:bg-red-500/10 flex-1 transition"
            >
              Eliminar
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg-soft)] transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form, inicial?.id_turno)}
            disabled={loading || !form.nombre_turno || form.dias_trabajo.length === 0}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
function TurnosPage() {
  const supabase = createClient();
  const { negocio } = useNegocio();

  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "activo" | "inactivo">("todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Turno | null>(null);

  const loadTurnos = useCallback(async () => {
    if (!negocio?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("turnos")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("nombre_turno", { ascending: true });
    setTurnos((data as Turno[]) || []);
    setLoading(false);
  }, [negocio?.id]);

  useEffect(() => {
    if (!negocio?.id) return;
    loadTurnos();
  }, [negocio?.id, loadTurnos]);

  const handleSave = async (form: TurnoForm, id?: string) => {
    if (!negocio?.id) return;
    setSaving(true);
    try {
      if (id) {
        await supabase.from("turnos").update({ ...form }).eq("id_turno", id);
        toast.success("Turno actualizado ✅");
      } else {
        await supabase.from("turnos").insert([
          { ...form, id_turno: genId(), negocio_id: negocio.id },
        ]);
        toast.success("Turno creado ✅");
      }
      setModalOpen(false);
      setEditando(null);
      loadTurnos();
    } catch {
      toast.error("Error guardando ❌");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este turno? Los profesionales asignados quedarán sin turno.")) return;
    try {
      await supabase.from("turnos").delete().eq("id_turno", id);
      toast.success("Turno eliminado ✅");
      setModalOpen(false);
      setEditando(null);
      loadTurnos();
    } catch {
      toast.error("Error eliminando ❌");
    }
  };

  const filtrados = turnos.filter((t) => {
    const matchBusq =
      !busqueda || t.nombre_turno.toLowerCase().includes(busqueda.toLowerCase());
    const matchActivo =
      filtroActivo === "todos" ||
      (filtroActivo === "activo" && t.activo) ||
      (filtroActivo === "inactivo" && !t.activo);
    return matchBusq && matchActivo;
  });

  const activos = turnos.filter((t) => t.activo).length;

  return (
    <div className="p-6 lg:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">Turnos</h1>
          <p className="text-sm text-[var(--text-soft)] mt-0.5">
            {activos} activo{activos !== 1 ? "s" : ""} · {turnos.length} total
          </p>
        </div>
        <button
          onClick={() => { setEditando(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[var(--accent)] hover:opacity-90 transition"
        >
          <span className="text-base leading-none">+</span>
          Nuevo turno
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] w-48"
          placeholder="Buscar turno..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
          value={filtroActivo}
          onChange={(e) => setFiltroActivo(e.target.value as typeof filtroActivo)}
        >
          <option value="todos">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[var(--text-soft)] text-sm">
            Cargando...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-3xl">🕐</span>
            <p className="text-sm text-[var(--text-soft)]">No hay turnos registrados</p>
            <button
              onClick={() => { setEditando(null); setModalOpen(true); }}
              className="text-sm mt-1 underline"
              style={{ color: "var(--accent)" }}
            >
              Crear el primero
            </button>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-[var(--bg)]">
              <tr className="border-b border-[var(--border)]">
                {["Nombre", "Horario", "Jornada", "Días", "Día libre", "Estado", "Acciones"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((t, i) => {
                // Calcular jornada
                let jornada = "—";
                try {
                  const [hE, mE] = t.hora_entrada.split(":").map(Number);
                  const [hS, mS] = t.hora_salida.split(":").map(Number);
                  const mins = hS * 60 + mS - (hE * 60 + mE);
                  if (mins > 0) {
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;
                    jornada = m > 0 ? `${h}h ${m}min` : `${h}h`;
                  }
                } catch {}

                const diaLibreLabel = DIAS_SEMANA.find((d) => d.key === t.dia_libre)?.label;

                return (
                  <tr
                    key={t.id_turno}
                    className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)] transition ${
                      i % 2 === 0 ? "" : "bg-[var(--bg)]/30"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">{t.nombre_turno}</td>
                    <td className="px-4 py-3 text-[var(--text-soft)]">
                      {formatHora(t.hora_entrada)} – {formatHora(t.hora_salida)}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-soft)]">{jornada}</td>
                    <td className="px-4 py-3">
                      <DiaChips dias={t.dias_trabajo || []} />
                    </td>
                    <td className="px-4 py-3 text-[var(--text-soft)]">
                      {diaLibreLabel || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ActiveBadge activo={t.activo} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setEditando(t); setModalOpen(true); }}
                        className="px-3 py-1 rounded-lg text-xs border border-[var(--border)] hover:bg-[var(--bg)] transition"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <TurnoModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); }}
        onSave={handleSave}
        onDelete={handleDelete}
        inicial={editando || undefined}
        loading={saving}
      />
    </div>
  );
}

export default function PageWrapper() {
  return <DashboardLayout>{<TurnosPage />}</DashboardLayout>;
}
