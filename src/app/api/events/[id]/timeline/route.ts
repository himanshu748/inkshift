import { NextRequest } from "next/server";
import { errorResponse, json, ownerContext } from "@/lib/http";
import { buildTimeline } from "@/lib/timeline";
import { loadEvent } from "@/lib/service";
import { StaleWriteError } from "@/lib/store";
import { reviewEngines, reviewStages } from "@/lib/workflow";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { store, event: authorizedEvent } = await ownerContext(request, id);
    let event = authorizedEvent;
    let records = await store.timelineRecords(id);
    for (let attempt = 0; ; attempt++) {
      const current = await loadEvent(store, id);
      if (current._rev === event._rev) break;
      if (attempt === 2) throw new StaleWriteError();
      event = current;
      records = await store.timelineRecords(id);
    }
    const { proposals, photos } = records;
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
