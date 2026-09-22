import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { sampleDraft } from "../src/lib/sample";
import type { ReviewedProposal, EventView } from "../src/lib/model";
import type { GatheringSummary } from "../src/lib/gatherings";
const base = process.env.INKSHIFT_TEST_URL ?? "http://localhost:3333";
async function request<T>(
  path: string,
  data?: unknown,
  cookie = "",
  method = "POST",
  origin = base,
) {
  const response = await fetch(base + path, {
    method,
    headers: { origin, cookie, "content-type": "application/json" },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  return {
    status: response.status,
    value: (await response.json()) as T,
    headers: response.headers,
    cookie: response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; "),
  };
}
const invalid = await request("/api/events", {
  mode: "blank",
  title: "Invalid date",
  date: "2026-02-30",
  timeZone: "UTC",
});
assert.equal(invalid.status, 400);
const created = await request<{ id: string }>("/api/events", {
  mode: "blank",
  title: "Product check · community games",
  date: "2026-10-03",
  timeZone: "Europe/London",
});
assert.equal(created.status, 200);
const path = `/api/events/${created.value.id}`;
const owner = created.cookie;
const event = (await request<EventView>(path, undefined, owner, "GET")).value;
assert.equal(event.title, "Product check · community games");
assert.equal(event.date, "2026-10-03");
assert.equal(event.timeZone, "Europe/London");
assert.equal(event.sample, false);
const anonymous = await request<GatheringSummary[]>(
  "/api/events",
  undefined,
  "",
  "GET",
);
assert.deepEqual(anonymous.value, []);
const own = await request<GatheringSummary[]>(
  "/api/events",
  undefined,
  owner,
  "GET",
);
assert.equal(own.value.length, 1);
assert.equal(own.value[0].id, created.value.id);
assert.ok(own.headers.get("cache-control")?.includes("private"));
assert.equal((await request(`${path}/access`)).status, 403);
assert.equal(
  (
    await request(
      `${path}/access`,
      undefined,
      owner,
      "POST",
      "https://unrelated.invalid",
    )
  ).status,
  403,
);
const access = await request<{ code: string }>(
  `${path}/access`,
  undefined,
  owner,
);
assert.equal(access.status, 200);
assert.ok(access.headers.get("cache-control")?.includes("no-store"));
assert.equal((await request("/api/restore", { code: "bad-code" })).status, 403);
const draft = {
  ...sampleDraft(event.date, event.timeZone),
  title: event.title,
};
const typed = await request<ReviewedProposal>(
  `${path}/proposals`,
  { draft },
  owner,
);
assert.equal(typed.status, 200);
assert.equal(typed.value.source, "manual");
assert.equal(typed.value.photoId, "");
const applied = await request(
  `${path}/proposals/${typed.value.id}/approve`,
  { reviewed: true, baseVersion: typed.value.baseVersion },
  owner,
);
assert.equal(applied.status, 200);
const typedEvent = (await request<EventView>(path, undefined, owner, "GET"))
  .value;
assert.equal(typedEvent.sessions.length, 3);
assert.equal(typedEvent.photoId, "");
assert.equal(typedEvent.title, event.title);
const recovered = await request<{ id: string }>("/api/restore", {
  code: access.value.code,
});
assert.equal(recovered.status, 200);
assert.equal(recovered.value.id, created.value.id);
assert.ok(recovered.headers.get("set-cookie")?.includes("HttpOnly"));
const restoredEvent = (
  await request<EventView>(path, undefined, recovered.cookie, "GET")
).value;
assert.equal(restoredEvent.role, "organizer");
assert.equal(restoredEvent.version, typedEvent.version);
assert.equal(
  (
    await request<GatheringSummary[]>(
      "/api/events",
      undefined,
      recovered.cookie,
      "GET",
    )
  ).value[0].id,
  created.value.id,
);
const report = {
  checkedAt: new Date().toISOString(),
  baseUrl: base,
  eventId: created.value.id,
  customDetailsPreserved: true,
  typedPlanApprovedWithoutExamplePhoto: true,
  invalidDateRejected: true,
  anonymousGatheringsEmpty: true,
  onlyOwnedGatheringsListed: true,
  unauthorizedCodeExportBlocked: true,
  crossOriginCodeExportBlocked: true,
  invalidCodeRejected: true,
  organizerAccessRestoredInNewCookieContext: true,
  restoreDidNotMutatePlan: true,
  privateResponsesNotCached: true,
  credentialsIncludedInReport: false,
};
mkdirSync("docs/evidence", { recursive: true });
writeFileSync(
  `docs/evidence/${base.includes("localhost") ? "local" : "hosted"}-product-http.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
