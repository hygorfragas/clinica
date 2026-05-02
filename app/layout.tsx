import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { SupabaseHashSessionHandler } from "@/components/auth/supabase-hash-session-handler";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeInitScript } from "@/components/theme/theme-init-script";
import { Toaster } from "@/components/ui/toaster";
import { resolveThemeForRequest } from "@/lib/theme/server";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sua clínica — agenda e prontuário",
  description:
    "SaaS multitenant para clínica de estética: agenda, pacientes e operação diária.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = await resolveThemeForRequest();
  const dark = theme.mode === "dark";
  return (
    <html
      lang="pt-BR"
      className={`${dmSans.variable}${dark ? " dark" : ""}`}
      data-accent={theme.accent}
      data-mode={theme.mode}
      suppressHydrationWarning
    >
      <head>
        <ThemeInitScript />
      </head>
      <body className="min-h-screen font-sans text-[15px] leading-relaxed antialiased">
        <QueryProvider>
          <SupabaseHashSessionHandler />
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
