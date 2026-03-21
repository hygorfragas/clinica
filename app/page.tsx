import { redirect } from "next/navigation";
import {
  canAccessAgenda,
  fetchClinicProfile,
  isPlatformSuperAdmin,
} from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile) {
    redirect("/login");
  }

  if (isPlatformSuperAdmin(profile)) {
    redirect("/plataforma");
  }

  if (canAccessAgenda(profile)) {
    redirect("/agenda");
  }

  redirect("/aguardando-acesso");
}
