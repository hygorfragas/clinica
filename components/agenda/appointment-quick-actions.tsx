"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AppointmentDto } from "@/lib/agenda/types";

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
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextStart, setNextStart] = useState(() => toInputValue(appointment.startsAt));
  const [showRescheduleFields, setShowRescheduleFields] = useState(false);

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
      setError(result.error ?? "Não foi possível atualizar o status.");
      return;
    }
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/35 p-2 sm:items-center sm:p-4"
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
                disabled={submitting}
                onClick={() => void applyStatus("rescheduled")}
              >
                {submitting ? "Salvando..." : "Salvar reagendamento"}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={onOpenFullEdit} disabled={submitting}>
            Abrir formulário completo
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Fechar
          </Button>
        </footer>
      </div>
    </div>
  );
}
