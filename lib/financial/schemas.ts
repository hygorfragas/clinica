import { z } from "zod";

export const ACCOUNT_KINDS = ["cash", "bank", "wallet", "other"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const CATEGORY_KINDS = ["income", "expense"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const PAYMENT_METHOD_KINDS = [
  "cash",
  "pix",
  "debit_card",
  "credit_card",
  "bank_transfer",
  "other",
] as const;
export type PaymentMethodKind = (typeof PAYMENT_METHOD_KINDS)[number];

export const TRANSACTION_KINDS = ["income", "expense"] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

export const TRANSACTION_STATUSES = ["pending", "paid", "cancelled"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_SOURCE_KINDS = [
  "manual",
  "sale",
  "budget",
  "budget_installment",
  "procedure_purchase",
  "reversal",
] as const;
export type TransactionSourceKind = (typeof TRANSACTION_SOURCE_KINDS)[number];

const idSchema = z.string().uuid();
const nameSchema = z.string().trim().min(2).max(120);
const moneyCentsSchema = z.number().int().min(0).max(1_000_000_000);
const positiveMoneyCentsSchema = z
  .number()
  .int()
  .min(1)
  .max(1_000_000_000);

/** Aceita "12,50", "12.50", "1.234,56", "12345" → centavos. */
export function parseBrlToCents(input: string | number): number {
  if (typeof input === "number") {
    return Math.max(0, Math.round(input * 100));
  }
  const cleaned = input
    .replace(/[^\d,.\-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
}

export function centsToBrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/* -------------------------------------------------------------------------- */
/* Accounts                                                                   */
/* -------------------------------------------------------------------------- */

export const accountInputSchema = z.object({
  name: nameSchema,
  kind: z.enum(ACCOUNT_KINDS).default("cash"),
  openingBalanceCents: moneyCentsSchema.default(0),
  notes: z.string().trim().max(400).optional().nullable(),
});
export type AccountInput = z.infer<typeof accountInputSchema>;

export const accountUpdateSchema = accountInputSchema.extend({
  id: idSchema,
  isArchived: z.boolean().optional(),
});
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

export const categoryInputSchema = z.object({
  name: nameSchema,
  kind: z.enum(CATEGORY_KINDS),
  parentId: idSchema.optional().nullable(),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const categoryUpdateSchema = categoryInputSchema.extend({
  id: idSchema,
  isArchived: z.boolean().optional(),
});
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Payment methods                                                            */
/* -------------------------------------------------------------------------- */

export const paymentMethodInputSchema = z.object({
  name: nameSchema,
  kind: z.enum(PAYMENT_METHOD_KINDS).default("other"),
  defaultAccountId: idSchema.optional().nullable(),
});
export type PaymentMethodInput = z.infer<typeof paymentMethodInputSchema>;

export const paymentMethodUpdateSchema = paymentMethodInputSchema.extend({
  id: idSchema,
  isArchived: z.boolean().optional(),
});
export type PaymentMethodUpdateInput = z.infer<typeof paymentMethodUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Transactions                                                               */
/* -------------------------------------------------------------------------- */

export const transactionInputSchema = z.object({
  kind: z.enum(TRANSACTION_KINDS),
  status: z.enum(TRANSACTION_STATUSES).default("paid"),
  amountCents: positiveMoneyCentsSchema,
  description: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(800).optional().nullable(),
  occurredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD)")
    .default(() => new Date().toISOString().slice(0, 10)),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  paidAt: z.string().datetime().optional().nullable(),
  accountId: idSchema.optional().nullable(),
  categoryId: idSchema.optional().nullable(),
  paymentMethodId: idSchema.optional().nullable(),
  clientId: idSchema.optional().nullable(),
  responsibleProfileId: idSchema.optional().nullable(),
});
export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const transactionUpdateSchema = transactionInputSchema.extend({
  id: idSchema,
});
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Misc helpers                                                               */
/* -------------------------------------------------------------------------- */

export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = {
  cash: "Caixa",
  bank: "Banco",
  wallet: "Carteira digital",
  other: "Outra",
};

export const PAYMENT_METHOD_KIND_LABEL: Record<PaymentMethodKind, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  debit_card: "Cartão de débito",
  credit_card: "Cartão de crédito",
  bank_transfer: "Transferência bancária",
  other: "Outro",
};

export const TRANSACTION_STATUS_LABEL: Record<TransactionStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  cancelled: "Cancelado",
};
