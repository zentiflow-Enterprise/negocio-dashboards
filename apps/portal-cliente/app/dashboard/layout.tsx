"use client";

import { useNegocio } from "@/lib/hooks/useNegocio";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useEffect, useState } from "react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { negocio, loading } = useNegocio();

    const [theme, setTheme] = useState<"dark" | "light">("dark");

    // ═══════════════════════════════════════
    // 🎨 BRANDING DINÁMICO
    // ═══════════════════════════════════════
    useEffect(() => {
        if (!negocio) return;

        // color principal
        document.documentElement.style.setProperty(
            "--accent",
            negocio.neg_color_acento || "#c9a96e"
        );

        // título dinámico
        document.title = `Portal · ${negocio.neg_nombre || "Cliente"
            }`;
    }, [negocio]);

    // ═══════════════════════════════════════
    // 🌙 INIT THEME (persistente)
    // ═══════════════════════════════════════
    useEffect(() => {
        const saved = localStorage.getItem("theme");

        if (saved === "light") {
            document.documentElement.classList.remove("dark");
            setTheme("light");
        } else {
            document.documentElement.classList.add("dark");
            setTheme("dark");
        }
    }, []);

    // ═══════════════════════════════════════
    // 🔥 TOGGLE THEME
    // ═══════════════════════════════════════
    const toggleTheme = () => {
        const html = document.documentElement;

        if (html.classList.contains("dark")) {
            html.classList.remove("dark");
            localStorage.setItem("theme", "light");
            setTheme("light");
        } else {
            html.classList.add("dark");
            localStorage.setItem("theme", "dark");
            setTheme("dark");
        }
    };

    // ═══════════════════════════════════════
    // UI
    // ═══════════════════════════════════════
    return (
        <div className="flex h-screen bg-[var(--bg)] text-[var(--text)] transition-all">

            {/* SIDEBAR */}
            <Sidebar negocio={negocio} />

            <div className="flex-1 flex flex-col">

                {/* TOPBAR */}
                <Topbar
                    negocio={negocio}
                    theme={theme}
                    toggleTheme={toggleTheme}
                />

                {/* MAIN */}
                <main className="flex-1 p-6 overflow-y-auto fade-in">
                    {children}
                </main>

                {/* MOBILE NAV */}
                <MobileNav />

            </div>
        </div>
    );
}