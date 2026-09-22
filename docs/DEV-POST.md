---
title: "I crossed out a table. INKSHIFT kept the registrations."
published: false
description: "A paper event plan becomes a signup app, with Sanity Workflows handling the review before an edit goes live."
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16).*

## What I Built

Four people sign up for Ticket to Ride at Table B. Then Table B becomes unavailable.

I wanted the organizer to cross out the table on their paper plan, photograph the edit, and move the game without asking everyone to sign up again. That is the demo behind INKSHIFT.

An organizer uploads a small-event plan, checks the extracted games, tables, times and player limits, then shares a signup link. A later photograph creates a proposed change. The organizer can correct the reading, approve it or discard it. The people who already joined keep their registrations when the same session moves.

I kept the scope to games nights, clubs and workshops. The model proposes structured data. The app renders a fixed interface and checks capacity, time conflicts and session identity before saving anything.

## Demo

[Open INKSHIFT](https://inkshift.vercel.app). Choose **Try a games night** to create your own sample event; no account is needed. Open its participant invite, join Ticket to Ride, then return to the organizer and choose **Use the crossed-out example**. The review proposes moving the game from B to C. Approve it and check the participant page: the booking is still there.

The landing walkthrough is an illustration. The prepared edit button uses a fixed reading. Both are labeled. **Start with your own photo** uses the real image reader instead.

![INKSHIFT demonstrates a paper edit and its proposed session move](https://raw.githubusercontent.com/himanshu748/inkshift/main/docs/images/product-review.jpg)

My image tests sent rendered typed sheets through the actual provider. The edited sheet produced a reading that would have removed a booked game. INKSHIFT blocked approval, and an explicit identity correction let the existing booking move to Table C. I have not yet validated photographed handwriting or recorded the physical-paper demonstration.

## Code

[Source and setup instructions](https://github.com/himanshu748/inkshift)

The app uses Next.js, React, Sanity Content Lake, Sanity App SDK, Sanity Workflows, Zod and Qwen3-VL through Hugging Face Inference Providers. Server credentials stay out of the browser and repository.

The most useful files to read are `src/lib/reconcile.ts` for identity and scheduling, `src/lib/service.ts` for revision-checked writes, and `src/lib/plan-change.ts` for the workflow definition.

## My Build Process

The original brief asked for “a handwritten plan” that becomes “a working, multiplayer app,” then survives changes after people have started using it. I built with Codex, continued in Claude Code, and returned to Codex to finish and verify the unfinished work.

I started with the data model. A table and a game needed different IDs. A booking points to a session, so the session can change tables without replacing the booking. Moving a game requires enough seats and an available table for its entire time slot. When no destination fits, approval stays blocked.

The photo reader was harder than the first screenshot suggested. The provider initially rejected the JSON schema for source boxes. Representing each box as a fixed-length homogeneous array fixed that request. The next failure mattered more: the second image sometimes lost a game's identity. I kept the conflict visible and added a review editor for matching the reading to an existing session. Cropped photos, missing games and deletions with registrations also require review.

I first asked for a Three.js scroll world on the landing page. Later I chose “Product-led, drop the 3D” so the demonstration could show the paper, signup interface and approval directly. The replacement keeps those objects visible through four selectable steps. Its play control walks through the sequence, and reduced-motion CSS removes the transitions. The live sample starts a separate event.

Claude began the Sanity Workflows integration before its session stopped. It had written the definition and engine adapter, but the API and UI still used the old approval path. During the takeover, I connected those paths, added saved reviews and gave prepared examples their own caller label. An example reading should not appear in the audit trail as an AI photo reading.

The process now runs through Reading, Review and either Applied or Discarded. The reader submits the proposed changes and unresolved-check count. The organizer rechecks corrections and approves through the same saved workflow instance. The interface shows those steps, and a closed review can be reopened from its history.

One failure needed special handling. The event transaction can succeed just before the workflow record fails to update. Repeating the entire operation could apply a decision twice. INKSHIFT saves the decision on the proposal alongside the event update, then uses that saved decision to resume the missing workflow action. The interface tells the organizer when the plan is saved but the workflow record needs a retry.

I tested that recovery with a simulated connection failure and the real workflow engine's in-memory test bench. The suite also checks blocked approval, corrections, discard, stale registrations, attribution and repeated reads. There are 25 tests in total, including the 19 domain tests from the earlier build.

The live HTTP check goes further: it creates a Sanity-backed event, joins a participant, opens a review, adds another participant, verifies that the review is stale, rechecks it and applies the move. It then discards a conflicting proposal and confirms that the plan stayed unchanged. Anonymous callers cannot open the saved reviews or read the private workflow instance directly from the dataset. The scripts and dated reports are in the repository.

## Sanity Project Details

Project ID: `a5xdqsb7`  
Dataset: `production`

Sanity stores the event aggregate and linked spaces, sessions, registrations, photo revisions and proposals. Domain writes update their public schedule projection in the same revision-checked transaction. Approval checks both the event and proposal revisions, so a new registration or another review edit can invalidate an old approval.

The organizer and content inspector use App SDK subscriptions to a public projection of the schedule and counts. Authorized server routes return private organizer data and each participant's own booking. The browser never receives the write token.

The deployed Workflows definition is `inkshift-plan-change`, version 1. Its instances sit next to the proposals in Content Lake. The server records whether each step came from the photo reader, a prepared example or the organizer. These are declared execution contexts under the same server credential; they are not separate Sanity user accounts. Server authorization and revision checks enforce the actual write boundary.

The local Studio schema is included. Remote schema and Studio deployment remain a handoff because the available token does not have those deployment permissions. Content Lake writes, App SDK subscriptions and workflow transitions have been tested separately. The next demonstration I need to record is the same full flow with physical handwriting and a participant on a second phone.
