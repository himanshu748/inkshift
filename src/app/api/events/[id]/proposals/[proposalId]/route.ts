import { NextRequest } from "next/server";
import { z } from "zod";
import {
  assertOrigin,
  body,
  errorResponse,
  json,
  ownerContext,
} from "@/lib/http";
import { draftSchema } from "@/lib/model";
import { getProposal, getReviewedProposal } from "@/lib/service";
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
    const input = z
      .object({ proposalRevision: z.string().min(1) })
      .parse(await body(request));
    const proposal = await getReviewedProposal(
      store, id, proposalId, input.proposalRevision,
    );
    return json(
      await discardReview(
        reviewEngines(store),
        store,
        proposal,
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
    const input = z
      .object({ draft: draftSchema, proposalRevision: z.string().min(1) })
      .parse(await body(request));
    const proposal = await getReviewedProposal(
      store, id, proposalId, input.proposalRevision,
    );
    return json(
      await reviseReview(
        reviewEngines(store),
        store,
        event,
        proposal,
        input.draft,
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
