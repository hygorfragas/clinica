"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, FolderDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
import {
  exportClientHistory,
  getClientHistoryExportUrl,
} from "@/lib/clients/history-export";
import {
  FULL_EXPORT_SECTIONS,
  SECTION_LABELS,
  type HistoryExportSections,
} from "@/lib/clients/history-export.schemas";

type BrandingProfileOption = { id: string; name: string; is_default: boolean };

type SectionCounts = Partial<Record<keyof HistoryExportSections, number>>;

export type PreviousExportItem = {
  id: string;
  title: string | null;
  createdAt: string;
};

type Props = {
  clientId: string;
  clientName: string;
  brandingProfiles: BrandingProfileOption[];
  counts: SectionCounts;
  previousExports: PreviousExportItem[];
};

const SECTION_KEYS: (keyof HistoryExportSections)[] = [
  "profile",
  "notes",
  "anamnesis",
  "evolution",
  "budgets",
  "contracts",
  "photos",
];

const NUMERIC_SECTIONS: Set<keyof HistoryExportSections> = new Set([
  "anamnesis",
  "evolution",
  "budgets",
  "contracts",
  "photos",
]);

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function PacienteHistoricoPanel({
  clientId,
  clientName,
  brandingProfiles,
  counts,
  previousExports,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"complete" | "filtered">("complete");
  const [sections, setSections] = useState<HistoryExportSections>(
    FULL_EXPORT_SECTIONS,
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mergeOriginalPdfs, setMergeOriginalPdfs] = useState(true);
  const [highResPhotos, setHighResPhotos] = useState(false);
  const defaultBrandingId =
    brandingProfiles.find((profile) => profile.is_default)?.id ?? "";
  const [brandingProfileId, setBrandingProfileId] =
    useState<string>(defaultBrandingId);

  const totalSelected = useMemo(
    () => SECTION_KEYS.filter((key) => sections[key]).length,
    [sections],
  );

  function toggleSection(key: keyof HistoryExportSections) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function applyCompletePreset() {
    setMode("complete");
    setSections(FULL_EXPORT_SECTIONS);
    setFrom("");
    setTo("");
    setMergeOriginalPdfs(true);
    setHighResPhotos(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (totalSelected === 0) {
      const msg = "Selecione pelo menos uma seção para exportar.";
      setError(msg);
      notifyError(null, msg);
      return;
    }

    if (from && to && from > to) {
      const msg = 'A data "de" precisa ser anterior ou igual à data "até".';
      setError(msg);
      notifyError(null, msg);
      return;
    }

    startTransition(async () => {
      const result = await exportClientHistory({
        clientId,
        from: from || null,
        to: to || null,
        sections,
        mergeOriginalPdfs,
        highResPhotos,
        brandingProfileId: brandingProfileId || null,
      });
      if (!result.ok) {
        setError(result.error);
        notifyError(null, result.error);
        return;
      }
      notifySuccess("Histórico exportado com sucesso.");
      window.open(result.url, "_blank", "noopener,noreferrer");
      router.refresh();
    });
  }

  function openPrevious(documentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await getClientHistoryExportUrl(documentId);
      if (!result.ok) {
        setError(result.error);
        notifyError(null, result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Exportar histórico clínico
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">
              Gere um PDF único com toda a jornada de <strong>{clientName}</strong>{" "}
              na clínica — cadastro, anamneses, evoluções, orçamentos, contratos
              e fotos — com o branding padrão da clínica aplicado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={mode === "complete" ? "primary" : "secondary"}
              className="gap-2"
              onClick={applyCompletePreset}
              disabled={pending}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Exportação completa
            </Button>
            <Button
              type="button"
              variant={mode === "filtered" ? "primary" : "secondary"}
              className="gap-2"
              onClick={() => setMode("filtered")}
              disabled={pending}
            >
              <FolderDown className="h-4 w-4" aria-hidden />
              Exportação filtrada
            </Button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {mode === "filtered" ? (
            <div className="grid gap-4 rounded-2xl border border-line/70 bg-muted/20 p-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="export-from">De</Label>
                <Input
                  id="export-from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="export-to">Até</Label>
                <Input
                  id="export-to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <p className="text-xs text-ink-muted md:col-span-2">
                O filtro de datas é aplicado às seções cronológicas
                (anamneses, evoluções, orçamentos, fotos). Dados cadastrais e
                observações sempre refletem o estado atual.
              </p>
            </div>
          ) : (
            <p className="rounded-2xl bg-brand/5 px-4 py-3 text-sm text-ink-muted ring-1 ring-brand/12">
              Modo completo inclui todas as seções, todos os períodos, com fotos
              e mesclagem de PDFs originais (contratos e anamneses assinadas).
            </p>
          )}

          <fieldset>
            <legend className="text-sm font-semibold text-ink">
              Seções do documento
            </legend>
            <p className="mt-1 text-xs text-ink-muted">
              {totalSelected} de {SECTION_KEYS.length} selecionadas.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SECTION_KEYS.map((key) => {
                const checked = Boolean(sections[key]);
                const label = SECTION_LABELS[key];
                const countHint =
                  NUMERIC_SECTIONS.has(key) && counts[key] !== undefined
                    ? ` (${counts[key]})`
                    : "";
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 text-sm transition ${
                      checked
                        ? "border-brand/35 bg-brand/6 text-ink"
                        : "border-line bg-surface hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-[color:var(--brand)]"
                      checked={checked}
                      onChange={() => toggleSection(key)}
                    />
                    <span className="flex-1">
                      <span className="font-semibold">{label}</span>
                      {countHint ? (
                        <span className="ml-1 text-xs text-ink-muted">
                          {countHint}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[color:var(--brand)]"
                checked={mergeOriginalPdfs}
                onChange={(e) => setMergeOriginalPdfs(e.target.checked)}
              />
              <span className="flex-1">
                <span className="font-semibold">Mesclar PDFs originais</span>
                <span className="block text-xs text-ink-muted">
                  Anexa anamneses assinadas e contratos no formato original
                  dentro do PDF final.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[color:var(--brand)]"
                checked={highResPhotos}
                onChange={(e) => setHighResPhotos(e.target.checked)}
              />
              <span className="flex-1">
                <span className="font-semibold">Fotos em alta resolução</span>
                <span className="block text-xs text-ink-muted">
                  Uma foto por página (melhor qualidade, arquivo maior). Sem
                  marcar: 4 fotos por página.
                </span>
              </span>
            </label>
          </div>

          {brandingProfiles.length > 0 ? (
            <div className="space-y-2">
              <Label>Layout / branding</Label>
              <select
                className="flex h-10 w-full max-w-md rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
                value={brandingProfileId}
                onChange={(e) => setBrandingProfileId(e.target.value)}
              >
                <option value="">Sem branding</option>
                {brandingProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                    {profile.is_default ? " (padrão)" : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-2xl bg-danger/8 px-4 py-3 text-sm text-danger ring-1 ring-danger/20" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
            <p className="text-xs text-ink-muted">
              A exportação fica registrada nesta aba para reimpressão posterior.
            </p>
            <Button
              type="submit"
              loading={pending}
              loadingLabel="Gerando PDF..."
              className="gap-2"
            >
              <Download className="h-4 w-4" aria-hidden />
              Gerar PDF do histórico
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">
            Exportações anteriores
          </h3>
          <span className="text-xs text-ink-muted">
            {previousExports.length}{" "}
            {previousExports.length === 1 ? "registro" : "registros"}
          </span>
        </header>
        {previousExports.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-muted/20 p-6 text-sm text-ink-muted">
            Ainda não há exportações salvas para esta paciente.
          </p>
        ) : (
          <ul className="space-y-2">
            {previousExports.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/70 bg-muted/15 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
                    <FileText className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {item.title ?? "Histórico clínico"}
                    </p>
                    <p className="text-xs text-ink-muted">
                      Gerado em {DATE_FMT.format(new Date(item.createdAt))}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  disabled={pending}
                  onClick={() => openPrevious(item.id)}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Baixar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
