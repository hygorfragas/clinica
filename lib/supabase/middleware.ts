import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "./database.types";
import { parseBootstrapStatus } from "@/lib/bootstrap";
import {
  canAccessAgenda,
  fetchClinicProfile,
  isPendingRegistration,
  isPlatformSuperAdmin,
} from "@/lib/auth/clinic-profile";
import { isSupabasePublicEnvConfigured } from "@/lib/supabase/env";

function redirect(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  return NextResponse.redirect(url);
}

/** Rotas da operação da clínica (não são área da plataforma global). */
function isClinicAppPath(pathname: string) {
  return (
    pathname === "/inicio" ||
    pathname.startsWith("/agenda") ||
    pathname.startsWith("/pacientes") ||
    pathname.startsWith("/orcamentos") ||
    pathname.startsWith("/estoque") ||
    pathname.startsWith("/equipe") ||
    pathname.startsWith("/configuracoes")
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!isSupabasePublicEnvConfigured()) {
    return supabaseResponse;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient<Database>(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as never),
          );
        },
      },
    });

    const pathname = request.nextUrl.pathname;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let bootstrap = parseBootstrapStatus(null);
    let bootstrapRpcOk = false;
    try {
      const { data: bootRaw, error: bootRpcError } = await supabase.rpc(
        "clinic_bootstrap_status",
      );
      if (!bootRpcError) {
        bootstrap = parseBootstrapStatus(bootRaw);
        bootstrapRpcOk = true;
      }
    } catch {
      /* RPC opcional: falha não deve travar sessão nem redirects */
    }

    if (pathname === "/cadastro") {
      if (bootstrapRpcOk && !bootstrap.signupOpen) {
        return redirect(request, "/login");
      }
      if (user) {
        const profile = await fetchClinicProfile(supabase, user.id);
        if (isPlatformSuperAdmin(profile)) {
          return redirect(request, "/plataforma");
        }
        if (canAccessAgenda(profile)) {
          return redirect(request, "/inicio");
        }
        if (isPendingRegistration(profile)) {
          return redirect(request, "/aguardando-acesso");
        }
        return redirect(request, "/aguardando-acesso");
      }
    }

    const isPublicPath =
      pathname === "/login" ||
      pathname === "/cadastro" ||
      pathname === "/" ||
      pathname.startsWith("/auth/callback");

    if (!user) {
      if (!isPublicPath) {
        return redirect(request, "/login");
      }
      return supabaseResponse;
    }

    const profile = await fetchClinicProfile(supabase, user.id);

    if (!profile) {
      if (pathname === "/login" || pathname === "/cadastro") {
        return redirect(request, "/aguardando-acesso");
      }
      return redirect(request, "/aguardando-acesso");
    }

    if (isPendingRegistration(profile)) {
      if (pathname.startsWith("/aguardando-acesso")) {
        return supabaseResponse;
      }
      if (pathname === "/login") {
        return redirect(request, "/aguardando-acesso");
      }
      return redirect(request, "/aguardando-acesso");
    }

    if (isPlatformSuperAdmin(profile)) {
      if (pathname.startsWith("/aguardando-acesso")) {
        return redirect(request, "/plataforma");
      }
      if (
        pathname === "/login" ||
        pathname === "/cadastro" ||
        isClinicAppPath(pathname)
      ) {
        return redirect(request, "/plataforma");
      }
      return supabaseResponse;
    }

    if (canAccessAgenda(profile)) {
      if (pathname.startsWith("/aguardando-acesso")) {
        return redirect(request, "/inicio");
      }
      if (pathname === "/login" || pathname === "/cadastro") {
        return redirect(request, "/inicio");
      }
      if (pathname.startsWith("/plataforma")) {
        return redirect(request, "/inicio");
      }
      return supabaseResponse;
    }

    return redirect(request, "/aguardando-acesso");
  } catch (e) {
    console.error("[middleware] Supabase:", e);
    return supabaseResponse;
  }
}
