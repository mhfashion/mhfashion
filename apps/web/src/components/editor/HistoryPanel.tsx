"use client";

import { History, Redo2, Undo2 } from "lucide-react";

type Props = {
  past: string[];
  future: string[];
  current: string;
  onUndo: () => void;
  onRedo: () => void;
};

export default function HistoryPanel({ past, future, current, onUndo, onRedo }: Props) {
  const entries = [...past.slice(-12).reverse(), current];
  return (
    <section aria-label="History" className="shrink-0 border-b border-border bg-[#fbfcfa]">
      <div className="flex h-8 items-center justify-between border-b border-border px-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-text-secondary"><History size={12} /> History</div>
        <span className="text-[9px] text-text-faint">{past.length} undo · {future.length} redo</span>
      </div>
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <button type="button" onClick={onUndo} disabled={!past.length} aria-label="Undo last history step" title="Undo" className="flex h-6 flex-1 items-center justify-center gap-1 rounded border border-border text-[9px] text-text-secondary hover:bg-bg disabled:cursor-not-allowed disabled:opacity-35"><Undo2 size={12} /> Undo</button>
        <button type="button" onClick={onRedo} disabled={!future.length} aria-label="Redo history step" title="Redo" className="flex h-6 flex-1 items-center justify-center gap-1 rounded border border-border text-[9px] text-text-secondary hover:bg-bg disabled:cursor-not-allowed disabled:opacity-35"><Redo2 size={12} /> Redo</button>
      </div>
      <div className="max-h-28 overflow-y-auto px-1.5 py-1">
        {entries.map((entry, index) => <div key={`${entry}-${index}`} className={`flex min-h-6 items-center rounded px-1.5 text-[9px] ${index === entries.length - 1 ? "bg-accent/10 font-semibold text-accent" : "text-text-muted"}`}><span className="mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />{entry}{index === entries.length - 1 && <span className="ml-auto text-[8px] opacity-70">Current</span>}</div>)}
        {!past.length && <p className="px-1.5 py-1 text-[9px] text-text-faint">Edits will appear here.</p>}
      </div>
    </section>
  );
}
