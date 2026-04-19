"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { PacienteOcultarDaListaButton } from "@/components/clients/paciente-ocultar-da-lista-button";
import { Input } from "@/components/ui/input";

export type PacienteListaItem = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
};

function normalizeSearch(s: string) {
  return s.trim().toLowerCase();
}

export function PacientesLista({ clients }: { clients: PacienteListaItem[] }) {
  const [q, setQ] = useState("");

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
      {filtered.length === 0 ? (
        <p className="p-8 text-sm text-ink-muted">
          {q.trim()
            ? "Nenhuma paciente encontrada com esse termo."
            : "Nenhum paciente na lista."}
        </p>
      ) : (
        <ul className="divide-y divide-line/80">
          {filtered.map((c) => (
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
                  label="Ocultar da lista"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
