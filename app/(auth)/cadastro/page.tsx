"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseBootstrapStatus } from "@/lib/bootstrap";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const cadastroSchema = z
  .object({
    fullName: z.string().min(2, "Informe seu nome"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });

type CadastroValues = z.infer<typeof cadastroSchema>;

export default function CadastroPage() {
  const router = useRouter();
  const [bootLoading, setBootLoading] = useState(true);
  const [signupOpen, setSignupOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error: rpcError } = await supabase.rpc(
        "clinic_bootstrap_status",
      );
      if (cancelled) return;
      if (rpcError) {
        setSignupOpen(false);
        setBootLoading(false);
        return;
      }
      const b = parseBootstrapStatus(data);
      setSignupOpen(b.signupOpen);
      setBootLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const form = useForm<CadastroValues>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirm: "",
    },
  });

  async function onSubmit(values: CadastroValues) {
    setError(null);
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.fullName },
        },
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      router.refresh();
      router.push("/plataforma");
    } finally {
      setLoading(false);
    }
  }

  if (bootLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-ink-muted">
          Carregando…
        </CardContent>
      </Card>
    );
  }

  if (!signupOpen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cadastro indisponível</CardTitle>
          <CardDescription>
            Já existe um super administrador na plataforma. Novos usuários são
            criados pelo super administrador ou pelo administrador da clínica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            className="w-full"
            onClick={() => router.push("/login")}
          >
            Ir para o login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar super administrador</CardTitle>
        <CardDescription>
          Esta conta gerencia todas as clínicas no sistema. Depois deste passo,
          apenas este perfil poderá cadastrar novas clínicas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" autoComplete="name" {...form.register("fullName")} />
            {form.formState.errors.fullName && (
              <p className="text-sm text-danger">
                {form.formState.errors.fullName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-danger">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-danger">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              {...form.register("confirm")}
            />
            {form.formState.errors.confirm && (
              <p className="text-sm text-danger">
                {form.formState.errors.confirm.message}
              </p>
            )}
          </div>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Criando conta…" : "Criar super administrador"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-muted">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
