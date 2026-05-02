"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { PatientSearchDialog } from "@/components/clients/patient-search-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSale } from "@/lib/sales/actions";
import { notifyError, notifySuccess } from "@/lib/ui/notify";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type Client = { id: string; full_name: string; cpf: string | null };
type Procedure = {
  id: string;
  name: string;
  price_cents: number;
  contract_template_id: string | null;
  requires_signed_contract: boolean;
};

type Feasibility = {
  canSell: boolean;
  missing: string[];
  hasBasicProfile: boolean;
  hasAnamnesis: boolean;
  hasSignedContractForProcedure: boolean;
  basicProfile: {
    hasFullName: boolean;
    hasCpf: boolean;
    hasContact: boolean;
    missingFields: string[];
  };
  contract: {
    required: boolean;
    hasTemplate: boolean;
    hasSignedDocument: boolean;
    missingItems: string[];
  };
};

function centsToMoneyStr(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}
function parseMoneyToCents(v: string) {
  const clean = v.replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(clean);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function NewSaleWizard({
  clients,
  procedures,
}: {
  clients: Client[];
  procedures: Procedure[];
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState<string>("");
  const [procedureId, setProcedureId] = useState<string>("");
  const [price, setPrice] = useState("0,00");
  const [notes, setNotes] = useState("");
  const [feas, setFeas] = useState<Feasibility | null>(null);
  const [checking, setChecking] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const proc = useMemo(
    () => procedures.find((p) => p.id === procedureId) ?? null,
    [procedures, procedureId],
  );

  useEffect(() => {
    if (proc) setPrice(centsToMoneyStr(proc.price_cents));
  }, [proc]);

  useEffect(() => {
    if (!clientId || !procedureId) {
      setFeas(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    void fetch("/api/vendas/completeness", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId, procedureId }),
    })
      .then((r) => r.json())
      .then((data: Feasibility & { error?: string }) => {
        if (cancelled) return;
        if ((data as { error?: string }).error) {
          setFeas(null);
        } else {
          setFeas(data);
        }
      })
      .catch(() => {
        if (!cancelled) setFeas(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, procedureId]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !procedureId) {
      const msg = "Selecione paciente e procedimento.";
      setError(msg);
      notifyError(null, msg);
      return;
    }
    if (!feas?.canSell) {
      const msg = "Paciente ainda não está elegível.";
      setError(msg);
      notifyError(null, msg);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createSale({
        clientId,
        procedureId,
        title: proc?.name,
        totalCents: parseMoneyToCents(price),
        notes: notes.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        notifyError(null, res.error);
        return;
      }
      notifySuccess("Venda registrada.");
      router.push("/vendas");
      router.refresh();
    });
  }

  const client = clients.find((c) => c.id === clientId) ?? null;

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-7 rounded-[1.75rem] bg-surface p-5 shadow-lift ring-1 ring-line sm:p-6 md:grid-cols-2 md:p-7"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-ink">Paciente</Label>
          <PatientSearchDialog
            patients={clients}
            selectedPatientId={clientId}
            onSelect={setClientId}
            buttonLabel="Buscar paciente"
          />
          <p className="text-sm text-ink-muted">
            Não encontrou?{" "}
            <Link className="text-brand hover:underline" href="/pacientes/novo">
              Cadastrar novo paciente
            </Link>
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-ink">Procedimento</Label>
          <select
            className="flex h-12 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            value={procedureId}
            onChange={(e) => setProcedureId(e.target.value)}
          >
            <option value="">— Selecione —</option>
            {procedures.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {BRL.format(p.price_cents / 100)}
                {p.requires_signed_contract ? " · contrato" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-ink">Valor cobrado (R$)</Label>
          <Input
            className="h-12 text-base"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-ink">Observações</Label>
          <textarea
            className="min-h-[6.5rem] w-full rounded-md border border-line bg-[#f3f1ee] px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Checklist da venda
        </h3>
        {!clientId || !procedureId ? (
          <ul className="space-y-2 text-sm">
            <Check
              status={clientId ? "done" : "pending"}
              label="Paciente selecionada"
              helper={
                clientId
                  ? "Paciente escolhida para a venda."
                  : "Selecione uma paciente para continuar."
              }
            />
            <Check
              status={procedureId ? "done" : "pending"}
              label="Procedimento selecionado"
              helper={
                procedureId
                  ? "Procedimento escolhido para validar elegibilidade."
                  : "Selecione o procedimento para validar os requisitos."
              }
            />
          </ul>
        ) : checking ? (
          <p className="text-sm text-ink-muted">Verificando…</p>
        ) : feas ? (
          <ul className="space-y-2 text-sm">
            <Check
              status={feas.hasBasicProfile ? "done" : "pending"}
              label="Cadastro básico da paciente"
              helper={
                feas.hasBasicProfile
                  ? "Nome, CPF e contato preenchidos."
                  : `Falta preencher: ${feas.basicProfile.missingFields.join(", ")}.`
              }
            />
            <Check
              status={feas.hasAnamnesis ? "done" : "pending"}
              label="Anamnese finalizada"
              helper={
                feas.hasAnamnesis
                  ? "Já existe anamnese enviada ou assinada."
                  : "Finalize a anamnese na ficha da paciente."
              }
            />
            <Check
              status={
                !feas.contract.required
                  ? "waived"
                  : feas.hasSignedContractForProcedure
                    ? "done"
                    : "pending"
              }
              label="Contrato do procedimento"
              helper={
                !feas.contract.required
                  ? "Dispensado para este procedimento."
                  : feas.contract.hasTemplate
                    ? feas.hasSignedContractForProcedure
                      ? "Contrato assinado e válido."
                      : "Falta assinatura deste contrato para a paciente."
                    : "Procedimento sem template de contrato vinculado."
              }
            />
          </ul>
        ) : null}

        {feas && !feas.canSell && client ? (
          <div className="rounded-xl bg-warn/10 p-3 text-sm text-warn">
            <p className="font-medium">Pendências para continuar:</p>
            <ul className="mt-1 list-disc pl-4">
              {feas.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              <Link
                className="inline-flex min-h-11 items-center rounded-lg px-2 underline"
                href={`/pacientes/${client.id}`}
              >
                Abrir ficha da paciente
              </Link>
            </p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {feas?.canSell ? (
          <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">
            Checklist concluído. Pronto para registrar a venda.
          </p>
        ) : null}

        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            className="w-full md:w-auto"
            loading={pending}
            loadingLabel="Registrando..."
            disabled={!feas?.canSell}
          >
            Registrar venda
          </Button>
        </div>
      </div>
    </form>
  );
}

type CheckStatus = "done" | "pending" | "waived";

function Check({
  status,
  label,
  helper,
}: {
  status: CheckStatus;
  label: string;
  helper: string;
}) {
  const isDone = status === "done";
  const isWaived = status === "waived";
  const tone = isWaived
    ? "bg-brand-soft/70 text-ink"
    : isDone
      ? "bg-brand/15 text-brand"
      : "bg-danger/10 text-danger";
  const marker = isWaived ? "–" : isDone ? "✓" : "!";
  const statusLabel = isWaived
    ? "Dispensado"
    : isDone
      ? "Concluído"
      : "Pendente";

  return (
    <li className="rounded-xl border border-line/70 bg-canvas/60 px-3 py-3">
      <div className="flex min-h-7 items-center gap-3">
        <span
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${tone}`}
        >
          {marker}
        </span>
        <span className="text-sm font-medium text-ink">{label}</span>
        <span
          className={`ml-auto rounded-full px-2 py-1 text-xs font-medium ${
            isWaived
              ? "bg-brand-soft text-ink"
              : isDone
                ? "bg-brand/10 text-brand"
                : "bg-danger/10 text-danger"
          }`}
        >
          {statusLabel}
        </span>
      </div>
      <p className="mt-2 pl-9 text-sm text-ink-muted">{helper}</p>
    </li>
  );
}
