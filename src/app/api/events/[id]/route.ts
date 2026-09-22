import { NextRequest } from "next/server";
import {
  errorResponse,
  json,
  ownerCookie,
  participantCookie,
} from "@/lib/http";
import { isOwner, loadEvent, toView } from "@/lib/service";
import { getStore } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const store = getStore();
    const event = await loadEvent(store, id);
    return json(
      toView(
        event,
        isOwner(event, request.cookies.get(ownerCookie(id))?.value),
        request.cookies.get(participantCookie)?.value,
        store,
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
