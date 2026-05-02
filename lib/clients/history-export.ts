"use server";

import { revalidatePath } from "next/cache";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import {
  computeContentBox,
  drawBrandingOnPage,
  resolveBrandingForPdf,
  type AppliedBranding,
  type ContentBox,
} from "@/lib/branding/apply-to-pdf";
import { CLINICAL_BUCKET, buildClinicalStoragePath } from "@/lib/clinical/storage";
import { SYSTEM_DOCUMENT_KINDS } from "@/lib/clinical/document-kinds";
import {
  requireClinicalTenantContext,
  type ClinicSupabaseClient,
} from "@/lib/clients/clinical-tenant-context";
import {
  FULL_EXPORT_SECTIONS,
  historyExportSchema,
  SECTION_LABELS,
  type HistoryExportInput,
  type HistoryExportSections,
} from "@/lib/clients/history-export.schemas";

type Ok<T = unknown> = { ok: true } & T;
type Err = { ok: false; error: string };

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATETIME_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_FMT.format(d);
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATETIME_FMT.format(d);
}

function fmtCurrency(cents: number | null | undefined): string {
  return BRL.format((cents ?? 0) / 100);
}

function budgetStatusLabel(status: string): string {
  if (status === "approved") return "Aprovado";
  if (status === "sent") return "Enviado";
  if (status === "cancelled") return "Cancelado";
  return "Rascunho";
}

function anamnesisStatusLabel(status: string): string {
  if (status === "signed") return "Assinada";
  if (status === "submitted") return "Enviada";
  return "Rascunho";
}

/** Quebra uma string para caber em `maxWidth` pontos. */
function wrapText(
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number,
): string[] {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, size);
      if (width <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        current = word;
      } else {
        // Palavra sozinha maior que a largura: quebra por caractere.
        let buffer = "";
        for (const ch of word) {
          const tentative = buffer + ch;
          if (font.widthOfTextAtSize(tentative, size) > maxWidth) {
            if (buffer) lines.push(buffer);
            buffer = ch;
          } else {
            buffer = tentative;
          }
        }
        current = buffer;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

type Cursor = {
  doc: PDFDocument;
  page: PDFPage;
  branding: AppliedBranding | null;
  box: ContentBox;
  y: number;
  font: PDFFont;
  bold: PDFFont;
};

function newPage(cursor: Cursor): void {
  const page = cursor.doc.addPage([595.28, 841.89]);
  if (cursor.branding) drawBrandingOnPage(page, cursor.branding);
  cursor.page = page;
  cursor.box = computeContentBox({ page, applied: cursor.branding });
  cursor.y = cursor.box.y + cursor.box.height;
}

function ensureSpace(cursor: Cursor, needed: number): void {
  const minY = cursor.box.y + 12;
  if (cursor.y - needed < minY) newPage(cursor);
}

function drawParagraph(
  cursor: Cursor,
  text: string,
  opts: {
    size?: number;
    font?: PDFFont;
    color?: ReturnType<typeof rgb>;
    lineGap?: number;
    indent?: number;
  } = {},
): void {
  const size = opts.size ?? 10;
  const font = opts.font ?? cursor.font;
  const color = opts.color ?? rgb(0.18, 0.22, 0.2);
  const lineGap = opts.lineGap ?? 4;
  const indent = opts.indent ?? 0;
  const width = cursor.box.width - indent;
  const lineHeight = size + lineGap;
  const lines = wrapText(font, text, size, width);
  for (const line of lines) {
    ensureSpace(cursor, lineHeight);
    cursor.page.drawText(line, {
      x: cursor.box.x + indent,
      y: cursor.y - size,
      size,
      font,
      color,
    });
    cursor.y -= lineHeight;
  }
}

function drawSectionTitle(cursor: Cursor, title: string): void {
  ensureSpace(cursor, 30);
  cursor.y -= 10;
  const size = 14;
  cursor.page.drawText(title, {
    x: cursor.box.x,
    y: cursor.y - size,
    size,
    font: cursor.bold,
    color: rgb(0.12, 0.3, 0.22),
  });
  cursor.y -= size + 4;
  cursor.page.drawLine({
    start: { x: cursor.box.x, y: cursor.y },
    end: { x: cursor.box.x + cursor.box.width, y: cursor.y },
    thickness: 0.6,
    color: rgb(0.75, 0.8, 0.78),
  });
  cursor.y -= 10;
}

function drawSubtitle(cursor: Cursor, text: string): void {
  ensureSpace(cursor, 20);
  cursor.y -= 4;
  const size = 11;
  cursor.page.drawText(text, {
    x: cursor.box.x,
    y: cursor.y - size,
    size,
    font: cursor.bold,
    color: rgb(0.15, 0.2, 0.18),
  });
  cursor.y -= size + 4;
}

function drawKeyValue(cursor: Cursor, label: string, value: string): void {
  const size = 10;
  const lineHeight = size + 4;
  ensureSpace(cursor, lineHeight);
  const labelText = `${label}: `;
  const labelWidth = cursor.bold.widthOfTextAtSize(labelText, size);
  cursor.page.drawText(labelText, {
    x: cursor.box.x,
    y: cursor.y - size,
    size,
    font: cursor.bold,
    color: rgb(0.18, 0.22, 0.2),
  });
  const valueLines = wrapText(
    cursor.font,
    value,
    size,
    cursor.box.width - labelWidth,
  );
  if (valueLines.length === 0) valueLines.push("—");
  for (let i = 0; i < valueLines.length; i++) {
    if (i > 0) ensureSpace(cursor, lineHeight);
    cursor.page.drawText(valueLines[i]!, {
      x: cursor.box.x + (i === 0 ? labelWidth : 0),
      y: cursor.y - size,
      size,
      font: cursor.font,
      color: rgb(0.22, 0.26, 0.24),
    });
    cursor.y -= lineHeight;
  }
}

function drawEmptyHint(cursor: Cursor, text: string): void {
  drawParagraph(cursor, text, {
    size: 9,
    color: rgb(0.45, 0.48, 0.46),
  });
}

async function mergeExternalPdf(
  cursor: Cursor,
  supabase: ClinicSupabaseClient,
  storagePath: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(CLINICAL_BUCKET)
      .download(storagePath);
    if (error || !data) return false;
    const bytes = new Uint8Array(await data.arrayBuffer());
    const external = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const copied = await cursor.doc.copyPages(external, external.getPageIndices());
    for (const page of copied) cursor.doc.addPage(page);
    // Próximas seções começam em página nova.
    newPage(cursor);
    return true;
  } catch {
    return false;
  }
}

async function embedPhoto(
  doc: PDFDocument,
  supabase: ClinicSupabaseClient,
  storageKey: string,
): Promise<PDFImage | null> {
  try {
    const { data, error } = await supabase.storage
      .from(CLINICAL_BUCKET)
      .download(storageKey);
    if (error || !data) return null;
    const bytes = new Uint8Array(await data.arrayBuffer());
    const header = bytes.slice(0, 4);
    const isPng =
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47;
    try {
      return isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    } catch {
      try {
        return await doc.embedJpg(bytes);
      } catch {
        return null;
      }
    }
  } catch {
    return null;
  }
}

async function drawPhotoGrid(
  cursor: Cursor,
  supabase: ClinicSupabaseClient,
  photos: Array<{
    id: string;
    storage_key: string;
    caption: string | null;
    taken_at: string | null;
    body_region: string | null;
  }>,
  highRes: boolean,
): Promise<void> {
  if (photos.length === 0) {
    drawEmptyHint(cursor, "Sem fotos no período selecionado.");
    return;
  }

  const perPage = highRes ? 1 : 4;
  const gap = 12;
  const captionReserve = 26;

  for (let i = 0; i < photos.length; i += perPage) {
    if (i > 0) newPage(cursor);
    ensureSpace(cursor, 40);
    const slice = photos.slice(i, i + perPage);
    const cols = highRes ? 1 : 2;
    const rows = Math.ceil(slice.length / cols);
    const cellWidth = (cursor.box.width - gap * (cols - 1)) / cols;
    const totalRowsHeight = cursor.y - cursor.box.y - 16;
    const cellHeight = Math.max(
      120,
      (totalRowsHeight - gap * (rows - 1)) / rows - captionReserve,
    );

    for (let idx = 0; idx < slice.length; idx++) {
      const photo = slice[idx]!;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cellX = cursor.box.x + col * (cellWidth + gap);
      const cellTop = cursor.y - row * (cellHeight + captionReserve + gap);

      const image = await embedPhoto(cursor.doc, supabase, photo.storage_key);

      if (image) {
        const aspect = image.width / Math.max(1, image.height);
        let drawW = cellWidth;
        let drawH = drawW / aspect;
        if (drawH > cellHeight) {
          drawH = cellHeight;
          drawW = drawH * aspect;
        }
        const drawX = cellX + (cellWidth - drawW) / 2;
        const drawY = cellTop - cellHeight + (cellHeight - drawH) / 2;
        cursor.page.drawImage(image, {
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH,
        });
      } else {
        cursor.page.drawRectangle({
          x: cellX,
          y: cellTop - cellHeight,
          width: cellWidth,
          height: cellHeight,
          borderColor: rgb(0.78, 0.8, 0.78),
          borderWidth: 0.6,
          color: rgb(0.94, 0.94, 0.92),
        });
        cursor.page.drawText("Imagem indisponível", {
          x: cellX + 12,
          y: cellTop - cellHeight / 2,
          size: 9,
          font: cursor.font,
          color: rgb(0.4, 0.42, 0.4),
        });
      }

      const captionParts: string[] = [];
      if (photo.body_region) captionParts.push(photo.body_region);
      if (photo.taken_at) captionParts.push(fmtDate(photo.taken_at));
      if (photo.caption) captionParts.push(photo.caption);
      const caption = captionParts.join(" · ") || "Foto clínica";
      const captionLines = wrapText(
        cursor.font,
        caption,
        8.5,
        cellWidth,
      ).slice(0, 2);
      let capY = cellTop - cellHeight - 10;
      for (const line of captionLines) {
        cursor.page.drawText(line, {
          x: cellX,
          y: capY,
          size: 8.5,
          font: cursor.font,
          color: rgb(0.35, 0.4, 0.38),
        });
        capY -= 10;
      }
    }

    cursor.y -=
      rows * (cellHeight + captionReserve) + gap * Math.max(0, rows - 1);
  }
}

function renderAnamnesisJson(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Sem dados estruturados.";
  const entries = Object.entries(payload as Record<string, unknown>);
  if (entries.length === 0) return "Sem dados estruturados.";
  return entries
    .map(([key, value]) => {
      if (value == null || value === "") return null;
      if (Array.isArray(value)) {
        return `• ${key}: ${value.filter(Boolean).join(", ")}`;
      }
      if (typeof value === "object") {
        return `• ${key}: ${JSON.stringify(value)}`;
      }
      return `• ${key}: ${String(value)}`;
    })
    .filter((l): l is string => l !== null)
    .join("\n");
}

/**
 * Gera PDF único com todo o histórico da paciente na clínica.
 * Respeita multitenancy via `requireClinicalTenantContext`.
 */
export async function exportClientHistory(
  rawInput: HistoryExportInput,
): Promise<Ok<{ url: string; documentId: string; sizeBytes: number }> | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const parsed = historyExportSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Parâmetros inválidos." };
  }

  const input = parsed.data;
  const { supabase, tenantId, userId } = ctx;
  const sections: HistoryExportSections = input.sections;

  const { data: client, error: clientError } = await supabase
    .schema("clinic")
    .from("clients")
    .select(
      "id, full_name, email, phone, cpf, address, birth_date, notes, created_at",
    )
    .eq("id", input.clientId)
    .eq("tenant_id", tenantId)
    .is("hidden_from_ui_at", null)
    .maybeSingle();

  if (clientError || !client) {
    return { ok: false, error: "Paciente não encontrado." };
  }

  const [{ data: tenant }, { data: currentProfile }] = await Promise.all([
    supabase
      .schema("clinic")
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .maybeSingle(),
    supabase
      .schema("clinic")
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .eq("tenant_id", tenantId)
      .maybeSingle(),
  ]);

  const fromIso = input.from ? `${input.from}T00:00:00.000Z` : null;
  const toIso = input.to ? `${input.to}T23:59:59.999Z` : null;

  function applyCreatedAtRange<T extends { gte: (col: string, v: string) => T; lte: (col: string, v: string) => T }>(
    query: T,
  ): T {
    let q = query;
    if (fromIso) q = q.gte("created_at", fromIso);
    if (toIso) q = q.lte("created_at", toIso);
    return q;
  }

  const [
    anamnesisFormsRes,
    anamnesisSubmissionsRes,
    evolutionsRes,
    budgetsRes,
    budgetItemsRes,
    purchasesRes,
    photosRes,
    proceduresRes,
    templatesRes,
  ] = await Promise.all([
    sections.anamnesis
      ? applyCreatedAtRange(
          supabase
            .schema("clinic")
            .from("anamnesis_forms")
            .select("id, payload, schema_version, created_at, updated_at"),
        )
          .eq("client_id", client.id)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null } as const),
    sections.anamnesis
      ? applyCreatedAtRange(
          supabase
            .schema("clinic")
            .from("anamnesis_submissions")
            .select(
              "id, template_id, mode, status, form_values, flattened_pdf_path, signer_name, signed_at, submitted_at, created_at",
            ),
        )
          .eq("client_id", client.id)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null } as const),
    sections.evolution
      ? applyCreatedAtRange(
          supabase
            .schema("clinic")
            .from("evolutions")
            .select(
              "id, body, created_at, procedure_id, session_number, created_by_profile_id",
            ),
        )
          .eq("client_id", client.id)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null } as const),
    sections.budgets
      ? applyCreatedAtRange(
          supabase
            .schema("clinic")
            .from("budgets")
            .select(
              "id, title, status, subtotal_cents, discount_cents, total_cents, valid_until, created_at, cancelled_at, cancellation_reason",
            ),
        )
          .eq("client_id", client.id)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null } as const),
    sections.budgets
      ? supabase
          .schema("clinic")
          .from("budget_items")
          .select(
            "id, budget_id, description, quantity, unit_price_cents, line_total_cents, display_order",
          )
          .eq("tenant_id", tenantId)
          .order("display_order", { ascending: true })
      : Promise.resolve({ data: [], error: null } as const),
    sections.contracts
      ? supabase
          .schema("clinic")
          .from("client_procedure_purchases")
          .select(
            "id, title, procedure_id, total_cents, purchased_at, contract_document_id, notes",
          )
          .eq("client_id", client.id)
          .eq("tenant_id", tenantId)
          .order("purchased_at", { ascending: false })
      : Promise.resolve({ data: [], error: null } as const),
    sections.photos
      ? applyCreatedAtRange(
          supabase
            .schema("clinic")
            .from("photos")
            .select(
              "id, storage_key, caption, taken_at, body_region, capture_angle, evolution_id, created_at",
            ),
        )
          .eq("client_id", client.id)
          .eq("tenant_id", tenantId)
          .order("taken_at", { ascending: true, nullsFirst: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null } as const),
    sections.evolution || sections.budgets || sections.contracts
      ? supabase
          .schema("clinic")
          .from("procedures")
          .select("id, name")
          .eq("tenant_id", tenantId)
      : Promise.resolve({ data: [], error: null } as const),
    sections.anamnesis
      ? supabase
          .schema("clinic")
          .from("anamnesis_templates")
          .select("id, name")
          .eq("tenant_id", tenantId)
      : Promise.resolve({ data: [], error: null } as const),
  ]);

  const anamnesisForms = anamnesisFormsRes.data ?? [];
  const anamnesisSubmissions = anamnesisSubmissionsRes.data ?? [];
  const evolutions = evolutionsRes.data ?? [];
  const budgets = budgetsRes.data ?? [];
  const budgetItems = budgetItemsRes.data ?? [];
  const purchases = purchasesRes.data ?? [];
  const photos = photosRes.data ?? [];
  const procedures = proceduresRes.data ?? [];
  const templates = templatesRes.data ?? [];

  const procNameById = new Map(procedures.map((p) => [p.id, p.name]));
  const templateNameById = new Map(templates.map((t) => [t.id, t.name]));
  type BudgetItemRow = (typeof budgetItems)[number];
  const itemsByBudget = new Map<string, BudgetItemRow[]>();
  for (const item of budgetItems) {
    const arr = itemsByBudget.get(item.budget_id) ?? [];
    arr.push(item);
    itemsByBudget.set(item.budget_id, arr);
  }

  // ========== Monta o PDF ==========
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const branding = await resolveBrandingForPdf({
    supabase,
    tenantId,
    pdfDoc: doc,
    profileId: input.brandingProfileId ?? null,
  });

  const firstPage = doc.addPage([595.28, 841.89]);
  if (branding) drawBrandingOnPage(firstPage, branding);
  const cursor: Cursor = {
    doc,
    page: firstPage,
    branding,
    box: computeContentBox({ page: firstPage, applied: branding }),
    y: 0,
    font,
    bold,
  };
  cursor.y = cursor.box.y + cursor.box.height;

  // Capa.
  const title = "Histórico clínico da paciente";
  const titleSize = 20;
  const titleWidth = bold.widthOfTextAtSize(title, titleSize);
  firstPage.drawText(title, {
    x: cursor.box.x + (cursor.box.width - titleWidth) / 2,
    y: cursor.y - titleSize - 6,
    size: titleSize,
    font: bold,
    color: rgb(0.12, 0.28, 0.22),
  });
  cursor.y -= titleSize + 20;

  const clinicName = tenant?.name ?? "Clínica";
  drawParagraph(cursor, clinicName, {
    size: 12,
    font: bold,
    color: rgb(0.2, 0.24, 0.22),
  });
  cursor.y -= 4;
  drawParagraph(cursor, client.full_name, {
    size: 14,
    font: bold,
    color: rgb(0.15, 0.2, 0.18),
  });
  drawParagraph(
    cursor,
    `Emitido em ${DATETIME_FMT.format(new Date())} · Responsável: ${currentProfile?.full_name ?? "—"}`,
    { size: 9, color: rgb(0.35, 0.4, 0.38) },
  );
  if (input.from || input.to) {
    drawParagraph(
      cursor,
      `Período: ${input.from ? fmtDate(input.from) : "início"} até ${input.to ? fmtDate(input.to) : "hoje"}`,
      { size: 9, color: rgb(0.35, 0.4, 0.38) },
    );
  } else {
    drawParagraph(cursor, "Período: histórico completo", {
      size: 9,
      color: rgb(0.35, 0.4, 0.38),
    });
  }

  const enabledSections = (Object.keys(sections) as (keyof HistoryExportSections)[])
    .filter((k) => sections[k])
    .map((k) => SECTION_LABELS[k]);
  drawParagraph(cursor, `Seções incluídas: ${enabledSections.join(", ")}.`, {
    size: 9,
    color: rgb(0.35, 0.4, 0.38),
  });
  cursor.y -= 12;

  // Seção: Dados cadastrais.
  if (sections.profile) {
    drawSectionTitle(cursor, "Dados cadastrais");
    drawKeyValue(cursor, "Nome completo", client.full_name);
    drawKeyValue(cursor, "CPF", client.cpf ?? "—");
    drawKeyValue(cursor, "Data de nascimento", fmtDate(client.birth_date));
    drawKeyValue(cursor, "E-mail", client.email ?? "—");
    drawKeyValue(cursor, "Telefone", client.phone ?? "—");
    drawKeyValue(cursor, "Endereço", client.address ?? "—");
    drawKeyValue(cursor, "Cadastrada em", fmtDateTime(client.created_at));
  }

  // Seção: Observações do cadastro.
  if (sections.notes) {
    drawSectionTitle(cursor, "Observações");
    if (client.notes && client.notes.trim()) {
      drawParagraph(cursor, client.notes.trim());
    } else {
      drawEmptyHint(cursor, "Nenhuma observação registrada no cadastro.");
    }
  }

  // Seção: Anamneses.
  if (sections.anamnesis) {
    drawSectionTitle(cursor, "Anamneses");
    const totalAnamnesis = anamnesisForms.length + anamnesisSubmissions.length;
    if (totalAnamnesis === 0) {
      drawEmptyHint(cursor, "Sem anamneses no período.");
    } else {
      for (const form of anamnesisForms) {
        drawSubtitle(cursor, `Anamnese legada · ${fmtDateTime(form.created_at)}`);
        const rendered = renderAnamnesisJson(form.payload);
        drawParagraph(cursor, rendered, { size: 9.5 });
        cursor.y -= 6;
      }

      for (const submission of anamnesisSubmissions) {
        const templateName = submission.template_id
          ? templateNameById.get(submission.template_id) ?? "Template removido"
          : "Sem template";
        drawSubtitle(
          cursor,
          `${templateName} · ${anamnesisStatusLabel(submission.status)} · ${fmtDateTime(submission.submitted_at ?? submission.created_at)}`,
        );
        if (submission.signer_name) {
          drawKeyValue(cursor, "Assinada por", submission.signer_name);
        }
        if (submission.signed_at) {
          drawKeyValue(cursor, "Assinada em", fmtDateTime(submission.signed_at));
        }
        const rendered = renderAnamnesisJson(submission.form_values);
        drawParagraph(cursor, rendered, { size: 9.5 });
        cursor.y -= 6;

        if (input.mergeOriginalPdfs && submission.flattened_pdf_path) {
          const merged = await mergeExternalPdf(
            cursor,
            supabase,
            submission.flattened_pdf_path,
          );
          if (!merged) {
            drawEmptyHint(
              cursor,
              "(Não foi possível anexar o PDF assinado desta anamnese.)",
            );
          }
        }
      }
    }
  }

  // Seção: Evoluções.
  if (sections.evolution) {
    drawSectionTitle(cursor, "Evoluções clínicas");
    if (evolutions.length === 0) {
      drawEmptyHint(cursor, "Sem registros de evolução no período.");
    } else {
      for (const evolution of evolutions) {
        const procName = evolution.procedure_id
          ? procNameById.get(evolution.procedure_id) ?? "Procedimento"
          : null;
        const headerParts = [fmtDateTime(evolution.created_at)];
        if (procName) headerParts.push(procName);
        if (evolution.session_number) {
          headerParts.push(`Sessão ${evolution.session_number}`);
        }
        drawSubtitle(cursor, headerParts.join(" · "));
        drawParagraph(cursor, evolution.body ?? "—", { size: 9.5 });
        cursor.y -= 6;
      }
    }
  }

  // Seção: Orçamentos.
  if (sections.budgets) {
    drawSectionTitle(cursor, "Orçamentos");
    if (budgets.length === 0) {
      drawEmptyHint(cursor, "Sem orçamentos no período.");
    } else {
      for (const budget of budgets) {
        const headerParts = [
          budget.title?.trim() || "Sem título",
          budgetStatusLabel(budget.status),
          fmtDate(budget.created_at),
        ];
        drawSubtitle(cursor, headerParts.join(" · "));
        if (budget.valid_until) {
          drawKeyValue(cursor, "Válido até", fmtDate(budget.valid_until));
        }
        if (
          budget.status === "cancelled" &&
          budget.cancellation_reason === "auto_expired"
        ) {
          drawKeyValue(cursor, "Cancelamento", "Automático por vencimento");
        }
        const rows = itemsByBudget.get(budget.id) ?? [];
        for (const item of rows) {
          const totalCents =
            item.line_total_cents ?? item.quantity * item.unit_price_cents;
          const line = `  • ${item.quantity}x ${item.description}`;
          const value = fmtCurrency(totalCents);
          ensureSpace(cursor, 14);
          cursor.page.drawText(line.slice(0, 80), {
            x: cursor.box.x,
            y: cursor.y - 10,
            size: 9.5,
            font,
          });
          const valueWidth = bold.widthOfTextAtSize(value, 9.5);
          cursor.page.drawText(value, {
            x: cursor.box.x + cursor.box.width - valueWidth,
            y: cursor.y - 10,
            size: 9.5,
            font: bold,
          });
          cursor.y -= 14;
        }
        drawKeyValue(cursor, "Subtotal", fmtCurrency(budget.subtotal_cents));
        drawKeyValue(cursor, "Desconto", fmtCurrency(budget.discount_cents));
        drawKeyValue(cursor, "Total", fmtCurrency(budget.total_cents));
        cursor.y -= 6;
      }
    }
  }

  // Seção: Contratos / compras.
  if (sections.contracts) {
    drawSectionTitle(cursor, "Contratos e compras");
    if (purchases.length === 0) {
      drawEmptyHint(cursor, "Sem contratos ou compras registrados.");
    } else {
      const contractDocIds = purchases
        .map((p) => p.contract_document_id)
        .filter((v): v is string => typeof v === "string");
      const docMap = new Map<string, { storage_key: string; title: string | null }>();
      if (contractDocIds.length > 0) {
        const { data: docs } = await supabase
          .schema("clinic")
          .from("documents")
          .select("id, storage_key, title")
          .in("id", contractDocIds)
          .eq("tenant_id", tenantId);
        for (const d of docs ?? []) {
          if (!d.storage_key) continue;
          docMap.set(d.id, { storage_key: d.storage_key, title: d.title });
        }
      }

      for (const purchase of purchases) {
        const procName = purchase.procedure_id
          ? procNameById.get(purchase.procedure_id) ?? null
          : null;
        drawSubtitle(
          cursor,
          `${purchase.title} · ${fmtDate(purchase.purchased_at)}`,
        );
        if (procName) drawKeyValue(cursor, "Procedimento", procName);
        drawKeyValue(cursor, "Valor", fmtCurrency(purchase.total_cents));
        if (purchase.notes?.trim()) {
          drawKeyValue(cursor, "Observações", purchase.notes.trim());
        }

        if (input.mergeOriginalPdfs && purchase.contract_document_id) {
          const docRef = docMap.get(purchase.contract_document_id);
          if (docRef) {
            const merged = await mergeExternalPdf(
              cursor,
              supabase,
              docRef.storage_key,
            );
            if (!merged) {
              drawEmptyHint(
                cursor,
                "(Não foi possível anexar o PDF do contrato.)",
              );
            }
          }
        }
        cursor.y -= 6;
      }
    }
  }

  // Seção: Fotos.
  if (sections.photos) {
    drawSectionTitle(cursor, "Fotos clínicas");
    await drawPhotoGrid(
      cursor,
      supabase,
      photos.map((p) => ({
        id: p.id,
        storage_key: p.storage_key,
        caption: p.caption,
        taken_at: p.taken_at,
        body_region: p.body_region,
      })),
      input.highResPhotos,
    );
  }

  const bytes = await doc.save();
  const buffer = Buffer.from(bytes);

  const storagePath = buildClinicalStoragePath({
    tenantId,
    clientId: client.id,
    category: "documents",
    originalFileName: `historico-${Date.now()}.pdf`,
  });

  const { error: uploadError } = await supabase.storage
    .from(CLINICAL_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return { ok: false, error: uploadError.message ?? "Falha ao salvar PDF." };
  }

  const { data: docRow, error: docError } = await supabase
    .schema("clinic")
    .from("documents")
    .insert({
      tenant_id: tenantId,
      client_id: client.id,
      kind: SYSTEM_DOCUMENT_KINDS.clientHistoryExport,
      title: `Histórico clínico · ${DATE_FMT.format(new Date())}`,
      storage_key: storagePath,
      mime_type: "application/pdf",
      responsible_profile_id: userId,
    })
    .select("id")
    .single();

  if (docError || !docRow) {
    return {
      ok: false,
      error: docError?.message ?? "PDF salvo, mas falhou registro do documento.",
    };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(CLINICAL_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24);

  if (signError || !signed?.signedUrl) {
    return {
      ok: false,
      error: "PDF gerado mas não foi possível criar link de compartilhamento.",
    };
  }

  revalidatePath(`/pacientes/${client.id}/historico`);
  revalidatePath(`/pacientes/${client.id}`, "layout");

  return {
    ok: true,
    url: signed.signedUrl,
    documentId: docRow.id,
    sizeBytes: buffer.length,
  };
}

/**
 * Gera uma nova URL assinada para um histórico já exportado.
 * Usado na listagem de exportações anteriores.
 */
export async function getClientHistoryExportUrl(
  documentId: string,
): Promise<Ok<{ url: string }> | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.supabase
    .schema("clinic")
    .from("documents")
    .select("storage_key, tenant_id")
    .eq("id", documentId)
    .eq("tenant_id", ctx.tenantId)
    .eq("kind", SYSTEM_DOCUMENT_KINDS.clientHistoryExport)
    .maybeSingle();

  if (error || !data || !data.storage_key) {
    return { ok: false, error: "Exportação não encontrada." };
  }

  const { data: signed } = await ctx.supabase.storage
    .from(CLINICAL_BUCKET)
    .createSignedUrl(data.storage_key, 60 * 60 * 24);

  if (!signed?.signedUrl) {
    return { ok: false, error: "Não foi possível gerar o link." };
  }
  return { ok: true, url: signed.signedUrl };
}

export { FULL_EXPORT_SECTIONS };
