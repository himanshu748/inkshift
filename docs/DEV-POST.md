---
title: "INKSHIFT: cross out a table, keep the booking"
published: true
description: "Turn an event plan into a signup page, then move a session without losing its bookings. Powered by Sanity Content Lake, App SDK and Workflows."
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16).*

## What I Built

INKSHIFT lets an organiser change a meetup plan after people have signed up. A guest books Ticket to Ride at Table B. The organiser reviews a move to Table C and approves it; the original session and registration IDs stay the same, and the guest sees the new table under **Your places** without booking again. The paper time machine shows that booking through the saved plan versions.

[Open INKSHIFT](https://inkshift.vercel.app) · [Watch the latest demo](https://www.youtube.com/watch?v=_fX19uDjTe8) · [Source code](https://github.com/himanshu748/inkshift)

Upload a photo or type a plan, review the reading and approve. In the guided sample, inspect the guest’s existing booking after the move, then open the saved review for the preserved session and booking IDs. Its reading is fixed; signup, approval and Content Lake writes are real.

![Paper time machine between version 1 and 2, with Ticket to Ride moving into Table C and its booking token travelling with it](https://raw.githubusercontent.com/himanshu748/inkshift/main/docs/images/time-machine-moving.png)

Guests join a games night, workshop or meetup without an account. Content Lake stores the event and its linked records, and Workflows records each plan review. App SDK subscriptions power the organiser workspace and content inspector; guest pages poll the server every 2.5 seconds while visible. A booking belongs to a session whose location can change.

## Demo

The latest 87-second demo, narrated with Deepgram, uses browser captures from the deployed app on October 5, 2026. Ada books Ticket to Ride at Table B; the organiser approves the move to Table C with one registration preserved. The same guest page updates without another signup or a reload. The paper time machine then shows the saved booking in both plan versions.

{% embed https://www.youtube.com/watch?v=_fX19uDjTe8 %}

Choose **Try the guided sample**. Its organiser checklist, **Move the table. Keep the booking.**, follows the same flow:

1. Open the signup page from the organiser workspace.
2. Join Ticket to Ride, then return to the organiser workspace.
3. Choose **Use the crossed-out example** and review the proposed move to Table C.
4. Approve it, then reopen the participant page.

Here is the organiser's review with a booking already in place:

![Organiser review showing Ticket to Ride moving from Table B to Table C, with one registration preserved](https://raw.githubusercontent.com/himanshu748/inkshift/main/docs/images/review-booking-kept.jpg)

The review identifies the move and the registration that stays with it. INKSHIFT checks that Table C has enough seats and is available for the full session before allowing approval.

After approval, the guest's existing booking appears under **Your places** at Table C:

![Participant page showing the existing Ticket to Ride booking at Table C](https://raw.githubusercontent.com/himanshu748/inkshift/main/docs/images/participant-booking-kept.jpg)

The video is an edited sequence with narration and captions, with waiting compressed. The video and screenshots use labelled prepared samples with fixed readings. Signup, review and Content Lake writes are real; image inference is skipped. Separate reader checks used rendered typed sheets and one handwritten schedule, described below. Physical phone-camera capture remains untested.

### Scrub back through the paper

Every approved edit becomes a **Paper time machine** version. Scrub between versions 1 and 2 to see Ticket to Ride move from B to C carrying Ada’s booking token. Each version shows its application time, changes, preserved bookings and Workflows state. Discarded readings appear as faded notes, never versions. Apply the sample’s crossed-out example for two versions; its rename example adds a third.

The timeline reads saved proposals and `planBefore`, captured at apply time. Older sample gatherings reconstruct version 1 from the prepared definition and label it **Reconstructed**. Booking placement uses `createdAt`, `cancelledAt` and the stable session ID.

Timeline photos and booking initials require an organiser cookie; unauthorised requests return 403. The public App SDK schedule carries sessions and counts.

### How Sanity keeps the booking attached

In Content Lake, spaces, sessions and registrations have separate identities. A registration points to a session; the session points to its space.

```text
Registration → Ticket to Ride → Table B
                       ↓ move approved
Registration → Ticket to Ride → Table C
```

Moving Ticket to Ride changes its space reference. Its session ID stays the same, so the registrations still belong to it. You can inspect these relationships in the [Sanity schema](https://github.com/himanshu748/inkshift/blob/main/sanity/schemaTypes.ts). Trimmed, with `// ...` marking skipped lines:

```ts
  // inkshiftRegistration: a booking points at a session
      ref("session", "inkshiftSession"),
  // inkshiftSession: the session points at its current table
      ref("space", "inkshiftSpace"),
  // inkshiftProposal: the plan it replaced, recorded at apply time
      defineField({
        name: "planBefore",
        type: "object",
  // inkshiftEvent: private aggregate, one revision guards every write
      arr("spaces", table()),
      arr("sessions", session()),
      arr("bookings", booking()),
  // inkshiftPublicEvent: what App SDK reads anonymously
      arr("spaces", [str("id"), str("label"), capacity()]),
        num("booked"),
```

The event aggregate is the app’s source of truth: routes read its spaces, sessions and bookings arrays, while the separate linked documents are mirrors written in the same transaction for inspection, not read to serve the app. Its document revision is the single lock. Every booking and approval patches it with `ifRevisionId` and saves the changed linked records and public projection in the same transaction. A write against a stale revision is rejected whole with a 409: a booking retries against the new state, and a stale approval has to be rechecked.

The app also includes a live content inspector. After the move, it shows `session-1-1` at Table C with `1/4` places booked:

![Sanity App SDK inspector showing session-1-1 at Table C with one of four places booked](https://raw.githubusercontent.com/himanshu748/inkshift/main/docs/images/sanity-booking-inspector.jpg)

App SDK reads this public schedule and its booking counts from Content Lake. Participant names, uploaded photos and organiser access data stay behind authorised server routes. Public projection IDs are hashed and contain no raw event invite IDs. The September 29 release migrated all 41 legacy public copies; anonymous checks found no old public projections or private event aggregates. The Sanity write token stays on the server.

### A change has a review and a decision

Sanity Workflows records proposals through Reading, Review and Applied or Discarded. Someone can join during review, so approval checks both event and proposal revisions and recomputes seats and time constraints. A changed event requires rechecking. The approved plan, linked records and public projection commit together.

App SDK subscribes to the public schedule version and prompts an authorised refresh of private organiser data. Workflows checks are advisory; the server enforces permission and validates the move. Reader and organiser labels record caller context under the server credential, not permission to approve.

On September 30 Codex reopened the saved manual room move from the handwritten-schedule test. The hosted organiser view showed this review record:

```text
Source: Manual plan
Progress: Reading (Organizer) → Review (Organizer) → Applied (Organizer)
Applied: 30 September, 21:03, Asia/Calcutta
Changes: add Room D; move Hybrid meeting Tips from Room B to Room D
Unresolved checks: 0
Registrations affected: 1
Applied result: 1 registration preserved
```

This transcribes the hosted saved review after approval. Organizer records server caller context. The move was entered manually after correcting the photograph. To inspect your gathering’s run, open a saved review and expand **Review record · Sanity Workflows**.

## Code

[Source code and setup instructions](https://github.com/himanshu748/inkshift)

INKSHIFT uses Next.js and React, Sanity Content Lake, App SDK and Workflows. Photo reading uses Qwen3-VL through Hugging Face Inference Providers. The [verification record](https://github.com/himanshu748/inkshift/blob/main/docs/VERIFICATION.md) covers booking preservation, concurrent changes, access recovery and private-data checks.

## My Build Process

Codex built the first version and finished the upgrade; Claude Code handled an intermediate pass and the time machine. I checked hosted paths against the real Sanity project and used local tests for domain rules. A prepared reading cannot establish photograph accuracy.

### The pitch, then very short prompts

The idea started as a note I pasted in: "A handwritten plan becomes a working, multiplayer app. Then you change the paper, and the app understands what changed without losing what people already did."

I followed with “go on it’s for dev.to challenge” and permission to switch projects if it did not fit. Codex checked Path Two before coding. Sanity would store the sessions, registrations and review history the product uses.

### The first correction: separate tables and sessions

The first model tied games to tables, so moving Ticket to Ride would have replaced its session and dropped bookings. We separated spaces, sessions and registrations with stable IDs. A registration points to its session. We also required review when a cropped photo leaves part of the plan uncertain.

### Where the models got stuck

- **The vision provider rejected the schema.** Qwen3-VL through the Hugging Face router refused the bounding-box format. Codex fixed it by expressing each box as a fixed-length array of numbers.
- **The reader removed a booked game.** On the second photo of an edited plan, the reader decided Ticket to Ride was gone. Review blocked approval until I matched it back to the original session. After approval, the booking appeared at Table C. That run is why review is mandatory.
- **The schema deploy was refused.** The token Sanity provisioned for the project could write documents but could not deploy a schema. The app doesn't need it at runtime, so it waited until I deployed it with my own Sanity login four days later.
- **App SDK warned during server rendering in production.** Moving the subscription provider behind a browser-only import fixed it.
- **Vercel picked the wrong framework preset.** Committing an explicit Next.js configuration fixed the first deploy.

### What I threw away

I asked for a Three.js scroll world: paper became tables, pawns took seats and the game moved from B to C. It looked like a toy, with unreadable handwriting. I told Claude the 3D looked bad and chose an illustrated interface walkthrough. The browser recordings above show the app controls and saved data.

### Reaching into Workflows

Claude worked from the docs, wrote the `inkshift-plan-change` definition and adapter, then reached its session limit before connecting routes and UI. Codex continued that working copy, connected readings, corrections, approval and discard, and deployed v1. Because Workflows checks are advisory, the server still checks revisions, seats and time slots. Codex added recovery when workflow follow-up fails after a plan decision.

### The time machine

I asked Claude for a “paper time machine” with one rule: do not fake history. It checked the dataset with GROQ before building UI. My September 28 rerun found that all 22 events with applied proposals had latest previews matching their live plans ([queries and counts](https://github.com/himanshu748/inkshift/blob/main/docs/evidence/timeline-dataset-check.json)). Eight of 30 applied proposals predated `appliedVersion`, so ordering falls back to application time. Missing original snapshots led to `planBefore` and the Reconstructed label for old sample originals.

A flaky test caught a booking and approval in the same millisecond: version 1 dropped the guest. Tests now use a fixed clock and count a booking at the exact application time as preceding it. Claude reached its session limit while writing the component and resumed from the last commit.

### Testing a handwritten schedule

On September 30, Codex uploaded a [photographed handwritten unconference schedule by James Arthur Cattell](https://jacattell.medium.com/unconference-agenda-creation-a3d3ea720fb5) through the hosted app at a 390-pixel browser viewport. It contains 12 sessions in Rooms A, B and C, with four 45-minute slots. It has no seat limits.

![The photographed handwritten schedule used for the reader check](https://raw.githubusercontent.com/himanshu748/inkshift/main/docs/images/cattell-handwritten-grid.jpg)

*Photograph © 2024 James Arthur Cattell, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), reproduced unchanged from the linked article.*

The first reading found the sessions and times, misread one title and guessed four-seat limits. It reported no uncertainty. Codex discarded it without changing the live plan. That failure led to a new gate: every photo reading now requires the organiser to check seat limits explicitly before approval. The model can still guess a number; the acknowledgement does not prove it is right.

Claude reviewed the fix independently. In the hosted rerun, approval stayed disabled through edits until the reading was explicitly checked and rechecked. Codex supplied eight places per room and session for this test, corrected the title, then approved the 12-session plan. A guest booked Hybrid Meeting Tips. A later manual edit added Room D and moved that session there; the guest's existing place appeared at Room D without another signup. The room move was an organiser edit, not a second photograph interpreted by the reader.

### What is still unverified

Camera access on physical phones and broad handwriting accuracy remain unverified. The handwritten check covers one legible schedule. Domain tests cover relocation, full destinations, identity ambiguity, cropped photos, time conflicts and capacity cuts; timeline tests cover ordering, discarded readings, stable session IDs, missing photos and reconstructed originals. The September 30 capacity-review release passed 65 tests, type checking, lint and the production build. Earlier hosted checks covered product, workflow and typed-photo paths; a live last-place race produced one winner, and five booking IDs survived relocation.

In the September 29 photo check, the first typed sheet needed no correction. The crossed-out sheet produced two ambiguity questions. The test operator corrected that reading before approval, and the same booking then appeared at Table C. That run demonstrates the reader-to-review-to-approval path, including its need for a human decision.

The release audit found that a proposal could change after review. Approve, revise and discard now require the displayed proposal revision. Timeline loading includes complete history; joins and cancellations write changed records only. Claude independently reviewed the repairs before deployment.

I deployed the read-only Studio schema with my Sanity login on September 24 and updated it September 25. September 29 schema changes are committed, but credentials refused optional admin metadata sync. The app and public-record migration do not depend on that sync.

INKSHIFT is bounded to small gatherings, with up to 300 active registrations and 1,200 lifetime registration records per gathering, including cancellations. The recent-join guard is per browser, with a separate persisted network allowance that survives fresh cookies and serverless restarts. Existing places remain viewable and cancellable; recovery currently means creating a new gathering. Removing invite IDs from public projections cannot revoke links someone already knew.

The October 4 release adds an early burst guard for organiser-access attempts, new gatherings and photo scans: 10, 5 and 3 attempts respectively per minute per client IP. On Vercel it trusts the platform-supplied client-IP header; missing or malformed headers share a fallback bucket. It returns HTTP 429 with Retry-After before body, store or provider work. The guard keeps at most 10,000 buckets in each process, resets on restart and does not coordinate serverless instances. It reduces bursts; it does not establish a distributed per-person quota or a global spend cap. Persisted daily event and photo caps remain separate. The October 5 update reserves a network allowance before those shared caps: 10 new gatherings, six photo attempts and 60 join attempts per UTC day. IPv4 addresses and IPv6 /64 networks share their respective allowance, including people on the same Wi-Fi. Invalid event/session joins are rejected before reservation; viewing and cancellation remain available. Three private documents hold bounded daily HMAC pseudonyms rather than raw addresses. This reduces exhaustion by one network; it does not stop distributed abuse or establish a per-person identity.

## Sanity Project Details

Project ID: `a5xdqsb7`  
Dataset: `production`  
Workflow: `inkshift-plan-change`, version 1

To use INKSHIFT for your own gathering, [create an event](https://inkshift.vercel.app), add its plan and share the participant invite. You can return through **Your gatherings**, or restore organiser access on another device with your private backup code.

## Agent Session

{% agent_session building-inkshift-with-codex-paper-plan-to-live-sanity-signup-page-rocipc %}
