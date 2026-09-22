import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@sanity/client";
import { getStore, ids } from "../src/lib/store";
import {
  applyProposal,
  createEvent,
  getProposal,
  loadEvent,
  makeProposal,
  register,
  reviseProposal,
} from "../src/lib/service";
import { sampleEdit } from "../src/lib/sample";
const store = getStore();
assert.equal(
  store.kind,
  "sanity",
  "This check requires a real Sanity dataset.",
);
const { event } = await createEvent(
  store,
  "sample",
  "2026-09-27",
  "Asia/Kolkata",
);
const ride = event.sessions[1];
for (let i = 0; i < 3; i++)
  await register(store, event.id, `live-before-${i}`, `Check ${i}`, ride.id);
const race = await Promise.allSettled(
  ["racer-one", "racer-two"].map((p, i) =>
    register(store, event.id, p, `Racer ${i}`, ride.id),
  ),
);
assert.equal(
  race.filter((r) => r.status === "fulfilled").length,
  1,
  "Exactly one person gets the last place.",
);
let current = await loadEvent(store, event.id);
assert.equal(current.bookings.length, 4);
const p = await makeProposal(
  store,
  current,
  sampleEdit(current, "remove-table"),
  "sample-remove-table",
  "sample",
);
assert.equal(p.preview.conflicts.length, 0);
await register(
  store,
  event.id,
  "later-person",
  "Later person",
  event.sessions[2].id,
);
current = await loadEvent(store, event.id);
await assert.rejects(
  () => applyProposal(store, current, p, p.baseVersion),
  /changed/,
);
await reviseProposal(
  store,
  current,
  await getProposal(store, event.id, p.id),
  p.draft,
);
const beforeIds = current.bookings.map((b) => b.id).sort();
await applyProposal(
  store,
  current,
  await getProposal(store, event.id, p.id),
  current.version,
);
const final = await loadEvent(store, event.id);
assert.deepEqual(final.bookings.map((b) => b.id).sort(), beforeIds);
assert.equal(
  final.sessions.find((s) => s.id === ride.id)?.spaceId,
  event.spaces[2].id,
);
const anon = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  apiVersion: "2026-09-01",
  useCdn: false,
});
const privateDoc = await anon.getDocument(ids.event(event.id));
assert.equal(
  privateDoc,
  undefined,
  "Anonymous visitors cannot read the private event.",
);
const publicDoc = await anon.getDocument(ids.public(event.id));
assert.ok(publicDoc);
assert.ok(!JSON.stringify(publicDoc).includes("Later person"));
const report = {
  checkedAt: new Date().toISOString(),
  projectId: process.env.SANITY_PROJECT_ID,
  eventId: event.id,
  storage: store.kind,
  lastSeatRace: { requests: 2, winners: 1 },
  staleApprovalRejected: true,
  relocation: "Table B to Table C",
  preservedRegistrationIds: beforeIds.length,
  anonymousPrivateReadBlocked: true,
  publicProjectionReadable: true,
};
mkdirSync("docs/evidence", { recursive: true });
writeFileSync(
  "docs/evidence/live-sanity.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
