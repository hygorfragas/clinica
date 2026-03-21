import { CreateClinicForm } from "@/components/plataforma/create-clinic-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function PlataformaPage() {
  const supabase = await createServerSupabaseClient();
  const { data: tenants } = await supabase
    .schema("clinic")
    .from("tenants")
    .select("id, name, slug, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Plataforma
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Gerencie as clínicas cadastradas. Somente o super administrador vê
          esta área.
        </p>
      </div>

      <CreateClinicForm />

      <section className="rounded-lg border border-line bg-surface p-6 shadow-lift">
        <h2 className="text-sm font-semibold text-ink">Clínicas cadastradas</h2>
        {tenants && tenants.length > 0 ? (
          <ul className="mt-4 divide-y divide-line">
            {tenants.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-ink">{t.name}</p>
                  <p className="text-xs text-ink-subtle">
                    {t.slug ? `/${t.slug}` : "sem slug"}
                  </p>
                </div>
                <time
                  className="text-xs text-ink-muted"
                  dateTime={t.created_at}
                >
                  {new Date(t.created_at).toLocaleDateString("pt-BR")}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">
            Nenhuma clínica ainda. Use o formulário acima para criar a primeira.
          </p>
        )}
      </section>
    </div>
  );
}
