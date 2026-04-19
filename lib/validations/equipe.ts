import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((s) => (s === "" ? undefined : s));

/** Campos de texto ao criar profissional (JSON ou FormData convertido). */
export const createProfessionalFieldsSchema = z.object({
  fullName: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha: mínimo 8 caracteres").max(128),
  phone: optionalText(40),
  professionalRegistration: optionalText(80),
  cpf: optionalText(20),
  address: optionalText(500),
});

export type CreateProfessionalFields = z.infer<typeof createProfessionalFieldsSchema>;

/** @deprecated use createProfessionalFieldsSchema */
export const createAgentBodySchema = createProfessionalFieldsSchema;
export type CreateAgentBody = CreateProfessionalFields;
