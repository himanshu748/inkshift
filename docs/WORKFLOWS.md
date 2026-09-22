# Review workflows

`src/lib/plan-change.ts` defines `inkshift-plan-change`. `sanity.workflow.ts` binds the `inkshift` tag to the configured dataset, using reader model 10 and pinned Workflows packages 0.34.0.

```sh
npm run workflows:check
npm run workflows:deploy
```

The deployment script reads `.env.local` and passes the existing Sanity token to the CLI through its environment. It never prints the credential. Definitions are deployed with `--no-share-defs`.

## States and callers

Each proposal has a deterministic instance ID, `inkshift.wf-instance.<eventId>-<proposalId>`, and a required subject pointing to the private proposal document. A repeated start resumes that run. A single-subject requirement adds an engine-level check.

| Action | Caller context | Effect |
| --- | --- | --- |
| Submit photo reading | Reader agent (server) | Records source, changes, unresolved checks and affected registrations; enters Review |
| Submit prepared reading | Prepared example (server) | Same transition, explicitly distinct from image inference |
| Submit manual plan | Organizer (interactive) | Same transition, no image inference |
| Recheck | Organizer | Updates counts after deterministic reconciliation |
| Approve | Organizer | Allowed with zero unresolved checks; records applied event version and enters Applied |
| Discard | Organizer | Records the decision and enters Discarded without changing the event |

The contexts share the server's Sanity credential. They identify application callers in history, not separately authenticated Sanity users. Owner-cookie authorization and revision-checked domain transactions enforce write access. The implementation does not claim Content Lake mutation guards.

## Applying and recovering

1. Synchronize proposal counts and evaluate the workflow's approval action.
2. Reconcile against the current event. Atomically write the event, linked records, public projection and proposal decision with event and proposal revision guards.
3. Fire the workflow decision using a stable idempotency key.

If step 3 fails, step 2 remains the source of truth. The response explicitly says the decision is saved but the workflow record needs a retry. Reopening the review, pressing Retry workflow, or another action synchronizes from the persisted proposal. It does not apply the plan again. If preflight fails before step 2, approval returns a retryable error and leaves the plan unchanged.

`GET /api/events/:id/proposals` returns the latest 20 review summaries to the organizer. The individual GET resumes and returns a saved review. PUT rechecks a reading; DELETE discards it. Every route requires the event's owner capability, and mutation routes validate the origin. The public projection excludes proposals and workflow instances.

## Tests

`tests/workflow.test.ts` uses the real engine with `@sanity/workflow-engine-test`. It checks relocation and attribution, uncertainty and correction, discard, stale registrations, interrupted follow-up recovery, and repeated reads. The simulated connection failure is a test-only failure, not a claim that a live outage was induced.

`scripts/workflow-http-check.ts` tests the running app against Sanity, including stale approval, recheck, relocation, conflict blocking, discard, saved-history retrieval and anonymous access denial. `scripts/http-check.ts` separately sends two typed sample images through the actual photo reader and requires its review to be tracked with the Reader agent context.
