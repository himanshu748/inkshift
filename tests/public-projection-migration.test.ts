import { describe, expect, it, vi } from "vitest";
import type { SanityClient } from "@sanity/client";
import { createEvent, loadEvent } from "../src/lib/service";
import { ids, type Document } from "../src/lib/store";
import { migratePublicProjections } from "../src/lib/public-projection-migration";
import { MemoryStore } from "./memory-store";

async function setup() {
  const store = new MemoryStore();
  const created = await createEvent(store, "sample", "2026-09-27", "UTC");
  const event = await loadEvent(store, created.event.id);
  const oldId = `inkshift-public-${event.id}`;
  const docs = new Map<string, Document>([[event._id, event as unknown as Document], [oldId, {
    _id: oldId, _type: "inkshiftPublicEvent", _rev: "legacy-rev", eventId: event.id, version: event.version,
  }]]);
  const guards: { id: string; rev?: string }[] = [];
  const ops: string[] = [];
  const client = {
    fetch: vi.fn(async (_query: string, { cursor }: { cursor: string }) => [...docs.values()].filter((d) => d._type === "inkshiftPublicEvent" && d._id > cursor && (d.eventId !== undefined || d._id.length !== 80)).sort((a, b) => a._id < b._id ? -1 : 1).slice(0, 50)),
    getDocument: vi.fn(async (id: string) => docs.get(id)),
    transaction: vi.fn(() => {
      let replacement: Document;
      let deleted: string;
      const tx = {
        patch(id: string, configure: (patch: unknown) => unknown) {
          const guard = { id, rev: undefined as string | undefined };
          const patch = { ifRevisionId(rev: string) { guard.rev = rev; return patch; }, set() { return patch; } };
          configure(patch); guards.push(guard); return tx;
        },
        createOrReplace(doc: Document) { replacement = doc; ops.push("create"); return tx; },
        delete(id: string) { deleted = id; ops.push("delete"); return tx; },
        async commit() {
          for (const guard of guards) if (docs.get(guard.id)?._rev !== guard.rev) throw { statusCode: 409 };
          docs.set(replacement._id, replacement); if (deleted) docs.delete(deleted);
        },
      };
      return tx;
    }),
  };
  return { client, docs, guards, ops, event, oldId };
}
describe("public projection migration", () => {
  it("defaults to a bounded dry run without mutating legacy documents", async () => {
    const { client, docs, event, oldId } = await setup();
    const report = await migratePublicProjections(client as unknown as SanityClient);
    expect(report).toMatchObject({ dryRun: true, eligible: 1, migrated: 0 });
    expect(client.transaction).not.toHaveBeenCalled();
    expect(docs.has(oldId)).toBe(true);
    expect(JSON.stringify(report)).not.toContain(event.id);
  });
  it("guards both revisions, replaces before deletion atomically, and is idempotent", async () => {
    const { client, docs, event, oldId, guards, ops } = await setup();
    const report = await migratePublicProjections(client as unknown as SanityClient, { apply: true });
    expect(report.migrated).toBe(1);
    expect(guards).toEqual([{ id: event._id, rev: event._rev }, { id: oldId, rev: "legacy-rev" }]);
    expect(ops).toEqual(["create", "delete"]);
    expect(docs.has(oldId)).toBe(false);
    expect(JSON.stringify(docs.get(ids.public(event.id)))).not.toContain(event.id);
    expect((await migratePublicProjections(client as unknown as SanityClient, { apply: true })).scanned).toBe(0);
    expect(client.transaction).toHaveBeenCalledTimes(1);
  });
  it("skips missing private events instead of deleting their only projection", async () => {
    const { client, docs, event, oldId } = await setup();
    docs.delete(event._id);
    const report = await migratePublicProjections(client as unknown as SanityClient, { apply: true });
    expect(report.skipped).toBe(1);
    expect(docs.has(oldId)).toBe(true);
    expect(client.transaction).not.toHaveBeenCalled();
  });
});
