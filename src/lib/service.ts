import "server-only";
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  activeBookings,
  draftSchema,
  overlaps,
  type DraftPlan,
  type EventRecord,
  type EventView,
  type PhotoRecord,
  type Proposal,
} from "./model";
import { reconcile } from "./reconcile";
import { ids, StaleWriteError, type Document, type Store } from "./store";
import { sampleDraft } from "./sample";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "invalid-request",
  ) {
    super(message);
  }
}
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");
export const validId = (id: string) => /^[a-zA-Z0-9_-]{1,80}$/.test(id);
export function isOwner(event: EventRecord, token?: string) {
  if (!token) return false;
  const a = Buffer.from(hash(token));
  const b = Buffer.from(event.ownerHash);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function requireOwner(event: EventRecord, token?: string) {
  if (!isOwner(event, token))
    throw new AppError(
      "Open this event in the browser where you created it to organize it.",
      403,
      "organizer-required",
    );
}
export async function loadEvent(store: Store, id: string) {
  if (!validId(id)) throw new AppError("Event not found.", 404);
  const event = await store.get<EventRecord>(ids.event(id));
  if (!event)
    throw new AppError(
      "This event could not be found. Check the link or start a new plan.",
      404,
    );
  return event;
}
export const visionAvailable = () =>
  Boolean(process.env.VISION_API_KEY || process.env.HF_TOKEN);

/** All identity-bearing documents are private sub-path IDs. Only this projection is public. */
export function projections(event: EventRecord): Document[] {
  const eventRef = { _type: "reference", _ref: event._id };
  const samplePhotos = [
    ...new Set(
      [
        event.photoId,
        ...event.spaces.map((s) => s.photoId),
        ...event.sessions.map((s) => s.photoId),
      ].filter((id): id is string => Boolean(id?.startsWith("sample-"))),
    ),
  ];
  const sampleFiles: Record<string, string> = {
    "sample-original": "original",
    "sample-remove-table": "table-removed",
    "sample-capacity": "capacity",
    "sample-rename": "renamed",
  };
  return [
    ...samplePhotos.map((id) => ({
      _id: ids.photo(event.id, id),
      _type: "inkshiftPhoto",
      id,
      eventId: event.id,
      source: "sample",
      label: "Prepared example sheet",
      samplePath: `/samples/${sampleFiles[id] ?? "original"}.svg`,
      createdAt: event.createdAt,
    })),
    {
      _id: ids.public(event.id),
      _type: "inkshiftPublicEvent",
      eventId: event.id,
      title: event.title,
      date: event.date,
      timeZone: event.timeZone,
      version: event.version,
      updatedAt: event.updatedAt,
      spaces: event.spaces
        .filter((s) => !s.removed)
        .map((s) => ({
          _key: s.id,
          id: s.id,
          label: s.label,
          capacity: s.capacity,
        })),
      sessions: event.sessions
        .filter((s) => !s.removed)
        .map((s) => ({
          _key: s.id,
          id: s.id,
          title: s.title,
          start: s.start,
          end: s.end,
          spaceId: s.spaceId,
          capacity: s.capacity,
          booked: activeBookings(event, s.id).length,
        })),
    },
    ...event.spaces.map((s) => ({
      _id: `inkshift.space.${event.id}.${s.id}`,
      _type: "inkshiftSpace",
      event: eventRef,
      ...s,
      ...(s.photoId
        ? {
            source: {
              _type: "reference",
              _ref: ids.photo(event.id, s.photoId),
            },
          }
        : {}),
    })),
    ...event.sessions.map((s) => ({
      _id: `inkshift.session.${event.id}.${s.id}`,
      _type: "inkshiftSession",
      event: eventRef,
      ...s,
      space: {
        _type: "reference",
        _ref: `inkshift.space.${event.id}.${s.spaceId}`,
      },
      ...(s.photoId
        ? {
            source: {
              _type: "reference",
              _ref: ids.photo(event.id, s.photoId),
            },
          }
        : {}),
    })),
    ...event.bookings.map((b) => ({
      _id: `inkshift.registration.${event.id}.${b.id}`,
      _type: "inkshiftRegistration",
      event: eventRef,
      ...b,
      session: {
        _type: "reference",
        _ref: `inkshift.session.${event.id}.${b.sessionId}`,
      },
    })),
  ];
}
export async function createEvent(
  store: Store,
  mode: "sample" | "blank",
  date: string,
  timeZone: string,
  title?: string,
) {
  const id = randomBytes(10).toString("base64url");
  const token = randomToken();
  const now = new Date().toISOString();
  const draft = draftSchema.parse(sampleDraft(date, timeZone));
  const event: EventRecord = {
    _id: ids.event(id),
    _type: "inkshiftEvent",
    id,
    title: title
      ? draftSchema.shape.title.parse(title)
      : mode === "sample"
        ? draft.title
        : "Untitled gathering",
    date,
    timeZone,
    version: 0,
    ownerHash: hash(token),
    spaces: [],
    sessions: [],
    bookings: [],
    createdAt: now,
    updatedAt: now,
    history: [],
    sample: mode === "sample",
  };
  if (mode === "sample") {
    const preview = reconcile(event, draft, "sample-original");
    event.spaces = preview.spaces;
    event.sessions = preview.sessions;
    event.photoId = "sample-original";
  }
  event.history.push({
    id: randomUUID(),
    at: now,
    action: mode === "sample" ? "Sample event opened" : "Event created",
    detail:
      mode === "sample"
        ? "An example plan, ready for real registrations in your own event."
        : "Ready for the first photograph.",
    version: 0,
  });
  await store.transact(null, [
    event as unknown as Document,
    ...projections(event),
  ]);
  return { event, token };
}
export function toView(
  event: EventRecord,
  owner: boolean,
  participantToken: string | undefined,
  store: Store,
): EventView {
  const active = activeBookings(event);
  const participantHash = participantToken ? hash(participantToken) : "";
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    timeZone: event.timeZone,
    version: event.version,
    sample: event.sample,
    spaces: event.spaces.map((s) =>
      owner
        ? s
        : {
            ...s,
            evidence: { text: "", box: [0, 0, 0, 0] },
            photoId: undefined,
          },
    ),
    sessions: event.sessions
      .filter((s) => !s.removed)
      .map((s) => ({
        ...s,
        ...(owner
          ? {}
          : {
              evidence: {
                text: "",
                box: [0, 0, 0, 0] as [number, number, number, number],
              },
              photoId: undefined,
            }),
        booked: active.filter((b) => b.sessionId === s.id).length,
        spaceLabel:
          event.spaces.find((t) => t.id === s.spaceId)?.label ?? "Unassigned",
      })),
    totalBookings: active.length,
    myBookings: active
      .filter((b) => b.participantHash === participantHash)
      .map(({ id, sessionId, name }) => ({ id, sessionId, name })),
    ...(owner
      ? {
          bookings: active.map((b) => ({
            id: b.id,
            sessionId: b.sessionId,
            name: b.name,
            createdAt: b.createdAt,
          })),
          photoId: event.photoId,
        }
      : {}),
    history: owner
      ? event.history
      : event.history
          .filter((h) => h.action === "Paper changes applied")
          .map((h) => ({
            ...h,
            detail:
              "The organizer updated the plan. Check your session details.",
          })),
    role: owner ? "organizer" : "participant",
    storage: store.kind,
    ...(store.kind === "sanity"
      ? { projectId: process.env.SANITY_PROJECT_ID }
      : {}),
    visionAvailable: visionAvailable(),
  };
}
export async function makeProposal(
  store: Store,
  event: EventRecord,
  draft: DraftPlan,
  photoId: string,
  source: Proposal["source"],
  model?: string,
): Promise<Proposal> {
  const id = randomBytes(10).toString("base64url");
  const proposal: Proposal = {
    _id: ids.proposal(event.id, id),
    _type: "inkshiftProposal",
    id,
    eventId: event.id,
    baseVersion: event.version,
    draft,
    preview: reconcile(event, draft, photoId),
    photoId,
    source,
    ...(model ? { model } : {}),
    status: "review",
    createdAt: new Date().toISOString(),
  };
  await store.transact(null, [proposal as unknown as Document]);
  return proposal;
}
export async function getProposal(
  store: Store,
  eventId: string,
  proposalId: string,
) {
  if (!validId(proposalId)) throw new AppError("Review not found.", 404);
  const proposal = await store.get<Proposal>(ids.proposal(eventId, proposalId));
  if (!proposal || proposal.eventId !== eventId)
    throw new AppError("Review not found.", 404);
  return proposal;
}
export async function reviseProposal(
  store: Store,
  event: EventRecord,
  proposal: Proposal,
  draft: DraftPlan,
) {
  if (proposal.status !== "review")
    throw new AppError(
      `These changes were already ${proposal.status}. Take another photograph to make a new change.`,
      409,
    );
  const next = {
    ...proposal,
    draft,
    baseVersion: event.version,
    preview: reconcile(event, draft, proposal.photoId),
  };
  await store.transact({ id: proposal._id, rev: proposal._rev! }, [
    next as unknown as Document,
  ]);
  return next;
}
export async function applyProposal(
  store: Store,
  event: EventRecord,
  proposal: Proposal,
  reviewedVersion: number,
) {
  if (proposal.status !== "review")
    throw new AppError(`This proposal was already ${proposal.status}.`, 409);
  if (
    event.version !== proposal.baseVersion ||
    reviewedVersion !== event.version
  )
    throw new StaleWriteError();
  const preview = reconcile(event, proposal.draft, proposal.photoId);
  if (preview.conflicts.length)
    throw new AppError(
      preview.conflicts[0].message,
      422,
      "unresolved-conflicts",
    );
  const at = new Date().toISOString();
  const version = event.version + 1;
  const next: EventRecord = {
    ...event,
    title: proposal.draft.title,
    date: proposal.draft.date,
    timeZone: proposal.draft.timeZone,
    spaces: preview.spaces,
    sessions: preview.sessions,
    photoId: proposal.photoId,
    version,
    updatedAt: at,
    history: [
      {
        id: randomUUID(),
        at,
        action: "Paper changes applied",
        detail: `${preview.changes.length} change${preview.changes.length === 1 ? "" : "s"}. ${preview.retainedBookings} registration${preview.retainedBookings === 1 ? "" : "s"} preserved.`,
        version,
      },
      ...event.history,
    ].slice(0, 60),
  };
  await store.transact(
    [
      { id: event._id, rev: event._rev! },
      { id: proposal._id, rev: proposal._rev! },
    ],
    [
      next as unknown as Document,
      ...projections(next),
      {
        ...proposal,
        status: "applied",
        appliedAt: at,
        appliedVersion: version,
        planBefore: {
          ...(event.photoId ? { photoId: event.photoId } : {}),
          spaces: event.spaces,
          sessions: event.sessions,
        },
      } as unknown as Document,
    ],
  );
  return next;
}
export async function discardProposal(store: Store, proposal: Proposal) {
  if (proposal.status === "discarded") return proposal;
  if (proposal.status !== "review")
    throw new AppError("These changes were already applied.", 409);
  const next: Proposal = {
    ...proposal,
    status: "discarded",
    discardedAt: new Date().toISOString(),
  };
  await store.transact({ id: proposal._id, rev: proposal._rev! }, [
    next as unknown as Document,
  ]);
  return next;
}
export async function register(
  store: Store,
  eventId: string,
  participantToken: string,
  name: string,
  sessionId: string,
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const event = await loadEvent(store, eventId);
    const session = event.sessions.find(
      (s) => s.id === sessionId && !s.removed,
    );
    if (!session || event.spaces.find((s) => s.id === session.spaceId)?.removed)
      throw new AppError("This session is no longer available.", 409);
    const participantHash = hash(participantToken);
    const active = activeBookings(event);
    const existing = active.find(
      (b) => b.sessionId === sessionId && b.participantHash === participantHash,
    );
    if (existing) return { event, booking: existing, alreadyJoined: true };
    if (
      active.filter((b) => b.sessionId === sessionId).length >= session.capacity
    )
      throw new AppError(
        "That session just filled up. Choose another session.",
        409,
        "session-full",
      );
    if (
      active
        .filter((b) => b.participantHash === participantHash)
        .some((b) => {
          const other = event.sessions.find((s) => s.id === b.sessionId);
          return other && overlaps(session, other);
        })
    )
      throw new AppError(
        "You already joined a session at this time. Leave it first, or choose a later session.",
        409,
        "time-overlap",
      );
    if (active.length >= 300)
      throw new AppError(
        "This event has reached its 300-registration limit.",
        409,
      );
    const at = new Date().toISOString();
    const booking = {
      id: randomBytes(12).toString("base64url"),
      sessionId,
      name,
      participantHash,
      createdAt: at,
    };
    const next = {
      ...event,
      bookings: [...event.bookings, booking],
      version: event.version + 1,
      updatedAt: at,
    };
    try {
      await store.transact({ id: event._id, rev: event._rev! }, [
        next as unknown as Document,
        ...projections(next),
      ]);
      return { event: next, booking, alreadyJoined: false };
    } catch (error) {
      if (!(error instanceof StaleWriteError)) throw error;
    }
  }
  throw new AppError(
    "Several people joined at once. Please try again; your place has not been booked.",
    409,
    "busy",
  );
}
export async function cancelBooking(
  store: Store,
  eventId: string,
  participantToken: string,
  bookingId: string,
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const event = await loadEvent(store, eventId);
    const participantHash = hash(participantToken);
    const booking = event.bookings.find(
      (b) => b.id === bookingId && b.participantHash === participantHash,
    );
    if (!booking)
      throw new AppError("This registration belongs to another browser.", 403);
    if (booking.cancelledAt) return event;
    const at = new Date().toISOString();
    const next = {
      ...event,
      bookings: event.bookings.map((b) =>
        b.id === bookingId ? { ...b, cancelledAt: at } : b,
      ),
      version: event.version + 1,
      updatedAt: at,
    };
    try {
      await store.transact({ id: event._id, rev: event._rev! }, [
        next as unknown as Document,
        ...projections(next),
      ]);
      return next;
    } catch (error) {
      if (!(error instanceof StaleWriteError)) throw error;
    }
  }
  throw new AppError("The event is busy. Try leaving the session again.", 409);
}
export async function savePhoto(
  store: Store,
  eventId: string,
  dataUrl: string,
  label: string,
  source: PhotoRecord["source"],
) {
  if (
    !/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(dataUrl) ||
    dataUrl.length > 1_800_000
  )
    throw new AppError(
      "Use a JPEG, PNG, or WebP image under 1.3 MB after resizing.",
      413,
    );
  const id = randomBytes(12).toString("base64url");
  const photo: PhotoRecord = {
    _id: ids.photo(eventId, id),
    _type: "inkshiftPhoto",
    id,
    eventId,
    dataUrl,
    label,
    source,
    createdAt: new Date().toISOString(),
  };
  await store.transact(null, [photo as unknown as Document]);
  return photo;
}
