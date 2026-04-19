import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(secret: string): Buffer {
  if (!secret || secret.length < 24) {
    throw new Error("Segredo de sincronização inválido (mínimo 24 caracteres).");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptToken(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(secret), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

export function decryptToken(cipherText: string, secret: string): string {
  const [version, ivB64, tagB64, encB64] = cipherText.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !encB64) {
    throw new Error("Token cifrado em formato desconhecido.");
  }
  const decipher = createDecipheriv(
    ALGO,
    getKey(secret),
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(encB64, "base64url")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}
