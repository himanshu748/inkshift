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
import { draftSchema } from "@/lib/model";
import { ownedGatherings } from "@/lib/gatherings";
import { getStore } from "@/lib/store";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const capabilities = request.cookies
      .getAll()
      .filter(({ name }) => name.startsWith("inkshift_owner_"))
      .map(({ name, value }) => ({
        id: name.slice("inkshift_owner_".length),
        token: value,
      }));
    return json(await ownedGatherings(getStore(), capabilities));
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const input = z
      .object({
        mode: z.enum(["sample", "blank"]),
        title: draftSchema.shape.title.optional(),
        date: draftSchema.shape.date.default(() =>
          new Date().toISOString().slice(0, 10),
        ),
        timeZone: draftSchema.shape.timeZone.default("UTC"),
      })
      .parse(await body(request));
    await reserveDailyBudget("events");
    const { event, token } = await createEvent(
      getStore(),
      input.mode,
      input.date,
      input.timeZone,
      input.title,
    );
    const response = json({ id: event.id });
    response.cookies.set(ownerCookie(event.id), token, cookieOptions);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
