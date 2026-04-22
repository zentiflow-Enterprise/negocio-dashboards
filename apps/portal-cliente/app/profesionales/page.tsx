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
  email: string | null;
  telefono: string | null;
  id_turno: string | null;
  id_especialidad: string | null;
  activo: boolean;
  creado_en: string;
}

interface Especialidad {
  id_especialidad: string;
  nombre: string;
  sector: string;
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

interface Servicio {
  id_servicio: string;
  negocio_id: string;
  nombre: string;
  duracion_min: number;
  precio: number;
  descripcion: string;
  color_hex: string;
  activo: boolean;
  creado_en?: string;
  id_especialidad?: string;
}

interface ProfesionalForm {
  nombre: string;
  email: string;
  telefono: string;
  id_turno: string;
  id_especialidad: string;
  activo: boolean;
}

interface Ausencia {
  id_bloqueo: string;
  profesional_id: string;
  negocio_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  todo_el_dia: boolean;
  motivo: string | null;
  creado_en: string;
}

const FORM_EMPTY: ProfesionalForm = {
  nombre: "",
  email: "",
  telefono: "",
  id_turno: "",
  id_especialidad: "",
  activo: true,
};

// Especialidades predefinidas por tipo de negocio
const ESPECIALIDADES_PREDEFINIDAS: Record<string, string[]> = {
  barberia: ["Barbero", "Estilista", "Colorista", "Barbero Junior", "Maestro Barbero"],
  salon_belleza: ["Estilista", "Colorista", "Manicurista", "Pedicurista", "Maquillador/a"],
  nutricion: ["Nutricionista", "Dietista", "Nutricionista Deportivo", "Nutricionista Clínico"],
  odontologia: ["Odontólogo General", "Ortodoncista", "Endodoncista", "Periodoncista", "Cirujano Maxilofacial"],
  estetica: ["Esteticista", "Cosmetóloga", "Masajista", "Especialista en Depilación", "Terapeuta Facial"],
  medicina: ["Médico General", "Especialista", "Enfermero/a", "Auxiliar"],
  psicologia: ["Psicólogo Clínico", "Psicólogo Infantil", "Terapeuta", "Psicólogo Organizacional"],
  fitness: ["Entrenador Personal", "Instructor de Yoga", "Instructor de Pilates", "Nutricionista Deportivo"],
  veterinaria: ["Veterinario", "Asistente Veterinario", "Cirujano Veterinario", "Especialista en Exóticos"],
  spa: ["Terapeuta de Masajes", "Esteticista", "Cosmetóloga", "Especialista en Tratamientos"],
};

function genId(prefix = "prof") {
  return `${prefix}_` + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Utilidad exportable: filtrar slots por ausencias ─────────────────────────
export function profesionalAusenteEnFecha(
  ausencias: Pick<Ausencia, "fecha_inicio" | "fecha_fin">[],
  fecha: Date | string
): boolean {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return ausencias.some((a) => {
    const inicio = new Date(a.fecha_inicio);
    const fin = new Date(a.fecha_fin);
    return d >= inicio && d <= fin;
  });
}

// ─── Iconos SVG ───────────────────────────────────────────────────────────────
function IconCalendarOff({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="m14 14-4 4M10 14l4 4" />
    </svg>
  );
}

function IconCalendarPlus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="M12 15v-3M10.5 13.5h3" />
    </svg>
  );
}

function IconCalendarClock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4M16 2v4" />
      <path d="M3 10h6M3 4h18v6H3z" />
      <circle cx="16" cy="16" r="6" />
      <path d="M16 13v3l2 1" />
    </svg>
  );
}

function IconBriefcase({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
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
      <span className={`w-1.5 h-1.5 rounded-full ${activo ? "bg-emerald-500" : "bg-gray-400"}`} />
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

function profesionalToForm(p: Profesional): ProfesionalForm & { id_profesional: string } {
  return {
    id_profesional: p.id_profesional,
    nombre: p.nombre ?? "",
    email: p.email ?? "",
    telefono: p.telefono ?? "",
    id_turno: p.id_turno ?? "",
    id_especialidad: p.id_especialidad ?? "",
    activo: p.activo,
  };
}

// ─── Modal de Ausencias (sin cambios) ────────────────────────────────────────
function AusenciasModal({
  open,
  onClose,
  profesional,
  negocioId,
}: {
  open: boolean;
  onClose: () => void;
  profesional: Profesional;
  negocioId: string;
}) {
  const supabase = createClient();
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [loadingAus, setLoadingAus] = useState(false);
  const [savingAus, setSavingAus] = useState(false);

  const [form, setForm] = useState({
    fecha_inicio: "",
    fecha_fin: "",
    motivoTipo: "" as "" | "vacaciones" | "incapacidad" | "capacitacion" | "injustificada" | "otro",
    motivoOtro: "",
    todo_el_dia: true,
  });

  const loadAusencias = useCallback(async () => {
    setLoadingAus(true);
    const { data } = await supabase
      .from("bloqueos_profesional")
      .select("*")
      .eq("id_profesional", profesional.id_profesional)
      .order("fecha_inicio", { ascending: false });
    setAusencias((data as Ausencia[]) || []);
    setLoadingAus(false);
  }, [profesional.id_profesional]);

  useEffect(() => {
    if (open) loadAusencias();
  }, [open, loadAusencias]);

  const handleGuardar = async () => {
    if (!form.fecha_inicio || !form.fecha_fin) {
      toast.error("Completá las fechas de inicio y fin");
      return;
    }
    if (new Date(form.fecha_fin) <= new Date(form.fecha_inicio)) {
      toast.error("La fecha fin debe ser posterior al inicio");
      return;
    }

    setSavingAus(true);
    try {
      const motivoFinal =
        form.motivoTipo === "otro"
          ? form.motivoOtro.trim() || null
          : form.motivoTipo === "vacaciones"
            ? "Vacaciones"
            : form.motivoTipo === "incapacidad"
              ? "Incapacidad"
              : form.motivoTipo === "capacitacion"
                ? "Capacitación"
                : form.motivoTipo === "injustificada"
                  ? "Injustificada"
                  : null;

      const { error } = await supabase.from("bloqueos_profesional").insert([
        {
          id_bloqueo: genId("blq"),
          negocio_id: negocioId,
          id_profesional: profesional.id_profesional,
          fecha_inicio: form.todo_el_dia
            ? form.fecha_inicio + "T00:00:00"
            : form.fecha_inicio,
          fecha_fin: form.todo_el_dia
            ? form.fecha_fin + "T23:59:59"
            : form.fecha_fin,
          todo_el_dia: form.todo_el_dia,
          motivo: motivoFinal,
        },
      ]);
      if (error) throw error;
      toast.success("Ausencia registrada ✅");
      setForm({ fecha_inicio: "", fecha_fin: "", motivoTipo: "", motivoOtro: "", todo_el_dia: true });
      loadAusencias();
    } catch {
      toast.error("Error registrando ausencia ❌");
    } finally {
      setSavingAus(false);
    }
  };

  const handleEliminar = async (id_bloqueo: string) => {
    if (!confirm("¿Eliminar esta ausencia?")) return;
    try {
      await supabase.from("bloqueos_profesional").delete().eq("id_bloqueo", id_bloqueo);
      toast.success("Ausencia eliminada ✅");
      loadAusencias();
    } catch {
      toast.error("Error eliminando ❌");
    }
  };

  const formatFecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-CR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const now = new Date();
  const vigentes = ausencias.filter((a) => new Date(a.fecha_fin) >= now);
  const pasadas = ausencias.filter((a) => new Date(a.fecha_fin) < now);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Avatar nombre={profesional.nombre} />
            <div>
              <h2 className="font-medium text-sm leading-tight">Ausencias</h2>
              <p className="text-[11px] text-[var(--text-soft)]">{profesional.nombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-[var(--bg-soft)] flex items-center justify-center text-[var(--text-soft)]"
          >
            ✕
          </button>
        </div>

        <div className="p-5 border-b border-[var(--border)] flex-shrink-0 flex flex-col gap-3">
          <p className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide">
            Registrar nueva ausencia
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[var(--text-soft)] mb-1 block">
                Fecha inicio *
              </label>
              <input
                type={form.todo_el_dia ? "date" : "datetime-local"}
                className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.fecha_inicio}
                onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--text-soft)] mb-1 block">
                Fecha fin *
              </label>
              <input
                type={form.todo_el_dia ? "date" : "datetime-local"}
                className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.fecha_fin}
                onChange={(e) => setForm((f) => ({ ...f, fecha_fin: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-[var(--text-soft)] mb-2 block">Motivo</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "vacaciones", label: "Vacaciones" },
                  { value: "incapacidad", label: "Incapacidad" },
                  { value: "capacitacion", label: "Capacitación" },
                  { value: "injustificada", label: "Injustificada" },
                  { value: "otro", label: "Otro" },
                ] as const
              ).map((op) => {
                const active = form.motivoTipo === op.value;
                return (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        motivoTipo: f.motivoTipo === op.value ? "" : op.value,
                        motivoOtro: op.value !== "otro" ? f.motivoOtro : f.motivoOtro,
                      }))
                    }
                    className={[
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs text-left transition",
                      op.value === "otro" ? "col-span-2" : "",
                      active
                        ? "border-[var(--accent)] bg-[var(--accent)]/8 text-[var(--accent)] font-medium"
                        : "border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text-soft)] hover:border-[var(--accent)]/40",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors",
                        active ? "border-[var(--accent)]" : "border-[var(--border)]",
                      ].join(" ")}
                    >
                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                      )}
                    </span>
                    {op.label}
                  </button>
                );
              })}
            </div>

            {form.motivoTipo === "otro" && (
              <input
                autoFocus
                className="mt-2 w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                placeholder="Describí el motivo..."
                value={form.motivoOtro}
                onChange={(e) => setForm((f) => ({ ...f, motivoOtro: e.target.value }))}
              />
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, todo_el_dia: !f.todo_el_dia }))}
              className="flex items-center gap-2 select-none group"
            >
              <span
                className={[
                  "relative inline-flex items-center w-8 h-5 rounded-full transition-colors flex-shrink-0",
                  form.todo_el_dia ? "bg-[var(--accent)]" : "bg-[var(--border)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-transform duration-200",
                    form.todo_el_dia ? "translate-x-[18px]" : "translate-x-[3px]",
                  ].join(" ")}
                />
              </span>
              <span className="text-xs text-[var(--text-soft)] group-hover:text-[var(--text)]">
                Todo el día
              </span>
            </button>

            <button
              onClick={handleGuardar}
              disabled={savingAus || !form.fecha_inicio || !form.fecha_fin}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition disabled:opacity-40 hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              {savingAus ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">
          {loadingAus ? (
            <p className="text-sm text-[var(--text-soft)] text-center py-4">Cargando...</p>
          ) : ausencias.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--text-soft)] opacity-50">
                <IconCalendarOff className="w-5 h-5" />
              </div>
              <p className="text-sm text-[var(--text-soft)]">Sin ausencias registradas</p>
            </div>
          ) : (
            <>
              {vigentes.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                    Vigentes · {vigentes.length}
                  </p>
                  {vigentes.map((a) => (
                    <AusenciaRow
                      key={a.id_bloqueo}
                      ausencia={a}
                      onDelete={handleEliminar}
                      formatFecha={formatFecha}
                      vigente
                    />
                  ))}
                </div>
              )}

              {pasadas.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                    Historial · {pasadas.length}
                  </p>
                  {pasadas.map((a) => (
                    <AusenciaRow
                      key={a.id_bloqueo}
                      ausencia={a}
                      onDelete={handleEliminar}
                      formatFecha={formatFecha}
                      vigente={false}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AusenciaRow({
  ausencia,
  onDelete,
  formatFecha,
  vigente,
}: {
  ausencia: Ausencia;
  onDelete: (id: string) => void;
  formatFecha: (iso: string) => string;
  vigente: boolean;
}) {
  const mismaFecha =
    new Date(ausencia.fecha_inicio).toDateString() ===
    new Date(ausencia.fecha_fin).toDateString();

  return (
    <div
      className={[
        "flex items-start justify-between gap-3 p-3 rounded-xl border text-sm",
        vigente
          ? "bg-amber-500/5 border-amber-400/25"
          : "bg-[var(--bg-soft)] border-[var(--border)] opacity-60",
      ].join(" ")}
    >
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <p className="text-xs font-medium leading-tight">
          {mismaFecha
            ? formatFecha(ausencia.fecha_inicio)
            : `${formatFecha(ausencia.fecha_inicio)} → ${formatFecha(ausencia.fecha_fin)}`}
          {ausencia.todo_el_dia && (
            <span className="ml-1.5 text-[10px] text-[var(--text-soft)]">(todo el día)</span>
          )}
        </p>

        <p className="text-[11px] text-[var(--text-soft)] truncate">
          {ausencia.motivo || "Sin motivo especificado"}
        </p>
      </div>

      <button
        onClick={() => onDelete(ausencia.id_bloqueo)}
        className="text-[11px] text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2 py-1 rounded-lg transition flex-shrink-0"
      >
        Eliminar
      </button>
    </div>
  );
}

// ─── Tarjeta Profesional CON ESPECIALIDAD ────────────────────────────────────
function ProfesionalCard({
  profesional,
  turnoNombre,
  especialidadNombre,
  onEdit,
  onAusencias,
  ausenciasCount,
}: {
  profesional: Profesional;
  turnoNombre?: string;
  especialidadNombre?: string;
  onEdit: (p: Profesional) => void;
  onAusencias: (p: Profesional) => void;
  ausenciasCount: number;
}) {
  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl flex flex-col gap-3 p-4 hover:border-[var(--accent)]/40 transition-all duration-150 h-full">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar nombre={profesional.nombre} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-tight line-clamp-1">{profesional.nombre}</p>
              {especialidadNombre && (
                <p className="text-[10px] text-[var(--accent)] font-medium flex items-center gap-1 mt-0.5">
                  <IconBriefcase className="w-3 h-3" />
                  {especialidadNombre}
                </p>
              )}
            </div>
          </div>
          <ActiveBadge activo={profesional.activo} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-[var(--text-soft)] truncate flex-1 min-w-0">
            {profesional.email || "Sin email"}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => onEdit(profesional)}
              className="px-2.5 py-1 rounded-lg text-[11px] border border-[var(--border)] hover:bg-[var(--bg-soft)] transition whitespace-nowrap"
            >
              Editar
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border)]" />

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div>
          <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide">Teléfono</p>
          <p className="font-mono text-[var(--text-soft)]">{profesional.telefono || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide">Turno</p>
          <p className="text-[var(--text-soft)]">{turnoNombre || "Sin turno asignado"}</p>
        </div>
      </div>

      <button
        onClick={() => onAusencias(profesional)}
        className={[
          "w-full mt-auto flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] border transition",
          ausenciasCount > 0
            ? "border-amber-400/40 bg-amber-500/5 text-amber-600 hover:bg-amber-500/10"
            : "border-[var(--border)] text-[var(--text-soft)] hover:bg-[var(--bg-soft)]",
        ].join(" ")}
      >
        {ausenciasCount > 0
          ? <IconCalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
          : <IconCalendarPlus className="w-3.5 h-3.5 flex-shrink-0" />}
        {ausenciasCount > 0
          ? `${ausenciasCount} ausencia${ausenciasCount !== 1 ? "s" : ""} vigente${ausenciasCount !== 1 ? "s" : ""}`
          : "Registrar ausencia"}
      </button>
    </div>
  );
}

// ─── Modal Profesional CON ESPECIALIDAD ──────────────────────────────────────
function ProfesionalModal({
  open,
  onClose,
  onSave,
  onDelete,
  turnos,
  especialidades,
  inicial,
  loading,
  negocioTipo,
  onCrearEspecialidad,

}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: ProfesionalForm, id?: string, serviciosIds?: string[]) => void;
  onDelete?: (id: string) => void;
  turnos: Turno[];
  especialidades: Especialidad[];
  inicial?: Partial<ProfesionalForm> & { id_profesional?: string };
  loading: boolean;
  negocioTipo?: string;
  onCrearEspecialidad: () => void;


}) {
  const [form, setForm] = useState<ProfesionalForm>({ ...FORM_EMPTY, ...inicial });
  const [servicios, setServicios] = useState<any[]>([]);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([]);

  useEffect(() => {
    setForm({ ...FORM_EMPTY, ...inicial });
  }, [inicial, open]);
  useEffect(() => {
    const loadServicios = async () => {
      if (!form.id_especialidad) return;

      const supabase = createClient();

      const { data } = await supabase
        .from("servicios")
        .select("*")
        .eq("id_especialidad", form.id_especialidad)
        .eq("activo", true);

      setServicios(data || []);
    };

    loadServicios();
  }, [form.id_especialidad]);

  if (!open) return null;

  const set = (k: keyof ProfesionalForm, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] flex-shrink-0">
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

        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
          <div className="flex items-center gap-3">
            <Avatar nombre={form.nombre || "?"} />
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

          {/* SELECTOR DE ESPECIALIDAD */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-[var(--text-soft)]">Especialidad / Puesto *</label>
              <button
                type="button"
                onClick={onCrearEspecialidad}
                className="text-[10px] text-[var(--accent)] hover:underline"
              >
                + Crear nueva
              </button>
            </div>
            <select
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              value={form.id_especialidad}
              onChange={(e) => set("id_especialidad", e.target.value)}
            >
              <option value="">Seleccionar especialidad...</option>
              {especialidades.map((esp) => (
                <option key={esp.id_especialidad} value={esp.id_especialidad}>
                  {esp.nombre}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[var(--text-soft)] mt-1">
              Define el rol o puesto del profesional (ej: Barbero, Nutricionista, Estilista)
            </p>
          </div>
          {/* SERVICIOS SEGÚN ESPECIALIDAD */}
          {form.id_especialidad && (
            <div>
              <label className="text-xs text-[var(--text-soft)] mb-2 block">
                Servicios que puede realizar
              </label>

              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto border border-[var(--border)] rounded-lg p-2">
                {servicios.map((s) => (
                  <label
                    key={s.id_servicio}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={serviciosSeleccionados.includes(s.id_servicio)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setServiciosSeleccionados((prev) => [...prev, s.id_servicio]);
                        } else {
                          setServiciosSeleccionados((prev) =>
                            prev.filter((id) => id !== s.id_servicio)
                          );
                        }
                      }}
                    />
                    {s.nombre}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-soft)] mb-1 block">Email</label>
              <input
                type="email"
                className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                placeholder="correo@ejemplo.com"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-soft)] mb-1 block">Teléfono</label>
              <input
                type="tel"
                className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                placeholder="8888-8888"
                value={form.telefono ?? ""}
                onChange={(e) => set("telefono", e.target.value)}
              />
            </div>
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
              className={`relative w-11 h-6 rounded-full transition-colors ${form.activo ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.activo ? "translate-x-5.5" : ""
                  }`}
              />
            </button>
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-[var(--border)] flex-shrink-0">
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
            onClick={() => onSave(form, inicial?.id_profesional, serviciosSeleccionados)}
            disabled={loading || !form.nombre.trim() || !form.id_especialidad}
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

// ─── Modal Gestión de Especialidades ─────────────────────────────────────────
function EspecialidadesModal({
  open,
  onClose,
  especialidades,
  negocioTipo,
  onReload,
  negocioId,
}: {
  open: boolean;
  onClose: () => void;
  especialidades: Especialidad[];
  negocioTipo?: string;
  onReload: () => void;
  negocioId: string;
}) {
  const supabase = createClient();
  const [nuevaEsp, setNuevaEsp] = useState("");
  const [saving, setSaving] = useState(false);

  const predefinidas = negocioTipo ? ESPECIALIDADES_PREDEFINIDAS[negocioTipo] || [] : [];

  const handleCrear = async () => {
    if (!nuevaEsp.trim()) {
      toast.error("Ingresá el nombre de la especialidad");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("especialidades").insert([
        {
          id_especialidad: genId("esp"),
          negocio_id: negocioId,
          nombre: nuevaEsp.trim(),
          sector: negocioTipo || "general",
          activo: true,
        },
      ]);
      if (error) throw error;
      toast.success("Especialidad creada ✅");
      setNuevaEsp("");
      onReload();
    } catch {
      toast.error("Error creando especialidad ❌");
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta especialidad? Los profesionales asignados quedarán sin especialidad.")) return;
    try {
      await supabase.from("especialidades").delete().eq("id_especialidad", id);
      toast.success("Especialidad eliminada ✅");
      onReload();
    } catch {
      toast.error("Error eliminando ❌");
    }
  };

  const handleCrearPredefinida = async (nombre: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("especialidades").insert([
        {
          id_especialidad: genId("esp"),
          nombre,
          sector: negocioTipo || "general",
          activo: true,
          negocio_id: negocioId,
        },
      ]);
      if (error) throw error;
      toast.success(`"${nombre}" agregada ✅`);
      onReload();
    } catch (err) {
      console.error("ERROR CREANDO ESPECIALIDAD:", err);
      toast.error("Error creando especialidad ❌");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const existentes = especialidades.map((e) => e.nombre.toLowerCase());
  const predisponibles = predefinidas.filter((p) => !existentes.includes(p.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] flex-shrink-0">
          <div>
            <h2 className="font-medium text-base">Gestionar especialidades</h2>
            <p className="text-[11px] text-[var(--text-soft)] mt-0.5">
              Define los roles o puestos de tus profesionales
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-[var(--bg-soft)] flex items-center justify-center text-[var(--text-soft)]"
          >
            ✕
          </button>
        </div>

        <div className="p-5 border-b border-[var(--border)] flex-shrink-0 flex flex-col gap-3">
          <p className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide">
            Crear nueva especialidad
          </p>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="Ej: Barbero Senior, Nutricionista Deportivo..."
              value={nuevaEsp}
              onChange={(e) => setNuevaEsp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCrear()}
            />
            <button
              onClick={handleCrear}
              disabled={saving || !nuevaEsp.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              Crear
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">
          {/* Especialidades existentes */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-soft)] mb-2">
              Tus especialidades · {especialidades.length}
            </p>
            {especialidades.length === 0 ? (
              <p className="text-sm text-[var(--text-soft)] text-center py-4">
                No hay especialidades creadas aún
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {especialidades.map((esp) => (
                  <div
                    key={esp.id_especialidad}
                    className="flex items-center justify-between p-3 bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <IconBriefcase className="w-4 h-4 text-[var(--accent)]" />
                      <span className="text-sm font-medium">{esp.nombre}</span>
                    </div>
                    <button
                      onClick={() => handleEliminar(esp.id_especialidad)}
                      className="text-[11px] text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2 py-1 rounded-lg transition"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sugerencias predefinidas */}
          {predisponibles.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-soft)] mb-2">
                Sugerencias para {negocioTipo?.replace("_", " ")}
              </p>
              <div className="flex flex-wrap gap-2">
                {predisponibles.map((nombre) => (
                  <button
                    key={nombre}
                    onClick={() => handleCrearPredefinida(nombre)}
                    disabled={saving}
                    className="px-3 py-1.5 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg text-xs text-[var(--accent)] hover:bg-[var(--accent)]/20 transition disabled:opacity-40"
                  >
                    + {nombre}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal MEJORADA ────────────────────────────────────────────────
function ProfesionalesPage() {


  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([]);


  const supabase = createClient();
  const { negocio } = useNegocio();

  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  const [ausenciasVigentes, setAusenciasVigentes] = useState<Record<string, number>>({});

  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "activo" | "inactivo">("todos");
  const [filtroEspecialidad, setFiltroEspecialidad] = useState<string>("todas");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Profesional | null>(null);


  const [ausenciasModal, setAusenciasModal] = useState<Profesional | null>(null);
  const [especialidadesModalOpen, setEspecialidadesModalOpen] = useState(false);

  useEffect(() => {
    console.log("SERVICIOS CARGADOS:", servicios);
  }, [servicios]);

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

  const loadServicios = async () => {
    if (!negocio?.id) return;

    const { data } = await supabase
      .from("servicios")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("nombre");

    setServicios(data || []);
  };

  const loadServiciosProfesional = async (profId: string) => {
    const { data } = await supabase
      .from("profesional_servicios")
      .select("servicio_id")
      .eq("profesional_id", profId);

    setServiciosSeleccionados(data?.map((d) => d.servicio_id) || []);
  };

  const loadEspecialidades = useCallback(async () => {
    const { data } = await supabase
      .from("especialidades")
      .select("*")
      .eq("activo", true)
      .order("nombre", { ascending: true });
    setEspecialidades((data as Especialidad[]) || []);
  }, []);

  const loadAusenciasVigentes = useCallback(async () => {
    if (!negocio?.id) return;
    const ahora = new Date().toISOString();
    const { data } = await supabase
      .from("bloqueos_profesional")
      .select("id_profesional")
      .eq("negocio_id", negocio.id)
      .gte("fecha_fin", ahora);
    const counts: Record<string, number> = {};
    (data || []).forEach((r: { id_profesional: string }) => {
      counts[r.id_profesional] = (counts[r.id_profesional] || 0) + 1;
    });
    setAusenciasVigentes(counts);
  }, [negocio?.id]);

  useEffect(() => {
    if (!editando?.id_profesional) return;

    const load = async () => {
      await loadServiciosProfesional(editando.id_profesional);
    };

    load();
  }, [editando]);

  useEffect(() => {
    if (!negocio?.id) return;
    loadProfesionales();
    loadEspecialidades();
    loadServicios();
    loadAusenciasVigentes();
    supabase
      .from("turnos")
      .select("id_turno, nombre_turno, hora_entrada, hora_salida, dias_trabajo, activo")
      .eq("negocio_id", negocio.id)
      .eq("activo", true)
      .then(({ data }) => setTurnos((data as Turno[]) || []));
  }, [negocio?.id, loadProfesionales, loadEspecialidades, loadAusenciasVigentes]);

  const handleSave = async (form: ProfesionalForm, id?: string, serviciosIds: string[] = []) => {
    if (!negocio?.id) return;

    setSaving(true);

    try {
      let profesionalId = id;

      if (id) {
        await supabase
          .from("profesionales")
          .update({ ...form })
          .eq("id_profesional", id);
      } else {
        const nuevoId = "PROF_" + Date.now().toString(36);

        await supabase.from("profesionales").insert([
          {
            ...form,
            id_profesional: nuevoId,
            negocio_id: negocio.id,
          },
        ]);

        profesionalId = nuevoId;
      }

      // 🧠 BORRAR RELACIONES ANTERIORES
      await supabase
        .from("profesional_servicios")
        .delete()
        .eq("profesional_id", profesionalId);

      // 🚀 INSERTAR NUEVAS
      if (serviciosIds.length > 0) {
        const inserts = serviciosIds.map((servicioId) => ({
          profesional_id: profesionalId,
          servicio_id: servicioId,
        }));

        await supabase.from("profesional_servicios").insert(inserts);
      }

      toast.success("Profesional guardado ✅");

      setModalOpen(false);
      setEditando(null);
      loadProfesionales();

    } catch (err) {
      console.error(err);
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

  const getEspecialidadNombre = (id_especialidad: string) =>
    especialidades.find((e) => e.id_especialidad === id_especialidad)?.nombre;

  const filtrados = profesionales.filter((p) => {
    const matchBusq =
      !busqueda ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.email?.toLowerCase().includes(busqueda.toLowerCase());
    const matchActivo =
      filtroActivo === "todos" ||
      (filtroActivo === "activo" && p.activo) ||
      (filtroActivo === "inactivo" && !p.activo);
    const matchEsp =
      filtroEspecialidad === "todas" ||
      p.id_especialidad === filtroEspecialidad;
    return matchBusq && matchActivo && matchEsp;
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
        <div className="flex gap-2">
          <button
            onClick={() => setEspecialidadesModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] hover:bg-[var(--bg-soft)] transition"
          >
            <IconBriefcase className="w-4 h-4" />
            Especialidades
          </button>
          <button
            onClick={() => {
              setEditando(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition"
            style={{ background: "var(--accent)" }}
          >
            <span className="text-base leading-none">+</span>
            Nuevo profesional
          </button>
        </div>
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
          value={filtroEspecialidad}
          onChange={(e) => setFiltroEspecialidad(e.target.value)}
        >
          <option value="todas">Todas las especialidades</option>
          {especialidades.map((esp) => (
            <option key={esp.id_especialidad} value={esp.id_especialidad}>
              {esp.nombre}
            </option>
          ))}
        </select>

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
          {filtrados.map((p) => (
            <ProfesionalCard
              key={p.id_profesional}
              profesional={p}
              turnoNombre={getTurnoNombre(p.id_turno ?? "")}
              especialidadNombre={getEspecialidadNombre(p.id_especialidad ?? "")}
              onEdit={(p) => {
                setEditando(p);
                setModalOpen(true);

                loadServiciosProfesional(p.id_profesional);
              }}
              onAusencias={(p) => setAusenciasModal(p)}
              ausenciasCount={ausenciasVigentes[p.id_profesional] || 0}
            />
          ))}
        </div>
      )}

      {/* Modal editar/crear profesional */}
      <ProfesionalModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditando(null);
        }}
        onSave={handleSave}
        onDelete={handleDelete}
        turnos={turnos}
        especialidades={especialidades}
        inicial={editando ? profesionalToForm(editando) : undefined}
        loading={saving}
        negocioTipo={negocio?.neg_tipo}
        onCrearEspecialidad={() => {
          setModalOpen(false);
          setEspecialidadesModalOpen(true);
        }}


      />

      {/* Modal ausencias */}
      {ausenciasModal && negocio?.id && (
        <AusenciasModal
          open={!!ausenciasModal}
          onClose={() => {
            setAusenciasModal(null);
            loadAusenciasVigentes();
          }}
          profesional={ausenciasModal}
          negocioId={negocio.id}
        />
      )}

      {/* Modal especialidades */}
      {negocio?.id && (
        <EspecialidadesModal
          open={especialidadesModalOpen}
          onClose={() => {
            setEspecialidadesModalOpen(false);
            if (editando) setModalOpen(true);
          }}
          especialidades={especialidades}
          negocioTipo={negocio.neg_tipo}
          onReload={loadEspecialidades}
          negocioId={negocio.id}
        />
      )}
    </div>
  );
}

export default function PageWrapper() {
  return <DashboardLayout>{<ProfesionalesPage />}</DashboardLayout>;
}
