import { describe, expect, it, vi } from "vitest";
import { createBench, createBenchEngine } from "@sanity/workflow-engine-test";
import {
  ORGANIZER_CONTEXT,
  PLAN_CHANGE,
  READER_CONTEXT,
  SAMPLE_CONTEXT,
  WORKFLOW_TAG,
  planChange,
  planChangeInstanceId,
} from "../src/lib/plan-change";
import {
  approveReview,
  discardReview,
  reviseReview,
  trackReview,
  type ReviewEngines,
} from "../src/lib/workflow";
import {
  createEvent,
  getProposal,
  loadEvent,
  makeProposal,
  register,
} from "../src/lib/service";
import { sampleEdit } from "../src/lib/sample";
import { StaleWriteError } from "../src/lib/store";
import { MemoryStore } from "./memory-store";

async function setup(source: "sample" | "vision" | "manual" = "sample") {
  const bench = createBench({ tag: WORKFLOW_TAG });
  await bench.deployDefinitions({
    expectedMinReaderModel: 10,
    definitions: [planChange],
  });
  const engines: ReviewEngines = {
    reader: createBenchEngine(bench, {
      executionContext: { kind: "server", id: READER_CONTEXT },
    }),
    sample: createBenchEngine(bench, {
      executionContext: { kind: "server", id: SAMPLE_CONTEXT },
    }),
    organizer: createBenchEngine(bench, {
      executionContext: { kind: "interactive", id: ORGANIZER_CONTEXT },
    }),
    resource: bench.workflowResource,
  };
  const store = new MemoryStore();
  const { event: created } = await createEvent(
    store,
    "sample",
    "2026-09-27",
    "Asia/Kolkata",
  );
  await register(store, created.id, "alex", "Alex", created.sessions[1].id);
  const event = await loadEvent(store, created.id);
  const made = await makeProposal(
    store,
    event,
    sampleEdit(event, "remove-table"),
    "sample-remove-table",
    source,
  );
  const proposal = await getProposal(store, event.id, made.id);
  await bench.client.create({ _id: proposal._id, _type: proposal._type });
  return {
    bench,
    engines,
    store,
    event,
    proposal,
    instanceId: planChangeInstanceId(event.id, proposal.id),
  };
}

describe("Sanity review workflow", () => {
  it("records a prepared reading, applies the relocation and keeps the booking identity", async () => {
    const { engines, store, event, proposal, bench, instanceId } =
      await setup();
    const review = await trackReview(engines, proposal);
    expect(review.workflow).toMatchObject({
      status: "tracked",
      stage: "review",
      approve: { allowed: true },
      counts: { affectedRegistrations: 1 },
    });
    if (review.workflow?.status === "tracked")
      expect(review.workflow.steps[0].by).toBe("Prepared example");
    const result = await approveReview(
      engines,
      store,
      event,
      proposal,
      event.version,
    );
    expect(result.proposal.workflow).toMatchObject({
      status: "tracked",
      stage: "applied",
    });
    expect(await bench.currentStage(instanceId)).toBe("applied");
    expect(result.event.bookings).toEqual(event.bookings);
    expect(result.event.sessions[1].spaceId).toBe(event.spaces[2].id);
    const run = await engines.organizer.getInstance({ instanceId });
    expect(run.definition).toBe(PLAN_CHANGE);
    expect(
      run.history.find(
        (h) => h._type === "actionFired" && h.action === "approve",
      )?.executionContext?.id,
    ).toBe(ORGANIZER_CONTEXT);
  });
  it("blocks unresolved readings, then records corrected counts before allowing approval", async () => {
    const { engines, store, event, proposal } = await setup("vision");
    const draft = {
      ...proposal.draft,
      uncertainties: ["The number of seats is unclear"],
    };
    const uncertain = await reviseReview(
      engines,
      store,
      event,
      proposal,
      draft,
    );
    expect(uncertain.workflow).toMatchObject({
      status: "tracked",
      stage: "review",
      approve: { allowed: false },
    });
    await expect(
      approveReview(
        engines,
        store,
        event,
        await getProposal(store, event.id, proposal.id),
        event.version,
      ),
    ).rejects.toMatchObject({ code: "workflow-blocked" });
    expect((await loadEvent(store, event.id)).version).toBe(event.version);
    const corrected = await reviseReview(
      engines,
      store,
      event,
      await getProposal(store, event.id, proposal.id),
      proposal.draft,
    );
    expect(corrected.workflow).toMatchObject({
      status: "tracked",
      counts: { uncertainReadings: 0 },
      approve: { allowed: true },
    });
    if (corrected.workflow?.status === "tracked")
      expect(corrected.workflow.steps[0].by).toBe("Reader agent");
  });
  it("discards a manual proposal without changing the plan or allowing a later approval", async () => {
    const { engines, store, event, proposal } = await setup("manual");
    const result = await discardReview(engines, store, proposal);
    expect(result.workflow).toMatchObject({
      status: "tracked",
      stage: "discarded",
    });
    if (result.workflow?.status === "tracked")
      expect(result.workflow.steps[0].by).toBe("Organizer");
    expect(await loadEvent(store, event.id)).toEqual(event);
    await expect(
      approveReview(
        engines,
        store,
        event,
        await getProposal(store, event.id, proposal.id),
        event.version,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("leaves the workflow in review when another registration makes the proposal stale", async () => {
    const { engines, store, event, proposal, bench, instanceId } =
      await setup();
    await trackReview(engines, proposal);
    await register(store, event.id, "sam", "Sam", event.sessions[1].id);
    await expect(
      approveReview(
        engines,
        store,
        await loadEvent(store, event.id),
        proposal,
        event.version,
      ),
    ).rejects.toBeInstanceOf(StaleWriteError);
    expect(await bench.currentStage(instanceId)).toBe("review");
    const current = await loadEvent(store, event.id);
    expect(current.bookings).toHaveLength(2);
    const rebased = await reviseReview(
      engines,
      store,
      current,
      await getProposal(store, event.id, proposal.id),
      proposal.draft,
    );
    expect(rebased.workflow).toMatchObject({
      status: "tracked",
      counts: { affectedRegistrations: 2 },
    });
  });
  it("recovers an interrupted workflow write without applying the plan twice", async () => {
    const { engines, store, event, proposal, instanceId } = await setup();
    await trackReview(engines, proposal);
    const original = engines.organizer.fireAction.bind(engines.organizer);
    const fire = vi
      .spyOn(engines.organizer, "fireAction")
      .mockRejectedValueOnce(new Error("simulated connection loss"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const applied = await approveReview(
      engines,
      store,
      event,
      proposal,
      event.version,
    );
    expect(applied.proposal.status).toBe("applied");
    expect(applied.proposal.workflow?.status).toBe("unavailable");
    fire.mockImplementation(original);
    const reopened = await trackReview(
      engines,
      await getProposal(store, event.id, proposal.id),
    );
    expect(reopened.workflow).toMatchObject({
      status: "tracked",
      stage: "applied",
    });
    await trackReview(engines, await getProposal(store, event.id, proposal.id));
    expect((await loadEvent(store, event.id)).version).toBe(event.version + 1);
    const run = await engines.organizer.getInstance({ instanceId });
    expect(
      run.history.filter(
        (h) => h._type === "actionFired" && h.action === "approve",
      ),
    ).toHaveLength(1);
    fire.mockRestore();
    log.mockRestore();
  });
  it("resumes the same run on repeated reads", async () => {
    const { engines, proposal, instanceId } = await setup();
    await trackReview(engines, proposal);
    await trackReview(engines, proposal);
    const run = await engines.organizer.getInstance({ instanceId });
    expect(
      run.history.filter(
        (h) => h._type === "actionFired" && h.action === "submit-reading",
      ),
    ).toHaveLength(1);
  });
});
