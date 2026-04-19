import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicalTenantContext } from "@/lib/clients/clinical-tenant-context";
import { computeSaleFeasibility } from "@/lib/sales/completeness";

const schema = z.object({
  clientId: z.string().uuid(),
  procedureId: z.string().uuid(),
});

export async function POST(req: Request) {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const result = await computeSaleFeasibility(
    ctx.supabase,
    ctx.tenantId,
    parsed.data.clientId,
    parsed.data.procedureId,
  );

  return NextResponse.json(result);
}
