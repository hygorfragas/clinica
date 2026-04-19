import type { ReactNode } from "react";
import { ConfiguracoesSubnav } from "@/components/configuracoes/configuracoes-subnav";

export default function ConfiguracoesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <ConfiguracoesSubnav />
      {children}
    </div>
  );
}
