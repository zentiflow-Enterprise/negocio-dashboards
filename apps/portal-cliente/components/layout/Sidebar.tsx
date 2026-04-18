"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@supabase/lib/client";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
    {
        section: "Principal",
        items: [
            {
                href: "/dashboard",
                label: "Dashboard",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="2" />
                        <rect x="14" y="3" width="7" height="7" rx="2" />
                        <rect x="3" y="14" width="7" height="7" rx="2" />
                        <rect x="14" y="14" width="7" height="7" rx="2" />
                    </svg>
                ),
            },
        ],
    },
    {
        section: "Operaciones",
        items: [
            {
                href: "/citas",
                label: "Mis Citas",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                ),
            },
            {
                href: "/historial",
                label: "Historial",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 8v4l3 3" />
                        <circle cx="12" cy="12" r="10" />
                    </svg>
                ),
            },
        ],
    },
    {
        section: "Gestión",
        items: [
            {
                href: "/clientes",
                label: "Clientes",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.34a4 4 0 0 1 0 7.32" />
                    </svg>
                ),
            },
            {
                href: "/servicios",
                label: "Servicios",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                    </svg>
                ),
            },
            {
                href: "/profesionales",
                label: "Profesionales",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                ),
            },
            {
                href: "/turnos",
                label: "Turnos",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                ),
            },
            {
                href: "/empresa",
                label: "Empresa",
                icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="7" width="18" height="13" rx="2" />
                        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                        <path d="M9 17h6" />
                        <path d="M9 13h6" />
                    </svg>
                ),
            },
        ],
    },
];

export function Sidebar({ negocio, usuario, mobile = false }: { negocio: any; usuario: any; mobile?: boolean }) {
    const supabase = createClient();
    const pathname = usePathname();



    const nombreNegocio = negocio?.nombre || "Mi Negocio";
    const logo = negocio?.neg_logo_url || negocio?.logo;

    const logout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
    };

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

    const userName = usuario?.nombre?.split(" ")[0] || "";

    const userRole =
        usuario?.rol === "admin" || usuario?.rol === "Administrador"
            ? "Administrador"
            : "";
    return (
        <aside className={`${mobile ? "flex" : "hidden md:flex"} w-64 border-r border-[var(--border)] bg-[var(--bg-soft)] p-5 flex-col min-h-screen`}>

            {/* Logo + Negocio */}
            <div className="flex items-center gap-3 mb-6">
                {logo ? (
                    <img
                        src={logo}
                        className="w-12 h-12 rounded-2xl object-cover border border-[var(--border)]"
                        alt={nombreNegocio}
                    />
                ) : (
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
                        style={{ background: "var(--accent)" }}
                    >
                        {nombreNegocio.charAt(0)}
                    </div>
                )}
                <div className="font-semibold text-base leading-tight truncate">
                    {nombreNegocio}
                </div>
            </div>

            {/* Navegación */}
            <nav className="flex-1 flex flex-col gap-6">
                {NAV_ITEMS.map((group) => (
                    <div key={group.section}>
                        <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-widest px-3 mb-2">
                            {group.section}
                        </p>
                        <div className="flex flex-col gap-1">
                            {group.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[15px] font-medium transition-all ${isActive(item.href)
                                        ? "bg-[var(--accent)]/10 text-[var(--accent)] border-l-4 border-[var(--accent)] pl-6"
                                        : "text-[var(--text-soft)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
                                        }`}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* ==================== SECCIÓN PERFIL ==================== */}
            <div className="pt-6 border-t border-[var(--border)] mt-4">
                <p className="text-[10px] text-[var(--text-soft)] uppercase tracking-widest px-3 mb-2">
                    PERFIL
                </p>

                {/* Botón Perfil */}
                <Link
                    href="/perfil"
                    className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg)] hover:bg-[var(--bg-soft)] transition-all w-full text-left mb-3"
                >
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0"
                        style={{ background: "var(--accent)" }}
                    >
                        {userName.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm truncate">{userName}</span>
                        <span className="text-xs text-[var(--text-soft)] capitalize">{userRole}</span>
                    </div>
                </Link>

                {/* Botón Cerrar Sesión */}
                <button
                    onClick={logout}
                    className="w-full py-3 rounded-2xl text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-all text-sm font-medium border border-red-500/30 hover:border-red-500"
                >
                    Cerrar sesión
                </button>
            </div>
        </aside>
    );
}