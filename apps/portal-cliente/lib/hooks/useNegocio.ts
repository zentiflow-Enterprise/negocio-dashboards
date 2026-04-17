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
                // 1. usuario auth
                const { data: userData } = await supabase.auth.getUser();

                if (!userData?.user) {
                    setLoading(false);
                    return;
                }

                // 2. usuario_dashboard
                const { data: usuario } = await supabase
                    .from("usuarios_dashboard")
                    .select("usuario_id")
                    .eq("auth_user_id", userData.user.id)
                    .single();

                if (!usuario) {
                    setLoading(false);
                    return;
                }

                // 3. relación usuario_negocio
                const { data: rel } = await supabase
                    .from("usuarios_negocios")
                    .select("negocio_id")
                    .eq("usuario_id", usuario.usuario_id)
                    .single();

                if (!rel) {
                    setLoading(false);
                    return;
                }

                // 4. config del negocio
                const { data: negocioData } = await supabase
                    .from("config_negocio")
                    .select("*")
                    .eq("negocio_id", rel.negocio_id)
                    .maybeSingle(); // 🔥 importante

                if (!negocioData) {
                    // fallback mínimo
                    setNegocio({
                        id: rel.negocio_id,
                        nombre: "Mi negocio",
                        color: "#c9a96e",
                    });
                    setLoading(false);
                    return;
                }

                // 5. UI
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