"use client";

import { useRouter } from "next/navigation";

export function Sidebar({ negocio }: any) {
    const router = useRouter();

    return (
        <aside className="hidden md:flex flex-col w-64 bg-[#0a0a0a] border-r border-white/10 p-4">
            {/* Logo */}
            <div className="mb-6">
                <div className="text-lg font-bold">{negocio.neg_nombre}</div>
                <div className="text-xs text-gray-400">{negocio.neg_ciudad}</div>
            </div>

            {/* Navegación */}
            <nav className="flex flex-col gap-2">
                <button onClick={() => router.push("/dashboard")}>🏠 Inicio</button>
                <button onClick={() => router.push("/dashboard/citas")}>
                    📅 Mis citas
                </button>
                <button onClick={() => router.push("/dashboard/agendar")}>
                    ➕ Agendar
                </button>
                <button onClick={() => router.push("/dashboard/perfil")}>
                    👤 Perfil
                </button>
            </nav>

            {/* Footer */}
            <div className="mt-auto text-xs text-gray-500">
                Portal · {negocio.neg_nombre}
            </div>
        </aside>
    );
}