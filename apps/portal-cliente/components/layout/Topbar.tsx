"use client";

import { createClient } from "@supabase/lib/client";
import { useRouter } from "next/navigation";

export function Topbar({
    negocio,
    theme,
    toggleTheme,
}: {
    negocio: any;
    theme: "dark" | "light";
    toggleTheme: () => void;
}) {
    const supabase = createClient();
    const router = useRouter();

    // ═══════════════════════════════════════
    // 🔐 LOGOUT REAL
    // ═══════════════════════════════════════
    const logout = async () => {
        await supabase.auth.signOut();
        router.replace("/");
    };

    const nombre = negocio?.nombre || "Mi negocio";
    const ciudad = negocio?.ciudad || "";


    return (
        <div className="h-16 border-b border-[var(--border)] flex items-center justify-between px-6 bg-[var(--bg)] transition-all">

            {/* ═════════════════ LEFT ═════════════════ */}
            <div className="flex items-center gap-3 pl-14 md:pl-0">

                {negocio?.logo && (
                    <img
                        src={negocio.logo}
                        className="w-12 h-12 rounded-xl object-cover border border-[var(--border)] md:hidden"
                        alt={nombre}
                    />
                )}

                <div className="flex flex-col">
                    <div className="font-semibold text-sm md:text-base">
                        {nombre}
                    </div>
                    <div className="text-xs text-[var(--text-soft)]">
                        {ciudad || "Portal cliente"}
                    </div>
                </div>
            </div>
            {/* ═════════════════ RIGHT ═════════════════ */}
            <div className="flex items-center gap-3">

                {/* 🌙 THEME */}
                <button
                    onClick={toggleTheme}
                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-[var(--border)] hover:bg-[var(--bg-soft)] transition"
                >
                    {theme === "dark" ? "☀️" : "🌙"}
                </button>

                {/* 🔐 LOGOUT */}
                <button
                    onClick={logout}
                    className="hidden md:block px-4 py-2 rounded-xl bg-[var(--bg-soft)] border border-[var(--border)] hover:bg-red-500 hover:text-white transition text-sm"
                >
                    Cerrar sesión
                </button>

            </div>
        </div>
    );
}