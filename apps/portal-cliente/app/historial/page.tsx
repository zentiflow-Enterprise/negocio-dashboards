"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/lib/client";
import { useNegocio } from "@/lib/hooks/useNegocio";
import DashboardLayout from "../dashboard/layout";
import toast from "react-hot-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface CitaHistorico {
  id_cita: string;
  nombre_cliente: string;
  nombre_profesional: string;
  nombre_servicio: string;
  fecha: string;
  hora: string;
  precio: number;
  estado: string;
  duracion_min: number;
  notas?: string;
  creado_en: string;
}

const ESTADO_COLOR: Record<string, string> = {
  Cancelada: "bg-red-500/10 text-red-600 border-red-500/30",
  Finalizada: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  Completada: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

function EstadoBadge({ estado }: { estado: string }) {
  const colorClass = ESTADO_COLOR[estado] || "bg-gray-500/10 text-gray-400 border-gray-400/20";
  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${colorClass}`}>
      {estado}
    </span>
  );
}

function formatFecha(fecha: string) {
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(fecha));
}

function formatHora(hora: string) {
  if (!hora) return "";
  const [hh, mm] = hora.split(":").map(Number);
  const date = new Date();
  date.setHours(hh ?? 0, mm ?? 0);
  return date.toLocaleTimeString("es-CR", { hour: "numeric", minute: "2-digit", hour12: true });
}

// ─── Tarjeta para Móvil ───────────────────────────────────────────────────────
function CitaHistorialCard({ cita }: { cita: CitaHistorico }) {
  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-lg font-semibold">{cita.nombre_cliente}</p>
          <p className="text-sm text-[var(--text-soft)]">
            {formatFecha(cita.fecha)} • {formatHora(cita.hora)}
          </p>
        </div>
        <EstadoBadge estado={cita.estado} />
      </div>

      <div className="flex justify-between items-end">
        <div>
          <span className="text-[10px] text-[var(--text-soft)] uppercase block">Servicio</span>
          <span className="font-medium">{cita.nombre_servicio}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-[var(--text-soft)] uppercase block">Precio</span>
          <span className="font-semibold">₡{Number(cita.precio).toLocaleString("es-CR")}</span>
        </div>
      </div>

      <div>
        <span className="text-[10px] text-[var(--text-soft)] uppercase block">Profesional</span>
        <span className="text-sm">{cita.nombre_profesional}</span>
      </div>

      {cita.notas && (
        <div className="text-xs text-[var(--text-soft)] bg-[var(--bg-soft)] p-3 rounded-lg border border-[var(--border)]">
          {cita.notas}
        </div>
      )}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
function HistorialCitasPage() {
  const supabase = createClient();
  const { negocio } = useNegocio();

  const [citas, setCitas] = useState<CitaHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState<"todo" | "mes" | "semana">("mes");
  const [filtroEstado, setFiltroEstado] = useState<"completadas" | "canceladas">("completadas");

  const loadHistorial = useCallback(async () => {
    if (!negocio?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let query = supabase
        .from("v_citas_historico")
        .select("*")
        .eq("negocio_id", negocio.id);

      if (filtroFecha !== "todo") {
        const fechaLimite = new Date();
        if (filtroFecha === "semana") fechaLimite.setDate(fechaLimite.getDate() - 7);
        else if (filtroFecha === "mes") fechaLimite.setMonth(fechaLimite.getMonth() - 1);
        query = query.gte("fecha", fechaLimite.toISOString().split("T")[0]);
      }

      const { data, error } = await query
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

      if (error) {
        console.error(error);
        toast.error("Error al cargar el historial");
        setCitas([]);
      } else {
        setCitas((data as CitaHistorico[]) || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error inesperado al cargar el historial");
      setCitas([]);
    } finally {
      setLoading(false);
    }
  }, [negocio?.id, filtroFecha]);

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial]);

  // Filtrado estricto: solo Completada, Finalizada y Cancelada
  const citasFiltradas = citas.filter((c) => {
    const matchBusq = !busqueda ||
      c.nombre_cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.nombre_servicio?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.nombre_profesional?.toLowerCase().includes(busqueda.toLowerCase());

    let matchEstado = false;
    if (filtroEstado === "completadas") {
      matchEstado = c.estado === "Completada" || c.estado === "Finalizada";
    } else if (filtroEstado === "canceladas") {
      matchEstado = c.estado === "Cancelada";
    }

    return matchBusq && matchEstado;
  });

  return (
    <div className="p-6 lg:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">Historial de Citas</h1>
          <p className="text-sm text-[var(--text-soft)]">Solo citas completadas y canceladas</p>
        </div>
        <div className="text-sm text-[var(--text-soft)]">
          {citasFiltradas.length} cita{citasFiltradas.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] flex-1"
          placeholder="Buscar cliente, servicio o profesional..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <select
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value as "todo" | "mes" | "semana")}
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="mes">Último mes</option>
          <option value="semana">Última semana</option>
          <option value="todo">Todo el historial</option>
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as "completadas" | "canceladas")}
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="completadas">Completadas</option>
          <option value="canceladas">Canceladas</option>
        </select>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="py-20 text-center text-[var(--text-soft)]">Cargando historial...</div>
      ) : citasFiltradas.length === 0 ? (
        <div className="py-20 text-center bg-[var(--bg-soft)] border border-[var(--border)] rounded-2xl">
          <span className="text-4xl block mb-3 opacity-50">📖</span>
          <p className="text-[var(--text-soft)]">No hay citas con los filtros seleccionados</p>
        </div>
      ) : (
        <>
          {/* Tarjetas en Móvil */}
          <div className="lg:hidden space-y-4">
            {citasFiltradas.map((cita) => (
              <CitaHistorialCard key={cita.id_cita} cita={cita} />
            ))}
          </div>

          {/* Tabla en Desktop */}
          <div className="hidden lg:block bg-[var(--bg)] border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-[var(--bg-soft)] border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-medium uppercase tracking-widest text-[var(--text-soft)]">Fecha</th>
                    <th className="text-left px-6 py-4 text-xs font-medium uppercase tracking-widest text-[var(--text-soft)]">Hora</th>
                    <th className="text-left px-6 py-4 text-xs font-medium uppercase tracking-widest text-[var(--text-soft)]">Cliente</th>
                    <th className="text-left px-6 py-4 text-xs font-medium uppercase tracking-widest text-[var(--text-soft)]">Servicio</th>
                    <th className="text-left px-6 py-4 text-xs font-medium uppercase tracking-widest text-[var(--text-soft)]">Profesional</th>
                    <th className="text-right px-6 py-4 text-xs font-medium uppercase tracking-widest text-[var(--text-soft)]">Precio</th>
                    <th className="text-center px-6 py-4 text-xs font-medium uppercase tracking-widest text-[var(--text-soft)]">Estado</th>
                    <th className="text-left px-6 py-4 text-xs font-medium uppercase tracking-widest text-[var(--text-soft)]">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {citasFiltradas.map((c) => (
                    <tr key={c.id_cita} className="hover:bg-[var(--bg-soft)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{formatFecha(c.fecha)}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-[var(--accent)]">{formatHora(c.hora)}</td>
                      <td className="px-6 py-4 font-medium">{c.nombre_cliente}</td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-medium">{c.nombre_servicio}</span>
                          <span className="text-xs text-[var(--text-soft)] block">{c.duracion_min} min</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[var(--text-soft)]">{c.nombre_profesional}</td>
                      <td className="px-6 py-4 text-right font-medium">₡{Number(c.precio).toLocaleString("es-CR")}</td>
                      <td className="px-6 py-4 text-center"><EstadoBadge estado={c.estado} /></td>
                      <td className="px-6 py-4 text-[var(--text-soft)] max-w-[200px] truncate">{c.notas || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function PageWrapper() {
  return <DashboardLayout>{<HistorialCitasPage />}</DashboardLayout>;
}