"use client";

import { useI18n } from "@/lib/i18n";

export default function GuideLabel({ id, fallback }: { id: string; fallback: string }) {
  const { t } = useI18n();
  return <>{t(id) || fallback}</>;
}
