export type AppointmentDto = {
  id: string;
  tenantId: string;
  clientId: string | null;
  clientName: string | null;
  title: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  notes: string | null;
  procedureId: string | null;
  procedureName: string | null;
  location: string | null;
  color: string | null;
  source: string;
  googleEventId: string | null;
  googleCalendarId: string | null;
  googleSyncStatus: string;
  createdByProfileId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CalendarSettingsDto = {
  tenantId: string;
  googleSyncMode: "off" | "pull" | "webhook";
  pullIntervalMinutes: number;
  defaultSlotMinutes: number;
  defaultCalendarId: string | null;
  timezone: string;
  businessHours: { start: string; end: string; days: number[] };
};
