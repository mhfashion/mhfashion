"use client";

import { useState, useSyncExternalStore } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { AdminButton, AdminCard, AdminCardHeader, AdminEmpty } from "@/components/admin/AdminUi";
import { clearClientErrorLog, readClientErrorLog, subscribeClientErrorLog, summariseClientErrors, type ClientErrorEntry, type ClientErrorSummary } from "@/lib/error-log";
import { formatAdminDateTime } from "@/lib/admin-demo-data";

const KIND_LABEL: Record<ClientErrorEntry["kind"], string> = {
  error: "Page crashed",
  global: "App crashed",
  unhandled: "Handler threw",
};

/**
 * What this browser saw break. There is no server-side error feed yet (that needs a provider decision
 * and a key), so this is the honest version: the crashes that happened on *this* device, newest first,
 * grouped so a repeated one reads as "4 times" instead of four identical rows.
 */
const NO_ENTRIES: ClientErrorEntry[] = [];

/**
 * `useSyncExternalStore` rather than an effect: the log lives in localStorage, so it must be read on the
 * client after hydration, and a crash recorded in another tab has to reach this table without a reload.
 * The snapshot is cached against the stored string, because React compares snapshots by identity.
 */
let snapshotKey: string | null = null;
let snapshotValue: ClientErrorEntry[] = NO_ENTRIES;
function clientErrorSnapshot(): ClientErrorEntry[] {
  let raw: string | null = null;
  try {
    raw = typeof window === "undefined" ? null : window.localStorage.getItem("mh-fashion-client-error-log");
  } catch {
    // Storage disabled: show an empty log rather than crashing the settings page.
    return NO_ENTRIES;
  }
  if (raw === snapshotKey) return snapshotValue;
  snapshotKey = raw;
  snapshotValue = readClientErrorLog();
  return snapshotValue;
}
function serverSnapshot(): ClientErrorEntry[] {
  return NO_ENTRIES;
}

export default function AdminCrashLog() {
  const entries = useSyncExternalStore(subscribeClientErrorLog, clientErrorSnapshot, serverSnapshot);
  const [openId, setOpenId] = useState<string | null>(null);

  const groups: ClientErrorSummary[] = summariseClientErrors(entries);

  return (
    <AdminCard className="mt-3 overflow-hidden">
      <AdminCardHeader
        title="Crash log"
        description="Crashes recorded on this device — kept in the browser, never uploaded"
        actions={
          <AdminButton variant="secondary" onClick={() => clearClientErrorLog()} disabled={entries.length === 0}>
            <Trash2 size={14} /> Clear
          </AdminButton>
        }
      />
      <div className="px-4 py-4 sm:px-5">
        {groups.length === 0 ? (
          <AdminEmpty title="No crashes recorded" description="Nothing has failed in this browser since the log was last cleared." />
        ) : (
          <ul className="space-y-2" data-crash-log>
            {groups.map((group) => {
              const newest = group.entries[0];
              const open = openId === `${group.kind}|${group.path}|${group.message}`;
              return (
                <li key={`${group.kind}|${group.path}|${group.message}`} className="rounded-xl border border-[#e4e9ef] bg-white">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : `${group.kind}|${group.path}|${group.message}`)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left"
                    aria-expanded={open}
                    data-crash-row
                  >
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#c2410c]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-bold text-[#394250]">{group.message}</span>
                      <span className="mt-0.5 block text-[9px] text-[#87909b]">
                        {KIND_LABEL[group.kind]} · {group.path} · {formatAdminDateTime(group.lastAt)}
                        {group.count > 1 ? ` · ${group.count} times` : ""}
                      </span>
                    </span>
                    {newest.digest ? <span className="shrink-0 rounded bg-[#f1f4f8] px-1.5 py-0.5 font-mono text-[8px] text-[#5b6573]">{newest.digest}</span> : null}
                  </button>
                  {open ? (
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words border-t border-[#eef1f5] bg-[#f8fafc] px-3 py-2 font-mono text-[9px] leading-4 text-[#4a5461]">
                      {newest.stack || "No stack was captured."}
                    </pre>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 rounded-xl bg-[#f7f9fb] px-3 py-2 text-[9px] leading-4 text-[#87909b]">
          Stored under <code className="mx-1 rounded bg-white px-1 py-0.5 font-mono text-[8px]">mh-fashion-client-error-log</code>
          in this browser only. To hear about crashes on other devices, a reporting endpoint and a provider account are
          still needed — see the operations item in the plan.
        </p>
      </div>
    </AdminCard>
  );
}
