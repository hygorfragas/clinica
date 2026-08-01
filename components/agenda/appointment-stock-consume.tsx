"use client";

import { PackageMinus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  consumeAppointmentStock,
  getAppointmentConsumptionPreview,
  type AppointmentConsumptionPreview,
} from "@/lib/stock/actions";
import { notifyError, notifySuccess } from "@/lib/ui/notify";

type QtyDraft = Record<string, string>;

export function AppointmentStockConsume({
  appointmentId,
  procedureId,
  savedProcedureId,
}: {
  appointmentId: string;
  procedureId: string | null | undefined;
  savedProcedureId: string | null | undefined;
}) {
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<AppointmentConsumptionPreview | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [qtys, setQtys] = useState<QtyDraft>({});
  const [loading, setLoading] = useState(false);
  const procedureSynced =
    Boolean(procedureId) && procedureId === (savedProcedureId ?? "");

  useEffect(() => {
    if (!procedureId || !procedureSynced) {
      setVisible(false);
      setPreview(null);
      setOpen(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getAppointmentConsumptionPreview(
        appointmentId,
        procedureId,
      );
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setVisible(false);
        return;
      }
      if (!res.preview) {
        setVisible(false);
        setPreview(null);
        return;
      }
      setPreview(res.preview);
      setVisible(true);
      const draft: QtyDraft = {};
      for (const item of res.preview.items) {
        draft[item.productId] = String(item.quantity);
      }
      setQtys(draft);
    })();

    return () => {
      cancelled = true;
    };
  }, [appointmentId, procedureId, procedureSynced]);

  if (!procedureId) return null;

  if (!procedureSynced) {
    return (
      <div className="rounded-xl bg-muted/40 px-3 py-3 text-sm text-ink-muted ring-1 ring-line">
        Salve o agendamento com o procedimento atual para baixar o estoque.
      </div>
    );
  }

  if (!visible || !preview) return null;

  function confirmConsume() {
    if (!preview) return;
    const items = preview.items.map((item) => {
      const raw = qtys[item.productId] ?? String(item.quantity);
      const quantity = Number.parseFloat(raw.replace(",", "."));
      return { productId: item.productId, quantity };
    });

    for (const item of items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        notifyError(null, "Quantidades devem ser maiores que zero.");
        return;
      }
    }

    startTransition(async () => {
      const res = await consumeAppointmentStock({
        appointmentId,
        items,
      });
      if (!res.ok) {
        notifyError(null, res.error);
        return;
      }
      notifySuccess("Estoque baixado.");
      setOpen(false);
      setPreview({ ...preview, alreadyConsumed: true });
    });
  }

  return (
    <div className="rounded-xl bg-muted/40 px-3 py-3 ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink">Estoque do procedimento</p>
          <p className="text-xs text-ink-muted">
            {preview.procedureName}
            {preview.alreadyConsumed ? " · baixa já registrada" : ""}
          </p>
        </div>
        {!preview.alreadyConsumed ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setOpen((v) => !v)}
            disabled={loading || pending}
          >
            <PackageMinus className="mr-1 h-3.5 w-3.5" aria-hidden />
            {open ? "Fechar" : "Baixar estoque"}
          </Button>
        ) : (
          <span className="text-xs font-medium text-ink-muted">Já baixado</span>
        )}
      </div>

      {open && !preview.alreadyConsumed ? (
        <div className="mt-3 space-y-3">
          <ul className="space-y-2">
            {preview.items.map((item) => {
              const insufficient =
                item.isArchived ||
                item.stockQuantity <
                  (Number.parseFloat(
                    (qtys[item.productId] ?? "0").replace(",", "."),
                  ) || 0);
              return (
                <li
                  key={item.productId}
                  className="grid gap-2 rounded-lg bg-surface px-3 py-2 ring-1 ring-line sm:grid-cols-[1fr_100px]"
                >
                  <div>
                    <div className="text-sm text-ink">{item.productName}</div>
                    <div
                      className={`text-xs ${insufficient ? "text-danger" : "text-ink-muted"}`}
                    >
                      Estoque: {item.stockQuantity} {item.unit}
                      {item.isArchived ? " · excluído" : ""}
                    </div>
                  </div>
                  <Input
                    inputMode="decimal"
                    value={qtys[item.productId] ?? ""}
                    onChange={(e) =>
                      setQtys((prev) => ({
                        ...prev,
                        [item.productId]: e.target.value,
                      }))
                    }
                    disabled={pending || item.isArchived}
                    aria-label={`Quantidade de ${item.productName}`}
                  />
                </li>
              );
            })}
          </ul>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={confirmConsume}
              loading={pending}
              loadingLabel="Baixando..."
            >
              Confirmar baixa
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
