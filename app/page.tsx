import { redirect } from "next/navigation";
import { getCurrentUserFromServerCookies } from "@/lib/auth/local-auth";
import { postLoginPathForClinicProfile } from "@/lib/auth/post-login-path";

export default async function HomePage() {
  const user = await getCurrentUserFromServerCookies();

  if (!user) {
    redirect("/login");
  }

  redirect(
    postLoginPathForClinicProfile({
      role: user.role,
      tenant_id: user.tenantId,
    }),
  );
}
