"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

/**
 * Magic link (fluxo implícito) devolve tokens no `#hash`. O servidor nunca vê isso.
 * Se o Supabase redirecionar para uma rota que não seja `/auth/callback`, ainda assim
 * aplicamos a sessão no browser e recarregamos para o middleware redirecionar corretamente.
 */
export function SupabaseHashSessionHandler() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/auth/callback")) return;

    const hash = window.location.hash?.replace(/^#/, "") ?? "";
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;

    let cancelled = false;
    void (async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (cancelled || error) return;

        const u = new URL(window.location.href);
        u.hash = "";
        u.searchParams.delete("error");
        window.history.replaceState(null, "", `${u.pathname}${u.search}`);
        window.location.reload();
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
