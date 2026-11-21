"use client";

import { useMemo, useState } from "react";
import { Copy, Mail, Send } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/storefront-info";

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
        The form builds the email for you; nothing is sent until you press send in your own mail app.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Topic</span>
          <select aria-label="Topic" value={topic} onChange={(event) => setTopic(event.target.value as TopicId)} className={field}>
            {TOPICS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Your name</span>
          <input aria-label="Your name" value={name} onChange={(event) => setName(event.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Your email</span>
          <input aria-label="Your email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Order number (optional)</span>
          <input aria-label="Order number" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="#MH1101" className={field} />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Design link or name (claims)</span>
          <input aria-label="Design link or name" value={designLink} onChange={(event) => setDesignLink(event.target.value)} className={field} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Message</span>
          <textarea aria-label="Message" rows={5} value={message} onChange={(event) => setMessage(event.target.value)} className={field} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={ready ? mailto : undefined}
          data-contact-send
          aria-disabled={!ready}
          className={`inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[11px] font-bold text-accent-foreground ${ready ? "" : "pointer-events-none opacity-50"}`}
        >
          <Send size={13} /> Open in your email app
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
