import { NextRequest } from "next/server";
import {
  assertOrigin,
  errorResponse,
  json,
  ownerContext,
  ownerCookie,
} from "@/lib/http";
import { organizerAccessCode } from "@/lib/gatherings";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertOrigin(request);
    const { id } = await params;
    const { event } = await ownerContext(request, id);
    return json({
      code: organizerAccessCode(
        event,
        request.cookies.get(ownerCookie(id))?.value,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
