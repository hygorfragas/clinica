"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AppointmentStockConsume } from "@/components/agenda/appointment-stock-consume";
import { PatientSearchDialog } from "@/components/clients/patient-search-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppointmentDto } from "@/lib/agenda/types";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
import type { CreateAppointmentPayload } from "./agenda-calendar";

type DialogState =
  | { mode: "create"; startsAt: string; endsAt: string }
  | { mode: "edit"; appointment: AppointmentDto };

type Props = {
  state: DialogState;
  onClose: () => void;
  clients: { id: string; full_name: string; cpf?: string | null }[];
  procedures: { id: string; name: string; duration_minutes: number | null }[];
  onCreate: (
    input: CreateAppointmentPayload,
  ) => Promise<{ ok: boolean; error?: string }>;
  onUpdate: (
    id: string,
    input: Partial<CreateAppointmentPayload>,
  ) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>;
};

function toInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromInputValue(v: string): string {
  return new Date(v).toISOString();
}

export function AppointmentDialog({
  state,
  onClose,
  clients,
  procedures,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const initial = useMemo(() => {
    if (state.mode === "edit") {
      const a = state.appointment;
      return {
        clientId: a.clientId ?? "",
        title: a.title ?? "",
        procedureId: a.procedureId ?? "",
        startsAt: toInputValue(a.startsAt),
        endsAt: toInputValue(a.endsAt),
        notes: a.notes ?? "",
        location: a.location ?? "",
        status: (a.status as CreateAppointmentPayload["status"]) ?? "scheduled",
      };
    }
    return {
      clientId: "",
      title: "",
      procedureId: "",
      startsAt: toInputValue(state.startsAt),
      endsAt: toInputValue(state.endsAt),
      notes: "",
      location: "",
      status: "scheduled" as CreateAppointmentPayload["status"],
    };
  }, [state]);

  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) {
      const msg = "Selecione a paciente para salvar o agendamento.";
      setError(msg);
      notifyError(null, msg);
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: CreateAppointmentPayload = {
      clientId: form.clientId || undefined,
      title: form.title.trim() || undefined,
      procedureId: form.procedureId || undefined,
      startsAt: fromInputValue(form.startsAt),
      endsAt: fromInputValue(form.endsAt),
      notes: form.notes.trim() || undefined,
      location: form.location.trim() || undefined,
      status: form.status,
    };
    const result =
      state.mode === "create"
        ? await onCreate(payload)
        : await onUpdate(state.appointment.id, payload);
    setSubmitting(false);
    if (!result.ok) {
      const msg = result.error ?? "Erro ao salvar.";
      setError(msg);
      notifyError(null, msg);
      return;
    }
    notifySuccess(
      state.mode === "create"
        ? "Agendamento criado."
        : "Agendamento atualizado.",
    );
    onClose();
  }

  async function handleDeleteConfirmed() {
    if (state.mode !== "edit") return;
    setSubmitting(true);
    const result = await onDelete(state.appointment.id);
    setSubmitting(false);
    if (!result.ok) {
      const msg = result.error ?? "Erro ao excluir.";
      setError(msg);
      notifyError(null, msg);
      throw new Error(msg);
    }
    notifySuccess("Agendamento excluído.");
    onClose();
  }

  function onProcedureChange(pid: string) {
    const proc = procedures.find((p) => p.id === pid);
    const duration = proc?.duration_minutes ?? null;
    setForm((f) => {
      const next = { ...f, procedureId: pid };
      if (duration && f.startsAt) {
        const start = new Date(f.startsAt);
        const end = new Date(start.getTime() + duration * 60_000);
        next.endsAt = toInputValue(end.toISOString());
      }
      return next;
    });
  }

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/35 p-2 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="max-h-[calc(100dvh-1rem)] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-surface p-4 shadow-panel sm:max-h-[calc(100dvh-2rem)] sm:p-6"
      >
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-ink">
            {state.mode === "create"
              ? "Novo agendamento"
              : "Editar agendamento"}
          </h2>
          <p className="text-xs text-ink-muted">
            Ao salvar, o horário é sincronizado com o Google Agenda quando
            conectado.
          </p>
        </header>

        <div className="space-y-3">
          <div>
            <Label>Paciente</Label>
            <div className="mt-1">
              <PatientSearchDialog
                patients={clients}
                selectedPatientId={form.clientId}
                onSelect={(id) =>
                  setForm((current) => ({ ...current, clientId: id }))
                }
                buttonLabel="Buscar paciente"
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="procedure">Procedimento (opcional)</Label>
            <select
              id="procedure"
              value={form.procedureId}
              onChange={(e) => onProcedureChange(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
            >
              <option value="">—</option>
              {procedures.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.duration_minutes ? ` (${p.duration_minutes} min)` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="startsAt">Início</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startsAt: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="endsAt">Fim</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                required
                value={form.endsAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endsAt: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="title">Título (opcional)</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Se vazio, usa paciente + procedimento"
            />
          </div>

          <div>
            <Label htmlFor="location">Local (opcional)</Label>
            <Input
              id="location"
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
            />
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={3}
              className="mt-1 flex w-full rounded-md border border-line bg-[#f3f1ee] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as CreateAppointmentPayload["status"],
                }))
              }
              className="mt-1 flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
            >
              <option value="scheduled">Agendado</option>
              <option value="confirmed">Confirmado</option>
              <option value="rescheduled">Reagendado</option>
              <option value="completed">Realizado</option>
              <option value="canceled">Cancelado</option>
              <option value="no_show">Não compareceu</option>
            </select>
          </div>

          {state.mode === "edit" ? (
            <AppointmentStockConsume
              appointmentId={state.appointment.id}
              procedureId={form.procedureId || null}
              savedProcedureId={state.appointment.procedureId}
            />
          ) : null}
        </div>

        {error && (
          <p className="rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 pt-2">
          {state.mode === "edit" ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={submitting}
              className="text-destructive hover:text-destructive"
            >
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} loadingLabel="Salvando...">
              Salvar
            </Button>
          </div>
        </footer>
      </form>
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Excluir agendamento"
        description="Esta ação não pode ser desfeita. O evento também será removido do Google Agenda, se estiver conectado."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDeleteConfirmed}
      />
    </div>,
    document.body,
  );
}
