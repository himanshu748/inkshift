import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, loadEvent, requireOwner } from "./service";
import { getStore, StaleWriteError, type Document } from "./store";
import { RequestLimitError } from "./request-limit";

export const ownerCookie = (id: string) => `inkshift_owner_${id}`;
export const participantCookie = "inkshift_participant";
export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};
export function assertOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  try {
    const source = new URL(origin);
    const target = new URL(request.url);
    if (
      ["http:", "https:"].includes(source.protocol) &&
      (source.host === target.host || source.host === request.headers.get("host"))
    ) return;
  } catch {
    // Opaque and malformed origins must be rejected, not become server errors.
  }
  throw new AppError("This action must come from INKSHIFT.", 403);
}
export const MAX_REQUEST_BYTES = 2_000_000;
export async function body(request: NextRequest) {
  assertOrigin(request);
  const tooLarge = () => new AppError(
    "The request is too large. Choose a smaller photograph or plan.", 413,
  );
  if (Number(request.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES)
    throw tooLarge();
  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytes = 0;
  if (reader) {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_REQUEST_BYTES) {
          await reader.cancel();
          throw tooLarge();
        }
        chunks.push(decoder.decode(value, { stream: true }));
      }
      chunks.push(decoder.decode());
    } finally {
      reader.releaseLock();
    }
  }
  try {
    return JSON.parse(chunks.join(""));
  } catch {
    throw new AppError("The request could not be read. Try again.", 400);
  }
}
export async function ownerContext(request: NextRequest, id: string) {
  const store = getStore();
  const event = await loadEvent(store, id);
  requireOwner(event, request.cookies.get(ownerCookie(id))?.value);
  return { store, event };
}
export const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
export function errorResponse(error: unknown) {
  if (error instanceof RequestLimitError) {
    const response = json({ error: error.message, code: error.code }, error.status);
    response.headers.set("Retry-After", String(error.retryAfter));
    return response;
  }
  if (error instanceof AppError)
    return json({ error: error.message, code: error.code }, error.status);
  if (error instanceof StaleWriteError)
    return json({ error: error.message, code: "stale-review" }, 409);
  if (error instanceof ZodError)
    return json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 3)
          .join(" "),
        code: "invalid-input",
      },
      400,
    );
  console.error(
    "INKSHIFT operation failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return json(
    {
      error:
        "The plan could not be saved. Please try again. Existing registrations are unchanged.",
    },
    500,
  );
}
/** A persisted global daily cap also holds across serverless processes. */
export async function reserveDailyBudget(scope: "events" | "photos") {
  const store = getStore();
  const day = new Date().toISOString().slice(0, 10);
  const id = `inkshift.budget.${scope}.${day}`;
  const limit =
    scope === "photos"
      ? Number(process.env.INKSHIFT_DAILY_PHOTO_LIMIT ?? 40)
      : Number(process.env.INKSHIFT_DAILY_EVENT_LIMIT ?? 150);
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.get<Document>(id);
    if (Number(current?.count ?? 0) >= limit)
      throw new AppError(
        scope === "photos"
          ? "Today’s photo-reading limit has been reached. You can still enter or edit your plan by hand, or try a photo tomorrow."
          : "Today’s new-gathering limit has been reached. Your existing gatherings still work. Please try creating a gathering tomorrow.",
        429,
        "daily-limit",
      );
    const next: Document = {
      _id: id,
      _type: "inkshiftUsage",
      day,
      scope,
      count: Number(current?.count ?? 0) + 1,
    };
    try {
      await store.transact(current ? { id, rev: current._rev! } : null, [next]);
      return;
    } catch (error) {
      if (
        !(error instanceof StaleWriteError) &&
        !String(error).includes("UNIQUE constraint")
      )
        throw error;
    }
  }
  throw new AppError("INKSHIFT is busy. Try again in a moment.", 429);
}
