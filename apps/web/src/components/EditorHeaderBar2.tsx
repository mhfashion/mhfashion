"use client";

import { ChevronDown } from "lucide-react";
import type { EditorProduct } from "@/lib/editor-product";

const GSM_OPTIONS = ["160 GSM", "180 GSM", "200 GSM", "240 GSM"] as const;

function CompactSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-text-secondary">
      <span>{label}</span>
      <span className="relative flex items-center">
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 appearance-none rounded-md border border-border bg-bg-surface py-1 pl-2.5 pr-7 text-xs font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">Choose</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          aria-hidden="true"
          className="pointer-events-none absolute right-2 text-text-muted"
        />
      </span>
    </label>
  );
}

function FixedProduct({ value }: { value: EditorProduct }) {
  return (
    <div role="group" aria-label="Product" className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-text-secondary">
      <span>Product</span>
      <span className="inline-flex h-8 w-[5.75rem] items-center rounded-md border border-border bg-bg-surface px-2.5 text-xs font-medium text-text-primary">
        {value}
      </span>
    </div>
  );
}

function PendingSelect({ label }: { label: string }) {
  return (
    <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-text-secondary">
      <span>{label}</span>
      <span className="relative flex items-center">
        <select
          aria-label={label}
          value=""
          disabled
          className="h-9 appearance-none rounded-md border border-border bg-bg-surface py-1 pl-2.5 pr-7 text-xs font-medium text-text-primary opacity-60 outline-none"
        >
          <option value="">Choose</option>
        </select>
        <ChevronDown size={13} aria-hidden="true" className="pointer-events-none absolute right-2 text-text-muted" />
      </span>
    </label>
  );
}

export default function EditorHeaderBar2({
  product,
  gsm,
  onGsmChange,
}: {
  product: EditorProduct;
  gsm: string;
  onGsmChange: (gsm: string) => void;
}) {
  return (
    <div
      role="region"
      aria-label="Header Bar 2"
      className="h-11 w-full shrink-0 overflow-x-auto overscroll-x-contain border-b border-border bg-bg px-2.5 sm:px-3"
    >
      <div className="flex h-full w-max min-w-full items-center justify-between gap-2">
        <div className="flex shrink-0 items-center gap-2.5">
          <FixedProduct value={product} />
          {product === "T-Shirt" ? (
            <CompactSelect label="GSM" value={gsm} options={GSM_OPTIONS} onChange={onGsmChange} />
          ) : (
            <>
              <PendingSelect label="Brand" />
              <PendingSelect label="Model" />
            </>
          )}
          <button
            type="button"
            disabled
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-bg-surface px-2.5 text-xs font-medium text-text-secondary disabled:cursor-default disabled:opacity-100"
          >
            Color
          </button>
          {product === "T-Shirt" && (
            <button
              type="button"
              disabled
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-bg-surface px-2.5 text-xs font-medium text-text-secondary disabled:cursor-default disabled:opacity-100"
            >
              Size
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            disabled
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-bg-surface px-3 text-xs font-semibold text-text-secondary disabled:cursor-default disabled:opacity-100"
          >
            Save
          </button>
          <button
            type="button"
            disabled
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-accent px-3 text-xs font-semibold text-accent-foreground disabled:cursor-default disabled:opacity-100"
          >
            Buy
          </button>
        </div>
      </div>
    </div>
  );
}
