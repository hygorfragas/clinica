"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { notifyError, notifySuccess } from "@/lib/ui/notify";

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

export function CadastroSuperAdminForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

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
      const { data, error: signError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.fullName },
        },
      });
      if (signError) {
        setError(signError.message);
        notifyError(signError, signError.message);
        return;
      }

      if (data.user && !data.session) {
        setRegisteredEmail(values.email);
        setAwaitingEmailConfirm(true);
        notifySuccess("Conta criada. Confirme seu e-mail.");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const msg = "Conta criada, mas a sessão não iniciou. Tente entrar pelo login.";
        setError(msg);
        notifyError(null, msg);
        return;
      }
      notifySuccess("Super administrador criado.");
      window.location.assign("/plataforma");
    } finally {
      setLoading(false);
    }
  }

  if (awaitingEmailConfirm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Confirme seu e-mail</CardTitle>
          <CardDescription>
            O Supabase está com confirmação de e-mail ativa. Abra o link enviado
            para <strong>{registeredEmail}</strong> e depois faça login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-ink-muted">
          <p>
            Em desenvolvimento, você pode desativar &quot;Confirm email&quot; em
            Authentication → Providers → Email no painel do Supabase, ou
            confirmar o usuário manualmente em Authentication → Users.
          </p>
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
          Esta conta é única na plataforma: só ela poderá cadastrar clínicas.
          Depois deste cadastro, o link de criação some da tela de login.
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
            <Input
              id="fullName"
              autoComplete="name"
              {...form.register("fullName")}
            />
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
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            loadingLabel="Criando conta..."
          >
            Criar super administrador
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
