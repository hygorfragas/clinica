"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPatient } from "@/lib/clients/actions";
import {
  createPatientSchema,
  type CreatePatientFormValues,
  type CreatePatientParsed,
} from "@/lib/clients/schemas";
import { cn } from "@/lib/utils";

const textareaClass =
  "min-h-[6rem] w-full resize-y rounded-md border border-line bg-[#f3f1ee] px-3 py-2 text-sm text-ink shadow-none transition-colors placeholder:text-ink-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50";

export function NovoPacienteForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CreatePatientFormValues>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      birth_date: "",
      notes: "",
    },
  });

  function onSubmit(values: CreatePatientParsed) {
    setServerError(null);
    startTransition(async () => {
      const result = await createPatient(values);
      if (result.ok) {
        router.push(`/pacientes/${result.id}`);
        router.refresh();
        return;
      }
      setServerError(result.error);
    });
  }

  return (
    <Card className="rounded-[1.75rem] border-0 bg-surface shadow-lift ring-1 ring-line">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-lg font-semibold text-ink">
          Dados da paciente
        </CardTitle>
        <CardDescription className="text-sm text-ink-muted">
          Nome é obrigatório. Demais campos ajudam no contato e no prontuário.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input
              id="full_name"
              autoComplete="name"
              placeholder="Ex.: Maria Silva"
              aria-invalid={!!form.formState.errors.full_name}
              {...form.register("full_name")}
            />
            {form.formState.errors.full_name && (
              <p className="text-sm text-danger" role="alert">
                {form.formState.errors.full_name.message}
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                aria-invalid={!!form.formState.errors.phone}
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-danger" role="alert">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="opcional"
                aria-invalid={!!form.formState.errors.email}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-danger" role="alert">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_date">Data de nascimento</Label>
            <Input
              id="birth_date"
              type="date"
              aria-invalid={!!form.formState.errors.birth_date}
              {...form.register("birth_date")}
            />
            {form.formState.errors.birth_date && (
              <p className="text-sm text-danger" role="alert">
                {form.formState.errors.birth_date.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <textarea
              id="notes"
              rows={4}
              className={textareaClass}
              placeholder="Anotações gerais (alergias relevantes, preferências de contato…)"
              aria-invalid={!!form.formState.errors.notes}
              {...form.register("notes")}
            />
            {form.formState.errors.notes && (
              <p className="text-sm text-danger" role="alert">
                {form.formState.errors.notes.message}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-danger" role="alert">
              {serverError}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar paciente"}
            </Button>
            <Link
              href="/pacientes"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                pending && "pointer-events-none opacity-50",
              )}
            >
              Cancelar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
