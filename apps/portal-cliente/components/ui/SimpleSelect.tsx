"use client";

import { useEffect, useRef, useState } from "react";

interface SimpleSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    error?: string;
}

export function SimpleSelect({ value, onChange, options, placeholder, error }: SimpleSelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = options.find((o) => o.value === value);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full h-10 border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text)] rounded-lg px-3 text-sm focus:outline-none flex items-center justify-between gap-3 transition-colors"
                style={{ borderColor: open ? "var(--accent)" : undefined }}
            >
                <span className={selected ? "text-[var(--text)]" : "text-[var(--text-soft)]"}>
                    {selected ? selected.label : (placeholder ?? "Seleccionar...")}
                </span>
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none"
                    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
                    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border)] py-1 shadow-xl overflow-hidden"
                    style={{ background: "var(--bg)" }}>
                    {options.map((o) => (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => { onChange(o.value); setOpen(false); }}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors"
                            style={{ background: o.value === value ? "var(--bg-soft)" : "transparent", color: "var(--text)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-soft)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = o.value === value ? "var(--bg-soft)" : "transparent")}
                        >
                            {o.label}
                            {o.value === value && (
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
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