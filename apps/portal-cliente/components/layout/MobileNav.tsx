"use client";

import { useRouter } from "next/navigation";

export function MobileNav() {
    const router = useRouter();

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 flex justify-around py-2">
            <button onClick={() => router.push("/dashboard")}>🏠</button>
            <button onClick={() => router.push("/dashboard/citas")}>📅</button>
            <button onClick={() => router.push("/dashboard/agendar")}>➕</button>
            <button onClick={() => router.push("/dashboard/perfil")}>👤</button>
        </nav>
    );
}