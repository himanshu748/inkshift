import { randomUUID } from "node:crypto";
import {
  StaleWriteError,
  timelineFromDocuments,
  type Document,
  type Store,
} from "../src/lib/store";
export class MemoryStore implements Store {
  kind = "local" as const;
  docs = new Map<string, Document>();
  async reviews() {
    return [];
  }
  async timelineRecords(eventId: string) {
    return timelineFromDocuments(
      [...this.docs.values()]
        .filter((d) => d.eventId === eventId)
        .map((d) => structuredClone(d)),
    );
  }
  async get<T>(id: string) {
    return structuredClone(this.docs.get(id) ?? null) as T | null;
  }
  async transact(expected: Parameters<Store["transact"]>[0], docs: Document[]) {
    const guards = expected
      ? Array.isArray(expected)
        ? expected
        : [expected]
      : [];
    for (const g of guards)
      if (this.docs.get(g.id)?._rev !== g.rev) throw new StaleWriteError();
    if (!expected && docs.some((d) => this.docs.has(d._id)))
      throw new StaleWriteError();
    for (const d of docs)
      this.docs.set(d._id, structuredClone({ ...d, _rev: randomUUID() }));
  }
}
