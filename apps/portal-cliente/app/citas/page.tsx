"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@supabase/lib/client";
import { useNegocio } from "@/lib/hooks/useNegocio";
import DashboardLayout from "../dashboard/layout";
import toast from "react-hot-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Cita {
  id_cita: string;
  id_cliente: string; //
  id_profesional: string;    // ← agregar
  id_servicio: string;       // ← agregar
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

const FORM_EMPTY: CitaForm = {
  id_cliente: "",
  id_profesional: "",
  id_servicio: "",
  fecha: "",
  hora: "",
  notas: "",
};

const ESTADO_COLOR: Record<string, string> = {
  Agendada: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  Reprogramada: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  Cancelada: "bg-red-500/10 text-red-600 border-red-500/30",
  Completada: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: string }) {
  const colorClass = ESTADO_COLOR[estado] ?? "bg-gray-500/10 text-gray-400 border-gray-400/20";
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
  }).format(new Date(fecha + "T00:00:00")); // forzar fecha local, evitar desfase UTC
}

function formatHora(hora: string) {
  if (!hora) return "";
  const [hh, mm] = hora.split(":").map(Number);
  const date = new Date();
  date.setHours(hh ?? 0, mm ?? 0);
  return date.toLocaleTimeString("es-CR", { hour: "numeric", minute: "2-digit", hour12: true });
}
function generarHoras(inicio = 8, fin = 19) {
  const horas: string[] = [];
  for (let h = inicio; h < fin; h++) {
    horas.push(`${h.toString().padStart(2, "0")}:00`);
  }
  return horas;
}

// Extraer mensaje legible del error de Supabase/RPC
function parsearError(error: unknown): string {
  if (!error) return "Error desconocido";
  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.message === "string") {
      const msg = e.message;
      if (msg.includes("cita_no_duplicada"))
        return "Ese profesional ya tiene una cita a esa hora";
      if (msg.includes("Transición inválida"))
        return msg.replace(/^.*Transición inválida:/i, "Transición inválida:").trim();
      if (msg.includes("no válido"))
        return msg.replace(/^.*ERROR:\s*/i, "").trim();
      return msg.replace(/^.*ERROR:\s*/i, "").trim();
    }
  }
  return String(error);
}

// ─── Tarjeta de Cita ──────────────────────────────────────────────────────────
function CitaCard({
  cita,
  onReprogramar,
  onCancelar,
  onCompletar,
}: {
  cita: Cita;
  onReprogramar: (c: Cita) => void;
  onCancelar: (id: string) => void;
  onCompletar: (id: string) => void;
}) {
  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl flex flex-col p-4 hover:border-[var(--accent)]/40 transition-all duration-150 h-full">

      {/* Franja de color del servicio */}
      <div
        className="h-1 rounded-full mb-3 opacity-70"
        style={{ background: cita.color_hex ?? "var(--accent)" }}
      />

      {/* Header: Cliente + Estado */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">CLIENTE</p>
          <p className="font-semibold text-lg leading-tight truncate">{cita.nombre_cliente}</p>
        </div>
        <EstadoBadge estado={cita.estado} />
      </div>

      {/* Fecha y Hora */}
      <div className="mb-4">
        <p className="text-lg font-medium">{formatFecha(cita.fecha)}</p>
        <p className="text-2xl font-bold text-[var(--accent)] tracking-tighter">{formatHora(cita.hora)}</p>
      </div>

      {/* Servicio y Profesional */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">SERVICIO</p>
          <p className="text-sm font-medium leading-tight">{cita.nombre_servicio}</p>
          <p className="text-xs text-[var(--text-soft)] mt-0.5">
            {cita.duracion_min} min • ₡{Number(cita.precio).toLocaleString("es-CR")}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">PROFESIONAL</p>
          <p className="text-sm leading-tight">{cita.nombre_profesional}</p>
        </div>
      </div>

      {/* Notas */}
      {cita.notas && (
        <div className="mb-4 p-3 bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-soft)]">
          {cita.notas}
        </div>
      )}

      {/* Acciones */}
      <div className="mt-auto pt-4 border-t border-[var(--border)] flex flex-wrap gap-2">
        <button
          onClick={() => onReprogramar(cita)}
          className="flex-1 px-4 py-2.5 text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded-lg transition"
        >
          Reprogramar
        </button>

        {cita.estado !== "Cancelada" && cita.estado !== "Completada" && (
          <button
            onClick={() => onCancelar(cita.id_cita)}
            className="flex-1 px-4 py-2.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
          >
            Cancelar
          </button>
        )}

        {cita.estado !== "Completada" && cita.estado !== "Cancelada" && (
          <button
            onClick={() => onCompletar(cita.id_cita)}
            className="flex-1 px-4 py-2.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
          >
            Completar
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function CitaModal({
  open,
  onClose,
  onSave,
  profesionales,
  servicios,
  clientes,
  onCrearCliente,
  inicial,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: CitaForm, id?: string) => void;
  profesionales: Profesional[];
  servicios: Servicio[];
  clientes: { id_cliente: string; nombre: string }[];
  onCrearCliente: () => void; //
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
  const esEdicion = !!inicial?.id_cita;

  const camposCompletos =
    !!form.id_cliente &&
    !!form.id_profesional &&
    !!form.id_servicio &&
    !!form.fecha &&
    !!form.hora;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="font-medium text-base">
            {esEdicion ? "Reprogramar cita" : "Nueva cita"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-[var(--bg-soft)] flex items-center justify-center text-[var(--text-soft)]"
          >
            ✕
          </button>
        </div>

        {/* Campos */}
        <div className="p-5 flex flex-col gap-4">

          {/* Nombre cliente — solo editable en creación */}
          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">
              Cliente *
            </label>

            <select
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
              value={form.id_cliente}
              onChange={(e) => {
                const value = e.target.value;

                console.log("SELECT CLIENTE:", value); // 👈 DEBUG

                if (value === "__nuevo__") {
                  console.log("ABRIR MODAL"); // 👈 DEBUG
                  onCrearCliente();
                  return;
                }

                set("id_cliente", value);
              }}
              disabled={esEdicion}
            >
              <option value="">Seleccionar cliente...</option>

              {clientes.map((c) => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  {c.nombre}
                </option>
              ))}

              <option value="__nuevo__">+ Crear cliente</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Profesional *</label>
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
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Servicio *</label>
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
              <label className="text-xs text-[var(--text-soft)] mb-1 block">Fecha *</label>
              <input
                type="date"
                className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                value={form.fecha}
                onChange={(e) => set("fecha", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-soft)] mb-1 block">Hora *</label>
              <input
                type="time"
                className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                value={form.hora}
                onChange={(e) => set("hora", e.target.value)}
              />
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

        {/* Footer */}
        <div className="flex gap-2 p-5 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg-soft)] transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form, inicial?.id_cita)}
            disabled={loading || !camposCompletos}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            {loading
              ? "Guardando..."
              : esEdicion
                ? "Reprogramar cita"
                : "Crear cita"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VistaAgenda({
  citas,
  profesionales,
  fecha,
  onCrear,
  onEditar,
}: {
  citas: Cita[];
  profesionales: Profesional[];
  fecha: string;
  onCrear: (data: { hora: string; id_profesional: string }) => void;
  onEditar: (cita: Cita) => void;
}) {
  const horas = generarHoras();

  const citasMap = useMemo(() => {
    const map: Record<string, Cita> = {};
    citas.forEach((c) => {
      const key = `${c.id_profesional}_${c.fecha}_${c.hora.slice(0, 5)}`;
      map[key] = c;
    });
    return map;
  }, [citas]);

  return (
    <>
      {/* 🖥️ DESKTOP */}
      <div className="hidden lg:block overflow-x-auto">
        <div className="min-w-[900px] border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--bg)] shadow-sm">

          {/* Header horas */}
          <div className="grid grid-cols-[140px_repeat(12,1fr)] bg-[var(--bg-soft)] border-b border-[var(--border)] sticky top-0 z-10 backdrop-blur">
            <div></div>
            {horas.map((h) => (
              <div key={h} className="text-[11px] text-[var(--text-soft)] text-center py-2 border-l border-[var(--border)] font-medium">
                {h}
              </div>
            ))}
          </div>

          {/* Filas */}
          {profesionales.map((p) => (
            <div
              key={p.id_profesional}
              className="grid grid-cols-[140px_repeat(12,1fr)] border-b"
            >
              <div className="p-3 text-sm font-medium border-r border-[var(--border)] bg-[var(--bg-soft)] sticky left-0 z-10">
                {p.nombre}
              </div>

              {horas.map((h) => {
                const key = `${p.id_profesional}_${fecha}_${h}`;
                const cita = citasMap[key];

                return (
                  <div
                    key={h}
                    className="border-l border-[var(--border)] h-24 relative cursor-pointer transition group hover:bg-[var(--bg-soft)]/60"
                    onClick={() =>
                      !cita && onCrear({ hora: h, id_profesional: p.id_profesional })
                    }
                  >
                    {cita && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditar(cita);
                        }}
                        className="absolute inset-1 rounded-xl p-2 text-xs text-white shadow-md flex flex-col justify-between backdrop-blur-sm"
                        style={{
                          background: cita.color_hex,
                        }}
                      >
                        <div className="flex flex-col gap-1 leading-tight">
                          <span className="text-sm font-semibold truncate">
                            {cita.nombre_cliente}
                          </span>

                          <span className="text-xs opacity-90 truncate">
                            {cita.nombre_servicio}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 👇 ESTE ES EL QUE TE FALTABA */}
                    {!cita && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <span className="text-[12px] text-[var(--text-soft)]">
                          + Agendar
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 📱 MOBILE */}
      <div className="lg:hidden flex flex-col gap-4">
        {horas.map((hora) => (
          <div key={hora}>
            <div className="text-sm font-semibold mb-2">{hora}</div>

            <div className="flex flex-col gap-2">
              {profesionales.map((p) => {
                const key = `${p.id_profesional}_${fecha}_${hora}`;
                const cita = citasMap[key];

                return (
                  <div
                    key={p.id_profesional}
                    className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-sm active:scale-[0.98] transition"
                    onClick={() =>
                      !cita && onCrear({ hora, id_profesional: p.id_profesional })
                    }
                  >
                    <span className="text-xs font-medium">{p.nombre}</span>

                    {cita ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditar(cita);
                        }}
                        className="text-xs px-3 py-1 rounded-full text-white shadow-sm"
                        style={{ background: cita.color_hex }}
                      >
                        {cita.nombre_cliente}
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--text-soft)]">
                        Libre
                      </span>
                    )}
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

// ─── Página principal ─────────────────────────────────────────────────────────
function CitasOperativasPage() {
  const supabase = createClient();
  const { negocio } = useNegocio();
  const [clienteModalOpen, setClienteModalOpen] = useState(false);

  const [clientes, setClientes] = useState<{ id_cliente: string; nombre: string }[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "Agendada" | "Reprogramada" | "Cancelada">("todos");
  const [filtroFecha, setFiltroFecha] = useState<"hoy" | "proximas" | "semana" | "mes">("hoy");
  const [filtroProfesional, setFiltroProfesional] = useState<string>("todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Cita | null>(null);
  const [vista, setVista] = useState<"lista" | "agenda">("lista");

  const handleCrearCliente = async (nombre: string) => {
    if (!negocio?.id || !nombre) return;

    const { data, error } = await supabase
      .from("clientes")
      .insert({
        negocio_id: negocio.id,
        nombre,
      })
      .select()
      .single();

    if (error) {
      toast.error("Error creando cliente");
      return;
    }

    // agregar a lista
    setClientes((prev) => [...prev, data]);

    // cerrar modal
    setClienteModalOpen(false);

    // 👉 seleccionar automáticamente en el modal de cita
    // OJO: esto lo vamos a mejorar luego
  };

  // ── Cargar citas ────────────────────────────────────────────
  const loadCitas = useCallback(async () => {
    if (!negocio?.id) return;
    setLoading(true);

    const hoy = new Date().toISOString().split("T")[0] ?? "";

    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const mananaStr = manana.toISOString().split("T")[0] ?? "";

    const enUnaSemana = new Date();
    enUnaSemana.setDate(enUnaSemana.getDate() + 7);
    const enUnaSemanaStr = enUnaSemana.toISOString().split("T")[0] ?? "";

    const enUnMes = new Date();
    enUnMes.setMonth(enUnMes.getMonth() + 1);
    const enUnMesStr = enUnMes.toISOString().split("T")[0] ?? "";

    let query = supabase
      .from("v_citas_operativas")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    if (filtroFecha === "hoy") {
      query = query.eq("fecha", hoy);
    } else if (filtroFecha === "proximas") {
      query = query.gte("fecha", mananaStr);
    } else if (filtroFecha === "semana") {
      query = query.gte("fecha", mananaStr).lte("fecha", enUnaSemanaStr);
    } else if (filtroFecha === "mes") {
      query = query.gte("fecha", mananaStr).lte("fecha", enUnMesStr);
    } if (filtroProfesional !== "todos") {
      query = query.eq("id_profesional", filtroProfesional);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Error cargando citas: " + parsearError(error));
    } else {
      setCitas((data as Cita[]) ?? []);
    }
    setLoading(false);
  }, [negocio?.id, filtroFecha, filtroProfesional]);
  // ── Cargar profesionales y servicios ────────────────────────
  useEffect(() => {
    if (!negocio?.id) return;
    loadCitas();

    supabase
      .from("profesionales")
      .select("id_profesional, nombre, activo")
      .eq("negocio_id", negocio.id)
      .eq("activo", true)
      .then(({ data }) => setProfesionales((data as Profesional[]) ?? []));

    supabase
      .from("servicios")
      .select("id_servicio, nombre, duracion_min, precio, activo")
      .eq("negocio_id", negocio.id)
      .eq("activo", true)
      .then(({ data }) => setServicios((data as Servicio[]) ?? []));

    supabase
      .from("clientes")
      .select("id_cliente, nombre")
      .eq("negocio_id", negocio.id)
      .then(({ data }) => setClientes(data ?? []));

  }, [negocio?.id, loadCitas]);

  // ── Crear o reprogramar ─────────────────────────────────────
  const handleSave = async (form: CitaForm, id?: string) => {
    if (!negocio?.id) return;
    setSaving(true);
    try {
      if (id) {

        // LOG TEMPORAL — borrar después
        console.log("Reprogramando con params:", {
          p_id_cita: id,
          p_negocio_id: negocio.id,
          p_fecha: form.fecha,
          p_hora: form.hora,
          p_id_profesional: form.id_profesional || null,
          p_id_servicio: form.id_servicio || null,
          p_notas: form.notas || null,
        });
        // Reprogramar — usa RPC
        const { error } = await supabase.rpc("rpc_reprogramar_cita", {
          p_id_cita: id,
          p_negocio_id: negocio.id,
          p_fecha: form.fecha,
          p_hora: form.hora.length === 5 ? form.hora + ":00" : form.hora, // ← HH:MM → HH:MM:00
          p_id_profesional: form.id_profesional || null,
          p_id_servicio: form.id_servicio || null,
          p_notas: form.notas || null,
        });
        if (error) throw error;
        toast.success("Cita reprogramada ✅");
      } else {


        // Crear — usa RPC
        const { error } = await supabase.rpc("rpc_crear_cita", {
          p_negocio_id: negocio.id,
          p_nombre_cliente: form.id_cliente,
          p_id_profesional: form.id_profesional,
          p_id_servicio: form.id_servicio,
          p_fecha: form.fecha,
          p_hora: form.hora.length === 5 ? form.hora + ":00" : form.hora, // ← igual
          p_notas: form.notas || null,
          p_origen: "portal",
        });
        if (error) throw error;
        toast.success("Cita creada ✅");
      }
      setModalOpen(false);
      setEditando(null);
      loadCitas();
    } catch (err) {
      toast.error(parsearError(err));
    } finally {
      setSaving(false);
    }
  };

  // ── Cancelar ────────────────────────────────────────────────
  const handleCancelar = async (id: string) => {
    if (!confirm("¿Cancelar esta cita?")) return;
    try {
      const { error } = await supabase.rpc("rpc_cancelar_cita", {
        p_id_cita: id,
        p_negocio_id: negocio?.id,
        p_motivo: null,
      });
      if (error) throw error;
      toast.success("Cita cancelada ✅");
      loadCitas();
    } catch (err) {
      toast.error(parsearError(err));
    }
  };

  // ── Completar ───────────────────────────────────────────────
  const handleCompletar = async (id: string) => {
    if (!confirm("¿Marcar esta cita como completada?")) return;
    try {
      const { error } = await supabase.rpc("rpc_completar_cita", {
        p_id_cita: id,
        p_negocio_id: negocio?.id,
        p_notas_internas: null,
      });
      if (error) throw error;
      toast.success("Cita completada ✅");
      loadCitas();
    } catch (err) {
      toast.error(parsearError(err));
    }
  };

  // ── Filtros cliente ─────────────────────────────────────────
  const citasFiltradas = citas.filter((c) => {
    const matchBusq =
      !busqueda ||
      (c.nombre_cliente ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
      c.nombre_servicio.toLowerCase().includes(busqueda.toLowerCase());

    const matchEstado =
      filtroEstado === "todos" || c.estado === filtroEstado;

    return matchBusq && matchEstado;
  });

  const citasMap = useMemo(() => {
    const map: Record<string, Cita> = {};

    citasFiltradas.forEach((c) => {
      const key = `${c.id_profesional}_${c.fecha}_${c.hora.slice(0, 5)}`;
      map[key] = c;
    });

    return map;
  }, [citasFiltradas]);

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">Citas Operativas</h1>
          <p className="text-sm text-[var(--text-soft)]">
            Gestión diaria • Agendar, reprogramar y atender
          </p>
        </div>
        <button
          onClick={() => { setEditando(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition"
          style={{ background: "var(--accent)" }}
        >
          <span className="text-base leading-none">+</span> Nueva cita
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setVista("lista")}
          className={`px-3 py-1.5 rounded-lg text-sm ${vista === "lista"
            ? "bg-[var(--accent)] text-white"
            : "bg-[var(--bg-soft)]"
            }`}
        >
          Lista
        </button>

        <button
          onClick={() => setVista("agenda")}
          className={`px-3 py-1.5 rounded-lg text-sm ${vista === "agenda"
            ? "bg-[var(--accent)] text-white"
            : "bg-[var(--bg-soft)]"
            }`}
        >
          Agenda
        </button>
      </div>
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] flex-1"
          placeholder="Buscar cliente o servicio..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="todos">Todos los estados</option>
          <option value="Agendada">Agendada</option>
          <option value="Reprogramada">Reprogramada</option>
          <option value="Cancelada">Cancelada</option>
        </select>

        <select
          value={filtroProfesional}
          onChange={(e) => setFiltroProfesional(e.target.value)}
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="todos">Todos los profesionales</option>
          {profesionales.map((p) => (
            <option key={p.id_profesional} value={p.id_profesional}>
              {p.nombre}
            </option>
          ))}
        </select>

        <select
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value as typeof filtroFecha)}
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="hoy">Hoy</option>
          <option value="proximas">Próximas citas</option>
          <option value="semana">Próxima semana</option>
          <option value="mes">Próximo mes</option>
        </select>
      </div>

      {/* Grilla de citas */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--text-soft)] text-sm">
          Cargando citas...
        </div>
      ) : citasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl">
          <span className="text-5xl opacity-30">📅</span>
          <p className="text-sm text-[var(--text-soft)]">
            No hay citas para los filtros seleccionados
          </p>
        </div>
      ) : vista === "lista" ? (

        // 👇 TU GRID ACTUAL (NO TOCAR)
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {citasFiltradas.map((cita) => (
            <CitaCard
              key={cita.id_cita}
              cita={cita}
              onReprogramar={(c) => {
                setEditando(c);
                setModalOpen(true);
              }}
              onCancelar={handleCancelar}
              onCompletar={handleCompletar}
            />
          ))}
        </div>

      ) : (

        // 👇 NUEVA AGENDA
        <VistaAgenda
          citas={citasFiltradas}
          profesionales={profesionales}
          fecha={new Date().toISOString().split("T")[0]!}
          onCrear={({ hora, id_profesional }) => {
            setEditando({
              id_cita: "",
              id_cliente: "",
              id_profesional,
              id_servicio: "",
              fecha: new Date().toISOString().split("T")[0]!,
              hora,
              nombre_profesional: "",
              nombre_servicio: "",
              color_hex: "",
              precio: 0,
              estado: "Agendada",
              duracion_min: 0,
            });
            setModalOpen(true);
          }}
          onEditar={(cita) => {
            setEditando(cita);
            setModalOpen(true);
          }}
        />

      )}

      <CitaModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); }}
        onSave={handleSave}
        profesionales={profesionales}
        servicios={servicios}
        clientes={clientes}
        onCrearCliente={() => setClienteModalOpen(true)}
        inicial={editando
          ? {
            id_cita: editando.id_cita,
            id_cliente: editando.id_cliente ?? "",
            id_profesional: editando.id_profesional ?? "",
            id_servicio: editando.id_servicio ?? "",
            fecha: editando.fecha,
            hora: editando.hora.slice(0, 5), // HH:MM
            notas: editando.notas ?? "",
          }
          : undefined
        }
        loading={saving}
      />
      <ClienteModal
        open={clienteModalOpen}
        onClose={() => setClienteModalOpen(false)}
        onSave={handleCrearCliente}
      />
    </div>
  );
}

function ClienteModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (nombre: string) => void;
}) {
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    if (!open) setNombre("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl w-full max-w-sm p-5">

        <h2 className="text-sm font-medium mb-4">Nuevo cliente</h2>

        <input
          className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm mb-4"
          placeholder="Nombre del cliente"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && nombre.trim()) {
              onSave(nombre.trim());
            }
          }}
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border rounded-lg text-sm"
          >
            Cancelar
          </button>

          <button
            onClick={() => {
              if (!nombre.trim()) return;
              onSave(nombre.trim());
            }}
            className="flex-1 py-2 rounded-lg text-sm text-white"
            style={{ background: "var(--accent)" }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PageWrapper() {
  return <DashboardLayout>{<CitasOperativasPage />}</DashboardLayout>;
}