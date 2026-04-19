"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdfDocument } from "@/lib/anamnesis/pdfjs";
import {
  saveAnamnesisSubmission,
  submitAnamnesis,
} from "@/lib/anamnesis/submission-actions";
import type {
  AnamnesisField,
  AnamnesisFormValues,
} from "@/lib/anamnesis/template-schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PdfPageCanvas } from "./pdf-page-canvas";

type PageSize = { width: number; height: number };

function pdfBaseKey(url: string | null | undefined): string | null {
  if (!url) return null;
  const q = url.indexOf("?");
  return q >= 0 ? url.slice(0, q) : url;
}

type Props = {
  clientId: string;
  submissionId?: string;
  templateId?: string | null;
  templatePdfUrl: string | null;
  formSchema: AnamnesisField[];
  initialFormValues: AnamnesisFormValues;
  initialSignerName?: string | null;
  initialStatus: "draft" | "submitted" | "signed";
  /** Indicador de que a submissão já tem anotações de caneta (modo interativo). */
  hasInkAnnotations?: boolean;
};

export function DesktopAnamnesisEditor({
  clientId,
  submissionId,
  templateId,
  templatePdfUrl,
  formSchema,
  initialFormValues,
  initialSignerName,
  initialStatus,
  hasInkAnnotations,
}: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({});
  const [activePage, setActivePage] = useState(1);
  const [formValues, setFormValues] = useState<AnamnesisFormValues>(initialFormValues);
  const [signerName, setSignerName] = useState<string>(initialSignerName ?? "");
  const [status, setStatus] = useState(initialStatus);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | undefined>(
    submissionId,
  );
  const [detectedFields, setDetectedFields] = useState<AnamnesisField[]>([]);
  const [detectingFields, setDetectingFields] = useState(false);
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set([1]));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [viewerWidth, setViewerWidth] = useState(820);

  const canInteract = status === "draft";

  // Só recarrega o PDF quando o path base muda. Signed URLs regeneradas com
  // o mesmo arquivo (token novo após revalidate) não causam reload.
  const loadedPdfBaseRef = useRef<string | null>(null);
  useEffect(() => {
    if (!templatePdfUrl) {
      setPdf(null);
      loadedPdfBaseRef.current = null;
      return;
    }
    const base = pdfBaseKey(templatePdfUrl);
    if (loadedPdfBaseRef.current === base) return;
    loadedPdfBaseRef.current = base;

    let cancelled = false;
    loadPdfDocument(templatePdfUrl)
      .then((p) => {
        if (!cancelled) setPdf(p);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError("Não foi possível carregar o PDF do template.");
      });
    return () => {
      cancelled = true;
    };
  }, [templatePdfUrl]);

  useEffect(() => {
    const target = viewerRef.current;
    if (!target || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const next = Math.max(320, Math.floor(target.getBoundingClientRect().width));
      setViewerWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    };
    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf) return;
    if (formSchema.length > 0) return; // Só detecta automaticamente quando não há schema manual.
    let cancelled = false;
    setDetectingFields(true);
    detectPdfFields(pdf)
      .then((fields) => {
        if (!cancelled) setDetectedFields(fields);
      })
      .catch((err) => console.error("Falha ao detectar campos", err))
      .finally(() => {
        if (!cancelled) setDetectingFields(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pdf, formSchema.length]);

  const effectiveFields = useMemo(
    () => (formSchema.length > 0 ? formSchema : detectedFields),
    [detectedFields, formSchema],
  );

  const fieldsByPage = useMemo(() => {
    const map = new Map<number, AnamnesisField[]>();
    for (const f of effectiveFields) {
      const arr = map.get(f.page) ?? [];
      arr.push(f);
      map.set(f.page, arr);
    }
    return map;
  }, [effectiveFields]);

  const pageCount = pdf?.numPages ?? 1;
  const filledCountByPage = useMemo(() => {
    const map: Record<number, { filled: number; total: number }> = {};
    for (const [pageNum, fields] of fieldsByPage.entries()) {
      const total = fields.length;
      let filled = 0;
      for (const f of fields) {
        const v = formValues[f.id];
        if (v !== undefined && v !== null && v !== "" && v !== false) filled += 1;
      }
      map[pageNum] = { filled, total };
    }
    return map;
  }, [fieldsByPage, formValues]);

  const handleFieldChange = useCallback(
    (field: AnamnesisField, value: string | boolean) => {
      setFormValues((prev) => ({ ...prev, [field.id]: value }));
    },
    [],
  );

  const handlePageLoaded = useCallback(
    ({ pageNumber, width, height }: { pageNumber: number; width: number; height: number }) => {
      setPageSizes((prev) => ({ ...prev, [pageNumber]: { width, height } }));
    },
    [],
  );

  const goToPage = useCallback(
    (p: number) => {
      const next = Math.max(1, Math.min(pageCount, p));
      setActivePage(next);
      setExpandedPages((prev) => new Set(prev).add(next));
    },
    [pageCount],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPage(activePage - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToPage(activePage + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activePage, goToPage]);

  async function doSave(opts?: { silent?: boolean }) {
    setError(null);
    if (!opts?.silent) setInfo(null);
    const result = await saveAnamnesisSubmission(clientId, {
      submissionId: currentSubmissionId,
      templateId: templateId ?? undefined,
      mode: "desktop",
      formValues,
      signerName: signerName || undefined,
      status: "draft",
    });
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    setCurrentSubmissionId(result.id);
    if (!opts?.silent) setInfo("Rascunho salvo.");
    return result.id;
  }

  function onSaveClick() {
    startTransition(async () => {
      await doSave();
    });
  }

  function onSubmitClick() {
    startTransition(async () => {
      const id = currentSubmissionId ?? (await doSave({ silent: true }));
      if (!id) return;
      const result = await submitAnamnesis(clientId, id, {
        signerName: signerName || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStatus(signerName ? "signed" : "submitted");
      setInfo("Anamnese finalizada e PDF gerado.");
    });
  }

  const activeFields = fieldsByPage.get(activePage) ?? [];
  const activeSize = pageSizes[activePage];
  const renderWidth = Math.max(320, Math.min(820, viewerWidth));
  const pageProgress = filledCountByPage[activePage];

  return (
    <div className="space-y-4">
      {/* Barra de controles */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-line">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => goToPage(activePage - 1)}
          disabled={activePage <= 1}
        >
          ← Página anterior
        </Button>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span>
            Página <span className="font-semibold text-ink">{activePage}</span> de {pageCount}
          </span>
          {pageProgress && pageProgress.total > 0 ? (
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
              {pageProgress.filled}/{pageProgress.total} preenchidos
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => goToPage(activePage + 1)}
          disabled={activePage >= pageCount}
        >
          Próxima página →
        </Button>

        {hasInkAnnotations ? (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            Esta submissão já tem anotações a caneta (modo interativo)
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {canInteract ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onSaveClick}
                disabled={pending}
              >
                {pending ? "Salvando…" : "Salvar rascunho"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onSubmitClick}
                disabled={pending}
              >
                Finalizar e gerar PDF
              </Button>
            </>
          ) : (
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-ink-muted">
              {status === "signed" ? "Assinada" : "Finalizada"}
            </span>
          )}
        </div>
      </div>

      {canInteract ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-line sm:flex-row sm:items-center">
          <label className="text-xs text-ink-muted" htmlFor="signer_name">
            Assinatura da paciente (nome completo)
          </label>
          <input
            id="signer_name"
            type="text"
            className="flex-1 rounded-md border border-line bg-canvas px-3 py-1.5 text-sm"
            placeholder="Preencha para registrar a assinatura"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {info && !error ? (
        <p role="status" className="text-sm text-brand">
          {info}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div ref={viewerRef} className="min-w-0 space-y-2">
          {!pdf && templatePdfUrl ? (
            <div className="rounded-2xl bg-surface p-6 text-sm text-ink-muted ring-1 ring-line">
              Carregando PDF do template…
            </div>
          ) : null}
          {!templatePdfUrl ? (
            <div className="rounded-2xl bg-surface p-6 text-sm text-ink-muted ring-1 ring-line">
              Nenhum template vinculado. Selecione um template para continuar.
            </div>
          ) : null}

          {pdf ? (
            <div
              className="relative inline-block"
              style={{ width: activeSize?.width ?? renderWidth }}
            >
              <PdfPageCanvas
                pdf={pdf}
                pageNumber={activePage}
                targetWidth={renderWidth}
                onPageLoaded={handlePageLoaded}
              />
              {activeSize ? (
                <FieldOverlay
                  fields={activeFields}
                  size={activeSize}
                  formValues={formValues}
                  onChange={handleFieldChange}
                  disabled={!canInteract}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Campos do formulário</h3>
              <span className="text-[10px] text-ink-muted">
                {effectiveFields.length} campo(s) · {pageCount} página(s)
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Clique em uma página para expandir os campos. Os campos também
              aparecem como inputs sobre o PDF à esquerda.
            </p>
            {detectingFields && formSchema.length === 0 ? (
              <p className="mt-2 text-xs text-ink-muted">
                Detectando campos do PDF automaticamente…
              </p>
            ) : null}

            <div className="mt-3 space-y-2">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => {
                const fields = fieldsByPage.get(p) ?? [];
                const progress = filledCountByPage[p];
                const expanded = expandedPages.has(p);
                return (
                  <PageAccordion
                    key={p}
                    pageNumber={p}
                    fields={fields}
                    filled={progress?.filled ?? 0}
                    total={progress?.total ?? 0}
                    active={activePage === p}
                    expanded={expanded}
                    onToggle={() => {
                      setExpandedPages((prev) => {
                        const next = new Set(prev);
                        if (next.has(p)) next.delete(p);
                        else next.add(p);
                        return next;
                      });
                    }}
                    onFocusPage={() => goToPage(p)}
                    formValues={formValues}
                    onChange={handleFieldChange}
                    disabled={!canInteract}
                  />
                );
              })}
              {effectiveFields.length === 0 && !detectingFields ? (
                <p className="text-xs text-ink-muted">
                  Este template não expõe campos detectáveis. Você pode finalizar
                  sem preencher, ou abrir em modo interativo para assinar.
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PageAccordion({
  pageNumber,
  fields,
  filled,
  total,
  active,
  expanded,
  onToggle,
  onFocusPage,
  formValues,
  onChange,
  disabled,
}: {
  pageNumber: number;
  fields: AnamnesisField[];
  filled: number;
  total: number;
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
  onFocusPage: () => void;
  formValues: AnamnesisFormValues;
  onChange: (f: AnamnesisField, v: string | boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-canvas ring-1 transition",
        active ? "ring-brand/50" : "ring-line/70",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5",
          active && "bg-brand/5",
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:bg-brand/10 hover:text-brand"
          aria-label={expanded ? "Recolher" : "Expandir"}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={onFocusPage}
          className="flex-1 text-left text-xs font-medium text-ink"
        >
          Página {pageNumber}
        </button>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-ink-muted">
          {filled}/{total}
        </span>
      </div>
      {expanded ? (
        <div className="space-y-3 border-t border-line/70 px-3 py-3">
          {fields.length === 0 ? (
            <p className="text-[11px] text-ink-muted">Sem campos nesta página.</p>
          ) : (
            fields.map((f) => (
              <DesktopFieldInput
                key={f.id}
                field={f}
                value={formValues[f.id]}
                onChange={(v) => onChange(f, v)}
                disabled={disabled}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function DesktopFieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: AnamnesisField;
  value: unknown;
  onChange: (v: string | boolean) => void;
  disabled?: boolean;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={!!value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{field.label}</span>
      </label>
    );
  }
  if (field.type === "textarea") {
    return (
      <div className="space-y-1">
        <label className="text-xs text-ink-muted">{field.label}</label>
        <textarea
          className="min-h-[70px] w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-sm"
          value={value == null ? "" : String(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <div className="space-y-1">
        <label className="text-xs text-ink-muted">{field.label}</label>
        <select
          className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm"
          value={value == null ? "" : String(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecionar</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <label className="text-xs text-ink-muted">{field.label}</label>
      <input
        type={field.type === "date" ? "date" : "text"}
        className="h-9 w-full rounded-md border border-line bg-canvas px-3 text-sm"
        value={value == null ? "" : String(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function FieldOverlay({
  fields,
  size,
  formValues,
  onChange,
  disabled,
}: {
  fields: AnamnesisField[];
  size: PageSize;
  formValues: AnamnesisFormValues;
  onChange: (field: AnamnesisField, value: string | boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {fields.map((f) => {
        const style: React.CSSProperties = {
          left: f.x * size.width,
          top: f.y * size.height,
          width: f.width * size.width,
          height: f.height * size.height,
        };
        const common =
          "pointer-events-auto absolute rounded border border-brand/40 bg-white/90 text-xs shadow-sm";
        if (f.type === "checkbox") {
          return (
            <label key={f.id} style={style} className={`${common} flex items-center gap-1 px-1`}>
              <input
                type="checkbox"
                checked={!!formValues[f.id]}
                disabled={disabled}
                onChange={(e) => onChange(f, e.target.checked)}
              />
              <span className="truncate">{f.label}</span>
            </label>
          );
        }
        if (f.type === "textarea") {
          return (
            <textarea
              key={f.id}
              style={style}
              className={`${common} resize-none px-1 py-0.5`}
              value={formValues[f.id] == null ? "" : String(formValues[f.id])}
              disabled={disabled}
              placeholder={f.placeholder}
              onChange={(e) => onChange(f, e.target.value)}
            />
          );
        }
        if (f.type === "select") {
          return (
            <select
              key={f.id}
              style={style}
              className={`${common} px-1`}
              value={formValues[f.id] == null ? "" : String(formValues[f.id])}
              disabled={disabled}
              onChange={(e) => onChange(f, e.target.value)}
            >
              <option value="">{f.placeholder ?? "—"}</option>
              {(f.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          );
        }
        return (
          <input
            key={f.id}
            style={style}
            type={f.type === "date" ? "date" : "text"}
            className={`${common} px-1`}
            value={formValues[f.id] == null ? "" : String(formValues[f.id])}
            disabled={disabled}
            placeholder={f.placeholder ?? f.label}
            onChange={(e) => onChange(f, e.target.value)}
          />
        );
      })}
    </div>
  );
}

async function detectPdfFields(pdf: PDFDocumentProxy): Promise<AnamnesisField[]> {
  const fields: AnamnesisField[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const annotations = await page.getAnnotations();

    for (const annotation of annotations as Array<Record<string, unknown>>) {
      if (annotation.subtype !== "Widget") continue;
      const fieldType = String(annotation.fieldType ?? "");
      const rawName = String(annotation.fieldName ?? annotation.alternativeText ?? "");
      const rect = Array.isArray(annotation.rect)
        ? (annotation.rect as number[])
        : null;
      if (!rawName || !rect || rect.length !== 4) continue;

      const [vx1, vy1, vx2, vy2] = viewport.convertToViewportRectangle(rect);
      const left = clamp01(Math.min(vx1, vx2) / viewport.width);
      const top = clamp01(Math.min(vy1, vy2) / viewport.height);
      const width = clampRange(Math.abs(vx2 - vx1) / viewport.width, 0.02, 1);
      const height = clampRange(Math.abs(vy2 - vy1) / viewport.height, 0.02, 1);

      fields.push({
        id: rawName,
        label: prettifyFieldName(rawName),
        type: mapPdfFieldType(fieldType),
        page: pageNumber,
        x: left,
        y: top,
        width,
        height,
        placeholder: prettifyFieldName(rawName),
      });
    }
  }

  const dedup = new Map<string, AnamnesisField>();
  for (const f of fields) {
    const key = `${f.page}:${f.id}`;
    if (!dedup.has(key)) dedup.set(key, f);
  }
  return Array.from(dedup.values());
}

function mapPdfFieldType(pdfType: string): AnamnesisField["type"] {
  if (pdfType === "Btn") return "checkbox";
  if (pdfType === "Ch") return "select";
  return "text";
}

function prettifyFieldName(value: string): string {
  return value.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function clampRange(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
