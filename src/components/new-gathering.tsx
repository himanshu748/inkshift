"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Check } from "lucide-react";
import { api } from "./common";

export function NewGathering() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [timeZone, setTimeZone] = useState("UTC");
  const [zones, setZones] = useState(["UTC"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const next = new Date();
    next.setDate(next.getDate() + 7);
    queueMicrotask(() => {
      setDate(
        `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`,
      );
      setTimeZone(local);
      setZones([
        ...new Set([
          local,
          "UTC",
          ...(typeof Intl.supportedValuesOf === "function"
            ? Intl.supportedValuesOf("timeZone")
            : []),
        ]),
      ]);
    });
  }, []);
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await api<{ id: string }>("/api/events", {
        mode: "blank",
        title: String(values.get("title") ?? "").trim(),
        date: String(values.get("date") ?? ""),
        timeZone: String(values.get("timeZone") ?? ""),
      });
      router.push(`/event/${result.id}`);
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="setup-layout">
      <section>
        <h1>Make room for your people.</h1>
        <p className="product-lede">
          A games night, a club meetup, a day of workshops. Start with the
          details, then add your plan.
        </p>
        <form className="setup-form" onSubmit={create}>
          <label htmlFor="gathering-name">What’s the gathering called?</label>
          <input
            id="gathering-name"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Saturday at the games café"
            required
            maxLength={100}
            autoComplete="off"
            disabled={busy}
          />
          <div className="setup-field-row">
            <div>
              <label htmlFor="gathering-date">Date</label>
              <input
                id="gathering-date"
                name="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="gathering-zone">Time zone</label>
              <select
                id="gathering-zone"
                name="timeZone"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                disabled={busy}
              >
                {zones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="field-help">
            The date and time zone appear on everyone’s invite.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button dark" disabled={busy || !date}>
            {busy ? "Creating your gathering…" : "Create gathering"}
            <ArrowRight size={18} />
          </button>
          <p className="field-help">
            No account needed. Organizer access is saved in this browser. You
            can save a private access code in your workspace.
          </p>
        </form>
        <Link className="text-button" href="/gatherings">
          Back to your gatherings
        </Link>
      </section>
      <aside className="setup-aside">
        <CalendarDays size={30} strokeWidth={1.5} />
        <h2>From a plan to a full table.</h2>
        <ol className="setup-steps">
          <li>
            <strong>Add your plan</strong>
            <span>
              Upload a photo or type in your tables, sessions and available
              places.
            </span>
          </li>
          <li>
            <strong>Check it, then share it</strong>
            <span>
              Approve the plan and send your signup link. People join from their
              phones.
            </span>
          </li>
          <li>
            <strong>Keep planning</strong>
            <span>
              Review later edits. People keep their place when the same session
              moves.
            </span>
          </li>
        </ol>
        <p className="setup-assurance">
          <Check size={17} /> You approve every change before it goes live.
        </p>
      </aside>
    </div>
  );
}
