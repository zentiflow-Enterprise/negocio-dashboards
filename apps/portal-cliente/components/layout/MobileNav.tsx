"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNav() {
    const pathname = usePathname();

    const isActive = (path: string) =>
        pathname === path || pathname.startsWith(path + "/");

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg)] border-t border-[var(--border)] z-50">
            <div className="flex justify-around items-center py-1.5 px-4 max-w-md mx-auto">

                <Link href="/dashboard" className={`flex flex-col items-center py-2 px-3 transition-all ${isActive("/dashboard") ? "text-[var(--accent)]" : "text-[var(--text-soft)]"}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="2" />
                        <rect x="14" y="3" width="7" height="7" rx="2" />
                        <rect x="3" y="14" width="7" height="7" rx="2" />
                        <rect x="14" y="14" width="7" height="7" rx="2" />
                    </svg>
                    <span className="text-[10px] mt-1 font-medium">Inicio</span>
                </Link>

                <Link href="/citas" className={`flex flex-col items-center py-2 px-3 transition-all ${isActive("/citas") ? "text-[var(--accent)]" : "text-[var(--text-soft)]"}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className="text-[10px] mt-1 font-medium">Citas</span>
                </Link>

                <Link href="/citas/historial" className={`flex flex-col items-center py-2 px-3 transition-all ${isActive("/citas/historial") ? "text-[var(--accent)]" : "text-[var(--text-soft)]"}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 8v4l3 3" />
                        <circle cx="12" cy="12" r="10" />
                    </svg>
                    <span className="text-[10px] mt-1 font-medium">Historial</span>
                </Link>

                <Link href="/clientes" className={`flex flex-col items-center py-2 px-3 transition-all ${isActive("/clientes") ? "text-[var(--accent)]" : "text-[var(--text-soft)]"}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.34a4 4 0 0 1 0 7.32" />
                    </svg>
                    <span className="text-[10px] mt-1 font-medium">Clientes</span>
                </Link>
            </div>
        </nav>
    );
}