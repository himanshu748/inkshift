"use client";
import { Plus, Check } from "lucide-react";
import type { DraftPlan, EventView } from "@/lib/model";
import { emptyEvidence } from "@/lib/sample";

export function DraftEditor({
  draft,
  event,
  onChange,
}: {
  draft: DraftPlan;
  event: EventView;
  onChange: (draft: DraftPlan) => void;
}) {
  function space(index: number, field: string, value: unknown) {
    onChange({
      ...draft,
      spaces: draft.spaces.map((s, i) =>
        i === index ? { ...s, [field]: value } : s,
      ),
    });
  }
  function session(index: number, field: string, value: unknown) {
    onChange({
      ...draft,
      sessions: draft.sessions.map((s, i) =>
        i === index ? { ...s, [field]: value } : s,
      ),
    });
  }
  return (
    <div className="draft-editor">
      <div className="editor-event">
        <label>
          Event name
          <input
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
          />
        </label>
        <label>
          Date
          <input
            type="date"
            value={draft.date}
            onChange={(e) => onChange({ ...draft, date: e.target.value })}
          />
        </label>
        <label>
          Time zone
          <input
            value={draft.timeZone}
            onChange={(e) => onChange({ ...draft, timeZone: e.target.value })}
          />
        </label>
      </div>
      <h3>Tables & spaces</h3>
      <div className="space-editor-list">
        {draft.spaces.map((s, i) => (
          <fieldset key={s.key} className={s.removed ? "marked-removed" : ""}>
            <legend>Table {i + 1}</legend>
            <label>
              Name
              <input
                value={s.label}
                onChange={(e) => space(i, "label", e.target.value)}
              />
            </label>
            <label>
              Seats
              <input
                type="number"
                min="1"
                max="100"
                value={s.capacity}
                onChange={(e) => space(i, "capacity", Number(e.target.value))}
              />
            </label>
            {event.spaces.length > 0 && (
              <label>
                Original table
                <select
                  value={s.existingId ?? ""}
                  onChange={(e) =>
                    space(i, "existingId", e.target.value || null)
                  }
                >
                  <option value="">New table</option>
                  {event.spaces.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={s.removed}
                onChange={(e) => space(i, "removed", e.target.checked)}
              />
              Remove table
            </label>
          </fieldset>
        ))}
      </div>
      <button
        className="text-button"
        disabled={draft.spaces.length >= 12}
        onClick={() =>
          onChange({
            ...draft,
            spaces: [
              ...draft.spaces,
              {
                key: crypto.randomUUID(),
                existingId: null,
                label: `Table ${draft.spaces.length + 1}`,
                capacity: 4,
                removed: false,
                evidence: emptyEvidence,
              },
            ],
          })
        }
      >
        <Plus size={15} />
        Add a table
      </button>
      <h3>Sessions</h3>
      {draft.sessions.map((s, i) => (
        <fieldset
          key={s.key}
          className={`session-editor ${s.removed ? "marked-removed" : ""}`}
        >
          <legend>Session {i + 1}</legend>
          <div className="editor-two">
            <label>
              Game or activity
              <input
                value={s.title}
                onChange={(e) => session(i, "title", e.target.value)}
              />
            </label>
            <label>
              Table
              <select
                value={s.spaceKey}
                onChange={(e) => session(i, "spaceKey", e.target.value)}
              >
                {draft.spaces.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                    {t.removed ? " (removed; find a new table)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="editor-three">
            <label>
              Starts
              <input
                type="time"
                value={s.start}
                onChange={(e) => session(i, "start", e.target.value)}
              />
            </label>
            <label>
              Ends
              <input
                type="time"
                value={s.end}
                onChange={(e) => session(i, "end", e.target.value)}
              />
            </label>
            <label>
              Player limit
              <input
                type="number"
                min="1"
                max="100"
                value={s.capacity}
                onChange={(e) => session(i, "capacity", Number(e.target.value))}
              />
            </label>
          </div>
          {event.sessions.length > 0 && (
            <label>
              Keep the identity of
              <select
                value={s.existingId ?? ""}
                onChange={(e) =>
                  session(i, "existingId", e.target.value || null)
                }
              >
                <option value="">A new session</option>
                {event.sessions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} · {t.start}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={s.removed}
              onChange={(e) => session(i, "removed", e.target.checked)}
            />
            Remove this session (only if nobody has joined)
          </label>
        </fieldset>
      ))}
      <button
        className="text-button"
        disabled={draft.sessions.length >= 30}
        onClick={() =>
          onChange({
            ...draft,
            sessions: [
              ...draft.sessions,
              {
                key: crypto.randomUUID(),
                existingId: null,
                title: "New game",
                spaceKey: draft.spaces[0]?.key ?? "",
                start: "18:00",
                end: "19:00",
                capacity: 4,
                removed: false,
                evidence: emptyEvidence,
              },
            ],
          })
        }
      >
        <Plus size={15} />
        Add a session
      </button>
      <div className="reading-checks">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={draft.complete}
            onChange={(e) => onChange({ ...draft, complete: e.target.checked })}
          />
          This reading includes my complete event plan.
        </label>
        {draft.uncertainties.length > 0 && (
          <>
            <p>Check these readings against the paper:</p>
            <ul>
              {draft.uncertainties.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
            <button
              className="button secondary"
              onClick={() => onChange({ ...draft, uncertainties: [] })}
            >
              <Check size={15} />I checked and corrected these readings
            </button>
          </>
        )}
      </div>
    </div>
  );
}
