import "server-only";
import type { SanityClient } from "@sanity/client";
import type { EventRecord } from "./model";
import { projections, validId } from "./service";
import { ids } from "./store";

type LegacyProjection = { _id: string; _rev: string; eventId?: string; version?: number };
const prefix = "inkshift-public-";
const safeId = /^inkshift-public-[a-f0-9]{64}$/;

/** Dry-run by default. No invite IDs or document bodies are returned in the report. */
export async function migratePublicProjections(
  client: SanityClient,
  { apply = false, limit = 200 }: { apply?: boolean; limit?: number } = {},
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000)
    throw new Error("Migration limit must be from 1 through 1000.");
  const report = { dryRun: !apply, scanned: 0, eligible: 0, migrated: 0, skipped: 0, conflicts: 0, reachedLimit: false };
  let cursor = "";
  while (report.scanned < limit) {
    const page = await client.fetch<LegacyProjection[]>(
      '*[_type == "inkshiftPublicEvent" && (defined(eventId) || length(_id) != 80) && _id > $cursor] | order(_id asc)[0...50]{_id,_rev,eventId,version}',
      { cursor },
    );
    if (!page.length) break;
    for (const legacy of page) {
      if (report.scanned === limit) break;
      if (legacy._id <= cursor) throw new Error("Migration pagination did not advance.");
      cursor = legacy._id;
      report.scanned++;
      const eventId = legacy.eventId ?? (!safeId.test(legacy._id) && legacy._id.startsWith(prefix) ? legacy._id.slice(prefix.length) : undefined);
      if (!eventId || !validId(eventId) || !legacy._rev ||
        ![prefix + eventId, ids.public(eventId)].includes(legacy._id)) {
        report.skipped++;
        continue;
      }
      const event = await client.getDocument<EventRecord>(ids.event(eventId));
      if (!event || event.id !== eventId || event._type !== "inkshiftEvent" || !event._rev) {
        report.skipped++;
        continue;
      }
      const projection = projections(event).find((doc) => doc._type === "inkshiftPublicEvent")!;
      report.eligible++;
      if (!apply) continue;
      // Guard both inputs before replacing public data. A concurrent registration
      // or plan edit cannot be overwritten with the snapshot read above.
      let tx = client.transaction()
        .patch(event._id, (patch) => patch.ifRevisionId(event._rev!).set({ version: event.version }))
        .patch(legacy._id, (patch) => patch.ifRevisionId(legacy._rev).set({ version: legacy.version ?? event.version }))
        .createOrReplace(projection);
      if (legacy._id !== projection._id) tx = tx.delete(legacy._id);
      try {
        await tx.commit({ visibility: "sync" });
        report.migrated++;
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode === 409) report.conflicts++;
        else throw new Error("Public projection migration failed; no document contents were logged.");
      }
    }
    if (page.length < 50) break;
  }
  report.reachedLimit = report.scanned === limit;
  return report;
}
