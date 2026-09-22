"use client";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  MapPin,
  Users,
  CalendarDays,
  Clock3,
  X,
} from "lucide-react";
import { api, Brand, dateLabel, Loading, timeLabel, useEvent } from "./common";

export function Join({ id }: { id: string }) {
  const { event, error: loadError, connected, refresh } = useEvent(id);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState("");
  async function join(sessionId: string) {
    if (!name.trim()) {
      setSelected(sessionId);
      document.getElementById("participant-name")?.focus();
      return;
    }
    setBusy(sessionId);
    setError("");
    setNotice("");
    try {
      await api(`/api/events/${id}/registrations`, { sessionId, name });
      await refresh();
      setNotice(
        "You’re on the list. Keep this link to check your place or leave the session.",
      );
      setSelected("");
    } catch (e) {
      setError((e as Error).message);
      await refresh();
    } finally {
      setBusy("");
    }
  }
  async function leave(bookingId: string) {
    setBusy(bookingId);
    setError("");
    try {
      await api(`/api/events/${id}/registrations`, { bookingId }, "DELETE");
      await refresh();
      setNotice("You left the session. The place is available again.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (!event)
    return (
      <>
        <header className="join-header">
          <Brand small />
        </header>
        <main className="join-page">
          {loadError ? (
            <div className="error-empty">
              <h1>That invite couldn’t be opened.</h1>
              <p>{loadError}</p>
              <button className="button secondary" onClick={refresh}>
                Try again
              </button>
            </div>
          ) : (
            <Loading text="Finding your gathering…" />
          )}
        </main>
      </>
    );
  return (
    <>
      <header className="join-header">
        <Brand small />
        <span className="live-label">
          <span className={`status-dot ${!connected ? "disconnected" : ""}`} />
          {connected ? "Live event" : "Reconnecting"}
        </span>
      </header>
      <main className="join-page">
        <div className="join-title">
          <div className="join-flower">
            <Users size={34} strokeWidth={1.4} />
          </div>
          <h1>{event.title}</h1>
          <p>
            Pull up a chair.
            <br />
            There’s a place with your name on it.
          </p>
          <div className="join-meta">
            <span>
              <CalendarDays size={16} />
              {dateLabel(event.date)}
            </span>
            <span>
              <Clock3 size={16} />
              {event.timeZone.replaceAll("_", " ")}
            </span>
          </div>
        </div>
        {event.sample && (
          <p className="sample-banner">
            Example event · the places you book here are real demo
            registrations.
          </p>
        )}
        {error && (
          <div className="notice warning" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="notice success" role="status">
            <Check size={18} />
            {notice}
          </div>
        )}
        {event.myBookings.length > 0 && (
          <section className="my-places">
            <h2>
              <CheckCheck size={20} />
              Your places
            </h2>
            {event.myBookings.map((b) => {
              const s = event.sessions.find((s) => s.id === b.sessionId);
              return (
                <div key={b.id} className="my-place">
                  <div>
                    <strong>{s?.title}</strong>
                    <span>
                      <MapPin size={13} />
                      {s?.spaceLabel} · {s && timeLabel(s.start)}
                    </span>
                  </div>
                  <button
                    className="text-button"
                    disabled={!!busy}
                    onClick={() => leave(b.id)}
                    aria-label={`Leave ${s?.title}`}
                  >
                    {busy === b.id ? "Leaving…" : "Leave"}
                    <X size={13} />
                  </button>
                </div>
              );
            })}
            <p>
              Your session’s current table is shown above. Keep this page open
              to see organizer changes.
            </p>
          </section>
        )}
        <section
          className={`participant-name ${selected ? "name-needed" : ""}`}
        >
          <label htmlFor="participant-name">What should we call you?</label>
          <input
            id="participant-name"
            value={name}
            maxLength={40}
            autoComplete="given-name"
            placeholder="Your first name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && selected) void join(selected);
            }}
          />
          <span>
            {selected
              ? "Enter your name, then choose your session again."
              : "A name is all you need. Your booking is saved in this browser."}
          </span>
        </section>
        <section className="join-sessions" aria-label="Available sessions">
          <h2>Pick your next game.</h2>
          {event.sessions.length === 0 ? (
            <p>
              The organizer is still getting the plan ready. Sessions will
              appear here.
            </p>
          ) : (
            [...event.sessions]
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((s) => {
                const mine = event.myBookings.some((b) => b.sessionId === s.id);
                const full = s.booked >= s.capacity;
                return (
                  <article
                    className={`join-session ${mine ? "joined" : ""}`}
                    key={s.id}
                  >
                    <div className="join-session-top">
                      <span>
                        {timeLabel(s.start)} — {timeLabel(s.end)}
                      </span>
                      <span>
                        <MapPin size={13} />
                        {s.spaceLabel}
                      </span>
                    </div>
                    <h3>{s.title}</h3>
                    <div className="join-session-bottom">
                      <span className="join-capacity">
                        <Users size={16} />
                        {full
                          ? "All places taken"
                          : `${s.capacity - s.booked} of ${s.capacity} places open`}
                      </span>
                      <button
                        className={`button ${mine ? "secondary" : "primary"}`}
                        disabled={mine || full || !!busy}
                        onClick={() => join(s.id)}
                      >
                        {mine ? (
                          <>
                            <Check size={16} />
                            You’re in
                          </>
                        ) : full ? (
                          "Full"
                        ) : busy === s.id ? (
                          "Saving…"
                        ) : (
                          <>
                            Join game
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })
          )}
        </section>
        <footer className="join-footer">
          Plans change. Your place stays with you.
          <br />
          <Brand small />
        </footer>
      </main>
    </>
  );
}
