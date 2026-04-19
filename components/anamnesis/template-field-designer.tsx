"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdfDocument } from "@/lib/anamnesis/pdfjs";
import {
  ANAMNESIS_FIELD_TYPES,
  type AnamnesisField,
  type AnamnesisFieldType,
} from "@/lib/anamnesis/template-schema";
import { updateAnamnesisTemplate } from "@/lib/anamnesis/template-actions";
import { Button } from "@/components/ui/button";
import { PdfPageCanvas } from "./pdf-page-canvas";

type PageSize = { width: number; height: number };

type Props = {
  templateId: string;
  templateName: string;
  pdfUrl: string;
  initialFields: AnamnesisField[];
};

export function TemplateFieldDesigner({
  templateId,
  templateName,
  pdfUrl,
  initialFields,
}: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({});
  const [fields, setFields] = useState<AnamnesisField[]>(initialFields);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tool, setTool] = useState<AnamnesisFieldType>("text");
  const [pending, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [viewerWidth, setViewerWidth] = useState(820);

  useEffect(() => {
    let cancelled = false;
    loadPdfDocument(pdfUrl)
      .then((p) => {
        if (!cancelled) setPdf(p);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError("Não foi possível carregar o PDF.");
      });
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  useEffect(() => {
    const target = viewerRef.current;
    if (!target || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const next = Math.max(280, Math.floor(target.getBoundingClientRect().width));
      setViewerWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    };
    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const pageNumbers = useMemo(
    () => Array.from({ length: pdf?.numPages ?? 1 }, (_, i) => i + 1),
    [pdf],
  );
  const fieldsByPage = useMemo(() => {
    const map = new Map<number, AnamnesisField[]>();
    for (const f of fields) {
      const arr = map.get(f.page) ?? [];
      arr.push(f);
      map.set(f.page, arr);
    }
    return map;
  }, [fields]);

  function handleDrawStart(
    page: number,
    e: React.PointerEvent<HTMLDivElement>,
  ) {
    if (!creating) return;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const startX = (e.clientX - rect.left) / rect.width;
    const startY = (e.clientY - rect.top) / rect.height;
    const id = `f_${Date.now().toString(36)}`;
    const newField: AnamnesisField = {
      id,
      label: labelForType(tool),
      type: tool,
      page,
      x: startX,
      y: startY,
      width: 0.12,
      height: 0.04,
    };
    setFields((prev) => [...prev, newField]);
    setSelectedId(id);

    function onMove(ev: PointerEvent) {
      const cx = (ev.clientX - rect.left) / rect.width;
      const cy = (ev.clientY - rect.top) / rect.height;
      setFields((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                width: clamp01(Math.max(0.02, cx - startX)),
                height: clamp01(Math.max(0.02, cy - startY)),
              }
            : f,
        ),
      );
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setCreating(false);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function updateField(id: string, patch: Partial<AnamnesisField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  const handlePageLoaded = useCallback((info: { pageNumber: number; width: number; height: number }) => {
    setPageSizes((prev) => {
      const current = prev[info.pageNumber];
      if (
        current &&
        Math.abs(current.width - info.width) < 1 &&
        Math.abs(current.height - info.height) < 1
      ) {
        return prev;
      }
      return {
        ...prev,
        [info.pageNumber]: { width: info.width, height: info.height },
      };
    });
  }, []);

  async function save() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await updateAnamnesisTemplate({
        id: templateId,
        formSchema: fields,
        pageCount: pdf?.numPages ?? 1,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInfo("Template salvo.");
    });
  }

  const selected = fields.find((f) => f.id === selectedId) ?? null;
  const renderWidth = Math.max(280, Math.min(820, viewerWidth));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-line">
        <span className="text-sm font-semibold text-ink">{templateName}</span>
        <div className="mx-1 h-6 w-px bg-line" />
        <label className="text-xs text-ink-muted">Tipo</label>
        <select
          className="h-8 rounded-md border border-line bg-canvas px-2 text-sm"
          value={tool}
          onChange={(e) => setTool(e.target.value as AnamnesisFieldType)}
        >
          {ANAMNESIS_FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {labelForType(t)}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant={creating ? "secondary" : "primary"}
          onClick={() => setCreating((v) => !v)}
        >
          {creating ? "Clique no PDF para criar…" : "Adicionar campo"}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending ? "Salvando…" : "Salvar campos"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {info && !error && <p className="text-sm text-brand">{info}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div ref={viewerRef} className="space-y-5 min-w-0">
          {pdf
            ? pageNumbers.map((page) => {
                const size = pageSizes[page];
                const list = fieldsByPage.get(page) ?? [];
                return (
                  <div
                    key={page}
                    className="relative inline-block"
                    style={{ width: size?.width ?? renderWidth }}
                  >
                    <PdfPageCanvas
                      pdf={pdf}
                      pageNumber={page}
                      targetWidth={renderWidth}
                      onPageLoaded={handlePageLoaded}
                    />
                    {size ? (
                      <div
                        className="absolute inset-0"
                        style={{ cursor: creating ? "crosshair" : "default" }}
                        onPointerDown={(e) => handleDrawStart(page, e)}
                      >
                        {list.map((f) => (
                          <div
                            key={f.id}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setSelectedId(f.id);
                            }}
                            style={{
                              position: "absolute",
                              left: f.x * size.width,
                              top: f.y * size.height,
                              width: f.width * size.width,
                              height: f.height * size.height,
                            }}
                            className={`rounded-sm border bg-brand/10 ${
                              selectedId === f.id
                                ? "border-brand shadow-lift"
                                : "border-brand/40"
                            }`}
                          >
                            <span className="pointer-events-none absolute -top-4 left-0 whitespace-nowrap rounded bg-brand px-1 text-[10px] text-white">
                              {f.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })
            : (
              <div className="rounded-2xl bg-surface p-6 text-sm text-ink-muted ring-1 ring-line">
                Carregando PDF…
              </div>
            )}
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
            <h3 className="text-sm font-semibold text-ink">
              Campo selecionado
            </h3>
            {selected ? (
              <div className="mt-3 space-y-2 text-sm">
                <LabelledInput
                  label="Rótulo"
                  value={selected.label}
                  onChange={(v) => updateField(selected.id, { label: v })}
                />
                <LabelledInput
                  label="Campo vinculado (opcional)"
                  value={selected.bindPath ?? ""}
                  onChange={(v) => updateField(selected.id, { bindPath: v || undefined })}
                  placeholder="ex: client.full_name"
                />
                <LabelledInput
                  label="Placeholder"
                  value={selected.placeholder ?? ""}
                  onChange={(v) =>
                    updateField(selected.id, { placeholder: v || undefined })
                  }
                />
                <div className="flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={!!selected.required}
                      onChange={(e) =>
                        updateField(selected.id, { required: e.target.checked })
                      }
                    />
                    obrigatório
                  </label>
                </div>
                {selected.type === "select" && (
                  <LabelledTextArea
                    label="Opções (uma por linha)"
                    value={(selected.options ?? []).join("\n")}
                    onChange={(v) =>
                      updateField(selected.id, {
                        options: v
                          .split(/\n+/)
                          .map((x) => x.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => removeField(selected.id)}
                  >
                    Excluir campo
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-muted">
                Clique em “Adicionar campo”, desenhe no PDF, e depois clique no
                campo para editar.
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
            <h3 className="text-sm font-semibold text-ink">Campos ({fields.length})</h3>
            <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto text-xs">
              {fields.map((f) => (
                <li
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className={`cursor-pointer rounded px-2 py-1 ${
                    selectedId === f.id ? "bg-brand/10 text-ink" : "text-ink-muted"
                  }`}
                >
                  <span className="font-medium">{f.label}</span>
                  <span className="ml-1 text-ink-subtle">
                    · pág {f.page} · {f.type}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LabelledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs">
      <span className="text-ink-muted">{label}</span>
      <input
        type="text"
        className="mt-1 h-8 w-full rounded-md border border-line bg-canvas px-2 text-sm"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function LabelledTextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="text-ink-muted">{label}</span>
      <textarea
        className="mt-1 min-h-[70px] w-full rounded-md border border-line bg-canvas px-2 py-1 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function labelForType(t: AnamnesisFieldType): string {
  return {
    text: "Texto",
    textarea: "Texto longo",
    checkbox: "Caixa",
    signature: "Assinatura",
    date: "Data",
    select: "Seleção",
  }[t];
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
