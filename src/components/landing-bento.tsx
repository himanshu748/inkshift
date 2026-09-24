import { Check, CheckCheck, MapPin, Users } from "lucide-react";

const seats = ["A", "S", "J", "L"];
const reviewSteps = [
  { label: "Reading", note: "The photo becomes a proposal" },
  { label: "Review", note: "You check each change" },
  { label: "Applied or Discarded", note: "The outcome is saved" },
];

function MoveDemo() {
  return (
    <div className="mv" aria-hidden="true">
      <div className="mv-heads">
        <span>Table A</span>
        <span className="mv-crossed">
          Table B<i />
        </span>
        <span>Table C</span>
      </div>
      <div className="mv-lane">
        <small>6 PM</small>
        <div className="mv-chip" style={{ left: 0 }}>
          <div>
            <strong>Catan</strong>
          </div>
        </div>
        <div className="mv-chip mv-moving">
          <div>
            <strong>Ticket to Ride</strong>
            <span className="mv-people">
              {seats.map((s) => (
                <b key={s}>{s}</b>
              ))}
            </span>
          </div>
        </div>
      </div>
      <div className="mv-lane">
        <small>7:30 PM</small>
        <div className="mv-chip" style={{ left: "66.666%" }}>
          <div>
            <strong>Wavelength</strong>
          </div>
        </div>
      </div>
      <p className="mv-badge">
        <CheckCheck size={15} />4 bookings kept
      </p>
    </div>
  );
}

function SeatDemo() {
  return (
    <div className="seat" aria-hidden="true">
      <div className="seat-head">
        <strong>Ticket to Ride</strong>
        <span>
          <MapPin size={12} />
          Table B, 6 PM
        </span>
      </div>
      <div className="seat-row">
        {seats.map((s, i) => (
          <span key={s} className={`pop-${i + 1}`}>
            <b>{s}</b>
          </span>
        ))}
      </div>
      <div className="seat-count">
        <span className="seat-odometer">
          <span>
            {[0, 1, 2, 3, 4].map((n) => (
              <b key={n}>{n}</b>
            ))}
          </span>
        </span>
        /4 joined
        <Users size={14} />
      </div>
    </div>
  );
}

function ReviewDemo() {
  return (
    <ol className="flow" aria-hidden="true">
      {reviewSteps.map((step, i) => (
        <li key={step.label} className={`pop-${i * 2 + 1}`}>
          <span className="flow-mark">
            <Check size={12} strokeWidth={3} />
          </span>
          <div>
            <strong>{step.label}</strong>
            <span>{step.note}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Bento() {
  return (
    <section className="ink-bento-section" aria-labelledby="bento-title">
      <div className="ink-section-head" data-reveal>
        <h2 id="bento-title">
          A crossed-out table isn’t a cancelled night.
        </h2>
        <p>
          Each session keeps its identity through an edit, so the people who
          booked it move with it.
        </p>
      </div>
      <div className="ink-bento">
        <article className="ink-tile ink-tile-move" data-reveal>
          <MoveDemo />
          <div className="ink-tile-copy">
            <h3>Move a game. Keep its players.</h3>
            <p>
              Cross out Table B on the paper. Ticket to Ride moves to Table C,
              which is free for the full game.
            </p>
          </div>
        </article>
        <article className="ink-tile ink-tile-seat" data-reveal>
          <SeatDemo />
          <div className="ink-tile-copy">
            <h3>Seats fill from a link.</h3>
            <p>Guests pick a session on their phone. No account needed.</p>
          </div>
        </article>
        <article className="ink-tile ink-tile-flow" data-reveal>
          <ReviewDemo />
          <div className="ink-tile-copy">
            <h3>You approve every change.</h3>
            <p>
              The reader only proposes. Sanity Workflows keeps a record of each
              review.
            </p>
          </div>
        </article>
        <article className="ink-tile ink-tile-proof" data-reveal>
          <div className="ink-tile-copy">
            <h3>Records, not a picture.</h3>
            <p>
              Tables, sessions and registrations are separate Sanity documents.
              The session ID stays the same when its table changes.
            </p>
            <small>
              Screenshot of the hosted content inspector, 23 September 2026.
            </small>
          </div>
          <figure>
            <img
              src="/landing/content-inspector.jpg"
              alt="INKSHIFT content inspector showing session-1-1, Ticket to Ride, at Table C with 1 of 4 joined"
              width={1060}
              height={250}
              loading="lazy"
              decoding="async"
            />
          </figure>
        </article>
      </div>
      <p className="ink-bento-note">
        Tiles above are illustrated. The screenshot is from the real app.
      </p>
    </section>
  );
}
