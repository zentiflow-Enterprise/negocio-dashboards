"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/lib/client";
import { useNegocio } from "@/lib/hooks/useNegocio";
import DashboardLayout from "../dashboard/layout";
import toast from "react-hot-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Cliente {
  cliente_id: string;
  nombre: string;
  email: string;
  id_whatsapp: string | null;
  ultima_visita: string | null;
  origen: string | null;
  portal_habilitado: boolean;
  creado_en: string;
  tiene_cita_reciente: boolean;        // Calculado con la vista
}

interface ClienteForm {
  nombre: string;
  email: string;
  id_whatsapp: string;
  origen: string;
  portal_habilitado: boolean;
}

const FORM_EMPTY: ClienteForm = {
  nombre: "",
  email: "",
  id_whatsapp: "",
  origen: "manual",
  portal_habilitado: true,
};

function genId() {
  return "cli_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ nombre }: { nombre: string }) {
  const initials = nombre
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
      style={{ background: "var(--accent)" }}
    >
      {initials}
    </div>
  );
}

// ─── Badge de Estado ─────────────────────────────────────────────────────────
function EstadoBadge({ tieneCitaReciente }: { tieneCitaReciente: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] px-3 py-1 rounded-full font-medium border ${tieneCitaReciente
        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
        : "bg-gray-500/10 text-gray-400 border-gray-400/20"
        }`}
    >
      <span className={`w-2 h-2 rounded-full ${tieneCitaReciente ? "bg-emerald-500" : "bg-gray-400"}`} />
      {tieneCitaReciente ? "Activo" : "Inactivo"}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function ClienteModal({
  open,
  onClose,
  onSave,
  onDelete,
  inicial,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: ClienteForm, id?: string) => void;
  onDelete?: (id: string) => void;
  inicial?: Partial<ClienteForm> & { cliente_id?: string };
  loading: boolean;
}) {
  const [form, setForm] = useState<ClienteForm>({ ...FORM_EMPTY, ...inicial });

  useEffect(() => {
    setForm({ ...FORM_EMPTY, ...inicial });
  }, [inicial, open]);

  if (!open) return null;

  const set = (k: keyof ClienteForm, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="font-medium text-base">
            {inicial?.cliente_id ? "Editar cliente" : "Nuevo cliente"}
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
            <Avatar nombre={form.nombre || "?"} />
            <span className="text-sm text-[var(--text-soft)]">
              {form.nombre || "Nombre del cliente"}
            </span>
          </div>

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Nombre completo *</label>
            <input
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="Ej. Juan Pérez"
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Email</label>
            <input
              type="email"
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="cliente@ejemplo.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">WhatsApp (id_whatsapp)</label>
            <input
              type="tel"
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="50688888888"
              value={form.id_whatsapp}
              onChange={(e) => set("id_whatsapp", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Origen</label>
            <select
              className="w-full bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              value={form.origen}
              onChange={(e) => set("origen", e.target.value)}
            >
              <option value="manual">Manual</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="web">Web / Portal</option>
            </select>
          </div>

          <div className="flex items-center justify-between bg-[var(--bg-soft)] rounded-lg px-3 py-2">
            <span className="text-sm">Portal de clientes habilitado</span>
            <button
              type="button"
              onClick={() => set("portal_habilitado", !form.portal_habilitado)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.portal_habilitado ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.portal_habilitado ? "translate-x-5.5" : ""
                  }`}
              />
            </button>
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-[var(--border)]">
          {inicial?.cliente_id && onDelete && (
            <button
              onClick={() => onDelete(inicial.cliente_id!)}
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
            onClick={() => onSave(form, inicial?.cliente_id)}
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
function ClientesPage() {
  const supabase = createClient();
  const { negocio } = useNegocio();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);

  const loadClientes = useCallback(async () => {
    if (!negocio?.id) return;
    setLoading(true);

    // 1. Obtener clientes del negocio
    const { data: clientesData } = await supabase
      .from("clientes_negocio")
      .select("cliente_id, nombre, email, id_whatsapp, ultima_visita, origen, portal_habilitado, creado_en")
      .eq("negocio_id", negocio.id)
      .order("nombre", { ascending: true });

    if (!clientesData || clientesData.length === 0) {
      setClientes([]);
      setLoading(false);
      return;
    }

    const clienteIds = clientesData.map((c: any) => c.cliente_id);

    // 2. Usar la vista para obtener clientes con actividad reciente (últimos 3 meses)
    const { data: clientesActivos } = await supabase
      .from("v_clientes_con_actividad_reciente")
      .select("id_cliente")
      .eq("negocio_id", negocio.id)
      .in("id_cliente", clienteIds);

    const setActivos = new Set(clientesActivos?.map((c: any) => c.id_cliente) || []);

    // 3. Agregar el estado calculado
    const clientesConEstado = clientesData.map((cliente: any) => ({
      ...cliente,
      tiene_cita_reciente: setActivos.has(cliente.cliente_id),
    }));

    setClientes(clientesConEstado as Cliente[]);
    setLoading(false);
  }, [negocio?.id]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  const handleSave = async (form: ClienteForm, id?: string) => {
    if (!negocio?.id) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        negocio_id: negocio.id,
        actualizado_en: new Date().toISOString(),
      };

      if (id) {
        await supabase.from("clientes_negocio").update(payload).eq("cliente_id", id);
        toast.success("Cliente actualizado ✅");
      } else {
        await supabase.from("clientes_negocio").insert([
          {
            ...payload,
            cliente_id: genId(),
            creado_en: new Date().toISOString(),
          },
        ]);
        toast.success("Cliente creado ✅");
      }

      setModalOpen(false);
      setEditando(null);
      loadClientes();
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar ❌");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este cliente permanentemente? Esta acción no se puede deshacer.")) return;

    try {
      await supabase.from("clientes_negocio").delete().eq("cliente_id", id);
      toast.success("Cliente eliminado ✅");
      loadClientes();
    } catch (e) {
      console.error(e);
      toast.error("Error eliminando el cliente ❌");
    } finally {
      setModalOpen(false);
      setEditando(null);
    }
  };

  const filtrados = clientes.filter((c) =>
    !busqueda ||
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.id_whatsapp?.includes(busqueda)
  );

  return (
    <div className="p-6 lg:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">Clientes</h1>
          <p className="text-sm text-[var(--text-soft)] mt-0.5">
            {clientes.length} clientes registrados
          </p>
        </div>
        <button
          onClick={() => { setEditando(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[var(--accent)] hover:opacity-90 transition"
        >
          <span className="text-base leading-none">+</span>
          Nuevo cliente
        </button>
      </div>

      {/* Buscador */}
      <input
        className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] w-80"
        placeholder="Buscar por nombre, email o WhatsApp..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {/* Tabla */}
      <div className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[var(--text-soft)]">
            Cargando clientes...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-3xl">👥</span>
            <p className="text-sm text-[var(--text-soft)]">No se encontraron clientes</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-[var(--bg)]">
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide">WhatsApp</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide">Última visita</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide">Portal</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-soft)] font-medium uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c, i) => (
                <tr
                  key={c.cliente_id}
                  className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)] transition ${i % 2 === 1 ? "bg-[var(--bg)]/30" : ""
                    }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar nombre={c.nombre} />
                      <span className="font-medium">{c.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-soft)]">{c.email || "—"}</td>
                  <td className="px-4 py-3 font-mono text-sm text-[var(--text-soft)]">
                    {c.id_whatsapp || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-soft)]">
                    {c.ultima_visita ? new Date(c.ultima_visita).toLocaleDateString("es-CR") : "Nunca"}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge tieneCitaReciente={c.tiene_cita_reciente} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border ${c.portal_habilitado
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}
                    >
                      {c.portal_habilitado ? "Habilitado" : "Deshabilitado"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setEditando(c); setModalOpen(true); }}
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

      <ClienteModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); }}
        onSave={handleSave}
        onDelete={handleDelete}
        inicial={editando ? {
          cliente_id: editando.cliente_id,
          nombre: editando.nombre,
          email: editando.email,
          id_whatsapp: editando.id_whatsapp ?? undefined,
          origen: editando.origen ?? undefined,
          portal_habilitado: editando.portal_habilitado,
        } : undefined}
        loading={saving}
      />
    </div>
  );
}

export default function PageWrapper() {
  return <DashboardLayout>{<ClientesPage />}</DashboardLayout>;
}