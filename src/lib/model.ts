import { z } from "zod";

const evidenceSchema = z.object({
  text: z.string().max(600),
  box: z.tuple([
    z.number().min(0).max(1),
    z.number().min(0).max(1),
    z.number().min(0).max(1),
    z.number().min(0).max(1),
  ]),
});
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time such as 18:30.");
export const draftSchema = z.object({
  title: z.string().trim().min(1).max(100),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (v) =>
        !Number.isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v,
      "Choose a valid date.",
    ),
  timeZone: z
    .string()
    .max(80)
    .refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, "Choose a valid time zone."),
  complete: z.boolean(),
  uncertainties: z.array(z.string().max(300)).max(20),
  spaces: z
    .array(
      z.object({
        key: z.string().min(1).max(80),
        existingId: z.string().max(80).nullable(),
        label: z.string().trim().min(1).max(80),
        capacity: z.number().int().min(1).max(100),
        removed: z.boolean(),
        evidence: evidenceSchema,
      }),
    )
    .min(1)
    .max(12),
  sessions: z
    .array(
      z.object({
        key: z.string().min(1).max(80),
        existingId: z.string().max(80).nullable(),
        title: z.string().trim().min(1).max(100),
        spaceKey: z.string().min(1).max(80),
        start: time,
        end: time,
        capacity: z.number().int().min(1).max(100),
        removed: z.boolean(),
        evidence: evidenceSchema,
      }),
    )
    .max(30),
});

export type DraftPlan = z.infer<typeof draftSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Space = {
  id: string;
  label: string;
  capacity: number;
  removed: boolean;
  evidence: Evidence;
  photoId?: string;
};
export type Session = {
  id: string;
  title: string;
  spaceId: string;
  start: string;
  end: string;
  capacity: number;
  removed: boolean;
  evidence: Evidence;
  photoId?: string;
};
export type Booking = {
  id: string;
  sessionId: string;
  name: string;
  participantHash: string;
  createdAt: string;
  cancelledAt?: string;
};
export type Change = {
  kind: "add" | "rename" | "move" | "remove" | "capacity" | "time" | "event";
  entity: string;
  entityId: string;
  before?: string;
  after?: string;
  detail: string;
  affected: number;
};
export type Conflict = { code: string; message: string; entityId?: string };
export type AuditEntry = {
  id: string;
  at: string;
  action: string;
  detail: string;
  version: number;
};
export type EventRecord = {
  _id: string;
  _type: "inkshiftEvent";
  _rev?: string;
  id: string;
  title: string;
  date: string;
  timeZone: string;
  version: number;
  ownerHash: string;
  spaces: Space[];
  sessions: Session[];
  bookings: Booking[];
  photoId?: string;
  createdAt: string;
  updatedAt: string;
  history: AuditEntry[];
  sample: boolean;
};
export type Preview = {
  spaces: Space[];
  sessions: Session[];
  changes: Change[];
  conflicts: Conflict[];
  retainedBookings: number;
  affectedRegistrations?: number;
};
export type Proposal = {
  _id: string;
  _type: "inkshiftProposal";
  _rev?: string;
  id: string;
  eventId: string;
  baseVersion: number;
  photoId: string;
  draft: DraftPlan;
  preview: Preview;
  status: "review" | "applied" | "discarded";
  source: "vision" | "sample" | "manual";
  model?: string;
  createdAt: string;
  appliedAt?: string;
  appliedVersion?: number;
  discardedAt?: string;
};
export type WorkflowStep = {
  stage: "reading" | "review" | "applied" | "discarded" | "outcome";
  title: string;
  state: "done" | "current" | "upcoming";
  by?: string;
  at?: string;
};
export type WorkflowView =
  | {
      status: "tracked";
      instanceId: string;
      definition: string;
      version: number;
      stage: string;
      steps: WorkflowStep[];
      counts: {
        changes: number | null;
        uncertainReadings: number | null;
        affectedRegistrations: number | null;
      };
      approve: { allowed: boolean; reason?: string };
    }
  | { status: "unavailable"; reason: string };
export type ReviewedProposal = Proposal & { workflow?: WorkflowView };
export type ReviewSummary = Pick<
  Proposal,
  "id" | "source" | "status" | "createdAt" | "appliedAt" | "discardedAt"
>;
export type PhotoRecord = {
  _id: string;
  _type: "inkshiftPhoto";
  _rev?: string;
  id: string;
  eventId: string;
  dataUrl: string;
  label: string;
  createdAt: string;
  source: "upload" | "camera" | "sample";
};
export type PublicSession = Session & { booked: number; spaceLabel: string };
export type EventView = {
  id: string;
  title: string;
  date: string;
  timeZone: string;
  version: number;
  spaces: Space[];
  sessions: PublicSession[];
  totalBookings: number;
  myBookings: { id: string; sessionId: string; name: string }[];
  bookings?: Omit<Booking, "participantHash">[];
  history: AuditEntry[];
  photoId?: string;
  role: "organizer" | "participant";
  sample: boolean;
  storage: "sanity" | "local";
  projectId?: string;
  visionAvailable: boolean;
};

export function activeBookings(event: EventRecord, sessionId?: string) {
  return event.bookings.filter(
    (b) => !b.cancelledAt && (!sessionId || b.sessionId === sessionId),
  );
}
export const minutes = (value: string) =>
  Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
export const overlaps = (
  a: Pick<Session, "start" | "end">,
  b: Pick<Session, "start" | "end">,
) => minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end);

export function eventToDraft(
  event: Pick<
    EventRecord,
    "title" | "date" | "timeZone" | "spaces" | "sessions"
  >,
): DraftPlan {
  return {
    title: event.title,
    date: event.date,
    timeZone: event.timeZone,
    complete: true,
    uncertainties: [],
    spaces: event.spaces.map((s) => ({
      key: s.id,
      existingId: s.id,
      label: s.label,
      capacity: s.capacity,
      removed: s.removed,
      evidence: s.evidence,
    })),
    sessions: event.sessions.map((s) => ({
      key: s.id,
      existingId: s.id,
      title: s.title,
      spaceKey: s.spaceId,
      start: s.start,
      end: s.end,
      capacity: s.capacity,
      removed: s.removed,
      evidence: s.evidence,
    })),
  };
}
