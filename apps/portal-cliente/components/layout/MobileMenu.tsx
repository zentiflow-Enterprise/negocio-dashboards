"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";

export function MobileMenu({ negocio }: { negocio: any }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Botón Hamburguesa - Solo visible en móvil */}
            <button
                onClick={() => setIsOpen(true)}
                className="md:hidden fixed top-4 left-4 z-[80] w-11 h-11 flex items-center justify-center bg-[var(--bg-soft)] border border-[var(--border)] rounded-2xl shadow-lg active:scale-95"
            >
                <span className="text-2xl">☰</span>
            </button>

            {/* Drawer que se abre desde la derecha */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[90] bg-black/70 md:hidden"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="bg-[var(--bg)] w-64 h-full shadow-2xl overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Reutilizamos exactamente el mismo Sidebar */}
                        <Sidebar negocio={negocio} mobile={true} />
                    </div>
                </div>
            )}
        </>
    );
}