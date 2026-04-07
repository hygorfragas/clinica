import { z } from "zod";

/** Tri-state para campos clínicos frequentes (inclui “não se aplica”). */
const tri = z.enum(["unknown", "yes", "no", "na"]);

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

const optTri = z.preprocess(
  emptyToUndefined,
  tri.optional(),
);

const optSun = z.preprocess(
  emptyToUndefined,
  z.enum(["unknown", "low", "medium", "high"]).optional(),
);

/** Payload versionado em `clinic.anamnesis_forms.payload` (JSONB). */
export const anamnesisPayloadSchema = z
  .object({
    schema_version: z.literal(1).default(1),

    allergies_status: optTri,
    allergies_detail: z.string().max(4000).optional(),
    medications: z.string().max(4000).optional(),
    chronic_conditions: z.string().max(4000).optional(),

    skin_type: z.string().max(500).optional(),
    routine_products: z.string().max(4000).optional(),
    recent_peels_or_laser: z.string().max(4000).optional(),

    sun_exposure: optSun,
    smokes: optTri,

    pregnant_or_breastfeeding: optTri,
    previous_aesthetic_procedures: z.string().max(4000).optional(),

    main_concern: z.string().max(4000).optional(),
    expectations: z.string().max(4000).optional(),

    acknowledges_truthfulness: z.boolean().optional(),
    general_notes: z.string().max(8000).optional(),
  })
  .passthrough();

export type AnamnesisPayload = z.infer<typeof anamnesisPayloadSchema>;

export const defaultAnamnesisPayload: AnamnesisPayload = {
  schema_version: 1,
};

export function parseAnamnesisPayload(raw: unknown): AnamnesisPayload {
  const parsed = anamnesisPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return { ...defaultAnamnesisPayload };
  }
  return parsed.data;
}
