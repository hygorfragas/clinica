import { z } from "zod";

/** Produto em estoque. */
export const productSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(160),
  sku: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  unit: z.string().trim().min(1).max(20).default("un"),
  stock_quantity: z.number().finite().min(0).default(0),
  low_stock_threshold: z.number().finite().min(0).default(0),
  cost_cents: z.number().int().min(0).default(0),
  price_cents: z.number().int().min(0).default(0),
});
export type ProductInput = z.infer<typeof productSchema>;

/** Edição de cadastro — estoque só via ajuste/baixa (auditoria). */
export const productUpdateSchema = productSchema
  .omit({ stock_quantity: true })
  .partial();
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

/** Item do BOM (insumo padrão de um procedimento). */
export const procedureBomItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().finite().gt(0, "Quantidade deve ser maior que zero"),
});
export type ProcedureBomItemInput = z.infer<typeof procedureBomItemSchema>;

export const consumeAppointmentStockSchema = z.object({
  appointmentId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().finite().gt(0),
      }),
    )
    .min(1, "Informe ao menos um produto."),
});
export type ConsumeAppointmentStockInput = z.infer<
  typeof consumeAppointmentStockSchema
>;

/** Procedimento (precificação + contrato). */
export const procedureSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  duration_minutes: z.number().int().min(1).max(24 * 60).optional().nullable(),
  cost_cents: z.number().int().min(0).default(0),
  profit_margin_percent: z.number().finite().min(0).max(10000).default(0),
  price_cents: z.number().int().min(0).default(0),
  contract_template_id: z.string().uuid().optional().nullable(),
  requires_signed_contract: z.boolean().default(true),
});
export type ProcedureInput = z.infer<typeof procedureSchema>;

export const procedureUpdateSchema = procedureSchema.partial();
export type ProcedureUpdateInput = z.infer<typeof procedureUpdateSchema>;

/** Calcula preço final a partir de custo e margem. */
export function computePriceCents(
  costCents: number,
  marginPercent: number,
): number {
  if (!Number.isFinite(costCents) || !Number.isFinite(marginPercent)) return 0;
  const v = Math.max(0, costCents) * (1 + Math.max(0, marginPercent) / 100);
  return Math.round(v);
}
