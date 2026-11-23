// The shop inbox (Plan P1 item 10: "a real inbox behind /contact"). Until now `/contact` only built a
// mailto link, so a message lived in whatever mail app the visitor happened to have — the shop had no
// record and no way to see a claim it had been told about. This module is the record: the form writes
// one entry, the admin reads it, and a claim still flows into the takedown path.

export const CONTACT_TOPICS = ["claim", "order", "product", "other"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const CONTACT_TOPIC_LABEL: Record<ContactTopic, string> = {
  claim: "Copyright claim",
  order: "Order help",
  product: "Product or sizing",
  other: "Something else",
};

export type ContactMessageStatus = "new" | "read" | "answered";

export const CONTACT_STATUS_LABEL: Record<ContactMessageStatus, string> = {
  new: "New",
  read: "Read",
  answered: "Answered",
};

export type ContactMessage = {
  id: string;
  topic: ContactTopic;
  name: string;
  email: string;
  orderNumber?: string;
  designRef?: string;
  body: string;
  at: string;
  status: ContactMessageStatus;
  /** Set when an admin closes it, so "answered" means someone actually did. */
  handledAt?: string;
};

export type ContactDraft = {
  topic: ContactTopic;
  name: string;
  email: string;
  orderNumber?: string;
  designRef?: string;
  body: string;
};

export const CONTACT_BODY_MIN = 10;
export const CONTACT_BODY_MAX = 2000;

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What stops a message being sent, in the order the form shows it. */
export function contactDraftIssues(draft: Partial<ContactDraft>): string[] {
  const issues: string[] = [];
  if (!draft.name?.trim()) issues.push("Add your name so we know who we are replying to.");
  if (!draft.email?.trim()) issues.push("Add an email address for the reply.");
  else if (!EMAIL_SHAPE.test(draft.email.trim())) issues.push("That email address does not look complete.");
  const body = draft.body?.trim() ?? "";
  if (!body) issues.push("Write your message.");
  else if (body.length < CONTACT_BODY_MIN) issues.push(`A useful message is at least ${CONTACT_BODY_MIN} characters.`);
  else if (body.length > CONTACT_BODY_MAX) issues.push(`Keep the message under ${CONTACT_BODY_MAX} characters.`);
  if (!draft.topic || !CONTACT_TOPICS.includes(draft.topic)) issues.push("Choose what the message is about.");
  // A claim without the design is not actionable, and the page already asks for it.
  if (draft.topic === "claim" && !draft.designRef?.trim()) issues.push("A claim needs the design name or a link to it.");
  return issues;
}

function nextMessageId(existing: readonly ContactMessage[]): string {
  const highest = existing.reduce((max, message) => {
    const match = /^#MSG-(\d+)$/.exec(message.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `#MSG-${highest + 1}`;
}

/**
 * Records one message. Returns the message so the form can show its reference, and the data unchanged
 * when the draft cannot be sent, so a caller that skipped validation cannot write a half message.
 */
export function submitContactMessage<T extends { contactMessages: ContactMessage[] }>(
  data: T,
  draft: ContactDraft,
  at = new Date().toISOString(),
): { data: T; message: ContactMessage | null; issues: string[] } {
  const issues = contactDraftIssues(draft);
  if (issues.length) return { data, message: null, issues };
  const message: ContactMessage = {
    id: nextMessageId(data.contactMessages),
    topic: draft.topic,
    name: draft.name.trim(),
    email: draft.email.trim(),
    orderNumber: draft.orderNumber?.trim() || undefined,
    designRef: draft.designRef?.trim() || undefined,
    body: draft.body.trim(),
    at,
    status: "new",
  };
  return { data: { ...data, contactMessages: [message, ...data.contactMessages] }, message, issues: [] };
}

/** Newest first, which is the order the store keeps them in. */
export function contactInbox(messages: readonly ContactMessage[]): ContactMessage[] {
  return [...messages].sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
}

export function unreadContactCount(messages: readonly ContactMessage[]): number {
  return messages.filter((message) => message.status === "new").length;
}

/** Moving a message forward only: answered is final, and a read message does not fall back to new. */
export function setContactStatus<T extends { contactMessages: ContactMessage[] }>(
  data: T,
  id: string,
  status: ContactMessageStatus,
  at = new Date().toISOString(),
): T {
  return {
    ...data,
    contactMessages: data.contactMessages.map((message) => {
      if (message.id !== id) return message;
      if (message.status === "answered" && status !== "answered") return message;
      return { ...message, status, handledAt: status === "answered" ? at : message.handledAt };
    }),
  };
}

export function normalizeContactMessages(raw: unknown): ContactMessage[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw.flatMap((entry): ContactMessage[] => {
    if (!entry || typeof entry !== "object") return [];
    const value = entry as Partial<ContactMessage>;
    if (typeof value.id !== "string" || seen.has(value.id)) return [];
    if (typeof value.name !== "string" || typeof value.email !== "string" || typeof value.body !== "string") return [];
    if (!value.topic || !CONTACT_TOPICS.includes(value.topic)) return [];
    if (!value.status || !["new", "read", "answered"].includes(value.status)) return [];
    if (typeof value.at !== "string") return [];
    seen.add(value.id);
    return [{
      id: value.id,
      topic: value.topic,
      name: value.name,
      email: value.email,
      orderNumber: typeof value.orderNumber === "string" ? value.orderNumber : undefined,
      designRef: typeof value.designRef === "string" ? value.designRef : undefined,
      body: value.body,
      at: value.at,
      status: value.status,
      handledAt: typeof value.handledAt === "string" ? value.handledAt : undefined,
    }];
  });
}

/** A reply the shop can send from its own mail app, with the reference already in the subject. */
export function contactReplyMailto(message: ContactMessage, shopEmail: string): string {
  const subject = `${CONTACT_TOPIC_LABEL[message.topic]} ${message.id} — reply`;
  const body = [
    `Hello ${message.name.split(/\s+/)[0] || "there"},`,
    "",
    `Thank you for writing to MH Fashion about ${CONTACT_TOPIC_LABEL[message.topic].toLowerCase()}.`,
    "",
    "",
    `--- your message (${message.id}, ${message.at.slice(0, 10)}) ---`,
    message.orderNumber ? `Order: ${message.orderNumber}` : null,
    message.designRef ? `Design: ${message.designRef}` : null,
    message.body,
  ].filter((line): line is string => line !== null).join("\n");
  return `mailto:${message.email}?cc=${encodeURIComponent(shopEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
