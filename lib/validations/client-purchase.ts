import { z } from "zod";

export const createClientPurchaseSchema = z.object({
  clientId: z.string().uuid("Paciente inválida."),
  title: z.string().trim().min(2, "Informe o nome do procedimento/produto").max(200),
  totalCents: z.number().int().min(0, "Valor inválido"),
  purchasedAt: z
    .string()
    .min(1, "Informe a data")
    .refine((s) => !Number.isNaN(Date.parse(s)), "Data inválida"),
  contractDocumentId: z.string().uuid().optional().nullable(),
  procedureId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateClientPurchaseInput = z.infer<typeof createClientPurchaseSchema>;
