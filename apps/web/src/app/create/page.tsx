"use client";

import { useState } from "react";
import KittlCanvas from "@/components/KittlCanvas";
import Header from "@/components/Header";
import EditorHeaderBar2 from "@/components/EditorHeaderBar2";
import { DEFAULT_EDITOR_PRODUCT, type EditorProduct } from "@/lib/editor-product";

export default function CreatePage() {
  const [product, setProduct] = useState<EditorProduct>(DEFAULT_EDITOR_PRODUCT);
  const [gsm, setGsm] = useState("");

  function changeProduct(nextProduct: EditorProduct) {
    setProduct(nextProduct);
    setGsm("");
  }

  return (
    <div className="flex h-[calc(100dvh-var(--mobile-navigation-height,4rem))] min-h-0 flex-col overflow-hidden md:h-dvh">
      <div data-editor-shared-header className="shrink-0">
        <Header />
      </div>
      <EditorHeaderBar2
        product={product}
        onProductChange={changeProduct}
        gsm={gsm}
        onGsmChange={setGsm}
      />
      <div className="min-h-0 flex-1">
        <KittlCanvas product={product} />
      </div>
    </div>
  );
}
