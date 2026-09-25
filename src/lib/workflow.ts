import "server-only";
import { createClient } from "@sanity/client";
import {
  createEngine,
  ENGINE_API_VERSION,
  errorMessage,
  gdrRef,
  InstanceNotFoundError,
  type DeclaredExecutionContext,
  type DisabledReason,
  type Engine,
  type HistoryEntry,
  type WorkflowInstance,
  type WorkflowResource,
} from "@sanity/workflow-engine";
import type {
  DraftPlan,
  EventRecord,
  Proposal,
  ReviewedProposal,
  WorkflowStep,
  WorkflowView,
} from "./model";
import {
  ORGANIZER_CONTEXT,
  PLAN_CHANGE,
  planChangeInstanceId,
  READER_CONTEXT,
  SAMPLE_CONTEXT,
  WORKFLOW_TAG,
} from "./plan-change";
import {
  AppError,
  applyProposal,
  discardProposal,
  getProposal,
  reviseProposal,
} from "./service";
import type { Store } from "./store";
import type { TimelineWorkflow } from "./timeline";

/**
 * The engine stamps every call with the token's identity, and both callers use
 * the server token. The declared execution context is what tells the reader
 * agent's steps apart from the organizer's in the instance history.
 */
export type ReviewEngines = {
  reader: Engine;
  sample: Engine;
  organizer: Engine;
  resource: WorkflowResource;
};

let cached: ReviewEngines | undefined;
export function reviewEngines(store: Store): ReviewEngines | null {
  if (store.kind !== "sanity") return null;
  if (cached) return cached;
  const projectId = process.env.SANITY_PROJECT_ID!;
  const dataset = process.env.SANITY_DATASET ?? "production";
  const client = createClient({
    projectId,
    dataset,
    token: process.env.SANITY_API_TOKEN ?? process.env.SANITY_AUTH_TOKEN,
    apiVersion: ENGINE_API_VERSION,
    useCdn: false,
  });
  const resource: WorkflowResource = {
    type: "dataset",
    id: `${projectId}.${dataset}`,
  };
  const engine = (executionContext: DeclaredExecutionContext) =>
    createEngine({
      client,
      workflowResource: resource,
      tag: WORKFLOW_TAG,
      executionContext,
    });
  cached = {
    reader: engine({ kind: "server", id: READER_CONTEXT }),
    sample: engine({ kind: "server", id: SAMPLE_CONTEXT }),
    organizer: engine({ kind: "interactive", id: ORGANIZER_CONTEXT }),
    resource,
  };
  return cached;
}

const instanceIdFor = (proposal: Pick<Proposal, "eventId" | "id">) =>
  planChangeInstanceId(proposal.eventId, proposal.id);
const counts = (proposal: Proposal) => ({
  changes: proposal.preview.changes.length,
  uncertainReadings: proposal.preview.conflicts.length,
  affectedRegistrations: proposal.preview.affectedRegistrations ?? 0,
});
const field = (instance: WorkflowInstance, name: string) => {
  const value = instance.fields.find((f) => f.name === name)?.value;
  return typeof value === "number" ? value : null;
};

async function readInstance(engine: Engine, instanceId: string) {
  try {
    return await engine.getInstance({ instanceId });
  } catch (error) {
    if (error instanceof InstanceNotFoundError) return null;
    throw error;
  }
}

/**
 * Brings the run in line with the proposal document, which is the source of
 * truth for decisions. Each step is keyed, so a repeat after a partial
 * failure resumes instead of duplicating.
 */
async function sync(
  engines: ReviewEngines,
  proposal: Proposal,
  options: { recheck?: boolean } = {},
) {
  const instanceId = instanceIdFor(proposal);
  const reader =
    proposal.source === "manual"
      ? engines.organizer
      : proposal.source === "sample"
        ? engines.sample
        : engines.reader;
  const summary = counts(proposal);
  let instance = await readInstance(engines.organizer, instanceId);
  if (!instance) {
    try {
      instance = (
        await reader.startInstance({
          definition: PLAN_CHANGE,
          instanceId,
          initialFields: [
            {
              type: "subject",
              name: "subject",
              value: gdrRef({
                res: engines.resource,
                documentId: proposal._id,
                type: "inkshiftProposal",
              }),
            },
          ],
        })
      ).instance;
    } catch (error) {
      // Another request may have started this deterministic run while we read.
      instance = await readInstance(engines.organizer, instanceId);
      if (!instance) throw error;
    }
  }
  if (instance.currentStage === "reading")
    instance = (
      await reader.fireAction({
        instanceId,
        activity: "read",
        action: "submit-reading",
        params: { source: proposal.source, ...summary },
        idempotencyKey: `read:${proposal.id}`,
      })
    ).instance;
  if (instance.currentStage !== "review") return instance;
  const current = instance;
  if (
    options.recheck ||
    Object.entries(summary).some(
      ([name, value]) => field(current, name) !== value,
    )
  )
    instance = (
      await engines.organizer.fireAction({
        instanceId,
        activity: "review",
        action: "recheck",
        params: summary,
      })
    ).instance;
  if (proposal.status === "applied" && proposal.appliedVersion)
    instance = (
      await engines.organizer.fireAction({
        instanceId,
        activity: "approval",
        action: "approve",
        params: { appliedVersion: proposal.appliedVersion },
        idempotencyKey: `approve:${proposal.id}`,
      })
    ).instance;
  else if (proposal.status === "discarded")
    instance = (
      await engines.organizer.fireAction({
        instanceId,
        activity: "review",
        action: "discard",
        idempotencyKey: `discard:${proposal.id}`,
      })
    ).instance;
  return instance;
}

function reasonFor(
  reason: DisabledReason | undefined,
  instance: WorkflowInstance,
) {
  if (instance.currentStage === "reading")
    return "The reader has not submitted its reading yet.";
  switch (reason?.kind) {
    case "requirements-unmet":
      return (
        reason.unmetRequirements.map((r) => r.title ?? r.name).join(". ") + "."
      );
    case "activity-not-active":
    case "stage-terminal":
    case "instance-completed":
      return "This review is already decided.";
    case "instance-aborted":
      return "This review was stopped.";
    default:
      return "The review workflow does not allow this right now.";
  }
}

async function verdict(
  engines: ReviewEngines,
  instance: WorkflowInstance,
  activity: "approval" | "review",
  action: "approve" | "discard",
) {
  if (instance.completedAt)
    return {
      allowed: false,
      reason: instance.abortedAt
        ? "This review was stopped."
        : "This review is already decided.",
    };
  const evaluation = await engines.organizer.evaluate({
    instanceId: instance._id,
  });
  const found = evaluation.currentStage.activities
    .find((a) => a.activity.name === activity)
    ?.actions.find((a) => a.action.name === action);
  return found?.allowed
    ? { allowed: true }
    : { allowed: false, reason: reasonFor(found?.disabledReason, instance) };
}

const callers: Record<string, string> = {
  [READER_CONTEXT]: "Reader agent",
  [SAMPLE_CONTEXT]: "Prepared example",
  [ORGANIZER_CONTEXT]: "Organizer",
};
const callerOf = (entry?: HistoryEntry) => {
  const context = entry?.executionContext;
  if (!entry) return undefined;
  if (context?.id && callers[context.id]) return callers[context.id];
  if (context?.kind === "cli") return "Workflows CLI";
  return context?.id ?? context?.kind ?? "Unrecorded caller";
};

function steps(instance: WorkflowInstance): WorkflowStep[] {
  const history = instance.history;
  const fired = (action: string) =>
    history.findLast((h) => h._type === "actionFired" && h.action === action);
  const entered = (stage: string) =>
    history.findLast((h) => h._type === "stageEntered" && h.stage === stage);
  const reading = fired("submit-reading");
  const decision = fired("approve") ?? fired("discard");
  const outcome =
    instance.currentStage === "applied" || instance.currentStage === "discarded"
      ? instance.currentStage
      : undefined;
  const settled = outcome ? entered(outcome) : undefined;
  return [
    {
      stage: "reading",
      title: "Reading",
      state: reading ? "done" : "current",
      by: callerOf(reading),
      at: reading?.at,
    },
    {
      stage: "review",
      title: "Review",
      state: decision ? "done" : reading ? "current" : "upcoming",
      by: callerOf(decision),
      at: decision?.at ?? entered("review")?.at,
    },
    outcome
      ? {
          stage: outcome,
          title: outcome === "applied" ? "Applied" : "Discarded",
          state: "done",
          by: callerOf(settled),
          at: settled?.at,
        }
      : { stage: "outcome", title: "Applied or discarded", state: "upcoming" },
  ];
}

async function describe(
  engines: ReviewEngines,
  instance: WorkflowInstance,
): Promise<WorkflowView> {
  return {
    status: "tracked",
    instanceId: instance._id,
    definition: instance.definition,
    version: instance.pinnedVersion,
    stage: instance.currentStage,
    steps: steps(instance),
    counts: {
      changes: field(instance, "changes"),
      uncertainReadings: field(instance, "uncertainReadings"),
      affectedRegistrations: field(instance, "affectedRegistrations"),
    },
    approve: await verdict(engines, instance, "approval", "approve"),
  };
}

function unavailable(error: unknown, proposal: Proposal): WorkflowView {
  console.error(
    "INKSHIFT review workflow step failed",
    error instanceof Error ? error.name : "UnknownError",
    errorMessage(error),
  );
  return {
    status: "unavailable",
    reason:
      proposal.status === "review"
        ? "The review workflow could not be updated. INKSHIFT retries the next time this review opens or you act on it."
        : `Your decision is saved and the plan is ${proposal.status === "applied" ? "updated" : "unchanged"}. The workflow record will catch up the next time this review opens.`,
  };
}

/** Never throws: a failed step is reported and retried on the next call. */
export async function trackReview(
  engines: ReviewEngines | null,
  proposal: Proposal,
  options: { recheck?: boolean } = {},
): Promise<ReviewedProposal> {
  if (!engines) return proposal;
  try {
    const instance = await sync(engines, proposal, options);
    return { ...proposal, workflow: await describe(engines, instance) };
  } catch (error) {
    return { ...proposal, workflow: unavailable(error, proposal) };
  }
}

export async function reviseReview(
  engines: ReviewEngines | null,
  store: Store,
  event: EventRecord,
  proposal: Proposal,
  draft: DraftPlan,
) {
  const next = await reviseProposal(store, event, proposal, draft);
  return trackReview(engines, next, { recheck: true });
}

async function allowed(
  engines: ReviewEngines,
  proposal: Proposal,
  activity: "approval" | "review",
  action: "approve" | "discard",
) {
  let instance: WorkflowInstance;
  let check: { allowed: boolean; reason?: string };
  try {
    instance = await sync(engines, proposal);
    check = await verdict(engines, instance, activity, action);
  } catch {
    throw new AppError(
      "The review workflow is unavailable. Your plan has not changed. Retry this review in a moment.",
      503,
      "workflow-unavailable",
    );
  }
  if (!check.allowed)
    throw new AppError(
      check.reason ?? "The review workflow does not allow this.",
      instance.completedAt ? 409 : 422,
      "workflow-blocked",
    );
}

/**
 * The engine's verdict is checked first, then the revision-checked plan
 * transaction runs as before, then the workflow action is committed. If that
 * last commit fails, the proposal already records the decision and the next
 * sync fires the missing action.
 */
export async function approveReview(
  engines: ReviewEngines | null,
  store: Store,
  event: EventRecord,
  proposal: Proposal,
  reviewedVersion: number,
) {
  if (engines) await allowed(engines, proposal, "approval", "approve");
  const next = await applyProposal(store, event, proposal, reviewedVersion);
  const applied = await getProposal(store, event.id, proposal.id);
  return { event: next, proposal: await trackReview(engines, applied) };
}

export async function discardReview(
  engines: ReviewEngines | null,
  store: Store,
  proposal: Proposal,
) {
  if (engines) await allowed(engines, proposal, "review", "discard");
  return trackReview(engines, await discardProposal(store, proposal));
}

/** Read-only: reports each run as it stands without firing catch-up actions. */
export async function reviewStages(
  engines: ReviewEngines | null,
  proposals: Pick<Proposal, "eventId" | "id">[],
): Promise<Record<string, TimelineWorkflow>> {
  const entries = await Promise.all(
    proposals.map(async (proposal): Promise<[string, TimelineWorkflow]> => {
      if (!engines) return [proposal.id, { status: "local" }];
      try {
        const instance = await readInstance(
          engines.organizer,
          instanceIdFor(proposal),
        );
        return [
          proposal.id,
          instance
            ? {
                status: "tracked",
                stage: instance.currentStage,
                steps: steps(instance),
              }
            : { status: "unavailable" },
        ];
      } catch {
        return [proposal.id, { status: "unavailable" }];
      }
    }),
  );
  return Object.fromEntries(entries);
}
