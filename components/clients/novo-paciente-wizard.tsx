"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PacienteAnamneseForm } from "@/components/clients/paciente-anamnese-form";
import { PacienteCadastroForm } from "@/components/clients/paciente-cadastro-form";
import { defaultAnamnesisPayload } from "@/lib/anamnesis/schema";
import {
  DOCUMENT_KIND_OPTIONS,
} from "@/lib/clinical/document-kinds";
import type { DocumentKind } from "@/lib/clinical/document-kinds";
import { ClinicalPhotoUploader } from "@/components/clients/clinical-photo-uploader";
import { uploadClinicalDocument } from "@/lib/clients/record-actions";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, title: "Cadastro" },
  { id: 2, title: "Anamnese" },
  { id: 3, title: "Fotos" },
  { id: 4, title: "Documentos" },
  { id: 5, title: "Concluir" },
] as const;

export function NovoPacienteWizard() {
  const [step, setStep] = useState(1);
  const [clientId, setClientId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const [docFile, setDocFile] = useState<File | null>(null);
  const [docKind, setDocKind] = useState<DocumentKind>("procedure");
  const [docTitle, setDocTitle] = useState("");

  function uploadDocOptional() {
    if (!clientId || !docFile) {
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
        setStep(5);
        return;
      }
      setMsg(result.error);
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
            Contrato ou termo de procedimento. Mais arquivos na ficha.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wiz_dkind">Tipo</Label>
              <select
                id="wiz_dkind"
                className="flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
                value={docKind}
                onChange={(e) => setDocKind(e.target.value as DocumentKind)}
              >
                {DOCUMENT_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wiz_dtitle">Título (opcional)</Label>
              <Input
                id="wiz_dtitle"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="wiz_dfile">Arquivo</Label>
              <Input
                id="wiz_dfile"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={pending}
              onClick={uploadDocOptional}
            >
              {docFile ? (pending ? "Enviando…" : "Enviar e continuar") : "Pular"}
            </Button>
          </div>
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
