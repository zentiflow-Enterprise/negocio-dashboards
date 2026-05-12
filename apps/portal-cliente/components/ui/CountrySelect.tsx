"use client";

import { useEffect, useRef, useState } from "react";

export const COUNTRIES = [
    { code: "CR", name: "Costa Rica", flag: "cr", dial: "+506" },
    { code: "MX", name: "México", flag: "mx", dial: "+52" },
    { code: "CO", name: "Colombia", flag: "co", dial: "+57" },
    { code: "PA", name: "Panamá", flag: "pa", dial: "+507" },
    { code: "NI", name: "Nicaragua", flag: "ni", dial: "+505" },
    { code: "GT", name: "Guatemala", flag: "gt", dial: "+502" },
    { code: "SV", name: "El Salvador", flag: "sv", dial: "+503" },
    { code: "HN", name: "Honduras", flag: "hn", dial: "+504" },
    { code: "CA", name: "Canadá", flag: "ca", dial: "+1" },
] as const;

export type CountryCode = typeof COUNTRIES[number]["code"];

export const allowedCountries = COUNTRIES.map((c) => c.code) as unknown as readonly [CountryCode, ...CountryCode[]];

export function Flag({ code, size = 24 }: { code: string; size?: number }) {
    return (
        <img
            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
            srcSet={`https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
            width={size}
            height={Math.round(size * 0.67)}
            alt={code}
            style={{ objectFit: "cover", borderRadius: 3, flexShrink: 0, display: "block" }}
        />
    );
}

export function CountrySelect({
    value,
    onChange,
    error,
}: {
    value: CountryCode;
    onChange: (code: CountryCode) => void;
    error?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = COUNTRIES.find((c) => c.code === value) ?? COUNTRIES[0];

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
                className="w-full h-11 border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] rounded-xl px-4 text-sm focus:outline-none flex items-center justify-between gap-3 transition-colors"
                style={{ borderColor: open ? "var(--accent)" : undefined }}
            >
                <span className="flex items-center gap-3">
                    <Flag code={selected.flag} size={22} />
                    <span>{selected.name}</span>
                </span>
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none"
                    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0, color: "var(--text-soft)" }}>
                    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border)] py-1 shadow-xl overflow-hidden"
                    style={{ background: "var(--bg)" }}>
                    {COUNTRIES.map((c) => (
                        <button
                            key={c.code}
                            type="button"
                            onClick={() => { onChange(c.code as CountryCode); setOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                            style={{ background: c.code === value ? "var(--bg-soft)" : "transparent", color: "var(--text)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-soft)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = c.code === value ? "var(--bg-soft)" : "transparent")}
                        >
                            <Flag code={c.flag} size={22} />
                            <span>{c.name}</span>
                            {c.code === value && (
                                <svg className="ml-auto" width="14" height="14" viewBox="0 0 20 20" fill="none">
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