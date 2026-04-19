"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha com pelo menos 8 caracteres"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ signupOpen }: { signupOpen: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setError(null);
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("Sessão não iniciada. Tente novamente.");
        return;
      }
      // Navegação completa: garante que os cookies da sessão cheguem ao servidor
      // (router.push sozinho costuma correr antes do SSR enxergar a sessão).
      window.location.assign("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>
          {signupOpen
            ? "Use o e-mail e a senha da sua conta. Se esta for a primeira conta da plataforma, use Cadastro do super administrador (abaixo)."
            : "Use o e-mail e a senha fornecidos pelo administrador da sua clínica ou da plataforma."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
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
              autoComplete="current-password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-danger">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        {signupOpen ? (
          <p className="mt-4 text-center text-sm text-ink-muted">
            Primeira vez na plataforma (super admin)?{" "}
            <Link
              href="/cadastro"
              className="font-medium text-brand hover:underline"
            >
              Criar super administrador
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
