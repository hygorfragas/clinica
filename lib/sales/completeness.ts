import type { ClinicSupabaseClient } from "@/lib/clients/clinical-tenant-context";

export type ClientCompleteness = {
  clientId: string;
  hasBasicProfile: boolean;
  hasAnamnesis: boolean;
  missing: string[];
  basicProfile: {
    hasFullName: boolean;
    hasCpf: boolean;
    hasContact: boolean;
    missingFields: string[];
  };
};

export type SaleFeasibility = ClientCompleteness & {
  hasSignedContractForProcedure: boolean;
  canSell: boolean;
  contract: {
    required: boolean;
    hasTemplate: boolean;
    hasSignedDocument: boolean;
    missingItems: string[];
  };
};

/** Considera básico: nome, cpf, e (telefone ou e-mail). */
export async function computeClientCompleteness(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  clientId: string,
): Promise<ClientCompleteness> {
  const missing: string[] = [];

  const { data: c } = await supabase
    .schema("clinic")
    .from("clients")
    .select("full_name, cpf, phone, email")
    .eq("id", clientId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const hasFullName = Boolean(c?.full_name?.trim());
  const hasCpf = Boolean(c?.cpf?.trim());
  const hasContact = Boolean((c?.phone ?? "").trim() || (c?.email ?? "").trim());
  const missingFields: string[] = [];

  if (!hasFullName) missingFields.push("nome completo");
  if (!hasCpf) missingFields.push("CPF");
  if (!hasContact) missingFields.push("telefone ou e-mail");

  const hasBasicProfile = missingFields.length === 0;
  if (!hasBasicProfile) missing.push("cadastro básico da paciente");

  const { data: anam } = await supabase
    .schema("clinic")
    .from("anamnesis_submissions")
    .select("status")
    .eq("client_id", clientId)
    .eq("tenant_id", tenantId)
    .in("status", ["submitted", "signed"])
    .limit(1)
    .maybeSingle();
  const hasAnamnesis = Boolean(anam);
  if (!hasAnamnesis) missing.push("anamnese finalizada");

  return {
    clientId,
    hasBasicProfile,
    hasAnamnesis,
    missing,
    basicProfile: {
      hasFullName,
      hasCpf,
      hasContact,
      missingFields,
    },
  };
}

/** Checa se há contrato assinado para um procedimento específico deste cliente. */
export async function hasSignedContractForProcedure(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  clientId: string,
  contractTemplateId: string | null,
): Promise<boolean> {
  if (!contractTemplateId) return true;

  const { data } = await supabase
    .schema("clinic")
    .from("documents")
    .select("id, signed_at, source_template_id")
    .eq("tenant_id", tenantId)
    .eq("client_id", clientId)
    .eq("source_template_id", contractTemplateId)
    .not("signed_at", "is", null)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

export async function computeSaleFeasibility(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  clientId: string,
  procedureId: string,
): Promise<SaleFeasibility> {
  const base = await computeClientCompleteness(supabase, tenantId, clientId);

  const { data: proc } = await supabase
    .schema("clinic")
    .from("procedures")
    .select("id, contract_template_id, requires_signed_contract")
    .eq("id", procedureId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  let hasSignedContract = true;
  const missing = [...base.missing];
  const contract = {
    required: Boolean(proc?.requires_signed_contract),
    hasTemplate: true,
    hasSignedDocument: true,
    missingItems: [] as string[],
  };

  if (proc?.requires_signed_contract) {
    if (!proc.contract_template_id) {
      missing.push("template de contrato no procedimento");
      contract.hasTemplate = false;
      contract.hasSignedDocument = false;
      contract.missingItems.push("Vincular template de contrato ao procedimento");
      hasSignedContract = false;
    } else {
      hasSignedContract = await hasSignedContractForProcedure(
        supabase,
        tenantId,
        clientId,
        proc.contract_template_id,
      );
      contract.hasSignedDocument = hasSignedContract;
      if (!hasSignedContract) {
        missing.push("contrato assinado deste procedimento");
        contract.missingItems.push(
          "Coletar assinatura do contrato para este procedimento",
        );
      }
    }
  }

  return {
    ...base,
    hasSignedContractForProcedure: hasSignedContract,
    canSell:
      base.hasBasicProfile && base.hasAnamnesis && hasSignedContract,
    missing,
    contract,
  };
}
