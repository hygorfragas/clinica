"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

const OTP_TYPES: AuthOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function safeNext(raw: string | null): string {
  const next = raw?.trim() || "/inicio";
  if (!next.startsWith("/") || next.startsWith("//")) return "/inicio";
  return next;
}

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message] = useState("Concluindo login…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const next = safeNext(searchParams.get("next"));

      let supabase: ReturnType<typeof createBrowserSupabaseClient>;
      try {
        supabase = createBrowserSupabaseClient();
      } catch {
        router.replace("/login?error=auth_config");
        return;
      }

      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (cancelled) return;
          if (error) {
            router.replace("/login?error=auth_callback");
            return;
          }
          const base = `${window.location.pathname}${window.location.search}`;
          window.history.replaceState(null, "", base);
          router.replace(next);
          router.refresh();
          return;
        }
      }

      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          router.replace("/login?error=auth_callback");
          return;
        }
        router.replace(next);
        router.refresh();
        return;
      }

      const tokenHash = searchParams.get("token_hash");
      const typeParam = searchParams.get("type");
      if (
        tokenHash &&
        typeParam &&
        OTP_TYPES.includes(typeParam as AuthOtpType)
      ) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: typeParam as AuthOtpType,
        });
        if (cancelled) return;
        if (error) {
          router.replace("/login?error=auth_callback");
          return;
        }
        router.replace(next);
        router.refresh();
        return;
      }

      if (!cancelled) {
        router.replace("/login?error=auth_missing");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <p className="mx-auto max-w-md p-8 text-center text-sm text-ink-muted">
      {message}
    </p>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-center text-sm text-ink-muted">Carregando…</p>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
