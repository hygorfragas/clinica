"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  defaultAnamnesisPayload,
  type AnamnesisPayload,
} from "@/lib/anamnesis/schema";
import { saveAnamnesis } from "@/lib/clients/record-actions";
import { notifyError, notifySuccess } from "@/lib/ui/notify";

const textareaClass =
  "min-h-[4rem] w-full resize-y rounded-md border border-line bg-[#f3f1ee] px-3 py-2 text-sm text-ink shadow-none transition-colors placeholder:text-ink-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

const selectClass =
  "flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

type FormShape = {
  allergies_status: string;
  allergies_detail: string;
  medications: string;
  chronic_conditions: string;
  skin_type: string;
  routine_products: string;
  recent_peels_or_laser: string;
  sun_exposure: string;
  smokes: string;
  pregnant_or_breastfeeding: string;
  previous_aesthetic_procedures: string;
  main_concern: string;
  expectations: string;
  acknowledges_truthfulness: boolean;
  general_notes: string;
};

function payloadToForm(p: AnamnesisPayload): FormShape {
  return {
    allergies_status: p.allergies_status ?? "",
    allergies_detail: p.allergies_detail ?? "",
    medications: p.medications ?? "",
    chronic_conditions: p.chronic_conditions ?? "",
    skin_type: p.skin_type ?? "",
    routine_products: p.routine_products ?? "",
    recent_peels_or_laser: p.recent_peels_or_laser ?? "",
    sun_exposure: p.sun_exposure ?? "",
    smokes: p.smokes ?? "",
    pregnant_or_breastfeeding: p.pregnant_or_breastfeeding ?? "",
    previous_aesthetic_procedures: p.previous_aesthetic_procedures ?? "",
    main_concern: p.main_concern ?? "",
    expectations: p.expectations ?? "",
    acknowledges_truthfulness: p.acknowledges_truthfulness ?? false,
    general_notes: p.general_notes ?? "",
  };
}

export function PacienteAnamneseForm({
  clientId,
  initialPayload,
}: {
  clientId: string;
  initialPayload: AnamnesisPayload;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const merged: AnamnesisPayload = {
    ...defaultAnamnesisPayload,
    ...initialPayload,
  };

  const form = useForm<FormShape>({
    defaultValues: payloadToForm(merged),
  });

  function onSubmit(values: FormShape) {
    setServerError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveAnamnesis(clientId, {
        ...values,
        schema_version: 1,
      });
      if (result.ok) {
        setSaved(true);
        notifySuccess("Anamnese salva.");
        router.refresh();
        return;
      }
      setServerError(result.error);
      notifyError(null, result.error);
    });
  }

  return (
    <form className="space-y-10" onSubmit={form.handleSubmit(onSubmit)}>
      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Saúde e histórico
        </h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="allergies_status">Alergias conhecidas?</Label>
            <select
              id="allergies_status"
              className={selectClass}
              {...form.register("allergies_status")}
            >
              <option value="">Selecionar</option>
              <option value="unknown">Não informado</option>
              <option value="yes">Sim</option>
              <option value="no">Não</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="allergies_detail">Detalhe das alergias</Label>
            <textarea
              id="allergies_detail"
              className={textareaClass}
              {...form.register("allergies_detail")}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="medications">Medicamentos em uso</Label>
            <textarea
              id="medications"
              className={textareaClass}
              {...form.register("medications")}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="chronic_conditions">Condições de saúde relevantes</Label>
            <textarea
              id="chronic_conditions"
              className={textareaClass}
              {...form.register("chronic_conditions")}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Pele e hábitos
        </h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="skin_type">Tipo de pele / características</Label>
            <Input id="skin_type" {...form.register("skin_type")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="routine_products">Rotina de cuidados (produtos)</Label>
            <textarea
              id="routine_products"
              className={textareaClass}
              {...form.register("routine_products")}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="recent_peels_or_laser">
              Peelings, laser ou procedimentos recentes
            </Label>
            <textarea
              id="recent_peels_or_laser"
              className={textareaClass}
              {...form.register("recent_peels_or_laser")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sun_exposure">Exposição solar</Label>
            <select
              id="sun_exposure"
              className={selectClass}
              {...form.register("sun_exposure")}
            >
              <option value="">Selecionar</option>
              <option value="unknown">Não informado</option>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="smokes">Tabagismo</Label>
            <select id="smokes" className={selectClass} {...form.register("smokes")}>
              <option value="">Selecionar</option>
              <option value="unknown">Não informado</option>
              <option value="yes">Sim</option>
              <option value="no">Não</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Estética e expectativas
        </h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pregnant_or_breastfeeding">Gestante ou lactante</Label>
            <select
              id="pregnant_or_breastfeeding"
              className={selectClass}
              {...form.register("pregnant_or_breastfeeding")}
            >
              <option value="">Selecionar</option>
              <option value="unknown">Não informado</option>
              <option value="yes">Sim</option>
              <option value="no">Não</option>
              <option value="na">Não se aplica</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="previous_aesthetic_procedures">
              Procedimentos estéticos anteriores
            </Label>
            <textarea
              id="previous_aesthetic_procedures"
              className={textareaClass}
              {...form.register("previous_aesthetic_procedures")}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="main_concern">Principal queixa / interesse</Label>
            <textarea
              id="main_concern"
              className={textareaClass}
              {...form.register("main_concern")}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="expectations">Expectativas em relação ao tratamento</Label>
            <textarea
              id="expectations"
              className={textareaClass}
              {...form.register("expectations")}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-muted/40 p-6 ring-1 ring-line/60 md:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Declaração e notas
        </h2>
        <div className="mt-6 space-y-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-line text-brand focus:ring-brand/35"
              checked={!!form.watch("acknowledges_truthfulness")}
              onChange={(e) =>
                form.setValue("acknowledges_truthfulness", e.target.checked, {
                  shouldDirty: true,
                })
              }
            />
            <span>
              Declaro que as informações acima são verdadeiras e assumo a
              responsabilidade por omissões relevantes à segurança do
              procedimento.
            </span>
          </label>
          <div className="space-y-2">
            <Label htmlFor="general_notes">Observações adicionais da anamnese</Label>
            <textarea
              id="general_notes"
              className={textareaClass}
              rows={5}
              {...form.register("general_notes")}
            />
          </div>
        </div>
      </section>

      {serverError && (
        <p className="text-sm text-danger" role="alert">
          {serverError}
        </p>
      )}
      {saved && (
        <p className="text-sm text-brand" role="status">
          Anamnese salva.
        </p>
      )}

      <Button type="submit" loading={pending} loadingLabel="Salvando...">
        Salvar anamnese
      </Button>
    </form>
  );
}
