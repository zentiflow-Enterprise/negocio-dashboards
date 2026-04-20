"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/lib/client";
import { useNegocio } from "@/lib/hooks/useNegocio";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import DashboardLayout from "../dashboard/layout";

// ====================== PAÍSES PERMITIDOS ======================
// flag: código ISO 3166-1 alpha-2 en minúsculas → flagcdn.com lo usa así
const COUNTRIES = [
    { code: "CR", name: "Costa Rica", flag: "cr" },
    { code: "MX", name: "México", flag: "mx" },
    { code: "CO", name: "Colombia", flag: "co" },
    { code: "PA", name: "Panamá", flag: "pa" },
    { code: "NI", name: "Nicaragua", flag: "ni" },
    { code: "GT", name: "Guatemala", flag: "gt" },
    { code: "SV", name: "El Salvador", flag: "sv" },
    { code: "HN", name: "Honduras", flag: "hn" },
    { code: "CA", name: "Canadá", flag: "ca" },
] as const;

type CountryCode = typeof COUNTRIES[number]["code"];
const allowedCountries = COUNTRIES.map((c) => c.code) as unknown as readonly [CountryCode, ...CountryCode[]];

const perfilSchema = z.object({
    nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    telefono: z.string().optional(),
    pais: z.enum(allowedCountries),
});
type PerfilForm = z.infer<typeof perfilSchema>;

// ====================== COMPONENTE BANDERA ======================
// Usa flagcdn.com — imágenes reales, funcionan en todos los OS incluido Windows
function Flag({ code, size = 24 }: { code: string; size?: number }) {
    return (
        <img
            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
            srcSet={`https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
            width={size}
            height={Math.round(size * 0.67)}
            alt={code}
            style={{
                objectFit: "cover",
                borderRadius: 3,
                flexShrink: 0,
                display: "block",
            }}
        />
    );
}

// ====================== SELECTOR DE PAÍS CUSTOM ======================
function CountrySelect({
    value,
    onChange,
    error,
}: {
    value: CountryCode;
    onChange: (code: CountryCode) => void;
    error?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = COUNTRIES.find((c) => c.code === value) ?? COUNTRIES[0];

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] rounded-xl px-4 text-sm focus:outline-none flex items-center justify-between gap-3 transition-colors"
                style={{ borderColor: open ? "var(--accent)" : undefined }}
            >
                <span className="flex items-center gap-3">
                    <Flag code={selected.flag} size={22} />
                    <span>{selected.name}</span>
                </span>
                <svg
                    width="12" height="12" viewBox="0 0 20 20" fill="none"
                    style={{
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                        flexShrink: 0,
                        color: "var(--text-soft)",
                    }}
                >
                    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border)] py-1 shadow-xl overflow-hidden"
                    style={{ background: "var(--bg)" }}
                >
                    {COUNTRIES.map((c) => (
                        <button
                            key={c.code}
                            type="button"
                            onClick={() => { onChange(c.code as CountryCode); setOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                            style={{
                                background: c.code === value ? "var(--bg-soft)" : "transparent",
                                color: "var(--text)",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-soft)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = c.code === value ? "var(--bg-soft)" : "transparent")}
                        >
                            <Flag code={c.flag} size={22} />
                            <span>{c.name}</span>
                            {c.code === value && (
                                <svg className="ml-auto" width="14" height="14" viewBox="0 0 20 20" fill="none">
                                    <path d="M4 10l5 5 7-8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
}

// ====================== PÁGINA PRINCIPAL ======================
function PerfilPage() {
    const supabase = createClient();
    const { negocio } = useNegocio();

    const [usuario, setUsuario] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const form = useForm<PerfilForm>({
        resolver: zodResolver(perfilSchema),
        defaultValues: { nombre: "", telefono: "", pais: "CR" },
    });

    const paisActual = form.watch("pais") as CountryCode;

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
                form.reset({
                    nombre: data.nombre || "",
                    telefono: data.telefono || "",
                    pais: (allowedCountries as readonly string[]).includes(data.pais)
                        ? (data.pais as CountryCode)
                        : "CR",
                });
            }
        };
        loadUser();
    }, [supabase, form]);

    const onSubmit = async (data: PerfilForm) => {
        if (!usuario?.usuario_id) { toast.error("No se encontró el usuario"); return; }
        setSaving(true);
        try {
            const { error } = await supabase
                .from("usuarios_dashboard")
                .update({ nombre: data.nombre, telefono: data.telefono, pais: data.pais })
                .eq("usuario_id", usuario.usuario_id);
            if (error) throw error;
            setUsuario({ ...usuario, ...data });
            toast.success("✅ Perfil actualizado correctamente");
        } catch (err) {
            console.error(err);
            toast.error("❌ Error al actualizar el perfil");
        } finally {
            setSaving(false);
        }
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

            <form onSubmit={form.handleSubmit(onSubmit)} className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-8">
                {/* Avatar */}
                <div className="flex flex-col items-center mb-8">
                    <div
                        className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-5xl font-semibold mb-4"
                        style={{ background: "var(--accent)" }}
                    >
                        {usuario.nombre?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <h2 className="text-xl font-medium">{usuario.nombre}</h2>
                </div>

                <div className="space-y-6">
                    {/* Nombre */}
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Nombre completo</label>
                        <input
                            {...form.register("nombre")}
                            className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] rounded-xl px-4 text-sm focus:outline-none focus:border-[var(--accent)]"
                        />
                        {form.formState.errors.nombre && (
                            <p className="text-xs text-red-500 mt-1">{form.formState.errors.nombre.message}</p>
                        )}
                    </div>

                    {/* Correo */}
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Correo electrónico</label>
                        <input
                            type="email"
                            value={usuario.email || ""}
                            disabled
                            className="w-full h-11 border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text-soft)] rounded-xl px-4 text-sm cursor-not-allowed"
                        />
                        <p className="text-xs text-[var(--text-soft)] mt-1">El correo electrónico no se puede modificar</p>
                    </div>

                    {/* País predeterminado */}
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">País predeterminado</label>
                        <CountrySelect
                            value={paisActual}
                            onChange={(code) => {
                                form.setValue("pais", code, { shouldDirty: true, shouldValidate: true });
                                // Limpiar teléfono → PhoneInput se re-monta con el nuevo defaultCountry
                                form.setValue("telefono", "", { shouldDirty: true });
                            }}
                            error={form.formState.errors.pais?.message}
                        />
                        <p className="text-xs text-[var(--text-soft)] mt-1">
                            Al cambiar el país se actualizará automáticamente el código de área del teléfono
                        </p>
                    </div>

                    {/* Teléfono */}
                    <div>
                        <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">Teléfono</label>
                        {/*
                         * key={paisActual} fuerza re-mount del PhoneInput al cambiar país,
                         * lo que aplica el nuevo defaultCountry y muestra el código de área correcto.
                         */}
                        <PhoneInput
                            key={paisActual}
                            international
                            defaultCountry={paisActual}
                            value={form.watch("telefono") || ""}
                            onChange={(value) =>
                                form.setValue("telefono", value || "", { shouldValidate: true, shouldDirty: true })
                            }
                            placeholder="Ingrese número de teléfono"
                            className="custom-phone-input"
                            numberInputProps={{
                                className: "flex-1 h-full bg-[var(--bg)] text-[var(--text)] text-sm focus:outline-none px-4",
                            }}
                        />
                        {form.formState.errors.telefono && (
                            <p className="text-xs text-red-500 mt-1">{form.formState.errors.telefono.message}</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-10">
                    <button
                        type="button"
                        onClick={() => form.reset()}
                        className="px-6 py-3 border border-[var(--border)] text-[var(--text)] rounded-xl text-sm font-medium hover:bg-[var(--bg-soft)] transition"
                    >
                        Descartar cambios
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !form.formState.isDirty}
                        className="px-8 py-3 bg-[var(--accent)] text-white rounded-xl text-sm font-medium disabled:opacity-70 transition hover:opacity-90"
                    >
                        {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function PageWrapper() {
    return <DashboardLayout><PerfilPage /></DashboardLayout>;
}
