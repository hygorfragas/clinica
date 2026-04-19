"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePatient } from "@/lib/clients/record-actions";
import {
  createPatientSchema,
  type CreatePatientFormValues,
  type CreatePatientParsed,
} from "@/lib/clients/schemas";
const textareaClass =
  "min-h-[5rem] w-full resize-y rounded-md border border-line bg-[#f3f1ee] px-3 py-2 text-sm text-ink shadow-none transition-colors placeholder:text-ink-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  clientId: string;
  initial: CreatePatientFormValues;
};

/** Mesmos campos do cadastro; grava com `updatePatient`. */
export function PacienteDadosEditor({ clientId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const form = useForm<CreatePatientFormValues>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: initial,
  });

  function onSubmit(values: CreatePatientParsed) {
    setServerError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updatePatient(clientId, values);
      if (result.ok) {
        setSaved(true);
        router.refresh();
        return;
      }
      setServerError(result.error);
    });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="edit_full_name">Nome completo</Label>
          <Input
            id="edit_full_name"
            {...form.register("full_name")}
            aria-invalid={!!form.formState.errors.full_name}
          />
          {form.formState.errors.full_name && (
            <p className="text-sm text-danger" role="alert">
              {form.formState.errors.full_name.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_phone">Telefone</Label>
          <Input id="edit_phone" type="tel" {...form.register("phone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_email">E-mail</Label>
          <Input id="edit_email" type="email" {...form.register("email")} />
          {form.formState.errors.email && (
            <p className="text-sm text-danger" role="alert">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_cpf">CPF / documento</Label>
          <Input id="edit_cpf" {...form.register("cpf")} />
          {form.formState.errors.cpf && (
            <p className="text-sm text-danger" role="alert">
              {form.formState.errors.cpf.message}
            </p>
          )}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="edit_address">Endereço</Label>
          <Input id="edit_address" {...form.register("address")} />
          {form.formState.errors.address && (
            <p className="text-sm text-danger" role="alert">
              {form.formState.errors.address.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_birth">Data de nascimento</Label>
          <Input id="edit_birth" type="date" {...form.register("birth_date")} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="edit_notes">Observações gerais</Label>
          <textarea
            id="edit_notes"
            className={textareaClass}
            {...form.register("notes")}
          />
        </div>
      </div>

      {serverError && (
        <p className="text-sm text-danger" role="alert">
          {serverError}
        </p>
      )}
      {saved && (
        <p className="text-sm text-brand" role="status">
          Dados salvos.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar alterações"}
      </Button>
    </form>
  );
}
