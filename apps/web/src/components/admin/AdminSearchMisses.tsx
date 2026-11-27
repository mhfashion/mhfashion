"use client";

import { useEffect, useState } from "react";
import { SearchX } from "lucide-react";
import { AdminCard, AdminCardHeader, AdminEmpty } from "@/components/admin/AdminUi";
import { formatAdminDateTime } from "@/lib/admin-demo-data";

type Miss = { term: string; hits: number; lastSeen: string };
type Payload = { configured?: boolean; pending?: boolean; misses?: Miss[] };

/**
 * Plan §17 S8: the searches that found nothing, this week. The rows live in Supabase (migration 0011) and
 * hold no user, so the panel can only say what people typed, not who typed it.
 */
export default function AdminSearchMisses({ days = 7 }: { days?: number }) {
  const [state, setState] = useState<{ loading: boolean; payload: Payload; failed: boolean }>({ loading: true, payload: {}, failed: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/admin/search-misses?days=${days}&limit=10`, { cache: "no-store" });
        const payload = (await response.json()) as Payload;
        if (!cancelled) setState({ loading: false, payload, failed: !response.ok });
      } catch {
        if (!cancelled) setState({ loading: false, payload: {}, failed: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const misses = state.payload.misses ?? [];

  return (
    <AdminCard className="overflow-hidden" >
      <AdminCardHeader title="Search misses" description={`Searches that found nothing · last ${days} days`} />
      <div data-admin-search-misses={misses.length}>
        {state.loading ? (
          <p className="px-4 py-6 text-[10px] text-[#87909b] sm:px-5">Reading the search log…</p>
        ) : state.failed ? (
          <AdminEmpty title="The search log could not be read" description="Check the Supabase settings and try again." />
        ) : state.payload.configured === false ? (
          <AdminEmpty
            title="The search log is not connected"
            description="Add SUPABASE_SERVICE_ROLE_KEY to the environment to read the misses recorded by the storefront."
          />
        ) : state.payload.pending ? (
          <AdminEmpty title="Run migration 0011" description="The search_misses table is missing, so nothing is being recorded yet." />
        ) : misses.length ? (
          <ul className="divide-y divide-[#f0f2f4]">
            {misses.map((miss) => (
              <li key={miss.term} className="flex items-center gap-2 px-4 py-2.5 sm:px-5">
                <SearchX size={13} className="shrink-0 text-[#b0b8c2]" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-semibold text-[#394250]">{miss.term}</span>
                <span className="shrink-0 rounded-full bg-[#f2f5f8] px-2 py-0.5 text-[9px] font-bold tabular-nums text-[#5a6472]">{miss.hits}×</span>
                <span className="w-24 shrink-0 text-right text-[8px] text-[#9aa2ae]">{formatAdminDateTime(miss.lastSeen)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmpty title="No searches came back empty" description="Every query this week found something." />
        )}
      </div>
    </AdminCard>
  );
}
