"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DOCUMENT_KIND_LABELS,
  DOCUMENT_KIND_OPTIONS,
} from "@/lib/clinical/document-kinds";
import {
  deleteClinicalDocument,
  registerSignature,
  uploadClinicalDocument,
} from "@/lib/clients/record-actions";
import type { DocumentKind } from "@/lib/clinical/document-kinds";

export type DocComUrl = {
  id: string;
  kind: string;
  title: string | null;
  mime_type: string | null;
  created_at: string;
  url: string | null;
};

export type AssinaturaComUrl = {
  id: string;
  signer_name: string | null;
  signed_at: string;
  document_id: string | null;
  url: string | null;
};

export function PacienteDocumentosPanel({
  clientId,
  documentos,
  assinaturas,
}: {
  clientId: string;
  documentos: DocComUrl[];
  assinaturas: AssinaturaComUrl[];
}) {
  const router = useRouter();
  const docInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<DocumentKind>("procedure");
  const [title, setTitle] = useState("");
  const [sigDocId, setSigDocId] = useState("");
  const [signerName, setSignerName] = useState("");

  function uploadDoc() {
    const file = docInputRef.current?.files?.[0];
    if (!file) {
      setError("Selecione um PDF ou imagem.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("kind", kind);
    if (title.trim()) fd.set("title", title.trim());

    startTransition(async () => {
      const result = await uploadClinicalDocument(clientId, fd);
      if (result.ok) {
        setTitle("");
        if (docInputRef.current) docInputRef.current.value = "";
        router.refresh();
        return;
      }
      setError(result.error);
    });
  }

  function uploadSig() {
    const file = sigInputRef.current?.files?.[0];
    if (!file) {
      setError("Selecione a imagem da assinatura.");
      return;
    }
    if (signerName.trim().length < 2) {
      setError("Informe o nome de quem assinou.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("signer_name", signerName.trim());
    if (sigDocId) fd.set("document_id", sigDocId);

    startTransition(async () => {
      const result = await registerSignature(clientId, fd);
      if (result.ok) {
        setSignerName("");
        if (sigInputRef.current) sigInputRef.current.value = "";
        router.refresh();
        return;
      }
      setError(result.error);
    });
  }

  function openDoc(d: DocComUrl) {
    if (!d.url) {
      setError("Link do arquivo indisponível.");
      return;
    }
    window.open(d.url, "_blank", "noopener,noreferrer");
  }

  function removeDoc(id: string) {
    if (!confirm("Excluir este documento e o arquivo no armazenamento?")) return;
    startTransition(async () => {
      const result = await deleteClinicalDocument(clientId, id);
      if (result.ok) {
        router.refresh();
        return;
      }
      setError(result.error);
    });
  }

  return (
    <div className="space-y-10">
      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Novo documento
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Contratos, termos de procedimento, orientações pós-procedimento, PDFs
          ou fotos de exames.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="doc_kind">Tipo</Label>
            <select
              id="doc_kind"
              className="flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value as DocumentKind)}
            >
              {DOCUMENT_KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc_title">Título (opcional)</Label>
            <Input
              id="doc_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Termo de consentimento — preenchimento cutâneo"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="doc_file">Arquivo</Label>
            <Input
              id="doc_file"
              ref={docInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
            />
          </div>
        </div>
        {error && (
          <p className="mt-4 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <Button
          type="button"
          className="mt-6"
          disabled={pending}
          onClick={uploadDoc}
        >
          {pending ? "Enviando…" : "Enviar documento"}
        </Button>
      </section>

      <section className="rounded-[1.75rem] bg-muted/40 p-6 ring-1 ring-line/60 md:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Assinatura digital (imagem)
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Registre a imagem da assinatura da paciente (ou responsável), opcionalmente
          vinculada a um documento já enviado.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sig_doc">Vincular a documento (opcional)</Label>
            <select
              id="sig_doc"
              className="flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
              value={sigDocId}
              onChange={(e) => setSigDocId(e.target.value)}
            >
              <option value="">Nenhum</option>
              {documentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {(d.title ?? "Sem título") +
                    ` · ${
                      d.kind in DOCUMENT_KIND_LABELS
                        ? DOCUMENT_KIND_LABELS[d.kind as DocumentKind]
                        : d.kind
                    }`}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="signer_name">Nome de quem assinou</Label>
            <Input
              id="signer_name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sig_file">Imagem da assinatura</Label>
            <Input
              id="sig_file"
              ref={sigInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
          </div>
        </div>
        <Button
          type="button"
          className="mt-6"
          variant="secondary"
          disabled={pending}
          onClick={uploadSig}
        >
          {pending ? "Enviando…" : "Registrar assinatura"}
        </Button>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Documentos enviados
        </h2>
        {documentos.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            Nenhum documento nesta ficha.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {documentos.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line/70 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {d.title ?? "Sem título"}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {(d.kind in DOCUMENT_KIND_LABELS
                      ? DOCUMENT_KIND_LABELS[d.kind as DocumentKind]
                      : d.kind) +
                      " · "}
                    {new Date(d.created_at).toLocaleString("pt-BR")}
                    {d.mime_type ? ` · ${d.mime_type}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!d.url || pending}
                    onClick={() => openDoc(d)}
                  >
                    Abrir
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    disabled={pending}
                    onClick={() => removeDoc(d.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Assinaturas registradas
        </h2>
        {assinaturas.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            Nenhuma assinatura registrada ainda.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {assinaturas.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-2 rounded-2xl bg-surface/90 p-4 ring-1 ring-line/70 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-ink">
                    {a.signer_name ?? "Assinatura"}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {new Date(a.signed_at).toLocaleString("pt-BR")}
                    {a.document_id ? " · vinculada a documento" : ""}
                  </p>
                </div>
                {a.url ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      window.open(a.url!, "_blank", "noopener,noreferrer")
                    }
                  >
                    Ver imagem
                  </Button>
                ) : (
                  <span className="text-xs text-ink-muted">
                    Prévia indisponível
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
