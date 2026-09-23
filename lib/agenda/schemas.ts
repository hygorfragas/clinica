import { z } from "zod";

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "rescheduled",
  "completed",
  "canceled",
  "no_show",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

const isoDateTime = z
  .string()
  .min(10)
  .refine((s) => !Number.isNaN(new Date(s).getTime()), "Data inválida.");

const appointmentFieldsSchema = z.object({
  clientId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
  notes: z.string().trim().max(2000).optional(),
  /** @deprecated Preferir procedureIds. Mantido para compatibilidade. */
  procedureId: z.string().uuid().optional(),
  procedureIds: z.array(z.string().uuid()).max(10).optional(),
  location: z.string().trim().max(160).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  status: z.enum(APPOINTMENT_STATUSES).default("scheduled"),
});

export function normalizeProcedureIds(input: {
  procedureIds?: string[];
  procedureId?: string;
}): string[] | undefined {
  if (input.procedureIds !== undefined) return input.procedureIds;
  if (input.procedureId !== undefined) return [input.procedureId];
  return undefined;
}

export const createAppointmentSchema = appointmentFieldsSchema.refine(
  (v) => new Date(v.endsAt) > new Date(v.startsAt),
  {
    message: "Horário final precisa ser depois do inicial.",
    path: ["endsAt"],
  },
);

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = appointmentFieldsSchema.partial();
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const calendarSettingsSchema = z.object({
  googleSyncMode: z.enum(["off", "pull", "webhook"]),
  pullIntervalMinutes: z.number().int().min(1).max(1440),
  defaultSlotMinutes: z.number().int().min(5).max(240),
  defaultCalendarId: z.string().trim().optional().nullable(),
  timezone: z.string().trim().min(1),
  businessHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    days: z.array(z.number().int().min(0).max(6)).min(1),
  }),
  googleCredentials: z
    .object({
      clientId: z.string().trim().max(300).optional().nullable(),
      clientSecret: z.string().trim().max(500).optional().nullable(),
      redirectUri: z.string().trim().max(500).optional().nullable(),
      syncSecret: z.string().trim().max(500).optional().nullable(),
    })
    .optional(),
});

export type CalendarSettingsInput = z.infer<typeof calendarSettingsSchema>;
