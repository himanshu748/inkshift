import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { assertOrigin, body, MAX_REQUEST_BYTES } from "../src/lib/http";

const streamRequest = (stream: ReadableStream<Uint8Array>) => new NextRequest("http://localhost/api/test", {
  method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" },
  body: stream, duplex: "half",
});

describe("HTTP request boundaries", () => {
  it.each(["null", "not-a-url", "https://unrelated.invalid", "file:///tmp/test"])("rejects %s origins as forbidden", (origin) => {
    expect(() => assertOrigin(new NextRequest("http://localhost/api/test", { headers: { origin } }))).toThrow(expect.objectContaining({ status: 403 }));
  });
  it("preserves a same-origin request and non-browser requests without Origin", () => {
    expect(() => assertOrigin(new NextRequest("http://localhost/api/test", { headers: { origin: "http://localhost" } }))).not.toThrow();
    expect(() => assertOrigin(new NextRequest("http://localhost/api/test"))).not.toThrow();
  });
  it("caps an unbounded chunked body and cancels before reading its tail", async () => {
    const cancel = vi.fn();
    let reads = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { reads++; controller.enqueue(new Uint8Array(1_000_001)); },
      cancel,
    }, { highWaterMark: 0 });
    await expect(body(streamRequest(stream))).rejects.toMatchObject({ status: 413 });
    expect(reads).toBe(2);
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("counts UTF-8 bytes and decodes multibyte characters split across chunks", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ title: "围棋" }));
    const stream = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(bytes.slice(0, 12)); controller.enqueue(bytes.slice(12)); controller.close();
    } });
    await expect(body(streamRequest(stream))).resolves.toEqual({ title: "围棋" });
    const oversized = new TextEncoder().encode(JSON.stringify({ title: "围".repeat(Math.ceil(MAX_REQUEST_BYTES / 3)) }));
    expect(oversized.length).toBeGreaterThan(MAX_REQUEST_BYTES);
    await expect(body(streamRequest(new ReadableStream({ start(controller) { controller.enqueue(oversized); controller.close(); } })))).rejects.toMatchObject({ status: 413 });
  });
});
