# Verification record

The September 22, 2026 continuation replaces the 3D landing and connects the existing review system to Sanity Workflows. Earlier deployment, concurrency and photo evidence remains in [the September 21 record](VERIFICATION-2026-09-21.md); its 3D performance findings describe a removed interface.

## Product continuation — September 22

- Added real gathering setup, the returning organizer list, private access-code backup and restore, an empty-workspace path, and Help/Privacy/About routes. Practice gatherings are separate from an organizer’s real plans.
- TypeScript, ESLint, the optimized Next.js build and all **31 tests** passed. Six new unit tests cover gathering discovery and organizer access. The actual local HTTP flow verified custom details, invalid dates, owner-only discovery/export, cross-origin rejection, a manual plan with no example photo, and restoration in a separate cookie context without changing the plan. See `evidence/local-product-http.json`.
- Browser verification caught a native-date input mismatch; setup now submits the actual form values. The browser-created “Community games night” preserved October 3, 2026. The check also exercised returning to a gathering, invalid-code feedback, disabled invites on an empty plan, and the typed-plan review. Eleven desktop/phone viewport regions were captured. See `evidence/product-browser-flow.json`.
- A fresh independent Impeccable finish reviewer returned **ship**; a separate documenter preserved the incumbent system for this ordinary extension. See `evidence/product-finish-review.md`.
- Vercel deployment `dpl_85WtKuFmLmU5SUyqgF4hc28YEwqJ` is Ready and aliased to `https://inkshift.vercel.app`. The hosted product and workflow HTTP checks passed, including separate-cookie recovery, unchanged plan revisions, stale-review rejection, recheck, preserved booking, discard, saved history and private access restrictions. See `evidence/hosted-product-http.json` and `evidence/hosted-workflow-http.json`.
- Fresh hosted-browser checks preserved the custom October 2 date, opened a guest invite, booked Ticket to Ride, applied a prepared move and showed the retained place at Table C. The organizer list reopened the real gathering on a 390 × 844 viewport without horizontal overflow. Console warnings/errors: zero. See `evidence/product-hosted-browser-flow.json`.
- The 43-second edited browser walkthrough exported successfully. ffprobe confirms H.264, 60fps and a 1920 × 1340 public copy; its native content crop is preserved. A midpoint frame was inspected for legible controls, visible cursor and the prepared-example disclosure. See `video/inkshift-product-walkthrough.mp4` and `evidence/product-video.json`.
- The read-only Sanity Studio schema validates with **zero errors and zero warnings**. The Studio production build and schema extraction passed. Schema/Studio deployment is pending explicit approval after automatic review blocked it against the earlier handoff instruction. No event records were edited by these preparation commands.

## Earlier workflow release checks

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

Remote schema and Studio deployment remain pending. The local schema and Studio build are prepared; the earlier workflow release did not establish remote schema/Studio permissions.

An edited browser walkthrough is included; a physical-paper video, DEV publication and a submission receipt remain unfinished. The global event/photo caps are shared quota guards. Organizers can now save a private bearer code to restore access. There is still no account/email recovery when both that code and the original browser access are lost, and codes cannot yet be rotated in the interface. Distinct browsers do not establish distinct human identities.
