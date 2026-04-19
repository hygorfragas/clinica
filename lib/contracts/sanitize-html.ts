/** HTML vindo do editor de contratos — remove vetores XSS comuns sem depender de jsdom. */
export function sanitizeContractHtml(html: string): string {
  if (!html) return "";

  let sanitized = html;

  // Remove blocos ativos perigosos inteiros.
  sanitized = sanitized.replace(
    /<(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select)[^>]*>[\s\S]*?<\/\1>/gi,
    "",
  );
  sanitized = sanitized.replace(
    /<(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select)\b[^>]*\/?>/gi,
    "",
  );

  // Remove handlers inline (onclick, onload, ...).
  sanitized = sanitized.replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "");

  // Remove URLs javascript:/data: em href/src.
  sanitized = sanitized.replace(
    /\s(href|src)\s*=\s*("|\')\s*(javascript:|data:)[\s\S]*?\2/gi,
    "",
  );
  sanitized = sanitized.replace(/\s(href|src)\s*=\s*(javascript:|data:)[^\s>]*/gi, "");

  return sanitized;
}
