"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/lib/client";
import { useNegocio } from "@/lib/hooks/useNegocio";
import DashboardLayout from "../dashboard/layout";
import toast from "react-hot-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Servicio {
  id_servicio: string;
  negocio_id: string;
  nombre: string;
  duracion_min: number;
  precio: number;
  descripcion: string;
  color_hex: string;
  activo: boolean;
  creado_en: string;
}

interface ServicioForm {
  nombre: string;
  duracion_min: number;
  precio: number;
  descripcion: string;
  color_hex: string;
  activo: boolean;
}

const FORM_EMPTY: ServicioForm = {
  nombre: "",
  duracion_min: 30,
  precio: 0,
  descripcion: "",
  color_hex: "#c9a96e",
  activo: true,
};

const COLORES_PRESET = [
  "#c9a96e", "#10b981", "#3b82f6", "#8b5cf6",
  "#f59e0b", "#ef4444", "#ec4899", "#06b6d4",
];

function genId() {
  return "srv_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Color dot ────────────────────────────────────────────────────────────────
function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-white/20"
      style={{ background: color || "#888" }}
    />
  );
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

// ─── Modal ────────────────────────────────────────────────────────────────────
function ServicioModal({
  open,
  onClose,
  onSave,
  onDelete,
  inicial,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: ServicioForm, id?: string) => void;
  onDelete?: (id: string) => void;
  inicial?: Partial<ServicioForm> & { id_servicio?: string };
  loading: boolean;
}) {
  const [form, setForm] = useState<ServicioForm>({ ...FORM_EMPTY, ...inicial });

  useEffect(() => {
    setForm({ ...FORM_EMPTY, ...inicial });
  }, [inicial, open]);

  if (!open) return null;

  const set = (k: keyof ServicioForm, v: string | number | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          {/* Franja de color del servicio */}
          <div className="flex items-center gap-2">
            <ColorDot color={form.color_hex} />
            <h2 className="font-medium text-base">
              {inicial?.id_servicio ? "Editar servicio" : "Nuevo servicio"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-[var(--bg-soft)] flex items-center justify-center text-[var(--text-soft)]"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Nombre *</label>
            <input
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="Ej. Corte de cabello"
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Descripción</label>
            <textarea
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
              rows={2}
              placeholder="Descripción breve del servicio..."
              value={form.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-soft)] mb-1 block">Duración (min) *</label>
              <input
                type="number"
                min={5}
                step={5}
                className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.duracion_min}
                onChange={(e) => set("duracion_min", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-soft)] mb-1 block">Precio (₡) *</label>
              <input
                type="number"
                min={0}
                step={500}
                className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.precio}
                onChange={(e) => set("precio", Number(e.target.value))}
              />
            </div>
          </div>

          {/* Preview precio */}
          {form.precio > 0 && (
            <p className="text-xs text-[var(--text-soft)] -mt-2">
              ₡{Number(form.precio).toLocaleString("es-CR")} · {form.duracion_min} min
            </p>
          )}

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-2 block">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORES_PRESET.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color_hex", c)}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    form.color_hex === c
                      ? "border-white scale-110"
                      : "border-transparent"
                  }`}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={form.color_hex}
                onChange={(e) => set("color_hex", e.target.value)}
                className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent"
                title="Color personalizado"
              />
            </div>
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
          {inicial?.id_servicio && onDelete && (
            <button
              onClick={() => onDelete(inicial.id_servicio!)}
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
            onClick={() => onSave(form, inicial?.id_servicio)}
            disabled={loading || !form.nombre || form.duracion_min <= 0}
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
function ServiciosPage() {
  const supabase = createClient();
  const { negocio } = useNegocio();

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "activo" | "inactivo">("todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Servicio | null>(null);

  const loadServicios = useCallback(async () => {
    if (!negocio?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("servicios")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("nombre", { ascending: true });
    setServicios((data as Servicio[]) || []);
    setLoading(false);
  }, [negocio?.id]);

  useEffect(() => {
    if (!negocio?.id) return;
    loadServicios();
  }, [negocio?.id, loadServicios]);

  const handleSave = async (form: ServicioForm, id?: string) => {
    if (!negocio?.id) return;
    setSaving(true);
    try {
      if (id) {
        await supabase.from("servicios").update({ ...form }).eq("id_servicio", id);
        toast.success("Servicio actualizado ✅");
      } else {
        await supabase.from("servicios").insert([
          { ...form, id_servicio: genId(), negocio_id: negocio.id },
        ]);
        toast.success("Servicio creado ✅");
      }
      setModalOpen(false);
      setEditando(null);
      loadServicios();
    } catch {
      toast.error("Error guardando ❌");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este servicio?")) return;
    try {
      await supabase.from("servicios").delete().eq("id_servicio", id);
      toast.success("Servicio eliminado ✅");
      setModalOpen(false);
      setEditando(null);
      loadServicios();
    } catch {
      toast.error("Error eliminando ❌");
    }
  };

  const filtrados = servicios.filter((s) => {
    const matchBusq =
      !busqueda || s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.descripcion?.toLowerCase().includes(busqueda.toLowerCase());
    const matchActivo =
      filtroActivo === "todos" ||
      (filtroActivo === "activo" && s.activo) ||
      (filtroActivo === "inactivo" && !s.activo);
    return matchBusq && matchActivo;
  });

  const activos = servicios.filter((s) => s.activo).length;

  return (
    <div className="p-6 lg:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">Servicios</h1>
          <p className="text-sm text-[var(--text-soft)] mt-0.5">
            {activos} activo{activos !== 1 ? "s" : ""} · {servicios.length} total
          </p>
        </div>
        <button
          onClick={() => { setEditando(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[var(--accent)] hover:opacity-90 transition"
        >
          <span className="text-base leading-none">+</span>
          Nuevo servicio
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] w-48"
          placeholder="Buscar servicio..."
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
            <span className="text-3xl">✂️</span>
            <p className="text-sm text-[var(--text-soft)]">No hay servicios registrados</p>
            <button
              onClick={() => { setEditando(null); setModalOpen(true); }}
              className="text-sm mt-1 underline"
              style={{ color: "var(--accent)" }}
            >
              Agregar el primero
            </button>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-[var(--bg)]">
              <tr className="border-b border-[var(--border)]">
                {["Servicio", "Descripción", "Duración", "Precio", "Estado", "Acciones"].map((h) => (
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
              {filtrados.map((s, i) => (
                <tr
                  key={s.id_servicio}
                  className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)] transition ${
                    i % 2 === 0 ? "" : "bg-[var(--bg)]/30"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ColorDot color={s.color_hex} />
                      <span className="font-medium">{s.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-soft)] max-w-[200px] truncate">
                    {s.descripcion || "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-soft)]">{s.duracion_min} min</td>
                  <td className="px-4 py-3 font-medium">
                    ₡{Number(s.precio).toLocaleString("es-CR")}
                  </td>
                  <td className="px-4 py-3">
                    <ActiveBadge activo={s.activo} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setEditando(s); setModalOpen(true); }}
                      className="px-3 py-1 rounded-lg text-xs border border-[var(--border)] hover:bg-[var(--bg)] transition"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ServicioModal
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
  return <DashboardLayout>{<ServiciosPage />}</DashboardLayout>;
}
