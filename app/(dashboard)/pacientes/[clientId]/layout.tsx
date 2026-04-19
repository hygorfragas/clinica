import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PacienteFichaNav } from "@/components/clients/paciente-ficha-nav";
import { PacienteOcultarDaListaButton } from "@/components/clients/paciente-ocultar-da-lista-button";
import { loadPacienteClinicContext } from "@/lib/clients/paciente-context";

export default async function PacienteFichaLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-14">
      <div>
        <Link
          href="/pacientes"
          className="text-sm font-medium text-brand hover:underline"
        >
          ← Voltar para pacientes
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          {ctx.client.full_name}
        </h1>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted">
            Prontuário digital · dados sensíveis · visível apenas para a sua
            equipe nesta clínica.
          </p>
          <PacienteOcultarDaListaButton
            clientId={clientId}
            afterSuccess="redirect"
            variant="ghost"
            className="sm:items-end"
          />
        </div>
      </div>
      <PacienteFichaNav clientId={clientId} />
      {children}
    </div>
  );
}
