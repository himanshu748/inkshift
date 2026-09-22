import {
  defineAction,
  defineActivity,
  defineField,
  defineOp,
  defineStage,
  defineTransition,
  defineWorkflow,
} from "@sanity/workflow-engine/define";

export const PLAN_CHANGE = "inkshift-plan-change";
export const WORKFLOW_TAG = "inkshift";
export const READER_CONTEXT = "inkshift-photo-reader";
export const ORGANIZER_CONTEXT = "inkshift-organizer";
export const SAMPLE_CONTEXT = "inkshift-prepared-example";

/** One run per proposal, so a retried start resumes instead of duplicating. */
export const planChangeInstanceId = (eventId: string, proposalId: string) =>
  `${WORKFLOW_TAG}.wf-instance.${eventId}-${proposalId}`;

const count = (name: string, title: string, description: string) =>
  defineField({
    type: "number",
    name,
    title,
    description,
    validation: { min: 0 },
  });
const countParam = (name: string) =>
  ({ type: "number", name, required: true, validation: { min: 0 } }) as const;
const setFromParam = (field: string) =>
  defineOp({
    type: "field.set",
    target: { field },
    value: { type: "param", param: field },
  });
const readingCounts = [
  "changes",
  "uncertainReadings",
  "affectedRegistrations",
] as const;

export const planChange = defineWorkflow({
  name: PLAN_CHANGE,
  title: "Paper change review",
  description:
    "A photographed edit becomes a proposal. The reader records what it found, the organizer resolves uncertain readings, then approves or discards. Approval applies the plan in the same revision-checked transaction as before.",
  initialStage: "reading",
  start: {
    requirements: [
      {
        type: "singleSubject",
        name: "one-review-per-proposal",
        title: "This proposal already has a review",
      },
    ],
  },
  fields: [
    defineField({
      type: "subject",
      name: "subject",
      title: "Proposal",
      description: "The inkshiftProposal document this run reviews.",
      types: ["inkshiftProposal"],
      initialValue: { type: "input" },
      required: true,
    }),
    defineField({
      type: "string",
      name: "source",
      title: "Reading source",
      options: {
        list: [
          { title: "Photo reader", value: "vision" },
          { title: "Prepared example", value: "sample" },
          { title: "Typed by the organizer", value: "manual" },
        ],
      },
    }),
    count("changes", "Changes", "Proposed changes to the live plan."),
    count(
      "uncertainReadings",
      "Uncertain readings",
      "Readings the organizer must resolve: the reader's own questions plus identity and plan conflicts. Approval waits for zero.",
    ),
    count(
      "affectedRegistrations",
      "Affected registrations",
      "Active registrations on a session or table that the proposal changes.",
    ),
    defineField({
      type: "string",
      name: "decision",
      title: "Decision",
      options: {
        list: [
          { title: "Approved", value: "approve" },
          { title: "Discarded", value: "discard" },
        ],
      },
    }),
    defineField({
      type: "number",
      name: "appliedVersion",
      title: "Applied as event version",
      description: "The event version the approved plan transaction created.",
    }),
  ],
  stages: [
    defineStage({
      name: "reading",
      title: "Reading",
      description:
        "The photo reader turns the photograph into a proposed plan. Prepared examples use a fixed reading and typed plans come from the organizer.",
      activities: [
        defineActivity({
          name: "read",
          title: "Read the photograph",
          actions: [
            defineAction({
              name: "submit-reading",
              title: "Submit the reading",
              params: [
                {
                  type: "string",
                  name: "source",
                  required: true,
                  options: {
                    list: [
                      { title: "Photo reader", value: "vision" },
                      { title: "Prepared example", value: "sample" },
                      { title: "Typed by the organizer", value: "manual" },
                    ],
                  },
                },
                ...readingCounts.map(countParam),
              ],
              ops: [setFromParam("source"), ...readingCounts.map(setFromParam)],
              status: "done",
            }),
          ],
        }),
      ],
      transitions: [defineTransition({ name: "to-review", to: "review" })],
    }),
    defineStage({
      name: "review",
      title: "Review",
      description:
        "The organizer compares the reading with the paper, corrects it and decides.",
      activities: [
        defineActivity({
          name: "review",
          title: "Check the reading",
          actions: [
            defineAction({
              name: "recheck",
              title: "Recheck corrections",
              description:
                "Records the counts after the organizer corrects the reading.",
              params: readingCounts.map(countParam),
              ops: readingCounts.map(setFromParam),
            }),
            defineAction({
              name: "discard",
              title: "Discard the proposal",
              description: "Keeps the current plan. Nothing changes.",
              semantics: ["decision.decline"],
              ops: [
                defineOp({
                  type: "field.set",
                  target: { field: "decision" },
                  value: { type: "literal", value: "discard" },
                }),
                defineOp({
                  type: "status.set",
                  activity: "approval",
                  status: "skipped",
                }),
              ],
              status: "done",
            }),
          ],
        }),
        defineActivity({
          name: "approval",
          title: "Approve the changes",
          requirements: [
            {
              type: "groq",
              name: "readings-resolved",
              title: "Resolve every uncertain reading first",
              query: "$fields.uncertainReadings == 0",
            },
          ],
          actions: [
            defineAction({
              name: "approve",
              title: "Approve",
              semantics: ["decision.accept"],
              params: [
                {
                  type: "number",
                  name: "appliedVersion",
                  required: true,
                  validation: { min: 1 },
                },
              ],
              ops: [
                defineOp({
                  type: "field.set",
                  target: { field: "decision" },
                  value: { type: "literal", value: "approve" },
                }),
                setFromParam("appliedVersion"),
                defineOp({
                  type: "status.set",
                  activity: "review",
                  status: "done",
                }),
              ],
              status: "done",
            }),
          ],
        }),
      ],
      transitions: [
        defineTransition({
          name: "to-applied",
          to: "applied",
          when: "$fields.decision == 'approve'",
        }),
        defineTransition({
          name: "to-discarded",
          to: "discarded",
          when: "$fields.decision == 'discard'",
        }),
      ],
    }),
    defineStage({
      name: "applied",
      title: "Applied",
      description: "The live plan changed. Registrations kept their sessions.",
    }),
    defineStage({
      name: "discarded",
      title: "Discarded",
      description: "The organizer kept the current plan.",
    }),
  ],
});
