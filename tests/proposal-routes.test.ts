import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as photo } from "../src/app/api/events/[id]/photos/[photoId]/route";
import { ids, type Document } from "../src/lib/store";
import { GET as timeline } from "../src/app/api/events/[id]/timeline/route";
import { POST as approve } from "../src/app/api/events/[id]/proposals/[proposalId]/approve/route";
import { PUT as revise, DELETE as discard } from "../src/app/api/events/[id]/proposals/[proposalId]/route";
import { applyProposal, createEvent, getProposal, loadEvent, makeProposal } from "../src/lib/service";
import { sampleEdit } from "../src/lib/sample";
import type { EventRecord, Proposal } from "../src/lib/model";
import { MemoryStore } from "./memory-store";

let store: MemoryStore;
let event: EventRecord;
let first: Proposal;
vi.mock("../src/lib/http", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/lib/http")>(),
  ownerContext: async () => ({ store, event: await loadEvent(store, event.id) }),
}));
vi.mock("../src/lib/workflow", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/lib/workflow")>(),
  reviewEngines: () => null,
}));
function request(method: string, data: unknown) {
  return new NextRequest("http://localhost/api/events/test/proposals/test", {
    method,
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(data),
  });
}
const context = () => ({ params: Promise.resolve({ id: event.id, proposalId: first.id }) });
beforeEach(async () => {
  store = new MemoryStore();
  const created = await createEvent(store, "sample", "2026-09-27", "UTC");
  event = await loadEvent(store, created.event.id);
  first = await makeProposal(store, event, sampleEdit(event, "rename"), "paper", "sample");
});

describe("reviewed proposal revisions", () => {
  it("rejects all stale-tab decisions even when the event base version is unchanged", async () => {
    expect(first._rev).toBeTruthy();
    expect(first._rev).toBe((await getProposal(store, event.id, first.id))._rev);
    const revised = await revise(request("PUT", {
      draft: sampleEdit(event, "remove-table"), proposalRevision: first._rev,
    }), context());
    expect(revised.status).toBe(200);
    const second = await revised.json() as Proposal;
    expect(second.baseVersion).toBe(first.baseVersion);
    expect(second._rev).not.toBe(first._rev);
    expect(second._rev).toBe((await getProposal(store, event.id, first.id))._rev);
    const staleApprove = await approve(request("POST", {
      reviewed: true, baseVersion: first.baseVersion, proposalRevision: first._rev,
    }), context());
    const staleEdit = await revise(request("PUT", {
      draft: first.draft, proposalRevision: first._rev,
    }), context());
    const staleDiscard = await discard(request("DELETE", { proposalRevision: first._rev }), context());
    for (const response of [staleApprove, staleEdit, staleDiscard]) {
      expect(response.status).toBe(409);
      expect((await response.json()).code).toBe("stale-review");
    }
    expect(await loadEvent(store, event.id)).toEqual(event);
    expect(await getProposal(store, event.id, first.id)).toEqual(second);
    const currentApprove = await approve(request("POST", {
      reviewed: true, baseVersion: second.baseVersion, proposalRevision: second._rev,
    }), context());
    expect(currentApprove.status).toBe(200);
    const result = await currentApprove.json();
    expect(result.proposal.status).toBe("applied");
    expect(result.proposal._rev).toBe((await getProposal(store, event.id, first.id))._rev);
  });
  it("requires a nonempty revision for every mutation", async () => {
    for (const proposalRevision of [undefined, ""]) {
      const responses = [
        await approve(request("POST", { reviewed: true, baseVersion: first.baseVersion, proposalRevision }), context()),
        await revise(request("PUT", { draft: first.draft, proposalRevision }), context()),
        await discard(request("DELETE", { proposalRevision }), context()),
      ];
      for (const response of responses) expect(response.status).toBe(400);
    }
    expect((await getProposal(store, event.id, first.id)).status).toBe("review");
  });
  it("returns the persisted revision after discarding the current reading", async () => {
    const response = await discard(request("DELETE", { proposalRevision: first._rev }), context());
    expect(response.status).toBe(200);
    const discarded = await response.json() as Proposal;
    expect(discarded.status).toBe("discarded");
    expect(discarded._rev).not.toBe(first._rev);
    expect(discarded._rev).toBe((await getProposal(store, event.id, first.id))._rev);
  });
});

describe("timeline snapshot", () => {
  it("retries when a plan changes while history pages are loading", async () => {
    const readRecords = store.timelineRecords.bind(store);
    const records = vi.spyOn(store, "timelineRecords");
    records.mockImplementationOnce(async (id) => {
      const before = await readRecords(id);
      await applyProposal(store, event, first, event.version);
      return before;
    });
    const response = await timeline(
      new NextRequest("http://localhost/api/events/test/timeline"),
      { params: Promise.resolve({ id: event.id }) },
    );
    expect(response.status).toBe(200);
    expect(records).toHaveBeenCalledTimes(2);
    const history = await response.json();
    expect(history.frames).toHaveLength(2);
    expect(history.frames.at(-1).sessions[1].title).toBe(first.preview.sessions[1].title);
    expect(history.frames.at(-1).proposalId).toBe(first.id);
  });
});

describe("private photo route", () => {
  it("redirects an authorized sample photo to an allowlisted asset", async () => {
    const response = await photo(new NextRequest("http://localhost/api/photo"), {
      params: Promise.resolve({ id: event.id, photoId: "sample-original" }),
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/samples/original.svg");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("returns 404 for missing data and refuses arbitrary sample redirects", async () => {
    const sample = await store.get<Document>(ids.photo(event.id, "sample-original"));
    for (const samplePath of [undefined, "https://unrelated.invalid/image.svg", "/api/events/private"]) {
      await store.transact({ id: sample!._id, rev: (await store.get<Document>(sample!._id))!._rev! }, [{ ...sample!, samplePath }]);
      const response = await photo(new NextRequest("http://localhost/api/photo"), {
        params: Promise.resolve({ id: event.id, photoId: "sample-original" }),
      });
      expect(response.status).toBe(404);
    }
  });
});
