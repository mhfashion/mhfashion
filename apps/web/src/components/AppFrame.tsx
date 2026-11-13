"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import CopyrightBar from "@/components/CopyrightBar";

export default function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isEditor = pathname === "/create" || pathname.startsWith("/create/");

  return (
    <div className={isEditor ? "flex h-dvh min-h-0 flex-col overflow-hidden" : "flex min-h-screen flex-col pb-16 md:pb-0"}>
      <div className={isEditor ? "min-h-0 flex-1" : "flex-1"}>{children}</div>
      <CopyrightBar />
    </div>
  );
}
