import KittlCanvas from "@/components/KittlCanvas";
import Header from "@/components/Header";
import EditorHeaderBar2 from "@/components/EditorHeaderBar2";
export default function CreatePage() {
  return (
    <div className="flex h-[calc(100dvh-var(--mobile-navigation-height,4rem))] min-h-0 flex-col overflow-hidden md:h-dvh">
      <div data-editor-shared-header className="shrink-0">
        <Header />
      </div>
      <EditorHeaderBar2 />
      <div className="min-h-0 flex-1">
        <KittlCanvas />
      </div>
    </div>
  );
}
