import { NextRequest } from "next/server";
import { z } from "zod";
import {
  body,
  errorResponse,
  json,
  ownerContext,
  reserveDailyBudget,
} from "@/lib/http";
import type { PhotoRecord } from "@/lib/model";
import { ids } from "@/lib/store";
import {
  makeProposal,
  savePhoto,
  AppError,
  visionAvailable,
} from "@/lib/service";
import { interpretPhoto } from "@/lib/vision";
import { reviewEngines, trackReview } from "@/lib/workflow";
export const maxDuration = 120;
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { store, event } = await ownerContext(request, id);
    const input = z
      .object({
        image: z.string().max(1_800_000),
        label: z.string().max(120),
        source: z.enum(["upload", "camera"]),
      })
      .parse(await body(request));
    if (!visionAvailable())
      throw new AppError(
        "The photo reader is not connected. Use the sample or enter your plan manually.",
        503,
      );
    await reserveDailyBudget("photos");
    const photo = await savePhoto(
      store,
      id,
      input.image,
      input.label,
      input.source,
    );
    const previous =
      event.photoId && !event.photoId.startsWith("sample-")
        ? await store.get<PhotoRecord>(ids.photo(id, event.photoId))
        : null;
    const { draft, model } = await interpretPhoto(
      input.image,
      event,
      previous?.dataUrl,
    );
    return json(
      await trackReview(
        reviewEngines(store),
        await makeProposal(store, event, draft, photo.id, "vision", model),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
