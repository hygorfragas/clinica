"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdfDocument } from "@/lib/anamnesis/pdfjs";
import {
  saveAnamnesisSubmission,
  submitAnamnesis,
} from "@/lib/anamnesis/submission-actions";
import {
  saveContractSubmission,
  submitContract,
} from "@/lib/contracts/submission-actions";
import {
  saveEvolutionSubmission,
  submitEvolution,
} from "@/lib/evolutions/submission-actions";
import type { AnamnesisStroke } from "@/lib/anamnesis/template-schema";
import { cn } from "@/lib/utils";
import { PdfPageCanvas } from "./pdf-page-canvas";
import {
  InteractiveToolbar,
  type InteractiveTool,
} from "./interactive-toolbar";
import { PageThumbnails } from "./page-thumbnails";

const InkLayer = dynamic(() => import("./ink-layer").then((m) => m.InkLayer), {
  ssr: false,
});

const FINGER_PREF_KEY = "anamnesis:allowNonPen";

/**
 * Extrai um identificador estável de um signed URL (ignora query string).
 * Usado para evitar recarregar o PDF quando o servidor regera a URL com
 * um token novo mas o arquivo é o mesmo.
 */
function pdfBaseKey(url: string | null | undefined): string | null {
  if (!url) return null;
  const q = url.indexOf("?");
  return q >= 0 ? url.slice(0, q) : url;
}

type PageSize = { width: number; height: number };

type Props = {
  clientId: string;
  submissionId: string;
  templateId?: string | null;
  templatePdfUrl: string | null;
  initialStrokes: AnamnesisStroke[];
  initialSignerName?: string | null;
  initialStatus: "draft" | "submitted" | "signed";
  patientLabel?: string;
  templateLabel?: string;
  /** Define qual tabela de submissions é gravada. */
  entityKind?: "anamnesis" | "evolution" | "contract";
  /**
   * Recebe um flush síncrono que o pai pode chamar antes de desmontar o
   * editor — garante persistência da última edição não-debouncada.
   */
  registerFlush?: (flush: (() => Promise<void>) | null) => void;
  /** Slot opcional renderizado em um drawer lateral (fotos de evolução). */
  extraSidePanel?: {
    label: string;
    content: React.ReactNode;
  } | null;
};

export function InteractiveAnamnesisEditor({
  clientId,
  submissionId,
  templateId,
  templatePdfUrl,
  initialStrokes,
  initialSignerName,
  initialStatus,
  patientLabel,
  templateLabel,
  entityKind = "anamnesis",
  registerFlush,
  extraSidePanel,
}: Props) {
  const router = useRouter();
  const saveAction =
    entityKind === "evolution"
      ? saveEvolutionSubmission
      : entityKind === "contract"
        ? saveContractSubmission
        : saveAnamnesisSubmission;
  const submitAction =
    entityKind === "evolution"
      ? submitEvolution
      : entityKind === "contract"
        ? submitContract
        : submitAnamnesis;
  const backHref =
    entityKind === "evolution"
      ? `/pacientes/${clientId}/evolucao`
      : entityKind === "contract"
        ? `/pacientes/${clientId}/contratos`
        : `/pacientes/${clientId}/anamnese`;

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({});
  const [activePage, setActivePage] = useState(1);

  const [strokes, setStrokes] = useState<AnamnesisStroke[]>(initialStrokes);
  const [undoStack, setUndoStack] = useState<AnamnesisStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<AnamnesisStroke[][]>([]);

  const [tool, setTool] = useState<InteractiveTool>("pen");
  const [color, setColor] = useState("#0f172a");
  const [penSize, setPenSize] = useState(1.6);
  const [highlighterSize, setHighlighterSize] = useState(14);
  const [allowNonPen, setAllowNonPen] = useState(false);
  // Em mobile (<md) começa colapsada para liberar espaço pro PDF. No client,
  // se for tela md+ abrimos automaticamente. O usuário pode alternar a qualquer momento.
  const [thumbsCollapsed, setThumbsCollapsed] = useState(true);

  const [signerName, setSignerName] = useState<string>(initialSignerName ?? "");
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [finalizing, setFinalizing] = useState(false);

  const canInteract = status === "draft";
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [viewerWidth, setViewerWidth] = useState(820);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef(false);
  const dirtyRef = useRef(false);
  const [extraOpen, setExtraOpen] = useState(false);

  // Preferência "permitir dedo/mouse" em localStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(FINGER_PREF_KEY);
      if (raw === "1") setAllowNonPen(true);
    } catch {
      // ignorado
    }
  }, []);

  // Em telas md+ abre o painel de miniaturas por padrão (SSR começa colapsado
  // pra não estourar a largura em mobile).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      setThumbsCollapsed(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(FINGER_PREF_KEY, allowNonPen ? "1" : "0");
    } catch {
      // ignorado
    }
  }, [allowNonPen]);

  // Carrega PDF apenas quando o path base do arquivo muda. Signed URLs
  // regeneradas pelo servidor com o mesmo path não devem disparar reload
  // (evita o PDF "piscando" a cada autosave).
  //
  // `pdfLoadedRef` guarda se o PDF já chegou ao state. Sem essa segunda
  // guarda, um re-render do server (revalidatePath / router.refresh) durante
  // o load inicial cancela a Promise anterior e o useEffect seguinte decide
  // "mesma base, já carreguei" — mas nada chegou a setPdf e o documento
  // nunca aparece. Esse era o sintoma da regressão na 1ª abertura.
  const loadedPdfBaseRef = useRef<string | null>(null);
  const pdfLoadedRef = useRef(false);
  useEffect(() => {
    if (!templatePdfUrl) {
      setPdf(null);
      loadedPdfBaseRef.current = null;
      pdfLoadedRef.current = false;
      return;
    }
    const base = pdfBaseKey(templatePdfUrl);
    if (loadedPdfBaseRef.current === base && pdfLoadedRef.current) return;
    loadedPdfBaseRef.current = base;

    let cancelled = false;
    loadPdfDocument(templatePdfUrl)
      .then((p) => {
        if (!cancelled) {
          setPdf(p);
          pdfLoadedRef.current = true;
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError("Não foi possível carregar o PDF.");
      });
    return () => {
      cancelled = true;
    };
  }, [templatePdfUrl]);

  // Observa tamanho do viewer.
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

  // Atalhos: setas para navegar páginas, Ctrl/Cmd+Z undo, shift+Z redo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActivePage((p) => Math.max(1, p - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActivePage((p) => Math.min(pdf?.numPages ?? 1, p + 1));
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf?.numPages]);

  const handlePageLoaded = useCallback(
    ({ pageNumber, width, height }: { pageNumber: number; width: number; height: number }) => {
      setPageSizes((prev) => ({ ...prev, [pageNumber]: { width, height } }));
    },
    [],
  );

  const pushHistory = useCallback((snapshot: AnamnesisStroke[]) => {
    setUndoStack((prev) => [...prev, snapshot].slice(-50));
    setRedoStack([]);
  }, []);

  const handleStrokeCommit = useCallback(
    (stroke: AnamnesisStroke) => {
      setStrokes((prev) => {
        pushHistory(prev);
        return [...prev, stroke];
      });
      dirtyRef.current = true;
      scheduleAutosave();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pushHistory],
  );

  const handleEraseStroke = useCallback(
    (index: number) => {
      setStrokes((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        pushHistory(prev);
        return prev.filter((_, i) => i !== index);
      });
      dirtyRef.current = true;
      scheduleAutosave();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pushHistory],
  );

  const handleUndo = useCallback(() => {
    setUndoStack((u) => {
      if (u.length === 0) return u;
      const last = u[u.length - 1];
      setStrokes((prev) => {
        setRedoStack((r) => [...r, prev].slice(-50));
        return last;
      });
      dirtyRef.current = true;
      scheduleAutosave();
      return u.slice(0, -1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const next = r[r.length - 1];
      setStrokes((prev) => {
        setUndoStack((u) => [...u, prev].slice(-50));
        return next;
      });
      dirtyRef.current = true;
      scheduleAutosave();
      return r.slice(0, -1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClearPage = useCallback(() => {
    if (!confirm(`Apagar todas as anotações da página ${activePage}?`)) return;
    setStrokes((prev) => {
      pushHistory(prev);
      return prev.filter((s) => s.page !== activePage);
    });
    scheduleAutosave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, pushHistory]);

  const handleClearAll = useCallback(() => {
    if (!confirm("Apagar todas as anotações de todas as páginas?")) return;
    setStrokes((prev) => {
      pushHistory(prev);
      return [];
    });
    scheduleAutosave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushHistory]);

  const scheduleAutosave = useCallback(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void doSave({ silent: true });
    }, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flushSave = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (!dirtyRef.current) return;
    await doSave({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!registerFlush) return;
    registerFlush(flushSave);
    return () => registerFlush(null);
  }, [registerFlush, flushSave]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHide = () => {
      if (dirtyRef.current) void flushSave();
    };
    const onVis = () => {
      if (document.visibilityState === "hidden" && dirtyRef.current) {
        void flushSave();
      }
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [flushSave]);

  async function doSave(opts?: { silent?: boolean }) {
    if (!canInteract) return null;
    if (pendingSaveRef.current) return null;
    pendingSaveRef.current = true;
    try {
      setError(null);
      if (!opts?.silent) setInfo(null);
      const result = await saveAction(clientId, {
        submissionId,
        templateId: templateId ?? undefined,
        mode: "interactive",
        inkStrokes: strokes,
        signerName: signerName || undefined,
        status: "draft",
        // Autosave silencioso não revalida a rota — assim o Next não força
        // um refresh do server component, que regeraria signed URLs do PDF
        // e faria o documento parecer "piscar" a cada traço.
        silent: opts?.silent,
      });
      if (!result.ok) {
        setError(result.error);
        return null;
      }
      dirtyRef.current = false;
      if (!opts?.silent) setInfo("Rascunho salvo.");
      return result.id;
    } finally {
      pendingSaveRef.current = false;
    }
  }

  function onSaveClick() {
    startTransition(async () => {
      await doSave();
    });
  }

  function onFinalize() {
    startTransition(async () => {
      setFinalizing(true);
      try {
        await doSave({ silent: true });
        const result = await submitAction(clientId, submissionId, {
          signerName: signerName || null,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setStatus(signerName ? "signed" : "submitted");
        setInfo("Anamnese finalizada e PDF gerado.");
        setTimeout(() => {
          router.push(backHref);
          router.refresh();
        }, 600);
      } finally {
        setFinalizing(false);
      }
    });
  }

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  const pageCount = pdf?.numPages ?? 1;
  const activeSize = pageSizes[activePage];
  const renderWidth = Math.min(1100, viewerWidth);
  const currentSize = tool === "highlighter" ? highlighterSize : penSize;
  const strokeCountByPage = useMemo(() => {
    const map: Record<number, number> = {};
    for (const s of strokes) {
      map[s.page] = (map[s.page] ?? 0) + 1;
    }
    return map;
  }, [strokes]);

  return (
    <div className="flex h-dvh w-full flex-col bg-canvas">
      <InteractiveToolbar
        tool={tool}
        onToolChange={setTool}
        color={color}
        onColorChange={setColor}
        size={currentSize}
        onSizeChange={(n) => {
          if (tool === "highlighter") setHighlighterSize(n);
          else setPenSize(n);
        }}
        allowNonPen={allowNonPen}
        onAllowNonPenChange={setAllowNonPen}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearPage={handleClearPage}
        onClearAll={handleClearAll}
        onBack={() => router.push(backHref)}
        onFinalize={onFinalize}
        finalizing={finalizing || pending}
        title={patientLabel}
        subtitle={templateLabel}
      />

      <div className="flex flex-1 overflow-hidden">
        <PageThumbnails
          pdf={pdf}
          activePage={activePage}
          onSelect={setActivePage}
          strokeCountByPage={strokeCountByPage}
          collapsed={thumbsCollapsed}
          onToggleCollapsed={() => setThumbsCollapsed((v) => !v)}
        />

        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line/70 bg-surface/70 px-4 py-1.5">
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <button
                type="button"
                className="rounded-full px-2 py-0.5 transition hover:bg-brand/10 hover:text-brand disabled:opacity-40"
                onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                disabled={activePage <= 1}
              >
                ←
              </button>
              <span>
                Página <span className="font-semibold text-ink">{activePage}</span> de {pageCount}
              </span>
              <button
                type="button"
                className="rounded-full px-2 py-0.5 transition hover:bg-brand/10 hover:text-brand disabled:opacity-40"
                onClick={() => setActivePage((p) => Math.min(pageCount, p + 1))}
                disabled={activePage >= pageCount}
              >
                →
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-ink-muted">
              {extraSidePanel ? (
                <button
                  type="button"
                  onClick={() => setExtraOpen((v) => !v)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    extraOpen
                      ? "bg-brand text-white"
                      : "bg-secondary-container text-on-secondary-container hover:brightness-95",
                  )}
                  aria-pressed={extraOpen}
                >
                  {extraSidePanel.label}
                </button>
              ) : null}
              {canInteract ? (
                <>
                  <input
                    type="text"
                    className="h-7 w-48 rounded-md border border-line bg-canvas px-2 text-xs"
                    placeholder="Nome da paciente para assinar"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={onSaveClick}
                    disabled={pending}
                    className="rounded-full bg-secondary-container px-3 py-1 text-xs font-medium text-on-secondary-container transition hover:brightness-95"
                  >
                    {pending ? "Salvando…" : "Salvar rascunho"}
                  </button>
                </>
              ) : (
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-ink-muted">
                  {status === "signed" ? "Assinada" : "Finalizada"}
                </span>
              )}
            </div>
          </div>

          {error ? (
            <p role="alert" className="px-4 pt-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          {info && !error ? (
            <p role="status" className="px-4 pt-2 text-sm text-brand">
              {info}
            </p>
          ) : null}

          <div
            ref={viewerRef}
            className="flex-1 overflow-auto px-4 py-6"
            style={{ touchAction: "pan-y" }}
          >
            {!pdf && templatePdfUrl ? (
              <div className="rounded-2xl bg-surface p-6 text-sm text-ink-muted ring-1 ring-line">
                Carregando PDF…
              </div>
            ) : null}
            {!templatePdfUrl ? (
              <div className="rounded-2xl bg-surface p-6 text-sm text-ink-muted ring-1 ring-line">
                Nenhum template vinculado.
              </div>
            ) : null}

            {pdf ? (
              <div className="mx-auto flex justify-center">
                <div
                  className={cn("relative inline-block rounded-md bg-white shadow-lift")}
                  style={{
                    width: activeSize?.width ?? renderWidth,
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitTouchCallout: "none",
                    // iPadOS: reivindica o gesto na área do PDF/tinta; scroll vertical fica no container externo.
                    touchAction: canInteract ? "none" : undefined,
                  }}
                >
                  <PdfPageCanvas
                    pdf={pdf}
                    pageNumber={activePage}
                    targetWidth={renderWidth}
                    onPageLoaded={handlePageLoaded}
                  />
                  {activeSize ? (
                    <InkLayer
                      width={activeSize.width}
                      height={activeSize.height}
                      page={activePage}
                      color={color}
                      size={currentSize}
                      tool={tool}
                      disabled={!canInteract}
                      allowNonPen={allowNonPen}
                      strokes={strokes}
                      onStrokeCommit={handleStrokeCommit}
                      onEraseStroke={handleEraseStroke}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </main>

        {extraSidePanel && extraOpen ? (
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-line/70 bg-surface/60 p-4 md:block">
            {extraSidePanel.content}
          </aside>
        ) : null}
      </div>

      {extraSidePanel && extraOpen ? (
        <div
          className="fixed inset-0 z-30 flex justify-end bg-black/30 md:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExtraOpen(false);
          }}
        >
          <div className="h-full w-[min(420px,90vw)] overflow-y-auto bg-surface p-4 shadow-lift">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">
                {extraSidePanel.label}
              </h3>
              <button
                type="button"
                onClick={() => setExtraOpen(false)}
                className="rounded-full px-2 py-1 text-xs text-ink-muted hover:bg-muted"
              >
                Fechar
              </button>
            </div>
            {extraSidePanel.content}
          </div>
        </div>
      ) : null}
    </div>
  );
}
