export default function ConfiguracoesAgendaPage() {
  return (
    <div className="mx-auto max-w-xl space-y-2">
      <h1 className="text-xl font-semibold text-ink">Google Agenda</h1>
      <p className="text-sm text-ink-muted">
        A sincronização com o Google Calendar será configurada aqui (OAuth e
        escopos no servidor). Por enquanto, use a agenda interna para os
        horários do dia.
      </p>
    </div>
  );
}
