"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  "h-8 w-20 rounded-full border border-accent bg-accent text-[10px] font-semibold text-accent-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11";
const ACTION_BOX =
  "inline-flex h-8 w-20 shrink-0 items-center justify-center rounded-full border border-accent bg-accent px-1 text-[10px] font-semibold text-accent-foreground transition-colors [@media(pointer:coarse)]:h-11 disabled:cursor-default disabled:opacity-100";

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
          className={`${FIELD_BOX} appearance-none pl-2 pr-5 disabled:cursor-not-allowed disabled:opacity-100`}
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
          className="pointer-events-none absolute right-1 text-accent-foreground"
        />
      </span>
    </label>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8, width: 176 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedColor = COLOR_OPTIONS.find((color) => color.value === value) ?? COLOR_OPTIONS[2];

  useEffect(() => {
    if (!open) return;

    const positionMenu = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(176, window.innerWidth - 16);
      const height = 160;
      const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8));
      const top = window.innerHeight - rect.bottom >= height + 8
        ? rect.bottom + 6
        : Math.max(8, rect.top - height - 6);
      setPosition({ left, top, width });
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && (triggerRef.current?.contains(target) || menuRef.current?.contains(target))) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <FieldLabel>Color</FieldLabel>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Color"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="editor-header-bar2-color-options"
        data-editor-box="Color"
        data-testid="header-bar2-color-trigger"
        onClick={() => setOpen((current) => !current)}
        className={`${FIELD_BOX} inline-flex items-center justify-center gap-2 px-2`}
      >
        <span
          aria-hidden="true"
          data-color-swatch={selectedColor.value}
          className={`h-3.5 w-3.5 rounded-full border border-accent-foreground/50 ${selectedColor.swatch}`}
        />
        <ChevronDown size={12} aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          id="editor-header-bar2-color-options"
          role="listbox"
          aria-label="Color options"
          data-testid="header-bar2-color-options"
          className="fixed z-[100] flex flex-col gap-0.5 rounded-full border border-accent bg-accent p-1.5 text-accent-foreground shadow-xl"
          style={{ left: position.left, top: position.top, width: position.width }}
        >
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color.value}
              type="button"
              role="option"
              aria-label={`Color ${color.label}`}
              aria-selected={value === color.value}
              title={color.label}
              onClick={() => {
                onChange(color.value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="flex min-h-9 w-full items-center gap-2 rounded-full px-3 text-left text-[10px] font-semibold text-accent-foreground outline-none transition-colors hover:bg-accent-foreground/10 focus-visible:ring-2 focus-visible:ring-accent-foreground [@media(pointer:coarse)]:min-h-11"
            >
              <span aria-hidden="true" className={`h-3.5 w-3.5 rounded-full border border-accent-foreground/50 ${color.swatch}`} />
              <span>{color.label}</span>
              {value === color.value && <span className="ml-auto" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>,
        document.body,
      )}
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
          <span
            aria-label="Price unavailable"
            data-editor-price
            className="hidden shrink-0 whitespace-nowrap text-xs font-semibold tabular-nums text-text-secondary sm:inline"
          >
            Price —
          </span>
          <button type="button" aria-label="Save" data-editor-box="Save" disabled className={ACTION_BOX}>
            Save
          </button>
          <button
            type="button"
            aria-label="Buy"
            data-editor-box="Buy"
            disabled
            className={ACTION_BOX}
          >
            Buy
          </button>
        </div>
      </div>
    </div>
  );
}
