"use client";

/**
 * Attribute selection follows a fixed order, and each earlier choice filters
 * the options available in ALL later attributes down the chain:
 *
 *   Product → Print Method → Fabric Type → Knit/Fabric Structure
 *           → GSM → Color → MH Cuttings → Size
 *
 * Unavailable combinations are hidden entirely (never greyed out).
 * These option lists are placeholders — the real ones come from the
 * admin-managed attribute tables once those are wired up.
 */

export type AttributeSelection = {
  product: string;
  printMethod: string;
  fabricType: string;
  knitStructure: string;
  gsm: string;
  color: string;
  cutting: string;
  size: string;
};

const PRODUCTS = ["T-shirt", "Hoodie", "Streetwear", "Cup", "Phone Cover"];
const PRINT_METHODS = ["DTF", "Sublimation"];

// Sublimation only bonds properly to polyester, so cotton options disappear.
const FABRIC_BY_PRINT_METHOD: Record<string, string[]> = {
  DTF: ["Combed Cotton", "Compact Combed Cotton", "Polyester"],
  Sublimation: ["Polyester"],
};

const KNIT_BY_FABRIC: Record<string, string[]> = {
  "Combed Cotton": ["Single Jersey", "Interlock"],
  "Compact Combed Cotton": ["Single Jersey", "Interlock"],
  Polyester: ["Single Jersey", "Interlock", "Air Layer"],
};

const GSM_BY_KNIT: Record<string, string[]> = {
  "Single Jersey": ["160", "180", "200"],
  Interlock: ["180", "200", "240"],
  "Air Layer": ["240", "280"],
};

const COLORS = [
  { name: "Navy", hex: "#1e3a5f" },
  { name: "Black", hex: "#1f1f1f" },
  { name: "Cream", hex: "#e8e4da" },
  { name: "Red", hex: "#c0504d" },
];
const CUTTINGS = ["Crew Neck", "V-Neck", "Oversized"];
const SIZES = ["S", "M", "L", "XL"];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[10px]">
      <span className="text-text-muted whitespace-nowrap">{label}</span>
      {children}
    </div>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-bg-surface rounded-md px-1.5 py-1 text-[10px] font-medium outline-none"
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

export default function AttributeBar({
  selection,
  onChange,
  mockupName,
  onAddMockup,
  onRemoveMockup,
}: {
  selection: AttributeSelection;
  onChange: (next: AttributeSelection) => void;
  mockupName?: string | null;
  onAddMockup?: () => void;
  onRemoveMockup?: () => void;
}) {
  const fabricOptions = FABRIC_BY_PRINT_METHOD[selection.printMethod] ?? [];
  const knitOptions = KNIT_BY_FABRIC[selection.fabricType] ?? [];
  const gsmOptions = GSM_BY_KNIT[selection.knitStructure] ?? [];

  // Changing an attribute resets everything downstream to the first valid
  // option, so the selection can never sit in an impossible combination.
  const setPrintMethod = (printMethod: string) => {
    const fabricType = (FABRIC_BY_PRINT_METHOD[printMethod] ?? [])[0] ?? "";
    const knitStructure = (KNIT_BY_FABRIC[fabricType] ?? [])[0] ?? "";
    const gsm = (GSM_BY_KNIT[knitStructure] ?? [])[0] ?? "";
    onChange({ ...selection, printMethod, fabricType, knitStructure, gsm });
  };

  const setFabricType = (fabricType: string) => {
    const knitStructure = (KNIT_BY_FABRIC[fabricType] ?? [])[0] ?? "";
    const gsm = (GSM_BY_KNIT[knitStructure] ?? [])[0] ?? "";
    onChange({ ...selection, fabricType, knitStructure, gsm });
  };

  const setKnitStructure = (knitStructure: string) => {
    const gsm = (GSM_BY_KNIT[knitStructure] ?? [])[0] ?? "";
    onChange({ ...selection, knitStructure, gsm });
  };

  return (
    <div className="flex max-w-full items-center gap-2 overflow-x-auto border-t border-border px-2 py-2 sm:gap-4 sm:px-4 sm:py-2.5">
      <Field label="Product">
        <Select
          value={selection.product}
          options={[...new Set([...PRODUCTS, selection.product])]}
          onChange={(product) => onChange({ ...selection, product })}
        />
      </Field>

      <Field label="Mockup">
        {mockupName ? (
          <div className="flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/5 px-1.5 py-1">
            <span className="max-w-24 truncate text-[10px] font-semibold text-accent">{mockupName}</span>
            <button type="button" onClick={onAddMockup} className="text-[9px] text-text-secondary hover:text-accent">Replace</button>
            <button type="button" onClick={onRemoveMockup} className="text-[9px] text-text-muted hover:text-accent">×</button>
          </div>
        ) : (
          <button type="button" onClick={onAddMockup} className="flex items-center gap-1 rounded-md border border-dashed border-accent px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/10">
            <span className="text-sm leading-none">+</span> Add mockup
          </button>
        )}
      </Field>

      <Field label="Print Method">
        <Select
          value={selection.printMethod}
          options={PRINT_METHODS}
          onChange={setPrintMethod}
        />
      </Field>

      <Field label="Fabric">
        <Select
          value={selection.fabricType}
          options={fabricOptions}
          onChange={setFabricType}
        />
      </Field>

      <Field label="Knit">
        <Select
          value={selection.knitStructure}
          options={knitOptions}
          onChange={setKnitStructure}
        />
      </Field>

      <Field label="GSM">
        <Select
          value={selection.gsm}
          options={gsmOptions}
          onChange={(gsm) => onChange({ ...selection, gsm })}
        />
      </Field>

      <Field label="Color">
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c.name}
              title={c.name}
              onClick={() => onChange({ ...selection, color: c.name })}
              style={{ background: c.hex }}
              className={`w-4 h-4 rounded-full ${
                selection.color === c.name
                  ? "ring-2 ring-accent ring-offset-1 ring-offset-bg"
                  : ""
              }`}
            />
          ))}
        </div>
      </Field>

      <Field label="MH Cuttings">
        <Select
          value={selection.cutting}
          options={CUTTINGS}
          onChange={(cutting) => onChange({ ...selection, cutting })}
        />
      </Field>

      <Field label="Size">
        <div className="flex gap-1">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => onChange({ ...selection, size: s })}
              className={`rounded px-1.5 py-0.5 border text-[9px] ${
                selection.size === s
                  ? "border-accent text-accent"
                  : "border-border-light text-text-secondary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}
