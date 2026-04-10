"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/lib/client";
import { useNegocio } from "@/lib/hooks/useNegocio";
import DashboardLayout from "../dashboard/layout";
import toast from "react-hot-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Profesional {
  id_profesional: string;
  negocio_id: string;
  nombre: string;
  email: string;
  telefono: string;
  foto_url: string;
  id_turno: string;
  activo: boolean;
  creado_en: string;
}

interface Turno {
  id_turno: string;
  nombre_turno: string;
  hora_entrada: string;
  hora_salida: string;
  dias_trabajo: string[];
  activo: boolean;
}

interface ProfesionalForm {
  nombre: string;
  email: string;
  telefono: string;
  foto_url: string;
  id_turno: string;
  activo: boolean;
}

const FORM_EMPTY: ProfesionalForm = {
  nombre: "",
  email: "",
  telefono: "",
  foto_url: "",
  id_turno: "",
  activo: true,
};

function genId() {
  return "prof_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ nombre, foto_url }: { nombre: string; foto_url?: string }) {
  if (foto_url) {
    return (
      <img
        src={foto_url}
        alt={nombre}
        className="w-9 h-9 rounded-full object-cover border border-[var(--border)] flex-shrink-0"
      />
    );
  }
  const initials = nombre
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
      style={{ background: "var(--accent)" }}
    >
      {initials}
    </div>
  );
}

// ─── Badge activo ─────────────────────────────────────────────────────────────
function ActiveBadge({ activo }: { activo: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-medium border",
        activo
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
          : "bg-gray-500/10 text-gray-400 border-gray-400/20",
      ].join(" ")}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${activo ? "bg-emerald-500" : "bg-gray-400"}`}
      />
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

// ─── Tarjeta Profesional (compacta) ───────────────────────────────────────────
function ProfesionalCard({
  profesional,
  turnoNombre,
  onEdit,
}: {
  profesional: Profesional;
  turnoNombre?: string;
  onEdit: (p: Profesional) => void;
}) {
  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl flex flex-col gap-3 p-4 hover:border-[var(--accent)]/40 transition-all duration-150 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Avatar nombre={profesional.nombre} foto_url={profesional.foto_url} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm leading-tight truncate">{profesional.nombre}</p>
            <p className="text-[11px] text-[var(--text-soft)] mt-0.5">
              {profesional.email || "Sin email"}
            </p>
          </div>
        </div>

        {/* Estado + Editar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ActiveBadge activo={profesional.activo} />
          <button
            onClick={() => onEdit(profesional)}
            className="px-2.5 py-1 rounded-lg text-[11px] border border-[var(--border)] hover:bg-[var(--bg-soft)] transition whitespace-nowrap"
          >
            Editar
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* Información */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div>
          <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide">Teléfono</p>
          <p className="font-mono text-[var(--text-soft)]">{profesional.telefono || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide">Turno</p>
          <p className="text-[var(--text-soft)]">
            {turnoNombre || "Sin turno asignado"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Modal (sin cambios mayores) ──────────────────────────────────────────────
function ProfesionalModal({
  open,
  onClose,
  onSave,
  onDelete,
  turnos,
  inicial,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: ProfesionalForm, id?: string) => void;
  onDelete?: (id: string) => void;
  turnos: Turno[];
  inicial?: Partial<ProfesionalForm> & { id_profesional?: string };
  loading: boolean;
}) {
  const [form, setForm] = useState<ProfesionalForm>({ ...FORM_EMPTY, ...inicial });

  useEffect(() => {
    setForm({ ...FORM_EMPTY, ...inicial });
  }, [inicial, open]);

  if (!open) return null;

  const set = (k: keyof ProfesionalForm, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="font-medium text-base">
            {inicial?.id_profesional ? "Editar profesional" : "Nuevo profesional"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-[var(--bg-soft)] flex items-center justify-center text-[var(--text-soft)]"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar nombre={form.nombre || "?"} foto_url={form.foto_url} />
            <span className="text-sm text-[var(--text-soft)]">
              {form.nombre || "Nombre del profesional"}
            </span>
          </div>

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Nombre *</label>
            <input
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="Ej. María González"
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-soft)] mb-1 block">Email</label>
              <input
                type="email"
                className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                placeholder="correo@ejemplo.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-soft)] mb-1 block">Teléfono</label>
              <input
                type="tel"
                className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                placeholder="8888-8888"
                value={form.telefono}
                onChange={(e) => set("telefono", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">URL de foto (opcional)</label>
            <input
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="https://..."
              value={form.foto_url}
              onChange={(e) => set("foto_url", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Turno asignado</label>
            <select
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              value={form.id_turno}
              onChange={(e) => set("id_turno", e.target.value)}
            >
              <option value="">Sin turno asignado</option>
              {turnos.map((t) => (
                <option key={t.id_turno} value={t.id_turno}>
                  {t.nombre_turno} · {t.hora_entrada?.slice(0, 5)} – {t.hora_salida?.slice(0, 5)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between bg-[var(--bg-soft)] rounded-lg px-3 py-2">
            <span className="text-sm">Profesional activo</span>
            <button
              type="button"
              onClick={() => set("activo", !form.activo)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.activo ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.activo ? "translate-x-5.5" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-[var(--border)]">
          {inicial?.id_profesional && onDelete && (
            <button
              onClick={() => onDelete(inicial.id_profesional!)}
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
            onClick={() => onSave(form, inicial?.id_profesional)}
            disabled={loading || !form.nombre.trim()}
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
function ProfesionalesPage() {
  const supabase = createClient();
  const { negocio } = useNegocio();

  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "activo" | "inactivo">("todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Profesional | null>(null);

  const loadProfesionales = useCallback(async () => {
    if (!negocio?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("profesionales")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("nombre", { ascending: true });
    setProfesionales((data as Profesional[]) || []);
    setLoading(false);
  }, [negocio?.id]);

  useEffect(() => {
    if (!negocio?.id) return;
    loadProfesionales();
    supabase
      .from("turnos")
      .select("id_turno, nombre_turno, hora_entrada, hora_salida, dias_trabajo, activo")
      .eq("negocio_id", negocio.id)
      .eq("activo", true)
      .then(({ data }) => setTurnos((data as Turno[]) || []));
  }, [negocio?.id, loadProfesionales]);

  const handleSave = async (form: ProfesionalForm, id?: string) => {
    if (!negocio?.id) return;
    setSaving(true);
    try {
      if (id) {
        await supabase.from("profesionales").update({ ...form }).eq("id_profesional", id);
        toast.success("Profesional actualizado ✅");
      } else {
        await supabase.from("profesionales").insert([
          { ...form, id_profesional: genId(), negocio_id: negocio.id },
        ]);
        toast.success("Profesional creado ✅");
      }
      setModalOpen(false);
      setEditando(null);
      loadProfesionales();
    } catch {
      toast.error("Error guardando ❌");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este profesional permanentemente?")) return;
    try {
      await supabase.from("profesionales").delete().eq("id_profesional", id);
      toast.success("Profesional eliminado ✅");
      setModalOpen(false);
      setEditando(null);
      loadProfesionales();
    } catch {
      toast.error("Error eliminando ❌");
    }
  };

  const getTurnoNombre = (id_turno: string) =>
    turnos.find((t) => t.id_turno === id_turno)?.nombre_turno;

  const filtrados = profesionales.filter((p) => {
    const matchBusq =
      !busqueda ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.email?.toLowerCase().includes(busqueda.toLowerCase());
    const matchActivo =
      filtroActivo === "todos" ||
      (filtroActivo === "activo" && p.activo) ||
      (filtroActivo === "inactivo" && !p.activo);
    return matchBusq && matchActivo;
  });

  const activos = profesionales.filter((p) => p.activo).length;

  return (
    <div className="p-6 lg:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">Profesionales</h1>
          <p className="text-sm text-[var(--text-soft)] mt-0.5">
            {activos} activo{activos !== 1 ? "s" : ""} · {profesionales.length} total
          </p>
        </div>
        <button
          onClick={() => { setEditando(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition"
          style={{ background: "var(--accent)" }}
        >
          <span className="text-base leading-none">+</span>
          Nuevo profesional
        </button>
      </div>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] w-full sm:w-72"
          placeholder="Buscar por nombre o email..."
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

        <span className="text-xs text-[var(--text-soft)] ml-auto whitespace-nowrap">
          {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tarjetas */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--text-soft)] text-sm">
          Cargando profesionales...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl">
          <span className="text-4xl opacity-30">👤</span>
          <p className="text-sm text-[var(--text-soft)]">No se encontraron profesionales</p>
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filtrados.map((p) => {
            const turnoNombre = getTurnoNombre(p.id_turno);
            return (
              <ProfesionalCard
                key={p.id_profesional}
                profesional={p}
                turnoNombre={turnoNombre}
                onEdit={(p) => { setEditando(p); setModalOpen(true); }}
              />
            );
          })}
        </div>
      )}

      {/* Modal */}
      <ProfesionalModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); }}
        onSave={handleSave}
        onDelete={handleDelete}
        turnos={turnos}
        inicial={editando || undefined}
        loading={saving}
      />
    </div>
  );
}

export default function PageWrapper() {
  return <DashboardLayout>{<ProfesionalesPage />}</DashboardLayout>;
}