import type { DraftPlan } from "./model";

export const PHOTO_CAPACITY_REVIEW =
  "Check every room's seats and every session's player limit. Photo-reader numbers are provisional; if the paper has no limits, set them yourself before approving.";

/** Reserve one review question for seat limits, even when the model is confident. */
export function requirePhotoCapacityReview(draft: DraftPlan): DraftPlan {
  if (draft.uncertainties.length > 19)
    throw new Error("Too many photo uncertainties to include capacity review.");
  return {
    ...draft,
    uncertainties: [PHOTO_CAPACITY_REVIEW, ...draft.uncertainties],
  };
}
