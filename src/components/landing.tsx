"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  MapPin,
  Pause,
  Play,
  ScanLine,
  Users,
} from "lucide-react";
import { Header, api } from "./common";
import "./landing.css";

const steps = [
  "Read the plan",
  "People join",
  "Review the edit",
  "Keep the people",
];
const games = [
  { name: "Catan", table: "A", time: "6–7:30 PM", seats: 4 },
  { name: "Ticket to Ride", table: "B", time: "6–7:30 PM", seats: 4 },
  { name: "Wavelength", table: "C", time: "7:30–8:30 PM", seats: 6 },
];
const people = ["Alex", "Sam", "Jo", "Lee"];
const questions = [
  { question: "Do my guests need an account?", answer: "No. Share the participant link, and guests can choose a session and book a place. Keep your organiser backup code private; it gives access to manage the gathering." },
  { question: "What if the photo reader gets something wrong?", answer: "Check and correct the reading before you apply it. You can also type a plan yourself. A proposed change waits for your approval, and conflicts must be resolved before it can be saved." },
  { question: "What happens to people who already joined?", answer: "Their registration belongs to the session. If you approve a move to another table, those registrations stay with it. The review checks available seats and the full time slot before the move." },
];

function Walkthrough() {
  const [step, setStep] = useState(2);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    let next = 0;
    const timer = setInterval(() => {
      next += 1;
      setStep(next);
      if (next === 3) {
        clearInterval(timer);
        setPlaying(false);
      }
    }, 3500);
    return () => clearInterval(timer);
  }, [playing]);
  function choose(value: number) {
    setPlaying(false);
    setStep(value);
  }
  return (
    <section
      id="how-it-works"
      className="product-demo"
      aria-label="Illustrated product walkthrough"
      data-step={step}
    >
      <div className="demo-toolbar">
        <div className="demo-steps" role="group" aria-label="Walkthrough step">
          {steps.map((label, i) => (
            <button
              key={label}
              aria-pressed={step === i}
              onClick={() => choose(i)}
            >
              <span>{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <button
          className="demo-play"
          onClick={() => {
            if (playing) setPlaying(false);
            else {
              setStep(0);
              setPlaying(true);
            }
          }}
          aria-label={playing ? "Pause walkthrough" : "Play walkthrough"}
        >
          {playing ? <Pause size={17} /> : <Play size={17} />}
          <span>{playing ? "Pause" : "Play"}</span>
        </button>
      </div>
      <div className="demo-stage">
        <div className="demo-source">
          <div className="demo-pane-label">
            <Camera size={16} />
            <span>Your paper</span>
            <span>{step >= 2 ? "A small change" : "Where it starts"}</span>
          </div>
          <div className="demo-sheet">
            <div className="sheet-topline">
              <span>Sunday games club</span>
              <span>6 PM</span>
            </div>
            <h2>
              A table for <br />
              every game.
            </h2>
            <div className="sheet-rows">
              {games.map((game, i) => (
                <div
                  key={game.name}
                  className={i === 1 && step >= 2 ? "sheet-crossed" : ""}
                >
                  <span>
                    {game.name}
                    <small>
                      {game.time} · {game.seats} people
                    </small>
                  </span>
                  <strong>Table {game.table}</strong>
                </div>
              ))}
            </div>
            <div className="sheet-foot">
              {step >= 2 ? (
                <>
                  <span className="paper-note">Table B is unavailable.</span>
                  <span>Keep the games going.</span>
                </>
              ) : (
                <>
                  <span>Bring a game.</span>
                  <span>Bring a friend.</span>
                </>
              )}
            </div>
          </div>
          <span className="demo-transfer" aria-hidden="true">
            <ArrowRight size={25} />
          </span>
        </div>
        <div className="demo-result">
          <div className="demo-pane-label">
            <ScanLine size={16} />
            <span>{step === 2 ? "Your review" : "Your shared plan"}</span>
            <span>INKSHIFT</span>
          </div>
          <div className="demo-ledger" key={step === 2 ? "review" : "schedule"}>
            {step === 2 ? (
              <>
                <div className="demo-ledger-heading">
                  <h3>Check the change.</h3>
                  <p>Your plan stays as it is until you approve.</p>
                </div>
                <div className="demo-review-diff">
                  <span>Ticket to Ride</span>
                  <div>
                    <del>Table B</del>
                    <ArrowRight size={24} />
                    <strong>Table C</strong>
                  </div>
                  <p>Available for the full game, 6–7:30 PM.</p>
                </div>
                <div className="demo-people">
                  <CheckCheck size={20} />
                  <div>
                    <strong>4 registrations preserved</strong>
                    <span>Alex, Sam, Jo and Lee keep their places.</span>
                  </div>
                </div>
                <button
                  className="button dark demo-approve"
                  onClick={() => choose(3)}
                >
                  Apply this example
                  <Check size={17} />
                </button>
              </>
            ) : (
              <>
                <div className="demo-ledger-heading">
                  <h3>Sunday games club</h3>
                  <p>
                    {step === 3
                      ? "Updated plan. Same gathering."
                      : "Choose a game. Save your place."}
                  </p>
                </div>
                <div className="demo-sessions">
                  {games.map((game, i) => (
                    <div
                      key={game.name}
                      className={`demo-session ${i === 1 && step >= 1 ? "demo-session-kept" : ""}`}
                    >
                      <div>
                        <strong>{game.name}</strong>
                        <span>
                          <MapPin size={12} />
                          Table {i === 1 && step === 3 ? "C" : game.table}
                          <span className="demo-time">{game.time}</span>
                        </span>
                      </div>
                      <span className="demo-seat-count">
                        {i === 1 && step >= 1 ? 4 : 0}/{game.seats}
                        <Users size={13} />
                      </span>
                    </div>
                  ))}
                </div>
                <div className="demo-people">
                  {step === 0 ? (
                    <>
                      <ScanLine size={21} />
                      <div>
                        <strong>Paper becomes a plan.</strong>
                        <span>Names, times, tables and places to join.</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="demo-avatars" aria-hidden="true">
                        {people.map((name) => (
                          <span key={name}>{name[0]}</span>
                        ))}
                      </div>
                      <div>
                        <strong>
                          {step === 3
                            ? "Same four people. New table."
                            : "Four friends are in."}
                        </strong>
                        <span>Alex, Sam, Jo and Lee · Ticket to Ride</span>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          {step === 1 && (
            <div className="demo-phone">
              <Check size={17} />
              <div>
                <strong>You’re in, Alex.</strong>
                <span>Ticket to Ride · Table B</span>
              </div>
              <span>Joined from a phone</span>
            </div>
          )}
        </div>
      </div>
      <div className="demo-caption">
        <p aria-live="polite">
          {
            [
              "One photograph becomes a plan people can join.",
              "A link on their phone. A place at your table.",
              "Cross out a table. Check where its game can go.",
              "The game moves to Table C. Nobody signs up again.",
            ][step]
          }
        </p>
        <span>Illustrated example · no photo is being read</span>
      </div>
    </section>
  );
}

export function Landing() {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function start() {
    setBusy("sample");
    setError("");
    try {
      const next = new Date();
      next.setDate(next.getDate() + 7);
      const date = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
      const result = await api<{ id: string }>("/api/events", {
        mode: "sample",
        date,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      router.push(`/event/${result.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }
  const launch = (
    <Link className="button dark landing-launch" href="/new">
      Plan a gathering
      <ArrowRight size={19} />
    </Link>
  );
  return (
    <div className="product-landing">
      <Header />
      <main id="main">
        <section className="landing-intro">
          <h1>
            The plan changes.
            <br />
            <span>The people stay.</span>
          </h1>
          <div className="landing-intro-copy">
            <p>
              Turn a photo of your event plan into a signup page. Change the
              paper later. Keep the people who already joined.
            </p>
            <div className="landing-actions">
              {launch}
              <button className="text-button" disabled={!!busy} onClick={start}>
                <Play size={16} />
                {busy ? "Opening your sample…" : "Try a sample"}
              </button>
            </div>
            <small>
              For games nights, clubs and workshops. No account needed.
            </small>
            <a className="landing-watch" href="https://www.youtube.com/watch?v=xM5eC-q7t_0" target="_blank" rel="noreferrer">
              Watch the working app <span>43 sec</span><ArrowUpRight size={14} />
            </a>
            {error && (
              <p className="landing-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </section>
        <Walkthrough />
        <section className="landing-explanation">
          <div>
            <h2>
              A crossed-out table
              <br />
              isn’t a cancelled night.
            </h2>
            <p>
              Ticket to Ride belongs to its players, even when it needs a new
              table. INKSHIFT keeps the session’s identity through the edit, so
              its registrations move with it.
            </p>
          </div>
          <div className="landing-decisions">
            <div>
              <h3>The reader proposes.</h3>
              <p>
                Upload a photo. Check the names, times and tables it found.
                Unclear readings and conflicts stay visible.
              </p>
            </div>
            <div>
              <h3>You make the call.</h3>
              <p>
                Correct a reading, approve the changes or keep the current plan.
                Every review has a saved outcome.
              </p>
            </div>
            <div>
              <h3>People keep their place.</h3>
              <p>
                The shared schedule updates. A registration still belongs to the
                same game, with its new location.
              </p>
            </div>
          </div>
        </section>
        <section className="landing-questions" aria-labelledby="questions-title">
          <div>
            <h2 id="questions-title">Before you send<br />the invite.</h2>
            <p>A few things worth knowing before people join.</p>
            <Link className="text-button" href="/help">Read the guide <ArrowRight size={16} /></Link>
          </div>
          <div className="landing-answers">
            {questions.map(({ question, answer }) => (
              <details key={question}>
                <summary>{question}<ChevronDown size={18} aria-hidden="true" /></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="landing-close">
          <div>
            <h2>
              Make a little room
              <br />
              for a good time.
            </h2>
            <p>Bring your plan. We’ll make room for the people.</p>
          </div>
          {launch}
        </section>
        <footer className="landing-footer">
          <span>INKSHIFT · Your paper. Your call.</span>
          <nav aria-label="Footer">
            <Link href="/help">Help</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/about">
              About INKSHIFT <ArrowUpRight size={14} />
            </Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}
