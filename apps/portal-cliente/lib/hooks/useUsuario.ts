"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/lib/client";

// 🔥 CACHE GLOBAL (clave)
let usuarioGlobal: any = null;
let loadingGlobal = true;
let promiseGlobal: Promise<any> | null = null;

export function useUsuario() {
    const [usuario, setUsuario] = useState<any>(usuarioGlobal);
    const [loading, setLoading] = useState(loadingGlobal);

    const supabase = createClient();

    useEffect(() => {
        // ✅ si ya hay usuario, no hace nada
        if (usuarioGlobal) {
            setUsuario(usuarioGlobal);
            setLoading(false);
            return;
        }

        // ✅ evita múltiples llamadas
        if (!promiseGlobal) {
            promiseGlobal = (async () => {
                try {
                    const { data: { user } } = await supabase.auth.getUser();

                    if (!user) return null;

                    const { data } = await supabase
                        .from("usuarios_dashboard")
                        .select("*")
                        .eq("auth_user_id", user.id)
                        .single();

                    usuarioGlobal = data;
                    loadingGlobal = false;

                    return data;
                } catch (err) {
                    console.error("Error usuario:", err);
                    loadingGlobal = false;
                    return null;
                }
            })();
        }

        promiseGlobal.then((data) => {
            setUsuario(data);
            setLoading(false);
        });

    }, []);

    return { usuario, loading };
}