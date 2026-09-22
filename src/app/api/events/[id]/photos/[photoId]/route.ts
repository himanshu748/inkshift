import { NextRequest, NextResponse } from "next/server";
import { errorResponse, ownerContext } from "@/lib/http";
import { AppError } from "@/lib/service";
import type { PhotoRecord } from "@/lib/model";
import { ids } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  try {
    const { id, photoId } = await params;
    const { store } = await ownerContext(request, id);
    const photo = await store.get<PhotoRecord>(ids.photo(id, photoId));
    if (!photo || photo.eventId !== id)
      throw new AppError("Photograph not found.", 404);
    const [meta, value] = photo.dataUrl.split(",");
    return new NextResponse(Buffer.from(value, "base64"), {
      headers: {
        "content-type": meta.slice(5).split(";")[0],
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
