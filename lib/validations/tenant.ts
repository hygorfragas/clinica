import { z } from "zod";

export const createClinicBodySchema = z
  .object({
    name: z.string().min(2, "Nome muito curto").max(120),
    slug: z
      .string()
      .max(120)
      .regex(/^[a-z0-9-]*$/, "Slug: apenas letras minúsculas, números e hífen")
      .optional(),
    adminFullName: z.string().min(2).max(120).optional(),
    adminEmail: z.string().email().optional().or(z.literal("")),
    adminPassword: z.string().min(8).optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    const hasEmail = val.adminEmail && val.adminEmail.length > 0;
    const hasPassword = val.adminPassword && val.adminPassword.length > 0;
    if (hasEmail !== hasPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Para criar o primeiro usuário da clínica, informe e-mail e senha (mín. 8 caracteres).",
        path: ["adminEmail"],
      });
    }
    if (hasEmail && (!val.adminFullName || val.adminFullName.length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o nome completo do administrador da clínica.",
        path: ["adminFullName"],
      });
    }
  });

export type CreateClinicBody = z.infer<typeof createClinicBodySchema>;
