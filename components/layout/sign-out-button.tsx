"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SignOutButton({ label = "Sair" }: { label?: string }) {
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // ignora — segue com hard redirect mesmo em falha de rede
    }
    // Hard navigation pra garantir que o middleware revalide cookies removidos.
    window.location.assign("/login");
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      onClick={onSignOut}
      loading={pending}
      loadingLabel={label}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}
