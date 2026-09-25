"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FilePenLine, ImageOff } from "lucide-react";
import type {
  FrameSpace,
  Timeline,
  TimelineFrame,
  TimelineWorkflow,
} from "@/lib/timeline";
import { api, timeLabel } from "./common";

const sourceLabel: Record<TimelineFrame["source"], string> = {
  original: "Original plan",
  vision: "Photo reading",
  sample: "Prepared example edit",
  manual: "Typed edit",
};

function workflowLabel(frame: TimelineFrame, workflow?: TimelineWorkflow) {
  if (frame.source === "original")
    return "No review. This is the starting plan.";
  if (!workflow || workflow.status === "local")
    return "Local review. Not recorded in Sanity Workflows.";
  if (workflow.status === "unavailable")
    return "Workflow run not found for this change.";
  const decided = workflow.steps.find(
    (s) => s.stage === "applied" || s.stage === "discarded",
  );
  return `Run stage: ${workflow.stage}${decided?.by ? `, by ${decided.by}` : ""}`;
}

function PaperFrame({ frame }: { frame: TimelineFrame }) {
  const { photo } = frame;
  if (photo.kind === "sample" || photo.kind === "private")
    return (
      <figure className="tm-paper">
        <img
          key={photo.src}
          src={photo.src}
          alt={
            photo.kind === "sample"
              ? `Prepared example sheet for version ${frame.version}`
              : `Your photograph for version ${frame.version}`
          }
          draggable={false}
        />
        <figcaption>
          {photo.kind === "sample"
            ? "Prepared example sheet, not a photo reading"
            : "Your photograph, visible only to you"}
        </figcaption>
      </figure>
    );
  return (
    <figure className="tm-paper tm-paper-empty">
      {photo.kind === "typed" ? (
        <FilePenLine size={30} strokeWidth={1.3} />
      ) : (
        <ImageOff size={30} strokeWidth={1.3} />
      )}
      <figcaption>
        {photo.kind === "typed"
          ? "Typed by hand. No photograph for this version."
          : "No stored photograph for this version."}
      </figcaption>
    </figure>
  );
}

function allSpaces(timeline: Timeline) {
  const seen = new Map<string, FrameSpace>();
  for (const frame of timeline.frames)
    for (const space of frame.spaces)
      if (!seen.has(space.id)) seen.set(space.id, space);
  return [...seen.values()];
}

export function TimeMachine({
  eventId,
  revision,
}: {
  eventId: string;
  revision: number;
}) {
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const followLatest = useRef(true);
  const board = useRef<HTMLDivElement>(null);
  const before = useRef<Map<string, DOMRect> | null>(null);

  useEffect(() => {
    let live = true;
    api<Timeline>(`/api/events/${eventId}/timeline`, undefined, "GET")
      .then((next) => {
        if (!live) return;
        setTimeline(next);
        setError("");
        setIndex((current) =>
          followLatest.current
            ? Math.max(0, next.frames.length - 1)
            : Math.min(current, Math.max(0, next.frames.length - 1)),
        );
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [eventId, revision]);

  function go(next: number) {
    if (!timeline) return;
    const target = Math.max(0, Math.min(timeline.frames.length - 1, next));
    if (target === index) return;
    const rects = new Map<string, DOMRect>();
    board.current
      ?.querySelectorAll<HTMLElement>("[data-flip]")
      .forEach((el) => rects.set(el.dataset.flip!, el.getBoundingClientRect()));
    before.current = rects;
    followLatest.current = target === timeline.frames.length - 1;
    setIndex(target);
  }

  // FLIP: each session card starts where it stood in the previous version.
  useLayoutEffect(() => {
    const previous = before.current;
    before.current = null;
    if (!previous || !board.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    board.current.querySelectorAll<HTMLElement>("[data-flip]").forEach((el) => {
      const from = previous.get(el.dataset.flip!);
      if (!from) {
        el.animate(
          [
            { opacity: 0, transform: "scale(0.6)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 420, easing: "ease-out" },
        );
        return;
      }
      const to = el.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration: 720, easing: "cubic-bezier(0.2, 0.7, 0.1, 1)" },
      );
    });
  }, [index]);

  if (error)
    return (
      <section className="time-machine" aria-labelledby="time-machine-title">
        <h2 id="time-machine-title">Paper time machine</h2>
        <p role="status">{error}</p>
      </section>
    );
  if (!timeline || !timeline.frames.length) return null;
  const frames = timeline.frames;
  const frame = frames[Math.min(index, frames.length - 1)];
  const columns = allSpaces(timeline);
  const at = new Date(frame.at).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const notes = timeline.discarded.filter(
    (d) => d.afterVersion === frame.version,
  );

  return (
    <section className="time-machine" aria-labelledby="time-machine-title">
      <div className="tm-heading">
        <div>
          <h2 id="time-machine-title">Paper time machine</h2>
          <p>
            Every version of the paper plan. Move between versions and watch the
            same bookings travel with their sessions.
          </p>
        </div>
        <div className="tm-stepper" role="group" aria-label="Plan versions">
          <button
            className="icon-button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous version"
          >
            <ChevronLeft size={20} />
          </button>
          <input
            type="range"
            min={1}
            max={frames.length}
            step={1}
            value={frame.version}
            disabled={frames.length < 2}
            onChange={(e) => go(Number(e.target.value) - 1)}
            aria-label="Plan version"
            aria-valuetext={`Version ${frame.version} of ${frames.length}`}
          />
          <button
            className="icon-button"
            onClick={() => go(index + 1)}
            disabled={index >= frames.length - 1}
            aria-label="Next version"
          >
            <ChevronRight size={20} />
          </button>
          <span className="tm-count" aria-live="polite">
            Version {frame.version} of {frames.length}
          </span>
        </div>
      </div>
      {frames.length < 2 && (
        <p className="tm-hint">
          One version so far. Apply a change to the paper to add version 2.
        </p>
      )}
      <div className="tm-frame">
        <PaperFrame frame={frame} />
        <div className="tm-board" ref={board}>
          {columns.map((column) => {
            const space = frame.spaces.find((s) => s.id === column.id);
            const sessions = frame.sessions
              .filter((s) => s.spaceId === column.id)
              .sort((a, b) => a.start.localeCompare(b.start));
            return (
              <div
                key={column.id}
                className="tm-table"
                data-state={
                  !space ? "absent" : space.removed ? "removed" : "open"
                }
              >
                <div className="tm-table-label">
                  <strong>{space?.label ?? column.label}</strong>
                  <span>
                    {!space
                      ? "Not on this paper"
                      : space.removed
                        ? "Crossed out"
                        : `${space.capacity} seats`}
                  </span>
                </div>
                {sessions.map((session) => {
                  const people = frame.bookings.filter(
                    (b) => b.sessionId === session.id,
                  );
                  return (
                    <div
                      key={session.id}
                      data-flip={session.id}
                      className={`tm-session ${session.removed ? "removed" : ""}`}
                    >
                      <strong>{session.title}</strong>
                      <span>
                        {timeLabel(session.start)} to {timeLabel(session.end)}
                        {" · "}
                        {people.length}/{session.capacity}
                      </span>
                      {people.length > 0 && (
                        <ul
                          className="tm-tokens"
                          aria-label={`${people.length} booking${people.length === 1 ? "" : "s"}`}
                        >
                          {people.map((person, i) => (
                            <li
                              key={person.id}
                              className={`person-avatar tone-${i % 3}`}
                            >
                              {person.initials}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <dl className="tm-facts">
        <div>
          <dt>Version</dt>
          <dd>
            {frame.version}. {sourceLabel[frame.source]}
            {frame.eventRevision != null && (
              <small>Event revision {frame.eventRevision}</small>
            )}
          </dd>
        </div>
        <div>
          <dt>{frame.source === "original" ? "Created" : "Applied"}</dt>
          <dd>
            <time dateTime={frame.at}>{at}</time>
          </dd>
        </div>
        <div>
          <dt>What changed</dt>
          <dd>
            {frame.changes.length ? (
              <ul>
                {frame.changes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              "The starting plan."
            )}
          </dd>
        </div>
        <div>
          <dt>Bookings kept</dt>
          <dd>
            {frame.kept == null
              ? `${frame.bookings.length} active in this version`
              : `${frame.kept} kept through this change`}
          </dd>
        </div>
        <div>
          <dt>Review workflow</dt>
          <dd>{workflowLabel(frame, frame.workflow)}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>
            {frame.basis === "recorded"
              ? "Recorded: read from saved records."
              : "Reconstructed: rebuilt from the prepared sample definition, because this gathering predates plan snapshots."}
          </dd>
        </div>
      </dl>
      {notes.map((note) => (
        <p key={note.proposalId} className="tm-discarded">
          Discarded after version {note.afterVersion}:{" "}
          {sourceLabel[note.source].toLowerCase()} with {note.changes} change
          {note.changes === 1 ? "" : "s"}. Never applied, so no version.
        </p>
      ))}
    </section>
  );
}
