---
title: "INKSHIFT: move the game, keep the bookings"
published: false
description: "A small-event planner that keeps existing bookings when a session moves, with photo review and approval through Sanity Workflows."
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16).*

## What I Built

Four people sign up for Ticket to Ride at Table B. Then Table B becomes unavailable.

INKSHIFT gives organizers a shared signup page they can keep using when the plan changes. I built it for games nights, clubs and workshops where moving a session should preserve the people already booked into it.

An organizer creates a gathering with a name, date and time zone, then uploads a photo or types the plan. They check the games, tables, times and player limits before sharing a signup link. A later photograph creates a proposed change that they can correct, approve or discard. People who already joined keep their registrations when the same session moves.

The model proposes structured data. The app checks capacity, time conflicts and session identity before applying a change. Returning organizers can reopen their gatherings and save a private access code to restore access on another device.

## Demo

[Watch the 43-second product walkthrough on YouTube](https://youtu.be/xM5eC-q7t_0). It is edited from real browser states and uses the prepared sample described below.

{% embed https://www.youtube.com/watch?v=xM5eC-q7t_0 %}

[Open INKSHIFT](https://inkshift.vercel.app) and choose **Try a sample**. No account is needed. Open its participant invite, join Ticket to Ride, then return to the organizer and choose **Use the crossed-out example**. The review proposes moving the game from B to C. After approval, the participant page shows the same booking at Table C.

The landing walkthrough is an illustration, and the sample uses a fixed reading. Both are labeled. Photo-reader checks used rendered typed sheets. Choose **Plan a gathering** to start your own event; uploading a photo from its workspace calls the image reader.

![INKSHIFT demonstrates a paper edit and its proposed session move](https://raw.githubusercontent.com/himanshu748/inkshift/main/docs/images/product-review.jpg)

## Code

[Source and setup instructions](https://github.com/himanshu748/inkshift)

The app uses Next.js, React, Sanity Content Lake, Sanity App SDK, Sanity Workflows, Zod and Qwen3-VL through Hugging Face Inference Providers. The Sanity write token stays on the server.

Start with [`reconcile.ts`](https://github.com/himanshu748/inkshift/blob/main/src/lib/reconcile.ts) for identity and scheduling, [`service.ts`](https://github.com/himanshu748/inkshift/blob/main/src/lib/service.ts) for revision-checked writes, and [`plan-change.ts`](https://github.com/himanshu748/inkshift/blob/main/src/lib/plan-change.ts) for the workflow definition.

## My Build Process

The original brief asked for “a handwritten plan” that becomes “a working, multiplayer app,” then survives changes after people have started using it. I started in Codex, continued in Claude Code, and returned to Codex to finish the integration and test it.

I started with the data model. A table and a game needed different IDs. A booking points to a session, so the session can change tables without replacing the booking. Moving a game requires enough seats and an available table for its entire time slot. When no destination fits, approval stays blocked.

The photo reader was harder than the first screenshot suggested. The provider initially rejected the JSON schema for source boxes. Representing each box as a fixed-length array of numbers fixed that request.

The next failure affected an existing booking. In a test using two typed sheets, the edited sheet produced a reading that would have removed the booked game. Approval stayed blocked until I corrected the session match. The same booking then moved to Table C. I kept that correction step in the interface because an uncertain reading needs a person to check it.

I first asked for a Three.js scroll world on the landing page. Later I dropped it so the demonstration could show the paper, signup interface and approval directly. The replacement walks through four selectable steps. The live sample opens a separate practice gathering.

Claude began the Sanity Workflows integration before its session stopped. It had written the definition and engine adapter, but the API and UI still used the old approval path. I used Codex to connect those paths and add saved reviews. Prepared examples also got their own caller label so the history distinguishes them from photo readings.

The process now runs through Reading, Review and either Applied or Discarded. The reader submits the proposed changes and unresolved checks. The organizer corrects and approves through the same saved workflow instance. Completed reviews can be reopened from their history.

I also had to handle a partial failure. The event transaction can succeed while the workflow record fails to update. Repeating the entire operation could apply a decision twice. INKSHIFT saves the decision alongside the event update and uses it to resume the missing workflow action. The interface tells the organizer when the plan is saved but the workflow record needs a retry.

I tested that recovery with a simulated connection failure and the workflow engine's in-memory test bench. All 31 tests passed: 19 domain tests, six workflow tests and six tests for organizer access and returning to saved gatherings.

Against the deployed app, I checked that a new registration makes an open review stale. Rechecking it updated the affected count, and approval preserved the booking through the move. Discarding a conflicting proposal left the plan unchanged. The [dated verification records](https://github.com/himanshu748/inkshift/blob/main/docs/VERIFICATION.md) include those checks and the rejected requests for private review data.

My later instruction was “make sure it's like a product not a project.” I moved the sample behind a secondary action and added gathering setup, a returning-organizer list and access recovery. The private backup code lets someone manage the gathering on another device, so the interface tells organizers to keep it separate from the participant invite.

Testing that path exposed two defects. The date shown in the form could differ from the date submitted, so setup now reads the form's current values. Manual entry also inherited an unrelated sample photograph. I removed that fallback and checked that approving a typed plan creates no example-photo link.

## Sanity Project Details

Project ID: `a5xdqsb7`  
Dataset: `production`

Sanity Content Lake stores the event and linked spaces, sessions, registrations, photo revisions and proposals. Plan and registration updates write the public schedule projection in the same revision-checked transaction. Approval checks both the event and proposal revisions, so a new registration or another review edit can invalidate an old approval.

The organizer and content inspector use App SDK subscriptions for the public schedule and counts. Authorized server routes return private organizer data and each participant's own booking. The browser never receives the write token.

The deployed Workflows definition is `inkshift-plan-change`, version 1. Its instances sit alongside the proposals in Content Lake. The server records whether a step came from the photo reader, a prepared example or the organizer. Those labels describe application callers under one server credential. Server authorization and revision checks enforce access and protect writes.

INKSHIFT is live at [inkshift.vercel.app](https://inkshift.vercel.app). Choose **Plan a gathering**, add your plan and share the signup link with your guests.
