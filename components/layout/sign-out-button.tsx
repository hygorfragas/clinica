"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SignOutButton({ label = "Sair" }: { label?: string }) {
  const router = useRouter();

  async function onSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" type="button" onClick={onSignOut}>
      <LogOut className="h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}
