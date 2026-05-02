"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  PenLine,
  Signature,
  Sparkles,
  ToggleLeft,
  Trash2,
  Type,
  Wand2,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { detectPdfFields } from "@/lib/anamnesis/detect-pdf-fields";
import { detectFieldFontSize } from "@/lib/anamnesis/detect-font-size";
import { loadPdfDocument } from "@/lib/anamnesis/pdfjs";
import {
  isSignatureFieldType,
  type AnamnesisField,
  type AnamnesisFieldType,
} from "@/lib/anamnesis/template-schema";
import { updateAnamnesisTemplate } from "@/lib/anamnesis/template-actions";
import { updateContractTemplateFields } from "@/lib/contracts/template-actions";
import { updateEvolutionTemplate } from "@/lib/evolutions/template-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PdfPageCanvas } from "./pdf-page-canvas";

type PageSize = { width: number; height: number };

export type TemplateEntityKind = "anamnesis" | "contract" | "evolution";

type Props = {
  templateId: string;
  templateName: string;
  pdfUrl: string;
  initialFields: AnamnesisField[];
  /** Define qual tabela/server action é alvo do "Salvar". */
  entityKind?: TemplateEntityKind;
};

type TypeMeta = {
  type: AnamnesisFieldType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultSize: { width: number; height: number };
};

const TYPE_META: TypeMeta[] = [
  {
    type: "text",
    label: "Texto curto",
    description: "Linha única — nome, CPF, e-mail, telefone…",
    icon: Type,
    defaultSize: { width: 0.28, height: 0.03 },
  },
  {
    type: "textarea",
    label: "Texto longo",
    description: "Várias linhas — relato, queixa, observações.",
    icon: AlignLeft,
    defaultSize: { width: 0.5, height: 0.1 },
  },
  {
    type: "checkbox",
    label: "Caixa de marcação",
    description: "Item único marcável — autorização, ciência etc.",
    icon: CheckSquare,
    defaultSize: { width: 0.04, height: 0.025 },
  },
  {
    type: "yesno",
    label: "Sim / Não",
    description:
      "Uma única marcação no template; no preenchimento o usuário escolhe Sim ou Não.",
    icon: ToggleLeft,
    defaultSize: { width: 0.16, height: 0.03 },
  },
  {
    type: "date",
    label: "Data",
    description: "Seletor de data.",
    icon: Calendar,
    defaultSize: { width: 0.18, height: 0.03 },
  },
  {
    type: "select",
    label: "Lista de opções",
    description: "Várias opções pré-definidas.",
    icon: ListChecks,
    defaultSize: { width: 0.24, height: 0.03 },
  },
  {
    type: "signature",
    label: "Assinatura",
    description: "Pad fullscreen para assinar com caneta/dedo.",
    icon: Signature,
    defaultSize: { width: 0.36, height: 0.06 },
  },
  {
    type: "initials",
    label: "Rubrica",
    description: "Pad menor para rubricar páginas.",
    icon: PenLine,
    defaultSize: { width: 0.1, height: 0.04 },
  },
];

const BIND_PRESETS: Array<{ label: string; bindPath: string }> = [
  { label: "Nome completo", bindPath: "client.full_name" },
  { label: "CPF", bindPath: "client.cpf" },
  { label: "Data de nascimento", bindPath: "client.birth_date" },
  { label: "Telefone", bindPath: "client.phone" },
  { label: "E-mail", bindPath: "client.email" },
  { label: "Endereço", bindPath: "client.address" },
];

export function TemplateFieldDesigner({
  templateId,
  templateName,
  pdfUrl,
  initialFields,
  entityKind = "anamnesis",
}: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({});
  const [fields, setFields] = useState<AnamnesisField[]>(initialFields);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<AnamnesisFieldType | null>(null);
  const [pending, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importingDetected, setImportingDetected] = useState(false);
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set([1]));
  const [activePage, setActivePage] = useState(1);
  const [slideDir, setSlideDir] = useState<"none" | "next" | "prev">("none");
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [viewerWidth, setViewerWidth] = useState(820);

  function gotoPage(target: number) {
    if (!pdf) return;
    const next = Math.max(1, Math.min(pdf.numPages, target));
    if (next === activePage) return;
    setSlideDir(next > activePage ? "next" : "prev");
    setActivePage(next);
  }

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
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 0.01) return a.y - b.y;
        return a.x - b.x;
      });
    }
    return map;
  }, [fields]);

  const countByType = useMemo(() => {
    const map: Partial<Record<AnamnesisFieldType, number>> = {};
    for (const f of fields) {
      map[f.type] = (map[f.type] ?? 0) + 1;
    }
    return map;
  }, [fields]);

  const hasSignature = (countByType.signature ?? 0) > 0;

  function handlePointerDownOnPage(
    page: number,
    e: React.PointerEvent<HTMLDivElement>,
  ) {
    if (!activeTool) return;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const startX = (e.clientX - rect.left) / rect.width;
    const startY = (e.clientY - rect.top) / rect.height;
    const meta = TYPE_META.find((t) => t.type === activeTool);
    const defaults = meta?.defaultSize ?? { width: 0.2, height: 0.04 };
    const id = `f_${Date.now().toString(36)}`;
    const newField: AnamnesisField = {
      id,
      label: meta?.label ?? labelForType(activeTool),
      type: activeTool,
      page,
      x: clamp01(startX),
      y: clamp01(startY),
      width: defaults.width,
      height: defaults.height,
    };
    setFields((prev) => [...prev, newField]);
    setSelectedId(id);

    let dragged = false;
    function onMove(ev: PointerEvent) {
      const cx = (ev.clientX - rect.left) / rect.width;
      const cy = (ev.clientY - rect.top) / rect.height;
      const w = cx - startX;
      const h = cy - startY;
      if (Math.abs(w) > 0.005 || Math.abs(h) > 0.005) dragged = true;
      if (!dragged) return;
      setFields((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                width: Math.max(0.02, Math.min(1, Math.abs(w))),
                height: Math.max(0.02, Math.min(1, Math.abs(h))),
                x: clamp01(w >= 0 ? startX : cx),
                y: clamp01(h >= 0 ? startY : cy),
              }
            : f,
        ),
      );
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setActiveTool(null);
      setExpandedPages((prev) => new Set(prev).add(page));
      // Detecção automática de tamanho de fonte baseado no texto adjacente.
      void autoDetectFontSizeForField(id);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  /** Detecta a fonte do PDF na região do campo e atualiza `fontSize`. */
  async function autoDetectFontSizeForField(fieldId: string) {
    if (!pdf) return;
    // Lê o campo do snapshot mais recente via flushSync-style: setFields no-op.
    let snapshot: AnamnesisField | null = null;
    setFields((prev) => {
      snapshot = prev.find((f) => f.id === fieldId) ?? null;
      return prev;
    });
    if (!snapshot) return;
    const f = snapshot as AnamnesisField;
    const detected = await detectFieldFontSize(pdf, {
      page: f.page,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
    });
    if (detected && detected > 0) {
      setFields((prev) =>
        prev.map((x) => (x.id === fieldId ? { ...x, fontSize: detected } : x)),
      );
    }
  }

  function updateField(id: string, patch: Partial<AnamnesisField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  }
  function duplicateField(id: string) {
    const f = fields.find((x) => x.id === id);
    if (!f) return;
    const copy: AnamnesisField = {
      ...f,
      id: `f_${Date.now().toString(36)}`,
      x: clamp01(f.x + 0.03),
      y: clamp01(f.y + 0.03),
    };
    setFields((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  }

  const handlePageLoaded = useCallback(
    (info: { pageNumber: number; width: number; height: number }) => {
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
    },
    [],
  );

  async function detectAndImport() {
    if (!pdf) return;
    setImportingDetected(true);
    setError(null);
    try {
      const detected = await detectPdfFields(pdf);
      if (detected.length === 0) {
        setInfo("Nenhum campo AcroForm detectado neste PDF.");
        return;
      }
      // Adiciona apenas campos que não conflitam com os existentes (mesmo id+page).
      const existing = new Set(fields.map((f) => `${f.page}:${f.id}`));
      const novos = detected.filter((f) => !existing.has(`${f.page}:${f.id}`));
      if (novos.length === 0) {
        setInfo("Todos os campos detectados já estão no template.");
        return;
      }
      setFields((prev) => [...prev, ...novos]);
      setInfo(`${novos.length} campo(s) detectado(s) e importado(s).`);
    } finally {
      setImportingDetected(false);
    }
  }

  async function save() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const pageCount = pdf?.numPages ?? 1;
      const result =
        entityKind === "contract"
          ? await updateContractTemplateFields({
              id: templateId,
              formSchema: fields,
              pageCount,
            })
          : entityKind === "evolution"
            ? await updateEvolutionTemplate({
                id: templateId,
                formSchema: fields,
                pageCount,
              })
            : await updateAnamnesisTemplate({
                id: templateId,
                formSchema: fields,
                pageCount,
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
      {/* Cabeçalho do designer */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-line">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
            Template
          </p>
          <p className="truncate text-sm font-semibold text-ink">{templateName}</p>
        </div>
        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-ink-muted">
          {fields.length} campo(s) · {pageNumbers.length} página(s)
        </span>
        {!hasSignature && fields.length > 0 ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            Sem campo de assinatura
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={detectAndImport}
            disabled={!pdf || importingDetected}
          >
            <Wand2 className="h-3.5 w-3.5" />
            {importingDetected ? "Detectando…" : "Detectar do PDF"}
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending ? "Salvando…" : "Salvar template"}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {info && !error ? <p className="text-sm text-brand">{info}</p> : null}

      {/* Paleta de tipos */}
      <div className="rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-line">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
            Adicionar campo
          </h3>
          {activeTool ? (
            <button
              type="button"
              onClick={() => setActiveTool(null)}
              className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand hover:bg-brand/20"
            >
              cancelar
            </button>
          ) : (
            <span className="text-[10px] text-ink-subtle">
              Clique em um tipo, depois clique no PDF.
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
          {TYPE_META.map((m) => {
            const Icon = m.icon;
            const active = activeTool === m.type;
            const count = countByType[m.type] ?? 0;
            return (
              <button
                key={m.type}
                type="button"
                onClick={() =>
                  setActiveTool((prev) => (prev === m.type ? null : m.type))
                }
                className={cn(
                  "group flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition",
                  active
                    ? "border-brand bg-brand/10 shadow-lift"
                    : "border-line bg-canvas hover:border-brand/40 hover:bg-brand/5",
                )}
                aria-pressed={active}
              >
                <span
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-md",
                    active ? "bg-brand text-white" : "bg-muted text-ink-muted",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-semibold text-ink">
                  {m.label}
                  {count > 0 ? (
                    <span className="ml-1 text-[10px] font-normal text-ink-subtle">
                      ({count})
                    </span>
                  ) : null}
                </span>
                <span className="text-[10px] leading-tight text-ink-muted">
                  {m.description}
                </span>
              </button>
            );
          })}
        </div>
        {activeTool ? (
          <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-1 text-[11px] font-medium text-brand">
            <Sparkles className="h-3 w-3" />
            Modo criar:{" "}
            {TYPE_META.find((t) => t.type === activeTool)?.label}. Clique no PDF
            para inserir.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* PDF area (carrossel) */}
        <div ref={viewerRef} className="min-w-0">
          {pdf ? (
            <DesignerPageCarousel
              pageCount={pageNumbers.length}
              activePage={activePage}
              slideDir={slideDir}
              onChangePage={(p) => gotoPage(p)}
              onSlideEnd={() => setSlideDir("none")}
              renderWidth={renderWidth}
              renderPage={(page) => {
                const size = pageSizes[page];
                const list = fieldsByPage.get(page) ?? [];
                return (
                  <div
                    className="mx-auto"
                    style={{ width: size?.width ?? renderWidth }}
                  >
                    <div className="mb-1 flex items-center justify-between text-[11px] text-ink-subtle">
                      <span>{list.length} campo(s) nesta página</span>
                    </div>
                    <div className="relative inline-block w-full">
                      <PdfPageCanvas
                        pdf={pdf}
                        pageNumber={page}
                        targetWidth={renderWidth}
                        onPageLoaded={handlePageLoaded}
                      />
                      {size ? (
                        <div
                          className="absolute inset-0"
                          style={{
                            cursor: activeTool ? "crosshair" : "default",
                          }}
                          onPointerDown={(e) =>
                            handlePointerDownOnPage(page, e)
                          }
                        >
                          {list.map((f) => (
                            <FieldRect
                              key={f.id}
                              field={f}
                              size={size}
                              selected={selectedId === f.id}
                              onSelect={() => setSelectedId(f.id)}
                              onMove={(patch) => updateField(f.id, patch)}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              }}
            />
          ) : (
            <div className="rounded-2xl bg-surface p-6 text-sm text-ink-muted ring-1 ring-line">
              Carregando PDF…
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-3">
          <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
              Campo selecionado
            </h3>
            {selected ? (
              <div className="mt-3 space-y-2 text-sm">
                <LabelledInput
                  label="Rótulo"
                  value={selected.label}
                  onChange={(v) => updateField(selected.id, { label: v })}
                />
                <div>
                  <label className="text-[10px] font-medium uppercase text-ink-subtle">
                    Tipo
                  </label>
                  <select
                    className="mt-1 h-8 w-full rounded-md border border-line bg-canvas px-2 text-sm"
                    value={selected.type}
                    onChange={(e) =>
                      updateField(selected.id, {
                        type: e.target.value as AnamnesisFieldType,
                      })
                    }
                  >
                    {TYPE_META.map((m) => (
                      <option key={m.type} value={m.type}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <LabelledInput
                  label="Placeholder"
                  value={selected.placeholder ?? ""}
                  onChange={(v) =>
                    updateField(selected.id, { placeholder: v || undefined })
                  }
                />

                <div>
                  <label className="text-[10px] font-medium uppercase text-ink-subtle">
                    Tamanho da fonte (pt)
                  </label>
                  <div className="mt-1 flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min={4}
                      max={72}
                      className="h-8 w-20 rounded-md border border-line bg-canvas px-2 text-sm"
                      value={
                        selected.fontSize !== undefined
                          ? selected.fontSize
                          : ""
                      }
                      placeholder="auto"
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        if (v === "") {
                          updateField(selected.id, { fontSize: undefined });
                          return;
                        }
                        const n = Number.parseFloat(v.replace(",", "."));
                        if (Number.isFinite(n) && n > 0) {
                          updateField(selected.id, { fontSize: n });
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => autoDetectFontSizeForField(selected.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-md bg-brand/10 px-2 text-[11px] font-medium text-brand hover:bg-brand/20"
                      title="Detectar pela fonte do PDF nesta região"
                    >
                      <Wand2 className="h-3 w-3" /> Auto
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-ink-subtle">
                    Casa o tamanho da fonte do texto preenchido com a fonte
                    do PDF original. Deixe vazio para auto-derivar pela altura.
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-medium uppercase text-ink-subtle">
                    Vincular ao cadastro (opcional)
                  </label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {BIND_PRESETS.map((p) => (
                      <button
                        key={p.bindPath}
                        type="button"
                        onClick={() =>
                          updateField(selected.id, {
                            bindPath:
                              selected.bindPath === p.bindPath
                                ? undefined
                                : p.bindPath,
                          })
                        }
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium transition",
                          selected.bindPath === p.bindPath
                            ? "bg-brand text-white"
                            : "bg-muted text-ink-muted hover:bg-brand/10 hover:text-brand",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {selected.bindPath ? (
                    <p className="mt-1 text-[10px] text-ink-subtle">
                      Será preenchido automaticamente com{" "}
                      <code className="rounded bg-muted px-1">
                        {selected.bindPath}
                      </code>
                      .
                    </p>
                  ) : null}
                </div>

                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!!selected.required}
                    onChange={(e) =>
                      updateField(selected.id, { required: e.target.checked })
                    }
                  />
                  Obrigatório
                </label>

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

                {isSignatureFieldType(selected.type) ? (
                  <p className="rounded-md bg-brand/5 px-2 py-1.5 text-[10px] text-ink-muted">
                    Este campo abrirá um pad fullscreen no preenchimento — sem
                    digitação.
                  </p>
                ) : null}

                <div className="flex gap-1.5 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => duplicateField(selected.id)}
                  >
                    Duplicar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => removeField(selected.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-muted">
                Selecione um tipo na paleta acima e clique no PDF para criar.
                Depois clique no campo desenhado para editar suas propriedades
                aqui.
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
              Campos por página
            </h3>
            <div className="mt-2 space-y-2 text-xs">
              {pageNumbers.map((p) => {
                const list = fieldsByPage.get(p) ?? [];
                if (list.length === 0) return null;
                const expanded = expandedPages.has(p);
                return (
                  <div
                    key={p}
                    className="rounded-lg bg-canvas ring-1 ring-line/70"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPages((prev) => {
                          const next = new Set(prev);
                          if (next.has(p)) next.delete(p);
                          else next.add(p);
                          return next;
                        })
                      }
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-left"
                    >
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-ink-muted" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-ink-muted" />
                      )}
                      <span className="font-medium text-ink">Página {p}</span>
                      <span className="ml-auto text-[10px] text-ink-subtle">
                        {list.length}
                      </span>
                    </button>
                    {expanded ? (
                      <ul className="space-y-0.5 border-t border-line/70 px-2 py-1.5">
                        {list.map((f) => (
                          <li key={f.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(f.id);
                                gotoPage(f.page);
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 rounded px-1.5 py-1 text-left",
                                selectedId === f.id
                                  ? "bg-brand/10 text-ink"
                                  : "text-ink-muted hover:bg-brand/5 hover:text-ink",
                              )}
                            >
                              <TypeBadge type={f.type} />
                              <span className="min-w-0 flex-1 truncate">
                                {f.label}
                              </span>
                              {f.required ? (
                                <span className="text-[9px] text-danger">
                                  *
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
              {fields.length === 0 ? (
                <p className="text-[11px] text-ink-muted">
                  Sem campos ainda. Use a paleta acima.
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function DesignerPageCarousel({
  pageCount,
  activePage,
  slideDir,
  onChangePage,
  onSlideEnd,
  renderWidth,
  renderPage,
}: {
  pageCount: number;
  activePage: number;
  slideDir: "none" | "next" | "prev";
  onChangePage: (p: number) => void;
  onSlideEnd: () => void;
  renderWidth: number;
  renderPage: (pNum: number) => React.ReactNode;
}) {
  const slideClass =
    slideDir === "next"
      ? "animate-slide-in-right"
      : slideDir === "prev"
        ? "animate-slide-in-left"
        : "";

  const canPrev = activePage > 1;
  const canNext = activePage < pageCount;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 rounded-xl bg-canvas/60 px-2 py-1.5 ring-1 ring-line/70">
        <button
          type="button"
          onClick={() => onChangePage(activePage - 1)}
          disabled={!canPrev}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium transition",
            canPrev
              ? "text-ink-muted hover:bg-brand/10 hover:text-brand"
              : "cursor-not-allowed text-ink-subtle/60",
          )}
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>

        <div className="flex items-center gap-1.5 overflow-x-auto px-1">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChangePage(p)}
              className={cn(
                "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-medium transition",
                p === activePage
                  ? "bg-brand text-white shadow-sm"
                  : "text-ink-muted hover:bg-brand/10 hover:text-brand",
              )}
              aria-current={p === activePage ? "page" : undefined}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onChangePage(activePage + 1)}
          disabled={!canNext}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium transition",
            canNext
              ? "text-ink-muted hover:bg-brand/10 hover:text-brand"
              : "cursor-not-allowed text-ink-subtle/60",
          )}
        >
          Próxima <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="relative overflow-hidden">
        <div
          key={activePage}
          className={cn("flex justify-center will-change-transform", slideClass)}
          onAnimationEnd={() => onSlideEnd()}
          style={{ minWidth: renderWidth }}
        >
          {renderPage(activePage)}
        </div>
      </div>

      <p className="text-center text-[11px] text-ink-subtle">
        Página {activePage} de {pageCount}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function FieldRect({
  field,
  size,
  selected,
  onSelect,
  onMove,
}: {
  field: AnamnesisField;
  size: PageSize;
  selected: boolean;
  onSelect: () => void;
  onMove: (patch: Partial<AnamnesisField>) => void;
}) {
  function handleDragMove(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    onSelect();
    const startEvtX = e.clientX;
    const startEvtY = e.clientY;
    const startX = field.x;
    const startY = field.y;

    function onMoveEv(ev: PointerEvent) {
      const dxPx = ev.clientX - startEvtX;
      const dyPx = ev.clientY - startEvtY;
      const dx = dxPx / size.width;
      const dy = dyPx / size.height;
      onMove({
        x: clamp01(startX + dx),
        y: clamp01(startY + dy),
      });
    }
    function onUpEv() {
      window.removeEventListener("pointermove", onMoveEv);
      window.removeEventListener("pointerup", onUpEv);
    }
    window.addEventListener("pointermove", onMoveEv);
    window.addEventListener("pointerup", onUpEv);
  }

  function handleResize(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    const startEvtX = e.clientX;
    const startEvtY = e.clientY;
    const startW = field.width;
    const startH = field.height;
    function onMoveEv(ev: PointerEvent) {
      const dxPx = ev.clientX - startEvtX;
      const dyPx = ev.clientY - startEvtY;
      const dw = dxPx / size.width;
      const dh = dyPx / size.height;
      onMove({
        width: Math.max(0.02, Math.min(1, startW + dw)),
        height: Math.max(0.02, Math.min(1, startH + dh)),
      });
    }
    function onUpEv() {
      window.removeEventListener("pointermove", onMoveEv);
      window.removeEventListener("pointerup", onUpEv);
    }
    window.addEventListener("pointermove", onMoveEv);
    window.addEventListener("pointerup", onUpEv);
  }

  return (
    <div
      onPointerDown={handleDragMove}
      style={{
        position: "absolute",
        left: field.x * size.width,
        top: field.y * size.height,
        width: field.width * size.width,
        height: field.height * size.height,
      }}
      className={cn(
        "cursor-move rounded-sm border bg-brand/10",
        selected ? "border-brand shadow-lift" : "border-brand/40",
      )}
    >
      <span className="pointer-events-none absolute -top-4 left-0 inline-flex items-center gap-1 whitespace-nowrap rounded bg-brand px-1 text-[10px] text-white">
        <TypeBadgeInline type={field.type} /> {field.label}
      </span>
      {selected ? (
        <div
          onPointerDown={handleResize}
          className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-sm bg-brand ring-2 ring-white"
          aria-label="Redimensionar"
        />
      ) : null}
    </div>
  );
}

function TypeBadge({ type }: { type: AnamnesisFieldType }) {
  const meta = TYPE_META.find((t) => t.type === type);
  const Icon = meta?.icon ?? Type;
  return (
    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted text-ink-muted">
      <Icon className="h-3 w-3" />
    </span>
  );
}

function TypeBadgeInline({ type }: { type: AnamnesisFieldType }) {
  const meta = TYPE_META.find((t) => t.type === type);
  const Icon = meta?.icon ?? Type;
  return <Icon className="h-3 w-3" />;
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
    <label className="block">
      <span className="text-[10px] font-medium uppercase text-ink-subtle">
        {label}
      </span>
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
    <label className="block">
      <span className="text-[10px] font-medium uppercase text-ink-subtle">
        {label}
      </span>
      <textarea
        className="mt-1 min-h-[70px] w-full rounded-md border border-line bg-canvas px-2 py-1 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function labelForType(t: AnamnesisFieldType): string {
  return TYPE_META.find((m) => m.type === t)?.label ?? t;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
