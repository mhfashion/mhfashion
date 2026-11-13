"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import CopyrightBar from "@/components/CopyrightBar";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function SiteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isEditor = pathname === "/create";
  return (
    <>
      <div className={`flex-1 ${isEditor ? "min-h-0" : "pb-16 md:pb-0"}`}>{children}</div>
      {!isEditor && <CopyrightBar />}
      {!isEditor && <MobileBottomNav />}
    </>
  );
}
