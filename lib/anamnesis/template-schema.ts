import { z } from "zod";

export const ANAMNESIS_FIELD_TYPES = [
  "text",
  "textarea",
  "checkbox",
  "signature",
  "date",
  "select",
] as const;

export type AnamnesisFieldType = (typeof ANAMNESIS_FIELD_TYPES)[number];

export const anamnesisFieldSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().trim().min(1).max(200),
  type: z.enum(ANAMNESIS_FIELD_TYPES),
  page: z.number().int().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0.02).max(1),
  height: z.number().min(0.02).max(1),
  required: z.boolean().optional(),
  options: z.array(z.string().trim().min(1).max(120)).optional(),
  bindPath: z.string().trim().min(1).max(120).optional(),
  placeholder: z.string().trim().max(120).optional(),
});

export type AnamnesisField = z.infer<typeof anamnesisFieldSchema>;

export const anamnesisFieldsSchema = z.array(anamnesisFieldSchema);

export const anamnesisInkRegionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().trim().max(120).optional(),
  page: z.number().int().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0.02).max(1),
  height: z.number().min(0.02).max(1),
});

export type AnamnesisInkRegion = z.infer<typeof anamnesisInkRegionSchema>;

export const anamnesisInkRegionsSchema = z.array(anamnesisInkRegionSchema);

export const ANAMNESIS_STROKE_TOOLS = ["pen", "highlighter"] as const;
export type AnamnesisStrokeTool = (typeof ANAMNESIS_STROKE_TOOLS)[number];

// Pontos aceitam formato legado `[x, y]` e novo `[x, y, pressure]`.
// Normalizamos ao desenhar e renderizar.
const anamnesisStrokePointSchema = z.union([
  z.tuple([z.number(), z.number()]),
  z.tuple([z.number(), z.number(), z.number().min(0).max(1)]),
]);

export type AnamnesisStrokePoint = z.infer<typeof anamnesisStrokePointSchema>;

export const anamnesisStrokeSchema = z.object({
  page: z.number().int().min(1),
  regionId: z.string().min(1).max(64).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  width: z.number().min(0.3).max(40).optional(),
  tool: z.enum(ANAMNESIS_STROKE_TOOLS).optional(),
  opacity: z.number().min(0).max(1).optional(),
  points: z.array(anamnesisStrokePointSchema).min(1),
});

export type AnamnesisStroke = z.infer<typeof anamnesisStrokeSchema>;

export const anamnesisStrokesSchema = z.array(anamnesisStrokeSchema);

export function getStrokePointPressure(
  point: AnamnesisStrokePoint,
  fallback = 0.5,
): number {
  return point.length === 3 ? point[2] : fallback;
}

export const anamnesisFormValuesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);
export type AnamnesisFormValues = z.infer<typeof anamnesisFormValuesSchema>;

export const ANAMNESIS_SUBMISSION_MODES = ["interactive", "desktop"] as const;
export type AnamnesisSubmissionMode = (typeof ANAMNESIS_SUBMISSION_MODES)[number];

export const ANAMNESIS_SUBMISSION_STATUSES = [
  "draft",
  "submitted",
  "signed",
] as const;
export type AnamnesisSubmissionStatus =
  (typeof ANAMNESIS_SUBMISSION_STATUSES)[number];
