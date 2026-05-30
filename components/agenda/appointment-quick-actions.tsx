"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { AppointmentDto } from "@/lib/agenda/types";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
import { cn } from "@/lib/utils";

type AppointmentQuickStatus =
  | "confirmed"
  | "rescheduled"
  | "canceled"
  | "no_show";

type Props = {
  appointment: AppointmentDto;
  onClose: () => void;
  onOpenFullEdit: () => void;
  onApplyStatus: (
    id: string,
    input: {
      status: AppointmentQuickStatus;
      startsAt?: string;
      endsAt?: string;
    },
  ) => Promise<{ ok: boolean; error?: string }>;
  /** Remove o agendamento de vez (apaga da agenda e do Google, se conectado). */
  onDelete?: (id: string) => Promise<{ ok: boolean; error?: string }>;
};

const STATUS_BUTTONS: Array<{
  status: AppointmentQuickStatus;
  label: string;
  toneClass: string;
}> = [
  {
    status: "confirmed",
    label: "Confirmado",
    toneClass: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  {
    status: "rescheduled",
    label: "Reagendado",
    toneClass: "border-amber-300 bg-amber-50 text-amber-800",
  },
  {
    status: "canceled",
    label: "Cancelado",
    toneClass: "border-red-300 bg-red-50 text-red-800",
  },
  {
    status: "no_show",
    label: "Não compareceu",
    toneClass: "border-orange-300 bg-orange-50 text-orange-800",
  },
];

function toInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromInputValue(value: string): string {
  return new Date(value).toISOString();
}

export function AppointmentQuickActions({
  appointment,
  onClose,
  onOpenFullEdit,
  onApplyStatus,
  onDelete,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextStart, setNextStart] = useState(() => toInputValue(appointment.startsAt));
  const [showRescheduleFields, setShowRescheduleFields] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const durationMs = useMemo(() => {
    return (
      new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime()
    );
  }, [appointment.endsAt, appointment.startsAt]);

  async function applyStatus(status: AppointmentQuickStatus) {
    setSubmitting(true);
    setError(null);

    const payload: {
      status: AppointmentQuickStatus;
      startsAt?: string;
      endsAt?: string;
    } = { status };

    if (status === "rescheduled") {
      const startIso = fromInputValue(nextStart);
      const endIso = new Date(new Date(startIso).getTime() + durationMs).toISOString();
      payload.startsAt = startIso;
      payload.endsAt = endIso;
    }

    const result = await onApplyStatus(appointment.id, payload);
    setSubmitting(false);
    if (!result.ok) {
      const msg = result.error ?? "Não foi possível atualizar o status.";
      setError(msg);
      notifyError(null, msg);
      return;
    }
    const statusLabels: Record<AppointmentQuickStatus, string> = {
      confirmed: "Agendamento confirmado.",
      rescheduled: "Agendamento reagendado.",
      canceled: "Agendamento cancelado.",
      no_show: "Marcado como não compareceu.",
    };
    notifySuccess(statusLabels[status]);
    onClose();
  }

  async function handleDeleteConfirmed() {
    if (!onDelete) return;
    setSubmitting(true);
    setError(null);
    const result = await onDelete(appointment.id);
    setSubmitting(false);
    if (!result.ok) {
      const msg = result.error ?? "Não foi possível excluir o agendamento.";
      setError(msg);
      notifyError(null, msg);
      throw new Error(msg);
    }
    notifySuccess("Agendamento excluído da agenda.");
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "fixed inset-0 flex items-end justify-center bg-black/35 p-2 sm:items-center sm:p-4",
        // Enquanto o ConfirmDialog (portal em z-[100]) está aberto, baixamos o
        // z deste modal para que a confirmação fique por cima.
        confirmDeleteOpen ? "z-[80]" : "z-[9999]",
      )}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-surface p-4 shadow-panel sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="space-y-1">
          <h3 className="text-base font-semibold text-ink">{appointment.title ?? "Agendamento"}</h3>
          <p className="text-xs text-ink-muted">
            {appointment.clientName ?? "Paciente"} •{" "}
            {new Date(appointment.startsAt).toLocaleString("pt-BR")}
          </p>
        </header>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {STATUS_BUTTONS.map((item) => (
            <Button
              key={item.status}
              type="button"
              variant="secondary"
              className={`h-11 justify-start border ${item.toneClass}`}
              disabled={submitting}
              onClick={() => {
                if (item.status === "rescheduled") {
                  setShowRescheduleFields((prev) => !prev);
                  return;
                }
                void applyStatus(item.status);
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {showRescheduleFields && (
          <div className="mt-4 space-y-2 rounded-xl border border-line/70 bg-muted/35 p-3">
            <label htmlFor="rescheduleDateTime" className="text-xs font-medium text-ink">
              Nova data e hora
            </label>
            <input
              id="rescheduleDateTime"
              type="datetime-local"
              value={nextStart}
              onChange={(e) => setNextStart(e.target.value)}
              className="h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                loading={submitting}
                loadingLabel="Salvando..."
                onClick={() => void applyStatus("rescheduled")}
              >
                Salvar reagendamento
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <footer className="mt-4 flex flex-col gap-2 border-t border-line/60 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="justify-center sm:justify-start"
            onClick={onOpenFullEdit}
            disabled={submitting}
          >
            Abrir formulário completo
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                className="justify-center border border-red-200 text-red-700 hover:bg-red-50 sm:justify-start"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={submitting}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Excluir da agenda
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="justify-center sm:justify-start"
              onClick={onClose}
              disabled={submitting}
            >
              Fechar
            </Button>
          </div>
        </footer>
      </div>

      {onDelete && (
        <ConfirmDialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
          title="Excluir agendamento"
          description="Esta ação não pode ser desfeita. O evento também será removido do Google Agenda, se estiver conectado."
          confirmLabel="Excluir"
          destructive
          onConfirm={handleDeleteConfirmed}
        />
      )}
    </div>
  );
}
