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

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

export function AppointmentStockConsume({
  appointmentId,
  procedureIds,
  savedProcedureIds,
}: {
  appointmentId: string;
  procedureIds: string[];
  savedProcedureIds: string[];
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
    procedureIds.length > 0 && sameIds(procedureIds, savedProcedureIds);

  useEffect(() => {
    if (procedureIds.length === 0 || !procedureSynced) {
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
        procedureIds,
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
  }, [appointmentId, procedureIds, procedureSynced]);

  if (procedureIds.length === 0) return null;
  if (!procedureSynced) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-muted/20 px-3 py-2 text-xs text-ink-muted">
        Salve os procedimentos do atendimento para liberar a baixa de estoque.
      </p>
    );
  }
  if (!visible || !preview) {
    if (loading) {
      return (
        <p className="text-xs text-ink-muted">Carregando insumos do BOM…</p>
      );
    }
    return null;
  }

  return (
    <div className="rounded-2xl border border-line/70 bg-muted/15 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">Baixa de estoque</p>
          <p className="text-xs text-ink-muted">
            BOM agregado: {preview.procedureNames.join(", ")}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={() => setOpen((v) => !v)}
        >
          <PackageMinus className="h-3.5 w-3.5" aria-hidden />
          {open ? "Fechar" : "Baixar estoque"}
        </Button>
      </div>

      {open ? (
        <div className="mt-3 space-y-2">
          {preview.alreadyConsumed ? (
            <p className="text-sm text-warn">
              Estoque deste atendimento já foi baixado.
            </p>
          ) : (
            <>
              {preview.items.map((item) => (
                <div
                  key={item.productId}
                  className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl bg-surface px-3 py-2 ring-1 ring-line/60"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {item.productName}
                    </p>
                    <p className="text-xs text-ink-muted">
                      Estoque: {item.stockQuantity} {item.unit}
                      {item.isArchived ? " · excluído" : ""}
                    </p>
                  </div>
                  <Input
                    className="h-8 w-24"
                    inputMode="decimal"
                    value={qtys[item.productId] ?? ""}
                    onChange={(e) =>
                      setQtys((prev) => ({
                        ...prev,
                        [item.productId]: e.target.value,
                      }))
                    }
                    disabled={pending || item.isArchived}
                  />
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                loading={pending}
                loadingLabel="Baixando..."
                disabled={preview.items.some((item) => item.isArchived)}
                onClick={() => {
                  startTransition(async () => {
                    const items = preview.items
                      .map((item) => ({
                        productId: item.productId,
                        quantity: Number.parseFloat(
                          (qtys[item.productId] ?? "").replace(",", "."),
                        ),
                      }))
                      .filter(
                        (item) =>
                          Number.isFinite(item.quantity) && item.quantity > 0,
                      );
                    if (items.length === 0) {
                      notifyError(null, "Informe ao menos uma quantidade.");
                      return;
                    }
                    const result = await consumeAppointmentStock({
                      appointmentId,
                      items,
                    });
                    if (!result.ok) {
                      notifyError(null, result.error);
                      return;
                    }
                    notifySuccess("Estoque baixado para o atendimento.");
                    setPreview({ ...preview, alreadyConsumed: true });
                    setOpen(false);
                  });
                }}
              >
                Confirmar baixa
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
