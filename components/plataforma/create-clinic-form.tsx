"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugifyName } from "@/lib/strings";

export function CreateClinicForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const slugRaw = String(fd.get("slug") ?? "").trim();
    const slug = slugRaw ? slugifyName(slugRaw) : "";
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
      const raw = await res.text();
      let body: {
        error?: string;
        issues?: {
          fieldErrors?: Record<string, string[] | undefined>;
          formErrors?: string[];
        };
      } = {};
      if (raw) {
        try {
          body = JSON.parse(raw) as typeof body;
        } catch {
          setError(
            `Resposta inválida (${res.status}). Verifique o terminal do servidor ou se SUPABASE_SERVICE_ROLE_KEY está definida.`,
          );
          return;
        }
      }
      if (!res.ok) {
        const fieldErrors = body.issues?.fieldErrors ?? {};
        const fromFields = Object.values(fieldErrors)
          .flat()
          .filter(Boolean)
          .join(" ");
        const fromForm = (body.issues?.formErrors ?? []).filter(Boolean).join(" ");
        const detail = [fromFields, fromForm].filter(Boolean).join(" ");
        setError(
          detail ||
            body.error ||
            `Falha (${res.status} ${res.statusText || ""}).`.trim(),
        );
        return;
      }
      form.reset();
      onCreated?.();
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
              onBlur={(e) => {
                const next = slugifyName(e.currentTarget.value || "");
                if (next && next !== e.currentTarget.value) {
                  e.currentTarget.value = next;
                }
              }}
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
