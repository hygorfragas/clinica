"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateClinicForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const slug = String(fd.get("slug") ?? "").trim();
    const adminFullName = String(fd.get("adminFullName") ?? "").trim();
    const adminEmail = String(fd.get("adminEmail") ?? "").trim();
    const adminPassword = String(fd.get("adminPassword") ?? "");

    setLoading(true);
    try {
      const res = await fetch("/api/plataforma/clinicas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          adminFullName: adminFullName || undefined,
          adminEmail: adminEmail || undefined,
          adminPassword: adminPassword || undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Não foi possível criar a clínica.");
        return;
      }
      e.currentTarget.reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova clínica</CardTitle>
        <CardDescription>
          Cada clínica fica isolada no banco por políticas de segurança (RLS).
          Opcionalmente, crie o primeiro administrador com acesso à agenda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Nome da clínica</Label>
            <Input id="name" name="name" required minLength={2} placeholder="Studio Exemplo" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (opcional)</Label>
            <Input
              id="slug"
              name="slug"
              placeholder="studio-exemplo"
              pattern="[a-z0-9-]*"
            />
            <p className="text-xs text-ink-subtle">
              Apenas letras minúsculas, números e hífen. Se vazio, geramos a
              partir do nome.
            </p>
          </div>
          <hr className="border-line" />
          <p className="text-sm font-medium text-ink">
            Primeiro administrador (opcional)
          </p>
          <div className="space-y-2">
            <Label htmlFor="adminFullName">Nome completo</Label>
            <Input id="adminFullName" name="adminFullName" placeholder="Maria Silva" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminEmail">E-mail do administrador</Label>
            <Input
              id="adminEmail"
              name="adminEmail"
              type="email"
              placeholder="maria@clinica.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminPassword">Senha inicial</Label>
            <Input
              id="adminPassword"
              name="adminPassword"
              type="password"
              minLength={8}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando…" : "Criar clínica"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
