import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import {
  eventToDraft,
  type EventView,
  type ReviewedProposal,
} from "../src/lib/model";
import { sampleDraft } from "../src/lib/sample";

const base = process.env.INKSHIFT_TEST_URL ?? "http://localhost:3333";
let organizerCookie = "";
async function request<T>(
  path: string,
  data?: unknown,
  cookie = organizerCookie,
  method = "POST",
) {
  const response = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", origin: base, cookie },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const value = await response.json();
  return {
    value: value as T,
    status: response.status,
    cookie: response.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  };
}
const created = await request<{ id: string }>("/api/events", {
  mode: "blank",
  date: "2026-09-27",
  timeZone: "Asia/Kolkata",
});
assert.equal(created.status, 200);
organizerCookie = created.cookie;
const path = `/api/events/${created.value.id}`;
const blank = await request<EventView>(path, undefined, organizerCookie, "GET");
assert.equal(blank.value.sessions.length, 0);
const upload = async (name: string) => {
  const image = await sharp(readFileSync(`public/samples/${name}.svg`))
    .png()
    .toBuffer();
  const result = await request<ReviewedProposal>(`${path}/scan`, {
    image: `data:image/png;base64,${image.toString("base64")}`,
    label: `${name}.png`,
    source: "upload",
  });
  assert.equal(result.status, 200, JSON.stringify(result.value));
  assert.equal(
    result.value.workflow?.status,
    "tracked",
    JSON.stringify(result.value.workflow),
  );
  if (result.value.workflow?.status === "tracked") {
    assert.equal(result.value.workflow.stage, "review");
    assert.equal(result.value.workflow.steps[0].by, "Reader agent");
  }
  return result.value;
};
let first = await upload("original");
assert.equal(first.source, "vision");
assert.deepEqual(first.preview.sessions.map((s) => s.title).sort(), [
  "Catan",
  "Ticket to Ride",
  "Wavelength",
]);
const firstRawConflicts = first.preview.conflicts.map((c) => c.message);
if (firstRawConflicts.length) {
  const blocked = await request(`${path}/proposals/${first.id}/approve`, {
    reviewed: true,
    baseVersion: first.baseVersion,
  });
  assert.equal(blocked.status, 422);
  // Explicit test-operator correction against the known typed sheet. Keep the
  // original model conflicts in the report; the application never does this.
  const revised = await request<ReviewedProposal>(
    `${path}/proposals/${first.id}`,
    { draft: sampleDraft("2026-09-27", "Asia/Kolkata") },
    organizerCookie,
    "PUT",
  );
  assert.equal(revised.status, 200);
  first = revised.value;
}
assert.equal(
  first.preview.conflicts.length,
  0,
  JSON.stringify(first.preview.conflicts),
);
let approval = await request(`${path}/proposals/${first.id}/approve`, {
  reviewed: true,
  baseVersion: first.baseVersion,
});
assert.equal(approval.status, 200);
const event = (
  await request<EventView>(path, undefined, organizerCookie, "GET")
).value;
const ride = event.sessions.find((s) => s.title === "Ticket to Ride")!;
assert.ok(ride);
const joined = await request<{ booking: { id: string } }>(
  `${path}/registrations`,
  { name: "HTTP check participant", sessionId: ride.id },
  "",
);
assert.equal(joined.status, 200);
let second = await upload("table-removed");
assert.equal(second.source, "vision");
const rawConflicts = second.preview.conflicts.map((c) => c.message);
if (rawConflicts.length) {
  const blocked = await request(`${path}/proposals/${second.id}/approve`, {
    reviewed: true,
    baseVersion: second.baseVersion,
  });
  assert.equal(blocked.status, 422);
  // The test operator knows this rendered fixture. These are explicit review edits,
  // never an automatic correction applied by the app to a user's photograph.
  const checked = eventToDraft(event);
  checked.spaces.find((s) => s.label === "Table B")!.removed = true;
  const revised = await request<ReviewedProposal>(
    `${path}/proposals/${second.id}`,
    { draft: checked },
    organizerCookie,
    "PUT",
  );
  assert.equal(revised.status, 200);
  second = revised.value;
}
assert.equal(second.preview.conflicts.length, 0);
assert.ok(
  second.preview.changes.some(
    (c) => c.kind === "move" && c.entityId === ride.id,
  ),
);
approval = await request(`${path}/proposals/${second.id}/approve`, {
  reviewed: true,
  baseVersion: second.baseVersion,
});
assert.equal(approval.status, 200);
const guest = (await request<EventView>(path, undefined, joined.cookie, "GET"))
  .value;
assert.equal(guest.myBookings[0].id, joined.value.booking.id);
assert.equal(
  guest.sessions.find((s) => s.id === ride.id)?.spaceLabel,
  "Table C",
);
const forbidden = await request(
  `${path}/proposals`,
  { sampleChange: "rename" },
  "",
);
assert.equal(forbidden.status, 403);
const privatePhoto = await fetch(`${base}${path}/photos/${first.photoId}`);
assert.equal(privatePhoto.status, 403);
const report = {
  checkedAt: new Date().toISOString(),
  baseUrl: base,
  eventId: event.id,
  input: "Rendered typed sample sheets, not real handwriting",
  blankEventToThreeSessions: true,
  photoInterpretations: 2,
  firstPhotoRequiredCorrection: firstRawConflicts.length > 0,
  originalFirstPhotoConflicts: firstRawConflicts,
  secondPhotoRequiredCorrection: rawConflicts.length > 0,
  originalSecondPhotoConflicts: rawConflicts,
  sameBookingAfterPhotoMove: true,
  finalTable: "Table C",
  photoReaderEnteredSanityWorkflow: true,
  guestCannotOrganize: true,
  anonymousPhotoBlocked: true,
};
mkdirSync("docs/evidence", { recursive: true });
writeFileSync(
  "docs/evidence/http-photo-flow.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
