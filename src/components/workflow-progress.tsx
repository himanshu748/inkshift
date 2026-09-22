import { Check, Circle, RefreshCw } from "lucide-react";
import type { ReviewedProposal } from "@/lib/model";

export function WorkflowProgress({
  proposal,
  busy,
  onRetry,
}: {
  proposal: ReviewedProposal;
  busy: boolean;
  onRetry: () => void;
}) {
  const workflow = proposal.workflow;
  if (!workflow)
    return (
      <p className="workflow-local">
        Local review · connect Sanity to record workflow history.
      </p>
    );
  if (workflow.status === "unavailable")
    return (
      <div className="notice warning workflow-warning" role="status">
        <div>
          <strong>Review history needs a retry.</strong>
          <p>{workflow.reason}</p>
        </div>
        <button className="button secondary" onClick={onRetry} disabled={busy}>
          <RefreshCw size={15} />
          Retry workflow
        </button>
      </div>
    );
  return (
    <div className="workflow-progress">
      <ol aria-label="Review progress">
        {workflow.steps.map((step) => (
          <li
            key={step.stage}
            data-state={step.state}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            <span className="workflow-marker">
              {step.state === "done" ? (
                <Check size={15} />
              ) : (
                <Circle size={12} />
              )}
            </span>
            <div>
              <strong>{step.title}</strong>
              <span>
                {step.by ??
                  (step.state === "current"
                    ? "Your decision"
                    : "After your review")}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <details>
        <summary>Review record · Sanity Workflows</summary>
        <p>
          {workflow.counts.changes ?? 0} changes ·{" "}
          {workflow.counts.uncertainReadings ?? 0} unresolved checks ·{" "}
          {workflow.counts.affectedRegistrations ?? 0} registration
          {workflow.counts.affectedRegistrations === 1 ? "" : "s"} affected
        </p>
        <p className="workflow-id">
          {workflow.instanceId} · definition v{workflow.version}
        </p>
        <p>
          Photo readings and organizer decisions share one saved review.
          INKSHIFT’s server records each caller; approval still checks the
          current plan and registrations.
        </p>
      </details>
    </div>
  );
}
