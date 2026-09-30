import { describe, expect, it } from "vitest";
import { draftSchema, eventToDraft } from "../src/lib/model";
import { PHOTO_CAPACITY_REVIEW, requirePhotoCapacityReview } from "../src/lib/photo-review";
import { createEvent, loadEvent, makeProposal, applyProposal, reviseProposal } from "../src/lib/service";
import { MemoryStore } from "./memory-store";

async function setup() {
  const store = new MemoryStore();
  const { event } = await createEvent(store, "sample", "2026-10-03", "UTC");
  const current = await loadEvent(store, event.id);
  return { store, event: current, draft: eventToDraft(current) };
}

describe("photo capacity review", () => {
  it("blocks a confident reading until an organizer explicitly checks seat limits", async () => {
    const { store, event, draft } = await setup();
    const guarded = requirePhotoCapacityReview(draft);
    const proposal = await makeProposal(store, event, guarded, "photo", "vision");
    expect(proposal.preview.conflicts.some(c => c.message.includes(PHOTO_CAPACITY_REVIEW))).toBe(true);
    await expect(applyProposal(store, event, proposal, event.version)).rejects.toThrow();
    // This is the same explicit correction action exposed by the reading editor.
    const checked = await reviseProposal(store, event, proposal, { ...guarded, uncertainties: [] });
    await expect(applyProposal(store, event, checked, event.version)).resolves.toMatchObject({ id: event.id });
  });

  it("retains all provider questions and leaves the original reading unchanged", async () => {
    const { draft } = await setup();
    draft.uncertainties = ["Was the bottom row cropped?", "Which original session is this?"];
    const guarded = requirePhotoCapacityReview(draft);
    expect(guarded.uncertainties).toEqual([PHOTO_CAPACITY_REVIEW, ...draft.uncertainties]);
    expect(draft.uncertainties).toHaveLength(2);
  });

  it("reserves the twentieth slot without losing any of nineteen provider questions", async () => {
    const { draft } = await setup();
    draft.uncertainties = Array.from({ length: 19 }, (_, i) => `Check item ${i}`);
    expect(draftSchema.parse(requirePhotoCapacityReview(draft)).uncertainties).toHaveLength(20);
    draft.uncertainties.push("Another question");
    expect(() => requirePhotoCapacityReview(draft)).toThrow("Too many photo uncertainties");
  });
});
