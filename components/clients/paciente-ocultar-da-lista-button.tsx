"use client";

import { UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { hidePatientFromUi } from "@/lib/clients/record-actions";
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

export function PacienteOcultarDaListaButton({
  clientId,
  afterSuccess = "redirect",
  className,
  label = "Ocultar da lista",
  variant = "secondary",
  compact = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    const ok = window.confirm(
      "A paciente deixará de aparecer na lista e na ficha. Os dados permanecem no banco (apenas deixam de ser exibidos na interface). Deseja continuar?",
    );
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const result = await hidePatientFromUi(clientId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (afterSuccess === "redirect") {
        router.push("/pacientes");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={cn("flex flex-col items-stretch gap-1", className)}>
      <Button
        type="button"
        variant={variant}
        disabled={pending}
        onClick={onClick}
        className={cn(
          compact && "h-9 shrink-0 px-3",
          variant === "ghost" && "text-danger hover:bg-danger/10 hover:text-danger",
        )}
        title={compact ? label : undefined}
      >
        <UserX className={cn("h-4 w-4", !compact && "mr-2")} aria-hidden />
        {!compact ? (pending ? "Ocultando…" : label) : null}
      </Button>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
