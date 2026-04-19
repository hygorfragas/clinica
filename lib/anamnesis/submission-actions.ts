"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  requireClinicalTenantContext,
  type ClinicSupabaseClient,
} from "@/lib/clients/clinical-tenant-context";
import {
  buildAnamnesisSubmissionStoragePath,
  CLINICAL_BUCKET,
} from "@/lib/clinical/storage";
import {
  anamnesisFieldsSchema,
  anamnesisFormValuesSchema,
  anamnesisStrokesSchema,
  ANAMNESIS_SUBMISSION_MODES,
  ANAMNESIS_SUBMISSION_STATUSES,
  type AnamnesisField,
  type AnamnesisFormValues,
  type AnamnesisStroke,
} from "./template-schema";
import {
  buildStrokeOutline,
  getStrokeRenderConfig,
  outlineToSvgPath,
} from "./stroke-geometry";

type Ok<T = unknown> = { ok: true } & T;
type Err = { ok: false; error: string };

const idSchema = z.string().uuid();

const saveInputSchema = z.object({
  submissionId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  mode: z.enum(ANAMNESIS_SUBMISSION_MODES),
  formValues: anamnesisFormValuesSchema.optional(),
  inkStrokes: anamnesisStrokesSchema.optional(),
  signerName: z.string().trim().max(200).optional(),
  status: z.enum(ANAMNESIS_SUBMISSION_STATUSES).optional(),
  /**
   * Quando `true`, pula `revalidatePath`. Útil para autosave: evita que o
   * refresh dispare re-geração de signed URLs (que faria o PDF parecer
   * "recarregar" a cada traço).
   */
  silent: z.boolean().optional(),
});
export type SaveAnamnesisSubmissionInput = z.infer<typeof saveInputSchema>;

export async function saveAnamnesisSubmission(
  clientId: string,
  input: SaveAnamnesisSubmissionInput,
): Promise<Ok<{ id: string }> | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const cid = idSchema.safeParse(clientId);
  if (!cid.success) return { ok: false, error: "Paciente inválido." };

  const parsed = saveInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Dados de submissão inválidos.",
    };
  }

  const body = {
    tenant_id: ctx.tenantId,
    client_id: cid.data,
    template_id: parsed.data.templateId ?? null,
    mode: parsed.data.mode,
    status: parsed.data.status ?? ("draft" as const),
    form_values: parsed.data.formValues ?? {},
    ink_strokes: parsed.data.inkStrokes ?? [],
    signer_name: parsed.data.signerName ?? null,
    created_by_profile_id: ctx.userId,
  };

  if (parsed.data.submissionId) {
    const { data, error } = await ctx.supabase
      .schema("clinic")
      .from("anamnesis_submissions")
      .update({
        mode: body.mode,
        status: body.status,
        form_values: body.form_values,
        ink_strokes: body.ink_strokes,
        signer_name: body.signer_name,
      })
      .eq("id", parsed.data.submissionId)
      .eq("tenant_id", ctx.tenantId)
      .select("id")
      .single();
    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "Falha ao salvar submissão.",
      };
    }
    if (!parsed.data.silent) {
      revalidatePath(`/pacientes/${cid.data}`);
      revalidatePath(`/pacientes/${cid.data}/anamnese`);
    }
    return { ok: true, id: data.id };
  }

  const { data, error } = await ctx.supabase
    .schema("clinic")
    .from("anamnesis_submissions")
    .insert(body)
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Falha ao salvar submissão.",
    };
  }

  if (!parsed.data.silent) {
    revalidatePath(`/pacientes/${cid.data}`);
    revalidatePath(`/pacientes/${cid.data}/anamnese`);
  }
  return { ok: true, id: data.id };
}

export async function submitAnamnesis(
  clientId: string,
  submissionId: string,
  input?: { signerName?: string | null },
): Promise<Ok<{ pdfPath: string }> | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const cid = idSchema.safeParse(clientId);
  const sid = idSchema.safeParse(submissionId);
  if (!cid.success || !sid.success) {
    return { ok: false, error: "Identificador inválido." };
  }

  const { data: submission } = await ctx.supabase
    .schema("clinic")
    .from("anamnesis_submissions")
    .select(
      "id, tenant_id, client_id, template_id, form_values, ink_strokes, signer_name, flattened_pdf_path",
    )
    .eq("id", sid.data)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (!submission) return { ok: false, error: "Submissão não encontrada." };

  let templatePdfBytes: Uint8Array | null = null;
  let formSchema: AnamnesisField[] = [];
  if (submission.template_id) {
    const { data: template } = await ctx.supabase
      .schema("clinic")
      .from("anamnesis_templates")
      .select("pdf_storage_path, form_schema")
      .eq("id", submission.template_id)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (template?.pdf_storage_path) {
      const { data: blob } = await ctx.supabase.storage
        .from(CLINICAL_BUCKET)
        .download(template.pdf_storage_path);
      if (blob) {
        const arrayBuffer = await blob.arrayBuffer();
        templatePdfBytes = new Uint8Array(arrayBuffer);
      }
      const parsed = anamnesisFieldsSchema.safeParse(template.form_schema);
      if (parsed.success) formSchema = parsed.data;
    }
  }

  const pdfBytes = await flattenSubmission({
    basePdfBytes: templatePdfBytes,
    formSchema,
    formValues: (submission.form_values as AnamnesisFormValues) ?? {},
    inkStrokes: (submission.ink_strokes as AnamnesisStroke[]) ?? [],
    signerName: input?.signerName ?? submission.signer_name ?? null,
  });

  const storagePath = buildAnamnesisSubmissionStoragePath({
    tenantId: ctx.tenantId,
    clientId: cid.data,
    submissionId: sid.data,
  });

  const { error: upErr } = await ctx.supabase.storage
    .from(CLINICAL_BUCKET)
    .upload(storagePath, Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) {
    return { ok: false, error: upErr.message ?? "Falha ao salvar PDF final." };
  }

  await persistSubmittedState(ctx.supabase, ctx.tenantId, sid.data, {
    storagePath,
    signerName: input?.signerName ?? submission.signer_name ?? null,
  });

  revalidatePath(`/pacientes/${cid.data}`);
  revalidatePath(`/pacientes/${cid.data}/anamnese`);

  return { ok: true, pdfPath: storagePath };
}

async function persistSubmittedState(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  submissionId: string,
  args: { storagePath: string; signerName: string | null },
): Promise<void> {
  await supabase
    .schema("clinic")
    .from("anamnesis_submissions")
    .update({
      status: args.signerName ? "signed" : "submitted",
      flattened_pdf_path: args.storagePath,
      signer_name: args.signerName,
      signed_at: args.signerName ? new Date().toISOString() : null,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .eq("tenant_id", tenantId);
}

async function flattenSubmission(params: {
  basePdfBytes: Uint8Array | null;
  formSchema: AnamnesisField[];
  formValues: AnamnesisFormValues;
  inkStrokes: AnamnesisStroke[];
  signerName: string | null;
}): Promise<Uint8Array> {
  const { basePdfBytes, formSchema, formValues, inkStrokes, signerName } =
    params;

  const doc = basePdfBytes
    ? await PDFDocument.load(basePdfBytes)
    : await PDFDocument.create();
  if (!basePdfBytes) {
    doc.addPage([595.28, 841.89]);
  }
  const pages = doc.getPages();
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  fillNativePdfFields(form, formValues);

  for (const field of formSchema) {
    const page = pages[field.page - 1];
    if (!page) continue;
    const { width: pw, height: ph } = page.getSize();
    const x = field.x * pw;
    const yTop = field.y * ph;
    const w = field.width * pw;
    const h = field.height * ph;
    const y = ph - yTop - h;
    const value = formValues[field.id];
    if (value === undefined || value === null || value === "") continue;

    if (field.type === "checkbox") {
      if (value === true) {
        page.drawRectangle({
          x,
          y,
          width: 10,
          height: 10,
          borderColor: rgb(0.1, 0.3, 0.2),
          borderWidth: 1,
        });
        page.drawText("X", {
          x: x + 2,
          y: y + 1.5,
          size: 10,
          font: boldFont,
          color: rgb(0.1, 0.3, 0.2),
        });
      }
      continue;
    }

    const text = String(value);
    const lines = wrapText(text, w, 10, font);
    const maxLines = Math.max(1, Math.floor(h / 12));
    const shown = lines.slice(0, maxLines);
    for (let i = 0; i < shown.length; i += 1) {
      page.drawText(shown[i], {
        x: x + 2,
        y: y + h - 12 * (i + 1),
        size: 10,
        font,
        color: rgb(0.05, 0.05, 0.05),
      });
    }
  }

  for (const stroke of inkStrokes) {
    const page = pages[stroke.page - 1];
    if (!page) continue;
    const { width: pw, height: ph } = page.getSize();
    const outline = buildStrokeOutline(stroke, pw, ph);
    if (outline.length < 3) continue;
    const color = hexToRgb(stroke.color ?? "#0f172a");
    const cfg = getStrokeRenderConfig(stroke.tool, stroke.width ?? 1.6, stroke.opacity);
    const svgPath = outlineToSvgPath(outline);
    page.drawSvgPath(svgPath, {
      x: 0,
      y: ph,
      color,
      borderColor: color,
      borderWidth: 0,
      opacity: cfg.opacity,
      borderOpacity: cfg.opacity,
    });
  }

  if (signerName) {
    const last = pages[pages.length - 1];
    const { height } = last.getSize();
    last.drawText(
      `Assinado por: ${signerName} — ${new Date().toLocaleString("pt-BR")}`,
      {
        x: 40,
        y: Math.min(40, height - 20),
        size: 9,
        font,
        color: rgb(0.25, 0.25, 0.25),
      },
    );
  }

  return await doc.save();
}

function fillNativePdfFields(
  form: ReturnType<PDFDocument["getForm"]>,
  formValues: AnamnesisFormValues,
) {
  const fields = form.getFields();
  for (const field of fields) {
    const name = field.getName();
    const value = formValues[name];
    if (value === undefined || value === null || value === "") continue;

    const constructorName =
      (field as { constructor?: { name?: string } }).constructor?.name ?? "";

    if (constructorName === "PDFTextField") {
      try {
        (field as unknown as { setText: (v: string) => void }).setText(
          String(value),
        );
      } catch {
        // Ignora campo inválido e segue o processamento
      }
      continue;
    }

    if (constructorName === "PDFCheckBox") {
      try {
        if (value === true || value === "true" || value === "on" || value === "1") {
          (field as unknown as { check: () => void }).check();
        } else {
          (field as unknown as { uncheck: () => void }).uncheck();
        }
      } catch {
        // Ignora campo inválido e segue o processamento
      }
      continue;
    }

    if (constructorName === "PDFDropdown") {
      try {
        (field as unknown as { select: (v: string) => void }).select(String(value));
      } catch {
        // Ignora campo inválido e segue o processamento
      }
      continue;
    }

    if (constructorName === "PDFOptionList") {
      try {
        (field as unknown as { select: (v: string | string[]) => void }).select(
          String(value),
        );
      } catch {
        // Ignora campo inválido e segue o processamento
      }
      continue;
    }

    if (constructorName === "PDFRadioGroup") {
      try {
        (field as unknown as { select: (v: string) => void }).select(String(value));
      } catch {
        // Ignora campo inválido e segue o processamento
      }
    }
  }

  try {
    form.flatten();
  } catch {
    // Mantém fallback para desenho manual quando não for possível flatten.
  }
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function getSubmissionPdfUrl(
  submissionId: string,
): Promise<{ ok: true; url: string } | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const sid = idSchema.safeParse(submissionId);
  if (!sid.success) return { ok: false, error: "Id inválido." };

  const { data: sub } = await ctx.supabase
    .schema("clinic")
    .from("anamnesis_submissions")
    .select("flattened_pdf_path")
    .eq("id", sid.data)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (!sub?.flattened_pdf_path) {
    return { ok: false, error: "PDF ainda não foi gerado." };
  }

  const { data: signed, error } = await ctx.supabase.storage
    .from(CLINICAL_BUCKET)
    .createSignedUrl(sub.flattened_pdf_path, 60 * 30);
  if (error || !signed?.signedUrl) {
    return { ok: false, error: error?.message ?? "Falha ao gerar link." };
  }
  return { ok: true, url: signed.signedUrl };
}

export async function deleteAnamnesisSubmission(
  clientId: string,
  submissionId: string,
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const cid = idSchema.safeParse(clientId);
  const sid = idSchema.safeParse(submissionId);
  if (!cid.success || !sid.success) {
    return { ok: false, error: "Identificador inválido." };
  }

  const { data: sub } = await ctx.supabase
    .schema("clinic")
    .from("anamnesis_submissions")
    .select("flattened_pdf_path")
    .eq("id", sid.data)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Submissão não encontrada." };

  if (sub.flattened_pdf_path) {
    await ctx.supabase.storage
      .from(CLINICAL_BUCKET)
      .remove([sub.flattened_pdf_path]);
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("anamnesis_submissions")
    .delete()
    .eq("id", sid.data)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return { ok: false, error: error.message ?? "Falha ao excluir." };
  }

  revalidatePath(`/pacientes/${cid.data}`);
  revalidatePath(`/pacientes/${cid.data}/anamnese`);
  return { ok: true };
}
