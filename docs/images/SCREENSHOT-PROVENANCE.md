# Product screenshots — 23 September 2026

Captured with the Codex browser tools. Native viewport JPEGs, without generated pixels or compositing. Prepared sample event `R0iAF4iqlv8l_g`; the sample sheet is typed and labelled. A demo booking was created through the participant UI, then preserved through an approved move. No private organiser code or real attendee data is visible.

| File | Source | Visible evidence |
| --- | --- | --- |
| review-booking-kept.jpg | Local production build, organiser review | Pending Table B to Table C proposal with one registration retained; Sanity Workflow review stage. The approval controls sit below the captured region. |
| participant-booking-kept.jpg | Local production build, participant page | Existing Ticket to Ride booking now at Table C after approval. |
| sanity-booking-inspector.jpg | Hosted inkshift.vercel.app inspector | App SDK connected, revision 2, session-1-1 at Table C, 1/4 joined. |

The organiser and participant screenshots use the updated local UI backed by the configured Sanity project. The inspector uses the existing public deployment. They do not establish handwritten-photo accuracy or physical-device behaviour. The latest frontend deployment still requires Vercel sign-in.

# Time machine screenshots, 25 September 2026

Captured with headless Chrome for Testing (puppeteer-core) at 1440x900 against a local production build (`next start`) backed by the configured Sanity project. Prepared sample event `Ho0Qanz5yJis4g`. The guest "Ada" joined Ticket to Ride through the participant UI in a separate browser context; the organiser then applied the crossed-out example and the rename example.

| File | Source | Visible evidence |
| --- | --- | --- |
| time-machine-v1.png | Organiser workspace, version 1 of 3 | Original sheet; Ticket to Ride at Table B with one booking token (AD). |
| time-machine-moving.png | Organiser workspace, 250 ms after moving from version 1 to 2 | Ticket to Ride card mid-flight into Table C carrying the same token; Table B crossed out; Workflow run stage applied. |
