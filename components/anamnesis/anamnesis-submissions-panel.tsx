"use client";

import { Pen, PenTool } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DesktopAnamnesisEditor } from "./desktop-anamnesis-editor";
import {
  deleteAnamnesisSubmission,
  saveAnamnesisSubmission,
} from "@/lib/anamnesis/submission-actions";
import type {
  AnamnesisField,
  AnamnesisFormValues,
  AnamnesisStroke,
  AnamnesisSubmissionMode,
  AnamnesisSubmissionStatus,
} from "@/lib/anamnesis/template-schema";
import { cn } from "@/lib/utils";

type TemplateLite = {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  page_count: number;
  pdf_url: string | null;
  form_schema: AnamnesisField[];
};

type SubmissionItem = {
  id: string;
  template_id: string | null;
  template_name: string | null;
  mode: AnamnesisSubmissionMode;
  status: AnamnesisSubmissionStatus;
  updated_at: string;
  signer_name: string | null;
  submitted_at: string | null;
  signed_at: string | null;
  flattened_pdf_url: string | null;
  form_values: AnamnesisFormValues;
  ink_strokes: AnamnesisStroke[];
};

type Props = {
  clientId: string;
  templates: TemplateLite[];
  submissions: SubmissionItem[];
};

type ChooserState =
  | { kind: "template"; template: TemplateLite }
  | { kind: "submission"; submission: SubmissionItem; template: TemplateLite | null };

export function AnamnesisSubmissionsPanel({
  clientId,
  templates,
  submissions,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openChooser, setOpenChooser] = useState<ChooserState | null>(null);
  const [openDesktopSubmission, setOpenDesktopSubmission] = useState<
    SubmissionItem | null
  >(null);
  const [openDesktopTemplate, setOpenDesktopTemplate] =
    useState<TemplateLite | null>(null);
  const [error, setError] = useState<string | null>(null);

  const templateById = useMemo(
    () => (id: string | null) => templates.find((t) => t.id === id) ?? null,
    [templates],
  );

  const isEditingDesktop = Boolean(openDesktopTemplate || openDesktopSubmission);
  const activeTemplate =
    openDesktopTemplate ?? templateById(openDesktopSubmission?.template_id ?? null);
  const activeSubmission = openDesktopSubmission;

  function removeSubmission(id: string) {
    if (!confirm("Excluir esta submissão?")) return;
    startTransition(async () => {
      const result = await deleteAnamnesisSubmission(clientId, id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function openChoose(state: ChooserState) {
    setError(null);
    setOpenChooser(state);
  }

  function chooseDesktop() {
    if (!openChooser) return;
    if (openChooser.kind === "template") {
      setOpenDesktopTemplate(openChooser.template);
      setOpenDesktopSubmission(null);
    } else {
      setOpenDesktopSubmission(openChooser.submission);
      setOpenDesktopTemplate(null);
    }
    setOpenChooser(null);
  }

  function chooseInteractive() {
    if (!openChooser) return;
    startTransition(async () => {
      setError(null);
      let submissionId: string | undefined;
      if (openChooser.kind === "submission") {
        submissionId = openChooser.submission.id;
      } else {
        // Cria submissão em draft antes de navegar.
        const result = await saveAnamnesisSubmission(clientId, {
          templateId: openChooser.template.id,
          mode: "interactive",
          status: "draft",
          formValues: {},
          inkStrokes: [],
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        submissionId = result.id;
      }
      if (!submissionId) return;
      router.push(`/anamnese/interativa/${clientId}/${submissionId}`);
    });
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-danger">{error}</p>}

      {openChooser && (
        <ModeChooserOverlay
          title={
            openChooser.kind === "template"
              ? `Iniciar nova anamnese — ${openChooser.template.name}`
              : `Continuar — ${openChooser.template?.name ?? "submissão"}`
          }
          submission={openChooser.kind === "submission" ? openChooser.submission : null}
          onClose={() => setOpenChooser(null)}
          onChooseDesktop={chooseDesktop}
          onChooseInteractive={chooseInteractive}
          pending={pending}
        />
      )}

      {isEditingDesktop ? (
        <section className="space-y-3 rounded-[1.75rem] bg-surface p-4 shadow-lift ring-1 ring-line md:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <button
              type="button"
              className="rounded-full bg-muted px-3 py-1 hover:bg-muted/80"
              onClick={() => {
                setOpenDesktopTemplate(null);
                setOpenDesktopSubmission(null);
                router.refresh();
              }}
            >
              ← Fechar editor
            </button>
            <span>
              {activeSubmission ? "Submissão" : "Nova submissão"}
            </span>
            <span className="font-medium text-ink">
              {activeTemplate?.name ?? "Sem template"}
            </span>
            <span className="ml-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
              Modo desktop
            </span>
          </div>

          <DesktopAnamnesisEditor
            clientId={clientId}
            submissionId={activeSubmission?.id}
            templateId={activeTemplate?.id ?? activeSubmission?.template_id ?? null}
            templatePdfUrl={activeTemplate?.pdf_url ?? null}
            formSchema={activeTemplate?.form_schema ?? []}
            initialFormValues={activeSubmission?.form_values ?? {}}
            initialSignerName={activeSubmission?.signer_name}
            initialStatus={(activeSubmission?.status ?? "draft") as
              | "draft"
              | "submitted"
              | "signed"}
            hasInkAnnotations={
              activeSubmission ? (activeSubmission.ink_strokes ?? []).length > 0 : false
            }
          />
        </section>
      ) : null}

      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Iniciar nova anamnese/consentimento
        </h3>
        {templates.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            Você ainda não cadastrou templates — vá em{" "}
            <span className="font-medium text-ink">Configurações › Anamnese</span>{" "}
            para enviar o PDF.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-2 rounded-2xl bg-canvas p-4 ring-1 ring-line/70 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-ink">
                    {t.name}
                    {t.is_default ? (
                      <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] uppercase text-brand">
                        Padrão
                      </span>
                    ) : null}
                  </p>
                  {t.description ? (
                    <p className="text-xs text-ink-muted">{t.description}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openChoose({ kind: "template", template: t })}
                  disabled={!t.pdf_url}
                >
                  Abrir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Submissões da paciente
        </h3>
        {submissions.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">Nenhuma submissão ainda.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {submissions.map((s) => {
              const hasForm = Object.values(s.form_values ?? {}).some(
                (v) => v !== undefined && v !== null && v !== "" && v !== false,
              );
              const hasInk = (s.ink_strokes ?? []).length > 0;
              return (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 rounded-2xl bg-surface p-4 ring-1 ring-line/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {s.template_name ?? "Sem template"}
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-ink-muted">
                        {statusLabel(s.status)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Último modo: {modeLabel(s.mode)} · atualizado{" "}
                      {new Date(s.updated_at).toLocaleString("pt-BR")}
                      {s.signer_name ? ` · assinado por ${s.signer_name}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {hasForm ? (
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                          Formulário preenchido
                        </span>
                      ) : null}
                      {hasInk ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                          Anotações a caneta
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        openChoose({
                          kind: "submission",
                          submission: s,
                          template: templateById(s.template_id),
                        })
                      }
                    >
                      {s.status === "draft" ? "Continuar" : "Ver"}
                    </Button>
                    {s.flattened_pdf_url ? (
                      <a
                        href={s.flattened_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center rounded-lg px-3 text-xs font-medium text-ink-muted transition hover:bg-brand/5 hover:text-brand"
                      >
                        PDF final
                      </a>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      onClick={() => removeSubmission(s.id)}
                      disabled={pending}
                    >
                      Excluir
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function ModeChooserOverlay({
  title,
  submission,
  onClose,
  onChooseDesktop,
  onChooseInteractive,
  pending,
}: {
  title: string;
  submission: SubmissionItem | null;
  onClose: () => void;
  onChooseDesktop: () => void;
  onChooseInteractive: () => void;
  pending: boolean;
}) {
  const isReadOnly = submission && submission.status !== "draft";
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-3xl bg-surface p-6 shadow-lift">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-xs text-ink-muted">
              {isReadOnly
                ? "Esta submissão já foi finalizada — escolha o modo para visualizar."
                : "Você pode alternar entre os modos depois. Os dados de cada modo ficam preservados."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs text-ink-muted hover:bg-muted"
          >
            Fechar
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            title="Desktop / Notebook"
            description="Preencha os campos rastreados do PDF digitando, página por página. Ideal para uso rápido no computador."
            icon={<Pen className="h-5 w-5" />}
            tone="brand"
            onClick={onChooseDesktop}
            disabled={pending}
          />
          <ModeCard
            title="Interativo / Tablet"
            description="Abre em tela cheia. Use caneta digital para preencher e assinar direto no PDF, com palm rejection, marca-texto e desfazer."
            icon={<PenTool className="h-5 w-5" />}
            tone="amber"
            onClick={onChooseInteractive}
            disabled={pending}
          />
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  title,
  description,
  icon,
  tone,
  onClick,
  disabled,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: "brand" | "amber";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col gap-2 rounded-2xl border p-5 text-left transition",
        "hover:shadow-lift disabled:opacity-50 disabled:pointer-events-none",
        tone === "brand"
          ? "border-brand/30 bg-brand/5 hover:bg-brand/10"
          : "border-amber-300/50 bg-amber-50 hover:bg-amber-100/60",
      )}
    >
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl",
          tone === "brand"
            ? "bg-brand text-white"
            : "bg-amber-500 text-white",
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-semibold text-ink">{title}</span>
      <span className="text-xs text-ink-muted">{description}</span>
    </button>
  );
}

function statusLabel(s: AnamnesisSubmissionStatus): string {
  return { draft: "Rascunho", submitted: "Finalizada", signed: "Assinada" }[s];
}

function modeLabel(m: AnamnesisSubmissionMode): string {
  return m === "interactive" ? "Interativo" : "Desktop";
}
