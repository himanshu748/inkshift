import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyProposal,
  createEvent,
  discardProposal,
  getProposal,
  loadEvent,
  makeProposal,
  register,
} from "../src/lib/service";
import { sampleEdit } from "../src/lib/sample";
import { buildTimeline, type TimelineProposal } from "../src/lib/timeline";
import type { EventRecord } from "../src/lib/model";
import { MemoryStore } from "./memory-store";

const tick = () => vi.setSystemTime(Date.now() + 1000);
async function sampleWithGuest() {
  const store = new MemoryStore();
  const { event: created } = await createEvent(
    store,
    "sample",
    "2026-09-27",
    "Asia/Kolkata",
  );
  const ride = created.sessions.find((s) => s.title === "Ticket to Ride")!;
  await register(store, created.id, "guest-token", "Guest Ada", ride.id);
  return { store, id: created.id, rideId: ride.id };
}
async function applyEdit(
  store: MemoryStore,
  id: string,
  change: Parameters<typeof sampleEdit>[1],
) {
  const event = await loadEvent(store, id);
  const made = await makeProposal(
    store,
    event,
    sampleEdit(event, change),
    `sample-${change}`,
    "sample",
  );
  const proposal = await getProposal(store, id, made.id);
  tick();
  return applyProposal(store, event, proposal, event.version);
}
async function timelineFor(store: MemoryStore, id: string) {
  const event = await loadEvent(store, id);
  const { proposals, photos } = await store.timelineRecords(id);
  return {
    event,
    proposals,
    photos,
    ...buildTimeline(event, proposals, photos),
  };
}

describe("paper time machine", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.parse("2026-09-20T10:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());
  it("records the original plan at apply time and keeps the guest on the same session", async () => {
    const { store, id, rideId } = await sampleWithGuest();
    await applyEdit(store, id, "remove-table");
    const { frames } = await timelineFor(store, id);
    expect(frames.map((f) => f.version)).toEqual([1, 2]);
    expect(frames.every((f) => f.basis === "recorded")).toBe(true);
    const tableOf = (i: number) => {
      const session = frames[i].sessions.find((s) => s.id === rideId)!;
      return frames[i].spaces.find((s) => s.id === session.spaceId)!.label;
    };
    expect(tableOf(0)).toBe("Table B");
    expect(tableOf(1)).toBe("Table C");
    for (const frame of frames) {
      expect(frame.bookings).toHaveLength(1);
      expect(frame.bookings[0]).toMatchObject({
        sessionId: rideId,
        initials: "GU",
      });
    }
    expect(frames[0].bookings[0].id).toBe(frames[1].bookings[0].id);
    expect(frames[1].changes).toContain("Ticket to Ride: Table B → Table C");
    expect(frames[1].kept).toBe(1);
    expect(frames[0].photo).toEqual({
      kind: "sample",
      src: "/samples/original.svg",
    });
    expect(frames[1].photo).toEqual({
      kind: "sample",
      src: "/samples/table-removed.svg",
    });
  });

  it("orders frames by applied version and leaves discarded readings out", async () => {
    const { store, id } = await sampleWithGuest();
    await applyEdit(store, id, "rename");
    const event = await loadEvent(store, id);
    const discarded = await makeProposal(
      store,
      event,
      sampleEdit(event, "capacity"),
      "sample-capacity",
      "sample",
    );
    await discardProposal(store, await getProposal(store, id, discarded.id));
    await applyEdit(store, id, "remove-table");
    const {
      frames,
      discarded: notes,
      proposals,
      photos,
    } = await timelineFor(store, id);
    expect(frames).toHaveLength(3);
    expect(frames.map((f) => f.proposalId)).not.toContain(discarded.id);
    expect(notes).toEqual([
      expect.objectContaining({ proposalId: discarded.id, afterVersion: 2 }),
    ]);
    const shuffled = [...proposals].reverse();
    expect(
      buildTimeline(event, shuffled, photos).frames.map((f) => f.proposalId),
    ).toEqual(frames.map((f) => f.proposalId));
    expect(frames[2].eventRevision).toBeGreaterThan(frames[1].eventRevision!);
  });

  it("falls back to applied time when legacy proposals lack a version", () => {
    const event = blankEvent();
    const plan = (label: string) => ({
      spaces: [
        {
          id: "space-1-0",
          label,
          capacity: 4,
          removed: false,
          evidence: {
            text: "",
            box: [0, 0, 0, 0] as [number, number, number, number],
          },
        },
      ],
      sessions: [],
      changes: [],
      retainedBookings: 0,
    });
    const proposals: TimelineProposal[] = [
      legacy("late", "2026-09-20T12:00:00.000Z", plan("Late")),
      legacy("early", "2026-09-20T10:00:00.000Z", plan("Early")),
    ];
    const { frames } = buildTimeline(event, proposals, []);
    expect(frames.map((f) => f.proposalId)).toEqual(["early", "late"]);
    expect(frames[0].spaces[0].label).toBe("Early");
  });

  it("marks a legacy sample original as reconstructed and a lost photo as missing", async () => {
    const { store, id, rideId } = await sampleWithGuest();
    await applyEdit(store, id, "remove-table");
    const { event, proposals } = await timelineFor(store, id);
    const withoutSnapshot = proposals.map((p) => ({
      ...p,
      planBefore: undefined,
    }));
    const { frames } = buildTimeline(
      event,
      withoutSnapshot.map((p) => ({ ...p, photoId: "gone" })),
      [],
    );
    expect(frames[0].basis).toBe("reconstructed");
    expect(frames[0].sessions.find((s) => s.id === rideId)?.spaceId).toBe(
      "space-1-1",
    );
    expect(frames[1].photo).toEqual({ kind: "missing" });
  });

  it("starts a blank gathering at its first applied plan", () => {
    const event = blankEvent();
    const { frames } = buildTimeline(event, [], []);
    expect(frames).toEqual([]);
  });

  it("shows a booking only in versions that existed while it was active", async () => {
    const { store, id } = await sampleWithGuest();
    await applyEdit(store, id, "remove-table");
    const event = await loadEvent(store, id);
    const catan = event.sessions.find((s) => s.title === "Catan")!;
    tick();
    await register(store, id, "late-token", "Late Bo", catan.id);
    const { frames } = await timelineFor(store, id);
    expect(frames[0].bookings.map((b) => b.initials)).toEqual(["GU"]);
    expect(frames[1].bookings.map((b) => b.initials).sort()).toEqual([
      "GU",
      "LA",
    ]);
  });
});

function blankEvent(): EventRecord {
  return {
    _id: "inkshift.event.blank",
    _type: "inkshiftEvent",
    id: "blank",
    title: "Blank",
    date: "2026-09-27",
    timeZone: "UTC",
    version: 0,
    ownerHash: "x",
    spaces: [],
    sessions: [],
    bookings: [],
    createdAt: "2026-09-20T09:00:00.000Z",
    updatedAt: "2026-09-20T09:00:00.000Z",
    history: [],
    sample: false,
  };
}
function legacy(
  id: string,
  appliedAt: string,
  preview: TimelineProposal["preview"],
): TimelineProposal {
  return {
    id,
    status: "applied",
    source: "manual",
    photoId: "",
    baseVersion: 0,
    createdAt: appliedAt,
    appliedAt,
    preview,
  };
}
