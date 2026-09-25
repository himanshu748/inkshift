import type {
  Booking,
  Change,
  EventRecord,
  Proposal,
  Session,
  Space,
  WorkflowStep,
} from "./model";
import { reconcile } from "./reconcile";
import { sampleDraft } from "./sample";

export type TimelineProposal = Pick<
  Proposal,
  | "id"
  | "status"
  | "source"
  | "photoId"
  | "baseVersion"
  | "createdAt"
  | "appliedAt"
  | "appliedVersion"
  | "discardedAt"
  | "planBefore"
> & {
  preview: Pick<
    Proposal["preview"],
    "spaces" | "sessions" | "changes" | "retainedBookings"
  >;
};
export type TimelinePhoto = {
  id: string;
  samplePath?: string;
  stored: boolean;
};
export type TimelineWorkflow =
  | { status: "tracked"; stage: string; steps: WorkflowStep[] }
  | { status: "unavailable" }
  | { status: "local" };
export type FramePhoto =
  { kind: "sample" | "private"; src: string } | { kind: "typed" | "missing" };
export type FrameSpace = Pick<Space, "id" | "label" | "capacity" | "removed">;
export type FrameSession = Pick<
  Session,
  "id" | "title" | "spaceId" | "start" | "end" | "capacity" | "removed"
>;
export type FrameToken = { id: string; initials: string; sessionId: string };
export type TimelineFrame = {
  version: number;
  proposalId?: string;
  eventRevision?: number;
  at: string;
  source: Proposal["source"] | "original";
  /** recorded: read from a stored record. reconstructed: derived from code. */
  basis: "recorded" | "reconstructed";
  photo: FramePhoto;
  spaces: FrameSpace[];
  sessions: FrameSession[];
  changes: string[];
  kept?: number;
  bookings: FrameToken[];
  workflow?: TimelineWorkflow;
};
export type DiscardedNote = {
  proposalId: string;
  source: Proposal["source"];
  at: string;
  changes: number;
  afterVersion: number;
};
export type Timeline = { frames: TimelineFrame[]; discarded: DiscardedNote[] };

const SAMPLE_FILES: Record<string, string> = {
  "sample-original": "original",
  "sample-remove-table": "table-removed",
  "sample-capacity": "capacity",
  "sample-rename": "renamed",
};

export const initials = (name: string) => name.slice(0, 2).toUpperCase();

const readable = (value?: string) => (value ?? "").replaceAll("\u2013", " to ");
export function describeChange(change: Change) {
  const before = readable(change.before);
  const after = readable(change.after);
  switch (change.kind) {
    case "move":
      return `${change.entity}: ${before} → ${after}`;
    case "rename":
      return `Renamed ${before} → ${after}`;
    case "capacity":
      return `${change.entity}: ${before} → ${after} places`;
    case "time":
      return `${change.entity}: ${before} → ${after}`;
    case "remove":
      return `Removed ${change.entity}`;
    case "add":
      return `Added ${change.entity}`;
    default:
      return `Event details: ${change.entity}`;
  }
}

function frameOrder(a: TimelineProposal, b: TimelineProposal) {
  if (a.appliedVersion != null && b.appliedVersion != null)
    return a.appliedVersion - b.appliedVersion;
  // Proposals applied before appliedVersion existed only carry a timestamp.
  return (a.appliedAt ?? "").localeCompare(b.appliedAt ?? "");
}

function photoFor(
  eventId: string,
  photoId: string | undefined,
  source: TimelineFrame["source"],
  photos: TimelinePhoto[],
): FramePhoto {
  if (photoId?.startsWith("sample-")) {
    const recorded = photos.find((p) => p.id === photoId)?.samplePath;
    return {
      kind: "sample",
      src: recorded ?? `/samples/${SAMPLE_FILES[photoId] ?? "original"}.svg`,
    };
  }
  if (!photoId) return { kind: source === "manual" ? "typed" : "missing" };
  if (!photos.find((p) => p.id === photoId)?.stored) return { kind: "missing" };
  return {
    kind: "private",
    src: `/api/events/${eventId}/photos/${encodeURIComponent(photoId)}`,
  };
}

function bookingsAt(bookings: Booking[], until?: string): FrameToken[] {
  return bookings
    .filter((b) =>
      until
        ? b.createdAt <= until && (!b.cancelledAt || b.cancelledAt > until)
        : !b.cancelledAt,
    )
    .map((b) => ({
      id: b.id,
      initials: initials(b.name),
      sessionId: b.sessionId,
    }));
}

const spacesOf = (spaces: Space[]): FrameSpace[] =>
  spaces.map(({ id, label, capacity, removed }) => ({
    id,
    label,
    capacity,
    removed,
  }));
const sessionsOf = (sessions: Session[]): FrameSession[] =>
  sessions.map(({ id, title, spaceId, start, end, capacity, removed }) => ({
    id,
    title,
    spaceId,
    start,
    end,
    capacity,
    removed,
  }));

/** What the prepared sample plan was at creation, rebuilt from the sample definition. */
export function sampleOriginal(event: EventRecord) {
  const empty: EventRecord = {
    ...event,
    version: 0,
    spaces: [],
    sessions: [],
    bookings: [],
  };
  return reconcile(
    empty,
    sampleDraft(event.date, event.timeZone),
    "sample-original",
  );
}

/**
 * Version 1 is the plan before the first applied proposal; each applied
 * proposal is one more version. Plans only change on apply, so an applied
 * proposal's preview is exactly the plan it produced.
 */
export function buildTimeline(
  event: EventRecord,
  proposals: TimelineProposal[],
  photos: TimelinePhoto[],
  workflows: Record<string, TimelineWorkflow> = {},
): Timeline {
  const applied = proposals
    .filter((p) => p.status === "applied" && p.appliedAt)
    .sort(frameOrder);
  const drafts: Omit<TimelineFrame, "version" | "bookings">[] = [];
  const first = applied[0];
  if (!first) {
    if (event.spaces.length || event.sessions.length)
      drafts.push({
        at: event.createdAt,
        source: "original",
        basis: "recorded",
        photo: photoFor(event.id, event.photoId, "original", photos),
        spaces: spacesOf(event.spaces),
        sessions: sessionsOf(event.sessions),
        changes: [],
      });
  } else if (first.planBefore) {
    if (first.planBefore.spaces.length || first.planBefore.sessions.length)
      drafts.push({
        at: event.createdAt,
        source: "original",
        basis: "recorded",
        photo: photoFor(event.id, first.planBefore.photoId, "original", photos),
        spaces: spacesOf(first.planBefore.spaces),
        sessions: sessionsOf(first.planBefore.sessions),
        changes: [],
      });
  } else if (event.sample) {
    const original = sampleOriginal(event);
    drafts.push({
      at: event.createdAt,
      source: "original",
      basis: "reconstructed",
      photo: photoFor(event.id, "sample-original", "original", photos),
      spaces: spacesOf(original.spaces),
      sessions: sessionsOf(original.sessions),
      changes: [],
    });
  }
  // A blank gathering has no tables until its first applied proposal.
  for (const proposal of applied)
    drafts.push({
      proposalId: proposal.id,
      eventRevision: proposal.appliedVersion,
      at: proposal.appliedAt!,
      source: proposal.source,
      basis: "recorded",
      photo: photoFor(event.id, proposal.photoId, proposal.source, photos),
      spaces: spacesOf(proposal.preview.spaces),
      sessions: sessionsOf(proposal.preview.sessions),
      changes: proposal.preview.changes.map(describeChange),
      kept: proposal.preview.retainedBookings,
      workflow: workflows[proposal.id],
    });
  const frames = drafts.map((frame, i) => ({
    ...frame,
    version: i + 1,
    bookings: bookingsAt(event.bookings, drafts[i + 1]?.at),
  }));
  const discarded = proposals
    .filter((p) => p.status === "discarded")
    .map((p) => {
      const at = p.discardedAt ?? p.createdAt;
      return {
        proposalId: p.id,
        source: p.source,
        at,
        changes: p.preview.changes.length,
        afterVersion: Math.max(
          1,
          frames.filter((f) =>
            f.eventRevision != null
              ? f.eventRevision <= p.baseVersion
              : f.at <= at,
          ).length,
        ),
      };
    })
    .sort((a, b) => a.at.localeCompare(b.at));
  return { frames, discarded };
}
