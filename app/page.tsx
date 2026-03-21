import Link from "next/link";
import { redirect } from "next/navigation";
import {
  canAccessAgenda,
  fetchClinicProfile,
  isPlatformSuperAdmin,
} from "@/lib/auth/clinic-profile";
import { isSupabasePublicEnvConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HomePage() {
  if (!isSupabasePublicEnvConfigured()) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6">
        <div className="rounded-lg border border-line bg-surface p-6 shadow-lift">
          <h1 className="text-lg font-semibold text-ink">
            Configure o Supabase
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Crie o arquivo <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> na raiz do projeto (copie de{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.example</code>
            ) e preencha:
          </p>
          <ul className="mt-4 list-inside list-disc text-sm text-ink-muted">
            <li>
              <code className="text-ink">NEXT_PUBLIC_SUPABASE_URL</code>
            </li>
            <li>
              <code className="text-ink">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
            </li>
          </ul>
          <p className="mt-4 text-sm text-ink-muted">
            Depois salve o arquivo e reinicie o servidor{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run dev</code>.
          </p>
        </div>
        <p className="text-center text-sm text-ink-subtle">
          <Link href="/login" className="text-brand hover:underline">
            Ir para o login
          </Link>{" "}
          (também exige essas variáveis)
        </p>
      </main>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile) {
    redirect("/login");
  }

  if (isPlatformSuperAdmin(profile)) {
    redirect("/plataforma");
  }

  if (canAccessAgenda(profile)) {
    redirect("/agenda");
  }

  redirect("/aguardando-acesso");
}
