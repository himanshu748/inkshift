---
title: "INKSHIFT: move the game, keep the bookings"
published: false
description: "Turn a small-event plan into a signup page, then move sessions without losing bookings. Built with Sanity Content Lake, App SDK and Workflows."
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16).*

## What I Built

INKSHIFT turns a small-event plan into a shared signup page. Organizers can upload a photo or type a plan, check the sessions and player limits, and invite people to join.

It is built for games nights, clubs and workshops where plans can change after people have booked. If Ticket to Ride needs to move from Table B to Table C, the organizer reviews and approves the move. The people who joined keep their bookings and see the new table.

Each gathering has a name, date and time zone. Guests join through an invite link without creating an account. Organizers can return to their saved gatherings and use a private backup code to restore access on another device.

Before applying a change, INKSHIFT checks seats, time conflicts and session identity. The review shows what will change and which registrations it affects. The organizer can correct the reading, approve it or discard it.

Sanity handles three parts of that experience:

- Content Lake stores the linked plan, sessions and bookings, so a move preserves the existing registrations.
- App SDK keeps the organizer workspace connected to changes in the schedule and booking counts.
- Workflows records each proposed change, the organizer's review and the final decision.

## Demo

[Try INKSHIFT](https://inkshift.vercel.app) or [watch the 43-second walkthrough](https://youtu.be/xM5eC-q7t_0).

{% embed https://www.youtube.com/watch?v=xM5eC-q7t_0 %}

To try the table move yourself:

1. Choose **Try a sample** and open its participant invite.
2. Join Ticket to Ride at Table B.
3. Return to the organizer workspace, choose **Use the crossed-out example**, review the affected booking and approve the move.
4. Reopen the participant page. The booking is still there, now at Table C.

The video uses a labeled prepared sample with a fixed reading. Separate photo-reader checks used rendered typed sheets. To create your own gathering, choose **Plan a gathering** and add a photo or type the plan.

![INKSHIFT review showing a proposed session move and its affected registrations](https://raw.githubusercontent.com/himanshu748/inkshift/main/docs/images/product-review.jpg)

The review puts the proposed move and affected registrations together before the organizer approves it.

## Code

[Source and setup instructions](https://github.com/himanshu748/inkshift)

The app uses Next.js and React, with Qwen3-VL through Hugging Face Inference Providers for photo reading. The [verification record](https://github.com/himanshu748/inkshift/blob/main/docs/VERIFICATION.md) covers preserved bookings, stale-review rejection, access recovery and private-data checks.

## My Build Process

I used Codex and Claude Code to build the Next.js app, starting with session IDs that survive plan changes. When a test reading lost a session's identity, I added an explicit correction step before approval. Sanity Workflows tracks that review through to the saved decision.

## Sanity Project Details

Project ID: `a5xdqsb7`, dataset: `production`.

### Keep bookings attached to the game with Content Lake

Content Lake stores gatherings, spaces, sessions, registrations, photos and change proposals as linked records. A registration points to a session's stable ID. Moving Ticket to Ride changes the session's table while existing registrations keep pointing to that session.

The app updates the event, linked records and public schedule together in a revision-checked Content Lake transaction. If another guest joins while the organizer is reviewing a move, the old review becomes stale. The organizer rechecks it against the current registrations before approving.

### Keep the organizer view current with App SDK

App SDK watches a public projection containing the schedule and counts. A change tells the organizer workspace to refresh its authorized data. The content inspector reads the projection directly, so you can see a session's stable ID, current table and booked places. Participant names, uploaded photos and organizer access data stay in private documents behind authorized server routes.

### Review changes before they go live with Workflows

The deployed workflow is `inkshift-plan-change`, version 1. Each proposal has a saved workflow instance that moves through Reading, Review and either Applied or Discarded. The reader submits proposed changes; the organizer checks and corrects them. Unresolved checks block approval, and completed reviews remain available in the gathering's history.

The event transaction also saves the organizer's decision. If the workflow update is interrupted afterward, INKSHIFT resumes from that saved decision without applying the plan twice. The Sanity write token stays on the server.

[Open INKSHIFT](https://inkshift.vercel.app), choose **Plan a gathering**, and share the signup link with your guests.
