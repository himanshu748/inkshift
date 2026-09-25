import { NextRequest } from "next/server";
import { errorResponse, json, ownerContext } from "@/lib/http";
import { buildTimeline } from "@/lib/timeline";
import { reviewEngines, reviewStages } from "@/lib/workflow";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { store, event } = await ownerContext(request, id);
    const { proposals, photos } = await store.timelineRecords(id);
    const workflows = await reviewStages(
      reviewEngines(store),
      proposals
        .filter((p) => p.status === "applied")
        .map((p) => ({ eventId: id, id: p.id })),
    );
    return json(buildTimeline(event, proposals, photos, workflows));
  } catch (error) {
    return errorResponse(error);
  }
}
