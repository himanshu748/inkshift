"use client";
import { ScanLine } from "lucide-react";
import type { Session } from "@/lib/model";
export function Paper({
  eventId,
  photoId,
  sessions,
  active,
  onActive,
  compact = false,
}: {
  eventId: string;
  photoId?: string;
  sessions: Session[];
  active?: string;
  onActive?: (id?: string) => void;
  compact?: boolean;
}) {
  const sample = photoId?.startsWith("sample-");
  const src = sample
    ? `/samples/${photoId === "sample-remove-table" ? "table-removed" : photoId === "sample-capacity" ? "capacity" : photoId === "sample-rename" ? "renamed" : "original"}.svg`
    : photoId
      ? `/api/events/${eventId}/photos/${photoId}`
      : undefined;
  return (
    <div className={`paper-stage ${compact ? "compact" : ""}`}>
      {src ? (
        <>
          <div className="source-image">
            <img
              src={src}
              alt={
                sample
                  ? "Example games night plan with three tables and three sessions"
                  : "Your uploaded event plan"
              }
              draggable={false}
            />
            {sessions
              .filter((s) => !s.removed && s.evidence.box[2] > 0)
              .map((s) => (
                <button
                  key={s.id}
                  className={`evidence-region ${active === s.id ? "active" : ""}`}
                  style={{
                    left: `${s.evidence.box[0] * 100}%`,
                    top: `${s.evidence.box[1] * 100}%`,
                    width: `${s.evidence.box[2] * 100}%`,
                    height: `${s.evidence.box[3] * 100}%`,
                  }}
                  aria-label={`Highlight ${s.title} in the plan`}
                  onMouseEnter={() => onActive?.(s.id)}
                  onMouseLeave={() => onActive?.(undefined)}
                  onFocus={() => onActive?.(s.id)}
                  onBlur={() => onActive?.(undefined)}
                  onClick={() => onActive?.(s.id)}
                >
                  <span>{s.title}</span>
                </button>
              ))}
          </div>
          <div className="source-caption">
            <span>
              {sample
                ? "Example sheet · not a photo reading"
                : "Your photograph · visible only to you"}
            </span>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              aria-label="Open paper at full size"
            >
              Full size <ScanLine size={14} />
            </a>
          </div>
        </>
      ) : (
        <div className="empty-paper">
          <ScanLine size={36} strokeWidth={1.3} />
          <h3>A blank page is a good start.</h3>
          <p>
            Photograph your plan with every table, game, time, and player limit
            in view.
          </p>
        </div>
      )}
    </div>
  );
}
