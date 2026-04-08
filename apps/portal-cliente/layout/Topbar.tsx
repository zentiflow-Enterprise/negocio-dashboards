"use client";

export function Topbar({ negocio }: any) {
    return (
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 bg-black">
            <div className="font-semibold">{negocio.neg_nombre}</div>

            <button
                className="text-sm px-3 py-1 rounded bg-white text-black"
                onClick={() => {
                    document.documentElement.classList.toggle("dark");
                }}
            >
                🌙
            </button>
        </div>
    );
}