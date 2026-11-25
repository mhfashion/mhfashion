import type { ReactNode } from "react";

/**
 * The one banner the Guide uses: the landing hero and each article's header. Keeping it in one place is
 * the point — the two used to be different shapes and read as separate designs.
 */
export default function GuideBanner({
  eyebrow,
  title,
  lead,
  meta,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-xl bg-gradient-to-r from-[#efffdb] via-[#e0f7c4] to-[#c4ee9c] px-3.5 py-2.5 text-[#172810] sm:rounded-2xl sm:px-8 sm:py-3.5 lg:px-9">
      <div className="relative z-10 max-w-[78%] sm:max-w-[62%]">
        <span className="inline-flex rounded-full bg-[#5aa817] px-2 py-1 text-[8px] font-black uppercase tracking-wide text-white sm:px-3 sm:py-1.5 sm:text-[10px]">
          {eyebrow}
        </span>
        <h1 className="mt-1 text-lg font-black leading-[1.02] tracking-tight sm:mt-2 sm:text-2xl lg:text-[26px]">{title}</h1>
        {lead && <p className="mt-1.5 line-clamp-2 max-w-sm text-[10px] leading-relaxed text-[#355128] sm:mt-2 sm:line-clamp-3 sm:text-[11px]">{lead}</p>}
        {meta && <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] font-semibold text-[#355128] sm:mt-2 sm:text-[10px]">{meta}</div>}
        {action && <div className="mt-2 sm:mt-3">{action}</div>}
      </div>
      <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#9bda45]/50 blur-sm sm:right-8 sm:h-52 sm:w-52" />
      <div className="absolute bottom-[-48px] right-[13%] hidden h-44 w-32 rotate-[-8deg] rounded-[45%] bg-white/80 shadow-xl sm:block" aria-hidden="true">
        <div className="absolute left-1/2 top-12 -translate-x-1/2 text-center text-base font-black leading-none text-[#4c9d16]">
          MH<br /><span className="text-[9px]">FASHION</span>
        </div>
      </div>
      <div className="absolute bottom-2 right-3 text-base font-black italic leading-none text-[#54a817]/80 sm:bottom-3 sm:right-10 sm:text-2xl">
        Your<br />Style
      </div>
    </section>
  );
}
