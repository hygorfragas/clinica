import Link from "next/link";

export default function PacienteNotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
      <h1 className="text-xl font-semibold text-ink">Paciente não encontrado</h1>
      <p className="text-sm text-ink-muted">
        Esse registro não existe ou não pertence à sua clínica.
      </p>
      <Link
        href="/pacientes"
        className="inline-block text-sm font-medium text-brand hover:underline"
      >
        Voltar para a lista
      </Link>
    </div>
  );
}
