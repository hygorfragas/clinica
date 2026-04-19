import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { SupabaseHashSessionHandler } from "@/components/auth/supabase-hash-session-handler";
import { QueryProvider } from "@/components/providers/query-provider";
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={dmSans.variable}>
      <body className="min-h-screen font-sans text-[15px] leading-relaxed antialiased">
        <QueryProvider>
          <SupabaseHashSessionHandler />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
