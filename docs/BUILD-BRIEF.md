# INKSHIFT build brief

Approved September 20, 2026 for DEV's Sanity Challenge, Path Two.

## Pitch and scope
Photograph a handwritten event plan, open registrations, and reconcile later paper edits without losing the people already signed up. Build one domain: small events with sessions and spaces. The model interprets evidence; deterministic server code applies the rules.

## Core workflow
1. Create a private organizer session and a distinct public participant link.
2. Photograph or upload a paper plan; review extracted text, locations, capacities, and uncertain fields.
3. Approve the initial plan. Publish bookable sessions.
4. Participants join on separate devices with transactional capacity enforcement.
5. Upload the edited paper. Match stable entities, show proposed changes and affected registrations.
6. Approve a valid relocation; participant bookings retain their IDs. Block conflicting or stale updates.

## Sanity integration
Linked records: event, photo revision, space, session, registration, and change proposal. Domain writes are one revision-checked transaction. Organizer App SDK view reads live records. Workflows is optional; its early-access guards do not substitute for access control or transactional domain validation.

## Demo
Use a sample games night to learn the interaction. Open the participant link twice, join sessions, photograph an edited plan, approve a relocation, verify both phones keep their bookings. Provide reproducible failure cases: reduced capacity, ambiguous rename, partial photograph, and stale review.

## First risk
Can image interpretation preserve entity identity across angle, wording, and layout changes, and stop safely on uncertainty? Test this before claiming the image loop is complete. Separately test transactions against a real Sanity dataset; in-memory tests do not prove provider behavior.

## Excluded
Payments, recurring events, generic app/code generation, unconstrained scheduling, automatic eviction, push/email notifications, and unsupported claims of recognition accuracy.

## Submission requirements
Deadline: October 4, 2026 11:59 PM PDT (October 5 12:29 PM IST). DEV article using the Path Two template and #sanitychallenge, Sanity project ID or public dataset URL, source repository, deployed demo plus walkthrough/screenshots, and an honest account of the build. Do not publish or submit on the user's behalf without the appropriate instruction.

Sources: https://dev.to/challenges/sanity-2026-09-16 ; https://dev.to/page/sanity-challenge-v26-09-16-contest-rules ; https://www.sanity.io/docs/content-lake/transactions ; https://www.sanity.io/docs/workflows/prerelease
