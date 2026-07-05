import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { uploadPatientLibraryPhotoCore } from "@/lib/clinical/library-photo-upload";
import { requireClinicalTenantContext } from "@/lib/clients/clinical-tenant-context";

export const dynamic = "force-dynamic";

function revalidatePaciente(clientId: string) {
  revalidatePath(`/pacientes/${clientId}`, "layout");
  revalidatePath("/pacientes");
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireClinicalTenantContext();
    if (!ctx.ok) {
      return NextResponse.json(
        { ok: false as const, error: ctx.error },
        { status: 401 },
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (err) {
      console.error("[api/clinical/photos/upload] formData:", err);
      return NextResponse.json(
        {
          ok: false as const,
          error:
            "Falha ao ler o envio (arquivo grande demais ou conexão interrompida).",
        },
        { status: 400 },
      );
    }

    const clientIdRaw = formData.get("client_id");
    const clientParsed = z.string().uuid().safeParse(clientIdRaw);
    if (!clientParsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Paciente inválido." },
        { status: 400 },
      );
    }

    const capturedRaw = formData.get("captured_at");
    if (typeof capturedRaw !== "string") {
      return NextResponse.json(
        { ok: false as const, error: "Informe a data e hora da captura." },
        { status: 400 },
      );
    }

    const file = formData.get("file");
    if (!(file instanceof Blob) || file.size === 0) {
      return NextResponse.json(
        { ok: false as const, error: "Selecione uma imagem." },
        { status: 400 },
      );
    }

    const captionRaw = formData.get("caption");
    const caption =
      typeof captionRaw === "string" && captionRaw.trim() !== ""
        ? captionRaw.trim()
        : null;

    const result = await uploadPatientLibraryPhotoCore(
      ctx,
      clientParsed.data,
      {
        captured_at: capturedRaw,
        file: file as File,
        caption,
      },
    );

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    const skipRevalidate = formData.get("skip_revalidate") === "1";
    if (!skipRevalidate) {
      revalidatePaciente(clientParsed.data);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/clinical/photos/upload] unexpected:", err);
    return NextResponse.json(
      { ok: false as const, error: "Falha inesperada no upload." },
      { status: 500 },
    );
  }
}
