"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DigitalSignaturePad,
  type DigitalSignaturePadHandle,
} from "@/components/ui/digital-signature-pad";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notifyError, notifySuccess } from "@/lib/ui/notify";

export function InviteAgentForm() {
  const router = useRouter();
  const sigRef = useRef<DigitalSignaturePadHandle>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    const blob = await sigRef.current?.toPngBlob();
    if (blob) {
      fd.append(
        "signature",
        new File([blob], "signature.png", { type: "image/png" }),
      );
    }

    setLoading(true);
    try {
      const res = await fetch("/api/clinica/equipe/agentes", {
        method: "POST",
        body: fd,
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        const msg = body.error ?? "Não foi possível criar o acesso.";
        setError(msg);
        notifyError(null, msg);
        return;
      }
      notifySuccess("Profissional cadastrado.");
      form.reset();
      sigRef.current?.clear();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo profissional</CardTitle>
        <CardDescription>
          Cria um usuário com acesso à operação desta clínica. O carimbo pode ser
          um arquivo de imagem; a assinatura é capturada na área digital abaixo
          (não envie arquivo de assinatura).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={onSubmit}
          encType="multipart/form-data"
        >
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              minLength={2}
              autoComplete="name"
              placeholder="Nome da profissional"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail (login)</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="nome@clinica.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha inicial</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="professionalRegistration">
              Registro profissional (CRM / CRO / …)
            </Label>
            <Input
              id="professionalRegistration"
              name="professionalRegistration"
              maxLength={80}
              placeholder="Opcional"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" name="cpf" autoComplete="off" placeholder="Opcional" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" name="address" placeholder="Opcional" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stamp">Carimbo (PNG / JPG / WebP)</Label>
            <Input
              id="stamp"
              name="stamp"
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
            <p className="text-xs text-ink-muted">
              Apenas o carimbo é enviado como arquivo. A assinatura é sempre
              digital na área abaixo.
            </p>
          </div>

          <DigitalSignaturePad
            ref={sigRef}
            label="Assinatura digital (opcional)"
          />

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={loading} loadingLabel="Criando...">
            Criar profissional
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
