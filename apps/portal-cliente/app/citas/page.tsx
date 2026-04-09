"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/lib/client";
import { useNegocio } from "@/lib/hooks/useNegocio";
import DashboardLayout from "../dashboard/layout";
import toast from "react-hot-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Cita {
  id_cita: string;
  nombre_cliente: string;
  nombre_profesional: string;
  nombre_servicio: string;
  id_profesional: string;
  id_servicio: string;
  id_cliente: string;
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
}

interface Servicio {
  id_servicio: string;
  nombre: string;
  duracion_min: number;
  precio: number;
  activo: boolean;
}

interface CitaForm {
  nombre_cliente: string;
  id_profesional: string;
  id_servicio: string;
  fecha: string;
  hora: string;
  notas: string;
}

const FORM_EMPTY: CitaForm = {
  nombre_cliente: "",
  id_profesional: "",
  id_servicio: "",
  fecha: "",
  hora: "",
  notas: "",
};

// Colores por estado (como solicitaste)
const ESTADO_COLOR: Record<string, string> = {
  Agendada: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  Reprogramada: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  Cancelada: "bg-red-500/10 text-red-600 border-red-500/30",
  Finalizada: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  Pendiente: "bg-purple-500/10 text-purple-600 border-purple-500/30",
};

function EstadoBadge({ estado }: { estado: string }) {
  const colorClass = ESTADO_COLOR[estado] || "bg-gray-500/10 text-gray-400 border-gray-400/20";
  return (
    <span className={`text-xs px-3 py-1 rounded-full font-medium border capitalize ${colorClass}`}>
      {estado}
    </span>
  );
}

function formatFecha(fecha: string) {
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(fecha));
}

function formatHora(hora: string) {
  if (!hora) return "";
  const [hh, mm] = hora.split(":").map(Number);
  const date = new Date();
  date.setHours(hh ?? 0, mm ?? 0);
  return date.toLocaleTimeString("es-CR", { hour: "numeric", minute: "2-digit", hour12: true });
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function CitaModal({
  open,
  onClose,
  onSave,
  profesionales,
  servicios,
  inicial,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: CitaForm, id?: string) => void;
  profesionales: Profesional[];
  servicios: Servicio[];
  inicial?: Partial<CitaForm> & { id_cita?: string };
  loading: boolean;
}) {
  const [form, setForm] = useState<CitaForm>({ ...FORM_EMPTY, ...inicial });

  useEffect(() => {
    setForm({ ...FORM_EMPTY, ...inicial });
  }, [inicial, open]);

  if (!open) return null;

  const set = (k: keyof CitaForm, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const servSel = servicios.find((s) => s.id_servicio === form.id_servicio);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="font-medium text-base">
            {inicial?.id_cita ? "Reprogramar cita" : "Nueva cita"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-[var(--bg-soft)] flex items-center justify-center text-[var(--text-soft)]">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Nombre del cliente *</label>
            <input
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="Juan Pérez"
              value={form.nombre_cliente}
              onChange={(e) => set("nombre_cliente", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Profesional</label>
            <select
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              value={form.id_profesional}
              onChange={(e) => set("id_profesional", e.target.value)}
            >
              <option value="">Seleccionar profesional...</option>
              {profesionales.map((p) => (
                <option key={p.id_profesional} value={p.id_profesional}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Servicio</label>
            <select
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              value={form.id_servicio}
              onChange={(e) => set("id_servicio", e.target.value)}
            >
              <option value="">Seleccionar servicio...</option>
              {servicios.map((s) => (
                <option key={s.id_servicio} value={s.id_servicio}>
                  {s.nombre} — {s.duracion_min} min
                </option>
              ))}
            </select>
            {servSel && (
              <p className="text-xs text-[var(--text-soft)] mt-1">
                ₡{Number(servSel.precio).toLocaleString("es-CR")} • {servSel.duracion_min} min
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-soft)] mb-1 block">Fecha</label>
              <input type="date" className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-soft)] mb-1 block">Hora</label>
              <input type="time" className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm" value={form.hora} onChange={(e) => set("hora", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Notas (opcional)</label>
            <textarea
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm resize-none"
              rows={3}
              placeholder="Observaciones adicionales..."
              value={form.notas}
              onChange={(e) => set("notas", e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-[var(--border)]">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg-soft)] transition">Cancelar</button>
          <button
            onClick={() => onSave(form, inicial?.id_cita)}
            disabled={loading || !form.nombre_cliente || !form.id_profesional || !form.id_servicio || !form.fecha || !form.hora}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            {loading ? "Guardando..." : inicial?.id_cita ? "Reprogramar cita" : "Crear cita"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
function CitasOperativasPage() {
  const supabase = createClient();
  const { negocio } = useNegocio();

  const [citas, setCitas] = useState<Cita[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "Agendada" | "Reprogramada" | "Pendiente" | "Cancelada">("todos");
  const [filtroFecha, setFiltroFecha] = useState<"hoy" | "semana" | "mes">("hoy");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Cita | null>(null);

  const loadCitas = useCallback(async () => {
    if (!negocio?.id) return;
    setLoading(true);

    let query = supabase
      .from("v_citas_operativas")
      .select("*")
      .eq("negocio_id", negocio.id);

    const hoy = new Date().toISOString().split("T")[0] ?? "";
    let fechaInicio: string | null = null;

    if (filtroFecha === "hoy") {
      query = query.eq("fecha", hoy);
    } else if (filtroFecha === "semana") {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - 7);
      fechaInicio = fecha.toISOString().split("T")[0] ?? null;
      query = query.gte("fecha", fechaInicio ?? "");
    } else if (filtroFecha === "mes") {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - 1);
      fechaInicio = fecha.toISOString().split("T")[0] ?? null;
      query = query.gte("fecha", fechaInicio ?? "");
    }


    const { data } = await query.order("fecha", { ascending: true }).order("hora", { ascending: true });

    setCitas((data as Cita[]) || []);
    setLoading(false);
  }, [negocio?.id, filtroFecha]);

  useEffect(() => {
    if (!negocio?.id) return;
    loadCitas();

    // Cargar profesionales y servicios activos carga
    supabase
      .from("profesionales")
      .select("id_profesional, nombre, activo")
      .eq("negocio_id", negocio.id)
      .eq("activo", true)
      .then(({ data }) => setProfesionales((data as Profesional[]) || []));

    supabase
      .from("servicios")
      .select("id_servicio, nombre, duracion_min, precio, activo")
      .eq("negocio_id", negocio.id)
      .eq("activo", true)
      .then(({ data }) => setServicios((data as Servicio[]) || []));
  }, [negocio?.id, loadCitas]);

  const handleSave = async (form: CitaForm, id?: string) => {
    if (!negocio?.id) return;
    setSaving(true);
    try {
      if (id) {
        await supabase.from("citas").update({ ...form, estado: "Reprogramada" }).eq("id_cita", id);
        toast.success("Cita reprogramada ✅");
      } else {
        await supabase.from("citas").insert([
          { ...form, id_cita: "cita_" + Date.now().toString(36), negocio_id: negocio.id, estado: "Agendada" }
        ]);
        toast.success("Cita creada ✅");
      }
      setModalOpen(false);
      setEditando(null);
      loadCitas();
    } catch (e) {
      toast.error("Error al guardar ❌");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelar = async (id: string) => {
    if (!confirm("¿Cancelar esta cita?")) return;
    try {
      await supabase.from("citas").update({ estado: "Cancelada" }).eq("id_cita", id);
      toast.success("Cita cancelada ✅");
      loadCitas();
    } catch {
      toast.error("Error al cancelar ❌");
    }
  };

  const handleFinalizar = async (id: string) => {
    if (!confirm("¿Marcar esta cita como finalizada?")) return;
    try {
      await supabase.from("citas").update({ estado: "Finalizada" }).eq("id_cita", id);
      toast.success("Cita finalizada ✅");
      loadCitas();
    } catch {
      toast.error("Error al finalizar ❌");
    }
  };

  const citasFiltradas = citas.filter((c) => {
    const matchBusq = !busqueda ||
      c.nombre_cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.nombre_servicio.toLowerCase().includes(busqueda.toLowerCase());

    const matchEstado = filtroEstado === "todos" || c.estado === filtroEstado;

    return matchBusq && matchEstado;
  });

  return (
    <div className="p-6 lg:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">Citas Operativas</h1>
          <p className="text-sm text-[var(--text-soft)]">Gestión diaria • Agendar, reprogramar y atender</p>
        </div>
        <button
          onClick={() => { setEditando(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[var(--accent)] hover:opacity-90 transition"
        >
          <span className="text-base leading-none">+</span> Nueva cita
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] w-72"
          placeholder="Buscar cliente o servicio..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as any)}
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="todos">Todos los estados</option>
          <option value="Agendada">Agendada</option>
          <option value="Reprogramada">Reprogramada</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Cancelada">Canceladas</option>
        </select>

        <select
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value as "hoy" | "semana" | "mes")}
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="hoy">Hoy</option>
          <option value="semana">Última semana</option>
          <option value="mes">Último mes</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-[var(--text-soft)]">Cargando citas...</div>
        ) : citasFiltradas.length === 0 ? (
          <div className="py-16 text-center">
            <span className="text-3xl block mb-2">📅</span>
            <p className="text-[var(--text-soft)]">No hay citas para los filtros seleccionados</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-[var(--bg)]">
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase">Hora</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase">Servicio</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase">Profesional</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase">Estado</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {citasFiltradas.map((c, i) => (
                <tr key={c.id_cita} className={`border-b border-[var(--border)] hover:bg-[var(--bg)] transition ${i % 2 === 1 ? "bg-[var(--bg)]/30" : ""}`}>
                  <td className="px-4 py-3 font-medium">{formatFecha(c.fecha)}</td>
                  <td className="px-4 py-3">{formatHora(c.hora)}</td>
                  <td className="px-4 py-3 font-medium">{c.nombre_cliente}</td>
                  <td className="px-4 py-3 text-[var(--text-soft)]">{c.nombre_servicio}</td>
                  <td className="px-4 py-3 text-[var(--text-soft)]">{c.nombre_profesional}</td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={c.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditando(c); setModalOpen(true); }}
                        className="px-3 py-1 text-xs border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] transition"
                      >
                        Reprogramar
                      </button>

                      {c.estado !== "Cancelada" && c.estado !== "Finalizada" && (
                        <button
                          onClick={() => handleCancelar(c.id_cita)}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                        >
                          Cancelar
                        </button>
                      )}

                      {c.estado !== "Finalizada" && c.estado !== "Cancelada" && (
                        <button
                          onClick={() => handleFinalizar(c.id_cita)}
                          className="px-3 py-1 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
                        >
                          Finalizar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CitaModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); }}
        onSave={handleSave}
        profesionales={profesionales}
        servicios={servicios}
        inicial={editando || undefined}
        loading={saving}
      />
    </div>
  );
}

export default function PageWrapper() {
  return <DashboardLayout>{<CitasOperativasPage />}</DashboardLayout>;
}