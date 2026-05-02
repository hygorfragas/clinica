import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { createHash, randomBytes, scryptSync } from "node:crypto";
import { Pool } from "pg";

const SESSION_COOKIE = "clinic_session";

type LocalUser = {
  userId: string;
  email: string;
  role: string;
  tenantId: string | null;
};

let pool: any = null;

function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL não definido para autenticação local.");
  }
  pool = new Pool({ connectionString });
  return pool;
}

function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

async function getUserBySessionToken(token: string | undefined | null) {
  if (!token) return null;
  const db = getPool();
  const result = await db.query(
    `
      select s.user_id, u.email, p.role, p.tenant_id
      from auth.local_sessions s
      join auth.users u on u.id = s.user_id
      join clinic.profiles p on p.id = s.user_id
      where s.token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()
      limit 1
    `,
    [sha256(token)],
  );
  const row = result.rows[0] as
    | {
        user_id: string;
        email: string;
        role: string;
        tenant_id: string | null;
      }
    | undefined;
  if (!row) return null;
  return {
    userId: row.user_id,
    email: row.email,
    role: row.role,
    tenantId: row.tenant_id,
  } satisfies LocalUser;
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export async function getCurrentUserFromServerCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return getUserBySessionToken(token);
}

export async function getCurrentUserFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return getUserBySessionToken(token);
}

export async function createLocalUser(input: {
  email: string;
  password: string;
  fullName: string;
  role: "agent" | "clinic_admin" | "owner" | "platform_super_admin";
  tenantId: string | null;
}) {
  const db = getPool();
  const client = await db.connect();
  try {
    await client.query("begin");
    const existing = await client.query(
      "select id from auth.users where lower(email) = lower($1) limit 1",
      [input.email],
    );
    if (existing.rows[0] as { id: string } | undefined) {
      throw new Error("E-mail já cadastrado.");
    }

    const idResult = await client.query("select gen_random_uuid() as id");
    const userId = (idResult.rows[0] as { id: string } | undefined)?.id;
    if (!userId) {
      throw new Error("Falha ao gerar identificador do usuário.");
    }

    await client.query(
      `
        insert into auth.users (id, email, encrypted_password, raw_user_meta_data)
        values ($1, lower($2), $3, jsonb_build_object('full_name', $4))
      `,
      [userId, input.email, hashPassword(input.password), input.fullName],
    );

    await client.query(
      `
        insert into clinic.profiles (id, full_name, role, tenant_id)
        values ($1, $2, $3, $4)
        on conflict (id) do update
        set full_name = excluded.full_name,
            role = excluded.role,
            tenant_id = excluded.tenant_id
      `,
      [userId, input.fullName, input.role, input.tenantId],
    );

    await client.query("commit");
    return { userId };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
