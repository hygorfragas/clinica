"use client";

import { useMemo } from "react";
import { InteractiveAnamnesisEditor } from "@/components/anamnesis/interactive-anamnesis-editor";
import type { AnamnesisStroke } from "@/lib/anamnesis/template-schema";
import { EvolutionPhotoSidePanel } from "./evolution-photo-side-panel";

type Props = {
  clientId: string;
  submissionId: string;
  templateId?: string | null;
  templatePdfUrl: string | null;
  initialStrokes: AnamnesisStroke[];
  initialSignerName?: string | null;
  initialStatus: "draft" | "submitted" | "signed";
  patientLabel?: string;
  templateLabel?: string;
};

export function EvolucaoInteractiveEditor(props: Props) {
  const { clientId, submissionId, ...rest } = props;

  const extraSidePanel = useMemo(
    () => ({
      label: "Fotos clínicas",
      content: (
        <div className="min-h-[min(70vh,520px)]">
          <EvolutionPhotoSidePanel
            clientId={clientId}
            submissionId={submissionId}
            readOnly={false}
          />
        </div>
      ),
    }),
    [clientId, submissionId],
  );

  return (
    <InteractiveAnamnesisEditor
      {...rest}
      clientId={clientId}
      submissionId={submissionId}
      entityKind="evolution"
      extraSidePanel={extraSidePanel}
    />
  );
}
