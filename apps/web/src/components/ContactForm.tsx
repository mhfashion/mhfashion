"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Copy, Mail, Send } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/storefront-info";
import { updateAdminData } from "@/lib/admin-demo-store";
import { contactFieldIssues, submitContactMessage, type ContactField, type ContactMessage } from "@/lib/contact-messages";

const TOPICS = [
  { id: "claim", label: "Copyright claim about a design", subject: "Copyright claim" },
  { id: "order", label: "Help with an order", subject: "Order help" },
  { id: "product", label: "Product or sizing question", subject: "Product question" },
  { id: "other", label: "Something else", subject: "Enquiry" },
] as const;

type TopicId = (typeof TOPICS)[number]["id"];

export default function ContactForm() {
  const [topic, setTopic] = useState<TopicId>("claim");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [designLink, setDesignLink] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState<ContactMessage | null>(null);
  const [fieldIssues, setFieldIssues] = useState<Partial<Record<ContactField, string>>>({});
  const topicRef = useRef<HTMLSelectElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const designRef = useRef<HTMLInputElement | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);
  const sentRef = useRef<HTMLDivElement | null>(null);
  const issues = Object.values(fieldIssues);

  const subject = useMemo(() => {
    const base = TOPICS.find((entry) => entry.id === topic)?.subject ?? "Enquiry";
    return orderNumber.trim() ? `${base} — ${orderNumber.trim()}` : base;
  }, [topic, orderNumber]);

  const body = useMemo(() => {
    const lines = [
      `Name: ${name || "(your name)"}`,
      `Email: ${email || "(your email)"}`,
      orderNumber.trim() ? `Order: ${orderNumber.trim()}` : null,
      designLink.trim() ? `Design: ${designLink.trim()}` : null,
      "",
      message || "(your message)",
    ].filter((line): line is string => line !== null);
    return lines.join("\n");
  }, [name, email, orderNumber, designLink, message]);

  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const ready = Boolean(name.trim() && email.trim() && message.trim());

  const fields: Record<ContactField, React.RefObject<HTMLElement | null>> = {
    topic: topicRef, name: nameRef, email: emailRef, design: designRef, message: messageRef,
  };

  function sendToShop() {
    const draft = { topic, name, email, orderNumber, designRef: designLink, body: message };
    const found = contactFieldIssues(draft);
    setFieldIssues(found);
    const first = (Object.keys(fields) as ContactField[]).find((field) => found[field]);
    if (first) {
      // The list is announced by role="alert"; the focus goes to the field the shopper has to fix.
      fields[first].current?.focus();
      return;
    }
    let recorded: ContactMessage | null = null;
    updateAdminData((current) => {
      const result = submitContactMessage(current, draft);
      recorded = result.message;
      return result.data;
    });
    setSent(recorded);
    requestAnimationFrame(() => sentRef.current?.focus());
  }

  function writeAnother() {
    setSent(null);
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`To: ${CONTACT_EMAIL}\nSubject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const field = "mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-xs font-semibold outline-none focus:border-accent";

  return (
    <section data-contact-form className="rounded-2xl border border-border bg-bg-surface p-4 shadow-sm sm:p-6">
      <h2 className="text-sm font-black">Write to us</h2>
      <p className="mt-1 text-[10px] text-text-muted">
        Send it to the shop here and it is recorded with a reference. You can still open it in your own mail app instead.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Topic</span>
          <select ref={topicRef} aria-label="Topic" aria-invalid={fieldIssues.topic ? true : undefined} value={topic} onChange={(event) => setTopic(event.target.value as TopicId)} className={field}>
            {TOPICS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Your name</span>
          <input ref={nameRef} aria-label="Your name" aria-invalid={fieldIssues.name ? true : undefined} value={name} onChange={(event) => setName(event.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Your email</span>
          <input ref={emailRef} aria-label="Your email" type="email" aria-invalid={fieldIssues.email ? true : undefined} value={email} onChange={(event) => setEmail(event.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Order number (optional)</span>
          <input aria-label="Order number" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="#MH1101" className={field} />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Design link or name (claims)</span>
          <input ref={designRef} aria-label="Design link or name" aria-invalid={fieldIssues.design ? true : undefined} value={designLink} onChange={(event) => setDesignLink(event.target.value)} className={field} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Message</span>
          <textarea ref={messageRef} aria-label="Message" aria-invalid={fieldIssues.message ? true : undefined} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} className={field} />
        </label>
      </div>

      {sent ? (
        <div ref={sentRef} role="status" tabIndex={-1} data-contact-sent className="mt-4 rounded-xl border border-[#cfe8c2] bg-[#f3fbee] px-3 py-2.5 text-[11px] leading-5 text-[#2f6b2a]">
          <p className="flex items-center gap-1.5 font-bold"><Check size={13} /> Message {sent.id} is with the shop</p>
          <p className="mt-0.5">We reply to {sent.email} within one business day. Keep the reference if you write again.</p>
          <button type="button" onClick={writeAnother} className="mt-1 text-[10px] font-bold underline">Write another message</button>
        </div>
      ) : null}
      {issues.length ? (
        <ul role="alert" data-contact-issues className="mt-3 space-y-1 rounded-xl border border-[#f3d2d4] bg-[#fff6f6] px-3 py-2 text-[10px] font-semibold text-[#c9424a]">
          {issues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={sendToShop}
          data-contact-record
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[11px] font-bold text-accent-foreground"
        >
          <Send size={13} /> Send to the shop
        </button>
        <a
          href={ready ? mailto : undefined}
          data-contact-send
          aria-disabled={!ready}
          className={`inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-[11px] font-bold ${ready ? "" : "pointer-events-none opacity-50"}`}
        >
          <Mail size={13} /> Open in your email app
        </a>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-[11px] font-bold">
          <Copy size={13} /> {copied ? "Copied" : "Copy the message"}
        </button>
        <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-[11px] font-bold">
          <Mail size={13} /> {CONTACT_EMAIL}
        </a>
      </div>
      {ready ? null : <p className="mt-2 text-[10px] text-text-muted">Add your name, email and a message to open the mail app.</p>}
      <p data-contact-subject className="mt-2 text-[10px] text-text-muted">Subject: {subject}</p>
    </section>
  );
}
