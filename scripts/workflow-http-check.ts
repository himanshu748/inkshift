import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import type {
  EventView,
  ReviewedProposal,
  ReviewSummary,
} from "../src/lib/model";

const base = process.env.INKSHIFT_TEST_URL ?? "http://localhost:3333";
let owner = "";
async function request<T>(
  path: string,
  data?: unknown,
  cookie = owner,
  method = "POST",
) {
  const response = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", origin: base, cookie },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  return {
    status: response.status,
    value: (await response.json()) as T,
    cookie: response.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  };
}
const created = await request<{ id: string }>("/api/events", {
  mode: "sample",
  date: "2026-09-27",
  timeZone: "Asia/Kolkata",
});
assert.equal(created.status, 200, JSON.stringify(created.value));
owner = created.cookie;
const path = `/api/events/${created.value.id}`;
const initial = (await request<EventView>(path, undefined, owner, "GET")).value;
const ride = initial.sessions.find((s) => s.title === "Ticket to Ride")!;
const joined = await request<{ booking: { id: string } }>(
  `${path}/registrations`,
  { name: "Workflow check Alex", sessionId: ride.id },
  "",
);
assert.equal(joined.status, 200);
const made = await request<ReviewedProposal>(`${path}/proposals`, {
  sampleChange: "remove-table",
});
assert.equal(made.status, 200, JSON.stringify(made.value));
let review = made.value;
assert.equal(
  review.workflow?.status,
  "tracked",
  JSON.stringify(review.workflow),
);
assert.ok(review.workflow?.status === "tracked");
assert.equal(review.workflow.stage, "review");
assert.equal(review.workflow.steps[0].by, "Prepared example");
assert.equal(review.workflow.counts.affectedRegistrations, 1);
const reviewPath = `${path}/proposals/${review.id}`;
assert.equal((await request(reviewPath, undefined, "", "GET")).status, 403);
assert.equal(
  (await request(`${path}/proposals`, undefined, "", "GET")).status,
  403,
);
assert.equal((await request(reviewPath, undefined, "", "DELETE")).status, 403);
const secondJoin = await request(
  `${path}/registrations`,
  { name: "Workflow check Sam", sessionId: ride.id },
  "",
);
assert.equal(secondJoin.status, 200);
const stale = await request(`${reviewPath}/approve`, {
  reviewed: true,
  baseVersion: review.baseVersion,
});
assert.equal(stale.status, 409, JSON.stringify(stale.value));
const rechecked = await request<ReviewedProposal>(
  reviewPath,
  { draft: review.draft },
  owner,
  "PUT",
);
assert.equal(rechecked.status, 200);
review = rechecked.value;
assert.ok(review.workflow?.status === "tracked");
assert.equal(review.workflow.counts.affectedRegistrations, 2);
const approval = await request<{ proposal: ReviewedProposal }>(
  `${reviewPath}/approve`,
  { reviewed: true, baseVersion: review.baseVersion },
);
assert.equal(approval.status, 200, JSON.stringify(approval.value));
assert.ok(approval.value.proposal.workflow?.status === "tracked");
assert.equal(approval.value.proposal.workflow.stage, "applied");
assert.equal(approval.value.proposal.workflow.steps[1].by, "Organizer");
const reopened = (
  await request<ReviewedProposal>(reviewPath, undefined, owner, "GET")
).value;
assert.equal(reopened.status, "applied");
const guest = (await request<EventView>(path, undefined, joined.cookie, "GET"))
  .value;
assert.equal(guest.myBookings[0].id, joined.value.booking.id);
assert.equal(
  guest.sessions.find((s) => s.id === ride.id)?.spaceLabel,
  "Table C",
);
const capacity = await request<ReviewedProposal>(`${path}/proposals`, {
  sampleChange: "capacity",
});
assert.equal(capacity.status, 200);
assert.ok(capacity.value.workflow?.status === "tracked");
assert.equal(capacity.value.workflow.approve.allowed, false);
assert.equal(
  (
    await request(`${path}/proposals/${capacity.value.id}/approve`, {
      reviewed: true,
      baseVersion: capacity.value.baseVersion,
    })
  ).status,
  422,
);
const discarded = await request<ReviewedProposal>(
  `${path}/proposals/${capacity.value.id}`,
  undefined,
  owner,
  "DELETE",
);
assert.equal(discarded.status, 200, JSON.stringify(discarded.value));
assert.ok(discarded.value.workflow?.status === "tracked");
assert.equal(discarded.value.workflow.stage, "discarded");
const final = (await request<EventView>(path, undefined, owner, "GET")).value;
assert.equal(final.version, guest.version);
const history = (
  await request<ReviewSummary[]>(`${path}/proposals`, undefined, owner, "GET")
).value;
assert.deepEqual(history.map((r) => r.status).sort(), ["applied", "discarded"]);
const privateQuery = `*[_id == ${JSON.stringify(review.workflow.instanceId)}][0]`;
const anonymous = await fetch(
  `https://a5xdqsb7.api.sanity.io/v2026-09-01/data/query/production?query=${encodeURIComponent(privateQuery)}`,
);
assert.equal(anonymous.status, 200);
assert.equal((await anonymous.json()).result, null);
const report = {
  checkedAt: new Date().toISOString(),
  baseUrl: base,
  eventId: created.value.id,
  workflow: "inkshift-plan-change v1",
  readingAttribution: "Prepared example",
  approvalAttribution: "Organizer",
  staleApprovalBlocked: true,
  correctedCounts: 2,
  appliedAndDiscardedHistoryPersisted: true,
  sameBookingAfterMove: true,
  finalTable: "Table C",
  discardLeftPlanUnchanged: true,
  unauthorizedReviewAccessBlocked: true,
  anonymousWorkflowDocumentHidden: true,
};
mkdirSync("docs/evidence", { recursive: true });
writeFileSync(
  `docs/evidence/${base.includes("localhost") ? "local" : "hosted"}-workflow-http.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
