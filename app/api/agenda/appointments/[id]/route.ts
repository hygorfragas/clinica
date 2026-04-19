import { NextResponse, type NextRequest } from "next/server";
import {
  deleteAppointment,
  updateAppointment,
} from "@/lib/agenda/actions";

export const dynamic = "force-dynamic";

type Params = { id: string };

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<Params> },
) {
  const { id } = await ctx.params;
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const result = await updateAppointment(id, body as never);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, conflict: result.conflict ?? null },
      { status: result.conflict ? 409 : 400 },
    );
  }
  return NextResponse.json({ data: result.data });
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<Params> },
) {
  const { id } = await ctx.params;
  const result = await deleteAppointment(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: result.data });
}
