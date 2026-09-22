# Verification record

The September 22, 2026 continuation replaces the 3D landing and connects the existing review system to Sanity Workflows. Earlier deployment, concurrency and photo evidence remains in [the September 21 record](VERIFICATION-2026-09-21.md); its 3D performance findings describe a removed interface.

## Current checks

- TypeScript, ESLint, all 25 tests, workflow-definition validation and the optimized Next.js build passed.
- Six tests use the real Sanity workflow engine with its in-memory bench. They cover applied and discarded outcomes, unclear-reading approval gates, recheck, stale registrations, caller attribution, repeated reads and recovery after a simulated follow-up write failure.
- The deployed definition is `inkshift-plan-change` v1 in project `a5xdqsb7`, dataset `production`, tag `inkshift`.
- The local production server passed the live workflow HTTP check. Adding another registration invalidated the old review; recheck updated its affected count to two. The booking survived the move to C. Discard left the plan unchanged, saved history returned both outcomes, and unauthorized review/instance access was blocked. See `evidence/local-workflow-http.json`.
- Two local HTTP image calls passed through the actual photo reader and entered Sanity Workflows with the Reader agent context. The second reading proposed removing a booked session and needed an explicit fixture-informed identity correction. The same booking then moved to C. See `evidence/local-http-photo-flow.json`.

- The browser flow created a sample from the new landing, booked Ticket to Ride, approved the prepared move, reopened the saved outcome after reload, and showed the same participant at Table C. The walkthrough Play control reached its fourth stage and stopped. Desktop and phone CSS viewport captures were reviewed. See `evidence/takeover-browser-flow.json`.
- The requested specialized Impeccable reviewer and documenter roles were unavailable; generic agents followed the provided fallback contracts. The independent visual review found no material defect in the nine supplied viewport captures and requested an update to the obsolete design record. That two-file documentation fix passed the same reviewer’s verdict check; disposition: ship.

- The new Vercel production deployment is Ready and aliased to `https://inkshift.vercel.app`. The hosted workflow HTTP check passed the same stale-review, recheck, relocation, discard, saved-history and privacy assertions. See `evidence/hosted-workflow-http.json`.

- Two hosted image calls entered the real workflow with Reader agent attribution. As in the local test, the edited typed sheet needed explicit session-identity correction; the same booking then appeared at Table C. Unauthorized organizer and photo requests were rejected. See `evidence/hosted-http-photo-flow.json`.
- Fresh production-browser checks confirmed the new landing at 390 × 844 without horizontal overflow, sample creation, the three-stage review display and a connected App SDK inspector. No warning or error was recorded in that tab. See `evidence/takeover-hosted-browser-flow.json`.

- Published the scanned source to the public `himanshu748/inkshift` repository. GitHub main matched implementation commit `a6afe74633cc3acaeb6745352e5a396754bfafd1`; the repository, draft and embedded JPEG URLs returned HTTP 200. See `evidence/takeover-release.json`.

## Evidence limits

The image inputs are rendered typed sheets, not photographed handwriting. Prepared example buttons do not use image inference. Browser tests use CSS viewports in a desktop browser, not physical phone hardware. The workflow fault-recovery test simulates a lost engine write in memory; it does not claim to have induced a live Sanity outage.

Remote schema and Studio deployment remain a handoff. The available token can write the dataset and deploy workflow definitions but previously lacked schema/Studio deployment access. No new Sanity login or Studio deployment was attempted during this continuation.

A physical-paper video, DEV publication and a submission receipt remain unfinished. The global event/photo caps are shared quota guards. Capability cookies have no account-recovery flow, and distinct browsers do not establish distinct human identities.
