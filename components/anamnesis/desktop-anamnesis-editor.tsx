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
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ListChecks,
  PenLine,
  PenTool,
  Signature,
  SkipForward,
  Sparkles,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { detectPdfFields } from "@/lib/anamnesis/detect-pdf-fields";
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
import {
  isSignatureFieldType,
  type AnamnesisField,
  type AnamnesisFormValues,
  type AnamnesisStroke,
  type AnamnesisStrokePoint,
} from "@/lib/anamnesis/template-schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PdfPageCanvas } from "./pdf-page-canvas";
import {
  SignaturePadModal,
  type SignatureStroke,
} from "./signature-pad-modal";

type PageSize = { width: number; height: number };

type Mode = "guided" | "all";

function pdfBaseKey(url: string | null | undefined): string | null {
  if (!url) return null;
  const q = url.indexOf("?");
  return q >= 0 ? url.slice(0, q) : url;
}

export type SubmissionEntityKind = "anamnesis" | "evolution" | "contract";

type Props = {
  clientId: string;
  submissionId?: string;
  templateId?: string | null;
  templatePdfUrl: string | null;
  formSchema: AnamnesisField[];
  initialFormValues: AnamnesisFormValues;
  initialInkStrokes?: AnamnesisStroke[];
  initialSignerName?: string | null;
  initialStatus: "draft" | "submitted" | "signed";
  /** Indicador de que a submissão já tem anotações de caneta (modo interativo). */
  hasInkAnnotations?: boolean;
  /** Define se grava em anamnesis_submissions ou evolution_submissions. */
  entityKind?: SubmissionEntityKind;
  /**
   * Recebe uma função de flush síncrono que o pai pode chamar antes de
   * desmontar o editor. Garante que a digitação dos últimos ms (entre
   * autosaves) seja persistida antes do close.
   */
  registerFlush?: (flush: (() => Promise<void>) | null) => void;
  /** Slot opcional renderizado dentro da sidebar — usado para fotos de evolução. */
  extraSidebarPanel?: React.ReactNode;
};

export function DesktopAnamnesisEditor({
  clientId,
  submissionId,
  templateId,
  templatePdfUrl,
  formSchema,
  initialFormValues,
  initialInkStrokes,
  initialSignerName,
  initialStatus,
  hasInkAnnotations,
  entityKind = "anamnesis",
  registerFlush,
  extraSidebarPanel,
}: Props) {
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
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({});
  const [mode, setMode] = useState<Mode>("guided");
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [slideDir, setSlideDir] = useState<"none" | "next" | "prev">("none");
  const [formValues, setFormValues] =
    useState<AnamnesisFormValues>(initialFormValues);
  const [inkStrokes, setInkStrokes] = useState<AnamnesisStroke[]>(
    initialInkStrokes ?? [],
  );
  const [signerName, setSignerName] = useState<string>(initialSignerName ?? "");
  const [status, setStatus] = useState(initialStatus);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<
    string | undefined
  >(submissionId);
  const [detectedFields, setDetectedFields] = useState<AnamnesisField[]>([]);
  const [detectingFields, setDetectingFields] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [signatureModal, setSignatureModal] =
    useState<AnamnesisField | null>(null);
  const [showFinalStep, setShowFinalStep] = useState(false);
  // Aba ativa da coluna lateral. Só faz diferença quando há `extraSidebarPanel`
  // (atualmente: galeria de fotos clínicas em evoluções). Separa o "preenchimento
  // de campos" do "consultar fotos" pra que o layout não fique empilhado em
  // tablets/portrait onde a grid ainda é 1 coluna.
  const [sidebarTab, setSidebarTab] = useState<"fields" | "photos">("fields");

  const viewerRef = useRef<HTMLDivElement | null>(null);
  const fieldRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [viewerWidth, setViewerWidth] = useState(820);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs com leitura síncrona — evita race condition no autosave criando
  // várias submissions porque o state ainda não atualizou entre uma
  // digitação e outra.
  const submissionIdRef = useRef<string | undefined>(submissionId);
  const formValuesRef = useRef<AnamnesisFormValues>(initialFormValues);
  const inkStrokesRef = useRef<AnamnesisStroke[]>(initialInkStrokes ?? []);
  const signerNameRef = useRef<string>(initialSignerName ?? "");
  const savingRef = useRef<Promise<string | null> | null>(null);
  // Marca que existe edição não persistida desde o último save bem-sucedido.
  const dirtyRef = useRef(false);

  const canInteract = status === "draft";

  const loadedPdfBaseRef = useRef<string | null>(null);
  // Marca que o PDF já está pronto na tela. Sem isso, se a URL muda durante
  // o load (server refresh com signed URL novo, mesma base), a guarda de
  // base decide "já carreguei" mas o load anterior foi cancelado e setPdf
  // nunca foi chamado — PDF some na primeira abertura.
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
      const next = Math.max(280, Math.floor(target.getBoundingClientRect().width));
      setViewerWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    };
    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf) return;
    if (formSchema.length > 0) return;
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

  /** Ordem natural de preenchimento: página → topo → esquerda. */
  const orderedFields = useMemo(() => {
    return [...effectiveFields].sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      if (Math.abs(a.y - b.y) > 0.01) return a.y - b.y;
      return a.x - b.x;
    });
  }, [effectiveFields]);

  const fieldsByPage = useMemo(() => {
    const map = new Map<number, AnamnesisField[]>();
    for (const f of orderedFields) {
      const arr = map.get(f.page) ?? [];
      arr.push(f);
      map.set(f.page, arr);
    }
    return map;
  }, [orderedFields]);

  const isFieldFilled = useCallback(
    (field: AnamnesisField): boolean => {
      if (isSignatureFieldType(field.type)) {
        return inkStrokes.some((s) => s.regionId === field.id);
      }
      const v = formValues[field.id];
      if (v === undefined || v === null) return false;
      if (typeof v === "string") return v.trim() !== "";
      if (typeof v === "boolean") return v === true;
      return true;
    },
    [formValues, inkStrokes],
  );

  const filledCount = useMemo(
    () => orderedFields.filter(isFieldFilled).length,
    [orderedFields, isFieldFilled],
  );
  const requiredFields = useMemo(
    () => orderedFields.filter((f) => f.required),
    [orderedFields],
  );
  const requiredMissing = useMemo(
    () => requiredFields.filter((f) => !isFieldFilled(f)),
    [requiredFields, isFieldFilled],
  );

  const activeIndex = useMemo(() => {
    if (!activeFieldId) return -1;
    return orderedFields.findIndex((f) => f.id === activeFieldId);
  }, [orderedFields, activeFieldId]);

  const activeField =
    activeIndex >= 0 ? orderedFields[activeIndex] ?? null : null;

  // Inicializa o campo ativo com o primeiro pendente.
  useEffect(() => {
    if (!canInteract) return;
    if (orderedFields.length === 0) return;
    if (activeFieldId && orderedFields.some((f) => f.id === activeFieldId)) {
      return;
    }
    const firstPending =
      orderedFields.find((f) => !isFieldFilled(f)) ?? orderedFields[0];
    setActiveFieldId(firstPending.id);
  }, [orderedFields, activeFieldId, canInteract, isFieldFilled]);

  const handlePageLoaded = useCallback(
    ({
      pageNumber,
      width,
      height,
    }: {
      pageNumber: number;
      width: number;
      height: number;
    }) => {
      setPageSizes((prev) => {
        const cur = prev[pageNumber];
        if (cur && Math.abs(cur.width - width) < 1 && Math.abs(cur.height - height) < 1) {
          return prev;
        }
        return { ...prev, [pageNumber]: { width, height } };
      });
    },
    [],
  );

  const focusActiveField = useCallback(
    (fieldId: string) => {
      const f = orderedFields.find((x) => x.id === fieldId);
      if (!f) return;
      setActiveFieldId(fieldId);
      setActivePage((prev) => {
        if (prev === f.page) return prev;
        setSlideDir(f.page > prev ? "next" : "prev");
        return f.page;
      });
      // Aguarda render do overlay para focar input.
      requestAnimationFrame(() => {
        const el = fieldRefs.current.get(fieldId);
        if (el && typeof (el as HTMLInputElement).focus === "function") {
          (el as HTMLInputElement).focus({ preventScroll: true });
          if (
            "select" in el &&
            typeof (el as HTMLInputElement).select === "function"
          ) {
            try {
              (el as HTMLInputElement).select();
            } catch {
              // ignore
            }
          }
        }
      });
    },
    [orderedFields],
  );

  function gotoPage(target: number) {
    if (!pdf) return;
    const max = pdf.numPages;
    const next = Math.max(1, Math.min(max, target));
    if (next === activePage) return;
    setSlideDir(next > activePage ? "next" : "prev");
    setActivePage(next);
  }

  function gotoIndex(idx: number) {
    if (idx < 0 || idx >= orderedFields.length) return;
    focusActiveField(orderedFields[idx].id);
  }

  function gotoNext() {
    if (activeIndex < 0) {
      if (orderedFields.length > 0) gotoIndex(0);
      return;
    }
    // Procura próximo pendente; se não houver, vai para o último.
    for (let i = activeIndex + 1; i < orderedFields.length; i += 1) {
      if (!isFieldFilled(orderedFields[i])) {
        gotoIndex(i);
        return;
      }
    }
    // Se todos seguintes estão preenchidos, avança ao próximo bruto.
    if (activeIndex + 1 < orderedFields.length) gotoIndex(activeIndex + 1);
    else if (requiredMissing.length === 0) setShowFinalStep(true);
  }

  function gotoPrev() {
    if (activeIndex > 0) gotoIndex(activeIndex - 1);
  }

  // Sincroniza refs com states pra que o save (que lê dos refs) sempre
  // veja os dados mais recentes mesmo dentro de uma closure antiga.
  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);
  useEffect(() => {
    inkStrokesRef.current = inkStrokes;
  }, [inkStrokes]);
  useEffect(() => {
    signerNameRef.current = signerName;
  }, [signerName]);

  const handleFieldChange = useCallback(
    (field: AnamnesisField, value: string | boolean) => {
      setFormValues((prev) => {
        const next = { ...prev, [field.id]: value };
        // Atualiza ref síncrono (antes do useEffect rodar).
        formValuesRef.current = next;
        return next;
      });
      dirtyRef.current = true;
      scheduleAutosave();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const scheduleAutosave = useCallback(() => {
    if (!canInteract) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void doSave({ silent: true });
    }, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canInteract]);

  // Flush imediato: cancela debounce e força save final. Usado em
  // pagehide/visibilitychange e no fechamento do editor pelo pai.
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

  // Eventos do navegador: aba mudando, página fechando, tablet dormindo.
  // Tenta um save final antes que a aba seja descartada.
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

  useEffect(
    () => () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    },
    [],
  );

  async function doSave(opts?: { silent?: boolean }): Promise<string | null> {
    if (!canInteract) return null;
    // Single-flight: se já tem um save rodando, encadeia neste mesmo Promise.
    // Garante que nunca dois saves disparam paralelos com submissionId stale.
    if (savingRef.current) {
      await savingRef.current;
    }
    const promise = (async (): Promise<string | null> => {
      setError(null);
      if (!opts?.silent) setInfo(null);
      const result = await saveAction(clientId, {
        submissionId: submissionIdRef.current,
        templateId: templateId ?? undefined,
        mode: "desktop",
        formValues: formValuesRef.current,
        inkStrokes: inkStrokesRef.current,
        signerName: signerNameRef.current || undefined,
        status: "draft",
        silent: opts?.silent,
      });
      if (!result.ok) {
        setError(result.error);
        return null;
      }
      // Atualiza ref ANTES do state pra que o próximo save dentro do mesmo
      // event-loop já enxergue o id correto.
      submissionIdRef.current = result.id;
      setCurrentSubmissionId(result.id);
      dirtyRef.current = false;
      if (!opts?.silent) setInfo("Rascunho salvo.");
      return result.id;
    })();
    savingRef.current = promise;
    try {
      return await promise;
    } finally {
      if (savingRef.current === promise) savingRef.current = null;
    }
  }

  function onSaveClick() {
    startTransition(async () => {
      await doSave();
    });
  }

  function onFinalize() {
    if (requiredMissing.length > 0) {
      setError(
        `Faltam ${requiredMissing.length} campo(s) obrigatório(s) — abra a paleta para revisar.`,
      );
      return;
    }
    startTransition(async () => {
      // Cancela autosave pendente e força save final síncrono pra garantir
      // que TODOS os values/strokes mais recentes vão pro banco antes do
      // submit gerar o PDF.
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      const id = await doSave({ silent: true });
      if (!id) return;
      const result = await submitAction(clientId, id, {
        signerName: signerName || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStatus(signerName ? "signed" : "submitted");
      setInfo("Anamnese finalizada e PDF gerado.");
      setShowFinalStep(false);
    });
  }

  // Captura strokes do modal, traduz coordenadas do campo → página.
  function handleSignatureConfirm(
    field: AnamnesisField,
    captured: SignatureStroke[],
  ) {
    setInkStrokes((prev) => {
      // Remove strokes anteriores do mesmo campo.
      const remaining = prev.filter((s) => s.regionId !== field.id);
      const next: AnamnesisStroke[] = [...remaining];
      for (const s of captured) {
        const points: AnamnesisStrokePoint[] = s.points.map((p) => {
          const x = field.x + p[0] * field.width;
          const y = field.y + p[1] * field.height;
          if (p.length === 3) return [x, y, p[2]];
          return [x, y];
        });
        next.push({
          page: field.page,
          regionId: field.id,
          color: s.color,
          width: s.width,
          tool: "pen",
          opacity: 1,
          points,
        });
      }
      inkStrokesRef.current = next;
      return next;
    });
    setSignatureModal(null);
    dirtyRef.current = true;
    scheduleAutosave();
    // Avança para o próximo campo após assinar.
    requestAnimationFrame(() => gotoNext());
  }

  function clearSignature(field: AnamnesisField) {
    setInkStrokes((prev) => {
      const next = prev.filter((s) => s.regionId !== field.id);
      inkStrokesRef.current = next;
      return next;
    });
    dirtyRef.current = true;
    scheduleAutosave();
  }

  // Strokes do modal de assinatura: traduzir de coords da página → coords do campo.
  const initialModalStrokes = useMemo<SignatureStroke[]>(() => {
    if (!signatureModal) return [];
    const f = signatureModal;
    return inkStrokes
      .filter((s) => s.regionId === f.id)
      .map((s) => ({
        color: s.color ?? "#0f172a",
        width: s.width ?? 1.8,
        points: s.points.map((p) => {
          const cx = (p[0] - f.x) / Math.max(0.0001, f.width);
          const cy = (p[1] - f.y) / Math.max(0.0001, f.height);
          if (p.length === 3) return [cx, cy, p[2]];
          return [cx, cy];
        }),
      }));
  }, [signatureModal, inkStrokes]);

  const pageCount = pdf?.numPages ?? 1;
  // viewerWidth já tem mínimo de 320 (clamp do ResizeObserver); em mobile pequeno
  // o viewerWidth real pode ser menor que 320, mas o ResizeObserver garante 320
  // como piso. Aqui só limitamos o teto pra não estourar em desktops largos.
  const renderWidth = Math.min(960, viewerWidth);
  const totalFields = orderedFields.length;

  // Atalho global de teclado: Enter avança no modo guiado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mode !== "guided") return;
      const t = e.target as HTMLElement | null;
      const isFormEl =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "SELECT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);
      if (e.key === "Enter" && !e.shiftKey) {
        if (t && t.tagName === "TEXTAREA") return;
        e.preventDefault();
        gotoNext();
      } else if (e.key === "ArrowDown" && !isFormEl) {
        e.preventDefault();
        gotoNext();
      } else if (e.key === "ArrowUp" && !isFormEl) {
        e.preventDefault();
        gotoPrev();
      } else if (e.key === "ArrowRight" && !isFormEl) {
        e.preventDefault();
        gotoPage(activePage + 1);
      } else if (e.key === "ArrowLeft" && !isFormEl) {
        e.preventDefault();
        gotoPage(activePage - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeIndex, orderedFields]);

  return (
    <div className="space-y-4">
      {/* Topbar */}
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-line sm:flex-row sm:items-center">
        <ProgressBlock
          filled={filledCount}
          total={totalFields}
          requiredMissing={requiredMissing.length}
        />

        <div className="flex flex-wrap items-center gap-2">
          <ModeToggle mode={mode} onChange={setMode} />
          {hasInkAnnotations ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
              Tem anotações a caneta no modo interativo
            </span>
          ) : null}
        </div>

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
                onClick={() => setShowFinalStep(true)}
                disabled={pending || totalFields === 0}
              >
                Concluir
              </Button>
            </>
          ) : (
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-ink-muted">
              {status === "signed" ? "Assinada" : "Finalizada"}
            </span>
          )}
        </div>
      </div>

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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Coluna PDF */}
        <div ref={viewerRef} className="min-w-0 space-y-4">
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
            <PageCarousel
              pageCount={pageCount}
              activePage={activePage}
              slideDir={slideDir}
              onChangePage={(p) => gotoPage(p)}
              onSlideEnd={() => setSlideDir("none")}
              renderPage={(pNum) => {
                const size = pageSizes[pNum];
                const pageFields = fieldsByPage.get(pNum) ?? [];
                return (
                  <div
                    className="mx-auto"
                    style={{ width: size?.width ?? renderWidth }}
                  >
                    <div className="relative inline-block w-full">
                      <PdfPageCanvas
                        pdf={pdf}
                        pageNumber={pNum}
                        targetWidth={renderWidth}
                        onPageLoaded={handlePageLoaded}
                      />
                      {size ? (
                        <FieldOverlay
                          fields={pageFields}
                          size={size}
                          formValues={formValues}
                          inkStrokes={inkStrokes}
                          activeFieldId={activeFieldId}
                          mode={mode}
                          disabled={!canInteract}
                          onChange={handleFieldChange}
                          onActivate={focusActiveField}
                          onOpenSignature={(f) => setSignatureModal(f)}
                          onClearSignature={clearSignature}
                          registerRef={(id, el) => {
                            if (el) fieldRefs.current.set(id, el);
                            else fieldRefs.current.delete(id);
                          }}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              }}
            />
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="min-w-0 space-y-3">
          {extraSidebarPanel ? (
            <SidebarTabs
              activeTab={sidebarTab}
              onChange={setSidebarTab}
            />
          ) : null}

          {(!extraSidebarPanel || sidebarTab === "fields") ? (
            <>
              {mode === "guided" && activeField ? (
                <GuidedActiveCard
                  field={activeField}
                  index={activeIndex}
                  total={totalFields}
                  filled={isFieldFilled(activeField)}
                  onPrev={gotoPrev}
                  onNext={gotoNext}
                  onSkip={() => gotoNext()}
                  onOpenSignature={() => setSignatureModal(activeField)}
                  hasPrev={activeIndex > 0}
                  hasNext={activeIndex < totalFields - 1}
                />
              ) : null}

              <FieldNavigator
                fieldsByPage={fieldsByPage}
                pageCount={pageCount}
                activeFieldId={activeFieldId}
                onJump={focusActiveField}
                isFieldFilled={isFieldFilled}
                detecting={detectingFields && formSchema.length === 0}
              />

              {totalFields === 0 && !detectingFields ? (
                <p className="rounded-2xl bg-surface p-4 text-xs text-ink-muted ring-1 ring-line">
                  Este template não tem campos rastreados. Você pode finalizar
                  diretamente, ou abrir em modo interativo para anotar a caneta.
                </p>
              ) : null}
            </>
          ) : null}

          {extraSidebarPanel && sidebarTab === "photos" ? (
            <div className="h-[70vh] min-h-[420px] overflow-hidden rounded-2xl ring-1 ring-line">
              {extraSidebarPanel}
            </div>
          ) : null}
        </aside>
      </div>

      {/* Modal de assinatura */}
      {signatureModal ? (
        <SignaturePadModal
          open
          fieldLabel={signatureModal.label}
          aspectRatio={signatureModal.width / Math.max(0.0001, signatureModal.height)}
          variant={signatureModal.type === "initials" ? "initials" : "signature"}
          initialStrokes={initialModalStrokes}
          onCancel={() => setSignatureModal(null)}
          onConfirm={(strokes) => handleSignatureConfirm(signatureModal, strokes)}
        />
      ) : null}

      {/* Etapa final: confirmar e assinar */}
      {showFinalStep ? (
        <FinalStepDialog
          requiredMissing={requiredMissing}
          signerName={signerName}
          onSignerNameChange={setSignerName}
          onClose={() => setShowFinalStep(false)}
          onJumpField={(id) => {
            setShowFinalStep(false);
            focusActiveField(id);
          }}
          onConfirm={onFinalize}
          pending={pending}
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponentes                                                             */
/* -------------------------------------------------------------------------- */

function PageCarousel({
  pageCount,
  activePage,
  slideDir,
  onChangePage,
  onSlideEnd,
  renderPage,
}: {
  pageCount: number;
  activePage: number;
  slideDir: "none" | "next" | "prev";
  onChangePage: (p: number) => void;
  onSlideEnd: () => void;
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
              aria-label={`Página ${p}`}
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
          className={cn("flex w-full justify-center will-change-transform", slideClass)}
          onAnimationEnd={() => onSlideEnd()}
        >
          {renderPage(activePage)}
        </div>
      </div>

      <p className="text-center text-[11px] text-ink-subtle">
        Página {activePage} de {pageCount} · use ← → para navegar
      </p>
    </div>
  );
}

function ProgressBlock({
  filled,
  total,
  requiredMissing,
}: {
  filled: number;
  total: number;
  requiredMissing: number;
}) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <span className="font-medium text-ink">
          {filled}/{total}
        </span>
        <span>preenchidos</span>
        {requiredMissing > 0 ? (
          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">
            {requiredMissing} obrigatório(s) faltando
          </span>
        ) : null}
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-canvas p-0.5 ring-1 ring-line">
      <button
        type="button"
        onClick={() => onChange("guided")}
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-md px-3 text-xs font-medium transition",
          mode === "guided"
            ? "bg-brand text-white shadow-sm"
            : "text-ink-muted hover:text-ink",
        )}
        aria-pressed={mode === "guided"}
      >
        <Sparkles className="h-3.5 w-3.5" /> Guiado
      </button>
      <button
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-md px-3 text-xs font-medium transition",
          mode === "all"
            ? "bg-brand text-white shadow-sm"
            : "text-ink-muted hover:text-ink",
        )}
        aria-pressed={mode === "all"}
      >
        <ListChecks className="h-3.5 w-3.5" /> Ver tudo
      </button>
    </div>
  );
}

function GuidedActiveCard({
  field,
  index,
  total,
  filled,
  onPrev,
  onNext,
  onSkip,
  onOpenSignature,
  hasPrev,
  hasNext,
}: {
  field: AnamnesisField;
  index: number;
  total: number;
  filled: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  onOpenSignature: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const isSig = isSignatureFieldType(field.type);
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
      <div className="flex items-center justify-between text-[11px] text-ink-muted">
        <span>
          Campo {index + 1} de {total} · página {field.page}
        </span>
        {filled ? (
          <span className="inline-flex items-center gap-1 text-brand">
            <CheckCircle2 className="h-3.5 w-3.5" /> Preenchido
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-ink-subtle">
            <Circle className="h-3.5 w-3.5" /> Pendente
          </span>
        )}
      </div>
      <h3 className="mt-1 text-sm font-semibold text-ink">
        {field.label}
        {field.required ? (
          <span className="ml-1 align-middle text-danger">*</span>
        ) : null}
      </h3>
      <p className="mt-1 text-[11px] text-ink-muted">
        {hintForType(field.type)}
      </p>

      {isSig ? (
        <Button
          type="button"
          size="sm"
          className="mt-3 w-full"
          onClick={onOpenSignature}
        >
          {field.type === "initials" ? (
            <PenLine className="h-3.5 w-3.5" />
          ) : (
            <Signature className="h-3.5 w-3.5" />
          )}
          {filled ? "Refazer" : "Abrir captura"}
        </Button>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onPrev}
          disabled={!hasPrev}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Anterior
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onSkip}
          disabled={!hasNext}
        >
          <SkipForward className="h-3.5 w-3.5" /> Pular
        </Button>
        <Button type="button" size="sm" onClick={onNext} disabled={!hasNext}>
          Próximo <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

const FIELD_NAV_PAGE_SIZE = 8;

function FieldNavigator({
  fieldsByPage,
  pageCount,
  activeFieldId,
  onJump,
  isFieldFilled,
  detecting,
}: {
  fieldsByPage: Map<number, AnamnesisField[]>;
  pageCount: number;
  activeFieldId: string | null;
  onJump: (id: string) => void;
  isFieldFilled: (f: AnamnesisField) => boolean;
  detecting: boolean;
}) {
  // Achata todos os campos preservando a ordem (página do PDF → topo → esq.),
  // guardando de qual página do PDF cada um veio para exibir o cabeçalho.
  const flat = useMemo(() => {
    const list: Array<{ field: AnamnesisField; pdfPage: number }> = [];
    for (let p = 1; p <= pageCount; p += 1) {
      const fields = fieldsByPage.get(p) ?? [];
      for (const field of fields) list.push({ field, pdfPage: p });
    }
    return list;
  }, [fieldsByPage, pageCount]);

  const totalNavPages = Math.max(
    1,
    Math.ceil(flat.length / FIELD_NAV_PAGE_SIZE),
  );
  const [navPage, setNavPage] = useState(0);

  const activeIndex = useMemo(
    () => flat.findIndex((x) => x.field.id === activeFieldId),
    [flat, activeFieldId],
  );

  // Troca automática: quando o campo ativo está em outra página da lista
  // (ex.: usuário concluiu um campo e o foco avançou para o próximo pendente),
  // a paginação acompanha sem o usuário precisar paginar manualmente.
  useEffect(() => {
    if (activeIndex < 0) return;
    setNavPage(Math.floor(activeIndex / FIELD_NAV_PAGE_SIZE));
  }, [activeIndex]);

  // Mantém navPage válido se a quantidade de campos mudar.
  useEffect(() => {
    setNavPage((p) => Math.min(p, totalNavPages - 1));
  }, [totalNavPages]);

  if (detecting) {
    return (
      <div className="rounded-2xl bg-surface p-4 text-xs text-ink-muted shadow-sm ring-1 ring-line">
        Detectando campos do PDF automaticamente…
      </div>
    );
  }

  if (flat.length === 0) return null;

  const start = navPage * FIELD_NAV_PAGE_SIZE;
  const slice = flat.slice(start, start + FIELD_NAV_PAGE_SIZE);

  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
          Mapa de campos
        </h3>
        <span className="text-[10px] text-ink-subtle">
          {flat.length} campo(s)
        </span>
      </div>

      <ul className="mt-2 space-y-0.5 text-xs">
        {slice.map(({ field: f, pdfPage }, i) => {
          const filled = isFieldFilled(f);
          const active = activeFieldId === f.id;
          // Cabeçalho de página do PDF quando muda dentro da lista paginada.
          const prevPdfPage = i > 0 ? slice[i - 1].pdfPage : null;
          const showPageHeader = pdfPage !== prevPdfPage;
          return (
            <li key={f.id}>
              {showPageHeader ? (
                <p className="mb-0.5 mt-2 text-[10px] font-medium uppercase text-ink-subtle first:mt-0">
                  Página {pdfPage}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => onJump(f.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition",
                  active
                    ? "bg-brand/10 text-ink"
                    : "text-ink-muted hover:bg-brand/5 hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                    filled
                      ? "bg-brand text-white"
                      : f.required
                        ? "bg-danger/15 text-danger"
                        : "bg-muted text-ink-muted",
                  )}
                >
                  {filled ? "✓" : f.required ? "!" : ""}
                </span>
                <span className="min-w-0 flex-1 truncate">{f.label}</span>
                <span className="text-[10px] text-ink-subtle">
                  {shortType(f.type)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {totalNavPages > 1 ? (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/60 pt-2">
          <button
            type="button"
            onClick={() => setNavPage((p) => Math.max(0, p - 1))}
            disabled={navPage === 0}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition",
              navPage === 0
                ? "cursor-not-allowed text-ink-subtle/50"
                : "text-ink-muted hover:bg-brand/10 hover:text-brand",
            )}
            aria-label="Campos anteriores"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Ant.
          </button>
          <span className="text-[10px] text-ink-subtle">
            {navPage + 1} / {totalNavPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setNavPage((p) => Math.min(totalNavPages - 1, p + 1))
            }
            disabled={navPage >= totalNavPages - 1}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition",
              navPage >= totalNavPages - 1
                ? "cursor-not-allowed text-ink-subtle/50"
                : "text-ink-muted hover:bg-brand/10 hover:text-brand",
            )}
            aria-label="Próximos campos"
          >
            Próx. <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FinalStepDialog({
  requiredMissing,
  signerName,
  onSignerNameChange,
  onClose,
  onJumpField,
  onConfirm,
  pending,
}: {
  requiredMissing: AnamnesisField[];
  signerName: string;
  onSignerNameChange: (s: string) => void;
  onClose: () => void;
  onJumpField: (id: string) => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-lift">
        <h3 className="text-base font-semibold text-ink">Confirmar e assinar</h3>
        <p className="mt-1 text-xs text-ink-muted">
          Revise antes de gerar o PDF final. Após confirmar, a anamnese fica
          travada para edição.
        </p>

        {requiredMissing.length > 0 ? (
          <div className="mt-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">
            <p className="font-medium">
              Faltam {requiredMissing.length} campo(s) obrigatório(s):
            </p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {requiredMissing.slice(0, 6).map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline"
                    onClick={() => onJumpField(f.id)}
                  >
                    {f.label} (página {f.page})
                  </button>
                </li>
              ))}
              {requiredMissing.length > 6 ? (
                <li>… e mais {requiredMissing.length - 6}</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          <label className="text-xs text-ink-muted" htmlFor="final_signer">
            Nome de quem está assinando (opcional)
          </label>
          <input
            id="final_signer"
            type="text"
            className="h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm"
            placeholder="Nome completo da paciente"
            value={signerName}
            onChange={(e) => onSignerNameChange(e.target.value)}
          />
          <p className="text-[11px] text-ink-subtle">
            Preencher o nome muda o status para “Assinada”. Em branco, fica
            “Finalizada”.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={pending || requiredMissing.length > 0}
          >
            <PenTool className="h-3.5 w-3.5" /> Finalizar e gerar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

function SidebarTabs({
  activeTab,
  onChange,
}: {
  activeTab: "fields" | "photos";
  onChange: (t: "fields" | "photos") => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Seções da coluna lateral"
      className="inline-flex w-full rounded-xl bg-canvas p-0.5 ring-1 ring-line"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "fields"}
        onClick={() => onChange("fields")}
        className={cn(
          "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition",
          activeTab === "fields"
            ? "bg-brand text-white shadow-sm"
            : "text-ink-muted hover:text-ink",
        )}
      >
        Preencher campos
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "photos"}
        onClick={() => onChange("photos")}
        className={cn(
          "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition",
          activeTab === "photos"
            ? "bg-brand text-white shadow-sm"
            : "text-ink-muted hover:text-ink",
        )}
      >
        Fotos clínicas
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Overlay sobre o PDF                                                        */
/* -------------------------------------------------------------------------- */

function FieldOverlay({
  fields,
  size,
  formValues,
  inkStrokes,
  activeFieldId,
  mode,
  disabled,
  onChange,
  onActivate,
  onOpenSignature,
  onClearSignature,
  registerRef,
}: {
  fields: AnamnesisField[];
  size: PageSize;
  formValues: AnamnesisFormValues;
  inkStrokes: AnamnesisStroke[];
  activeFieldId: string | null;
  mode: Mode;
  disabled: boolean;
  onChange: (field: AnamnesisField, value: string | boolean) => void;
  onActivate: (id: string) => void;
  onOpenSignature: (field: AnamnesisField) => void;
  onClearSignature: (field: AnamnesisField) => void;
  registerRef: (id: string, el: HTMLElement | null) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {fields.map((f) => {
        const isActive = activeFieldId === f.id;
        const isSig = isSignatureFieldType(f.type);
        const hasSig = inkStrokes.some((s) => s.regionId === f.id);
        const showInput = mode === "all" || isActive;

        const style: React.CSSProperties = {
          left: f.x * size.width,
          top: f.y * size.height,
          width: f.width * size.width,
          height: f.height * size.height,
        };

        if (!showInput) {
          // Modo guiado, campo inativo: mostra valor preenchido (read-only)
          // ou marcador discreto. Clicar reativa o campo para edição.
          const filled =
            (isSig && hasSig) ||
            (!isSig && hasValue(formValues[f.id]));
          const display = !isSig ? formatFieldDisplay(f, formValues[f.id]) : null;
          return (
            <button
              key={f.id}
              type="button"
              disabled={disabled}
              onClick={() => onActivate(f.id)}
              style={style}
              className={cn(
                "pointer-events-auto absolute overflow-hidden rounded text-left transition",
                filled
                  ? "border border-brand/40 bg-white/80"
                  : f.required
                    ? "border border-dashed border-danger/50 bg-danger/5 hover:border-danger/70"
                    : "border border-dashed border-line bg-white/40 hover:border-brand/50 hover:bg-brand/5",
              )}
              aria-label={`${filled ? "Editar" : "Ativar"} campo ${f.label}`}
              title={filled && display ? `${f.label}: ${display}` : f.label}
            >
              {filled && !isSig && display ? (
                <span className="pointer-events-none block h-full w-full overflow-hidden whitespace-nowrap px-1 text-[11px] leading-[1.1] text-ink">
                  {display}
                </span>
              ) : null}
              {filled && isSig ? (
                <span className="pointer-events-none flex h-full w-full items-center justify-center gap-1 px-1 text-[10px] font-medium text-brand">
                  <CheckCircle2 className="h-3 w-3" />
                  {f.type === "initials" ? "Rubricado" : "Assinado"}
                </span>
              ) : null}
            </button>
          );
        }

        // Mostra input.
        const wrapperBase =
          "pointer-events-auto absolute rounded ring-1 transition";
        const wrapperHighlight = isActive
          ? "ring-brand bg-white shadow-[0_0_0_4px_rgba(74,101,90,0.18)]"
          : "ring-line/70 bg-white/95";
        const wrapper = `${wrapperBase} ${wrapperHighlight}`;

        const setInputRef = (el: HTMLElement | null) => registerRef(f.id, el);

        if (isSig) {
          return (
            <button
              key={f.id}
              type="button"
              ref={(el) => setInputRef(el)}
              disabled={disabled}
              onClick={() => onOpenSignature(f)}
              style={style}
              className={cn(
                wrapper,
                "flex items-center justify-center gap-1 px-2 text-[11px] font-medium",
                hasSig ? "text-brand" : "text-ink-muted",
              )}
              aria-label={hasSig ? "Refazer assinatura" : "Capturar assinatura"}
            >
              {f.type === "initials" ? (
                <PenLine className="h-3.5 w-3.5" />
              ) : (
                <Signature className="h-3.5 w-3.5" />
              )}
              {hasSig ? "Refazer" : f.type === "initials" ? "Rubricar" : "Assinar"}
            </button>
          );
        }

        if (f.type === "checkbox") {
          return (
            <label
              key={f.id}
              style={style}
              className={cn(
                wrapper,
                "flex items-center gap-1 px-1 text-xs",
              )}
              onClick={() => onActivate(f.id)}
            >
              <input
                ref={(el) => setInputRef(el)}
                type="checkbox"
                checked={!!formValues[f.id]}
                disabled={disabled}
                onChange={(e) => onChange(f, e.target.checked)}
              />
              <span className="truncate">{f.label}</span>
            </label>
          );
        }

        if (f.type === "yesno") {
          const v = formValues[f.id];
          const current = v === "yes" ? "yes" : v === "no" ? "no" : null;
          return (
            <div
              key={f.id}
              ref={(el) => setInputRef(el)}
              style={style}
              className={cn(
                wrapper,
                "flex items-center gap-1 px-1 text-[10px] font-medium",
              )}
              onClick={() => onActivate(f.id)}
              tabIndex={0}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(f, current === "yes" ? "" : "yes");
                }}
                className={cn(
                  "flex h-5 flex-1 items-center justify-center gap-0.5 rounded border transition",
                  current === "yes"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-line bg-canvas text-ink-muted hover:border-emerald-300",
                )}
                aria-pressed={current === "yes"}
              >
                {current === "yes" ? "☒" : "☐"} Sim
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(f, current === "no" ? "" : "no");
                }}
                className={cn(
                  "flex h-5 flex-1 items-center justify-center gap-0.5 rounded border transition",
                  current === "no"
                    ? "border-rose-400 bg-rose-50 text-rose-700"
                    : "border-line bg-canvas text-ink-muted hover:border-rose-300",
                )}
                aria-pressed={current === "no"}
              >
                {current === "no" ? "☒" : "☐"} Não
              </button>
            </div>
          );
        }

        if (f.type === "textarea") {
          return (
            <textarea
              key={f.id}
              ref={(el) => setInputRef(el)}
              style={style}
              className={cn(wrapper, "resize-none px-1 py-0.5 text-xs")}
              value={formValues[f.id] == null ? "" : String(formValues[f.id])}
              disabled={disabled}
              placeholder={f.placeholder ?? f.label}
              onFocus={() => onActivate(f.id)}
              onChange={(e) => onChange(f, e.target.value)}
            />
          );
        }

        if (f.type === "select") {
          return (
            <select
              key={f.id}
              ref={(el) => setInputRef(el)}
              style={style}
              className={cn(wrapper, "px-1 text-xs")}
              value={formValues[f.id] == null ? "" : String(formValues[f.id])}
              disabled={disabled}
              onFocus={() => onActivate(f.id)}
              onChange={(e) => onChange(f, e.target.value)}
            >
              <option value="">{f.placeholder ?? "Selecionar"}</option>
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
            ref={(el) => setInputRef(el)}
            style={style}
            type={f.type === "date" ? "date" : "text"}
            className={cn(wrapper, "px-1 text-xs")}
            value={formValues[f.id] == null ? "" : String(formValues[f.id])}
            disabled={disabled}
            placeholder={f.placeholder ?? f.label}
            onFocus={() => onActivate(f.id)}
            onChange={(e) => onChange(f, e.target.value)}
          />
        );
      })}
      {/* Botão de limpar assinatura, separado do button para evitar nested */}
      {fields
        .filter(
          (f) =>
            isSignatureFieldType(f.type) &&
            inkStrokes.some((s) => s.regionId === f.id) &&
            (mode === "all" || activeFieldId === f.id),
        )
        .map((f) => (
          <button
            key={`clear-${f.id}`}
            type="button"
            onClick={() => onClearSignature(f)}
            className="pointer-events-auto absolute -translate-y-full rounded bg-danger/90 px-1 py-0.5 text-[9px] font-medium text-white shadow-sm hover:bg-danger"
            style={{
              left: f.x * size.width,
              top: f.y * size.height - 2,
            }}
          >
            limpar
          </button>
        ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function hasValue(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "boolean") return v === true;
  return true;
}

function formatFieldDisplay(
  field: AnamnesisField,
  value: unknown,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") {
    return value ? (field.label || "✓") : null;
  }
  if (field.type === "yesno") {
    if (value === "yes") return "Sim";
    if (value === "no") return "Não";
    return null;
  }
  if (field.type === "date" && typeof value === "string" && value) {
    const d = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
  }
  const s = typeof value === "string" ? value : String(value);
  return s.trim() ? s : null;
}

function hintForType(t: AnamnesisField["type"]): string {
  switch (t) {
    case "text":
      return "Digite o texto. Enter para avançar.";
    case "textarea":
      return "Texto longo. Shift+Enter para nova linha.";
    case "checkbox":
      return "Marque ou desmarque a opção.";
    case "yesno":
      return "Escolha Sim ou Não.";
    case "date":
      return "Selecione a data.";
    case "select":
      return "Escolha uma das opções.";
    case "signature":
      return "Toque/clique para abrir o pad de assinatura.";
    case "initials":
      return "Toque/clique para abrir o pad de rubrica.";
    default:
      return "";
  }
}

function shortType(t: AnamnesisField["type"]): string {
  return {
    text: "texto",
    textarea: "longo",
    checkbox: "caixa",
    yesno: "sim/não",
    date: "data",
    select: "lista",
    signature: "assin.",
    initials: "rubrica",
  }[t];
}
