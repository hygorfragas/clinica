import { z } from "zod";

/** Cadastro de paciente (clients): validação compartilhada entre formulário e server action. */
export const createPatientSchema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome completo"),
  email: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine(
      (v) => v === null || z.string().email().safeParse(v).success,
      "E-mail inválido",
    ),
  phone: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  birth_date: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine(
      (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "Data inválida",
    ),
  notes: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable(),
});

/** Valores após validação (enviados à action / banco). */
export type CreatePatientParsed = z.infer<typeof createPatientSchema>;
/** Valores brutos do formulário (antes dos transforms). */
export type CreatePatientFormValues = z.input<typeof createPatientSchema>;
