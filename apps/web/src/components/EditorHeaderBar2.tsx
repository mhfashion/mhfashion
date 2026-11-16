"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { DEFAULT_EDITOR_GSM, type EditorProduct } from "@/lib/editor-product";

const PRODUCT_OPTIONS = ["T-Shirt", "Phone", "Hoodie", "Cup", "Kids", "Bag"] as const;
const FUTURE_PRODUCTS = ["Hoodie", "Cup", "Kids", "Bag"] as const;
const GSM_OPTIONS = [DEFAULT_EDITOR_GSM, "180 GSM", "200 GSM", "240 GSM"] as const;
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;
const COLOR_OPTIONS = [
  { value: "background", label: "Background", swatch: "bg-bg" },
  { value: "surface", label: "Surface", swatch: "bg-bg-surface" },
  { value: "accent", label: "Accent", swatch: "bg-accent" },
] as const;

const FIELD_BOX =
  "h-8 w-20 rounded-full border border-border bg-bg-surface text-[10px] font-medium text-text-primary outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11";
const ACTION_BOX =
  "inline-flex h-8 w-20 shrink-0 items-center justify-center rounded-full border border-border bg-bg-surface px-1 text-[10px] font-semibold text-text-secondary transition-colors [@media(pointer:coarse)]:h-11 disabled:cursor-default disabled:opacity-100";

function FieldLabel({ children }: { children: string }) {
  return (
    <span data-editor-field-label className="hidden shrink-0 text-xs font-medium text-text-secondary sm:inline">
      {children}
    </span>
  );
}

function CompactSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  disabledOptions = [],
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange?: (value: string) => void;
  disabled?: boolean;
  disabledOptions?: readonly string[];
}) {
  return (
    <label className="flex shrink-0 items-center gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <span className="relative flex shrink-0 items-center">
        <select
          aria-label={label}
          data-editor-box={label}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.value)}
          className={`${FIELD_BOX} appearance-none pl-2 pr-5 ${disabled ? "opacity-60" : ""}`}
        >
          {options.map((option) => (
            <option key={option} value={option} disabled={disabledOptions.includes(option)}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          size={10}
          aria-hidden="true"
          className="pointer-events-none absolute right-1 text-text-muted"
        />
      </span>
    </label>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <FieldLabel>Color</FieldLabel>
      <div
        role="group"
        aria-label="Color"
        data-editor-box="Color"
        className="flex h-8 w-20 shrink-0 items-center justify-center gap-0 rounded-full border border-border bg-bg-surface [@media(pointer:coarse)]:h-11"
      >
        {COLOR_OPTIONS.map((color) => (
          <button
            key={color.value}
            type="button"
            aria-label={`Color ${color.label}`}
            aria-pressed={value === color.value}
            title={color.label}
            onClick={() => onChange(color.value)}
            className="flex h-7 w-6 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-10"
          >
            <span
              aria-hidden="true"
              className={`h-3.5 w-3.5 rounded-full border border-border ${color.swatch} ${value === color.value ? "ring-2 ring-accent ring-offset-1 ring-offset-bg-surface" : ""}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function PendingSelect({ label }: { label: string }) {
  return <CompactSelect label={label} value="—" options={["—"]} disabled />;
}

export default function EditorHeaderBar2({
  product,
  onProductChange,
  gsm,
  onGsmChange,
}: {
  product: EditorProduct;
  onProductChange: (product: EditorProduct) => void;
  gsm: string;
  onGsmChange: (gsm: string) => void;
}) {
  const [selectedColor, setSelectedColor] = useState("accent");
  const [selectedSize, setSelectedSize] = useState("XL");

  function changeProduct(value: string) {
    if (value === "T-Shirt" || value === "Phone") onProductChange(value);
  }

  return (
    <div
      role="region"
      aria-label="Header Bar 2"
      className="h-11 w-full shrink-0 overflow-x-auto overscroll-x-contain border-b border-border bg-bg px-2.5 sm:px-3"
    >
      <div className="flex h-full w-max min-w-full items-center justify-between gap-2.5">
        <div className="flex shrink-0 items-center gap-2">
          <CompactSelect
            label="Product"
            value={product}
            options={PRODUCT_OPTIONS}
            onChange={changeProduct}
            disabledOptions={FUTURE_PRODUCTS}
          />
          {product === "T-Shirt" ? (
            <>
              <CompactSelect label="GSM" value={gsm} options={GSM_OPTIONS} onChange={onGsmChange} />
              <ColorField value={selectedColor} onChange={setSelectedColor} />
              <CompactSelect
                label="Size"
                value={selectedSize}
                options={SIZE_OPTIONS}
                onChange={setSelectedSize}
              />
            </>
          ) : (
            <>
              <PendingSelect label="Brand" />
              <PendingSelect label="Model" />
              <ColorField value={selectedColor} onChange={setSelectedColor} />
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" aria-label="Save" data-editor-box="Save" disabled className={ACTION_BOX}>
            Save
          </button>
          <span
            aria-label="Price unavailable"
            data-editor-price
            className="hidden shrink-0 whitespace-nowrap text-xs font-semibold tabular-nums text-text-secondary sm:inline"
          >
            Price —
          </span>
          <button
            type="button"
            aria-label="Buy"
            data-editor-box="Buy"
            disabled
            className={`${ACTION_BOX} border-accent bg-accent text-accent-foreground`}
          >
            Buy
          </button>
        </div>
      </div>
    </div>
  );
}
