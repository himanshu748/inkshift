import { describe, expect, it } from "vitest";
import { MemoryStore } from "./memory-store";
import { createEvent } from "../src/lib/service";
import {
  ownedGatherings,
  organizerAccessCode,
  restoreOrganizerAccess,
} from "../src/lib/gatherings";

describe("organizer continuity", () => {
  it("creates an empty gathering with the organizer's own details", async () => {
    const { event } = await createEvent(
      new MemoryStore(),
      "blank",
      "2026-10-03",
      "Europe/London",
      "Saturday workshops",
    );
    expect(event.title).toBe("Saturday workshops");
    expect(event.sample).toBe(false);
    expect(event.sessions).toHaveLength(0);
    expect(event.timeZone).toBe("Europe/London");
  });
  it("only lists gatherings for valid capabilities and omits private fields", async () => {
    const store = new MemoryStore();
    const own = await createEvent(store, "sample", "2026-10-03", "UTC");
    const other = await createEvent(store, "sample", "2026-10-03", "UTC");
    const list = await ownedGatherings(store, [
      { id: own.event.id, token: own.token },
      { id: other.event.id, token: own.token },
      { id: "missing", token: own.token },
    ]);
    expect(list.map((event) => event.id)).toEqual([own.event.id]);
    expect(list[0]).not.toHaveProperty("ownerHash");
    expect(list[0]).not.toHaveProperty("bookings");
  });
  it("requires organizer access before exporting a recovery code", async () => {
    const { event } = await createEvent(
      new MemoryStore(),
      "blank",
      "2026-10-03",
      "UTC",
    );
    expect(() => organizerAccessCode(event, undefined)).toThrow();
    expect(() => organizerAccessCode(event, "wrong")).toThrow();
  });
  it("restores the exact capability without changing the event or registrations", async () => {
    const store = new MemoryStore();
    const { event, token } = await createEvent(
      store,
      "sample",
      "2026-10-03",
      "UTC",
    );
    const before = await store.get(event._id);
    expect(
      await restoreOrganizerAccess(store, organizerAccessCode(event, token)),
    ).toEqual({ id: event.id, token });
    expect(await store.get(event._id)).toEqual(before);
  });
  it("rejects altered and unknown recovery codes with the same message", async () => {
    const store = new MemoryStore();
    const { event } = await createEvent(store, "blank", "2026-10-03", "UTC");
    const message = "That access code could not be verified";
    await expect(
      restoreOrganizerAccess(store, `${event.id}.${"a".repeat(43)}`),
    ).rejects.toThrow(message);
    await expect(
      restoreOrganizerAccess(store, `unknown.${"a".repeat(43)}`),
    ).rejects.toThrow(message);
    await expect(restoreOrganizerAccess(store, "not-a-code")).rejects.toThrow(
      message,
    );
  });
  it("reports a storage outage rather than showing an empty list", async () => {
    const store = new MemoryStore();
    store.get = async () => {
      throw new Error("unavailable");
    };
    await expect(
      ownedGatherings(store, [{ id: "existing", token: "token" }]),
    ).rejects.toThrow("unavailable");
  });
});
