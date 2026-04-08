"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/lib/client";

export default function Home() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 🔁 detectar sesión existente
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace("/dashboard");
      }
    };

    checkSession();
  }, []);

  // 🔐 login real
  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("Correo o contraseña incorrectos");
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <form
        onSubmit={login}
        className="bg-zinc-900 p-8 rounded-xl w-full max-w-sm shadow-lg"
      >
        <h1 className="text-2xl mb-6 text-center font-semibold">
          Portal Cliente
        </h1>

        {/* Email */}
        <div className="mb-4">
          <label className="block mb-1 text-sm text-gray-400">Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 rounded bg-black border border-gray-700 focus:outline-none focus:border-white"
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="block mb-1 text-sm text-gray-400">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 rounded bg-black border border-gray-700 focus:outline-none focus:border-white"
          />
        </div>

        {/* Error */}
        {errorMsg && (
          <p className="text-red-500 text-sm mb-4">{errorMsg}</p>
        )}

        {/* Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-black py-2 rounded font-medium hover:opacity-90 transition"
        >
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
    </main>
  );
}