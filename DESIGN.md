---
name: INKSHIFT
description: "A paper plan becomes a gathering, with every place kept in view."
colors:
  ground: "#f5f6ef"
  white: "#fffefa"
  ink: "#213c2d"
  forest: "#253f2d"
  muted: "#63705d"
  line: "#dce2d4"
  mint: "#eaf0e2"
  citron: "#d9ed83"
  focus: "#648d3e"
  control-white: "#fff"
  walkthrough-paper: "#fffef8"
  supporting-ink: "#52634c"
typography:
  display:
    fontFamily: "Archivo, sans-serif"
    fontSize: "clamp(48px, 5.5vw, 80px)"
    fontWeight: 500
    lineHeight: 1.03
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Archivo, sans-serif"
    fontSize: "clamp(32px, 3.6vw, 48px)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  event-title:
    fontFamily: "Archivo, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  section-title:
    fontFamily: "Archivo, sans-serif"
    fontSize: "25px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  session-title:
    fontFamily: "Archivo, sans-serif"
    fontSize: "21px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  story-body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: "Manrope, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.4
rounded:
  paper: "0px"
  tag: "4px"
  field: "6px"
  button: "7px"
  surface: "8px"
  paper-stage: "9px"
  form-panel: "10px"
  panel: "12px"
  walkthrough: "16px"
spacing:
  "4": "4px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  "32": "32px"
components:
  button-primary:
    backgroundColor: "{colors.citron}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "11px 18px"
  button-primary-hover:
    backgroundColor: "#c8e24a"
  button-dark:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.control-white}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "11px 18px"
  button-dark-hover:
    backgroundColor: "#2e553d"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "11px 18px"
  button-secondary-hover:
    backgroundColor: "{colors.mint}"
  button-text:
    textColor: "{colors.ink}"
    padding: "9px 0"
  button-icon:
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
  input:
    backgroundColor: "{colors.control-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
    height: "44px"
    width: "100%"
  availability-open:
    backgroundColor: "#e8f0da"
    textColor: "#4d6c3d"
    rounded: "{rounded.tag}"
    padding: "4px 8px"
  availability-full:
    backgroundColor: "#f1e7d9"
    textColor: "#806048"
    rounded: "{rounded.tag}"
    padding: "4px 8px"
  participant-session:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "23px"
  participant-session-joined:
    backgroundColor: "#eff4e7"
  paper-stage:
    backgroundColor: "#e5eadf"
    rounded: "{rounded.paper-stage}"
    padding: "28px 22px 16px"
  evidence-region:
    rounded: "3px"
    padding: "0"
  landing-launch:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.control-white}"
    rounded: "{rounded.button}"
    padding: "13px 22px"
  walkthrough:
    backgroundColor: "#e9ede1"
    rounded: "{rounded.walkthrough}"
  walkthrough-paper:
    backgroundColor: "{colors.walkthrough-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.paper}"
    padding: "23px 28px 19px"
  walkthrough-ledger:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "26px 27px 20px"
  workflow-progress:
    backgroundColor: "#eff3e8"
    textColor: "{colors.ink}"
    padding: "22px 28px"
  saved-review-row:
    textColor: "{colors.ink}"
    padding: "14px 10px"
    width: "100%"
---

# Design System: INKSHIFT

## Overview

**Creative North Star: "Community-centre reservation ledger"**

Daylit mineral-white surfaces, forest-green type and a citron action color. Manrope prose, sturdy Archivo headings, fine table rules, squared paper corners and generous gutters. People counts use tabular figures. The working interface gives the source sheet and the chronological ledger comparable visual weight.

The landing carries the same source-and-result relationship into an inspectable DOM walkthrough. Its ruled sample sheet and shared-plan illustration keep game and people identities visible through an edit. The organizer and participant screens are denser and operational; review progress and saved outcomes use the same quiet fields, explicit text and fine rules.

**Key Characteristics:**

- Forest ink on pale mineral and paper surfaces.
- Citron for consequential actions and selected evidence; forest for launch and approval actions where implemented.
- Archivo headings, Manrope prose and tabular time and capacity figures.
- Fine ledger rules, softly rounded controls and square source sheets.
- Direct walkthrough controls, linked source evidence and written review outcomes.

This record describes the implemented system in `src/app/tokens.css`, `src/app/globals.css`, `src/components/landing.css`, and their current components. The user-selected landing composition remains in `.impeccable/surfaces/src-components-landing-tsx.md`. Unused earlier landing selectors in the global stylesheet are not part of this record.

**Evidence scope:** The September 22 refresh used current source and supplied desktop and phone-sized viewport captures of the landing, review and applied-outcome regions. Each capture establishes only its visible region. The applied-review capture predates the source's singular/plural copy correction; source is authoritative for that text. These records do not establish a full-page audit, physical-device behavior or handwriting-reader accuracy.

## Colors

The palette is pale mineral and warm paper, written in forest ink and punctuated with citron. Exact primitive values live in the frontmatter; the names below describe their implemented roles.

### Primary

- **Citron** (`citron`): primary actions, text selection, selected source evidence and the recurring mark behind the brand symbol.
- **Forest** (`forest`): dark action buttons, active ledger navigation and evidence tooltips.
- **Focus green** (`focus`): the shared keyboard outline.

**The Working Accent Rule.** Citron identifies the next action or the evidence being inspected. Pale neutral fields and fine rules carry the surrounding structure.

### Neutral

- **Mineral ground** (`ground`): the page field.
- **Warm paper** (`white`): source-paper surfaces, the illustrated ledger, secondary buttons and participant session surfaces.
- **Walkthrough paper** (`walkthrough-paper`): the landing's ruled example sheet.
- **Forest ink** (`ink`): main text, headings and the selected walkthrough step.
- **Muted leaf** (`muted`): secondary organizer prose, dates, locations and helper text.
- **Supporting ink** (`supporting-ink`): landing explanations, workflow details and saved-review metadata.
- **Ledger rule** (`line`): field borders, row dividers and restrained panel boundaries.
- **Mint** (`mint`): quiet selection and hover fields, active schedule rows and small count containers.
- **Control white** (`control-white`): native form fields, sharing surfaces and reversed text on dark controls.

The walkthrough and workflow strip use closely related pale green fields. Completed workflow markers use a pale green fill; the current step uses forest ink and reversed white, and upcoming steps retain an outline. Availability, warnings and success use small contextual green or amber fields with explanatory text. These component values are preserved where implemented; they are not new brand accents.

## Typography

**Display and heading font:** Archivo, with a sans-serif fallback. **Body and control font:** Manrope, with a sans-serif fallback. Both are self-hosted through the application's font imports. There is no separate mono type system.

Archivo gives the names and major statements a sturdy, open shape. Manrope keeps the dense schedule and small supporting details distinct. The landing's two-line promise uses color for emphasis while preserving the same type family.

### Hierarchy

- **Display:** the landing introduction; its fluid desktop scale is recorded as `display`.
- **Headline:** the landing explanation and closing invitation, recorded as `headline`.
- **Event title:** the organizer's gathering name, recorded as `event-title`.
- **Section title:** review and participant-section headings, recorded as `section-title`.
- **Session title:** the organizer row's focusable game name, recorded as `session-title`.
- **Body:** inherited UI prose, with a more open `story-body` treatment for the landing introduction.
- **Label:** compact time, source, status and helper metadata. The active capacity tags and narrow-screen header link retain this readable supporting scale.
- **Button:** the shared filled and bordered action treatment, recorded as `button`.

The participant event title is larger than the organizer title (45 px, reducing to 41 px on narrow layouts); participant game titles use 26 px. These are surface-specific applications of Archivo, not an additional font system. Landing introductory copy has a restrained measure (390 px on desktop); functional helper text generally stays within its column. Workflow titles and saved-review names use 13 px Manrope, with 11 px metadata; their plain-language labels carry the state.

**The Ledger Type Rule.** Archivo names the gathering and its sessions; Manrope explains actions and state. Times and capacity figures align with tabular numerals.

## Layout

The organizer is a centered ledger with a maximum width of 1280 px, 32 px horizontal padding and 40 px top padding. The source and schedule columns use `minmax(0, 0.94fr)` and `minmax(0, 1fr)` with a 52 px gutter. Photograph and upload controls sit above the paper, followed by the hint and manual-entry action. Schedule rows organize time, game, location and remaining capacity without separate floating card shells.

At 1050 px and below, the gutter contracts to 30 px and the outer padding to 27 px. At 760 px and below, the columns stack with a 34 px gap and 21 px outer gutters; review source and results also stack and the review image stops being sticky. Event headings and utility rows wrap. The participant flow stays centered within 630 px with 28 px desktop gutters, reduced to 20 px on phones. Its retained bookings sit above the name field and available sessions.

The landing follows normal document flow within a 1440 px maximum width and 64 px main gutters. The introduction has a `1.35fr 1fr` split with a 60 px gap; a broad workbench follows it. Inside the workbench, paper and ledger use `1fr 1.12fr` with a 68 px gap. A shared toolbar holds the four-step selector and play/pause control, and the caption below the comparison labels the example.

At 1100 px and below, landing gutters become 36 px and the workbench gap contracts to 42 px. At 760 px and below, the introduction and paper/ledger comparison stack with 20 px outer gutters. Step controls become a two-column grid; the play control keeps an accessible name while its visible word is hidden. The transfer arrow is hidden, the caption stacks, and the closing invitation becomes a vertical layout. The same paper, review and registration content remains available in this flow.

The landing display becomes 58 px at the compact breakpoint, then `clamp(39px, 8.5vw, 58px)` with a 1.06 line height on phones. Explanation and closing headings use 33 px on phones. Organizer session titles also have deliberate narrow-layout sizes. Native inputs use at least 16 px text in phone layouts.

Workflow progress is a horizontal three-stage list above the review contents. At 650 px and below, the stages stack with an 18 px gap, the strip uses 18 px padding, and retry notices stack their action below the explanation. Saved reviews sit below the active or settled review as full-width rows with the source and timestamp opposite the written outcome. The frontmatter spacing entries are recurring observed steps; they do not claim that every gap is a multiple of one base unit.

## Elevation & Depth

The working screens use tonal layering and fine rules. Paper is the exception: a diffuse shadow separates the uploaded sheet from its mineral support and lifts the slightly rotated illustrative sheet. The illustrated participant confirmation also has a soft shadow so it reads as feedback over the ledger. Controls and participant cards have no resting shadow.

### Shadow Vocabulary

- **Source paper:** `0 9px 28px #283c2917`; used by the photograph container.
- **Walkthrough paper:** `0 8px 24px #34462b12`; used by the example sheet, rotated by −1.5 degrees.
- **Illustrated join confirmation:** `0 10px 30px #213c2d26`; used by the temporary participant confirmation over the example ledger.
- **Arrival feedback:** a temporary light green background and diffuse glow accompany an updated location. This is state feedback, not panel elevation.

**The Paper Depth Rule.** Give physical paper a soft shadow. Separate working panels with tonal fields and fine rules; keep buttons and session cards flat at rest.

The walkthrough starts paused and advances only through a selected step, the example's apply action or the visitor's play control. Playback advances every 3.5 seconds and stops at the fourth step; selecting a step stops playback. The join confirmation enters briefly and the preserved session receives a short color transition. Native page scrolling remains independent of the walkthrough.

Reduced motion removes CSS transitions, animations and smooth scrolling. Walkthrough selections display their states directly, and optional play still advances through the same static states. Opening an organizer review scrolls instantly under reduced motion; updated locations retain a static highlight. The sidecar records the implemented motion values.

## Shapes

The page's paper has square corners. Small controls are gently rounded; tags are tighter than fields and buttons, while participant and review panels have the broader `panel` radius. The landing workbench and closing invitation use the `walkthrough` radius. The paper support has its own modest radius and never rounds the photographed sheet itself. One-pixel ledger rules supply structure; active tabs and walkthrough steps use a two-pixel lower rule.

Circles belong to capacity dots, status indicators, numbered walkthrough steps and workflow markers. The brand tile and participant welcome symbol have a slight rotation. The illustrative source sheet uses a small rotation while its text stays legible. SVG strokes provide functional icons; a character glyph is not the icon language.

## Components

### Buttons

Actions are flat, compact and explicit. Shared controls use the `button` radius, a minimum height of 44 px and a 10 px icon gap. Primary actions use citron and dark text; dark actions use forest and white text; secondary actions use warm paper and a ledger border. Hover changes the fill, without a hard shadow or lift. The landing's dark launch action uses a 50 px minimum height, reducing to 46 px on phones; the shared large variant remains 54 px where used.

Text actions have no fill, and underline on hover. Icon actions have a quiet mint hover field and a minimum 36 px footprint. Disabled actions reduce opacity and show the disabled cursor. All keyboard-focusable actions share a visible focus-green outline (3 px, with a 4 px offset).

### Chips

Remaining capacity is a compact rounded tag: open places use a pale green field and full sessions use a warm neutral field. The written count or the word “Full” always carries the state. The tag does not behave as a filter or button. Count badges within ledger navigation have a mint field and remain subordinate to the label.

### Cards / Containers

Participant sessions use the `participant-session` surface and a fine border, with time and table across the top, a named game in the middle and capacity beside the join action. Joined sessions change both their fill and border and expose “You’re in” text. The retained-bookings region has a separate pale green field. Review and invite panels follow the same restrained border-and-tone approach.

### Inputs / Fields

Fields are white with a ledger border, the `field` radius and a forest caret. Text and select controls share their visual shape. Keyboard focus uses the global outline. A missing participant name changes the containing panel's border and fill while keeping an explicit written prompt. Dense draft fields are shorter on desktop; mobile text grows to preserve comfortable entry. Labels remain visible above editable values.

### Navigation

The organizer uses a small inline group with a lower rule under the pressed view, darker text and a heavier weight. The people count stays beside its label. The walkthrough uses four numbered buttons in a named group with `aria-pressed` state; its selected number is filled and the label underlined. Play/pause has an explicit accessible name. The brand remains a home link and a skip link appears on keyboard focus.

### Paper-to-ledger walkthrough

A ruled example sheet and a corresponding shared plan show four stages: read the plan, people join, review the edit, and keep the people. Ticket to Ride begins at Table B. Four named illustrative registrations appear, then the paper crosses out Table B and the ledger shows a proposed move to Table C. The review displays the before/after location and preserved registrations; “Apply this example” selects the final illustrated state. It does not approve a real organizer proposal.

The fourth state changes the location while retaining the same four names and count. A polite live caption explains each step, and the caption area continuously identifies the content as an illustrated example with no photo being read. Launch actions above and below the workbench open the working sample; the separate photo action opens a blank organizer workspace. Busy and failure copy belongs to those real launch actions.

### Source-to-schedule evidence

The source photograph sits inside the paper support and keeps its original aspect ratio. Invisible-at-rest evidence buttons are placed in source coordinates; hover or keyboard focus reveals a translucent citron region, a green outline and its session label. The corresponding session row receives a mint field. The session name is itself a focusable button, so this relationship also works from the ledger. Captions distinguish an example sheet from an organizer photograph, and the full-size source link stays visible.

### Review and outcome feedback

The pending review places its proposed source beside a list of changes. Preserved registrations, conflicts and stale-plan notices have distinct fields and written explanations before the approval controls. Corrections must be rechecked before approval. Busy, conflicted, stale, unavailable-workflow or disallowed-workflow states disable approval; discarding keeps the current plan. Errors and loading states keep their text and semantic status or alert roles. A saved relocation briefly highlights its location; reduced motion leaves a static highlight instead of movement.

The workflow strip uses an ordered list for Reading, Review and the outcome. Done markers contain checks on pale green, the current marker uses a dark fill with `aria-current="step"`, and upcoming markers stay outlined. Pending reviews label the future outcome “Applied or discarded.” Settled reviews show either “Changes applied.” with the recorded preserved-registration count or “Current plan kept.” with an explicit discarded explanation. Their receipt lists the reviewed changes and provides no repeat approval control.

A native disclosure labeled “Review record · Sanity Workflows” contains change, unresolved-check and affected-registration counts plus the record identifier and definition version. It explains the recorded callers without displacing the organizer's decision. Identifiers wrap instead of widening the panel. If the workflow record is unavailable, a written warning and “Retry workflow” action replace the progress strip; the message distinguishes an unapplied review from a saved decision whose workflow record needs to catch up. A local review explicitly states that Sanity is needed to record workflow history.

### Saved reviews

A ruled list shows the latest 20 reviews by source label and timestamp, with “Awaiting review,” “Applied” or “Discarded” text and an opening arrow. Each full row is a button that reopens the review; mint hover, global focus and disabled-busy feedback follow existing controls. An unavailable list produces a written retry instruction. Settled receipts remain distinct from the live plan, so a past proposal is not presented as current editable data.

## Do's and Don'ts

### Do:

- Do keep the source paper and its matching session visually connected on hover and keyboard focus.
- Do place photograph and upload controls before the source sheet in the organizer column.
- Do use real text for time, capacity, connection state, uncertainty and preserved registrations; color and dots supplement it.
- Do retain the same paper, game and player identities across all four illustrated walkthrough states.
- Do keep walkthrough steps directly selectable and preserve visible keyboard focus and reduced-motion state changes.
- Do label sample sheets and illustrated registrations where they appear.
- Do distinguish awaiting, applied, discarded, unavailable and local review states with explicit text and the appropriate available actions.

### Don't:

- Don't add decorative eyebrows above the landing headings.
- Don't add hard offset shadows to actions or promote ambient paper shadows into a general card style.
- Don't replace the ledger's fine rules with a grid of decorative cards in the organizer schedule.
- Don't make playback a prerequisite for inspecting a walkthrough state or opening the organizer.
- Don't present the illustrated apply action as a saved change to a real event.
- Don't treat viewport screenshots as evidence of physical-phone performance or photo-reader accuracy.

## September 23 presentation refinement

The existing paper-and-ledger world is retained. Shared tokens now name supporting ink, paper, walkthrough ground, toolbar and rule colours. The desktop intro uses 44px top and 40px bottom padding to bring the demonstration forward. Walkthrough annotations have an 11px minimum; mobile step buttons have a 44px minimum height. On phones, session times use their own line, and the redundant decorative avatar initials are hidden while the names remain in text.

The pre-invitation questions use native, independently openable disclosures with fine ledger rules, 15px summaries and 14px answers. Keyboard focus uses the existing global focus treatment. Chevron rotation respects reduced motion. The About page explains the link between stable bookings and Sanity's content, review and subscription roles. Component inspiration and attribution are recorded in docs/PRESENTATION-STRATEGY.md; no third-party component code or raster assets were imported.
