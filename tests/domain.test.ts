import { describe, expect, it } from "vitest";
import {
  createEvent,
  loadEvent,
  register,
  cancelBooking,
  makeProposal,
  getProposal,
  applyProposal,
  reviseProposal,
  toView,
  isOwner,
  projections,
} from "../src/lib/service";
import { eventToDraft } from "../src/lib/model";
import { reconcile } from "../src/lib/reconcile";
import { sampleEdit } from "../src/lib/sample";
import { StaleWriteError } from "../src/lib/store";
import { MemoryStore } from "./memory-store";
async function setup() {
  const store = new MemoryStore();
  const { event, token } = await createEvent(
    store,
    "sample",
    "2026-09-27",
    "Asia/Kolkata",
  );
  return { store, event: await loadEvent(store, event.id), token };
}

describe("paper reconciliation", () => {
  it("keeps every identity when only evidence boxes move", async () => {
    const { event } = await setup();
    const draft = eventToDraft(event);
    draft.sessions.forEach((s) => {
      s.evidence.box = [0.2, 0.2, 0.2, 0.2];
    });
    const preview = reconcile(event, draft, "angle-two");
    expect(preview.changes).toEqual([]);
    expect(preview.conflicts).toEqual([]);
    expect(preview.sessions.map((s) => s.id)).toEqual(
      event.sessions.map((s) => s.id),
    );
  });
  it("preserves registrations when removing a table and relocating the same game", async () => {
    const { store, event } = await setup();
    const ride = event.sessions[1];
    await register(store, event.id, "alex", "Alex", ride.id);
    await register(store, event.id, "sam", "Sam", ride.id);
    const current = await loadEvent(store, event.id);
    const proposal = await makeProposal(
      store,
      current,
      sampleEdit(current, "remove-table"),
      "photo-new",
      "sample",
    );
    expect(proposal.preview.conflicts).toEqual([]);
    expect(
      proposal.preview.changes.find((c) => c.kind === "move")?.affected,
    ).toBe(2);
    const next = await applyProposal(
      store,
      current,
      await getProposal(store, event.id, proposal.id),
      current.version,
    );
    expect(next.bookings.map((b) => b.id)).toEqual(
      current.bookings.map((b) => b.id),
    );
    expect(next.sessions.find((s) => s.id === ride.id)?.spaceId).toBe(
      event.spaces[2].id,
    );
  });
  it("does not move a game into a table occupied by a different game", async () => {
    const { event } = await setup();
    const draft = sampleEdit(event, "remove-table");
    draft.sessions[2].start = "18:00";
    const result = reconcile(event, draft, "p");
    expect(result.conflicts.some((c) => c.code === "no-relocation")).toBe(true);
  });
  it("keeps a renamed session id and its registrations", async () => {
    const { store, event } = await setup();
    await register(store, event.id, "p", "Pat", event.sessions[1].id);
    const current = await loadEvent(store, event.id);
    const result = reconcile(current, sampleEdit(current, "rename"), "p");
    expect(result.sessions[1].id).toBe(event.sessions[1].id);
    expect(result.changes.find((c) => c.kind === "rename")?.affected).toBe(1);
    expect(result.conflicts).toEqual([]);
  });
  it("blocks a cropped photo and preserves the unobserved session", async () => {
    const { event } = await setup();
    const draft = eventToDraft(event);
    draft.complete = false;
    draft.sessions.pop();
    const result = reconcile(event, draft, "p");
    expect(result.conflicts.map((c) => c.code)).toContain("partial-photo");
    expect(result.conflicts.map((c) => c.code)).toContain("missing-session");
    expect(result.sessions).toHaveLength(3);
  });
  it("blocks reducing capacity below active bookings", async () => {
    const { store, event } = await setup();
    await register(store, event.id, "a", "Alex", event.sessions[1].id);
    await register(store, event.id, "b", "Bo", event.sessions[1].id);
    const current = await loadEvent(store, event.id);
    expect(
      reconcile(current, sampleEdit(current, "capacity"), "p").conflicts.map(
        (c) => c.code,
      ),
    ).toContain("capacity-below-bookings");
  });
  it("requires ambiguity and unknown identities to be resolved", async () => {
    const { event } = await setup();
    const draft = eventToDraft(event);
    draft.sessions[0].existingId = "invented";
    draft.uncertainties = ["Is the title Catan or Carcassonne?"];
    const result = reconcile(event, draft, "p");
    expect(result.conflicts.map((c) => c.code)).toEqual(
      expect.arrayContaining([
        "unknown-identity",
        "uncertain-reading",
        "missing-session",
      ]),
    );
    expect(result.sessions.map((s) => s.id)).toEqual(
      expect.arrayContaining(event.sessions.map((s) => s.id)),
    );
  });
  it("does not let duplicate identities overwrite sessions", async () => {
    const { event } = await setup();
    const draft = eventToDraft(event);
    draft.sessions[1].existingId = draft.sessions[0].existingId;
    expect(reconcile(event, draft, "p").conflicts.map((c) => c.code)).toContain(
      "duplicate-identity",
    );
  });
  it("blocks deleting a registered session", async () => {
    const { store, event } = await setup();
    await register(store, event.id, "a", "Alex", event.sessions[0].id);
    const current = await loadEvent(store, event.id);
    const draft = eventToDraft(current);
    draft.sessions[0].removed = true;
    expect(
      reconcile(current, draft, "p").conflicts.map((c) => c.code),
    ).toContain("registered-session-removal");
  });
  it("checks participant overlaps when a session time changes", async () => {
    const { store, event } = await setup();
    await register(store, event.id, "a", "Alex", event.sessions[0].id);
    await register(store, event.id, "a", "Alex", event.sessions[2].id);
    const current = await loadEvent(store, event.id);
    const draft = eventToDraft(current);
    draft.sessions[2].start = "19:00";
    expect(
      reconcile(current, draft, "p").conflicts.map((c) => c.code),
    ).toContain("participant-overlap");
  });
});
describe("identity boundaries", () => {
  it("never assigns a new session an existing identity at version zero", async () => {
    const { event } = await setup();
    const draft = eventToDraft(event);
    draft.sessions[0].existingId = null;
    draft.sessions[0].title = "A different game";
    const result = reconcile(event, draft, "new");
    expect(
      result.sessions.find((s) => s.title === "A different game")?.id,
    ).not.toBe(event.sessions[0].id);
    expect(
      result.sessions.find((s) => s.id === event.sessions[0].id)?.title,
    ).toBe("Catan");
    expect(result.conflicts.map((c) => c.code)).toContain("missing-session");
  });
  it("does not mutate the approved event while checking missing entities", async () => {
    const { event } = await setup();
    const before = structuredClone(event);
    const draft = sampleEdit(event, "remove-table");
    draft.sessions = draft.sessions.filter((s) => s.title !== "Ticket to Ride");
    reconcile(event, draft, "new");
    expect(event).toEqual(before);
  });
});
describe("transactional participation", () => {
  it("gives exactly one of eight simultaneous requests the last place", async () => {
    const { store, event } = await setup();
    const s = event.sessions[0];
    for (let i = 0; i < 3; i++)
      await register(store, event.id, `p${i}`, `Person ${i}`, s.id);
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        register(store, event.id, `r${i}`, `Racer ${i}`, s.id),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (await loadEvent(store, event.id)).bookings.filter(
        (b) => b.sessionId === s.id,
      ),
    ).toHaveLength(4);
  });
  it("retries a duplicate join without consuming another place", async () => {
    const { store, event } = await setup();
    const a = await register(store, event.id, "p", "Pat", event.sessions[0].id);
    const b = await register(store, event.id, "p", "Pat", event.sessions[0].id);
    expect(b.booking.id).toBe(a.booking.id);
    expect(b.alreadyJoined).toBe(true);
    expect((await loadEvent(store, event.id)).bookings).toHaveLength(1);
  });
  it("prevents double booking while allowing touching time boundaries", async () => {
    const { store, event } = await setup();
    await register(store, event.id, "p", "Pat", event.sessions[0].id);
    await expect(
      register(store, event.id, "p", "Pat", event.sessions[1].id),
    ).rejects.toThrow("already joined");
    await expect(
      register(store, event.id, "p", "Pat", event.sessions[2].id),
    ).resolves.toBeDefined();
  });
  it("only lets the booking owner cancel and releases the seat", async () => {
    const { store, event } = await setup();
    const { booking } = await register(
      store,
      event.id,
      "p",
      "Pat",
      event.sessions[0].id,
    );
    await expect(
      cancelBooking(store, event.id, "imposter", booking.id),
    ).rejects.toThrow("another browser");
    const next = await cancelBooking(store, event.id, "p", booking.id);
    expect(next.bookings[0].cancelledAt).toBeTruthy();
  });
  it("blocks approval after a new registration until the proposal is rechecked", async () => {
    const { store, event } = await setup();
    const p = await makeProposal(
      store,
      event,
      sampleEdit(event, "remove-table"),
      "p",
      "sample",
    );
    await register(store, event.id, "p", "Pat", event.sessions[1].id);
    const now = await loadEvent(store, event.id);
    await expect(
      applyProposal(
        store,
        now,
        await getProposal(store, event.id, p.id),
        p.baseVersion,
      ),
    ).rejects.toThrow("changed");
    const updated = await reviseProposal(
      store,
      now,
      await getProposal(store, event.id, p.id),
      p.draft,
    );
    expect(updated.preview.retainedBookings).toBe(1);
    await expect(
      applyProposal(
        store,
        now,
        await getProposal(store, event.id, p.id),
        now.version,
      ),
    ).resolves.toBeDefined();
  });
  it("guards proposal revision as well as event revision during approval", async () => {
    const { store, event } = await setup();
    const p = await makeProposal(
      store,
      event,
      sampleEdit(event, "rename"),
      "p",
      "sample",
    );
    const old = await getProposal(store, event.id, p.id);
    await reviseProposal(store, event, old, eventToDraft(event));
    await expect(
      applyProposal(store, event, old, event.version),
    ).rejects.toBeInstanceOf(StaleWriteError);
    expect((await loadEvent(store, event.id)).version).toBe(event.version);
  });
  it("never includes credentials, names, or photo data in public projections", async () => {
    const { store, event, token } = await setup();
    await register(store, event.id, "p", "Private Name", event.sessions[0].id);
    const current = await loadEvent(store, event.id);
    const pub = projections(current).find((d) => !d._id.includes("."))!;
    expect(JSON.stringify(pub)).not.toMatch(
      /Private Name|ownerHash|participantHash|dataUrl/,
    );
    const view = toView(current, false, undefined, store);
    expect(view.bookings).toBeUndefined();
    expect(view.photoId).toBeUndefined();
    expect(isOwner(current, token)).toBe(true);
    expect(isOwner(current, "imposter")).toBe(false);
  });
});
