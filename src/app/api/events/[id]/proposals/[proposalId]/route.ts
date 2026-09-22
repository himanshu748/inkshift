import { NextRequest } from "next/server";
import {
  assertOrigin,
  body,
  errorResponse,
  json,
  ownerContext,
} from "@/lib/http";
import { draftSchema } from "@/lib/model";
import { getProposal } from "@/lib/service";
import {
  discardReview,
  reviseReview,
  reviewEngines,
  trackReview,
} from "@/lib/workflow";
type Context = { params: Promise<{ id: string; proposalId: string }> };
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { id, proposalId } = await params;
    const { store } = await ownerContext(request, id);
    return json(
      await trackReview(
        reviewEngines(store),
        await getProposal(store, id, proposalId),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    assertOrigin(request);
    const { id, proposalId } = await params;
    const { store } = await ownerContext(request, id);
    return json(
      await discardReview(
        reviewEngines(store),
        store,
        await getProposal(store, id, proposalId),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> },
) {
  try {
    const { id, proposalId } = await params;
    const { store, event } = await ownerContext(request, id);
    const draft = draftSchema.parse((await body(request)).draft);
    return json(
      await reviseReview(
        reviewEngines(store),
        store,
        event,
        await getProposal(store, id, proposalId),
        draft,
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
