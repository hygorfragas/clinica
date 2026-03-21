/** Resposta de `public.clinic_bootstrap_status()`. */
export type BootstrapStatus = {
  signupOpen: boolean;
  hasPlatformSuperAdmin: boolean;
};

export function parseBootstrapStatus(data: unknown): BootstrapStatus {
  if (!data || typeof data !== "object") {
    return { signupOpen: false, hasPlatformSuperAdmin: false };
  }
  const o = data as Record<string, unknown>;
  return {
    signupOpen: o.signup_open === true,
    hasPlatformSuperAdmin: o.has_platform_super_admin === true,
  };
}
