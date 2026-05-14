"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/lib/client";
import { useNegocio } from "@/lib/hooks/useNegocio";
import DashboardLayout from "../dashboard/layout";
import toast from "react-hot-toast";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { CountrySelect, CountryCode } from "@/components/ui/CountrySelect";
import { SimpleSelect } from "@/components/ui/SimpleSelect";
import { COUNTRIES, Flag } from "@/components/ui/CountrySelect";

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
  tiene_cita_reciente: boolean;
  pais: string | null;
}

interface ClienteForm {
  nombre: string;
  email: string;
  id_whatsapp: string;
  origen: string;
  portal_habilitado: boolean;
  pais: CountryCode;
}

type FiltroEstado = "todos" | "activo" | "inactivo";

const FORM_EMPTY: ClienteForm = {
  nombre: "",
  email: "",
  id_whatsapp: "",
  origen: "manual",
  portal_habilitado: true,
  pais: "CR",
};

function genId() {
  return "cli_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmtOrigen(o: string | null) {
  const map: Record<string, string> = {
    manual: "Manual",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    web: "Web / Portal",
  };
  return o ? (map[o] ?? o) : "—";
}

function fmtDate(d: string | null) {
  if (!d) return "Nunca";
  return new Date(d).toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function phoneDisplay(phone: string | null): { flag: string; local: string } | null {
  if (!phone) return null;
  const match = COUNTRIES.find((c) => phone.startsWith(c.dial));
  if (!match) return { flag: "cr", local: phone };
  return {
    flag: match.flag,
    local: phone.slice(match.dial.length).trim(),
  };
}

function toE164(phone: string): string {
  if (!phone) return "";
  const clean = phone.replace(/\s/g, "");
  if (clean.startsWith("+")) return clean;
  return "+" + clean;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ nombre, size = 38 }: { nombre: string; size?: number }) {
  const initials = nombre
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size < 32 ? 11 : 13,
        fontWeight: 500,
        color: "#fff",
        flexShrink: 0,
        opacity: 0.9,
      }}
    >
      {initials}
    </div>
  );
}

// ─── Badge Estado ─────────────────────────────────────────────────────────────
function EstadoBadge({ activo }: { activo: boolean }) {
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

// ─── Portal Badge ─────────────────────────────────────────────────────────────
function PortalBadge({ habilitado }: { habilitado: boolean }) {
  return (
    <span
      className={[
        "text-[10px] px-2.5 py-1 rounded-full border font-medium",
        habilitado
          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          : "bg-amber-500/10 text-amber-500 border-amber-500/20",
      ].join(" ")}
    >
      {habilitado ? "Portal activo" : "Portal inactivo"}
    </span>
  );
}

// ─── Tarjeta cliente ──────────────────────────────────────────────────────────
function ClienteCard({
  cliente,
  onEdit,
}: {
  cliente: Cliente;
  onEdit: (c: Cliente) => void;
}) {
  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl flex flex-col gap-3 p-4 hover:border-[var(--accent)]/40 transition-all duration-150">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar nombre={cliente.nombre} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-tight truncate">{cliente.nombre}</p>
          <p className="text-[11px] text-[var(--text-soft)] mt-0.5">{fmtOrigen(cliente.origen)}</p>
        </div>
        <EstadoBadge activo={cliente.tiene_cita_reciente} />
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {/* Email — full width */}
        <div className="col-span-2">
          <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">Email</p>
          <p
            className={`text-xs truncate ${cliente.email ? "text-[var(--color-text-primary)]" : "text-[var(--text-soft)]"
              }`}
          >
            {cliente.email || "No registrado"}
          </p>
        </div>



        <div>
          <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">WhatsApp</p>
          {(() => {
            const p = phoneDisplay(cliente.id_whatsapp);
            if (!p) return <p className="text-xs text-[var(--text-soft)]">—</p>;
            return (
              <div className="flex items-center gap-1.5">
                <Flag code={p.flag} size={18} />
                <span className="text-xs font-mono">{p.local}</span>
              </div>
            );
          })()}
        </div>

        <div>
          <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-wide mb-0.5">Última visita</p>
          <p className="text-xs">{fmtDate(cliente.ultima_visita)}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <PortalBadge habilitado={cliente.portal_habilitado} />
        <div className="flex gap-1.5">
          {cliente.id_whatsapp && (
            <a
              href={`https://wa.me/${cliente.id_whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg text-[11px] border border-emerald-500/30 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 transition"
            >
              WA
            </a>
          )}
          <button
            onClick={() => onEdit(cliente)}
            className="px-3 py-1 rounded-lg text-[11px] border border-[var(--border)] hover:bg-[var(--bg-soft)] transition"
          >
            Editar
          </button>
        </div>
      </div>
    </div>
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
    setForm({
      ...FORM_EMPTY,
      ...inicial,
      nombre: inicial?.nombre ?? "",
      email: inicial?.email ?? "",
      id_whatsapp: inicial?.id_whatsapp ?? "",
      origen: inicial?.origen ?? "manual",
      portal_habilitado: inicial?.portal_habilitado ?? true,
      pais: inicial?.pais ?? "CR",
    });
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
        {/* Header modal */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <Avatar nombre={form.nombre || "?"} size={30} />
            <h2 className="font-medium text-sm">
              {inicial?.cliente_id ? "Editar cliente" : "Nuevo cliente"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-[var(--bg-soft)] flex items-center justify-center text-[var(--text-soft)]"
          >
            ✕
          </button>
        </div>

        {/* Campos */}
        <div className="p-5 flex flex-col gap-4">
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

          {/* País */}
          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">País</label>
            <CountrySelect
              value={form.pais}
              onChange={(code) => {
                setForm(p => ({ ...p, pais: code, id_whatsapp: "" }));
              }}
            />
            <p className="text-xs text-[var(--text-soft)] mt-1">
              Al cambiar el país se actualizará el código de área del teléfono
            </p>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">WhatsApp</label>
            <PhoneInput
              key={form.pais}
              international
              defaultCountry={form.pais}
              value={form.id_whatsapp}
              onChange={(value) => setForm(p => ({ ...p, id_whatsapp: value || "" }))}
              placeholder="Ingrese número de WhatsApp"
              className="custom-phone-input"
              numberInputProps={{
                className: "flex-1 h-full bg-[var(--bg)] text-[var(--text)] text-sm focus:outline-none px-4",
              }}
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-soft)] mb-1 block">Origen</label>
            <SimpleSelect
              value={form.origen}
              onChange={(v) => set("origen", v)}
              options={[
                { value: "manual", label: "Manual" },
                { value: "whatsapp", label: "WhatsApp" },
                { value: "telegram", label: "Telegram" },
                { value: "portal", label: "Portal" },
                { value: "referido", label: "Referido" },
              ]}
            />
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
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.portal_habilitado ? "translate-x-5" : "translate-x-0"
                  }`}
              />
            </button>
          </div>
        </div>

        {/* Acciones modal */}
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
  const [filtro, setFiltro] = useState<FiltroEstado>("todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);

  const loadClientes = useCallback(async () => {
    if (!negocio?.id) return;
    setLoading(true);

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

    const { data: clientesActivos } = await supabase
      .from("v_clientes_con_actividad_reciente")
      .select("id_cliente")
      .eq("negocio_id", negocio.id)
      .in("id_cliente", clienteIds);

    const setActivos = new Set(clientesActivos?.map((c: any) => c.id_cliente) || []);

    setClientes(
      clientesData.map((c: any) => ({
        ...c,
        tiene_cita_reciente: setActivos.has(c.cliente_id),
      })) as Cliente[]
    );
    setLoading(false);
  }, [negocio?.id]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  const handleSave = async (form: ClienteForm, id?: string) => {
    if (!negocio?.id) return;
    setSaving(true);
    try {
      // Normalizar teléfono a E.164
      const formNormalizado = {
        ...form,
        id_whatsapp: form.id_whatsapp ? toE164(form.id_whatsapp) : "",
      };

      // Validar WhatsApp duplicado
      if (formNormalizado.id_whatsapp) {
        const { data: waExiste } = await supabase
          .from("clientes_negocio")
          .select("cliente_id, nombre")
          .eq("negocio_id", negocio.id)
          .eq("id_whatsapp", formNormalizado.id_whatsapp)
          .neq("cliente_id", id ?? "")
          .maybeSingle();

        if (waExiste) {
          toast.error(`WhatsApp ya está registrado por ${waExiste.nombre}`);
          setSaving(false);
          return;
        }
      }

      // Validar email duplicado
      if (formNormalizado.email) {
        const { data: emailExiste } = await supabase
          .from("clientes_negocio")
          .select("cliente_id, nombre")
          .eq("negocio_id", negocio.id)
          .eq("email", formNormalizado.email)
          .neq("cliente_id", id ?? "")
          .maybeSingle();

        if (emailExiste) {
          toast.error(`Email ya está registrado por ${emailExiste.nombre}`);
          setSaving(false);
          return;
        }
      }

      const payload = {
        ...formNormalizado,
        negocio_id: negocio.id,
        actualizado_en: new Date().toISOString(),
      };

      if (id) {
        await supabase.from("clientes_negocio").update(payload).eq("cliente_id", id);
        toast.success("Cliente actualizado ✅");
      } else {
        await supabase.from("clientes_negocio").insert([
          { ...payload, cliente_id: genId(), creado_en: new Date().toISOString() },
        ]);
        toast.success("Cliente creado ✅");
      }

      setModalOpen(false);
      setEditando(null);
      loadClientes();
    } catch (e: any) {
      if (e?.code === "23505") {
        if (e.message.includes("whatsapp")) {
          toast.error("Este WhatsApp ya está registrado en otro cliente");
        } else if (e.message.includes("email")) {
          toast.error("Este email ya está registrado en otro cliente");
        } else {
          toast.error("Dato duplicado");
        }
      } else {
        toast.error("Error al guardar ❌");
      }
      console.error(e);
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

  const filtrados = clientes.filter((c) => {
    if (filtro === "activo" && !c.tiene_cita_reciente) return false;
    if (filtro === "inactivo" && c.tiene_cita_reciente) return false;
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.id_whatsapp?.includes(q)
    );
  });

  const FILTROS: { key: FiltroEstado; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "activo", label: "Activos" },
    { key: "inactivo", label: "Inactivos" },
  ];

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
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition"
          style={{ background: "var(--accent)" }}
        >
          <span className="text-base leading-none">+</span>
          Nuevo cliente
        </button>
      </div>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input
          className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] w-full sm:w-72"
          placeholder="Buscar por nombre, email o WhatsApp..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {/* Filtros de estado */}
        <div className="flex gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition ${filtro === f.key
                ? "text-white border-transparent"
                : "border-[var(--border)] text-[var(--text-soft)] hover:bg-[var(--bg-soft)]"
                }`}
              style={filtro === f.key ? { background: "var(--accent)" } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-[var(--text-soft)] ml-auto whitespace-nowrap">
          {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--text-soft)] text-sm">
          Cargando clientes...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl">
          <span className="text-4xl opacity-30">👥</span>
          <p className="text-sm text-[var(--text-soft)]">No se encontraron clientes</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtrados.map((c) => (
            <ClienteCard
              key={c.cliente_id}
              cliente={c}
              onEdit={(c) => { setEditando(c); setModalOpen(true); }}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <ClienteModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); }}
        onSave={handleSave}
        onDelete={handleDelete}
        inicial={
          editando
            ? {
              cliente_id: editando.cliente_id,
              nombre: editando.nombre,
              email: editando.email ?? "",
              id_whatsapp: editando.id_whatsapp ?? "",
              origen: editando.origen ?? "manual",
              portal_habilitado: editando.portal_habilitado,
              pais: (editando.pais as CountryCode) ?? "CR",
            }
            : undefined
        }
        loading={saving}
      />
    </div>
  );
}

export default function PageWrapper() {
  return <DashboardLayout>{<ClientesPage />}</DashboardLayout>;
}
