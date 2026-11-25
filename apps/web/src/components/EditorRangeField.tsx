"use client";

import { useState } from "react";

// Plan E21 item 1: a slider always comes with a number field. The field keeps the typed text in a draft
// until blur, so deleting "100" to type "40" is not written back as 0; Enter, arrows and the spinner all
// pass through `snap`, which bounds the value and lands it on the slider's own step.
export function RangeField({ label, value, min, max, step = 1, suffix, ariaLabel, onChange, defaultValue }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; ariaLabel: string; onChange: (value: number) => void; defaultValue?: number }) {
  const [draft, setDraft] = useState<string | null>(null);
  const snap = (next: number) => {
    if (!Number.isFinite(next)) return value;
    const bounded = Math.max(min, Math.min(max, next));
    const stepped = step > 0 ? Math.round((bounded - min) / step) * step + min : bounded;
    return Number(stepped.toFixed(4));
  };
  const commit = (next: number) => { setDraft(null); onChange(snap(next)); };
  return <div className="text-[10px] text-text-secondary">
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 truncate">{label}{suffix && <span className="ml-1 text-text-muted">{suffix}</span>}</span>
      <input
        aria-label={`${ariaLabel} value`}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={draft ?? value}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (next.trim() !== "" && Number.isFinite(Number(next))) onChange(snap(Number(next)));
        }}
        onBlur={() => setDraft(null)}
        onDoubleClick={() => { if (defaultValue !== undefined) commit(defaultValue); }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          const current = Number(draft ?? value);
          const base = Number.isFinite(current) ? current : value;
          commit(base + (event.key === "ArrowUp" ? 1 : -1) * step * (event.shiftKey ? 10 : 1));
        }}
        title={defaultValue === undefined ? undefined : "Double-click to reset"}
        className="h-7 w-16 shrink-0 rounded-lg border border-border bg-bg px-1.5 text-right text-[11px] text-text-primary outline-none focus:border-accent [@media(pointer:coarse)]:h-11"
      />
    </div>
    <input aria-label={ariaLabel} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1.5 h-1.5 w-full cursor-pointer accent-[var(--accent)]" />
  </div>;
}
