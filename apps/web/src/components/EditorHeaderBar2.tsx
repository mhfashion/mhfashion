"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import type { EditorProduct } from "@/lib/editor-product";
import { editorSelectionNotice, missingEditorSelections } from "@/lib/editor-required";
import { calculateEditorPriceKs } from "@/lib/editor-price";
import {
  COLOR_OPTIONS,
  DEFAULT_EDITOR_ATTRIBUTES,
  GSM_OPTIONS,
  MH_CUTTINGS_OPTIONS,
  PRINT_METHOD_OPTIONS,
  SIZE_OPTIONS,
  fabricTypeOptions,
  knitStructureOptions,
  narrowEditorAttributes,
  type EditorAttributes,
} from "@/lib/editor-attributes";

const PRODUCT_OPTIONS = ["T-Shirt", "Phone", "Hoodie", "Cup", "Kids", "Bag"] as const;
const FUTURE_PRODUCTS = ["Hoodie", "Cup", "Kids", "Bag"] as const;

// One shared shape for every Header Bar 2 control so the Product, Print Method,
// Fabric Type, Knit Structure, MH Cuttings, GSM, Color, Size, Save and Buy boxes
// read as one uniform, compact set. The box is wide enough for "Combed Cotton";
// a longer value truncates in the trigger and shows in full in the dropdown.
const FIELD_BOX_SHAPE =
  "relative h-7 w-[7rem] shrink-0 overflow-hidden rounded-full border text-[9px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11";
const FIELD_BOX = `${FIELD_BOX_SHAPE} border-accent bg-accent text-accent-foreground`;
// The chevron is pinned to the right edge so its position is identical on every
// field box; the content stays centred in the remaining space.
const TRIGGER_BOX = `${FIELD_BOX} inline-flex items-center justify-center pl-1.5 pr-5 disabled:cursor-not-allowed disabled:opacity-100`;
// The Color trigger keeps only a green outline (no green fill), so the selected
// colour reads clearly instead of blending into the box.
const OUTLINE_TRIGGER_BOX = `${FIELD_BOX_SHAPE} border-accent bg-transparent text-accent inline-flex items-center justify-center pl-1.5 pr-5 disabled:cursor-not-allowed disabled:opacity-100`;
const ACTION_BOX = `${FIELD_BOX} inline-flex items-center justify-center px-1 disabled:cursor-default disabled:opacity-100`;
// Every dropdown opens a compact green panel the same width as its box, so the
// opened menu lines up with the control above it instead of a wide overlay.
const MENU_BOX =
  "fixed z-[100] flex flex-col gap-1 rounded-2xl border border-accent bg-accent p-1 text-accent-foreground shadow-xl";
const MENU_OPTION =
  "flex h-7 w-full items-center justify-between gap-1 rounded-full px-2 text-left text-[9px] font-semibold text-accent-foreground outline-none transition-colors hover:bg-accent-foreground/10 focus-visible:ring-2 focus-visible:ring-accent-foreground disabled:opacity-40 [@media(pointer:coarse)]:h-11";
// The selected colour reads as a box (rounded square), not a dot.
const COLOR_SWATCH = "h-5 w-5 shrink-0 rounded-md border border-border";
// The trigger swatch is wider than the option swatches so the current colour
// stands out in the outlined box.
const COLOR_TRIGGER_SWATCH = "h-[18px] w-10 shrink-0 rounded-md border border-border";

function FieldLabel({ children }: { children: string }) {
  return (
    <span data-editor-field-label className="hidden shrink-0 text-[10px] font-medium text-text-secondary sm:inline">
      {children}
    </span>
  );
}

type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
  hex?: string;
  ariaLabel?: string;
};

// The single dropdown used by every Header Bar 2 selector. The trigger keeps
// the shared box geometry; the popup is a rounded green panel mounted in
// a portal so the horizontally scrollable bar can never clip it.
function BoxDropdown({
  label,
  value,
  options,
  onChange,
  disabled = false,
  triggerContent,
  triggerTestId,
  triggerClassName,
}: {
  label: string;
  value: string;
  options: readonly DropdownOption[];
  onChange?: (value: string) => void;
  disabled?: boolean;
  triggerContent: React.ReactNode;
  triggerTestId?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8, width: 80 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = `editor-header-bar2-${label.toLowerCase()}-options`;

  useEffect(() => {
    if (!open) return;

    const positionMenu = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      // The panel is as wide as the box it opens from, clamped to the viewport.
      const width = Math.min(Math.round(rect.width), window.innerWidth - 16);
      const optionHeight = window.matchMedia("(pointer: coarse)").matches ? 44 : 32;
      const height = Math.min(options.length * (optionHeight + 4) + 8, window.innerHeight - 16);
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
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const selected = menuRef.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
    const first = menuRef.current?.querySelector<HTMLElement>('[role="option"]:not([disabled])');
    (selected ?? first)?.focus();
  }, [open]);

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not([disabled])') ?? []);
    if (items.length === 0) return;
    const current = items.findIndex((item) => item === document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = current === -1 ? 0 : (current + step + items.length) % items.length;
      items[next].focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1].focus();
    }
  };

  return (
    <div className="flex shrink-0 flex-col items-start gap-0.5">
      <FieldLabel>{label}</FieldLabel>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        data-editor-box={label}
        data-testid={triggerTestId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={triggerClassName ?? TRIGGER_BOX}
      >
        {triggerContent}
        <ChevronDown
          size={12}
          aria-hidden="true"
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="listbox"
          aria-label={`${label} options`}
          data-testid={`editor-header-bar2-${label.toLowerCase()}-options`}
          onKeyDown={onMenuKeyDown}
          className={MENU_BOX}
          style={{ left: position.left, top: position.top, width: position.width }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-label={option.ariaLabel ?? `${label} ${option.label}`}
              aria-selected={value === option.value}
              disabled={option.disabled}
              title={option.label}
              onClick={() => {
                onChange?.(option.value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className={MENU_OPTION}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {option.hex && (
                  <span
                    aria-hidden="true"
                    className={COLOR_SWATCH}
                    style={{ backgroundColor: option.hex }}
                  />
                )}
                <span className="truncate">{option.label}</span>
              </span>
              {value === option.value && <span className="shrink-0" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

function SelectBox({
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
    <BoxDropdown
      label={label}
      value={value}
      options={options.map((option) => ({ value: option, label: option, disabled: disabledOptions.includes(option) }))}
      onChange={onChange}
      disabled={disabled}
      triggerContent={<span className="truncate">{value}</span>}
    />
  );
}

function ColorBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selectedColor = COLOR_OPTIONS.find((color) => color.value === value) ?? COLOR_OPTIONS[0];
  return (
    <BoxDropdown
      label="Color"
      value={value}
      options={COLOR_OPTIONS.map((color) => ({
        value: color.value,
        label: color.label,
        hex: color.hex,
        ariaLabel: `Color ${color.label}`,
      }))}
      onChange={onChange}
      triggerTestId="header-bar2-color-trigger"
      triggerClassName={OUTLINE_TRIGGER_BOX}
      triggerContent={
        <span
          aria-hidden="true"
          data-color-swatch={selectedColor.value}
          data-color-hex={selectedColor.hex}
          className={COLOR_TRIGGER_SWATCH}
          style={{ backgroundColor: selectedColor.hex }}
        />
      }
    />
  );
}

function PendingSelect({ label }: { label: string }) {
  return <SelectBox label={label} value="—" options={["—"]} disabled />;
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
  const [selectedColor, setSelectedColor] = useState("white");
  const [selectedSize, setSelectedSize] = useState("XL");
  const [attributes, setAttributes] = useState<EditorAttributes>(DEFAULT_EDITOR_ATTRIBUTES);

  function changeProduct(value: string) {
    if (value === "T-Shirt" || value === "Phone") onProductChange(value);
  }

  function changeAttribute(patch: Partial<EditorAttributes>) {
    setAttributes((current) => narrowEditorAttributes({ ...current, ...patch }));
  }

  // Provisional client-side price, matching the storefront's variant model
  // until a real pricing source is connected to /create.
  // Buy will refuse an order that lacks one of the eight choices (plan E12); the bar reports what is missing
  // today so the gate has one source of truth and nothing to re-derive when Buy is wired.
  const missingSelections = missingEditorSelections({
    product,
    printMethod: attributes.printMethod,
    fabricType: attributes.fabricType,
    knitStructure: attributes.knitStructure,
    cuttings: attributes.cuttings,
    gsm,
    color: selectedColor,
    size: selectedSize,
  });

  const priceKs = calculateEditorPriceKs({ product, gsm, size: selectedSize });
  const priceLabel = priceKs === null ? "Price —" : `Price ${priceKs.toLocaleString("en-US")} Ks`;

  return (
    <div
      role="region"
      aria-label="Header Bar 2"
      data-editor-missing={missingSelections.join(" ")}
      data-editor-missing-notice={editorSelectionNotice(missingSelections)}
      className="h-11 w-full shrink-0 overflow-x-auto overscroll-x-contain border-b border-border bg-bg px-2.5 [scrollbar-width:none] sm:px-3 [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex h-full w-max min-w-full items-center justify-between gap-2">
        <div className="flex shrink-0 items-center gap-2">
          <SelectBox
            label="Product"
            value={product}
            options={PRODUCT_OPTIONS}
            onChange={changeProduct}
            disabledOptions={FUTURE_PRODUCTS}
          />
          {product === "T-Shirt" ? (
            <>
              <SelectBox
                label="Print Method"
                value={attributes.printMethod}
                options={PRINT_METHOD_OPTIONS}
                onChange={(value) => changeAttribute({ printMethod: value })}
              />
              <SelectBox
                label="Fabric Type"
                value={attributes.fabricType}
                options={fabricTypeOptions(attributes.printMethod)}
                onChange={(value) => changeAttribute({ fabricType: value })}
              />
              <SelectBox
                label="Knit Structure"
                value={attributes.knitStructure}
                options={knitStructureOptions(attributes.fabricType)}
                onChange={(value) => changeAttribute({ knitStructure: value })}
              />
              <SelectBox
                label="MH Cuttings"
                value={attributes.cuttings}
                options={MH_CUTTINGS_OPTIONS}
                onChange={(value) => changeAttribute({ cuttings: value })}
              />
              <SelectBox label="GSM" value={gsm} options={GSM_OPTIONS} onChange={onGsmChange} />
              <ColorBox value={selectedColor} onChange={setSelectedColor} />
              <SelectBox label="Size" value={selectedSize} options={SIZE_OPTIONS} onChange={setSelectedSize} />
            </>
          ) : (
            <>
              <PendingSelect label="Brand" />
              <PendingSelect label="Model" />
              <ColorBox value={selectedColor} onChange={setSelectedColor} />
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:sticky sm:right-0 sm:bg-bg sm:pl-2">
          <span
            aria-label={priceKs === null ? "Price unavailable" : priceLabel}
            data-editor-price
            data-editor-price-ks={priceKs ?? ""}
            className="hidden shrink-0 whitespace-nowrap text-xs font-semibold tabular-nums text-text-secondary sm:inline"
          >
            {priceLabel}
          </span>
          <button type="button" aria-label="Save" data-editor-box="Save" disabled className={ACTION_BOX}>
            Save
          </button>
          <button type="button" aria-label="Buy" data-editor-box="Buy" disabled className={ACTION_BOX}>
            Buy
          </button>
        </div>
      </div>
    </div>
  );
}
