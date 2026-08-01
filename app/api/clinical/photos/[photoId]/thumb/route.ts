import { NextResponse, type NextRequest } from "next/server";
import { requireClinicalTenantContext } from "@/lib/clients/clinical-tenant-context";
import {
  resizePhotoForProxy,
  thumbStorageKey,
} from "@/lib/clinical/photo-thumb";
import { CLINICAL_BUCKET, tenantPrefixFromStorageKey } from "@/lib/clinical/storage";

export const dynamic = "force-dynamic";

type Params = { photoId: string };

function parseWidth(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return 400;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 64 || n > 800) return null;
  return n;
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<Params> },
) {
  const { photoId } = await ctx.params;
  const width = parseWidth(request.nextUrl.searchParams.get("w"));
  if (width == null) {
    return NextResponse.json({ error: "Parâmetro w inválido." }, { status: 400 });
  }

  const clinicalCtx = await requireClinicalTenantContext();
  if (!clinicalCtx.ok) {
    return NextResponse.json({ error: clinicalCtx.error }, { status: 401 });
  }

  const { data: row } = await clinicalCtx.supabase
    .schema("clinic")
    .from("photos")
    .select("storage_key")
    .eq("id", photoId)
    .eq("tenant_id", clinicalCtx.tenantId)
    .maybeSingle();

  if (!row?.storage_key) {
    return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  }

  const prefix = tenantPrefixFromStorageKey(row.storage_key);
  if (prefix !== clinicalCtx.tenantId) {
    return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  }

  const thumbKey = thumbStorageKey(row.storage_key);
  const { data: thumbBlob, error: thumbErr } = await clinicalCtx.supabase.storage
    .from(CLINICAL_BUCKET)
    .download(thumbKey);

  if (!thumbErr && thumbBlob) {
    const buffer = Buffer.from(await thumbBlob.arrayBuffer());
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const { data: originalBlob, error: origErr } = await clinicalCtx.supabase.storage
    .from(CLINICAL_BUCKET)
    .download(row.storage_key);

  if (origErr || !originalBlob) {
    return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });
  }

  const originalBuffer = Buffer.from(await originalBlob.arrayBuffer());
  let webpBuffer: Buffer;
  try {
    webpBuffer = await resizePhotoForProxy(originalBuffer, width);
  } catch {
    return NextResponse.json(
      { error: "Falha ao processar imagem." },
      { status: 500 },
    );
  }

  return new NextResponse(new Uint8Array(webpBuffer), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
