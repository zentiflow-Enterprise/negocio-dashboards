"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/lib/client";
import { useNegocio } from "@/lib/hooks/useNegocio";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Filtro = "hoy" | "semana" | "mes";

interface CitaActiva {
    id_cita: string;
    nombre_cliente: string;
    nombre_profesional: string;
    nombre_servicio: string;
    fecha: string;
    hora: string;
    precio: number;
    estado: string;
    duracion_min: number;
}

interface MetricasData {
    totalCitas: number;
    ingresoEstimado: number;
    clientesUnicos: number;
    tasaCancelacion: number;
    citasHoy: CitaActiva[];
    citasPorDia: { dia: string; citas: number }[];
    porEstado: { name: string; value: number }[];
    topServicios: { nombre: string; count: number; pct: number }[];
    topClientes: { nombre: string; count: number; ingreso: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRango(filtro: Filtro): { inicio: string; fin: string } {
    const hoy = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0] || "";

    if (filtro === "hoy") {
        const s = fmt(hoy);
        return { inicio: s, fin: s };
    }

    if (filtro === "semana") {
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        return { inicio: fmt(lunes), fin: fmt(domingo) };
    }

    // mes
    return {
        inicio: fmt(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
        fin: fmt(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)),
    };
}

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const ESTADO_COLOR: Record<string, string> = {
    confirmada: "#3dbd7a",
    pendiente: "#e8a825",
    cancelada: "#e24b4a",
    finalizada: "#378add",
    reprogramada: "#7f77dd",
};

function calcMetricas(citas: CitaActiva[], filtro: Filtro): MetricasData {
    const hoyStr = new Date().toISOString().split("T")[0];

    const activas = citas.filter(
        (c) => c.estado !== "cancelada"
    );
    const canceladas = citas.filter((c) => c.estado === "cancelada");
    const ingresoEstimado = activas.reduce(
        (sum, c) => sum + Number(c.precio || 0), 0
    );
    const clientesUnicos = new Set(activas.map((c) => c.nombre_cliente)).size;
    const tasaCancelacion =
        citas.length > 0
            ? Math.round((canceladas.length / citas.length) * 100)
            : 0;

    // citas de hoy
    const citasHoy = citas
        .filter((c) => c.fecha === hoyStr)
        .sort((a, b) => a.hora.localeCompare(b.hora))
        .slice(0, 5);

    // citas por día (últimos 7 días del rango)
    const contPorFecha: Record<string, number> = {};
    citas.forEach((c) => {
        if (c.fecha) contPorFecha[c.fecha] = (contPorFecha[c.fecha] || 0) + 1;
    });

    const citasPorDia: { dia: string; citas: number }[] = Object.entries(contPorFecha)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([fecha, count]) => {
            const dayIndex = new Date(fecha + "T12:00:00").getDay();
            const dia = DIAS[dayIndex];
            if (!dia) return null; // descarta fechas inválidas
            return { dia, citas: count };
        })
        .filter((x): x is { dia: string; citas: number } => x !== null);

    // por estado
    const contEstado: Record<string, number> = {};
    citas.forEach((c) => {
        const e = c.estado || "pendiente";
        contEstado[e] = (contEstado[e] || 0) + 1;
    });
    const porEstado = Object.entries(contEstado).map(([name, value]) => ({
        name,
        value,
    }));

    // top servicios
    const contServ: Record<string, number> = {};
    activas.forEach((c) => {
        const s = c.nombre_servicio || "Sin nombre";
        contServ[s] = (contServ[s] || 0) + 1;
    });
    const topServicios = Object.entries(contServ)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([nombre, count]) => ({
            nombre,
            count,
            pct: activas.length > 0 ? Math.round((count / activas.length) * 100) : 0,
        }));

    // top clientes
    const contCliente: Record<string, { count: number; ingreso: number }> = {};
    activas.forEach((c) => {
        const k = c.nombre_cliente || "Desconocido";
        if (!contCliente[k]) contCliente[k] = { count: 0, ingreso: 0 };
        contCliente[k].count += 1;
        contCliente[k].ingreso += Number(c.precio || 0);
    });
    const topClientes = Object.entries(contCliente)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 4)
        .map(([nombre, { count, ingreso }]) => ({ nombre, count, ingreso }));

    return {
        totalCitas: citas.length,
        ingresoEstimado,
        clientesUnicos,
        tasaCancelacion,
        citasHoy,
        citasPorDia,
        porEstado,
        topServicios,
        topClientes,
    };
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────
function MetricCard({
    label,
    value,
    sub,
    trend,
}: {
    label: string;
    value: string | number;
    sub?: string;
    trend?: "up" | "down" | "neutral";
}) {
    return (
        <div className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-soft)] uppercase tracking-wide mb-1">
                {label}
            </p>
            <p className="text-2xl font-medium leading-none">{value}</p>
            {sub && (
                <p
                    className={`text-xs mt-2 ${trend === "up"
                        ? "text-emerald-500"
                        : trend === "down"
                            ? "text-red-400"
                            : "text-[var(--text-soft)]"
                        }`}
                >
                    {sub}
                </p>
            )}
        </div>
    );
}

function EstadoBadge({ estado }: { estado: string }) {
    const colors: Record<string, string> = {
        confirmada: "bg-emerald-500/10 text-emerald-500",
        pendiente: "bg-amber-500/10 text-amber-500",
        cancelada: "bg-red-500/10 text-red-400",
        finalizada: "bg-blue-500/10 text-blue-400",
        reprogramada: "bg-purple-500/10 text-purple-400",
    };
    return (
        <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${colors[estado] || "bg-gray-500/10 text-gray-400"
                }`}
        >
            {estado}
        </span>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DashboardPage() {
    const supabase = createClient();
    const { negocio } = useNegocio();

    const [usuario, setUsuario] = useState<any>(null);
    const [filtro, setFiltro] = useState<Filtro>("semana");
    const [metricas, setMetricas] = useState<MetricasData | null>(null);
    const [loading, setLoading] = useState(true);
    const [moneda, setMoneda] = useState("₡");

    // cargar usuario
    useEffect(() => {
        const loadUser = async () => {
            const { data: ud } = await supabase.auth.getUser();
            if (!ud.user) return;
            const { data } = await supabase
                .from("usuarios_dashboard")
                .select("*")
                .eq("auth_user_id", ud.user.id)
                .single();
            setUsuario(data);
        };
        loadUser();
    }, []);

    // cargar métricas
    const loadMetricas = useCallback(async () => {
        if (!negocio?.id) return;
        setLoading(true);

        const { inicio, fin } = getRango(filtro);

        const { data: citas } = await supabase
            .from("v_citas_activas")
            .select("*")
            .eq("negocio_id", negocio.id)
            .gte("fecha", inicio)
            .lte("fecha", fin);

        if (citas) setMetricas(calcMetricas(citas as CitaActiva[], filtro));

        // moneda del negocio
        const { data: cfg } = await supabase
            .from("config_negocio")
            .select("neg_moneda")
            .eq("negocio_id", negocio.id)
            .single();
        if (cfg?.neg_moneda) setMoneda(cfg.neg_moneda);

        setLoading(false);
    }, [negocio?.id, filtro]);

    useEffect(() => {
        loadMetricas();
    }, [loadMetricas]);

    const fmtMoney = (n: number) =>
        `${moneda}${n.toLocaleString("es-CR")}`;

    if (!metricas && loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-medium">
                        Hola, {usuario?.nombre?.split(" ")[0]} 👋
                    </h1>
                    <p className="text-sm text-[var(--text-soft)] mt-0.5">
                        Bienvenido a tu portal de gestión
                    </p>
                </div>

                {/* Filtro tabs */}
                <div className="flex gap-1 bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg p-1">
                    {(["hoy", "semana", "mes"] as Filtro[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFiltro(f)}
                            className={`px-3 py-1.5 text-xs rounded-md transition-all capitalize ${filtro === f
                                ? "bg-[var(--accent)] text-black font-medium"
                                : "text-[var(--text-soft)] hover:text-[var(--text)]"
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {loading && (
                <div className="h-1 w-full bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-[var(--accent)] rounded-full animate-pulse" />
                </div>
            )}

            {metricas && (
                <>
                    {/* ── Métricas ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricCard
                            label="Citas"
                            value={metricas.totalCitas}
                            sub={`${metricas.totalCitas} en este período`}
                            trend="neutral"
                        />
                        <MetricCard
                            label="Ingreso estimado"
                            value={fmtMoney(metricas.ingresoEstimado)}
                            sub="Citas no canceladas"
                            trend="up"
                        />
                        <MetricCard
                            label="Clientes únicos"
                            value={metricas.clientesUnicos}
                            sub="Personas atendidas"
                            trend="neutral"
                        />
                        <MetricCard
                            label="Cancelaciones"
                            value={`${metricas.tasaCancelacion}%`}
                            sub="Del total de citas"
                            trend={metricas.tasaCancelacion > 15 ? "down" : "up"}
                        />
                    </div>

                    {/* ── Gráficos ── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Citas por día */}
                        <div className="md:col-span-2 bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-xs text-[var(--text-soft)] uppercase tracking-wide mb-4">
                                Citas por día
                            </p>
                            {metricas.citasPorDia.length > 0 ? (
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={metricas.citasPorDia} barSize={28}>
                                        <XAxis
                                            dataKey="dia"
                                            tick={{ fontSize: 11, fill: "var(--text-soft)" }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: "var(--text-soft)" }}
                                            axisLine={false}
                                            tickLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: "var(--bg-soft)",
                                                border: "0.5px solid var(--border)",
                                                borderRadius: 8,
                                                fontSize: 12,
                                            }}
                                            cursor={{ fill: "var(--border)" }}
                                        />
                                        <Bar
                                            dataKey="citas"
                                            fill="var(--accent)"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-44 flex items-center justify-center text-sm text-[var(--text-soft)]">
                                    Sin datos para este período
                                </div>
                            )}
                        </div>

                        {/* Distribución por estado */}
                        <div className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-xs text-[var(--text-soft)] uppercase tracking-wide mb-4">
                                Por estado
                            </p>
                            {metricas.porEstado.length > 0 ? (
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie
                                            data={metricas.porEstado}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={75}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {metricas.porEstado.map((entry) => (
                                                <Cell
                                                    key={entry.name}
                                                    fill={
                                                        ESTADO_COLOR[entry.name] || "#888"
                                                    }
                                                />
                                            ))}
                                        </Pie>
                                        <Legend
                                            formatter={(v) => (
                                                <span className="text-xs capitalize">{v}</span>
                                            )}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: "var(--bg-soft)",
                                                border: "0.5px solid var(--border)",
                                                borderRadius: 8,
                                                fontSize: 12,
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-44 flex items-center justify-center text-sm text-[var(--text-soft)]">
                                    Sin datos
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Bottom row ── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Servicios más usados */}
                        <div className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-xs text-[var(--text-soft)] uppercase tracking-wide mb-3">
                                Servicios más solicitados
                            </p>
                            {metricas.topServicios.length === 0 ? (
                                <p className="text-sm text-[var(--text-soft)]">Sin datos</p>
                            ) : (
                                <div className="flex flex-col gap-2.5">
                                    {metricas.topServicios.map((s) => (
                                        <div key={s.nombre}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="truncate max-w-[160px]">{s.nombre}</span>
                                                <span className="text-[var(--text-soft)] text-xs">
                                                    {s.count} · {s.pct}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${s.pct}%`,
                                                        background: "var(--accent)",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Top clientes */}
                        <div className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-xs text-[var(--text-soft)] uppercase tracking-wide mb-3">
                                Mejores clientes
                            </p>
                            {metricas.topClientes.length === 0 ? (
                                <p className="text-sm text-[var(--text-soft)]">Sin datos</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {metricas.topClientes.map((c, i) => (
                                        <div
                                            key={c.nombre}
                                            className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-black flex-shrink-0"
                                                    style={{ background: "var(--accent)" }}
                                                >
                                                    {c.nombre.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium leading-none truncate max-w-[100px]">
                                                        {c.nombre}
                                                    </p>
                                                    <p className="text-xs text-[var(--text-soft)] mt-0.5">
                                                        {c.count} citas
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-medium">
                                                {fmtMoney(c.ingreso)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Citas de hoy */}
                        <div className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-xs text-[var(--text-soft)] uppercase tracking-wide mb-3">
                                Citas de hoy
                            </p>
                            {metricas.citasHoy.length === 0 ? (
                                <p className="text-sm text-[var(--text-soft)]">
                                    No hay citas programadas para hoy
                                </p>
                            ) : (
                                <div className="flex flex-col gap-0">
                                    {metricas.citasHoy.map((c) => (
                                        <div
                                            key={c.id_cita}
                                            className="flex items-center gap-2.5 py-2 border-b border-[var(--border)] last:border-0"
                                        >
                                            <div
                                                className="w-1 h-8 rounded-full flex-shrink-0"
                                                style={{ background: "var(--accent)" }}
                                            />
                                            <div className="w-10 flex-shrink-0">
                                                <p className="text-xs text-[var(--text-soft)]">
                                                    {c.hora?.slice(0, 5)}
                                                </p>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {c.nombre_cliente}
                                                </p>
                                                <p className="text-xs text-[var(--text-soft)] truncate">
                                                    {c.nombre_servicio} · {c.nombre_profesional}
                                                </p>
                                            </div>
                                            <EstadoBadge estado={c.estado} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}