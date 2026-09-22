import type { WorkflowDeploymentInput } from "@sanity/workflow-engine";
import { defineWorkflowConfig } from "@sanity/workflow-engine/define";
import { planChange, WORKFLOW_TAG } from "./src/lib/plan-change";

const projectId = process.env.SANITY_PROJECT_ID ?? "a5xdqsb7";
const dataset = process.env.SANITY_DATASET ?? "production";

// Model 10 is required by the definition's required subject. This app's
// server engine and the CLI are the only runtimes sharing the resource,
// both on Workflows 0.34.0.
export const production = {
  name: "production",
  tag: WORKFLOW_TAG,
  expectedMinReaderModel: 10,
  workflowResource: { type: "dataset", id: `${projectId}.${dataset}` },
  definitions: [planChange],
} satisfies WorkflowDeploymentInput;

export default defineWorkflowConfig({ deployments: [production] });
