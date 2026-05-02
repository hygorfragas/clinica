"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { hidePatientFromUi } from "@/lib/clients/record-actions";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
import { cn } from "@/lib/utils";

type Props = {
  clientId: string;
  /** Na ficha: redireciona para /pacientes. Na lista: só atualiza a tabela. */
  afterSuccess?: "redirect" | "refresh";
  className?: string;
  /** Texto visível (em linhas compactas use ícone + title). */
  label?: string;
  variant?: "secondary" | "ghost";
  compact?: boolean;
};

/**
 * UX: o botão é apresentado como "Excluir" para a usuária, mas internamente
 * apenas marca `hidden_from_ui_at` (soft-delete). Os dados ficam preservados
 * no banco para auditoria, vínculos com vendas, anamneses anteriores etc.
 */
export function PacienteOcultarDaListaButton({
  clientId,
  afterSuccess = "redirect",
  className,
  label = "Excluir",
  variant = "secondary",
  compact = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirm, element: confirmDialog } = useConfirmDialog();

  function onClick() {
    confirm({
      title: "Excluir paciente",
      description:
        "A paciente será removida da lista e da ficha. Esta ação é definitiva do ponto de vista da operação — você não conseguirá mais acessá-la pela interface.",
      confirmLabel: "Excluir",
      destructive: true,
      onConfirm: () =>
        new Promise<void>((resolve, reject) => {
          setError(null);
          startTransition(async () => {
            const result = await hidePatientFromUi(clientId);
            if (!result.ok) {
              setError(result.error);
              notifyError(null, result.error);
              reject(new Error(result.error));
              return;
            }
            notifySuccess("Paciente excluída.");
            if (afterSuccess === "redirect") {
              router.push("/pacientes");
            } else {
              router.refresh();
            }
            resolve();
          });
        }),
    });
  }

  return (
    <div className={cn("flex flex-col items-stretch gap-1", className)}>
      {confirmDialog}
      <Button
        type="button"
        variant={variant}
        loading={pending}
        loadingLabel="Excluindo..."
        onClick={onClick}
        className={cn(
          compact && "h-9 shrink-0 px-3",
          variant === "ghost" && "text-danger hover:bg-danger/10 hover:text-danger",
        )}
        title={compact ? "Excluir" : undefined}
        aria-label="Excluir paciente"
      >
        <Trash2 className={cn("h-4 w-4", !compact && "mr-2")} aria-hidden />
        {!compact ? label : null}
      </Button>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
