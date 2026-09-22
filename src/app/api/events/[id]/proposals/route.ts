import { NextRequest } from "next/server";
import { z } from "zod";
import { body, errorResponse, json, ownerContext } from "@/lib/http";
import { draftSchema } from "@/lib/model";
import { makeProposal } from "@/lib/service";
import { sampleEdit } from "@/lib/sample";
import { reviewEngines, trackReview } from "@/lib/workflow";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { store } = await ownerContext(request, id);
    return json(await store.reviews(id));
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { store, event } = await ownerContext(request, id);
    const input = z
      .object({
        sampleChange: z.enum(["remove-table", "capacity", "rename"]).optional(),
        draft: draftSchema.optional(),
      })
      .parse(await body(request));
    const draft = input.sampleChange
      ? sampleEdit(event, input.sampleChange)
      : draftSchema.parse(input.draft);
    return json(
      await trackReview(
        reviewEngines(store),
        await makeProposal(
          store,
          event,
          draft,
          input.sampleChange
            ? `sample-${input.sampleChange}`
            : (event.photoId ?? "sample-original"),
          input.sampleChange ? "sample" : "manual",
        ),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
