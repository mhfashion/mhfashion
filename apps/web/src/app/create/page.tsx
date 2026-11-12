import Header from "@/components/Header";
import KittlCanvas from "@/components/KittlCanvas";

export default function CreatePage() {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <div className="shrink-0">
        <Header />
      </div>
      <div className="min-h-0 flex-1">
        <KittlCanvas />
      </div>
    </div>
  );
}
