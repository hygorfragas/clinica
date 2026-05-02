"use client";

import { Check } from "lucide-react";
import {
  ACCENT_LABELS,
  ACCENT_PRESETS,
  ACCENT_SWATCHES,
  MODE_LABELS,
  THEME_MODES,
  type AccentPreset,
  type ThemeMode,
} from "@/lib/theme/shared";
import { cn } from "@/lib/utils";

export function AccentPicker({
  value,
  onChange,
  disabled,
}: {
  value: AccentPreset;
  onChange: (preset: AccentPreset) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACCENT_PRESETS.map((preset) => {
        const selected = value === preset;
        return (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            onClick={() => onChange(preset)}
            className={cn(
              "group flex items-center gap-3 rounded-lg border bg-surface px-3 py-2.5 text-left text-sm transition-all",
              selected
                ? "border-brand shadow-sm ring-2 ring-brand/30"
                : "border-line hover:border-ink-subtle",
              disabled && "cursor-not-allowed opacity-60",
            )}
            aria-pressed={selected}
          >
            <span
              className="size-7 shrink-0 rounded-full border border-line"
              style={{ backgroundColor: ACCENT_SWATCHES[preset] }}
              aria-hidden
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-ink">
                {ACCENT_LABELS[preset]}
              </span>
            </span>
            {selected ? (
              <Check className="ml-auto size-4 text-brand" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function ModePicker({
  value,
  onChange,
  disabled,
}: {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {THEME_MODES.map((mode) => {
        const selected = value === mode;
        return (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => onChange(mode)}
            className={cn(
              "rounded-lg border bg-surface px-3 py-3 text-sm font-semibold transition-all",
              selected
                ? "border-brand bg-brand-soft text-brand shadow-sm ring-2 ring-brand/30"
                : "border-line text-ink-muted hover:border-ink-subtle hover:text-ink",
              disabled && "cursor-not-allowed opacity-60",
            )}
            aria-pressed={selected}
          >
            {MODE_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}
