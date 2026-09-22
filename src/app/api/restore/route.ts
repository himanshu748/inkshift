import { NextRequest } from "next/server";
import { z } from "zod";
import {
  body,
  cookieOptions,
  errorResponse,
  json,
  ownerCookie,
} from "@/lib/http";
import { restoreOrganizerAccess } from "@/lib/gatherings";
import { getStore } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const { code } = z
      .object({ code: z.string().trim().max(150) })
      .parse(await body(request));
    const { id, token } = await restoreOrganizerAccess(getStore(), code);
    const response = json({ id });
    response.cookies.set(ownerCookie(id), token, cookieOptions);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
