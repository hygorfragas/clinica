"use server";

import { revalidatePath } from "next/cache";
import {
  canAccessAgenda,
  fetchClinicProfile,
} from "@/lib/auth/clinic-profile";
import { createPatientSchema } from "@/lib/clients/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CreatePatientResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createPatient(
  raw: unknown,
): Promise<CreatePatientResult> {
  const parsed = createPatientSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Dados inválidos";
    return { ok: false, error: msg };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile?.tenant_id || !canAccessAgenda(profile)) {
    return { ok: false, error: "Sem permissão para cadastrar pacientes." };
  }

  const row = {
    tenant_id: profile.tenant_id,
    full_name: parsed.data.full_name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    birth_date: parsed.data.birth_date,
    notes: parsed.data.notes,
  };

  const { data, error } = await supabase
    .schema("clinic")
    .from("clients")
    .insert(row)
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error:
        error?.message ??
        "Não foi possível salvar. Verifique os dados e tente de novo.",
    };
  }

  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${data.id}`);

  return { ok: true, id: data.id };
}
