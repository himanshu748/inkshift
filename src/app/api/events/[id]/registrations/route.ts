import { NextRequest } from "next/server";
import { z } from "zod";
import {
  body,
  cookieOptions,
  errorResponse,
  json,
  participantCookie,
} from "@/lib/http";
import { AppError, cancelBooking, randomToken, register } from "@/lib/service";
import { getStore } from "@/lib/store";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const input = z
      .object({
        sessionId: z.string().min(1).max(80),
        name: z
          .string()
          .trim()
          .min(1, "Enter your name.")
          .max(40)
          .regex(/^[^\x00-\x1f]+$/, "Enter a valid name."),
      })
      .parse(await body(request));
    const token =
      request.cookies.get(participantCookie)?.value ?? randomToken();
    const result = await register(
      getStore(),
      id,
      token,
      input.name,
      input.sessionId,
    );
    const response = json({
      booking: {
        id: result.booking.id,
        sessionId: result.booking.sessionId,
        name: result.booking.name,
      },
      alreadyJoined: result.alreadyJoined,
    });
    response.cookies.set(participantCookie, token, cookieOptions);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const input = z
      .object({ bookingId: z.string().min(1).max(80) })
      .parse(await body(request));
    const token = request.cookies.get(participantCookie)?.value;
    if (!token)
      throw new AppError("Open this in the browser you used to join.", 403);
    await cancelBooking(getStore(), id, token, input.bookingId);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
