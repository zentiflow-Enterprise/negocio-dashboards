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
  id_whatsapp?: string;
}

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

// ─── Página Principal ─────────────────────────────────────────────────────────
function HistorialCitasPage() {
  const supabase = createClient();
  const { negocio } = useNegocio();

  const [citas, setCitas] = useState<CitaHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState<"todo" | "mes" | "semana">("mes");

  const loadHistorial = useCallback(async () => {
    if (!negocio?.id) return;
    setLoading(true);

    let query = supabase
      .from("v_citas_historico")
      .select("*")
      .eq("negocio_id", negocio.id);

    // Filtro por fecha
    if (filtroFecha !== "todo") {
      const fechaLimite = new Date();

      if (filtroFecha === "semana") {
        fechaLimite.setDate(fechaLimite.getDate() - 7);
      } else if (filtroFecha === "mes") {
        fechaLimite.setMonth(fechaLimite.getMonth() - 1);
      }

      query = query.gte("fecha", fechaLimite.toISOString().split("T")[0]);
    }

    const { data, error } = await query
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false });

    if (error) {
      console.error("Error cargando historial:", error);
      toast.error("Error al cargar el historial");
    }

    setCitas((data as CitaHistorico[]) || []);
    setLoading(false);
  }, [negocio?.id, filtroFecha]);

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial]);

  const citasFiltradas = citas.filter((c) => {
    if (!busqueda) return true;
    return (
      c.nombre_cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.nombre_servicio.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.nombre_profesional.toLowerCase().includes(busqueda.toLowerCase())
    );
  });

  return (
    <div className="p-6 lg:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">Historial de Citas</h1>
          <p className="text-sm text-[var(--text-soft)]">Registro completo de citas finalizadas</p>
        </div>
        <div className="text-sm text-[var(--text-soft)]">
          {citasFiltradas.length} cita{citasFiltradas.length !== 1 ? "s" : ""} finalizadas
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] w-80"
          placeholder="Buscar cliente, servicio o profesional..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <select
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value as "todo" | "mes" | "semana")}
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="mes">Último mes</option>
          <option value="semana">Última semana</option>
          <option value="todo">Todo el historial</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-[var(--text-soft)]">Cargando historial...</div>
        ) : citasFiltradas.length === 0 ? (
          <div className="py-16 text-center">
            <span className="text-4xl block mb-3">📖</span>
            <p className="text-[var(--text-soft)]">No hay citas finalizadas en el período seleccionado</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-[var(--bg)]">
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide">Fecha</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide">Hora</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide">Servicio</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide">Profesional</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide">Precio</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide">Notas</th>
              </tr>
            </thead>
            <tbody>
              {citasFiltradas.map((c, i) => (
                <tr
                  key={c.id_cita}
                  className={`border-b border-[var(--border)] hover:bg-[var(--bg)] transition ${i % 2 === 1 ? "bg-[var(--bg)]/30" : ""
                    }`}
                >
                  <td className="px-4 py-3 font-medium">{formatFecha(c.fecha)}</td>
                  <td className="px-4 py-3 text-[var(--text-soft)]">{formatHora(c.hora)}</td>
                  <td className="px-4 py-3 font-medium">{c.nombre_cliente}</td>
                  <td className="px-4 py-3 text-[var(--text-soft)]">{c.nombre_servicio}</td>
                  <td className="px-4 py-3 text-[var(--text-soft)]">{c.nombre_profesional}</td>
                  <td className="px-4 py-3 font-medium">
                    ₡{Number(c.precio).toLocaleString("es-CR")}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={c.estado} />
                  </td>
                  <td className="px-4 py-3 text-[var(--text-soft)] max-w-xs truncate">
                    {c.notas || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function PageWrapper() {
  return <DashboardLayout>{<HistorialCitasPage />}</DashboardLayout>;
}