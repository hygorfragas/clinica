import { z } from "zod";

export const platformUserRoleSchema = z.enum([
  "pending_registration",
  "owner",
  "clinic_admin",
  "agent",
  "platform_super_admin",
]);

export const createPlatformUserBodySchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  password: z.string().min(8),
  tenantId: z.string().uuid().nullable().optional(),
  role: platformUserRoleSchema,
});

export const updatePlatformUserProfileBodySchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(2).max(120).optional(),
  tenantId: z.string().uuid().nullable().optional(),
  role: platformUserRoleSchema.optional(),
});

export const resetPasswordLinkBodySchema = z.object({
  userId: z.string().uuid(),
  redirectTo: z.string().url().optional(),
});

export const impersonateUserBodySchema = z.object({
  userId: z.string().uuid(),
});

export type CreatePlatformUserBody = z.infer<typeof createPlatformUserBodySchema>;

