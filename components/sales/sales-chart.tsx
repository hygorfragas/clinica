"use client";

type Point = { month: string; total: number; count: number };

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Gráfico de barras leve, sem libs externas. */
export function SalesChart({ data }: { data: Point[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const barWidth = 100 / Math.max(1, data.length);

  return (
    <div className="flex h-full flex-col">
      <svg
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        className="h-48 w-full"
        role="img"
        aria-label="Receita por mês"
      >
        {data.map((d, i) => {
          const h = (d.total / max) * 55;
          const x = i * barWidth + barWidth * 0.15;
          const w = barWidth * 0.7;
          const y = 58 - h;
          return (
            <g key={d.month}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={0.5}
                className="fill-[color:var(--brand)]"
                opacity={i === data.length - 1 ? 1 : 0.8}
              />
            </g>
          );
        })}
      </svg>
      <div className="mt-2 grid grid-flow-col gap-1 text-[10px] text-ink-muted">
        {data.map((d) => (
          <div key={d.month} className="text-center">
            <div className="font-medium">{d.month}</div>
            <div>{BRL.format(d.total)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
