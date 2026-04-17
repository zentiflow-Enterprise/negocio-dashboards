"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/lib/client";
import { useNegocio } from "@/lib/hooks/useNegocio";
import toast from "react-hot-toast";
import DashboardLayout from "../dashboard/layout";

const MONEDAS = [
    { value: "₡", label: "₡ Colón (CRC)" },
    { value: "$", label: "$ Dólar (USD)" },
    { value: "€", label: "€ Euro (EUR)" },
    { value: "Q", label: "Q Quetzal (GTQ)" },
];

const TIPOS = [
    { value: "barberia", label: "Barbería" },
    { value: "salon", label: "Salón de belleza" },
    { value: "spa", label: "Spa" },
    { value: "clinica", label: "Clínica" },
    { value: "otro", label: "Otro" },
];

const INTERVALOS = [15, 30, 45, 60];

const DIAS = [
    { key: "lunes", label: "Lunes" },
    { key: "martes", label: "Martes" },
    { key: "miercoles", label: "Miércoles" },
    { key: "jueves", label: "Jueves" },
    { key: "viernes", label: "Viernes" },
    { key: "sabado", label: "Sábado" },
    { key: "domingo", label: "Domingo" },
];

function EmpresaPage() {
    const supabase = createClient();
    const { negocio, loading: negocioLoading } = useNegocio();

    const [form, setForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [activeDays, setActiveDays] = useState<string[]>(["lunes", "martes", "miercoles", "jueves", "viernes"]); // días activos por defecto
    const [loadingData, setLoadingData] = useState(true);
    // Cargar datos completos
    useEffect(() => {
        if (!negocio?.id) return;

        const loadFullData = async () => {
            setLoadingData(true);

            const { data } = await supabase
                .from("config_negocio")
                .select("*")
                .eq("negocio_id", negocio.id)
                .single();

            if (data) setForm(data);

            setLoadingData(false);
        };

        loadFullData();
    }, [negocio?.id, supabase]);

    const updateField = (key: string, value: any) => {
        setForm((prev: any) => ({ ...prev, [key]: value }));
    };

    const updateSocial = (key: string, value: string) => {
        setForm((prev: any) => ({
            ...prev,
            redes_sociales: { ...(prev.redes_sociales || {}), [key]: value },
        }));
    };

    const toggleDay = (day: string) => {
        setActiveDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        );
    };

    const saveSection = async () => {
        if (!negocio?.id) return toast.error("No se encontró el negocio");

        setSaving(true);
        try {
            const { error } = await supabase
                .from("config_negocio")
                .update({
                    ...form,
                    actualizado_en: new Date().toISOString(),
                })
                .eq("negocio_id", negocio.id);

            if (error) throw error;
            toast.success("✅ Guardado correctamente");
        } catch (err) {
            toast.error("❌ Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    const handleDiscard = () => window.location.reload();

    if (negocioLoading || loadingData) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 w-full max-w-4xl mx-auto flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-medium">Configuración de empresa</h1>
                    <p className="text-sm text-[var(--text-soft)] mt-1">
                        Gestiona toda la información y apariencia de tu negocio
                    </p>
                </div>
                <span
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wide"
                    style={{ background: "var(--accent-10)", color: "var(--accent)" }}
                >
                    PLAN: {form.plan || "DEMO"}
                </span>
            </div>

            {/* 1. Identidad del negocio */}
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
                    <div className="w-9 h-9 rounded-xl bg-[var(--accent-10)] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
                    </div>
                    <div>
                        <p className="font-medium">Identidad del negocio</p>
                        <p className="text-xs text-[var(--text-soft)]">Nombre, tipo, logo y color de marca</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 mb-6">
                    {form.neg_logo_url ? (
                        <img src={form.neg_logo_url} alt="Logo" className="w-16 h-16 rounded-2xl object-cover border border-[var(--border)]" />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white text-3xl font-bold">
                            {form.neg_nombre?.charAt(0) || "?"}
                        </div>
                    )}
                    <div>
                        <p className="font-medium text-sm">Logo actual</p>
                        <p className="text-xs text-[var(--text-soft)]">No editable por el momento</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Nombre del negocio</label>
                        <input className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" value={form.neg_nombre || ""} onChange={(e) => updateField("neg_nombre", e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Tipo de negocio</label>
                        <select className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" value={form.neg_tipo || ""} onChange={(e) => updateField("neg_tipo", e.target.value)}>
                            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Ciudad</label>
                        <input className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" value={form.neg_ciudad || ""} onChange={(e) => updateField("neg_ciudad", e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Moneda</label>
                        <select className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" value={form.neg_moneda || "₡"} onChange={(e) => updateField("neg_moneda", e.target.value)}>
                            {MONEDAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Color de acento</label>
                        <div className="flex gap-3 items-center">
                            <div className="w-11 h-11 rounded-xl border border-[var(--border)] cursor-pointer" style={{ backgroundColor: form.neg_color_acento || "#c9a96e" }}>
                                <input type="color" className="w-full h-full opacity-0 cursor-pointer" value={form.neg_color_acento || "#c9a96e"} onChange={(e) => updateField("neg_color_acento", e.target.value)} />
                            </div>
                            <input className="h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 font-mono text-sm flex-1" value={form.neg_color_acento || ""} onChange={(e) => updateField("neg_color_acento", e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-8">
                    <button onClick={saveSection} disabled={saving} className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-medium">
                        {saving ? "Guardando..." : "Guardar Identidad"}
                    </button>
                </div>
            </div>

            {/* 2. Contacto y propietario */}
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
                    <div className="w-9 h-9 rounded-xl bg-[var(--accent-10)] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                    </div>
                    <div>
                        <p className="font-medium">Contacto y propietario</p>
                        <p className="text-xs text-[var(--text-soft)]">Datos de contacto y owner del negocio</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Nombre del propietario</label>
                        <input className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" value={form.neg_owner_nombre || ""} onChange={(e) => updateField("neg_owner_nombre", e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Email del propietario</label>
                        <input type="email" className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" value={form.neg_owner_email || ""} onChange={(e) => updateField("neg_owner_email", e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Teléfono del propietario</label>
                        <input className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" value={form.neg_owner_telefono || ""} onChange={(e) => updateField("neg_owner_telefono", e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">WhatsApp del negocio</label>
                        <input className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" value={form.neg_whatsapp || ""} onChange={(e) => updateField("neg_whatsapp", e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Dirección / Ubicación</label>
                        <input className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" value={form.ubicacion || ""} onChange={(e) => updateField("ubicacion", e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Información de parqueo</label>
                        <input className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" value={form.parqueo || ""} onChange={(e) => updateField("parqueo", e.target.value)} />
                    </div>
                </div>

                <div className="flex justify-end mt-8">
                    <button onClick={saveSection} disabled={saving} className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-medium">
                        {saving ? "Guardando..." : "Guardar Contacto"}
                    </button>
                </div>
            </div>

            {/* 3. Portal de clientes - SOLO LECTURA */}
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
                    <div className="w-9 h-9 rounded-xl bg-[var(--accent-10)] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                    </div>
                    <div>
                        <p className="font-medium">Portal de clientes</p>
                        <p className="text-xs text-[var(--text-soft)]">URL, email y subdominio (solo visualización)</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">URL del portal</label>
                        <input className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" value={form.portal_url || ""} disabled />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Subdominio</label>
                        <input className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" value={form.subdomain || ""} disabled />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Email remitente</label>
                        <input className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" value={form.portal_email_from || ""} disabled />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Nombre remitente</label>
                        <input className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" value={form.portal_email_name || ""} disabled />
                    </div>
                </div>
            </div>

            {/* 4. Horario y operaciones - DÍAS SELECCIONABLES */}
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
                    <div className="w-9 h-9 rounded-xl bg-[var(--accent-10)] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    </div>
                    <div>
                        <p className="font-medium">Horario y operaciones</p>
                        <p className="text-xs text-[var(--text-soft)]">Días de trabajo y horarios por día</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {DIAS.map((dia) => (
                        <div key={dia.key} className="flex items-center gap-4 bg-[var(--bg-soft)] p-4 rounded-xl">
                            <input
                                type="checkbox"
                                checked={activeDays.includes(dia.key)}
                                onChange={() => toggleDay(dia.key)}
                                className="w-5 h-5 accent-[var(--accent)] cursor-pointer"
                            />
                            <span className="w-28 font-medium text-sm">{dia.label}</span>
                            <input type="time" className="h-10 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-3 text-sm w-32" />
                            <span className="text-[var(--text-soft)]">a</span>
                            <input type="time" className="h-10 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-3 text-sm w-32" />
                        </div>
                    ))}
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Intervalo entre citas</label>
                        <select className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" value={form.neg_intervalo_min || 30} onChange={(e) => updateField("neg_intervalo_min", Number(e.target.value))}>
                            {INTERVALOS.map(i => <option key={i} value={i}>{i} minutos</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Política de cancelación</label>
                        <textarea className="w-full border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 py-3 text-sm min-h-[100px]" value={form.neg_politica_cancelacion || ""} onChange={(e) => updateField("neg_politica_cancelacion", e.target.value)} />
                    </div>
                </div>

                <div className="flex justify-end mt-8">
                    <button onClick={saveSection} disabled={saving} className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-medium">
                        {saving ? "Guardando..." : "Guardar Horario"}
                    </button>
                </div>
            </div>

            {/* 5. Integraciones - SOLO LECTURA */}
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
                    <div className="w-9 h-9 rounded-xl bg-[var(--accent-10)] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                    </div>
                    <div>
                        <p className="font-medium">Integraciones</p>
                        <p className="text-xs text-[var(--text-soft)]">Solo visualización (se editará más adelante)</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium">Chatbot activo</p>
                        </div>
                        <div className={`px-4 py-1 rounded-full text-sm font-medium ${form.chatbot_activo ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
                            {form.chatbot_activo ? "Activo" : "Inactivo"}
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium">Google Calendar</p>
                        </div>
                        <div className={`px-4 py-1 rounded-full text-sm font-medium ${form.gcal_activo ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
                            {form.gcal_activo ? "Activo" : "Inactivo"}
                        </div>
                    </div>
                </div>
            </div>

            {/* 6. Redes sociales */}
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
                    <div className="w-9 h-9 rounded-xl bg-[var(--accent-10)] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                    </div>
                    <div>
                        <p className="font-medium">Redes sociales</p>
                        <p className="text-xs text-[var(--text-soft)]">Enlaces que aparecerán en tu portal</p>
                    </div>
                </div>

                {[
                    { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/tu-pagina" },
                    { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/tu-usuario" },
                    { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@tu-canal" },
                    { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@tu-usuario" },
                ].map((s) => (
                    <div key={s.key} className="flex gap-3 mb-4">
                        <div className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] flex items-center justify-center text-xs font-semibold flex-shrink-0">{s.label.slice(0, 2)}</div>
                        <input className="flex-1 h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm" placeholder={s.placeholder} value={form.redes_sociales?.[s.key] || ""} onChange={(e) => updateSocial(s.key, e.target.value)} />
                    </div>
                ))}

                <div className="flex justify-end mt-8">
                    <button onClick={saveSection} disabled={saving} className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-medium">
                        {saving ? "Guardando..." : "Guardar Redes Sociales"}
                    </button>
                </div>
            </div>

            {/* Botón global */}
            <div className="flex justify-end pt-6 border-t border-[var(--border)]">
                <button onClick={handleDiscard} className="px-6 py-3 border border-[var(--border)] rounded-xl text-sm font-medium hover:bg-[var(--bg-soft)] transition">
                    Descartar todos los cambios
                </button>
            </div>
        </div>
    );
}

export default function PageWrapper() {
    return <DashboardLayout>{<EmpresaPage />}</DashboardLayout>;
}