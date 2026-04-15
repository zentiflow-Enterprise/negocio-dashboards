"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/lib/client";
import { useNegocio } from "@/lib/hooks/useNegocio";
import toast from "react-hot-toast";
import DashboardLayout from "../dashboard/layout";

function PerfilPage() {
    const supabase = createClient();
    const { negocio } = useNegocio();

    const [usuario, setUsuario] = useState<any>(null);
    const [form, setForm] = useState<any>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from("usuarios_dashboard")
                .select("*")
                .eq("auth_user_id", user.id)
                .single();

            if (data) {
                setUsuario(data);
                setForm(data);
            }
        };

        loadUser();
    }, [supabase]);

    const updateField = (key: string, value: any) => {
        setForm((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!usuario?.id) {
            toast.error("No se encontró el usuario");
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from("usuarios_dashboard")
                .update({
                    nombre: form.nombre,
                    telefono: form.telefono,
                    actualizado_en: new Date().toISOString(),
                })
                .eq("id", usuario.id);

            if (error) throw error;

            setUsuario({ ...usuario, ...form });
            toast.success("✅ Perfil actualizado correctamente");
        } catch (err) {
            toast.error("❌ Error al actualizar el perfil");
        } finally {
            setSaving(false);
        }
    };

    const handleDiscard = () => {
        window.location.reload();
    };

    if (!usuario) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 w-full max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-medium">Mi Perfil</h1>
                <p className="text-sm text-[var(--text-soft)] mt-1">Gestiona tu información personal</p>
            </div>

            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-8">
                {/* Avatar */}
                <div className="flex flex-col items-center mb-8">
                    <div
                        className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-5xl font-semibold mb-4"
                        style={{ background: "var(--accent)" }}
                    >
                        {usuario.nombre?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <h2 className="text-xl font-medium">{usuario.nombre}</h2>
                    <span className="mt-1 px-3 py-1 text-xs font-medium rounded-full bg-[var(--accent-10)] text-[var(--accent)]">
                        {usuario.rol === "admin" || usuario.rol === "Administrador" ? "Administrador" : "Barbero"}
                    </span>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Nombre completo</label>
                        <input
                            className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm"
                            value={form.nombre || ""}
                            onChange={(e) => updateField("nombre", e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Correo electrónico</label>
                        <input
                            type="email"
                            className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm"
                            value={usuario.email || ""}
                            disabled
                        />
                        <p className="text-xs text-[var(--text-soft)] mt-1">El correo electrónico no se puede modificar</p>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Teléfono</label>
                        <input
                            className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] rounded-xl px-4 text-sm"
                            value={form.telefono || ""}
                            onChange={(e) => updateField("telefono", e.target.value)}
                            placeholder="506 8888 8888"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-10">
                    <button
                        onClick={handleDiscard}
                        className="px-6 py-3 border border-[var(--border)] rounded-xl text-sm font-medium hover:bg-[var(--bg-soft)] transition"
                    >
                        Descartar cambios
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-[var(--accent)] text-white rounded-xl text-sm font-medium disabled:opacity-70"
                    >
                        {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ====================== WRAPPER ====================== */
export default function PageWrapper() {
    return <DashboardLayout><PerfilPage /></DashboardLayout>;
}