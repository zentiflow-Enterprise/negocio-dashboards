"use client";

import { createClient } from "@supabase/lib/client";

export function Sidebar({ negocio }: { negocio: any }) {
    const supabase = createClient();

    const nombreNegocio = negocio?.nombre || "Cargando...";
    const logo = negocio?.logo;

    // 🔐 usuario (puedes luego traerlo desde hook global)
    const userNombre = "Admin"; // luego dinámico
    const userRol = "Administrador";

    const logout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
    };

    return (
        <aside className="w-64 border-r border-[var(--border)] bg-[var(--bg-soft)] p-4 flex flex-col justify-between">

            {/* TOP */}
            <div>

                {/* LOGO + NEGOCIO */}
                <div className="flex items-center gap-3 mb-6">

                    {logo ? (
                        <img
                            src={logo}
                            className="w-10 h-10 rounded-xl object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-black font-bold">
                            {nombreNegocio.charAt(0)}
                        </div>
                    )}

                    <div className="font-semibold text-sm truncate">
                        {nombreNegocio}
                    </div>
                </div>

                {/* NAV */}
                <nav className="flex flex-col gap-2 text-sm">

                    <div className="p-2 rounded-lg hover:bg-accent hover:text-black cursor-pointer transition">
                        🏠 Inicio
                    </div>

                    <div className="p-2 rounded-lg hover:bg-accent hover:text-black cursor-pointer transition">
                        📅 Citas
                    </div>

                    <div className="p-2 rounded-lg hover:bg-accent hover:text-black cursor-pointer transition">
                        ➕ Agendar
                    </div>

                    <div className="p-2 rounded-lg hover:bg-accent hover:text-black cursor-pointer transition">
                        👤 Perfil
                    </div>

                </nav>
            </div>

            {/* BOTTOM */}
            <div className="flex flex-col gap-4">

                {/* USER */}
                <div className="flex items-center gap-3 p-2 rounded-lg bg-black/5 dark:bg-white/5">

                    {/* AVATAR */}
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-black font-bold">
                        {userNombre.charAt(0)}
                    </div>

                    {/* INFO */}
                    <div className="flex flex-col text-sm">
                        <span className="font-medium">{userNombre}</span>
                        <span className="text-xs text-[var(--text-soft)]">
                            {userRol}
                        </span>
                    </div>

                </div>

                {/* LOGOUT */}
                <button
                    onClick={logout}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 text-sm font-medium"
                >
                    🚪 Cerrar sesión
                </button>

                {/* FOOTER */}
                <div className="text-xs text-[var(--text-soft)] text-center">
                    Portal · Zentiflow
                </div>

            </div>

        </aside>
    );
}