import { describe, expect, it, vi } from "vitest";
import { SanityStore, type Document } from "../src/lib/store";
import { buildTimeline } from "../src/lib/timeline";
import { applyProposal, createEvent, discardProposal, loadEvent, makeProposal, register } from "../src/lib/service";
import { eventToDraft } from "../src/lib/model";
import { MemoryStore } from "./memory-store";

const { fetch } = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@sanity/client", () => ({ createClient: () => ({ fetch }) }));

describe("Sanity timeline pagination", () => {
  it("includes decisions beyond 80 and puts current bookings on the actual latest plan", async () => {
    const memory = new MemoryStore();
    const created = await createEvent(memory, "sample", "2026-09-27", "UTC");
    for (let index = 0; index < 162; index++) {
      const event = await loadEvent(memory, created.event.id);
      const draft = eventToDraft(event);
      draft.sessions[0].title = `Reading ${index}`;
      const proposal = await makeProposal(memory, event, draft, "", "manual");
      if (index === 161) await applyProposal(memory, event, proposal, event.version);
      else await discardProposal(memory, proposal);
    }
    const applied = await loadEvent(memory, created.event.id);
    await register(memory, applied.id, "guest", "Late Guest", applied.sessions[0].id);
    const event = await loadEvent(memory, applied.id);
    const dataset = [...memory.docs.values()];
    // Emulate Sanity's filtering, ordering and range for the queries sent by
    // the adapter. This also reproduces the former object query's 80-row cap.
    fetch.mockImplementation(async (query: string, params: { eventId: string; cursor?: string }) => {
      const rows = dataset.filter((d) => d.eventId === params.eventId);
      const decisions = rows.filter((d) => d._type === "inkshiftProposal" && ["applied", "discarded"].includes(String(d.status)));
      const limit = Number(query.match(/\[0\.\.\.(\d+)\]/)?.[1] ?? Infinity);
      const photos = rows.filter((d) => d._type === "inkshiftPhoto").map((d) => ({ id: d.id, samplePath: d.samplePath, stored: Boolean(d.dataUrl) }));
      if (query.trim().startsWith("{")) return { proposals: decisions.slice(0, limit), photos };
      if (query.includes('"inkshiftPhoto"')) return photos;
      expect(query).toContain("_id > $cursor");
      expect(query).toContain("order(_id asc)");
      return decisions.filter((d) => d._id > (params.cursor ?? ""))
        .sort((a: Document, b: Document) => a._id < b._id ? -1 : a._id > b._id ? 1 : 0)
        .slice(0, limit);
    });
    const records = await new SanityStore().timelineRecords(event.id);
    expect(records.proposals).toHaveLength(162);
    expect(new Set(records.proposals.map((p) => p.id)).size).toBe(162);
    const timeline = buildTimeline(event, records.proposals, records.photos);
    expect(timeline.discarded).toHaveLength(161);
    expect(timeline.frames).toHaveLength(2);
    expect(timeline.frames.at(-1)?.sessions[0].title).toBe("Reading 161");
    expect(timeline.frames.at(-1)?.bookings[0].id).toBe(event.bookings[0].id);
    expect(fetch.mock.calls.filter(([query]) => query.includes('"inkshiftProposal"'))).toHaveLength(3);
  });
});
