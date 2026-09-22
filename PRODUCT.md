# INKSHIFT

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Delegated by the user ("anything works"). Next.js with TypeScript, React, Sanity Content Lake, an App SDK organizer extension, and server-side image interpretation. Use Sanity for the working domain model, not a decorative integration. No arbitrary generated code.

## Users
Organizers of small games nights, clubs, and workshops who already plan on paper. Participants join a specific session from a phone. DEV Sanity Challenge judges must be able to reproduce the workflow independently.

## Product Purpose
A photographed handwritten event plan becomes a working signup application. A later photograph proposes changes to that same event while preserving session identities and registrations.

## Operating Context
Single event domain: tables/spaces, timed game sessions, capacities, and registrations. Photographs are reviewed before creating or changing a live plan. Organizers approve meaningful updates; participants see the current location and availability. Example plans are clearly labeled samples.

## Capabilities and Constraints
Tables and sessions are different records. Registrations refer to session identity, not a label or location. Matching uncertainty and missing photo regions require review. Capacity, resource occupancy, authorization, and optimistic concurrency are enforced on the server. Photographs propose data; they never execute instructions or code. No payments, arbitrary app generation, or automatic cancellation of registrations. Support current desktop and mobile browsers.

## Brand Commitments
Name: INKSHIFT. Brief: "Draw it. Photograph it. Run it." Build directly in code using Impeccable. Do not create concept images or pause for additional concept approval. Plain, factual copy.

## Evidence on Hand
User-approved concept and verified official DEV Sanity Challenge Path Two rules. No real handwritten source photos were supplied. Vision extraction and live Sanity integration are unverified at project start; fixture data must never be presented as live image interpretation.

## Product Principles
- Preserve what people have already done.
- Make uncertainty visible before applying changes.
- Keep the paper and each extracted detail connected.
- Show a reproducible useful action in the first screen.
- Distinguish local, sample, and live provider behavior.
