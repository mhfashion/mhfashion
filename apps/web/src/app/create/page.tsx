import KittlCanvas from "@/components/KittlCanvas";

export default function CreatePage() {
  return (
    <div className="flex h-[calc(100dvh-var(--mobile-navigation-height,4rem))] min-h-0 flex-col overflow-hidden md:h-dvh">
      <div className="min-h-0 flex-1">
        <KittlCanvas />
      </div>
    </div>
  );
}
