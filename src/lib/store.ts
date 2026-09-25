import "server-only";
import { createClient } from "@sanity/client";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Proposal, ReviewSummary } from "./model";
import type { TimelinePhoto, TimelineProposal } from "./timeline";

export type Document = {
  _id: string;
  _type: string;
  _rev?: string;
  [key: string]: unknown;
};
type Expected =
  { id: string; rev: string } | { id: string; rev: string }[] | null;
export class StaleWriteError extends Error {
  constructor() {
    super(
      "This plan changed while you were reviewing it. Refresh the proposal and review the current registrations.",
    );
  }
}
export type TimelineRecords = {
  proposals: TimelineProposal[];
  photos: TimelinePhoto[];
};
export interface Store {
  kind: "sanity" | "local";
  get<T>(id: string): Promise<T | null>;
  reviews(eventId: string): Promise<ReviewSummary[]>;
  timelineRecords(eventId: string): Promise<TimelineRecords>;
  transact(expected: Expected, documents: Document[]): Promise<void>;
}
const stripSystem = (doc: Document) =>
  Object.fromEntries(
    Object.entries(doc).filter(
      ([key]) => !["_rev", "_updatedAt", "_createdAt"].includes(key),
    ),
  );

class SanityStore implements Store {
  kind = "sanity" as const;
  private client = createClient({
    projectId: process.env.SANITY_PROJECT_ID!,
    dataset: process.env.SANITY_DATASET ?? "production",
    token: process.env.SANITY_API_TOKEN ?? process.env.SANITY_AUTH_TOKEN,
    apiVersion: "2026-09-01",
    useCdn: false,
    perspective: "raw",
  });
  async get<T>(id: string) {
    return ((await this.client.getDocument(id)) as T | undefined) ?? null;
  }
  async reviews(eventId: string) {
    return this.client.fetch<ReviewSummary[]>(
      '*[_type == "inkshiftProposal" && eventId == $eventId] | order(createdAt desc)[0...20]{id, source, status, createdAt, appliedAt, discardedAt}',
      { eventId },
    );
  }
  async timelineRecords(eventId: string) {
    return this.client.fetch<TimelineRecords>(
      `{
        "proposals": *[_type == "inkshiftProposal" && eventId == $eventId && status in ["applied", "discarded"]] | order(createdAt asc)[0...80]{id, status, source, photoId, baseVersion, createdAt, appliedAt, appliedVersion, discardedAt, planBefore, "preview": preview{spaces, sessions, changes, retainedBookings}},
        "photos": *[_type == "inkshiftPhoto" && eventId == $eventId]{id, samplePath, "stored": defined(dataUrl)}
      }`,
      { eventId },
    );
  }
  async transact(expected: Expected, documents: Document[]) {
    const guards = expected
      ? Array.isArray(expected)
        ? expected
        : [expected]
      : [];
    let tx = this.client.transaction();
    for (const doc of documents) {
      const clean = stripSystem(doc);
      const guard = guards.find((g) => g.id === doc._id);
      if (guard) {
        const values = Object.fromEntries(
          Object.entries(clean).filter(
            ([key]) => !["_id", "_type"].includes(key),
          ),
        );
        tx = tx.patch(doc._id, (patch) =>
          patch.ifRevisionId(guard.rev).set(values),
        );
      } else if (expected) tx = tx.createOrReplace(clean as Document);
      else tx = tx.create(clean as Document);
    }
    try {
      await tx.commit({ visibility: "sync" });
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 409)
        throw new StaleWriteError();
      throw error;
    }
  }
}

class LocalStore implements Store {
  kind = "local" as const;
  private async db() {
    const directory =
      process.env.INKSHIFT_DATA_DIR ?? join(process.cwd(), ".inkshift");
    mkdirSync(directory, { recursive: true });
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(join(directory, "events.sqlite"));
    db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, revision TEXT NOT NULL, body TEXT NOT NULL)",
    );
    return db;
  }
  async get<T>(id: string) {
    const db = await this.db();
    try {
      const row = db
        .prepare("SELECT body FROM documents WHERE id = ?")
        .get(id) as { body: string } | undefined;
      return row ? (JSON.parse(row.body) as T) : null;
    } finally {
      db.close();
    }
  }
  async reviews(eventId: string) {
    const db = await this.db();
    try {
      const rows = db
        .prepare(
          "SELECT body FROM documents WHERE json_extract(body, '$._type') = 'inkshiftProposal' AND json_extract(body, '$.eventId') = ? ORDER BY json_extract(body, '$.createdAt') DESC LIMIT 20",
        )
        .all(eventId) as { body: string }[];
      return rows.map(({ body }) => {
        const { id, source, status, createdAt, appliedAt, discardedAt } =
          JSON.parse(body) as Proposal;
        return { id, source, status, createdAt, appliedAt, discardedAt };
      });
    } finally {
      db.close();
    }
  }
  async timelineRecords(eventId: string) {
    const db = await this.db();
    try {
      const rows = (
        db
          .prepare(
            "SELECT body FROM documents WHERE json_extract(body, '$._type') IN ('inkshiftProposal', 'inkshiftPhoto') AND json_extract(body, '$.eventId') = ?",
          )
          .all(eventId) as { body: string }[]
      ).map(({ body }) => JSON.parse(body) as Document);
      return timelineFromDocuments(rows);
    } finally {
      db.close();
    }
  }
  async transact(expected: Expected, documents: Document[]) {
    const guards = expected
      ? Array.isArray(expected)
        ? expected
        : [expected]
      : [];
    const db = await this.db();
    try {
      db.exec("BEGIN IMMEDIATE");
      for (const guard of guards) {
        const row = db
          .prepare("SELECT revision FROM documents WHERE id = ?")
          .get(guard.id) as { revision: string } | undefined;
        if (row?.revision !== guard.rev) throw new StaleWriteError();
      }
      for (const doc of documents) {
        const rev = randomUUID();
        const body = JSON.stringify({ ...stripSystem(doc), _rev: rev });
        db.prepare(
          expected
            ? "INSERT INTO documents VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision, body=excluded.body"
            : "INSERT INTO documents VALUES (?, ?, ?)",
        ).run(doc._id, rev, body);
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    } finally {
      db.close();
    }
  }
}
export function timelineFromDocuments(docs: Document[]): TimelineRecords {
  const proposals = docs
    .filter(
      (d) =>
        d._type === "inkshiftProposal" &&
        (d.status === "applied" || d.status === "discarded"),
    )
    .map((d) => d as unknown as TimelineProposal)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const photos = docs
    .filter((d) => d._type === "inkshiftPhoto")
    .map((d) => ({
      id: String(d.id),
      ...(d.samplePath ? { samplePath: String(d.samplePath) } : {}),
      stored: Boolean(d.dataUrl),
    }));
  return { proposals, photos };
}
let cached: Store | undefined;
export function getStore(): Store {
  if (cached) return cached;
  if (
    process.env.SANITY_PROJECT_ID &&
    (process.env.SANITY_API_TOKEN || process.env.SANITY_AUTH_TOKEN)
  )
    cached = new SanityStore();
  else {
    if (process.env.VERCEL || process.env.INKSHIFT_REQUIRE_SANITY === "true")
      throw new Error(
        "Connect a Sanity project before deploying INKSHIFT. Local storage is only supported on your computer.",
      );
    cached = new LocalStore();
  }
  return cached;
}

export const ids = {
  event: (id: string) => `inkshift.event.${id}`,
  photo: (eventId: string, id: string) => `inkshift.photo.${eventId}.${id}`,
  proposal: (eventId: string, id: string) =>
    `inkshift.proposal.${eventId}.${id}`,
  public: (id: string) => `inkshift-public-${id}`,
};
