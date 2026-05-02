import { z } from "zod";

export const historyExportSectionsSchema = z.object({
  profile: z.boolean(),
  notes: z.boolean(),
  anamnesis: z.boolean(),
  evolution: z.boolean(),
  budgets: z.boolean(),
  contracts: z.boolean(),
  photos: z.boolean(),
});

export type HistoryExportSections = z.infer<typeof historyExportSectionsSchema>;

export const historyExportSchema = z
  .object({
    clientId: z.string().uuid(),
    from: z.string().date().nullable().optional(),
    to: z.string().date().nullable().optional(),
    sections: historyExportSectionsSchema,
    mergeOriginalPdfs: z.boolean().default(true),
    highResPhotos: z.boolean().default(false),
    brandingProfileId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (data) =>
      Object.values(data.sections).some((enabled) => enabled),
    { message: "Selecione pelo menos uma seção para exportar.", path: ["sections"] },
  )
  .refine(
    (data) => !data.from || !data.to || data.from <= data.to,
    { message: 'A data "de" precisa ser anterior ou igual à data "até".', path: ["to"] },
  );

export type HistoryExportInput = z.infer<typeof historyExportSchema>;

export const FULL_EXPORT_SECTIONS: HistoryExportSections = {
  profile: true,
  notes: true,
  anamnesis: true,
  evolution: true,
  budgets: true,
  contracts: true,
  photos: true,
};

export const SECTION_LABELS: Record<keyof HistoryExportSections, string> = {
  profile: "Dados cadastrais",
  notes: "Observações",
  anamnesis: "Anamneses",
  evolution: "Evoluções",
  budgets: "Orçamentos",
  contracts: "Contratos e compras",
  photos: "Fotos clínicas",
};
