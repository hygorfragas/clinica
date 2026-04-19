import { OAuth2Client } from "google-auth-library";
import type { GoogleProviderSettings } from "./provider-settings";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "openid",
  "email",
  "profile",
] as const;

export function createOAuthClient(settings: GoogleProviderSettings): OAuth2Client {
  return new OAuth2Client({
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    redirectUri: settings.redirectUri,
  });
}

export function buildAuthorizationUrl(
  state: string,
  settings: GoogleProviderSettings,
): string {
  const client = createOAuthClient(settings);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [...GOOGLE_CALENDAR_SCOPES],
    state,
  });
}

export async function exchangeCodeForTokens(
  code: string,
  settings: GoogleProviderSettings,
) {
  const client = createOAuthClient(settings);
  const { tokens } = await client.getToken(code);
  return tokens;
}

export function createClientWithRefreshToken(
  refreshToken: string,
  settings: GoogleProviderSettings,
) {
  const client = createOAuthClient(settings);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}
