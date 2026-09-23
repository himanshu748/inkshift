# INKSHIFT presentation decisions

Reviewed 23 September 2026. Editorial research and design rationale; not publication copy.

## The product claim

A paper edit can move a session without losing its bookings. Keep that one observable outcome consistent across the landing, video, article and Sanity explanation. A visitor should be able to create a gathering; a judge should be able to inspect how the outcome is stored.

## What the winner examples support

[DEV's Hermes winners announcement](https://dev.to/devteam/congrats-to-the-hermes-agent-challenge-winners-3on0) confirms both Ujja's Project Haven and Monika Sadlok's Virtual Parliament as winners. The announcement explicitly praises purposeful use of the sponsor's agent capabilities in working applications. It does not establish that their prose alone caused the wins.

| Example | Observed writing choice | Application to INKSHIFT |
| --- | --- | --- |
| [Ujja: Project Haven](https://dev.to/ujja/building-an-offline-first-bushfire-response-platform-with-hermes-agent-4m0a) | Defines the product immediately, assigns the sponsor concrete jobs, then explains the mechanisms and tradeoffs. | Explain Content Lake's relationships, Workflows' review process and App SDK's subscription in terms of a booking surviving a move. |
| [Monika: Virtual Parliament](https://dev.to/msadlok/i-built-a-25-agent-polish-parliament-that-drafts-bills-with-real-legal-citations-45h7) | Puts the live app, walkthrough and repository near the opening. Gives one specific demo input, labels its cached path, and explains the sponsor primitive that supports the main behaviour. | Put the app link early. Give the exact Ticket to Ride sequence. Keep the prepared-sample disclosure next to the demo. Show the registration-to-session-to-space relationship. |
| [Ujja: Cloud NEXT](https://dev.to/ujja/i-rethought-planetledger-after-google-cloud-next-2026-and-my-architecture-broke-in-a-good-way-glp) | Uses architectural changes to explain what the event meant for her own application. [Confirmed writing-challenge winner](https://dev.to/devteam/congrats-to-the-google-cloud-next-26-writing-challenge-winners-5990). | Retain a concrete design decision and its consequences. This reflective essay is a weaker overall template for a finished product submission. |

These are examples of effective explanation, not a win formula. Preserve Himanshu's own product facts and direct voice. Do not borrow personal experiences, reproduce another author's distinctive wording, or claim every Ujja submission won.

## Design system and 21st.dev references

Keep the existing community-centre ledger identity: mineral ground, forest ink, warm paper, citron actions, Archivo headings and Manrope body text. The paper-to-schedule demonstration is the defining visual object. It should remain legible on a phone and inspectable without waiting for playback.

[Abraham's Tabs Ghost](https://21st.dev/@anubra266/components/tabs-component/tabs-ghost) offers a clear selected control and directly chosen content. [Shadcnblocks' Feature 197](https://21st.dev/@shadcnblockscom/components/accordion-feature-section) pairs a selected feature with its explanation and visual. These informed interaction and hierarchy choices; no component source, assets or dependencies were copied.

The existing walkthrough already provides the appropriate feature selector. Improve its small type and mobile target sizes instead of adding another competing demo. Reduce the desktop hero's vertical whitespace so more of the actual demonstration appears sooner. Move repeated colours into shared semantic tokens.

Use native disclosures for the three pre-invitation questions: guest accounts, incorrect photo readings and existing registrations. This follows the reader-question approach discussed in [21st's accordion guide](https://news.21st.dev/blog/react-faq-accordion-components). Keep multiple answers open so visitors can compare them. No new animation package is needed.

Technical explanation belongs on About and in the submission. The consumer landing should help an organiser decide whether to use the product; Sanity's internals should not interrupt that task.

## Sponsor integration and judging evidence

The [current Path Two brief](https://dev.to/challenges/sanity-2026-09-16) evaluates finished functionality, schema thoughtfulness, originality and an honest build-process writeup. It encourages App SDK and Workflows. This makes deleting the build section counterproductive; a short account of a meaningful decision is useful.

| Product behaviour | Implemented Sanity role | Evidence a reviewer can inspect |
| --- | --- | --- |
| A booking survives a table move | Linked session, space and registration documents; stable identities | `sanity/schemaTypes.ts`, participant page before/after, content inspector |
| A stale review cannot overwrite a new booking | Revision-guarded Content Lake transaction after server validation | `src/lib/store.ts`, `src/lib/service.ts`, concurrency verification |
| A decision remains available afterwards | Workflows records Reading, Review, Applied or Discarded alongside the proposal | Saved reviews and `docs/WORKFLOWS.md` |
| The organiser sees schedule changes | App SDK subscribes to public projection; version change triggers authorised refresh | `src/components/sanity-live.tsx` and inspector |

The same server credential writes the workflow; caller labels do not represent separately authenticated Sanity principals. Server authorisation and domain validation enforce approval. Do not claim Workflows alone guarantees those permissions. The public projection excludes names, uploaded photos and organiser access data.

## Editorial evaluation

Applied no-ai-slop and checked its eval.md. The draft retains the concrete games-night scenario, solo-builder voice, direct actions and required submission headings. Sponsor mechanisms now appear earlier. The build section explains stable identity, the observed image-reading error and concurrent registration handling. No invented users, performance gains, personal incident or guaranteed win was added. Prepared samples remain labelled. The closing action is to create a gathering.

## Evidence boundary

The hosted product and prepared sample have prior verification records. Typed-image reading checks are not physical handwriting tests. This presentation pass changes the landing and explanation, not image-reader capability. The 43-second video remains an earlier recording of the same core workflow. The DEV draft is prepared locally and is not a submission receipt.
