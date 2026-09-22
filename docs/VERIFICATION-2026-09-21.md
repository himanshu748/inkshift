# Verification record

Checked locally on September 20 and on the public Vercel deployment on September 21, 2026 (Asia/Kolkata). These results describe the prototype and the named test inputs; physical-phone camera testing, handwriting evaluation and challenge submission remain incomplete.

The final local run passed TypeScript, ESLint without warnings, all 19 tests, and the optimized Next.js production build.

## Application and Content Lake

| Check | Observed result | Evidence |
| --- | --- | --- |
| Domain rules | 19 tests pass: stable IDs, registration-preserving relocation, occupied destinations, cropped/missing entities, ambiguous identity, time conflicts, reduced capacity | `npm test` |
| Sanity concurrency | Two requests competed for the final place; exactly one won | `evidence/live-sanity.json` |
| Approval freshness | A proposal from a stale event revision was rejected | `evidence/live-sanity.json` |
| Relocation | Five registration IDs survived the move from B to C | `evidence/live-sanity.json` |
| Public/private separation | Anonymous reads of private dot-path documents were blocked; the schedule projection remained readable | `evidence/live-sanity.json` |
| Real vision provider | Two HTTP image interpretations created and then revised an event. The second reading required a manual identity correction before approval. The same booking survived | `evidence/http-photo-flow.json` |
| Hosted photo flow | Two real interpretations on the production URL created three sessions and moved a booked session to C after a review correction. Anonymous organizer and photo requests returned 403 | `evidence/hosted-http-photo-flow.json` |
| Browser workflow | Created sample event `YvCA8QCXd81d2g`; Alex Demo joined Ticket to Ride at B; organizer approved the prepared table removal; participant updated to C | `evidence/browser-flow.json` |
| Sanity App SDK | Inspector connected at revision 2, session `session-1-1`, Table C, count 1/4 | Browser inspector; same browser-flow record |
| Local schema | Validation returned an empty findings list and schema extraction succeeded | `evidence/schema-validation.json`, `sanity-schema.json` |

The prepared example buttons use explicit fixture drafts. The vision reports used programmatically rendered typed sheets sent to the real provider. Neither is evidence of photographed handwriting accuracy. A separate three-image provider probe is in `evidence/vision-samples.json`; one image produced uncertainty. It is too small and too synthetic to support an accuracy percentage.

The optimized build was also started with `next start` on port 3333. The existing Sanity event and booking survived the restart, and the landing created a new three-session event with a working organizer cookie. This is a local production-mode smoke check, not hosted deployment verification.

## Public deployment

The production URL is [inkshift.vercel.app](https://inkshift.vercel.app). Anonymous requests to the landing and health endpoint returned 200. The runtime reports Sanity storage, project `a5xdqsb7`, and an available vision provider; the separate HTTP flow exercised the provider rather than relying on that availability flag.

The first deployment built successfully but used Vercel's Other framework preset and returned 404. Pinning `framework: nextjs` in `vercel.json` corrected routing. Production runs Node.js 24 and stores the Sanity and Hugging Face credentials as sensitive server variables. Its exact HTTPS origin was added to Sanity CORS with credentials disabled.

The first hosted photo-test attempt stopped on a model uncertainty. The test runner now supports explicit fixture-informed review corrections for either reading and retains the original conflicts in its report. The completed run needed a correction to the second reading, which had proposed removing the registered game. Approval was blocked until the operator restored its identity. The fixture correction is test code, not an automatic production fallback.

The hosted browser test created event `qFBBYm77qNVCPA`, joined Ticket to Ride as Alex Demo, and approved the prepared table-removal example. The participant page updated from B to C. The inspector connected directly through Sanity App SDK at revision 2 and showed session `session-1-1` with count 1/4. Participant and organizer screens used separate tabs in one browser; the independent HTTP check used separate cookie contexts to verify authorization.

Production inspection found a recoverable React server-rendering warning: the Sanity SDK subscription has no server snapshot. The live provider now loads only in the browser while the inspector shell remains server-rendered. After redeployment, the inspector connected and the participant's existing booking survived reload. Joining Wavelength changed its inspector count from 0/6 to 1/6 without a reload, verifying the live subscription. The final deployment's error-log check returned no results. See `evidence/deployment.json` and `evidence/hosted-browser-flow.json` for the deployment and smoke-check scope.

Hosted layout checks covered a 1280×720 desktop landing and 390×844 phone-width landing and participant page, with no horizontal overflow. The paper and change endpoints rendered their WebGL scenes, and native chapter navigation returned to the paper. These are browser CSS viewport checks, not physical-device tests.

## Landing page

The browser checked all four endpoints at 1440×900, 768×1024 and 390×844 CSS pixels. Chapter links, forward and reverse traversal, intermediate movement, reload at depth, game highlighting, reduced-motion mode, static fallback, and launch into the real organizer were exercised. A follow-up checked every endpoint after changing only height from 900 to 720 pixels at a constant 1440-pixel width.

At rest, the endpoints reported 10/46/58/52 draw calls and 124/3,628/7,440/6,752 triangles. One desktop macOS browser at DPR 1 reported active-frame intervals near 16.7 ms median and 17.2 ms P95 in the final run. These accumulated measurements are not separate device benchmarks. The 121 ms world-assembly diagnostic excludes the lazy chunk download and font wait, so it is not cold-page startup time. `evidence/scroll-world.json` contains the first pass; `evidence/finish-checks.json` records the corrected build.

Screenshots are viewport captures. The tablet capture backend clips roughly the bottom 35 pixels of its 1024-pixel CSS viewport; DOM position checks and successful native anchor actions provide separate navigation evidence. No full-page capture is claimed. The browser's full-page capture mode was unsuitable for this page and was not used as review evidence.

The independent finish review covered 21 supplied captures and source contracts. Its first pass found five material issues: height-only anchor measurement, fallback highlight feedback, photograph-action placement, heading eyebrows and a hard CTA shadow. These were corrected and resubmitted to the same reviewer. The final verdict cleared all five fixes, with no regression identified in that correction batch; it does not certify the whole application. The named Impeccable role was unavailable, so a fresh generic reviewer applied its supplied contract. The design documenter used the same role-substitution approach.

## Remaining gates

- Physical handwriting, uneven light, an actual phone camera permission flow, touch behavior on hardware, Safari, and low-end GPU performance.
- Forced WebGL context loss, failed asset transport, hidden-tab recovery timing, network throttling, shader compilation, peak GPU memory, and cold transfer profiling. Static fallback and reduced-motion modes were exercised through explicit query switches.
- Remote Sanity schema/Studio deployment. The provisioned token can transact Content Lake data, but did not have deployment permission.
- A public repository, physical-paper demo video, published DEV article, and submission receipt. The local article is a draft with outstanding release links.

The prototype's daily event/photo limits are global quota guards. They are not per-person rate limits or abuse prevention. Organizer access depends on the creating browser's cookie, with no account-recovery flow.
