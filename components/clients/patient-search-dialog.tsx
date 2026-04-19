"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PatientOption = {
  id: string;
  full_name: string;
  cpf?: string | null;
};

function bySearchScore(query: string, patient: PatientOption): number {
  const name = patient.full_name.toLowerCase();
  const cpf = (patient.cpf ?? "").toLowerCase();
  if (name.startsWith(query)) return 0;
  if (cpf.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  if (cpf.includes(query)) return 3;
  return 4;
}

export function PatientSearchDialog({
  patients,
  selectedPatientId,
  onSelect,
  buttonLabel = "Buscar paciente",
  recentLimit = 12,
  disabled = false,
}: {
  patients: PatientOption[];
  selectedPatientId: string;
  onSelect: (patientId: string) => void;
  buttonLabel?: string;
  recentLimit?: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  );

  const visiblePatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return patients.slice(0, recentLimit);
    return [...patients]
      .filter((patient) => {
        const name = patient.full_name.toLowerCase();
        const cpf = (patient.cpf ?? "").toLowerCase();
        return name.includes(query) || cpf.includes(query);
      })
      .sort((a, b) => bySearchScore(query, a) - bySearchScore(query, b))
      .slice(0, 40);
  }, [patients, recentLimit, search]);

  useEffect(() => {
    if (!open) return;
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open]);

  function choose(patientId: string) {
    onSelect(patientId);
    setOpen(false);
    setSearch("");
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          <Search className="h-4 w-4" aria-hidden />
          {buttonLabel}
        </Button>
        {selected ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand ring-1 ring-brand/25">
            <UserRound className="h-3.5 w-3.5" aria-hidden />
            {selected.full_name}
          </span>
        ) : (
          <span className="text-xs text-ink-muted">Nenhuma paciente selecionada</span>
        )}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 px-4 py-10 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Buscar paciente"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[1.5rem] bg-surface p-4 shadow-panel ring-1 ring-line sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-semibold text-ink">Buscar paciente</p>
            <p className="mt-1 text-xs text-ink-muted">
              Digite desde o primeiro caractere para auto completar em tempo real.
            </p>

            <div className="mt-4 rounded-full border border-line bg-[#f3f1ee] px-3 py-2 shadow-inner">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por nome (ou CPF)"
                className="h-10 border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0"
                autoFocus
              />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                {search.trim() ? "Resultados" : "Últimos cadastros"}
              </p>
              {visiblePatients.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-muted/25 px-4 py-6 text-sm text-ink-muted">
                  Nenhuma paciente encontrada para esta busca.
                </p>
              ) : (
                <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                  {visiblePatients.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => choose(patient.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-line/70 bg-canvas/80 px-4 py-3 text-left transition-colors hover:bg-brand/5"
                    >
                      <span className="text-sm font-medium text-ink">
                        {patient.full_name}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {patient.cpf ?? ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
