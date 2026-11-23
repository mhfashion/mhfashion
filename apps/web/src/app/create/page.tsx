"use client";

import { useState } from "react";
import EditorCanvas from "@/components/EditorCanvas";
import Header from "@/components/Header";
import EditorHeaderBar2 from "@/components/EditorHeaderBar2";
import { DEFAULT_EDITOR_GSM, DEFAULT_EDITOR_PRODUCT, type EditorProduct } from "@/lib/editor-product";
import { useI18n } from "@/lib/i18n";

export default function CreatePage() {
  const [product, setProduct] = useState<EditorProduct>(DEFAULT_EDITOR_PRODUCT);
  const [gsm, setGsm] = useState(DEFAULT_EDITOR_GSM);
  const { t } = useI18n();

  return (
    <div className="flex h-[calc(100dvh-var(--mobile-navigation-height,4rem))] min-h-0 flex-col overflow-hidden md:h-dvh">
      <h1 className="sr-only">{t("editor.pageTitle")}</h1>
      <div data-editor-shared-header className="shrink-0">
        <Header />
      </div>
      <EditorHeaderBar2
        product={product}
        onProductChange={setProduct}
        gsm={gsm}
        onGsmChange={setGsm}
      />
      <div className="min-h-0 flex-1">
        <EditorCanvas product={product} />
      </div>
    </div>
  );
}
