import { defineType, defineField, type FieldDefinition } from "sanity";

const str = (name: string, description?: string) =>
  defineField({ name, type: "string", description });
const num = (name: string) =>
  defineField({ name, type: "number", validation: (r) => r.integer().min(0) });
const bool = (name: string) => defineField({ name, type: "boolean" });
const at = (name: string) => defineField({ name, type: "datetime" });
const ref = (name: string, type: string) =>
  defineField({ name, type: "reference", to: [{ type }] });
const arr = (name: string, fields: FieldDefinition[]) =>
  defineField({ name, type: "array", of: [{ type: "object", fields }] });
const obj = (name: string, fields: FieldDefinition[]) =>
  defineField({ name, type: "object", fields });
const evidence = () =>
  obj("evidence", [
    defineField({
      name: "text",
      type: "text",
      description: "Words observed on the source paper.",
    }),
    defineField({
      name: "box",
      type: "array",
      of: [{ type: "number" }],
      validation: (r) => r.length(4),
      description:
        "Normalized left, top, width, height. Links the structured content back to paper.",
    }),
  ]);
const capacity = () =>
  defineField({
    name: "capacity",
    type: "number",
    validation: (r) => r.required().integer().min(1).max(100),
  });
const table = () => [
  str(
    "id",
    "Stable identity. Never derived from the current name or position.",
  ),
  str("label"),
  capacity(),
  bool("removed"),
  evidence(),
  str("photoId"),
];
const session = () => [
  str("id", "Registrations keep pointing here after a move or rename."),
  str("title"),
  str("spaceId"),
  str("start", "HH:mm in the event time zone; same-day sessions only."),
  str("end"),
  capacity(),
  bool("removed"),
  evidence(),
  str("photoId"),
];
const booking = () => [
  str("id"),
  str("sessionId"),
  str("name"),
  defineField({ name: "participantHash", type: "string", hidden: true }),
  at("createdAt"),
  at("cancelledAt"),
];
const change = () => [
  str("kind"),
  str("entity"),
  str("entityId"),
  str("before"),
  str("after"),
  str("detail"),
  num("affected"),
];
const eventFields = () => [
  str("title"),
  defineField({ name: "date", type: "date" }),
  str("timeZone", "IANA time zone; participants see event-local times."),
];
const reading = () => [
  ...eventFields(),
  bool("complete"),
  defineField({
    name: "uncertainties",
    type: "array",
    of: [{ type: "string" }],
  }),
  arr("spaces", [
    str("key"),
    str("existingId"),
    str("label"),
    capacity(),
    bool("removed"),
    evidence(),
  ]),
  arr("sessions", [
    str("key"),
    str("existingId"),
    str("title"),
    str("spaceKey"),
    str("start"),
    str("end"),
    capacity(),
    bool("removed"),
    evidence(),
  ]),
];
const doc = (
  name: string,
  title: string,
  fields: FieldDefinition[],
  description: string,
) =>
  defineType({
    name,
    title,
    type: "document",
    readOnly: true,
    description,
    fields,
    preview: {
      select: { title: "title", label: "label", name: "name", id: "id" },
      prepare: (v) => ({
        title: v.title ?? v.label ?? v.name ?? v.id ?? title,
        subtitle: title,
      }),
    },
  });

export const schemaTypes = [
  doc(
    "inkshiftEvent",
    "Event · transaction aggregate",
    [
      str("id"),
      ...eventFields(),
      num("version"),
      defineField({ name: "ownerHash", type: "string", hidden: true }),
      bool("sample"),
      str("photoId"),
      arr("spaces", table()),
      arr("sessions", session()),
      arr("bookings", booking()),
      arr("history", [
        str("id"),
        at("at"),
        str("action"),
        str("detail"),
        num("version"),
      ]),
      at("createdAt"),
      at("updatedAt"),
    ],
    "Private dot-path document. Its revision locks seat allocation and approval. Updated atomically with linked records and the public projection.",
  ),
  doc(
    "inkshiftSpace",
    "Table",
    [ref("event", "inkshiftEvent"), ...table(), ref("source", "inkshiftPhoto")],
    "A physical resource. Explicit removal relocates its sessions while keeping their identities.",
  ),
  doc(
    "inkshiftSession",
    "Session",
    [
      ref("event", "inkshiftEvent"),
      ...session(),
      ref("space", "inkshiftSpace"),
      ref("source", "inkshiftPhoto"),
    ],
    "A bookable activity with a stable identity, time interval, player limit, and source evidence.",
  ),
  doc(
    "inkshiftRegistration",
    "Registration",
    [
      ref("event", "inkshiftEvent"),
      ...booking(),
      ref("session", "inkshiftSession"),
    ],
    "Private document. A join targets a session, never a display name or table. Cancellation retains the record.",
  ),
  doc(
    "inkshiftPhoto",
    "Source paper",
    [
      str("id"),
      str("eventId"),
      str("label"),
      str("source"),
      str("samplePath"),
      defineField({
        name: "dataUrl",
        type: "text",
        hidden: true,
        description:
          "Private JPEG/PNG/WebP, capped at 1.8M characters. Never public. Prepared examples use samplePath.",
      }),
      at("createdAt"),
    ],
    "Source evidence. Photos stay private; prepared samples are explicitly identified.",
  ),
  doc(
    "inkshiftProposal",
    "Paper change review",
    [
      str("id"),
      str("eventId"),
      num("baseVersion"),
      str("photoId"),
      str("source"),
      str("model"),
      defineField({
        name: "status",
        type: "string",
        options: { list: ["review", "applied", "discarded"] },
      }),
      obj("draft", reading()),
      obj("preview", [
        arr("spaces", table()),
        arr("sessions", session()),
        arr("changes", change()),
        arr("conflicts", [str("code"), str("message"), str("entityId")]),
        num("retainedBookings"),
        num("affectedRegistrations"),
      ]),
      at("createdAt"),
      at("appliedAt"),
      num("appliedVersion"),
      at("discardedAt"),
    ],
    "A reading is a proposal and the subject of one inkshift-plan-change Sanity Workflows run. The workflow records who read, reviewed and decided; the server still recomputes constraints and guards event and proposal revisions before any plan change.",
  ),
  doc(
    "inkshiftPublicEvent",
    "Public live schedule",
    [
      str("eventId"),
      ...eventFields(),
      num("version"),
      at("updatedAt"),
      arr("spaces", [str("id"), str("label"), capacity()]),
      arr("sessions", [
        str("id"),
        str("title"),
        str("spaceId"),
        str("start"),
        str("end"),
        capacity(),
        num("booked"),
      ]),
    ],
    "Root-level document read anonymously by App SDK. Schedule and counts only. No names, participant identities, access credentials, or photos.",
  ),
  doc(
    "inkshiftUsage",
    "Demo daily budget",
    [str("day"), str("scope"), num("count")],
    "Private persisted cap for guest event creation and photo inference across server processes.",
  ),
  doc(
    "inkshiftCheck",
    "Integration check",
    [str("title")],
    "Connectivity check created during development.",
  ),
];
