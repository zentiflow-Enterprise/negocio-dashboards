"use client";

import { useNegocio } from "@/lib/hooks/useNegocio";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { useUsuario } from "@/lib/hooks/useUsuario";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { negocio } = useNegocio();
    const { usuario, loading: usuarioLoading } = useUsuario();

    const [theme, setTheme] = useState<"dark" | "light">("dark");

    useEffect(() => {
        if (!negocio) return;
        document.documentElement.style.setProperty("--accent", negocio.color || "#c9a96e");
        document.title = `Portal · ${negocio.neg_nombre || "Cliente"}`;
    }, [negocio]);

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

    return (
        <div className="flex h-screen bg-[var(--bg)] overflow-hidden">

            {/* SIDEBAR - Solo visible en desktop */}
            <Sidebar negocio={negocio} usuario={usuario || {}} />

            {/* Área de Contenido */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                <Topbar
                    negocio={negocio}
                    theme={theme}
                    toggleTheme={toggleTheme}
                />

                <main className="flex-1 p-6 lg:p-8 overflow-y-auto pb-20 md:pb-8">
                    {children}
                </main>

                {/* Navbar inferior solo en móvil */}
                <MobileNav />
            </div>

            {/* Menú Hamburguesa Móvil */}
            <MobileMenu negocio={negocio} />

            <Toaster position="top-center" />
        </div>
    );
}