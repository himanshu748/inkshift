import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VERCEL", "1");
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.doUnmock("../src/lib/store");
});
const request = (ip = "192.0.2.1") => new NextRequest("http://localhost/api/restore", {
  method: "POST", headers: { "x-vercel-forwarded-for": ip }, body: "{}",
});

describe("public request budgets", () => {
  it("isolates clients and operations and releases expired buckets", async () => {
    const { reserveRequestBudget } = await import("../src/lib/request-limit");
    for (let n = 0; n < 10; n++) reserveRequestBudget(request(), "restore");
    expect(() => reserveRequestBudget(request(), "restore")).toThrow("Too many attempts");
    expect(() => reserveRequestBudget(request("192.0.2.2"), "restore")).not.toThrow();
    expect(() => reserveRequestBudget(request(), "events")).not.toThrow();
    vi.advanceTimersByTime(60_000);
    expect(() => reserveRequestBudget(request(), "restore")).not.toThrow();
  });
  it("does not trust forwarded IP headers outside Vercel or malformed platform IPs", async () => {
    vi.stubEnv("VERCEL", "");
    const { reserveRequestBudget } = await import("../src/lib/request-limit");
    for (let n = 0; n < 10; n++) reserveRequestBudget(request(`192.0.2.${n}`), "restore");
    expect(() => reserveRequestBudget(request("198.51.100.1"), "restore")).toThrow();
    vi.stubEnv("VERCEL", "1");
    expect(() => reserveRequestBudget(request("spoof, 192.0.2.3"), "restore")).toThrow();
  });
  it("blocks restore before reading the body or opening a store and sends Retry-After", async () => {
    const getStore = vi.fn();
    vi.doMock("../src/lib/store", async (original) => ({
      ...await original<typeof import("../src/lib/store")>(), getStore,
    }));
    const { reserveRequestBudget } = await import("../src/lib/request-limit");
    const { POST } = await import("../src/app/api/restore/route");
    for (let n = 0; n < 10; n++) reserveRequestBudget(request(), "restore");
    const req = request();
    const response = await POST(req);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(req.bodyUsed).toBe(false);
    expect(getStore).not.toHaveBeenCalled();
  });
  it("fails closed at capacity without evicting active limits, then recovers after expiry", async () => {
    const { reserveRequestBudget } = await import("../src/lib/request-limit");
    for (let n = 0; n < 10_000; n++) {
      reserveRequestBudget(request(`10.0.${Math.floor(n / 256)}.${n % 256}`), "events");
    }
    expect(() => reserveRequestBudget(request("192.0.2.3"), "events")).toThrow();
    for (let n = 1; n < 5; n++) reserveRequestBudget(request("10.0.0.0"), "events");
    expect(() => reserveRequestBudget(request("10.0.0.0"), "events")).toThrow();
    vi.advanceTimersByTime(60_000);
    expect(() => reserveRequestBudget(request("192.0.2.3"), "events")).not.toThrow();
  });
  it("blocks creation and scanning before store, daily quota or provider work", async () => {
    const getStore = vi.fn();
    vi.doMock("../src/lib/store", async (original) => ({
      ...await original<typeof import("../src/lib/store")>(), getStore,
    }));
    const { reserveRequestBudget } = await import("../src/lib/request-limit");
    const { POST: create } = await import("../src/app/api/events/route");
    const { POST: scan } = await import("../src/app/api/events/[id]/scan/route");
    for (let n = 0; n < 5; n++) reserveRequestBudget(request(), "events");
    for (let n = 0; n < 3; n++) reserveRequestBudget(request(), "photos");
    const createRequest = request();
    const scanRequest = request();
    expect((await create(createRequest)).status).toBe(429);
    expect((await scan(scanRequest, { params: Promise.resolve({ id: "test" }) })).status).toBe(429);
    expect(createRequest.bodyUsed).toBe(false);
    expect(scanRequest.bodyUsed).toBe(false);
    expect(getStore).not.toHaveBeenCalled();
  });
});
