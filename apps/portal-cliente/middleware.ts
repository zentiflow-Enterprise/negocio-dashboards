import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
    let res = NextResponse.next();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
        {
            cookies: {
                getAll: () => req.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        res.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // 🔐 proteger rutas
    if (!user && req.nextUrl.pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    // 🔁 evitar volver al login si ya está logueado
    if (user && req.nextUrl.pathname === "/") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return res;
}


export const config = {
    matcher: ["/", "/dashboard/:path*"],
};