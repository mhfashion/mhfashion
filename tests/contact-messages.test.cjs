const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const inbox = loadModule("apps/web/src/lib/contact-messages.ts");
const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");

const AT = "2026-11-21T09:00:00.000Z";

function draft(overrides = {}) {
  return {
    topic: "order",
    name: "Thura Aung",
    email: "thura.aung@example.com",
    body: "My order #MH1101 has not arrived yet and I would like an update.",
    ...overrides,
  };
}

function store(messages = []) {
  return { contactMessages: messages };
}

test("a message that cannot be acted on is refused, with the reason", () => {
  assert.deepEqual(inbox.contactDraftIssues({}), [
    "Add your name so we know who we are replying to.",
    "Add an email address for the reply.",
    "Write your message.",
    "Choose what the message is about.",
  ]);
  assert.deepEqual(inbox.contactDraftIssues(draft({ email: "thura@" })), ["That email address does not look complete."]);
  assert.deepEqual(inbox.contactDraftIssues(draft({ body: "hi" })), ["A useful message is at least 10 characters."]);
  assert.deepEqual(inbox.contactDraftIssues(draft({ body: "x".repeat(2001) })), ["Keep the message under 2000 characters."]);
  assert.deepEqual(inbox.contactDraftIssues(draft({ topic: "claim" })), ["A claim needs the design name or a link to it."]);
  assert.deepEqual(inbox.contactDraftIssues(draft({ topic: "claim", designRef: "Starburst tee" })), []);
});

test("a refused message writes nothing", () => {
  const before = store();
  const result = inbox.submitContactMessage(before, draft({ email: "" }), AT);
  assert.equal(result.data, before, "the store is untouched");
  assert.equal(result.message, null);
  assert.equal(result.issues.length, 1);
});

test("a good message is recorded once, newest first, with a reference", () => {
  const first = inbox.submitContactMessage(store(), draft(), AT);
  assert.equal(first.message.id, "#MSG-1");
  assert.equal(first.message.status, "new");
  assert.equal(first.data.contactMessages.length, 1);

  const second = inbox.submitContactMessage(first.data, draft({ topic: "claim", designRef: "Starburst tee" }), "2026-11-21T10:00:00.000Z");
  assert.equal(second.message.id, "#MSG-2");
  assert.deepEqual(second.data.contactMessages.map((message) => message.id), ["#MSG-2", "#MSG-1"], "newest first");
  assert.equal(inbox.unreadContactCount(second.data.contactMessages), 2);
  assert.equal(second.message.designRef, "Starburst tee");
  assert.equal(second.message.orderNumber, undefined, "a blank optional field is not stored as an empty string");
});

test("a reference is not reused after a message is removed", () => {
  const withTwo = inbox.submitContactMessage(inbox.submitContactMessage(store(), draft(), AT).data, draft(), AT).data;
  const trimmed = { contactMessages: [withTwo.contactMessages[0]] };
  assert.equal(inbox.submitContactMessage(trimmed, draft(), AT).message.id, "#MSG-3", "a reference is never handed out twice");
});

test("opening a message reads it; answering is final", () => {
  const one = inbox.submitContactMessage(store(), draft(), AT).data;
  const read = inbox.setContactStatus(one, "#MSG-1", "read", AT);
  assert.equal(read.contactMessages[0].status, "read");
  const answered = inbox.setContactStatus(read, "#MSG-1", "answered", AT);
  assert.equal(answered.contactMessages[0].status, "answered");
  assert.equal(answered.contactMessages[0].handledAt, AT);
  const reopened = inbox.setContactStatus(answered, "#MSG-1", "new", AT);
  assert.equal(reopened.contactMessages[0].status, "answered", "an answered message does not fall back");
  assert.equal(inbox.unreadContactCount(answered.contactMessages), 0);
});

test("a damaged store cannot poison the inbox", () => {
  const stored = inbox.normalizeContactMessages([
    { id: "#MSG-1", topic: "order", name: "A", email: "a@b.c", body: "hello there", at: AT, status: "new" },
    { id: "#MSG-1", topic: "order", name: "dupe", email: "a@b.c", body: "hello there", at: AT, status: "new" },
    { id: "#MSG-2", topic: "nope", name: "B", email: "b@b.c", body: "hello there", at: AT, status: "new" },
    { id: "#MSG-3", topic: "order", name: "C", email: "c@b.c", body: "hello there", at: AT, status: "closed" },
    { topic: "order", name: "D", email: "d@b.c", body: "hello there", at: AT, status: "new" },
    "junk",
    null,
  ]);
  assert.deepEqual(stored.map((message) => message.id), ["#MSG-1"]);
  assert.deepEqual(inbox.normalizeContactMessages(undefined), []);
});

test("a fresh store starts with an empty inbox", () => {
  const seeded = admin.createAdminDemoData(Date.UTC(2026, 10, 21, 9));
  assert.deepEqual(seeded.contactMessages, []);
  assert.equal(inbox.unreadContactCount(seeded.contactMessages), 0);
});

test("the reply carries the reference and the original text", () => {
  const message = inbox.submitContactMessage(store(), draft({ topic: "claim", designRef: "Starburst tee" }), AT).message;
  const mailto = inbox.contactReplyMailto(message, "support@mhfashion.com");
  assert.ok(mailto.startsWith("mailto:thura.aung@example.com?"));
  assert.ok(mailto.includes("cc=support%40mhfashion.com"));
  assert.ok(mailto.includes(encodeURIComponent("#MSG-1")));
  assert.ok(mailto.includes(encodeURIComponent("Starburst")), "the customer's words are quoted back");
});
