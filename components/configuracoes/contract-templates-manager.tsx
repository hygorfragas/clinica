"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createContractTemplateFromEditor,
  createContractTemplateFromFile,
  deleteContractTemplate,
  setDefaultContractTemplate,
  updateContractTemplateFromEditor,
} from "@/lib/contracts/template-actions";
import { ContractRichEditor } from "@/components/contracts/contract-rich-editor";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
import { cn } from "@/lib/utils";
import {
  FileText,
  Pencil,
  Plus,
  Signature,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";

export type ContractTemplateListItem = {
  id: string;
  title: string;
  body_html: string | null;
  storage_key: string | null;
  mime_type: string | null;
  is_default: boolean;
  created_at: string;
};

type Tab = "editor" | "file";

export function ContractTemplatesManager({
  initialTemplates,
}: {
  initialTemplates: ContractTemplateListItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<Tab>("editor");
  const [editId, setEditId] = useState<string | null>(null);
  const { confirm, element: confirmDialog } = useConfirmDialog();

  const [titleNew, setTitleNew] = useState("");
  const [htmlNew, setHtmlNew] = useState("<p></p>");
  const [defaultNew, setDefaultNew] = useState(false);
  const [fileNew, setFileNew] = useState<File | null>(null);

  const [titleEdit, setTitleEdit] = useState("");
  const [htmlEdit, setHtmlEdit] = useState("");
  const [defaultEdit, setDefaultEdit] = useState(false);

  const editing = useMemo(
    () => initialTemplates.find((t) => t.id === editId) ?? null,
    [initialTemplates, editId],
  );

  const isHtmlTemplate = (t: ContractTemplateListItem) =>
    !!(t.body_html && t.body_html.replace(/<[^>]+>/g, "").trim().length > 0);

  function openEdit(t: ContractTemplateListItem) {
    if (!isHtmlTemplate(t)) return;
    setEditId(t.id);
    setTitleEdit(t.title);
    setHtmlEdit(t.body_html ?? "<p></p>");
    setDefaultEdit(t.is_default);
    setError(null);
  }

  function closeModals() {
    setCreateOpen(false);
    setEditId(null);
    setError(null);
    setTitleNew("");
    setHtmlNew("<p></p>");
    setDefaultNew(false);
    setFileNew(null);
    setCreateTab("editor");
  }

  return (
    <div className="space-y-8">
      {confirmDialog}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-sm text-ink-muted">
          Modelos aparecem na etapa <strong className="text-ink">Documentos</strong> do cadastro
          de nova paciente quando o tipo for <strong className="text-ink">Contrato</strong>.
        </p>
        <Button
          type="button"
          variant="primary"
          disabled={pending}
          onClick={() => {
            setCreateOpen(true);
            setError(null);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Novo contrato
        </Button>
      </div>

      {initialTemplates.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-brand/25 bg-brand-soft/40 p-10 text-center shadow-lift">
          <Sparkles className="mx-auto h-10 w-10 text-brand opacity-80" aria-hidden />
          <p className="mt-4 text-sm font-medium text-ink">
            Nenhum modelo ainda
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            Crie o primeiro contrato em texto (com formatação ABNT aproximada) ou envie um PDF /
            imagem como base.
          </p>
          <Button
            type="button"
            className="mt-6"
            variant="primary"
            onClick={() => setCreateOpen(true)}
          >
            Criar modelo
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {initialTemplates.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-4 rounded-[1.25rem] bg-surface p-5 shadow-lift ring-1 ring-line sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {t.is_default ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold text-brand">
                      <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                      Padrão no cadastro
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      isHtmlTemplate(t)
                        ? "bg-muted text-ink-muted"
                        : "bg-secondary-container/60 text-on-secondary-container",
                    )}
                  >
                    {isHtmlTemplate(t) ? (
                      "Texto formatado"
                    ) : (
                      <>
                        <FileText className="h-3.5 w-3.5" aria-hidden />
                        Arquivo ({t.mime_type ?? "anexo"})
                      </>
                    )}
                  </span>
                </div>
                <p className="mt-2 font-semibold text-ink">{t.title}</p>
                <p className="mt-1 text-xs text-ink-subtle">
                  Atualizado em {new Date(t.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!t.is_default ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      startTransition(async () => {
                        const r = await setDefaultContractTemplate(t.id);
                        if (!r.ok) {
                          setError(r.error);
                          notifyError(null, r.error);
                          return;
                        }
                        notifySuccess("Modelo marcado como padrão.");
                        router.refresh();
                      });
                    }}
                  >
                    Usar como padrão
                  </Button>
                ) : null}
                {isHtmlTemplate(t) ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => openEdit(t)}
                    className="gap-1"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Editar
                  </Button>
                ) : null}
                {!isHtmlTemplate(t) && t.mime_type === "application/pdf" ? (
                  <Link
                    href={`/configuracoes/contratos/${t.id}/campos`}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-secondary-container/90 px-3 text-xs font-medium text-on-secondary-container shadow-sm transition hover:bg-secondary-container"
                  >
                    <Signature className="h-3.5 w-3.5" aria-hidden />
                    Marcar campos
                  </Link>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-danger hover:text-danger"
                  disabled={pending}
                  onClick={() => {
                    confirm({
                      title: "Excluir modelo",
                      description:
                        "O modelo será removido. Contratos já anexados a prontuários permanecem intactos.",
                      confirmLabel: "Excluir",
                      destructive: true,
                      onConfirm: () =>
                        new Promise<void>((resolve, reject) => {
                          setError(null);
                          startTransition(async () => {
                            const r = await deleteContractTemplate(t.id);
                            if (!r.ok) {
                              setError(r.error);
                              notifyError(null, r.error);
                              reject(new Error(r.error));
                              return;
                            }
                            notifySuccess("Modelo excluído.");
                            router.refresh();
                            resolve();
                          });
                        }),
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {createOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contract-create-title"
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] bg-surface p-6 shadow-panel ring-1 ring-line md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="contract-create-title" className="text-xl font-semibold text-ink">
                  Novo modelo de contrato
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Texto rico (recomendado) ou arquivo único por modelo.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={closeModals}
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mt-6 flex gap-2 rounded-full bg-muted/80 p-1">
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  createTab === "editor"
                    ? "bg-surface text-brand shadow-sm ring-1 ring-line"
                    : "text-ink-muted hover:text-ink",
                )}
                onClick={() => setCreateTab("editor")}
              >
                Editor de texto
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  createTab === "file"
                    ? "bg-surface text-brand shadow-sm ring-1 ring-line"
                    : "text-ink-muted hover:text-ink",
                )}
                onClick={() => setCreateTab("file")}
              >
                Enviar arquivo
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ct_title_new">Título do modelo</Label>
                <Input
                  id="ct_title_new"
                  value={titleNew}
                  onChange={(e) => setTitleNew(e.target.value)}
                  placeholder="Ex.: Contrato de procedimento estético"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={defaultNew}
                  onChange={(e) => setDefaultNew(e.target.checked)}
                  className="rounded border-line text-brand focus:ring-brand"
                />
                Definir como padrão ao cadastrar nova paciente (tipo Contrato)
              </label>
            </div>

            {createTab === "editor" ? (
              <div className="mt-6">
                <ContractRichEditor value={htmlNew} onChange={setHtmlNew} />
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    loading={pending}
                    loadingLabel="Salvando..."
                    onClick={() => {
                      setError(null);
                      startTransition(async () => {
                        const r = await createContractTemplateFromEditor({
                          title: titleNew,
                          bodyHtml: htmlNew,
                          isDefault: defaultNew,
                        });
                        if (!r.ok) {
                          setError(r.error);
                          notifyError(null, r.error);
                          return;
                        }
                        notifySuccess("Modelo criado.");
                        closeModals();
                        router.refresh();
                      });
                    }}
                  >
                    Salvar modelo
                  </Button>
                  <Button type="button" variant="secondary" onClick={closeModals}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ct_file_new">PDF ou imagem</Label>
                  <Input
                    id="ct_file_new"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => setFileNew(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    loading={pending}
                    loadingLabel="Enviando..."
                    onClick={() => {
                      if (!fileNew) {
                        setError("Selecione um arquivo.");
                        notifyError(null, "Selecione um arquivo.");
                        return;
                      }
                      setError(null);
                      const fd = new FormData();
                      fd.set("title", titleNew);
                      fd.set("file", fileNew);
                      if (defaultNew) fd.set("is_default", "1");
                      startTransition(async () => {
                        const r = await createContractTemplateFromFile(fd);
                        if (!r.ok) {
                          setError(r.error);
                          notifyError(null, r.error);
                          return;
                        }
                        notifySuccess("Modelo criado.");
                        closeModals();
                        router.refresh();
                      });
                    }}
                  >
                    Salvar modelo
                  </Button>
                  <Button type="button" variant="secondary" onClick={closeModals}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {editing && isHtmlTemplate(editing) ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contract-edit-title"
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] bg-surface p-6 shadow-panel ring-1 ring-line md:p-8">
            <div className="flex items-start justify-between gap-4">
              <h2 id="contract-edit-title" className="text-xl font-semibold text-ink">
                Editar modelo
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditId(null)}
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ct_title_edit">Título</Label>
                <Input
                  id="ct_title_edit"
                  value={titleEdit}
                  onChange={(e) => setTitleEdit(e.target.value)}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={defaultEdit}
                  onChange={(e) => setDefaultEdit(e.target.checked)}
                  className="rounded border-line text-brand focus:ring-brand"
                />
                Modelo padrão no cadastro
              </label>
            </div>
            <div className="mt-4" key={editing.id}>
              <ContractRichEditor value={htmlEdit} onChange={setHtmlEdit} />
            </div>
            <p className="mt-4 text-xs text-ink-muted">
              <Link href="/pacientes/novo" className="font-medium text-brand hover:underline">
                Pré-visualização rápida
              </Link>
              : inicie um cadastro de teste e avance até a etapa Documentos com tipo Contrato.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="primary"
                loading={pending}
                loadingLabel="Salvando..."
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const r = await updateContractTemplateFromEditor({
                      id: editing.id,
                      title: titleEdit,
                      bodyHtml: htmlEdit,
                      isDefault: defaultEdit,
                    });
                    if (!r.ok) {
                      setError(r.error);
                      notifyError(null, r.error);
                      return;
                    }
                    notifySuccess("Alterações salvas.");
                    setEditId(null);
                    router.refresh();
                  });
                }}
              >
                Salvar alterações
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditId(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
