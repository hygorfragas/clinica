export const DEFAULT_ERROR_MESSAGE =
  "Não foi possível completar a operação. Tente novamente.";

type MaybeSupabaseError = {
  code?: string | number | null;
  message?: string | null;
  hint?: string | null;
  details?: string | null;
  status?: number | null;
  name?: string | null;
};

const POSTGRES_MAP: Record<string, string> = {
  "23505": "Já existe um registro com esses dados.",
  "23503": "Não é possível concluir: existem vínculos relacionados.",
  "23502": "Faltam informações obrigatórias.",
  "23514": "Os dados informados não atendem às regras.",
  "22P02": "Formato inválido em um dos campos.",
  "42501": "Você não tem permissão para executar esta ação.",
  "P0001": "Operação bloqueada pela regra da clínica.",
};

const POSTGREST_MAP: Record<string, string> = {
  PGRST116: "Registro não encontrado.",
  PGRST301: "Sessão expirada. Faça login novamente.",
  PGRST204: "Nenhum registro afetado pela operação.",
};

const AUTH_MESSAGES: Array<[RegExp, string]> = [
  [/invalid\s+login\s+credentials/i, "E-mail ou senha incorretos."],
  [/email\s+not\s+confirmed/i, "Confirme o e-mail antes de entrar."],
  [/user\s+already\s+registered/i, "Este e-mail já está cadastrado."],
  [/password\s+should\s+be\s+at\s+least/i, "A senha é muito curta."],
  [/rate\s+limit/i, "Muitas tentativas. Aguarde alguns minutos."],
  [/network/i, "Sem conexão com o servidor."],
];

const STORAGE_MESSAGES: Array<[RegExp, string]> = [
  [/object not found|not\s+found/i, "Arquivo não encontrado no armazenamento."],
  [/mime\s*type|content\s*type/i, "Tipo de arquivo não suportado."],
  [/payload too large|file\s+too\s+large/i, "Arquivo muito grande."],
  [/duplicate/i, "Já existe um arquivo com esse nome."],
];

function extractError(err: unknown): MaybeSupabaseError | null {
  if (!err) return null;
  if (typeof err === "string") return { message: err };
  if (typeof err !== "object") return null;
  const obj = err as Record<string, unknown>;
  if (obj.error && typeof obj.error === "object") {
    return obj.error as MaybeSupabaseError;
  }
  return obj as MaybeSupabaseError;
}

export function humanizeError(err: unknown, fallback?: string): string {
  const e = extractError(err);
  if (!e) return fallback ?? DEFAULT_ERROR_MESSAGE;

  const code = e.code != null ? String(e.code) : "";
  if (code && POSTGRES_MAP[code]) return POSTGRES_MAP[code];
  if (code && POSTGREST_MAP[code]) return POSTGREST_MAP[code];

  const raw = `${e.message ?? ""} ${e.details ?? ""} ${e.hint ?? ""}`.trim();
  if (raw) {
    for (const [re, msg] of AUTH_MESSAGES) if (re.test(raw)) return msg;
    for (const [re, msg] of STORAGE_MESSAGES) if (re.test(raw)) return msg;
    if (/row\s+level\s+security|rls/i.test(raw)) {
      return "Você não tem permissão para executar esta ação.";
    }
    if (/jwt|session/i.test(raw)) {
      return "Sessão expirada. Faça login novamente.";
    }
  }

  if (e.status === 401 || e.status === 403) {
    return "Você não tem permissão para executar esta ação.";
  }
  if (e.status === 404) return "Registro não encontrado.";
  if (e.status && e.status >= 500) return "Serviço indisponível no momento.";

  if (e.message && /^[\x20-\x7E\u00C0-\u024F]+$/.test(e.message)) {
    return e.message;
  }

  return fallback ?? DEFAULT_ERROR_MESSAGE;
}
