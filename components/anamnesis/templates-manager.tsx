"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAnamnesisTemplate,
  deleteAnamnesisTemplate,
  updateAnamnesisTemplate,
} from "@/lib/anamnesis/template-actions";
import { notifyError, notifySuccess } from "@/lib/ui/notify";

export type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_archived: boolean;
  page_count: number;
  form_schema_count: number;
  updated_at: string;
};

export function TemplatesManager({ templates }: { templates: TemplateRow[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { confirm, element: confirmDialog } = useConfirmDialog();

  function handleCreate() {
    setError(null);
    setInfo(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Selecione o PDF do template.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Dê um nome para o template.");
      return;
    }

    const fd = new FormData();
    fd.set("name", name.trim());
    if (description.trim()) fd.set("description", description.trim());
    fd.set("file", file);
    if (isDefault) fd.set("is_default", "1");

    startTransition(async () => {
      const result = await createAnamnesisTemplate(fd);
      if (!result.ok) {
        setError(result.error);
        notifyError(null, result.error);
        return;
      }
      setInfo("Template criado. Clique em “Editar campos” para configurar.");
      setName("");
      setDescription("");
      setIsDefault(false);
      if (fileRef.current) fileRef.current.value = "";
      notifySuccess("Template criado.");
      router.refresh();
    });
  }

  function setDefault(id: string) {
    startTransition(async () => {
      const result = await updateAnamnesisTemplate({ id, isDefault: true });
      if (!result.ok) {
        setError(result.error);
        notifyError(null, result.error);
      } else {
        notifySuccess("Template marcado como padrão.");
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    confirm({
      title: "Excluir template",
      description:
        "O template será removido. Submissões antigas ligadas a ele permanecem salvas.",
      confirmLabel: "Excluir",
      destructive: true,
      onConfirm: () =>
        new Promise<void>((resolve, reject) => {
          startTransition(async () => {
            const result = await deleteAnamnesisTemplate(id);
            if (!result.ok) {
              setError(result.error);
              notifyError(null, result.error);
              reject(new Error(result.error));
              return;
            }
            notifySuccess("Template excluído.");
            router.refresh();
            resolve();
          });
        }),
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Novo template de anamnese/consentimento
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Envie o PDF base. Depois defina os campos interativos (texto, checkbox,
          áreas de desenho) sobre cada página.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tpl_name">Nome</Label>
            <Input
              id="tpl_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Anamnese facial — preenchimento"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl_desc">Descrição (opcional)</Label>
            <Input
              id="tpl_desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Para quem se aplica, observações…"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tpl_file">Arquivo PDF</Label>
            <Input
              id="tpl_file"
              ref={fileRef}
              type="file"
              accept="application/pdf"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            Usar como template padrão para novos pacientes
          </label>
        </div>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {info && !error && <p className="mt-4 text-sm text-brand">{info}</p>}
        <Button
          type="button"
          className="mt-6"
          loading={pending}
          loadingLabel="Enviando..."
          onClick={handleCreate}
        >
          Criar template
        </Button>
      </section>
      {confirmDialog}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Templates cadastrados
        </h2>
        {templates.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            Nenhum template ainda — envie um PDF acima para começar.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line/70 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {t.name}
                    {t.is_default ? (
                      <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] uppercase text-brand">
                        Padrão
                      </span>
                    ) : null}
                  </p>
                  {t.description ? (
                    <p className="mt-0.5 text-xs text-ink-muted">{t.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-ink-subtle">
                    {t.form_schema_count} campo(s) · {t.page_count} página(s) ·
                    atualizado em {new Date(t.updated_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/configuracoes/anamnese/${t.id}`}
                    className="inline-flex h-9 items-center rounded-lg bg-brand px-3 text-xs font-medium text-white shadow-sm transition hover:bg-brand-hover"
                  >
                    Editar campos
                  </Link>
                  {!t.is_default && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setDefault(t.id)}
                      disabled={pending}
                    >
                      Tornar padrão
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => remove(t.id)}
                    disabled={pending}
                  >
                    Excluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
