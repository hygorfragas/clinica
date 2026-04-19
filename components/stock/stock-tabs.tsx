"use client";

import { useState } from "react";
import {
  ProceduresPanel,
  type ContractTemplateOption,
  type ProcedureRow,
} from "./procedures-panel";
import { ProductsPanel, type ProductRow } from "./products-panel";

type Tab = "products" | "procedures";

export function StockTabs({
  initialTab = "products",
  products,
  procedures,
  contractTemplates,
}: {
  initialTab?: Tab;
  products: ProductRow[];
  procedures: ProcedureRow[];
  contractTemplates: ContractTemplateOption[];
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="space-y-6">
      <nav
        className="inline-flex rounded-full bg-muted/50 p-1 ring-1 ring-line"
        role="tablist"
      >
        <TabButton active={tab === "products"} onClick={() => setTab("products")}>
          Produtos
        </TabButton>
        <TabButton
          active={tab === "procedures"}
          onClick={() => setTab("procedures")}
        >
          Procedimentos
        </TabButton>
      </nav>

      <section className="rounded-[1.75rem] bg-surface/80 p-6 shadow-lift ring-1 ring-line md:p-7">
        {tab === "products" ? (
          <ProductsPanel products={products} />
        ) : (
          <ProceduresPanel
            procedures={procedures}
            contractTemplates={contractTemplates}
          />
        )}
      </section>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm transition ${
        active
          ? "bg-surface font-semibold text-ink shadow-sm ring-1 ring-line"
          : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
