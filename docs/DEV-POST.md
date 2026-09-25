---
title: "INKSHIFT: cross out a table, keep the booking"
published: false
description: "Turn an event plan into a signup page, then move a session without losing its bookings. Powered by Sanity Content Lake, App SDK and Workflows."
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16).*

## What I Built

Someone has booked Ticket to Ride at Table B. Then Table B becomes unavailable.

Moving the game to Table C sounds easy. But there is already a person attached to that plan, and their booking needs to survive the edit.

I built [INKSHIFT](https://inkshift.vercel.app) for this kind of change. It turns a plan for a games night, workshop or club meetup into a shared signup page. Upload a photo or type the plan, check the sessions, and send the invite link. Guests can book a place without creating an account.

When the plan changes, you review the proposed edits against the people who have already joined. You can correct the reading, check the affected bookings and approve the move. Guests keep their places at the new location.

Sanity gives the gathering continuity: Content Lake stores the linked sessions and registrations, Workflows records each plan review, and App SDK subscribes to the shared schedule. The booking belongs to a session whose location can change.

[Open INKSHIFT](https://inkshift.vercel.app) · [Watch the walkthrough](https://youtu.be/xM5eC-q7t_0) · [Source code](https://github.com/himanshu748/inkshift)

## Demo

The 43-second walkthrough follows a prepared games-night plan through a table change:

{% embed https://www.youtube.com/watch?v=xM5eC-q7t_0 %}

You can try the same flow yourself:

1. Choose **Try a sample** and open its participant invite.
2. Join Ticket to Ride, then return to the organiser workspace.
3. Choose **Use the crossed-out example** and review the proposed move to Table C.
4. Approve it, then reopen the participant page.

Here is the organiser's review with a booking already in place:

![Organiser review showing Ticket to Ride moving from Table B to Table C, with one registration preserved](https://raw.githubusercontent.com/himanshu748/inkshift/main/docs/images/review-booking-kept.jpg)

The review identifies the move and the registration that stays with it. INKSHIFT checks that Table C has enough seats and is available for the full session before allowing approval.

After approval, the guest's existing booking appears under **Your places** at Table C:

![Participant page showing the existing Ticket to Ride booking at Table C](https://raw.githubusercontent.com/himanshu748/inkshift/main/docs/images/participant-booking-kept.jpg)

They do not need to sign up again.

The video and screenshots use labelled prepared samples with fixed readings. The screenshots show a saved demo registration and an applied review. Separate photo-reader checks used rendered typed sheets.

### How Sanity keeps the booking attached

In Content Lake, spaces, sessions and registrations have separate identities. A registration points to a session; the session points to its space.

```text
Registration → Ticket to Ride → Table B
                       ↓ move approved
Registration → Ticket to Ride → Table C
```

Moving Ticket to Ride changes its space reference. Its session ID stays the same, so the registrations still belong to it. You can inspect these relationships in the [Sanity schema](https://github.com/himanshu748/inkshift/blob/main/sanity/schemaTypes.ts).

The app also includes a live content inspector. After the move, it shows `session-1-1` at Table C with `1/4` places booked:

![Sanity App SDK inspector showing session-1-1 at Table C with one of four places booked](https://raw.githubusercontent.com/himanshu748/inkshift/main/docs/images/sanity-booking-inspector.jpg)

App SDK reads this public schedule and its booking counts from Content Lake. Participant names, uploaded photos and organiser access data stay behind authorised server routes. The Sanity write token stays on the server.

### A change has a review and a decision

An edited plan becomes a saved proposal. Sanity Workflows tracks it through Reading, Review and either Applied or Discarded, so the organiser can return to a review and see what happened.

There is a timing problem here: someone can join while the organiser is reviewing a move. A proposal that fitted the earlier bookings may no longer fit.

Before applying it, the server checks the event and proposal revisions and recomputes the constraints. If the event has changed, the organiser has to recheck. Once approved, the plan, linked records and public schedule are saved together in one Content Lake transaction.

App SDK subscribes to the public schedule's version. A change prompts the organiser workspace to refresh its private data through an authorised server route. Workflows records the review's progress; the server checks permission and validates the move.

## Code

[Source code and setup instructions](https://github.com/himanshu748/inkshift)

INKSHIFT uses Next.js and React, Sanity Content Lake, App SDK and Workflows. Photo reading uses Qwen3-VL through Hugging Face Inference Providers. The [verification record](https://github.com/himanshu748/inkshift/blob/main/docs/VERIFICATION.md) covers booking preservation, concurrent changes, access recovery and private-data checks.

## My Build Process

I built INKSHIFT with two AI-native tools: Codex for the first build and the finish, and Claude Code for an upgrade pass in between. Every step ran against the real Sanity project, so each claim below comes from a test run or a live check.

### The pitch, then very short prompts

The idea started as a note I pasted in: "A handwritten plan becomes a working, multiplayer app. Then you change the paper, and the app understands what changed without losing what people already did."

My prompts after that were short. "go on it's for dev.to challenge", then "anything works also if that does not fit the hackathon let me know and switch over to another project". Codex read the Path Two rules before writing code and answered that it fit, because Sanity would hold the model the whole product depends on.

### The first correction: a table is not a session

The first model tied each game to its table. Moving Ticket to Ride from Table B to Table C would have replaced the session and dropped its bookings, which is the exact failure the product exists to prevent. Spaces, sessions and registrations became separate records with stable IDs, and a registration points to its session. Most of the later work follows from that decision.

The same day we set a second rule: a region missing from a photo is uncertainty, not evidence of a deletion, and it goes to review.

### Where the models got stuck

- **The vision provider rejected the schema.** Qwen3-VL through the Hugging Face router refused the bounding-box format. Codex fixed it by expressing each box as a fixed-length array of numbers.
- **The reader removed a booked game.** On the second photo of an edited plan, the reader decided Ticket to Ride was gone. Review blocked approval until I matched it back to the original session. After approval, the booking appeared at Table C. That run is why review is mandatory, not optional.
- **The schema deploy was refused.** The token Sanity provisioned for the project could write documents but could not deploy a schema. The app doesn't need it at runtime, so it waited until I deployed it with my own Sanity login four days later.
- **App SDK warned during server rendering in production.** Moving the subscription provider behind a browser-only import fixed it.
- **Vercel picked the wrong framework preset.** Committing an explicit Next.js configuration fixed the first deploy.

### What I threw away

I asked for a Three.js scroll world on the landing page. It worked: the paper became tables, pawns took their seats and the game moved from B to C. It also looked like a toy, with small pieces and handwriting you couldn't read. I told Claude the 3D looked bad and chose a replacement built from the real interface. The walkthrough on the homepage is now the actual screens.

### Reaching into Workflows

Workflows is in early access, so the agent worked from the docs, not from memory. Claude wrote the `inkshift-plan-change` definition (Reading, then Review, then Applied or Discarded) and its adapter, then hit its session limit before wiring the routes and interface. Codex picked up that working copy, connected proposal creation, readings, corrections, approval and discard to the engine, and deployed definition v1.

One detail from the docs shaped the design: the engine's checks are advisory, and only the Content Lake enforces anything. So the server still rechecks revisions, seats and the time slot before it writes, and a registration that arrives during review invalidates the stale proposal. Codex also added recovery for a plan decision whose workflow follow-up fails.

### Writing this post

I pushed back on two drafts: "you've to establish it as completed product not incomplete" and "why'd you talk about how we made it instead of what product and how it uses sanity". That's why the post opens with the product. The build story lives here.

### What is still unverified

Real handwriting (every image test used rendered typed sheets) and camera access on physical phones. The domain tests cover relocation, full destinations, identity ambiguity, cropped photos, time conflicts and capacity cuts: 31 tests in all. A live race for the last place produced exactly one winner, and five booking IDs survived a relocation.

## Sanity Project Details

Project ID: `a5xdqsb7`  
Dataset: `production`  
Workflow: `inkshift-plan-change`, version 1

To use INKSHIFT for your own gathering, [create an event](https://inkshift.vercel.app), add its plan and share the participant invite. You can return through **Your gatherings**, or restore organiser access on another device with your private backup code.
