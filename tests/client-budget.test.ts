import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createEvent } from "../src/lib/service";
import { MemoryStore } from "./memory-store";
import { reserveClientBudget, trustedClient } from "../src/lib/request-limit";
const req = (ip = "192.0.2.1", cookie = "") => new NextRequest("http://localhost/api/events", { headers: { "x-vercel-forwarded-for": ip, cookie } });
beforeEach(() => { vi.stubEnv("VERCEL", "1"); vi.stubEnv("INKSHIFT_CLIENT_LIMIT_SECRET", "private-test-secret"); vi.useFakeTimers(); });
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
it("coordinates concurrent first creation and limits fresh cookies across instances", async () => {
  const store = new MemoryStore();
  const outcomes = await Promise.allSettled(Array.from({ length: 15 }, (_, n) => reserveClientBudget(req(undefined, `inkshift_participant=${n}`), "events", store)));
  expect(outcomes.filter(x => x.status === "fulfilled")).toHaveLength(10);
  expect(store.docs.size).toBe(1);
  expect(JSON.stringify([...store.docs.values()])).not.toContain("192.0.2.1");
  vi.resetModules();
  const { reserveClientBudget: freshInstance } = await import("../src/lib/request-limit");
  await expect(freshInstance(req(), "events", store)).rejects.toMatchObject({ status: 429 });
  await expect(freshInstance(req("192.0.2.2"), "events", store)).resolves.toBeUndefined();
});
it("reuses fixed documents at UTC rollover and bounds attacker cardinality", async () => {
  const store = new MemoryStore();
  await reserveClientBudget(req(), "photos", store);
  const doc = store.docs.get("inkshift.client-budget.photos")!;
  doc.clients = Array.from({ length: 2048 }, (_, n) => ({ key: String(n), count: 1 }));
  await expect(reserveClientBudget(req(), "photos", store)).rejects.toMatchObject({ status: 429 });
  vi.advanceTimersByTime(86_400_000);
  await reserveClientBudget(req(), "photos", store);
  expect(store.docs.size).toBe(1);
  expect(store.docs.get(doc._id)?.clients).toHaveLength(1);
});
it("canonicalizes equivalent IPv6, mapped IPv4 and trusts only valid platform addresses", () => {
  expect(trustedClient(req("2001:0db8:0:0:0:0:0:1"))).toBe(trustedClient(req("2001:db8::1")));
  expect(trustedClient(req("::ffff:192.0.2.1"))).toBe("192.0.2.1");
  expect(trustedClient(req("192.0.2.1, 198.51.100.1"))).toBe("unknown");
  vi.stubEnv("VERCEL", "");
  expect(trustedClient(req())).toBe("unknown");
});
it("fails closed in production without a server secret", async () => {
  vi.stubEnv("INKSHIFT_CLIENT_LIMIT_SECRET", ""); vi.stubEnv("SANITY_API_TOKEN", ""); vi.stubEnv("SANITY_AUTH_TOKEN", "");
  await expect(reserveClientBudget(req(), "events", new MemoryStore())).rejects.toMatchObject({ status: 503 });
});
it("protects joins independently of cookies and spend pools", async () => {
  const store = new MemoryStore();
  for (let n = 0; n < 60; n++) await reserveClientBudget(req(undefined, `inkshift_participant=${n}`), "joins", store);
  await expect(reserveClientBudget(req(), "joins", store)).rejects.toMatchObject({ status: 429 });
  await expect(reserveClientBudget(req(), "events", store)).resolves.toBeUndefined();
});
it("rejects creation before global debit and leaves cancellation available at the join ceiling", async () => {
  const store = new MemoryStore();
  for (let n = 0; n < 10; n++) await reserveClientBudget(req(), "events", store);
  for (let n = 0; n < 60; n++) await reserveClientBudget(req(), "joins", store);
  vi.doMock("../src/lib/store", async original => ({ ...await original<typeof import("../src/lib/store")>(), getStore: () => store }));
  const cancelBooking = vi.fn();
  vi.doMock("../src/lib/service", async original => ({ ...await original<typeof import("../src/lib/service")>(), cancelBooking }));
  vi.resetModules();
  const { POST } = await import("../src/app/api/events/route");
  const creation = new NextRequest("http://localhost/api/events", { method: "POST", headers: { "x-vercel-forwarded-for": "192.0.2.1" }, body: JSON.stringify({ mode: "sample" }) });
  expect((await POST(creation)).status).toBe(429);
  expect([...store.docs.keys()].some(id => id.startsWith("inkshift.budget."))).toBe(false);
  const { event } = await createEvent(store, "sample", "2026-10-05", "UTC");
  const { POST: join, DELETE } = await import("../src/app/api/events/[id]/registrations/route");
  const { event: removed } = await createEvent(store, "sample", "2026-10-05", "UTC");
  const removedDoc = store.docs.get(removed._id)!;
  (removedDoc.sessions as typeof removed.sessions)[0].removed = true;
  const before = JSON.stringify(store.docs.get("inkshift.client-budget.joins"));
  for (const [id, sessionId] of [["missing", event.sessions[0].id], [event.id, "missing-session"], [removed.id, removed.sessions[0].id]]) {
    const response = await join(new NextRequest("http://localhost/api/events/test/registrations", { method: "POST", headers: { "x-vercel-forwarded-for": "198.51.100.1" }, body: JSON.stringify({ sessionId, name: "Guest" }) }), { params: Promise.resolve({ id }) });
    expect([404, 409]).toContain(response.status);
    expect(JSON.stringify(store.docs.get("inkshift.client-budget.joins"))).toBe(before);
  }
  const headers = { "x-vercel-forwarded-for": "192.0.2.1", cookie: "inkshift_participant=fresh-cookie" };
  expect((await join(new NextRequest("http://localhost/api/events/test/registrations", { method: "POST", headers, body: JSON.stringify({ sessionId: event.sessions[0].id, name: "Guest" }) }), { params: Promise.resolve({ id: event.id }) })).status).toBe(429);
  expect((await DELETE(new NextRequest("http://localhost/api/events/test/registrations", { method: "DELETE", headers, body: JSON.stringify({ bookingId: "booking" }) }), { params: Promise.resolve({ id: event.id }) })).status).toBe(200);
  expect(cancelBooking).toHaveBeenCalledOnce();
  vi.doUnmock("../src/lib/store"); vi.doUnmock("../src/lib/service");
});

it("shares one allowance across rotating IPv6 addresses in the same /64", async () => {
  const store = new MemoryStore();
  for (let n = 1; n <= 10; n++) await reserveClientBudget(req(`2001:db8:12:34::${n}`), "events", store);
  await expect(reserveClientBudget(req("2001:db8:12:34:ffff::1"), "events", store)).rejects.toMatchObject({ status: 429 });
  expect(store.docs.get("inkshift.client-budget.events")?.clients).toHaveLength(1);
  await expect(reserveClientBudget(req("2001:db8:12:35::1"), "events", store)).resolves.toBeUndefined();
});

it("never rewinds a newer daily map when store I/O crosses UTC midnight", async () => {
  vi.setSystemTime(new Date("2026-10-05T23:59:59Z"));
  const store = new MemoryStore();
  const read = store.get.bind(store);
  let crossesMidnight = true;
  vi.spyOn(store, "get").mockImplementation(async <T>(id: string) => {
    if (crossesMidnight) {
      crossesMidnight = false;
      vi.setSystemTime(new Date("2026-10-06T00:00:01Z"));
      await reserveClientBudget(req(), "events", store);
    }
    return read<T>(id);
  });
  await reserveClientBudget(req(), "events", store);
  const saved = store.docs.get("inkshift.client-budget.events")!;
  expect(saved.day).toBe("2026-10-06");
  expect(saved.clients).toEqual([expect.objectContaining({ count: 2 })]);
});
