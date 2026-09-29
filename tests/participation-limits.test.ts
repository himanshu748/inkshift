import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelBooking, createEvent, hash, loadEvent, register, REGISTRATION_HISTORY_LIMIT, PARTICIPANT_JOIN_WINDOW_MS } from "../src/lib/service";
import { ids, type Document } from "../src/lib/store";
import { MemoryStore } from "./memory-store";

async function setup(history = 0, active = false) {
  const store = new MemoryStore();
  const created = await createEvent(store, "sample", "2026-09-27", "UTC");
  let event = await loadEvent(store, created.event.id);
  if (history) {
    event.bookings = Array.from({ length: history }, (_, index) => ({
      id: `old-${index}`, sessionId: event.sessions[0].id, name: "Guest",
      participantHash: hash(index === history - 1 ? "owner" : `old-${index}`),
      createdAt: "2026-01-01T00:00:00.000Z",
      ...(active && index === history - 1 ? {} : { cancelledAt: "2026-01-01T00:01:00.000Z" }),
    }));
    await store.transact({ id: event._id, rev: event._rev! }, [event as unknown as Document]);
    event = await loadEvent(store, event.id);
  }
  return { store, event, session: event.sessions[0].id };
}

afterEach(() => vi.useRealTimers());

describe("bounded registration history", () => {
  it("blocks new joins at the lifetime limit but permits idempotent joins and cancellation", async () => {
    const { store, event, session } = await setup(REGISTRATION_HISTORY_LIMIT, true);
    const duplicate = await register(store, event.id, "owner", "Guest", session);
    expect(duplicate.alreadyJoined).toBe(true);
    await expect(register(store, event.id, "new", "Guest", session)).rejects.toMatchObject({ code: "registration-history-limit", status: 429 });
    await cancelBooking(store, event.id, "owner", duplicate.booking.id);
    expect((await loadEvent(store, event.id)).bookings).toHaveLength(REGISTRATION_HISTORY_LIMIT);
    expect((await loadEvent(store, event.id)).bookings.at(-1)?.cancelledAt).toBeTruthy();
    await expect(register(store, event.id, "new", "Guest", session)).rejects.toMatchObject({ code: "registration-history-limit" });
  });

  it("enforces the lifetime limit after a concurrent join wins the final history slot", async () => {
    const { store, event, session } = await setup(REGISTRATION_HISTORY_LIMIT - 1);
    const results = await Promise.allSettled([
      register(store, event.id, "first", "First", session),
      register(store, event.id, "second", "Second", session),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(failed.reason.code).toBe("registration-history-limit");
    expect((await loadEvent(store, event.id)).bookings).toHaveLength(REGISTRATION_HISTORY_LIMIT);
  });

  it("throttles repeated join/cancel cycles while allowing cancellation and later recovery", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-29T12:00:00Z"));
    const { store, event, session } = await setup();
    for (let index = 0; index < 20; index++) {
      const joined = await register(store, event.id, "guest", "Guest", session);
      if (index === 19) {
        expect((await register(store, event.id, "guest", "Guest", session)).alreadyJoined).toBe(true);
      }
      await cancelBooking(store, event.id, "guest", joined.booking.id);
    }
    await expect(register(store, event.id, "guest", "Guest", session)).rejects.toMatchObject({ status: 429, code: "join-rate-limit" });
    expect((await loadEvent(store, event.id)).bookings).toHaveLength(20);
    vi.setSystemTime(Date.now() + PARTICIPANT_JOIN_WINDOW_MS + 1);
    await expect(register(store, event.id, "guest", "Guest", session)).resolves.toMatchObject({ alreadyJoined: false });
  });

  it("writes only the aggregate, public counts and changed booking on joins and cancellations", async () => {
    const { store, event, session } = await setup();
    const first = await register(store, event.id, "first", "First", session);
    const priorBookingId = `inkshift.registration.${event.id}.${first.booking.id}`;
    const priorBooking = await store.get(priorBookingId);
    const sessionId = `inkshift.session.${event.id}.${session}`;
    const sessionRecord = await store.get(sessionId);
    const transaction = vi.spyOn(store, "transact");
    const second = await register(store, event.id, "second", "Second", session);
    const changedBookingId = `inkshift.registration.${event.id}.${second.booking.id}`;
    const expectedIds = [event._id, ids.public(event.id), changedBookingId].sort();
    expect(transaction.mock.calls.at(-1)?.[1].map((d) => d._id).sort()).toEqual(expectedIds);
    await cancelBooking(store, event.id, "second", second.booking.id);
    expect(transaction.mock.calls.at(-1)?.[1].map((d) => d._id).sort()).toEqual(expectedIds);
    expect(await store.get(priorBookingId)).toEqual(priorBooking);
    expect(await store.get(sessionId)).toEqual(sessionRecord);
    const publicEvent = await store.get<Document>(ids.public(event.id));
    expect((publicEvent?.sessions as { booked: number }[])[0].booked).toBe(1);
    expect((await loadEvent(store, event.id)).bookings).toHaveLength(2);
  });
});
