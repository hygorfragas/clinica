import { NextResponse } from "next/server";
import { requireClinicalTenantContext } from "@/lib/clients/clinical-tenant-context";
import { CLINICAL_BUCKET, tenantPrefixFromStorageKey } from "@/lib/clinical/storage";

export const dynamic = "force-dynamic";

type Params = { photoId: string };

/** URL assinada do original — usado no lightbox (evita Server Action 404 em deploy). */
export async function GET(
  _request: Request,
  ctx: { params: Promise<Params> },
) {
  const { photoId } = await ctx.params;

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

  const { data, error } = await clinicalCtx.supabase.storage
    .from(CLINICAL_BUCKET)
    .createSignedUrl(row.storage_key, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Não foi possível carregar a imagem." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { url: data.signedUrl },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
