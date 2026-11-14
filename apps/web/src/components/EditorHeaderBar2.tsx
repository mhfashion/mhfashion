const SELECTORS = ["Product", "GSM", "Color", "Size"] as const;

export default function EditorHeaderBar2() {
  return (
    <div
      role="region"
      aria-label="Header Bar 2"
      className="h-14 w-full shrink-0 overflow-x-auto overscroll-x-contain border-b border-[#d8dce2] bg-[#f1f2f5] px-3"
    >
      <div className="flex h-full w-max min-w-full items-center justify-between gap-2">
        <div className="flex shrink-0 items-center gap-2">
          {SELECTORS.map((label) => (
            <button
              key={label}
              type="button"
              disabled
              className="inline-flex h-11 min-w-[76px] shrink-0 items-center justify-center rounded-md border border-[#d8dce2] bg-white px-3 text-sm font-medium text-[#53606a] disabled:cursor-default disabled:opacity-100"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled
            className="inline-flex h-11 min-w-[76px] items-center justify-center rounded-md border border-[#d8dce2] bg-white px-4 text-sm font-semibold text-[#53606a] disabled:cursor-default disabled:opacity-100"
          >
            Save
          </button>
          <button
            type="button"
            disabled
            className="inline-flex h-11 min-w-[76px] items-center justify-center rounded-md bg-[#a58be8] px-4 text-sm font-semibold text-white disabled:cursor-default disabled:opacity-100"
          >
            Buy
          </button>
        </div>
      </div>
    </div>
  );
}
