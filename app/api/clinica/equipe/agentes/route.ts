import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  assertSignatureMime,
  buildProfileAssetStoragePath,
  CLINICAL_BUCKET,
  MAX_SIGNATURE_BYTES,
} from "@/lib/clinical/storage";
import { createLocalUser, getCurrentUserFromRequest } from "@/lib/auth/local-auth";
import { createProfessionalFieldsSchema } from "@/lib/validations/equipe";
import { createServiceRoleClient } from "@/lib/supabase/service";

function optionalFile(fd: FormData, name: string): File | null {
  const v = fd.get(name);
  if (v instanceof Blob && v.size > 0) return v as File;
  return null;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let fields: Record<string, string>;
  let multipartFd: FormData | null = null;

  if (contentType.includes("multipart/form-data")) {
    multipartFd = await request.formData();
    fields = {
      fullName: String(multipartFd.get("fullName") ?? "").trim(),
      email: String(multipartFd.get("email") ?? "").trim(),
      password: String(multipartFd.get("password") ?? ""),
      phone: String(multipartFd.get("phone") ?? "").trim(),
      professionalRegistration: String(
        multipartFd.get("professionalRegistration") ?? "",
      ).trim(),
      cpf: String(multipartFd.get("cpf") ?? "").trim(),
      address: String(multipartFd.get("address") ?? "").trim(),
    };
  } else {
    const json: unknown = await request.json().catch(() => null);
    const asRecord =
      json && typeof json === "object" && json !== null
        ? (json as Record<string, unknown>)
        : {};
    fields = {
      fullName: String(asRecord.fullName ?? "").trim(),
      email: String(asRecord.email ?? "").trim(),
      password: String(asRecord.password ?? ""),
      phone: String(asRecord.phone ?? "").trim(),
      professionalRegistration: String(
        asRecord.professionalRegistration ?? "",
      ).trim(),
      cpf: String(asRecord.cpf ?? "").trim(),
      address: String(asRecord.address ?? "").trim(),
    };
  }

  const parsed = createProfessionalFieldsSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const isTenantManager =
    Boolean(user.tenantId) &&
    (user.role === "owner" || user.role === "clinic_admin");
  if (!isTenantManager || !user.tenantId) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const tenantId = user.tenantId;

  const stampFile =
    multipartFd != null ? optionalFile(multipartFd, "stamp") : null;
  const signatureFile =
    multipartFd != null ? optionalFile(multipartFd, "signature") : null;

  function assertStampFile(f: File | null): string | null {
    if (!f) return null;
    if (f.size > MAX_SIGNATURE_BYTES) {
      throw new Error("Carimbo muito grande (máx. 5 MB).");
    }
    const mimeErr = assertSignatureMime(f.type);
    if (mimeErr) throw new Error(`Carimbo: ${mimeErr}`);
    return f.type;
  }

  /** PNG gerado pelo pad de assinatura digital no cliente (não é upload de arquivo pela usuária). */
  function assertSignaturePng(f: File | null): string | null {
    if (!f) return null;
    if (f.size > MAX_SIGNATURE_BYTES) {
      throw new Error("Assinatura digital muito grande (máx. 5 MB).");
    }
    const mimeErr = assertSignatureMime(f.type);
    if (mimeErr) throw new Error(`Assinatura: ${mimeErr}`);
    return f.type;
  }

  try {
    const stampMime = assertStampFile(stampFile);
    const signatureMime = assertSignaturePng(signatureFile);

    const admin = createServiceRoleClient();
    const { userId: newId } = await createLocalUser({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      role: "agent",
      tenantId,
    });

    const updatePayload: Record<string, string | null | undefined> = {
      tenant_id: tenantId,
      role: "agent",
      full_name: body.fullName,
      phone: body.phone ?? null,
      professional_registration: body.professionalRegistration ?? null,
      cpf: body.cpf ?? null,
      address: body.address ?? null,
    };

    if (stampFile && stampMime) {
      const path = buildProfileAssetStoragePath({
        tenantId,
        profileId: newId,
        kind: "stamp",
        originalFileName: stampFile.name,
      });
      const buf = Buffer.from(await stampFile.arrayBuffer());
      const { error: upErr } = await admin.storage
        .from(CLINICAL_BUCKET)
        .upload(path, buf, { contentType: stampMime, upsert: false });
      if (upErr) {
        throw new Error(upErr.message ?? "Falha ao enviar carimbo.");
      }
      updatePayload.stamp_storage_key = path;
    }

    if (signatureFile && signatureMime) {
      const path = buildProfileAssetStoragePath({
        tenantId,
        profileId: newId,
        kind: "signature",
        originalFileName: signatureFile.name,
      });
      const buf = Buffer.from(await signatureFile.arrayBuffer());
      const { error: upErr } = await admin.storage
        .from(CLINICAL_BUCKET)
        .upload(path, buf, { contentType: signatureMime, upsert: false });
      if (upErr) {
        if (updatePayload.stamp_storage_key) {
          await admin.storage
            .from(CLINICAL_BUCKET)
            .remove([updatePayload.stamp_storage_key]);
        }
        throw new Error(upErr.message ?? "Falha ao enviar assinatura.");
      }
      updatePayload.signature_storage_key = path;
    }

    const { error: profileErr } = await admin
      .schema("clinic")
      .from("profiles")
      .update(updatePayload)
      .eq("id", newId);

    if (profileErr) {
      const keys: string[] = [];
      if (typeof updatePayload.stamp_storage_key === "string") {
        keys.push(updatePayload.stamp_storage_key);
      }
      if (typeof updatePayload.signature_storage_key === "string") {
        keys.push(updatePayload.signature_storage_key);
      }
      if (keys.length > 0) {
        await admin.storage.from(CLINICAL_BUCKET).remove(keys);
      }
      throw new Error(profileErr.message);
    }

    return NextResponse.json(
      { agentUserId: newId, tenantId },
      { status: 201 },
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao criar profissional";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
