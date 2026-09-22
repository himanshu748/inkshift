import "server-only";
import { AppError, isOwner, loadEvent, requireOwner, validId } from "./service";
import { activeBookings, type EventRecord } from "./model";
import type { Store } from "./store";

export type GatheringSummary = {
  id: string;
  title: string;
  date: string;
  timeZone: string;
  sessions: number;
  people: number;
  sample: boolean;
  updatedAt: string;
};

/** Only capabilities supplied by this browser can discover a gathering. */
export async function ownedGatherings(
  store: Store,
  capabilities: { id: string; token: string }[],
): Promise<GatheringSummary[]> {
  const results = await Promise.all(
    capabilities
      .filter(({ id }) => validId(id))
      .slice(-30)
      .map(async ({ id, token }) => {
        let event: EventRecord;
        try {
          event = await loadEvent(store, id);
        } catch (error) {
          if (error instanceof AppError && error.status === 404) return null;
          throw error;
        }
        if (!isOwner(event, token)) return null;
        return {
          id: event.id,
          title: event.title,
          date: event.date,
          timeZone: event.timeZone,
          sessions: event.sessions.filter((session) => !session.removed).length,
          people: activeBookings(event).length,
          sample: event.sample,
          updatedAt: event.updatedAt,
        };
      }),
  );
  return results
    .filter((event): event is GatheringSummary => event !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** A bearer code is intentionally returned only to its authorized organizer. */
export function organizerAccessCode(
  event: EventRecord,
  token: string | undefined,
) {
  requireOwner(event, token);
  return `${event.id}.${token}`;
}

export async function restoreOrganizerAccess(store: Store, code: string) {
  const invalid = () =>
    new AppError(
      "That access code could not be verified. Copy the complete code and try again.",
      403,
      "invalid-access-code",
    );
  if (!/^[A-Za-z0-9_-]{1,80}\.[A-Za-z0-9_-]{43}$/.test(code)) throw invalid();
  const [id, token] = code.split(".");
  let event: EventRecord;
  try {
    event = await loadEvent(store, id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) throw invalid();
    throw error;
  }
  if (!isOwner(event, token)) throw invalid();
  return { id, token };
}
