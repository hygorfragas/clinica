"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ContractHtmlPreview } from "@/components/contracts/contract-html-preview";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PacienteAnamneseForm } from "@/components/clients/paciente-anamnese-form";
import { PacienteCadastroForm } from "@/components/clients/paciente-cadastro-form";
import { defaultAnamnesisPayload } from "@/lib/anamnesis/schema";
import {
  DOCUMENT_KIND_OPTIONS,
  DOCUMENT_KINDS,
} from "@/lib/clinical/document-kinds";
import type { DocumentKind } from "@/lib/clinical/document-kinds";
import { ClinicalPhotoUploader } from "@/components/clients/clinical-photo-uploader";
import { sanitizeContractHtml } from "@/lib/contracts/sanitize-html";
import {
  attachClientDocumentFromTemplate,
  uploadClinicalDocument,
} from "@/lib/clients/record-actions";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
import { cn } from "@/lib/utils";

export type WizardContractTemplate = {
  id: string;
  title: string;
  body_html: string | null;
  storage_key: string | null;
  mime_type: string | null;
  is_default: boolean;
};

const steps = [
  { id: 1, title: "Cadastro" },
  { id: 2, title: "Anamnese" },
  { id: 3, title: "Fotos" },
  { id: 4, title: "Documentos" },
  { id: 5, title: "Concluir" },
] as const;

function templateIsFile(t: WizardContractTemplate) {
  return !!(t.storage_key && t.storage_key.trim().length > 0);
}

export function NovoPacienteWizard({
  contractTemplates = [],
}: {
  contractTemplates?: WizardContractTemplate[];
}) {
  const [step, setStep] = useState(1);
  const [clientId, setClientId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const [docFile, setDocFile] = useState<File | null>(null);
  const [docKind, setDocKind] = useState<DocumentKind>("procedure");
  const [docTitle, setDocTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(() => {
    const def = contractTemplates.find((t) => t.is_default)?.id;
    return def ?? contractTemplates[0]?.id ?? null;
  });

  const selectedTemplate = useMemo(
    () => contractTemplates.find((t) => t.id === selectedTemplateId) ?? null,
    [contractTemplates, selectedTemplateId],
  );

  function uploadDocOptional() {
    if (!clientId) {
      setStep(5);
      return;
    }
    if (docKind === DOCUMENT_KINDS.contract) {
      if (!selectedTemplateId || contractTemplates.length === 0) {
        setStep(5);
        return;
      }
      setMsg(null);
      startTransition(async () => {
        const result = await attachClientDocumentFromTemplate(
          clientId,
          selectedTemplateId,
          docTitle.trim() ? docTitle.trim() : null,
        );
        if (result.ok) {
          setDocTitle("");
          notifySuccess("Contrato anexado ao prontuário.");
          setStep(5);
          return;
        }
        setMsg(result.error);
        notifyError(null, result.error);
      });
      return;
    }
    if (!docFile) {
      setStep(5);
      return;
    }
    setMsg(null);
    const fd = new FormData();
    fd.set("file", docFile);
    fd.set("kind", docKind);
    if (docTitle.trim()) fd.set("title", docTitle.trim());
    startTransition(async () => {
      const result = await uploadClinicalDocument(clientId, fd);
      if (result.ok) {
        setDocFile(null);
        setDocTitle("");
        notifySuccess("Documento anexado.");
        setStep(5);
        return;
      }
      setMsg(result.error);
      notifyError(null, result.error);
    });
  }

  return (
    <div className="space-y-8">
      <ol className="flex flex-wrap gap-2" aria-label="Etapas do cadastro">
        {steps.map((s) => {
          const active = step === s.id;
          const done = clientId && s.id < step;
          return (
            <li
              key={s.id}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                active && "bg-brand/15 text-brand ring-1 ring-brand/30",
                done && !active && "bg-muted text-ink-muted",
                !active && !done && "text-ink-subtle",
              )}
            >
              {s.id}. {s.title}
            </li>
          );
        })}
      </ol>

      {msg && (
        <p className="text-sm text-danger" role="alert">
          {msg}
        </p>
      )}

      {step === 1 && (
        <PacienteCadastroForm
          onCreated={(id) => {
            setClientId(id);
            setStep(2);
          }}
          submitLabel="Continuar para anamnese"
          cancelHref="/pacientes"
        />
      )}

      {step === 2 && clientId && (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Salve a anamnese com o botão no final do formulário, ou pule para
            preencher depois na ficha.
          </p>
          <PacienteAnamneseForm
            clientId={clientId}
            initialPayload={defaultAnamnesisPayload}
          />
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setStep(3)}
            >
              Pular por agora
            </Button>
            <Button type="button" disabled={pending} onClick={() => setStep(3)}>
              Continuar para fotos
            </Button>
          </div>
        </div>
      )}

      {step === 3 && clientId && (
        <div className="space-y-4">
          <ClinicalPhotoUploader
            clientId={clientId}
            compact
            onBatchComplete={() => setStep(4)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => setStep(4)}
          >
            Pular fotos por agora
          </Button>
        </div>
      )}

      {step === 4 && clientId && (
        <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
          <h2 className="text-lg font-semibold text-ink">
            Documento (opcional)
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Contrato ou termo de procedimento. Mais arquivos na ficha da paciente.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wiz_dkind">Tipo</Label>
              <select
                id="wiz_dkind"
                className="flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
                value={docKind}
                onChange={(e) => {
                  setDocKind(e.target.value as DocumentKind);
                  setMsg(null);
                }}
              >
                {DOCUMENT_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wiz_dtitle">Título na ficha (opcional)</Label>
              <Input
                id="wiz_dtitle"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Sobrescreve o título do modelo, se quiser"
              />
            </div>
          </div>

          {docKind === DOCUMENT_KINDS.contract ? (
            <div className="mt-8 space-y-6">
              <div className="rounded-2xl bg-brand-soft/50 p-4 ring-1 ring-brand/15">
                <p className="text-sm font-medium text-ink">
                  Contrato a partir de um modelo da clínica
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Os modelos são criados em{" "}
                  <Link
                    href="/configuracoes/contratos"
                    className="font-semibold text-brand hover:underline"
                  >
                    Configurações → Contratos
                  </Link>
                  . A prévia abaixo é somente leitura; na ficha fica uma cópia vinculada à paciente.
                </p>
              </div>

              {contractTemplates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-muted/30 p-8 text-center">
                  <FileText className="mx-auto h-10 w-10 text-ink-subtle" aria-hidden />
                  <p className="mt-3 text-sm text-ink-muted">
                    Nenhum modelo de contrato cadastrado. Crie um para usar esta etapa, ou pule e
                    anexe depois na ficha.
                  </p>
                  <Link
                    href="/configuracoes/contratos"
                    className={cn(buttonVariants({ variant: "secondary" }), "mt-5 inline-flex")}
                  >
                    Ir para Contratos
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="wiz_contract_tpl">Modelo de contrato</Label>
                    <select
                      id="wiz_contract_tpl"
                      className="flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
                      value={selectedTemplateId ?? ""}
                      onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                    >
                      {contractTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                          {t.is_default ? " · padrão" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTemplate ? (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                        Pré-visualização
                      </p>
                      {templateIsFile(selectedTemplate) ? (
                        <div className="flex items-start gap-3 rounded-2xl bg-muted/50 p-5 ring-1 ring-line/70">
                          <FileText className="mt-0.5 h-8 w-8 shrink-0 text-brand" aria-hidden />
                          <div>
                            <p className="text-sm font-medium text-ink">Arquivo anexo (PDF ou imagem)</p>
                            <p className="mt-1 text-xs text-ink-muted">
                              O documento completo será copiado para a ficha ao continuar. Tipo:{" "}
                              {selectedTemplate.mime_type ?? "arquivo"}.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <ContractHtmlPreview
                          html={sanitizeContractHtml(selectedTemplate.body_html ?? "")}
                        />
                      )}
                    </div>
                  ) : null}
                </>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="primary"
                  disabled={pending || contractTemplates.length === 0}
                  onClick={uploadDocOptional}
                >
                  {pending
                    ? "Anexando…"
                    : contractTemplates.length === 0
                      ? "Nenhum modelo"
                      : "Anexar à ficha e continuar"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => setStep(5)}
                >
                  Pular
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-2 sm:col-span-2">
                <Label htmlFor="wiz_dfile">Arquivo</Label>
                <Input
                  id="wiz_dfile"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" disabled={pending} onClick={uploadDocOptional}>
                  {docFile ? (pending ? "Enviando…" : "Enviar e continuar") : "Pular"}
                </Button>
              </div>
            </>
          )}
        </section>
      )}

      {step === 5 && clientId && (
        <section className="rounded-[1.75rem] bg-muted/50 p-8 text-center ring-1 ring-line/70">
          <h2 className="text-xl font-semibold text-ink">Cadastro iniciado</h2>
          <p className="mt-3 text-sm text-ink-muted">
            A ficha completa está disponível com abas para anamnese, evolução,
            fotos, documentos e assinaturas.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={`/pacientes/${clientId}`}
              className={buttonVariants({ variant: "primary" })}
            >
              Abrir ficha da paciente
            </Link>
            <Link
              href="/pacientes"
              className={buttonVariants({ variant: "secondary" })}
            >
              Voltar à lista
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
