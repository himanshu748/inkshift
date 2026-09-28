import { writeFileSync } from "node:fs";
import { createClient } from "@sanity/client";

const token = process.env.SANITY_API_TOKEN || process.env.SANITY_AUTH_TOKEN;
if (!process.env.SANITY_PROJECT_ID || !token) {
  console.error(
    "Set SANITY_PROJECT_ID and SANITY_API_TOKEN (a server read token) in .env.local.",
  );
  process.exit(1);
}
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || "production",
  token,
  apiVersion: "2026-09-01",
  useCdn: false,
  perspective: "raw",
});

const queries = {
  events: `count(*[_type == "inkshiftEvent"])`,
  proposalStatuses: `*[_type == "inkshiftProposal"].status`,
  appliedWithoutAppliedVersion: `count(*[_type == "inkshiftProposal" && status == "applied" && !defined(appliedVersion)])`,
  appliedWithPlanBefore: `count(*[_type == "inkshiftProposal" && status == "applied" && defined(planBefore)])`,
  integrationCheckDocuments: `count(*[_type == "inkshiftCheck"])`,
  latestAppliedVsLive: `*[_type == "inkshiftEvent" && count(*[_type == "inkshiftProposal" && status == "applied" && eventId == ^.id]) > 0]{
  "live": { spaces, sessions },
  "applied": *[_type == "inkshiftProposal" && status == "applied" && eventId == ^.id]{
    appliedVersion, appliedAt, "spaces": preview.spaces, "sessions": preview.sessions
  }
}`,
};

// Same fields the time machine renders for a version (src/lib/timeline.ts).
const plan = ({ spaces = [], sessions = [] }) =>
  JSON.stringify({
    spaces: spaces
      .map(({ id, label, capacity, removed }) => ({
        id,
        label,
        capacity,
        removed: Boolean(removed),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    sessions: sessions
      .map(({ id, title, spaceId, start, end, capacity, removed }) => ({
        id,
        title,
        spaceId,
        start,
        end,
        capacity,
        removed: Boolean(removed),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });

// Mirrors frameOrder in src/lib/timeline.ts.
const order = (a, b) =>
  a.appliedVersion != null && b.appliedVersion != null
    ? a.appliedVersion - b.appliedVersion
    : (a.appliedAt ?? "").localeCompare(b.appliedAt ?? "");

const [events, statuses, missingVersion, withPlanBefore, checks, rows] =
  await Promise.all([
    client.fetch(queries.events),
    client.fetch(queries.proposalStatuses),
    client.fetch(queries.appliedWithoutAppliedVersion),
    client.fetch(queries.appliedWithPlanBefore),
    client.fetch(queries.integrationCheckDocuments),
    client.fetch(queries.latestAppliedVsLive),
  ]);

const byStatus = {};
for (const s of statuses) byStatus[s ?? "none"] = (byStatus[s ?? "none"] ?? 0) + 1;
const matches = rows.filter((row) => {
  const latest = [...row.applied].sort(order).at(-1);
  return plan(latest) === plan(row.live);
}).length;

const result = {
  checkedAt: new Date().toISOString(),
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || "production",
  note: "Aggregate counts only. No participant names, photos or document contents are recorded. The live-plan comparison uses the space and session fields the time machine renders, sorted by stable ID.",
  queries,
  results: {
    events,
    proposals: statuses.length,
    proposalsByStatus: byStatus,
    eventsWithAppliedProposal: rows.length,
    appliedWithoutAppliedVersion: missingVersion,
    appliedWithPlanBefore: withPlanBefore,
    latestAppliedPreviewMatchesLivePlan: matches,
    integrationCheckDocuments: checks,
  },
};
const out = process.argv[2];
if (out) writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result.results, null, 2));
