import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { AppError } from "./service";
import { getStore, StaleWriteError, type Document, type Store } from "./store";

const localKey = randomBytes(32);
const policies = {
  restore: { limit: 10, windowMs: 60_000 },
  events: { limit: 5, windowMs: 60_000 },
  photos: { limit: 3, windowMs: 60_000 },
};
type Scope = keyof typeof policies;
type Bucket = { count: number; expires: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;
let nextCleanup = 0;

export class RequestLimitError extends AppError {
  constructor(public readonly retryAfter: number) {
    super("Too many attempts. Please wait and try again.", 429, "request-limit");
  }
}

/** Only Vercel's platform-supplied IP is trusted; local requests share a bucket.
 * This bounds bursts per process, not across serverless instances. Daily persisted
 * client allowances and global budgets provide cross-instance protection.
 */
export function reserveRequestBudget(request: Request, scope: Scope) {
  const key = `${scope}:${clientDigest(request, "burst")}`;
  const now = Date.now();
  if (now >= nextCleanup) {
    for (const [id, bucket] of buckets) {
      if (bucket.expires <= now) buckets.delete(id);
    }
    nextCleanup = now + 1000;
  }
  const policy = policies[scope];
  const saved = buckets.get(key);
  const current = saved && saved.expires > now ? saved : undefined;
  if (saved && !current) buckets.delete(key);
  if (current && current.count >= policy.limit)
    throw new RequestLimitError(Math.max(1, Math.ceil((current.expires - now) / 1000)));
  // Fail closed on capacity; evicting active clients would reset their limits.
  if (!current && buckets.size >= MAX_BUCKETS)
    throw new RequestLimitError(60);
  buckets.set(key, current
    ? { ...current, count: current.count + 1 }
    : { count: 1, expires: now + policy.windowMs });
}

/** Ignore client-controlled forwarding headers. URL normalizes IPv6 spelling. */
export function trustedClient(request: Request) {
  const value = process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.trim() : undefined;
  if (!value || !isIP(value) || value.includes("%")) return "unknown";
  if (isIP(value) === 4) return value;
  const normalized = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  // IPv4-mapped IPv6 and IPv4 refer to the same network client.
  const mapped = normalized.match(/^::ffff:([0-9a-f]+):([0-9a-f]+)$/);
  if (mapped) {
    const a = parseInt(mapped[1], 16), b = parseInt(mapped[2], 16);
    return `${a >>> 8}.${a & 255}.${b >>> 8}.${b & 255}`;
  }
  const [head, tail] = normalized.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = normalized.includes("::")
    ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
    : left;
  // Aggregate IPv6 privacy addresses on their /64 network, like shared IPv4 NAT.
  return `${groups.slice(0, 4).map(part => parseInt(part, 16).toString(16)).join(":")}::/64`;
}
function clientDigest(request: Request, namespace: string) {
  const secret = process.env.INKSHIFT_CLIENT_LIMIT_SECRET || process.env.SANITY_API_TOKEN || process.env.SANITY_AUTH_TOKEN;
  if (!secret && (process.env.NODE_ENV === "production" || process.env.VERCEL === "1"))
    throw new AppError("Client protection is not configured. Please try again later.", 503);
  return createHmac("sha256", secret || localKey)
    .update(`inkshift-client-limit-v1:${namespace}:${trustedClient(request)}`).digest("hex");
}
const clientLimits = { events: 10, photos: 6, joins: 60 };
const MAX_PERSISTED_CLIENTS = 2048;
type ClientUsage = Document & { day: string; clients: { key: string; count: number }[] };
/** Three reusable private documents, each capped at 2048 daily pseudonyms.
 * Reserve before global spend. Failed downstream attempts intentionally count.
 */
export async function reserveClientBudget(request: Request, scope: keyof typeof clientLimits, store: Store = getStore()) {
  const id = `inkshift.client-budget.${scope}`;
  for (let attempt = 0; attempt < 12; attempt++) {
    const current = await store.get<ClientUsage>(id);
    // Read the clock after I/O: a request suspended across midnight must never
    // replace a newer day's map with yesterday's allowance. CAS protects writes.
    const day = new Date().toISOString().slice(0, 10);
    if (current && current.day > day) continue;
    const key = clientDigest(request, `${scope}:${day}`);
    const clients = current?.day === day ? current.clients : [];
    const found = clients.find((entry) => entry.key === key);
    if ((found?.count ?? 0) >= clientLimits[scope] || (!found && clients.length >= MAX_PERSISTED_CLIENTS)) {
      const tomorrow = Date.parse(`${day}T00:00:00Z`) + 86_400_000;
      throw new RequestLimitError(Math.max(1, Math.ceil((tomorrow - Date.now()) / 1000)));
    }
    const next = found ? clients.map((entry) => entry.key === key ? { key, count: entry.count + 1 } : entry)
      : [...clients, { key, count: 1 }];
    try {
      await store.transact(current ? { id, rev: current._rev! } : null,
        [{ _id: id, _type: "inkshiftClientUsage", day, clients: next }]);
      return;
    } catch (error) {
      if (!(error instanceof StaleWriteError) && !String(error).includes("UNIQUE constraint")) throw error;
    }
  }
  throw new RequestLimitError(1);
}
