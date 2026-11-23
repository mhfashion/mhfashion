"use client";

import { useMemo, useState } from "react";
import { Check, Inbox, Mail, Search, ShieldAlert } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminBadge, AdminButton, AdminCard, AdminCardHeader, AdminDrawer, AdminEmpty, AdminInput, AdminSelect, AdminStat, type AdminTone } from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { formatAdminDate } from "@/lib/admin-demo-data";
import { CONTACT_EMAIL } from "@/lib/storefront-info";
import {
  CONTACT_TOPIC_LABEL, CONTACT_TOPICS, contactInbox, contactReplyMailto, setContactStatus, unreadContactCount,
  type ContactMessage, type ContactMessageStatus, type ContactTopic,
} from "@/lib/contact-messages";

const STATUS_TONES: Record<ContactMessageStatus, AdminTone> = {
  new: "amber",
  read: "blue",
  answered: "green",
};

export default function AdminMessages() {
  const data = useAdminDemoData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactMessageStatus | "All">("All");
  const [topicFilter, setTopicFilter] = useState<ContactTopic | "All">("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const inbox = useMemo(() => contactInbox(data.contactMessages), [data.contactMessages]);
  const visible = useMemo(() => inbox
    .filter((message) => statusFilter === "All" || message.status === statusFilter)
    .filter((message) => topicFilter === "All" || message.topic === topicFilter)
    .filter((message) => `${message.id} ${message.name} ${message.email} ${message.orderNumber ?? ""} ${message.body}`.toLowerCase().includes(query)),
  [inbox, statusFilter, topicFilter, query]);

  const unread = unreadContactCount(data.contactMessages);
  const claims = data.contactMessages.filter((message) => message.topic === "claim").length;
  const answered = data.contactMessages.filter((message) => message.status === "answered").length;

  const open = openId ? inbox.find((message) => message.id === openId) ?? null : null;

  function openMessage(message: ContactMessage) {
    setOpenId(message.id);
    // Opening it is reading it; the badge is there to catch the shop's eye once.
    if (message.status === "new") updateAdminData((current) => setContactStatus(current, message.id, "read"));
  }

  function mark(status: ContactMessageStatus) {
    if (!open) return;
    updateAdminData((current) => setContactStatus(current, open.id, status));
  }

  return (
    <AdminShell active="messages" title="Messages" description="Everything written through the contact form, with a reference the customer keeps.">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminStat label="In the inbox" value={String(data.contactMessages.length)} hint="All messages, newest first" />
        <AdminStat label="Not read yet" value={String(unread)} hint="Opened once, then it stops counting" />
        <AdminStat label="Claims" value={String(claims)} hint="Take the design down from Designs" />
        <AdminStat label="Answered" value={String(answered)} hint="Marked by whoever replied" />
      </div>

      <AdminCard className="mt-3 overflow-hidden">
        <AdminCardHeader
          title="Inbox"
          description="A message is kept here until it is marked answered; nothing is deleted."
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9aa4b1]" />
                <AdminInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, reference" aria-label="Search messages" className="pl-7" />
              </div>
              <AdminSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ContactMessageStatus | "All")} aria-label="Filter by status">
                <option value="All">All statuses</option>
                <option value="new">New</option>
                <option value="read">Read</option>
                <option value="answered">Answered</option>
              </AdminSelect>
              <AdminSelect value={topicFilter} onChange={(event) => setTopicFilter(event.target.value as ContactTopic | "All")} aria-label="Filter by topic">
                <option value="All">All topics</option>
                {CONTACT_TOPICS.map((topic) => <option key={topic} value={topic}>{CONTACT_TOPIC_LABEL[topic]}</option>)}
              </AdminSelect>
            </div>
          )}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[11px]">
            <thead className="bg-[#f7f9fb] text-[9px] uppercase tracking-wide text-[#828c99]">
              <tr>
                <th className="px-3 py-2.5 font-semibold sm:px-5">Reference</th>
                <th className="px-3 py-2.5 font-semibold">Topic</th>
                <th className="px-3 py-2.5 font-semibold">From</th>
                <th className="px-3 py-2.5 font-semibold">Received</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {visible.length ? visible.map((message) => (
                <tr key={message.id} data-message-row={message.id} className={message.status === "new" ? "bg-[#fffdf4]" : "hover:bg-[#fafbfc]"}>
                  <td className="whitespace-nowrap px-3 py-2.5 font-bold sm:px-5">{message.id}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      {message.topic === "claim" ? <ShieldAlert size={11} className="text-[#c9424a]" /> : null}
                      {CONTACT_TOPIC_LABEL[message.topic]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold">{message.name}</p>
                    <p className="text-[9px] text-[#87909b]">{message.email}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#727d8a]">{formatAdminDate(message.at)}</td>
                  <td className="px-3 py-2.5"><AdminBadge tone={STATUS_TONES[message.status]}>{message.status === "new" ? "New" : message.status === "read" ? "Read" : "Answered"}</AdminBadge></td>
                  <td className="px-4 py-2.5 text-right sm:px-5">
                    <AdminButton compact variant="secondary" onClick={() => openMessage(message)} aria-label={`Open ${message.id}`}>Open</AdminButton>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6}>
                    <AdminEmpty
                      title={data.contactMessages.length ? "No message matches this filter" : "The inbox is empty"}
                      description={data.contactMessages.length ? "Try another status or topic." : "A message written through /contact appears here with a reference."}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminDrawer
        open={Boolean(open)}
        title={open ? `${open.id} · ${CONTACT_TOPIC_LABEL[open.topic]}` : "Message"}
        description={open ? `From ${open.name} · ${open.email}` : undefined}
        onClose={() => setOpenId(null)}
        footer={open ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <a href={contactReplyMailto(open, CONTACT_EMAIL)} className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe3e9] px-3 py-1.5 text-[10px] font-bold text-[#394250]">
              <Mail size={11} /> Reply in mail app
            </a>
            {open.status !== "answered" ? (
              <AdminButton onClick={() => mark("answered")}><Check size={12} /> Mark answered</AdminButton>
            ) : <AdminBadge tone="green">Answered {open.handledAt ? formatAdminDate(open.handledAt) : ""}</AdminBadge>}
          </div>
        ) : undefined}
      >
        {open ? (
          <div className="space-y-3" data-message-detail={open.id}>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#727d8a]">
              <AdminBadge tone={STATUS_TONES[open.status]}>{open.status}</AdminBadge>
              <span>Received {formatAdminDate(open.at)}</span>
              {open.orderNumber ? <span className="rounded-full bg-[#f2f5f8] px-2 py-0.5 font-bold">Order {open.orderNumber}</span> : null}
            </div>
            {open.designRef ? (
              <p className="rounded-xl bg-[#f7f9fb] px-3 py-2 text-[10px] text-[#5b6674]">
                <b className="text-[#394250]">Design in the claim:</b> {open.designRef}
              </p>
            ) : null}
            <p className="whitespace-pre-wrap rounded-xl border border-[#edf0f3] bg-white px-3 py-2.5 text-[11px] leading-5 text-[#394250]">{open.body}</p>
            {open.topic === "claim" ? (
              <p className="flex items-start gap-1.5 rounded-xl bg-[#fff6f6] px-3 py-2 text-[10px] leading-4 text-[#c9424a]">
                <ShieldAlert size={12} className="mt-0.5 shrink-0" />
                A claim is handled in Designs: find the design, record the claimant and take it down. A paid order is still produced.
              </p>
            ) : null}
            <p className="flex items-center gap-1.5 text-[10px] text-[#87909b]"><Inbox size={11} /> Messages live in this browser store until the shop is connected to a server.</p>
          </div>
        ) : null}
      </AdminDrawer>
    </AdminShell>
  );
}
