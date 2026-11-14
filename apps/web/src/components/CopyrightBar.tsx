"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

export default function CopyrightBar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const isHome = pathname === "/";

  if (pathname === "/create" || pathname?.startsWith("/create/")) return null;

  return (
    <footer
      className={`mt-auto hidden border-t border-border px-4 py-3 md:block md:px-8 ${
        isHome ? "md:border-t-0 md:py-0" : "md:py-4"
      }`}
    >
      <p className={`text-center text-[9px] text-text-faint ${isHome ? "md:pt-4" : ""}`}>
        © {new Date().getFullYear()} MH Fashion. {t("footer.rights")}
      </p>
    </footer>
  );
}
