"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  DigitalSignaturePad,
  type DigitalSignaturePadHandle,
} from "@/components/ui/digital-signature-pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  uploadMyProfileSignature,
  uploadMyProfileStamp,
} from "@/lib/profiles/professional-asset-actions";
import { notifyError, notifySuccess } from "@/lib/ui/notify";

type Props = {
  hasStamp: boolean;
  hasSignature: boolean;
};

export function ProfessionalAssetsForm({ hasStamp, hasSignature }: Props) {
  const router = useRouter();
  const sigRef = useRef<DigitalSignaturePadHandle>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function uploadStamp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    const fd = new FormData(e.currentTarget);
    const formEl = e.currentTarget;
    startTransition(async () => {
      const r = await uploadMyProfileStamp(fd);
      if (r.ok) {
        setOkMsg("Carimbo atualizado.");
        notifySuccess("Carimbo atualizado.");
        formEl.reset();
        router.refresh();
        return;
      }
      setError(r.error);
      notifyError(null, r.error);
    });
  }

  function saveSignature() {
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const blob = await sigRef.current?.toPngBlob();
      if (!blob) {
        const msg = "Desenhe sua assinatura na área antes de salvar.";
        setError(msg);
        notifyError(null, msg);
        return;
      }
      const fd = new FormData();
      fd.append(
        "signature",
        new File([blob], "signature.png", { type: "image/png" }),
      );
      const r = await uploadMyProfileSignature(fd);
      if (r.ok) {
        setOkMsg("Assinatura digital salva.");
        notifySuccess("Assinatura digital salva.");
        sigRef.current?.clear();
        router.refresh();
        return;
      }
      setError(r.error);
      notifyError(null, r.error);
    });
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-ink-muted">
        O carimbo continua sendo um arquivo de imagem. A assinatura é sempre
        capturada na área digital (traço na tela). Nos contratos usam-se os
        placeholders{" "}
        <code className="rounded bg-muted px-1">{"{{professional.stamp}}"}</code>{" "}
        e{" "}
        <code className="rounded bg-muted px-1">
          {"{{professional.signature}}"}
        </code>
        .
      </p>

      {okMsg ? (
        <p className="text-sm text-brand" role="status">
          {okMsg}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <form className="space-y-3" onSubmit={uploadStamp}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label htmlFor="stamp">Carimbo (imagem)</Label>
            <Input
              id="stamp"
              name="stamp"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              disabled={pending}
            />
          </div>
          <Button type="submit" loading={pending} variant="secondary">
            {hasStamp ? "Substituir carimbo" : "Salvar carimbo"}
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        <DigitalSignaturePad
          ref={sigRef}
          label="Assinatura digital"
        />
        <Button
          type="button"
          loading={pending}
          variant="secondary"
          onClick={saveSignature}
        >
          {hasSignature ? "Substituir assinatura digital" : "Salvar assinatura digital"}
        </Button>
      </div>
    </div>
  );
}
