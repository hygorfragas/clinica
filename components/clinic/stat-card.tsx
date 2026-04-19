import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "secondary" | "neutral";

const toneClass: Record<Tone, string> = {
  primary:
    "bg-brand-container/35 border-[rgba(74,101,90,0.06)] hover:bg-brand-container/50",
  secondary:
    "bg-secondary-container/35 border-[rgba(98,91,119,0.08)] hover:bg-secondary-container/55",
  neutral:
    "border-line bg-surface/95 hover:bg-surface",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group flex h-48 flex-col justify-between rounded-[2rem] border p-6 shadow-card-bento transition-all duration-500",
        toneClass[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl bg-white/50 p-3 shadow-sm ring-1 ring-white/60 backdrop-blur-[2px]">
          <Icon className="h-5 w-5 text-brand" aria-hidden />
        </div>
        {hint ? (
          <span className="rounded-full bg-white/55 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted ring-1 ring-white/70">
            {hint}
          </span>
        ) : null}
      </div>
      <div>
        <p className="font-sans text-5xl font-bold tabular-nums tracking-tight text-[#3e594e]">
          {value}
        </p>
        <p className="mt-1 text-sm font-medium text-[#3d574d]">{label}</p>
      </div>
    </div>
  );
}
