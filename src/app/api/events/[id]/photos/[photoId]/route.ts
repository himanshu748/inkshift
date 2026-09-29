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
    const samples = new Set([
      "/samples/original.svg", "/samples/table-removed.svg",
      "/samples/capacity.svg", "/samples/renamed.svg",
    ]);
    if (photo.source === "sample" && photo.samplePath && samples.has(photo.samplePath)) {
      return new NextResponse(null, {
        status: 307,
        headers: { location: new URL(photo.samplePath, request.url).href, "cache-control": "private, no-store" },
      });
    }
    if (!photo.dataUrl || !/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(photo.dataUrl))
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
