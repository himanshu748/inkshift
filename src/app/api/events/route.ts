import { NextRequest } from "next/server";
import { z } from "zod";
import {
  body,
  cookieOptions,
  errorResponse,
  json,
  ownerCookie,
  reserveDailyBudget,
} from "@/lib/http";
import { createEvent } from "@/lib/service";
import { getStore } from "@/lib/store";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const input = z
      .object({
        mode: z.enum(["sample", "blank"]),
        date: z.string().default("2026-09-27"),
        timeZone: z.string().default("UTC"),
      })
      .parse(await body(request));
    await reserveDailyBudget("events");
    const { event, token } = await createEvent(
      getStore(),
      input.mode,
      input.date,
      input.timeZone,
    );
    const response = json({ id: event.id });
    response.cookies.set(ownerCookie(event.id), token, cookieOptions);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
