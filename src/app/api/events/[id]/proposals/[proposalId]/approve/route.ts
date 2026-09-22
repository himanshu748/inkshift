import { NextRequest } from "next/server";
import { z } from "zod";
import { body, errorResponse, json, ownerContext } from "@/lib/http";
import { getProposal } from "@/lib/service";
import { approveReview, reviewEngines } from "@/lib/workflow";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> },
) {
  try {
    const { id, proposalId } = await params;
    const { store, event } = await ownerContext(request, id);
    const input = z
      .object({ reviewed: z.literal(true), baseVersion: z.number().int() })
      .parse(await body(request));
    const result = await approveReview(
      reviewEngines(store),
      store,
      event,
      await getProposal(store, id, proposalId),
      input.baseVersion,
    );
    return json({
      ok: true,
      version: result.event.version,
      proposal: result.proposal,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
