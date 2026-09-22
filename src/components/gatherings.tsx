"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Plus, KeyRound } from "lucide-react";
import type { GatheringSummary } from "@/lib/gatherings";
import { api, dateLabel } from "./common";

export function Gatherings() {
  const [events, setEvents] = useState<GatheringSummary[] | null>(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setError("");
    try {
      setEvents(await api<GatheringSummary[]>("/api/events", undefined, "GET"));
    } catch (error) {
      setError((error as Error).message);
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);
  const real = events?.filter((event) => !event.sample) ?? [];
  const examples = events?.filter((event) => event.sample) ?? [];
  const rows = (items: GatheringSummary[]) => (
    <div className="gathering-list">
      {items.map((event) => (
        <article className="gathering-row" key={event.id}>
          <div className="gathering-date">
            <CalendarDays size={18} />
            <span>{dateLabel(event.date)}</span>
          </div>
          <div className="gathering-details">
            <h2>
              <Link href={`/event/${event.id}`}>{event.title}</Link>
            </h2>
            <p>
              {event.sessions
                ? `${event.sessions} session${event.sessions === 1 ? "" : "s"} · ${event.people} ${event.people === 1 ? "person" : "people"} joined`
                : "Ready for your first plan"}
            </p>
          </div>
          <Link className="button secondary" href={`/event/${event.id}`}>
            Open gathering
            <ArrowRight size={16} />
          </Link>
        </article>
      ))}
    </div>
  );
  return (
    <>
      <div className="product-page-heading">
        <div>
          <h1>Your gatherings.</h1>
          <p>Pick up where you left off.</p>
        </div>
        <Link className="button dark" href="/new">
          <Plus size={17} />
          New gathering
        </Link>
      </div>
      {error ? (
        <div className="product-empty">
          <h2>Your gatherings couldn’t load.</h2>
          <p role="alert">{error}</p>
          <button className="button secondary" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : events === null ? (
        <div
          className="gatherings-loading"
          role="status"
          aria-label="Loading your gatherings"
        >
          <div />
          <div />
          <div />
          <span>Opening your gatherings…</span>
        </div>
      ) : real.length ? (
        rows(real)
      ) : (
        <section className="product-empty">
          <CalendarDays size={34} strokeWidth={1.4} />
          <h2>Your next gathering starts here.</h2>
          <p>
            Give it a name, add a plan, and invite people. Your gatherings will
            be ready here when you return.
          </p>
          <Link className="button dark" href="/new">
            Plan a gathering
            <ArrowRight size={17} />
          </Link>
        </section>
      )}
      {!!examples.length && (
        <details className="sample-gatherings">
          <summary>
            Practice gatherings <span>{examples.length}</span>
          </summary>
          <p>
            These use example plans. Each has its own signup link and saved
            changes.
          </p>
          {rows(examples)}
        </details>
      )}
      <div className="returning-note">
        <KeyRound size={19} />
        <div>
          <strong>Using a different browser?</strong>
          <p>
            This page shows gatherings you can manage in this browser.{" "}
            <Link href="/restore">Use a saved access code</Link> to bring a
            gathering here.
          </p>
        </div>
      </div>
    </>
  );
}
