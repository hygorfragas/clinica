/** Origem pública do app (ex.: https://app.com). Preferir em produção atrás de proxy. */
export function getRequestSiteOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return new URL(request.url).origin;
}
