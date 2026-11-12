export default function KittlCanvas() {
  return (
    <main className="h-[calc(100dvh-4rem)] min-h-[420px] overflow-hidden bg-[#eef0f5]">
      <div className="flex h-full w-full items-center justify-center overflow-auto p-6 sm:p-12">
        <div className="h-full max-h-[820px] w-full max-w-[1120px] bg-white shadow-[0_14px_45px_rgba(28,31,38,0.12)]" aria-label="Design canvas" />
      </div>
    </main>
  );
}
