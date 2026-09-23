---
title: "INKSHIFT: keep the bookings when the plan changes"
published: false
description: "A plan becomes a signup page. When a session moves, the people who booked it keep their places. Built with Sanity Content Lake, App SDK and Workflows."
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16).*

## What I Built

You're organising a games night. People have picked their games and booked their places.

Then Table B becomes unavailable. There is room for Ticket to Ride at Table C, but the people joining it already have a booking that says Table B.

I built INKSHIFT so the organiser can approve that move and keep those bookings. You can [try it now](https://inkshift.vercel.app) without creating an account.

INKSHIFT turns a small-event plan into a shared signup page. You can use it for a games night, a club meetup or a workshop, then keep managing the same gathering as the plan changes.

Sanity holds the relationships that make that possible. Content Lake stores the sessions and their registrations, Workflows records the review, and App SDK subscribes to the shared schedule. The table can change while the session and its bookings keep their IDs.

### Start with the plan you already have

Create a gathering, give it a name and choose its date and time zone. Upload a photo of the plan, or type it in. Check the sessions, spaces, times and player limits before opening registrations.

Once you're happy with the plan, share the invite link. Your guests pick a session and join without creating an account. Their places appear in the organiser's workspace.

You can come back through **Your gatherings** to manage the event. A private backup code lets you restore organiser access on another device, so keep that code separate from the invitation you send to guests.

### Move the game with its bookings

Ticket to Ride is still the same game, at the same time, with the same people. It needs another table.

In Sanity Content Lake, the table, session and registration are separate linked records. Each booking belongs to the session's stable ID. Moving the session to Table C changes its table reference, and the bookings stay attached to it.

```text
Registration → Session → Space
                   │
              same session ID
              Table B → Table C
```

The [schema](https://github.com/himanshu748/inkshift/blob/main/sanity/schemaTypes.ts) makes those relationships explicit. A table label is allowed to change without becoming a new booking destination.

The app checks that C has enough seats and is free for the whole session. You see the proposed move and the affected registrations before approving it. If the move cannot fit, approval stays blocked while you correct the plan.

![INKSHIFT's illustrated walkthrough showing a table move and preserved registrations](https://raw.githubusercontent.com/himanshu748/inkshift/main/docs/images/product-review.jpg)

The landing-page illustration shows how a table move affects existing registrations.

### You decide when the change goes live

Uploading an edited plan opens a review. The reading can be corrected before it changes anyone's booking.

Sanity Workflows keeps that review as a saved process alongside the proposal in Content Lake. It moves through Reading, Review and either Applied or Discarded. You can approve the change, discard it or reopen a completed review later to see the decision.

Someone might join the game while you're still deciding where to move it. INKSHIFT checks the event and proposal revisions before saving. If the registrations have changed, it asks you to recheck the move against the current bookings.

The approved plan, linked records and public schedule are saved together in one Content Lake transaction. App SDK subscribes to the public schedule and booking counts. When its version changes, the organiser workspace refreshes its private data through an authorised server route. The content inspector lets you see the session's ID alongside its current table and booked places.

That public view contains the schedule and counts. Participant names, uploaded photos and organiser access data remain behind authorised server routes. The Sanity write token stays on the server.

## Demo

[Try INKSHIFT](https://inkshift.vercel.app) or watch the 43-second walkthrough:

{% embed https://www.youtube.com/watch?v=xM5eC-q7t_0 %}

To try the move yourself, choose **Try a sample** and join Ticket to Ride through its participant invite. Return to the organiser, select **Use the crossed-out example**, review the move and approve it. Reopen the participant page to see your booking at Table C.

The video uses a labeled prepared sample with a fixed reading. Separate photo-reader checks used rendered typed sheets.

## Code

[Source and setup instructions](https://github.com/himanshu748/inkshift)

INKSHIFT uses Next.js and React, with Qwen3-VL through Hugging Face Inference Providers for photo reading. The [verification record](https://github.com/himanshu748/inkshift/blob/main/docs/VERIFICATION.md) covers booking preservation, concurrent changes, access recovery and private-data checks.

## My Build Process

I used Codex and Claude Code to build INKSHIFT. The main schema decision was to give spaces, sessions and registrations their own identities. A new reading has to reconcile with the existing gathering, because replacing the schedule wholesale would lose the connection to people who already joined.

In a typed-image test, the reader treated a booked game as removed. The correction step let me match it back to the original session before approval, and I verified that the booking survived the move. That check is part of the normal product flow.

I also checked what happens when someone joins during a review. Approval uses Content Lake revision guards and recomputes the constraints against the current event. A stale proposal has to be reviewed again. Workflows records the process; the server enforces who may approve and whether the move is valid.

## Sanity Project Details

Project ID: `a5xdqsb7`, dataset: `production`. The deployed workflow is `inkshift-plan-change`, version 1.

[Create your own gathering](https://inkshift.vercel.app), add the plan and share the signup link with your guests.
