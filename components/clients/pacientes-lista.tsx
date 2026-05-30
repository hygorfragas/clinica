"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react";
import { PacienteOcultarDaListaButton } from "@/components/clients/paciente-ocultar-da-lista-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PacienteListaItem = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
const DEFAULT_PAGE_SIZE: PageSize = 20;
const PAGE_SIZE_STORAGE_KEY = "pacientes:pageSize";

function normalizeSearch(s: string) {
  return s.trim().toLowerCase();
}

function isValidPageSize(n: number): n is PageSize {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n);
}

export function PacientesLista({ clients }: { clients: PacienteListaItem[] }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);

  // Restaura preferência de tamanho de página do navegador.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n) && isValidPageSize(n)) {
        setPageSize(n);
      }
    } catch {
      // ignorado
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
    } catch {
      // ignorado
    }
  }, [pageSize]);

  const filtered = useMemo(() => {
    const n = normalizeSearch(q);
    if (!n) return clients;
    return clients.filter((c) => {
      const name = c.full_name.toLowerCase();
      const phone = (c.phone ?? "").toLowerCase().replace(/\s/g, "");
      const email = (c.email ?? "").toLowerCase();
      const needle = n.replace(/\s/g, "");
      return (
        name.includes(n) ||
        phone.includes(needle) ||
        email.includes(n)
      );
    });
  }, [clients, q]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Volta pra página 1 quando filtros mudam ou a página atual sai do range
  // (ex.: usuário aumentou pageSize e a página atual deixou de existir).
  useEffect(() => {
    setPage(1);
  }, [q, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const paged = useMemo(
    () => filtered.slice(startIndex, endIndex),
    [filtered, startIndex, endIndex],
  );

  const rangeLabel =
    total === 0
      ? "0 resultados"
      : `Mostrando ${startIndex + 1}–${endIndex} de ${total}`;

  return (
    <>
      <div className="relative border-b border-line/80 px-4 py-3">
        <Search
          className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
          aria-hidden
        />
        <Input
          className="pl-10"
          placeholder="Buscar por nome, telefone ou e-mail…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar pacientes"
        />
      </div>
      {total === 0 ? (
        <p className="p-8 text-sm text-ink-muted">
          {q.trim()
            ? "Nenhuma paciente encontrada com esse termo."
            : "Nenhum paciente na lista."}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-line/80">
            {paged.map((c) => (
              <li
                key={c.id}
                className="flex items-stretch divide-x divide-line/80"
              >
                <Link
                  href={`/pacientes/${c.id}`}
                  className="flex min-w-0 flex-1 items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{c.full_name}</p>
                    <p className="mt-0.5 truncate text-sm text-ink-muted">
                      {[c.phone, c.email].filter(Boolean).join(" · ") ||
                        "Sem contato"}
                    </p>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-ink-subtle"
                    aria-hidden
                  />
                </Link>
                <div className="flex items-center px-2 py-2 sm:px-3">
                  <PacienteOcultarDaListaButton
                    clientId={c.id}
                    afterSuccess="refresh"
                    compact
                    variant="ghost"
                    label="Excluir"
                  />
                </div>
              </li>
            ))}
          </ul>

          <PaginationBar
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(n) => setPageSize(n)}
            rangeLabel={rangeLabel}
          />
        </>
      )}
    </>
  );
}

function PaginationBar({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  rangeLabel,
}: {
  page: number;
  totalPages: number;
  pageSize: PageSize;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: PageSize) => void;
  rangeLabel: string;
}) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-col gap-3 border-t border-line/80 px-4 py-3 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <label htmlFor="pacientes_page_size" className="shrink-0">
          Exibir
        </label>
        <select
          id="pacientes_page_size"
          value={pageSize}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (isValidPageSize(n)) onPageSizeChange(n);
          }}
          className="h-8 rounded-md border border-line bg-canvas px-2 text-xs"
          aria-label="Quantidade de pacientes por página"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="hidden sm:inline">por página</span>
        <span className="ml-2 hidden text-ink-subtle sm:inline">·</span>
        <span className="hidden text-ink-subtle sm:inline">{rangeLabel}</span>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className="text-ink-subtle sm:hidden">{rangeLabel}</span>
        <div className="flex items-center gap-1">
          <PageButton
            label="Primeira página"
            disabled={!canPrev}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft className="h-4 w-4" aria-hidden />
          </PageButton>
          <PageButton
            label="Página anterior"
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </PageButton>
          <span className="px-2 text-ink">
            {page} / {totalPages}
          </span>
          <PageButton
            label="Próxima página"
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </PageButton>
          <PageButton
            label="Última página"
            disabled={!canNext}
            onClick={() => onPageChange(totalPages)}
          >
            <ChevronsRight className="h-4 w-4" aria-hidden />
          </PageButton>
        </div>
      </div>
    </div>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-line transition",
        disabled
          ? "cursor-not-allowed text-ink-subtle/50"
          : "text-ink-muted hover:bg-brand/10 hover:text-brand",
      )}
    >
      {children}
    </button>
  );
}
