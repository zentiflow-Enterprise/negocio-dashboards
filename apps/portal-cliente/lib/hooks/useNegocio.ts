"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/lib/client";

export function useNegocio() {
    const [negocio, setNegocio] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        const load = async () => {
            try {
                const { data: userData } = await supabase.auth.getUser();

                if (!userData?.user) {
                    setLoading(false);
                    return;
                }

                const { data: usuario } = await supabase
                    .from("usuarios_dashboard")
                    .select("negocio_id")
                    .eq("auth_user_id", userData.user.id)
                    .single();

                if (!usuario) {
                    setLoading(false);
                    return;
                }

                const { data: negocioData } = await supabase
                    .from("config_negocio")
                    .select("*")
                    .eq("negocio_id", usuario.negocio_id)
                    .single();

                if (!negocioData) {
                    setLoading(false);
                    return;
                }

                const negocioUI = {
                    id: negocioData.negocio_id,
                    nombre: negocioData.neg_nombre || "Mi negocio",
                    color: negocioData.neg_color_acento || "#c9a96e",
                    logo: negocioData.neg_logo_url || null,
                    ciudad: negocioData.neg_ciudad || "",
                };

                setNegocio(negocioUI);
            } catch (err) {
                console.error("Error cargando negocio:", err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    return { negocio, loading };
}