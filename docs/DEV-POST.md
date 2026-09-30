---
title: "INKSHIFT: cross out a table, keep the booking"
published: false
description: "Turn an event plan into a signup page, then move a session without losing its bookings. Powered by Sanity Content Lake, App SDK and Workflows."
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16).*

## What I Built

INKSHIFT lets an organiser change a meetup plan after people have signed up. Move Ticket to Ride from Table B to Table C, approve the reviewed change and the same guests keep their bookings. The paper time machine lets you scrub through the plan's versions and see those bookings travel with the session.

[Open INKSHIFT](https://inkshift.vercel.app) · [Watch the booking move](https://youtu.be/XpdGE0ESoFM) · [Watch the product walkthrough](https://youtu.be/xM5eC-q7t_0) · [Source code](https://github.com/himanshu748/inkshift)

A photo or typed plan starts the process. The organiser reviews what the reader understood, corrects uncertainty and approves the change before it reaches the live schedule. The demonstrated outcome is a booking that survives the move; the prepared sample below makes that easy to inspect.

![Paper time machine between version 1 and 2, with Ticket to Ride moving into Table C and its booking token travelling with it](https://raw.githubusercontent.com/himanshu748/inkshift/main/docs/images/time-machine-moving.png)

The paper time machine halfway between version 1 and 2: Ticket to Ride slides from Table B to Table C and its booking goes with it.

{% embed https://youtu.be/XpdGE0ESoFM %}

[INKSHIFT](https://inkshift.vercel.app) turns a plan for a games night, workshop or club meetup into a shared signup page. Upload a photo or type the plan, check the sessions and send the invite link. Guests book a place without an account.

When the paper changes, you review the proposed edit against the people who have already joined, correct the reading if needed and approve. Guests keep their places at the new location.

Sanity gives the gathering continuity: Content Lake stores the linked sessions and registrations, Workflows records each plan review and App SDK subscribes to the shared schedule. The booking belongs to a session whose location can change.

## Demo

The 43-second walkthrough follows a prepared games-night plan through a table change:

{% embed https://www.youtube.com/watch?v=xM5eC-q7t_0 %}

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

They do not need to sign up again.

The videos and screenshots use labelled prepared samples with fixed readings. **Try the guided sample** and **Use the crossed-out example** exercise real signup, review and Content Lake writes, but skip image inference. The screenshots show a saved demo registration and an applied review. Separate photo-reader checks used rendered typed sheets and one genuine handwritten schedule, described below. Physical phone-camera capture remains untested.

### Scrub back through the paper

Every approved edit becomes a version. Below the live plan there is a **Paper time machine**: a slider over every version of the paper, with the sheet on the left and the tables on the right. Move from version 1 to version 2 and the Ticket to Ride card slides from Table B to Table C, carrying Ada's token with it. Move back and it slides home.

Each version shows when it was applied, what changed ("Ticket to Ride: Table B → Table C"), how many bookings were kept and the state of its Workflows run. Readings I discarded appear as a faded note, never as a version.

Version 1 in the sample needs no upload: choose **Try the guided sample**, join as a guest, apply the crossed-out example and the time machine has two versions. The rename example adds a third.

The time machine reads saved records. Plans only change when a proposal is applied, so each applied proposal's stored preview is exactly the plan it produced. The one gap was the plan before the first edit: nothing stored it. INKSHIFT now records a `planBefore` snapshot on the proposal at apply time. Older sample gatherings that predate the snapshot rebuild version 1 from the prepared sample definition, and the time machine labels that version **Reconstructed**. Bookings are placed per version from their `createdAt` and `cancelledAt` times; they always point at the same session ID, so nothing has to be guessed about where a person went.

The timeline, photos and booking initials come from an organiser-only server route. A request without the organiser cookie gets a 403, and the App SDK public schedule still carries only sessions and counts.

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

The event aggregate repeats spaces, sessions and bookings as arrays on purpose: its document revision is the single lock. Every booking and approval patches it with `ifRevisionId` and saves the changed linked records and public projection in the same transaction. A write against a stale revision is rejected whole with a 409: a booking retries against the new state, and a stale approval has to be rechecked.

The app also includes a live content inspector. After the move, it shows `session-1-1` at Table C with `1/4` places booked:

![Sanity App SDK inspector showing session-1-1 at Table C with one of four places booked](https://raw.githubusercontent.com/himanshu748/inkshift/main/docs/images/sanity-booking-inspector.jpg)

App SDK reads this public schedule and its booking counts from Content Lake. Participant names, uploaded photos and organiser access data stay behind authorised server routes. Public projection IDs are hashed and contain no raw event invite IDs. The September 29 release migrated all 41 legacy public copies; anonymous checks found no old public projections or private event aggregates. The Sanity write token stays on the server.

### A change has a review and a decision

An edited plan becomes a saved proposal. Sanity Workflows tracks it through Reading, Review and either Applied or Discarded, so the organiser can return to a review and see what happened.

There is a timing problem here: someone can join while the organiser is reviewing a move. A proposal that fitted the earlier bookings may no longer fit.

Before applying it, the server checks the event and proposal revisions and recomputes the constraints. If the event has changed, the organiser has to recheck. Once approved, the plan, linked records and public schedule are saved together in one Content Lake transaction.

App SDK subscribes to the public schedule's version. A change prompts the organiser workspace to refresh its private data through an authorised server route. Workflows records the review's progress; the server checks permission and validates the move. Reader and organiser labels describe the caller context under the server credential. They do not grant permission to approve a change.

## Code

[Source code and setup instructions](https://github.com/himanshu748/inkshift)

INKSHIFT uses Next.js and React, Sanity Content Lake, App SDK and Workflows. Photo reading uses Qwen3-VL through Hugging Face Inference Providers. The [verification record](https://github.com/himanshu748/inkshift/blob/main/docs/VERIFICATION.md) covers booking preservation, concurrent changes, access recovery and private-data checks.

## My Build Process

Codex and Claude Code were my AI-native coding environment: Codex for the first build and the finish, Claude Code for an upgrade pass in between and the time machine. I checked the deployed paths against the real Sanity project and used local tests for the domain rules. The prepared demonstration and photo-reader checks are separate, because a fixed reading cannot establish whether the model understood a photograph.

### The pitch, then very short prompts

The idea started as a note I pasted in: "A handwritten plan becomes a working, multiplayer app. Then you change the paper, and the app understands what changed without losing what people already did."

My prompts after that were short. "go on it's for dev.to challenge", then "anything works also if that does not fit the hackathon let me know and switch over to another project". Codex read the Path Two rules before writing code and answered that it fit, because Sanity would hold the model the whole product depends on.

### The first correction: a table is not a session

The first model tied each game to its table. Moving Ticket to Ride from Table B to Table C would have replaced the session and dropped its bookings, which is the exact failure the product exists to prevent. Spaces, sessions and registrations became separate records with stable IDs, and a registration points to its session. Most of the later work follows from that decision.

The same day we set a second rule: a region missing from a photo leaves its contents uncertain and sends the reading to review.

### Where the models got stuck

- **The vision provider rejected the schema.** Qwen3-VL through the Hugging Face router refused the bounding-box format. Codex fixed it by expressing each box as a fixed-length array of numbers.
- **The reader removed a booked game.** On the second photo of an edited plan, the reader decided Ticket to Ride was gone. Review blocked approval until I matched it back to the original session. After approval, the booking appeared at Table C. That run is why review is mandatory.
- **The schema deploy was refused.** The token Sanity provisioned for the project could write documents but could not deploy a schema. The app doesn't need it at runtime, so it waited until I deployed it with my own Sanity login four days later.
- **App SDK warned during server rendering in production.** Moving the subscription provider behind a browser-only import fixed it.
- **Vercel picked the wrong framework preset.** Committing an explicit Next.js configuration fixed the first deploy.

### What I threw away

I asked for a Three.js scroll world on the landing page. It worked: the paper became tables, pawns took their seats and the game moved from B to C. It also looked like a toy, with small pieces and handwriting you couldn't read. I told Claude the 3D looked bad and chose a replacement built from the real interface. The homepage now uses an illustrated interface walkthrough. The separate browser recordings above show the real app controls and saved data.

### Reaching into Workflows

When I added Workflows, the agent worked from the docs. Claude wrote the `inkshift-plan-change` definition (Reading, then Review, then Applied or Discarded) and its adapter, then hit its session limit before wiring the routes and interface. Codex picked up that working copy, connected proposal creation, readings, corrections, approval and discard to the engine, and deployed definition v1.

One detail from the docs shaped the design: the engine's checks are advisory, and only the Content Lake enforces anything. So the server still rechecks revisions, seats and the time slot before it writes, and a registration that arrives during review invalidates the stale proposal. Codex also added recovery for a plan decision whose workflow follow-up fails.

### The time machine

After the first submission I wanted the strange part to be visible: ink on paper edits a live database, and the same people travel with their bookings as the paper changes. I asked Claude Code for a "paper time machine" and gave it one rule: do not fake history.

Before any UI, it checked the rule against the real dataset with a GROQ read. When I reran it on September 28, 22 events had applied proposals, and in all 22 the latest applied preview matched the live plan exactly ([queries and counts](https://github.com/himanshu748/inkshift/blob/main/docs/evidence/timeline-dataset-check.json)). Two problems came out of that read. 8 of 30 applied proposals were saved before `appliedVersion` existed, so ordering falls back to the applied time. And nothing stored the plan before the first edit, so version 1 of a sample could only be rebuilt from code. That is why `planBefore` now exists and why old gatherings say **Reconstructed** on version 1.

What went wrong: the first test run was flaky. A booking and an approval landed in the same millisecond, and the version-1 frame dropped the guest. The tests now run on a fixed clock, and a booking made at the exact moment of an apply counts as before it. The agent also hit its session limit while writing the component and picked the work up from the last commit.

### Writing this post

I pushed back on two drafts: "you've to establish it as completed product not incomplete" and "why'd you talk about how we made it instead of what product and how it uses sanity". That's why the post opens with the product. The build story lives here.

### Testing a handwritten schedule

On September 30, Codex uploaded a [photographed handwritten unconference schedule by James Arthur Cattell](https://jacattell.medium.com/unconference-agenda-creation-a3d3ea720fb5) through the hosted app at a 390-pixel browser viewport. It contains 12 sessions in Rooms A, B and C, with four 45-minute slots. It has no seat limits.

![The photographed handwritten schedule used for the reader check](https://raw.githubusercontent.com/himanshu748/inkshift/main/docs/images/cattell-handwritten-grid.jpg)

*Photograph © 2024 James Arthur Cattell, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), reproduced unchanged from the linked article.*

The first reading found the sessions and times, misread one title and guessed four-seat limits. It reported no uncertainty. Codex discarded it without changing the live plan. That failure led to a new gate: every photo reading now requires the organiser to check seat limits explicitly before approval. The model can still guess a number; the acknowledgement does not prove it is right.

Claude reviewed the fix independently. In the hosted rerun, approval stayed disabled through edits until the reading was explicitly checked and rechecked. Codex supplied eight places per room and session for this test, corrected the title, then approved the 12-session plan. A guest booked Hybrid Meeting Tips. A later manual edit added Room D and moved that session there; the guest's existing place appeared at Room D without another signup. The room move was an organiser edit, not a second photograph interpreted by the reader.

### What is still unverified

Camera access on physical phones and broad handwriting accuracy remain unverified. The single-photo check above tests one legible handwritten schedule. The domain tests cover relocation, full destinations, identity ambiguity, cropped photos, time conflicts and capacity cuts. The September 28 suite had 37 tests, including six for the time machine: ordering, discarded readings left out, bookings followed by session ID, missing photos and reconstructed originals. The September 29 release expanded the suite to 62 passing tests and passed the hosted product, workflow and typed-photo checks. The September 30 capacity-review fix brought the suite to 65 passing tests and passed type checking, lint and the production build. An earlier live race for the last place produced exactly one winner, and five booking IDs survived a relocation.

In the September 29 photo check, the first typed sheet needed no correction. The crossed-out sheet produced two ambiguity questions. The test operator corrected that reading before approval, and the same booking then appeared at Table C. That run demonstrates the reader-to-review-to-approval path, including its need for a human decision.

The release audit also found that a proposal could change after the organiser had reviewed it. Approve, revise and discard now require the exact proposal revision shown in the review. Timeline loading includes the complete saved history, and ordinary joins and cancellations write only the records that changed. Claude independently reviewed the repairs before deployment.

The read-only Studio schema was deployed with my Sanity login on September 24 and updated on September 25. The September 29 schema changes are committed, but the optional admin metadata sync was refused by the current credentials. The running app and completed public-record migration do not depend on that sync.

INKSHIFT is bounded to small gatherings and keeps up to 1,200 lifetime registration records, including cancellations. Its recent-join guard is per browser, so an invite holder using fresh cookies could exhaust that limit. Existing places remain viewable and cancellable; recovery currently means creating a new gathering. Removing invite IDs from public projections cannot revoke links someone already knew.

## Sanity Project Details

Project ID: `a5xdqsb7`  
Dataset: `production`  
Workflow: `inkshift-plan-change`, version 1

To use INKSHIFT for your own gathering, [create an event](https://inkshift.vercel.app), add its plan and share the participant invite. You can return through **Your gatherings**, or restore organiser access on another device with your private backup code.

## Agent Session

{% agent_session building-inkshift-with-codex-paper-plan-to-live-sanity-signup-page-rocipc %}
