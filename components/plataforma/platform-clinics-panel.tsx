"use client";

import { useEffect, useState } from "react";
import { CreateClinicForm } from "@/components/plataforma/create-clinic-form";

type Tenant = { id: string; name: string; slug: string | null; created_at: string };

export function PlatformClinicsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plataforma/clinicas");
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        tenants?: Tenant[];
      };
      if (!res.ok) {
        setError(body.error ?? "Falha ao carregar clínicas.");
        return;
      }
      setTenants(body.tenants ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-subtle">
          Administração global
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Clínicas na plataforma
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Cada clínica é uma instância isolada (tenant). Super administradores
          criam essas instâncias e podem provisionar a primeira administradora;
          ela passa a gerir agentes dentro da própria clínica.
        </p>
      </header>

      <CreateClinicForm onCreated={() => void refresh()} />

      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-ink">
            Clínicas cadastradas
          </h2>
          <button
            type="button"
            className="text-xs font-medium text-ink-muted underline-offset-4 hover:underline"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? "Atualizando…" : "Atualizar"}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-ink-muted">Carregando…</p>
        ) : tenants.length > 0 ? (
          <ul className="mt-6 space-y-3">
            {tenants.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-baseline justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3.5"
              >
                <div>
                  <p className="font-medium text-ink">{t.name}</p>
                  <p className="text-xs text-ink-subtle">
                    {t.slug ? `/${t.slug}` : "sem slug"}
                  </p>
                </div>
                <time
                  className="text-xs tabular-nums text-ink-muted"
                  dateTime={t.created_at}
                >
                  {new Date(t.created_at).toLocaleDateString("pt-BR")}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            Nenhuma clínica ainda. Use o formulário acima para criar a primeira.
          </p>
        )}
      </section>
    </div>
  );
}

