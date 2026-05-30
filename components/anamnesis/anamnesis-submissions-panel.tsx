"use client";

import { Pen, PenTool } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { DesktopAnamnesisEditor } from "./desktop-anamnesis-editor";
import { EvolutionPhotoSidePanel } from "@/components/evolutions/evolution-photo-side-panel";
import {
  deleteAnamnesisSubmission,
  saveAnamnesisSubmission,
} from "@/lib/anamnesis/submission-actions";
import {
  deleteContractSubmission,
  saveContractSubmission,
} from "@/lib/contracts/submission-actions";
import {
  deleteEvolutionSubmission,
  saveEvolutionSubmission,
} from "@/lib/evolutions/submission-actions";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
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

type SubmissionPhotoLite = {
  id: string;
  url: string | null;
  caption: string | null;
  phase: "before" | "after" | "during" | null;
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
  photos?: SubmissionPhotoLite[];
};

type Props = {
  clientId: string;
  templates: TemplateLite[];
  submissions: SubmissionItem[];
  /** Define qual entidade é alvo (anamnesis, evolution ou contract). */
  entityKind?: "anamnesis" | "evolution" | "contract";
};

type EntityCopy = {
  newCta: string;
  newSectionTitle: string;
  emptyHelp: string;
  submissionsTitle: string;
  emptyTemplates: string;
  configHref: string;
  configLabel: string;
  removeTitle: string;
  removeDesc: string;
  startTitle: (templateName: string) => string;
  continueTitle: (templateName: string) => string;
  interactiveBaseHref: string;
};

const COPY_BY_KIND: Record<
  "anamnesis" | "evolution" | "contract",
  EntityCopy
> = {
  anamnesis: {
    newCta: "Iniciar nova anamnese/consentimento",
    newSectionTitle: "Iniciar nova anamnese/consentimento",
    emptyHelp:
      "Você ainda não cadastrou templates — vá em Configurações › Anamnese para enviar o PDF.",
    submissionsTitle: "Submissões da paciente",
    emptyTemplates: "Configurações › Anamnese",
    configHref: "/configuracoes/anamnese",
    configLabel: "Configurações › Anamnese",
    removeTitle: "Excluir submissão",
    removeDesc:
      "Esta submissão da anamnese será removida permanentemente, incluindo formulário e anotações.",
    startTitle: (n) => `Iniciar nova anamnese — ${n}`,
    continueTitle: (n) => `Continuar — ${n}`,
    interactiveBaseHref: "/anamnese/interativa",
  },
  evolution: {
    newCta: "Registrar nova evolução",
    newSectionTitle: "Registrar nova evolução",
    emptyHelp:
      "Você ainda não cadastrou fichas — vá em Configurações › Evolução para enviar o PDF.",
    submissionsTitle: "Evoluções registradas",
    emptyTemplates: "Configurações › Evolução",
    configHref: "/configuracoes/evolucao",
    configLabel: "Configurações › Evolução",
    removeTitle: "Excluir evolução",
    removeDesc:
      "Este registro de evolução será removido permanentemente, incluindo formulário e anotações.",
    startTitle: (n) => `Registrar evolução — ${n}`,
    continueTitle: (n) => `Continuar — ${n}`,
    interactiveBaseHref: "/evolucao/interativa",
  },
  contract: {
    newCta: "Iniciar contrato",
    newSectionTitle: "Iniciar contrato",
    emptyHelp:
      "Você ainda não cadastrou contratos em PDF — vá em Configurações › Contratos para enviar o arquivo e marcar os campos.",
    submissionsTitle: "Contratos da paciente",
    emptyTemplates: "Configurações › Contratos",
    configHref: "/configuracoes/contratos",
    configLabel: "Configurações › Contratos",
    removeTitle: "Excluir contrato",
    removeDesc:
      "Este contrato será removido permanentemente, incluindo preenchimento e assinatura.",
    startTitle: (n) => `Iniciar contrato — ${n}`,
    continueTitle: (n) => `Continuar — ${n}`,
    interactiveBaseHref: "/contratos/interativa",
  },
};

type ChooserState =
  | { kind: "template"; template: TemplateLite }
  | { kind: "submission"; submission: SubmissionItem; template: TemplateLite | null };

export function AnamnesisSubmissionsPanel({
  clientId,
  templates,
  submissions,
  entityKind = "anamnesis",
}: Props) {
  const copy = COPY_BY_KIND[entityKind];
  const saveAction =
    entityKind === "evolution"
      ? saveEvolutionSubmission
      : entityKind === "contract"
        ? saveContractSubmission
        : saveAnamnesisSubmission;
  const deleteAction =
    entityKind === "evolution"
      ? deleteEvolutionSubmission
      : entityKind === "contract"
        ? deleteContractSubmission
        : deleteAnamnesisSubmission;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openChooser, setOpenChooser] = useState<ChooserState | null>(null);
  const [openDesktopSubmission, setOpenDesktopSubmission] = useState<
    SubmissionItem | null
  >(null);
  const [openDesktopTemplate, setOpenDesktopTemplate] =
    useState<TemplateLite | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Ref do editor para flush síncrono antes de fechar (evita perda da
  // digitação dos últimos ~800 ms quando o autosave ainda não disparou).
  const editorFlushRef = useRef<null | (() => Promise<void>)>(null);
  const { confirm, element: confirmDialog } = useConfirmDialog();

  const templateById = useMemo(
    () => (id: string | null) => templates.find((t) => t.id === id) ?? null,
    [templates],
  );

  const isEditingDesktop = Boolean(openDesktopTemplate || openDesktopSubmission);
  const activeTemplate =
    openDesktopTemplate ?? templateById(openDesktopSubmission?.template_id ?? null);
  const activeSubmission = openDesktopSubmission;

  function removeSubmission(id: string) {
    confirm({
      title: copy.removeTitle,
      description: copy.removeDesc,
      confirmLabel: "Excluir",
      destructive: true,
      onConfirm: () =>
        new Promise<void>((resolve, reject) => {
          startTransition(async () => {
            const result = await deleteAction(clientId, id);
            if (!result.ok) {
              setError(result.error);
              notifyError(null, result.error);
              reject(new Error(result.error));
              return;
            }
            notifySuccess("Submissão excluída.");
            router.refresh();
            resolve();
          });
        }),
    });
  }

  function openChoose(state: ChooserState) {
    setError(null);
    setOpenChooser(state);
  }

  function chooseDesktop() {
    if (!openChooser) return;
    if (openChooser.kind === "submission") {
      setOpenDesktopSubmission(openChooser.submission);
      setOpenDesktopTemplate(null);
      setOpenChooser(null);
      return;
    }
    // kind === "template": cria submission draft no banco antes de abrir o
    // editor. Sem isso, o rascunho só persistia depois do primeiro autosave
    // (~800 ms) e o usuário podia perder a sessão entre dispositivos.
    //
    // IMPORTANTE: passar `silent: true` para que a server action não chame
    // revalidatePath. Sem isso, o server component re-renderiza enquanto o
    // editor está montando e o PdfPageCanvas vê um signed URL trocando
    // mid-flight — a guarda `loadedPdfBaseRef` então conclui "já carreguei"
    // e o PDF nunca aparece na primeira abertura. O draft já tem ID válido
    // e a próxima leitura completa via router.refresh acontece no
    // "Fechar editor", quando o editor não está mais montado.
    const template = openChooser.template;
    startTransition(async () => {
      setError(null);
      const result = await saveAction(clientId, {
        templateId: template.id,
        mode: "desktop",
        status: "draft",
        formValues: {},
        inkStrokes: [],
        silent: true,
      });
      if (!result.ok) {
        setError(result.error);
        notifyError(null, result.error);
        return;
      }
      // Constrói uma SubmissionItem mínima coerente para alimentar o editor.
      const draft: SubmissionItem = {
        id: result.id,
        template_id: template.id,
        template_name: template.name,
        mode: "desktop",
        status: "draft",
        updated_at: new Date().toISOString(),
        signer_name: null,
        submitted_at: null,
        signed_at: null,
        flattened_pdf_url: null,
        form_values: {},
        ink_strokes: [],
      };
      setOpenDesktopSubmission(draft);
      setOpenDesktopTemplate(null);
      setOpenChooser(null);
    });
  }

  function chooseInteractive() {
    if (!openChooser) return;
    startTransition(async () => {
      setError(null);
      let submissionId: string | undefined;
      if (openChooser.kind === "submission") {
        submissionId = openChooser.submission.id;
      } else {
        // Cria submissão em draft antes de navegar. `silent: true` evita
        // revalidatePath enquanto a navegação está em curso — caso contrário
        // o cache do route destino pode chegar com signed URL trocando
        // mid-flight e o pdfjs do editor interativo não exibe o PDF.
        const result = await saveAction(clientId, {
          templateId: openChooser.template.id,
          mode: "interactive",
          status: "draft",
          formValues: {},
          inkStrokes: [],
          silent: true,
        });
        if (!result.ok) {
          setError(result.error);
          notifyError(null, result.error);
          return;
        }
        submissionId = result.id;
      }
      if (!submissionId) return;
      router.push(`${copy.interactiveBaseHref}/${clientId}/${submissionId}`);
    });
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      {error && <p className="text-sm text-danger">{error}</p>}

      {openChooser && (
        <ModeChooserOverlay
          title={
            openChooser.kind === "template"
              ? copy.startTitle(openChooser.template.name)
              : copy.continueTitle(openChooser.template?.name ?? "registro")
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
                const flush = editorFlushRef.current;
                startTransition(async () => {
                  if (flush) {
                    try {
                      await flush();
                    } catch {
                      // Não bloqueia o fechamento se o save falhar — o editor
                      // já mostrou o erro.
                    }
                  }
                  setOpenDesktopTemplate(null);
                  setOpenDesktopSubmission(null);
                  router.refresh();
                });
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
            initialInkStrokes={activeSubmission?.ink_strokes ?? []}
            initialSignerName={activeSubmission?.signer_name}
            initialStatus={(activeSubmission?.status ?? "draft") as
              | "draft"
              | "submitted"
              | "signed"}
            hasInkAnnotations={
              activeSubmission ? (activeSubmission.ink_strokes ?? []).length > 0 : false
            }
            entityKind={entityKind}
            registerFlush={(fn) => {
              editorFlushRef.current = fn;
            }}
            extraSidebarPanel={
              entityKind === "evolution" ? (
                <EvolutionPhotoSidePanel
                  clientId={clientId}
                  submissionId={activeSubmission?.id}
                  readOnly={
                    activeSubmission != null &&
                    activeSubmission.status !== "draft"
                  }
                />
              ) : null
            }
          />
        </section>
      ) : null}

      {!isEditingDesktop ? (
        <>
          <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
              {copy.newSectionTitle}
            </h3>
            {templates.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">
                {copy.emptyHelp}
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
              {copy.submissionsTitle}
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
                  const photos = s.photos ?? [];
                  const photosBefore = photos.filter((p) => p.phase === "before");
                  const photosAfter = photos.filter((p) => p.phase === "after");
                  return (
                    <li
                      key={s.id}
                      className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line/70"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                          {entityKind === "evolution" && photos.length > 0 ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                              {photosBefore.length} antes · {photosAfter.length} depois
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
                      </div>

                      {entityKind === "evolution" && photos.length > 0 ? (
                        <SubmissionPhotosPreview
                          before={photosBefore}
                          after={photosAfter}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : null}
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

function SubmissionPhotosPreview({
  before,
  after,
}: {
  before: SubmissionPhotoLite[];
  after: SubmissionPhotoLite[];
}) {
  return (
    <div className="grid gap-3 border-t border-line/60 pt-3 sm:grid-cols-2">
      <PhotosColumn title="Antes" photos={before} />
      <PhotosColumn title="Depois" photos={after} />
    </div>
  );
}

function PhotosColumn({
  title,
  photos,
}: {
  title: string;
  photos: SubmissionPhotoLite[];
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
        {title} ({photos.length})
      </p>
      {photos.length === 0 ? (
        <p className="text-[11px] text-ink-muted">Sem fotos.</p>
      ) : (
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
          {photos.slice(0, 8).map((p) =>
            p.url ? (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square overflow-hidden rounded-md bg-muted ring-1 ring-line/60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.caption ?? `Foto ${title.toLowerCase()}`}
                  className="h-full w-full object-cover"
                />
              </a>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
