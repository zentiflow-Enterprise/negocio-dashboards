"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/lib/client";

export default function DashboardPage() {
    const supabase = createClient();
    const [usuario, setUsuario] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            const { data: userData } = await supabase.auth.getUser();

            if (!userData.user) return;

            const { data } = await supabase
                .from("usuarios_dashboard")
                .select("*")
                .eq("auth_user_id", userData.user.id)
                .single();

            setUsuario(data);
        };

        load();
    }, []);

    if (!usuario) {
        return <div>Cargando usuario...</div>;
    }

    return (
        <div>
            <h1 className="text-2xl mb-2">
                Hola, {usuario.nombre?.split(" ")[0]} 👋
            </h1>

            <p className="text-gray-400">
                Bienvenido a tu portal de cliente
            </p>
        </div>
    );
}