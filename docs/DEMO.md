# Recorded product walkthrough

[Watch the 43-second walkthrough on YouTube](https://youtu.be/xM5eC-q7t_0). Captured from the public app on September 22, 2026, then edited from real browser states with cursor motion. Network waits and guest-form entry are compressed. The recording uses a visibly labeled prepared sample; it does not demonstrate photographed handwriting.

It shows gathering setup, a saved organizer workspace, the practice plan, participant invite, a guest booking at Table B, approval of the move, the retained place at Table C, and the returning organizer list. The full API and browser records are in `evidence/product-hosted-browser-flow.json`, `evidence/hosted-product-http.json`, and `evidence/hosted-workflow-http.json`.

# Physical-paper demo script, about 90 seconds

Use a fresh event and a second browser. A hosted URL is needed for judges to scan the QR code from their own phones; `localhost` only reaches the computer running the server.

| Time | Show | Say |
| --- | --- | --- |
| 0–12 s | Play the illustrated paper → signup → review → relocation walkthrough. | “This is INKSHIFT. I want to keep planning on paper, even after people start signing up.” |
| 12–30 s | Start blank, upload the first physical paper photograph, review, approve. | “I photograph the tables, games, times and player limits. I check the reading before opening registrations.” |
| 30–45 s | Display the invite QR. Join Ticket to Ride on another phone. | “This is a real place. The count changes in the organizer.” |
| 45–68 s | Cross out Table B on the same sheet, photograph it, show the proposed move. Correct uncertainty visibly if needed. | “B is gone. Ticket to Ride still exists, and C is free until 7:30. The review proposes moving the same game.” |
| 68–80 s | Approve; show the participant's Table C booking and Content inspector ID. | “The table changed. The session and registration IDs did not.” |
| 80–90 s | Reopen the saved review to show Reading → Review → Applied. | “If the move cannot fit, approval stays blocked until I fix the plan.” |

## Prepare the physical sheet

Write all three spaces and their limits: A 4, B 4, C 6. Write Catan at A, 18:00–19:30, four players; Ticket to Ride at B, 18:00–19:30, four players; Wavelength at C, 19:30–20:30, six players. Keep the whole sheet in both photographs. Cross out the table label only; keep the game's name visible so it is clear the game is moving rather than being canceled.

Rehearse this with actual handwriting before recording. The completed automated image test used rendered typed sheets and one correction. Do not describe that as a completed handwriting test.

## Reproducible fallback demonstration

Choose **Try a sample**, join a game through its invite, and choose **Use the crossed-out example**. Say that the reading is prepared. This proves registration, reconciliation and persistence, while the image reader needs a separate photo demonstration. The interface already labels the distinction.

The real Sanity race report is in `docs/evidence/live-sanity.json`. Do not claim that a staged two-phone join establishes concurrency correctness; use that report for the one-seat race result.
