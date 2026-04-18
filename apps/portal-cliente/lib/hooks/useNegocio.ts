"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/lib/client";

// 🔥 CACHE GLOBAL
let negocioGlobal: any = null;
let loadingGlobal = true;
let promiseGlobal: Promise<any> | null = null;

// 🔥 listeners para sincronizar UI en tiempo real
const listeners = new Set<(n: any) => void>();

// 🔥 setter global (IMPORTANTE)
export const setNegocioGlobal = (nuevoNegocio: any) => {
    negocioGlobal = nuevoNegocio;

    // notificar a todos los componentes
    listeners.forEach((fn) => fn(nuevoNegocio));
};

export function useNegocio() {
    const [negocio, setNegocio] = useState<any>(negocioGlobal);
    const [loading, setLoading] = useState(loadingGlobal);

    const supabase = createClient();

    useEffect(() => {
        // 🔥 SUSCRIBIRSE a cambios globales
        const listener = (nuevo: any) => {
            setNegocio(nuevo);
        };

        listeners.add(listener);

        // 🔥 SI YA EXISTE → usarlo (NO recargar)
        if (negocioGlobal) {
            setNegocio(negocioGlobal);
            setLoading(false);
        }

        // 🔥 CARGA SOLO UNA VEZ GLOBAL
        if (!promiseGlobal) {
            promiseGlobal = (async () => {
                try {
                    const { data: userData } = await supabase.auth.getUser();

                    if (!userData?.user) {
                        loadingGlobal = false;
                        return null;
                    }

                    const { data: usuario } = await supabase
                        .from("usuarios_dashboard")
                        .select("usuario_id")
                        .eq("auth_user_id", userData.user.id)
                        .single();

                    if (!usuario) {
                        loadingGlobal = false;
                        return null;
                    }

                    const { data: rel } = await supabase
                        .from("usuarios_negocios")
                        .select("negocio_id")
                        .eq("usuario_id", usuario.usuario_id)
                        .single();

                    if (!rel) {
                        loadingGlobal = false;
                        return null;
                    }

                    const { data: negocioData } = await supabase
                        .from("config_negocio")
                        .select("*")
                        .eq("negocio_id", rel.negocio_id)
                        .maybeSingle();

                    let negocioUI;

                    if (!negocioData) {
                        negocioUI = {
                            id: rel.negocio_id,
                            nombre: "Mi negocio",
                            color: "#c9a96e",
                            logo: null,
                            ciudad: "",
                        };
                    } else {
                        negocioUI = {
                            id: negocioData.negocio_id,
                            nombre: negocioData.neg_nombre || "Mi negocio",
                            color: negocioData.neg_color_acento || "#c9a96e",
                            logo: negocioData.neg_logo_url || null,
                            ciudad: negocioData.neg_ciudad || "",
                        };
                    }

                    // 🔥 guardar en cache global
                    negocioGlobal = negocioUI;
                    loadingGlobal = false;

                    return negocioUI;

                } catch (err) {
                    console.error("Error cargando negocio:", err);
                    loadingGlobal = false;
                    return null;
                }
            })();
        }

        promiseGlobal.then((data) => {
            // 🔥 SOLO actualizar si no hay ya uno actualizado
            if (!negocioGlobal && data) {
                setNegocio(data);
            } else {
                setNegocio(negocioGlobal);
            }
            setLoading(false);
        });

        // 🔥 limpiar listener al desmontar
        return () => {
            listeners.delete(listener);
        };

    }, []);

    return { negocio, loading };
}