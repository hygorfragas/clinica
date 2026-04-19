import { NextResponse, type NextRequest } from "next/server";
import {
  createAppointment,
  listAppointments,
} from "@/lib/agenda/actions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json(
      { error: "Parâmetros from/to obrigatórios." },
      { status: 400 },
    );
  }
  const result = await listAppointments({ from, to });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: result.data });
}

export async function POST(request: NextRequest) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const result = await createAppointment(body as never);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, conflict: result.conflict ?? null },
      { status: result.conflict ? 409 : 400 },
    );
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
