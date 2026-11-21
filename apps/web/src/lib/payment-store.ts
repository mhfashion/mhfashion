// Server-side payment intents. This is deliberately tiny and in-memory: it holds the amount and the
// status between the checkout request and the provider callback. It is replaced by a Supabase table
// when the backend lands (P0 item 1); until then a restart forgets open intents, which is acceptable
// because nothing is charged.

import type { PaymentEvent, PaymentIntent, PaymentProviderId, PaymentStatus } from "@/lib/payments";

type StoredIntent = PaymentIntent & { status: PaymentStatus; events: string[] };

type Store = { intents: Map<string, StoredIntent> };

const globalStore = globalThis as unknown as { __mhPaymentIntents?: Store };

function store(): Store {
  if (!globalStore.__mhPaymentIntents) globalStore.__mhPaymentIntents = { intents: new Map() };
  return globalStore.__mhPaymentIntents;
}

export function createIntent(input: Omit<PaymentIntent, "ref" | "createdAt"> & { ref: string; createdAt?: string }): StoredIntent {
  const intent: StoredIntent = {
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
    status: "pending",
    events: [],
  };
  store().intents.set(intent.ref, intent);
  return intent;
}

export function getIntent(ref: string): StoredIntent | undefined {
  return store().intents.get(ref);
}

/** Records an event once. A repeated event id returns `duplicate: true` and changes nothing. */
export function recordEvent(event: PaymentEvent): { intent: StoredIntent | undefined; duplicate: boolean } {
  const intent = store().intents.get(event.ref);
  if (!intent) return { intent: undefined, duplicate: false };
  if (intent.events.includes(event.id)) return { intent, duplicate: true };
  intent.events.push(event.id);
  intent.status = event.status;
  return { intent, duplicate: false };
}

export function resetIntents(): void {
  store().intents.clear();
}

export type { StoredIntent, PaymentProviderId, PaymentStatus };
