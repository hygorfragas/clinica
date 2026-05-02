import { NextResponse, type NextRequest } from "next/server";
import { requireLocalAgendaContext } from "@/lib/auth/local-route-context";
import { runIncrementalPull } from "@/lib/google/sync";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  const auth = await requireLocalAgendaContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const result = await runIncrementalPull(auth.supabase, auth.tenantId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
