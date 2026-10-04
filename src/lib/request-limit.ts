import "server-only";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { AppError } from "./service";

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
    super("Too many attempts. Please wait a minute and try again.", 429, "request-limit");
  }
}

/** Only Vercel's platform-supplied IP is trusted; local requests share a bucket.
 * This bounds bursts per process, not across serverless instances. Daily persisted
 * budgets remain the cross-instance protection for event creation and photos.
 */
export function reserveRequestBudget(request: Request, scope: Scope) {
  const forwarded = process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.trim()
    : undefined;
  const client = forwarded && isIP(forwarded) ? forwarded : "unknown";
  const key = `${scope}:${createHash("sha256").update(client).digest("hex")}`;
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
