import { CLINICAL_BUCKET } from "@/lib/clinical/storage";
import type { ClinicSupabaseClient } from "@/lib/clients/clinical-tenant-context";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayOrDash(v: string | null | undefined): string {
  const t = v?.trim();
  return t && t.length > 0 ? escapeHtml(t) : "—";
}

/** Substitui placeholders do paciente no HTML do modelo (editor de contratos). */
export function applyClientContractPlaceholders(
  html: string,
  client: {
    full_name: string;
    email: string | null;
    phone: string | null;
    cpf: string | null;
    address: string | null;
  },
): string {
  let out = html;
  const map: [string, string][] = [
    ["{{client.full_name}}", displayOrDash(client.full_name)],
    ["{{client.email}}", displayOrDash(client.email)],
    ["{{client.phone}}", displayOrDash(client.phone)],
    ["{{client.cpf}}", displayOrDash(client.cpf)],
    ["{{client.document}}", displayOrDash(client.cpf)],
    ["{{client.address}}", displayOrDash(client.address)],
  ];
  for (const [key, val] of map) {
    out = out.split(key).join(val);
  }
  return out;
}

function toDataUrl(mime: string, base64: string): string {
  return `data:${mime};base64,${base64}`;
}

async function downloadAsDataUrl(
  supabase: ClinicSupabaseClient,
  storageKey: string,
): Promise<{ dataUrl: string } | null> {
  const { data, error } = await supabase.storage
    .from(CLINICAL_BUCKET)
    .download(storageKey);
  if (error || !data) return null;
  const buf = Buffer.from(await data.arrayBuffer());
  const mime = data.type || "image/png";
  return { dataUrl: toDataUrl(mime, buf.toString("base64")) };
}

const SIG_PENDING =
  '<span data-contract-pending="professional-signature">Assinatura da profissional pendente — cadastre em Configurações › Profissional ou assine digitalmente ao finalizar o termo.</span>';

/**
 * Injeta nome/registro e imagens (base64) da profissional logada.
 * Usa placeholders {{professional.signature}} e {{professional.stamp}} no modelo.
 */
export async function applyProfessionalContractPlaceholders(
  supabase: ClinicSupabaseClient,
  html: string,
  professional: {
    full_name: string | null;
    professional_registration: string | null;
    signature_storage_key: string | null;
    stamp_storage_key: string | null;
  },
): Promise<string> {
  let out = html;
  out = out
    .split("{{professional.full_name}}")
    .join(displayOrDash(professional.full_name));
  out = out
    .split("{{professional.registration}}")
    .join(displayOrDash(professional.professional_registration));

  if (professional.signature_storage_key?.trim()) {
    const dl = await downloadAsDataUrl(
      supabase,
      professional.signature_storage_key.trim(),
    );
    if (dl) {
      const img = `<img src="${dl.dataUrl}" alt="Assinatura da profissional" style="max-height:72px;object-fit:contain;" />`;
      out = out.split("{{professional.signature}}").join(img);
    } else {
      out = out.split("{{professional.signature}}").join(SIG_PENDING);
    }
  } else {
    out = out.split("{{professional.signature}}").join(SIG_PENDING);
  }

  if (professional.stamp_storage_key?.trim()) {
    const dl = await downloadAsDataUrl(
      supabase,
      professional.stamp_storage_key.trim(),
    );
    if (dl) {
      const img = `<img src="${dl.dataUrl}" alt="Carimbo" style="max-height:96px;object-fit:contain;" />`;
      out = out.split("{{professional.stamp}}").join(img);
    } else {
      out = out.split("{{professional.stamp}}").join("");
    }
  } else {
    out = out.split("{{professional.stamp}}").join("");
  }

  return out;
}
