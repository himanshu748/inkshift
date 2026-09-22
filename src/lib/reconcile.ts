import {
  activeBookings,
  minutes,
  overlaps,
  type Change,
  type Conflict,
  type DraftPlan,
  type EventRecord,
  type Preview,
  type Session,
  type Space,
} from "./model";

const normal = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Interpret evidence as a proposal. Only a caller's later explicit approval can commit it. */
export function reconcile(
  event: EventRecord,
  draft: DraftPlan,
  photoId: string,
): Preview {
  const conflicts: Conflict[] = [];
  const changes: Change[] = [];
  const spaces: Space[] = [];
  const sessions: Session[] = [];
  const spaceMap = new Map<string, string>();
  const usedSpaces = new Set<string>();
  const usedSessions = new Set<string>();
  const keys = new Set<string>();
  const freshId = (prefix: "space" | "session", index: number) => {
    const records = prefix === "space" ? event.spaces : event.sessions;
    const base = `${prefix}-${event.version + 1}-${index}`;
    let id = base;
    let suffix = 0;
    while (records.some((record) => record.id === id))
      id = `${base}-new-${++suffix}`;
    return id;
  };
  if (!draft.complete)
    conflicts.push({
      code: "partial-photo",
      message:
        "The whole plan is not visible. Retake the photograph, or confirm the complete plan in the editor.",
    });
  draft.uncertainties.forEach((message) =>
    conflicts.push({ code: "uncertain-reading", message }),
  );

  for (const [i, candidate] of draft.spaces.entries()) {
    if (keys.has(candidate.key))
      conflicts.push({
        code: "duplicate-key",
        message:
          "Two tables have the same source key. Give each table a unique key.",
      });
    keys.add(candidate.key);
    let previous = candidate.existingId
      ? event.spaces.find((s) => s.id === candidate.existingId)
      : undefined;
    if (candidate.existingId && !previous)
      conflicts.push({
        code: "unknown-identity",
        message: `The original table for ${candidate.label} no longer exists.`,
      });
    if (!previous && !candidate.existingId) {
      const exact = event.spaces.filter(
        (s) => normal(s.label) === normal(candidate.label),
      );
      if (exact.length === 1) previous = exact[0];
    }
    const id = previous?.id ?? freshId("space", i);
    if (usedSpaces.has(id))
      conflicts.push({
        code: "duplicate-identity",
        message: `Two table readings point to ${candidate.label}. Resolve their identities.`,
      });
    usedSpaces.add(id);
    spaceMap.set(candidate.key, id);
    spaces.push({
      id,
      label: candidate.label,
      capacity: candidate.capacity,
      removed: candidate.removed,
      evidence: candidate.evidence,
      photoId,
    });
  }
  // Absence is never a deletion: preserve unobserved entities and ask for explicit intent.
  for (const space of event.spaces)
    if (!usedSpaces.has(space.id)) {
      spaces.push({ ...space });
      if (!space.removed)
        conflicts.push({
          code: "missing-table",
          entityId: space.id,
          message: `${space.label} is missing from this reading. Add it back or explicitly mark it removed.`,
        });
    }
  keys.clear();
  for (const [i, candidate] of draft.sessions.entries()) {
    if (keys.has(candidate.key))
      conflicts.push({
        code: "duplicate-key",
        message: "Two sessions have the same source key.",
      });
    keys.add(candidate.key);
    let previous = candidate.existingId
      ? event.sessions.find((s) => s.id === candidate.existingId)
      : undefined;
    if (candidate.existingId && !previous)
      conflicts.push({
        code: "unknown-identity",
        message: `The original session for ${candidate.title} no longer exists.`,
      });
    if (!previous && !candidate.existingId) {
      const exact = event.sessions.filter(
        (s) =>
          normal(s.title) === normal(candidate.title) &&
          s.start === candidate.start &&
          s.end === candidate.end,
      );
      if (exact.length === 1) previous = exact[0];
      else if (exact.length > 1)
        conflicts.push({
          code: "ambiguous-identity",
          message: `There is more than one ${candidate.title}. Choose which original session this is.`,
        });
    }
    const id = previous?.id ?? freshId("session", i);
    if (usedSessions.has(id))
      conflicts.push({
        code: "duplicate-identity",
        message: `Two readings point to the same session: ${candidate.title}.`,
      });
    usedSessions.add(id);
    const spaceId = spaceMap.get(candidate.spaceKey);
    if (!spaceId)
      conflicts.push({
        code: "unknown-table",
        message: `Choose a table for ${candidate.title}.`,
        entityId: id,
      });
    sessions.push({
      id,
      title: candidate.title,
      spaceId: spaceId ?? candidate.spaceKey,
      start: candidate.start,
      end: candidate.end,
      capacity: candidate.capacity,
      removed: candidate.removed,
      evidence: candidate.evidence,
      photoId,
    });
  }
  for (const session of event.sessions)
    if (!usedSessions.has(session.id)) {
      sessions.push({ ...session });
      if (!session.removed)
        conflicts.push({
          code: "missing-session",
          entityId: session.id,
          message: `${session.title} was not matched. Choose its original identity or add it back; its bookings are preserved.`,
        });
    }

  // Relocate the same session, never merge its participants into a different game.
  for (const session of sessions.filter((s) => !s.removed)) {
    const space = spaces.find((s) => s.id === session.spaceId);
    if (space?.removed) {
      const required = Math.max(
        session.capacity,
        activeBookings(event, session.id).length,
      );
      const available = spaces
        .filter(
          (s) =>
            !s.removed &&
            s.capacity >= required &&
            !sessions.some(
              (other) =>
                other.id !== session.id &&
                !other.removed &&
                other.spaceId === s.id &&
                overlaps(other, session),
            ),
        )
        .sort(
          (a, b) => a.capacity - b.capacity || a.label.localeCompare(b.label),
        );
      if (available.length) session.spaceId = available[0].id;
      else
        conflicts.push({
          code: "no-relocation",
          entityId: session.id,
          message: `${session.title} needs a free table for ${required} from ${session.start}–${session.end}. No table fits. Add a table, change the time, or keep the original table.`,
        });
    }
  }
  for (const session of sessions) {
    const bookings = activeBookings(event, session.id).length;
    if (session.removed) {
      if (bookings)
        conflicts.push({
          code: "registered-session-removal",
          entityId: session.id,
          message: `${session.title} has ${bookings} registration${bookings === 1 ? "" : "s"}. Keep this session and move it instead.`,
        });
      continue;
    }
    const space = spaces.find((s) => s.id === session.spaceId);
    if (minutes(session.end) <= minutes(session.start))
      conflicts.push({
        code: "invalid-time",
        entityId: session.id,
        message: `${session.title} must end after it starts, on the same day.`,
      });
    if (bookings > session.capacity)
      conflicts.push({
        code: "capacity-below-bookings",
        entityId: session.id,
        message: `${session.title} already has ${bookings} people. Its limit cannot be reduced to ${session.capacity}.`,
      });
    if (space && session.capacity > space.capacity && !space.removed)
      conflicts.push({
        code: "table-too-small",
        entityId: session.id,
        message: `${space.label} seats ${space.capacity}, but ${session.title} allows ${session.capacity}.`,
      });
    for (const other of sessions)
      if (
        !other.removed &&
        other.id > session.id &&
        session.spaceId === other.spaceId &&
        overlaps(session, other)
      ) {
        conflicts.push({
          code: "table-overlap",
          entityId: session.id,
          message: `${session.title} and ${other.title} overlap at ${space?.label ?? "the same table"}.`,
        });
      }
  }
  // Re-timing also has to respect participants who joined multiple sessions.
  const active = activeBookings(event);
  for (let i = 0; i < active.length; i++)
    for (let j = i + 1; j < active.length; j++) {
      if (active[i].participantHash !== active[j].participantHash) continue;
      const a = sessions.find(
        (s) => s.id === active[i].sessionId && !s.removed,
      );
      const b = sessions.find(
        (s) => s.id === active[j].sessionId && !s.removed,
      );
      if (a && b && overlaps(a, b))
        conflicts.push({
          code: "participant-overlap",
          message: `A registered participant would be double-booked between ${a.title} and ${b.title}.`,
        });
    }
  for (const space of spaces) {
    const old = event.spaces.find((s) => s.id === space.id);
    const affected = active.filter(
      (b) =>
        event.sessions.find((s) => s.id === b.sessionId)?.spaceId === space.id,
    ).length;
    if (!old && !space.removed)
      changes.push({
        kind: "add",
        entity: space.label,
        entityId: space.id,
        detail: `Add ${space.label} with ${space.capacity} seats.`,
        affected: 0,
      });
    else if (old) {
      if (space.removed !== old.removed)
        changes.push({
          kind: space.removed ? "remove" : "add",
          entity: space.label,
          entityId: space.id,
          detail: `${space.removed ? "Remove" : "Restore"} ${space.label}.`,
          affected,
        });
      if (space.label !== old.label)
        changes.push({
          kind: "rename",
          entity: space.label,
          entityId: space.id,
          before: old.label,
          after: space.label,
          detail: `Rename ${old.label} to ${space.label}.`,
          affected,
        });
      if (space.capacity !== old.capacity)
        changes.push({
          kind: "capacity",
          entity: space.label,
          entityId: space.id,
          before: String(old.capacity),
          after: String(space.capacity),
          detail: `${space.label}: ${old.capacity} → ${space.capacity} seats.`,
          affected,
        });
    }
  }
  for (const session of sessions) {
    const old = event.sessions.find((s) => s.id === session.id);
    const affected = activeBookings(event, session.id).length;
    if (!old && !session.removed)
      changes.push({
        kind: "add",
        entity: session.title,
        entityId: session.id,
        detail: `Open ${session.title}, ${session.start}–${session.end}.`,
        affected: 0,
      });
    else if (old) {
      if (session.removed !== old.removed)
        changes.push({
          kind: session.removed ? "remove" : "add",
          entity: session.title,
          entityId: session.id,
          detail: `${session.removed ? "Remove" : "Restore"} ${session.title}.`,
          affected,
        });
      if (session.title !== old.title)
        changes.push({
          kind: "rename",
          entity: session.title,
          entityId: session.id,
          before: old.title,
          after: session.title,
          detail: `Rename ${old.title} to ${session.title}. Keep the same session.`,
          affected,
        });
      if (session.spaceId !== old.spaceId) {
        const before =
          event.spaces.find((s) => s.id === old.spaceId)?.label ?? old.spaceId;
        const after =
          spaces.find((s) => s.id === session.spaceId)?.label ??
          session.spaceId;
        changes.push({
          kind: "move",
          entity: session.title,
          entityId: session.id,
          before,
          after,
          detail: `Move ${session.title} from ${before} to ${after}. ${affected ? (affected === 1 ? "Keep the registration." : `Keep all ${affected} registrations.`) : "Keep the same session link."}`,
          affected,
        });
      }
      if (session.capacity !== old.capacity)
        changes.push({
          kind: "capacity",
          entity: session.title,
          entityId: session.id,
          before: String(old.capacity),
          after: String(session.capacity),
          detail: `${session.title}: ${old.capacity} → ${session.capacity} places.`,
          affected,
        });
      if (session.start !== old.start || session.end !== old.end)
        changes.push({
          kind: "time",
          entity: session.title,
          entityId: session.id,
          before: `${old.start}–${old.end}`,
          after: `${session.start}–${session.end}`,
          detail: `${session.title}: ${old.start}–${old.end} → ${session.start}–${session.end}.`,
          affected,
        });
    }
  }
  if (
    draft.title !== event.title ||
    draft.date !== event.date ||
    draft.timeZone !== event.timeZone
  )
    changes.push({
      kind: "event",
      entity: draft.title,
      entityId: event.id,
      detail: `Update the event to ${draft.title}, ${draft.date} (${draft.timeZone}).`,
      affected: active.length,
    });
  // Per-change counts overlap (a removed table and its moved game share people).
  const affected = active.filter((b) =>
    changes.some(
      (c) =>
        c.kind === "event" ||
        c.entityId === b.sessionId ||
        c.entityId ===
          event.sessions.find((s) => s.id === b.sessionId)?.spaceId,
    ),
  );
  return {
    spaces,
    sessions,
    changes,
    conflicts: [
      ...new Map(conflicts.map((c) => [c.code + c.message, c])).values(),
    ],
    retainedBookings: active.length,
    affectedRegistrations: affected.length,
  };
}
