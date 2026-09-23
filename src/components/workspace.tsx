"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  FilePenLine,
  History,
  ImagePlus,
  MapPin,
  Plus,
  RefreshCw,
  ScanLine,
  Share2,
  Sparkles,
  Table2,
  Users,
  X,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import type {
  DraftPlan,
  EventView,
  ReviewedProposal,
  ReviewSummary,
} from "@/lib/model";
import { eventToDraft } from "@/lib/model";
import { sampleDraft } from "@/lib/sample";
import {
  api,
  Brand,
  dateLabel,
  imageData,
  Loading,
  timeLabel,
  useEvent,
} from "./common";
import { Paper } from "./paper";
import { WorkflowProgress } from "./workflow-progress";
import { DraftEditor } from "./draft-editor";
import { OrganizerAccess } from "./organizer-access";
const SanityLiveBridge = dynamic(
  () => import("./sanity-live").then((module) => module.SanityLiveBridge),
  { ssr: false },
);

function SharePanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const url =
    typeof window === "undefined" ? "" : `${window.location.origin}/join/${id}`;
  useEffect(() => {
    void QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: { dark: "#213c2d", light: "#ffffff" },
    }).then(setQr);
  }, [url]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopyError("Select and copy the link below.");
    }
  }
  return (
    <section className="share-panel" aria-label="Invite participants">
      <button
        className="icon-button close-panel"
        onClick={onClose}
        aria-label="Close invite panel"
      >
        <X size={18} />
      </button>
      <div className="qr-wrap">
        {qr ? (
          <img
            width="160"
            height="160"
            src={qr}
            alt="QR code to join this event"
          />
        ) : (
          <Loading text="Creating invite…" />
        )}
      </div>
      <div>
        <h2>Good company starts here.</h2>
        <p>
          Open this link on another phone or browser. Participants can join
          without an account.
        </p>
        <div className="copy-field">
          <input
            aria-label="Participant invite link"
            value={url}
            readOnly
            onFocus={(e) => e.target.select()}
          />
          <button className="button primary" onClick={copy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
        {copyError && <p role="status">{copyError}</p>}
        <Link href={`/join/${id}`} target="_blank" className="text-button">
          Open participant view <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}

function Schedule({
  event,
  active,
  onActive,
  highlighted,
}: {
  event: EventView;
  active?: string;
  onActive: (id?: string) => void;
  highlighted: boolean;
}) {
  const sessions = [...event.sessions].sort(
    (a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title),
  );
  return (
    <div className="schedule-list">
      {sessions.length === 0 ? (
        <div className="empty-schedule">
          <Users size={34} strokeWidth={1.2} />
          <h3>Make room for a good time.</h3>
          <p>
            Read your first photograph or enter a plan to open sessions for
            people to join.
          </p>
        </div>
      ) : (
        sessions.map((session, i) => (
          <div
            key={session.id}
            className={`session-row ${active === session.id ? "active" : ""} ${highlighted ? "just-updated" : ""}`}
            onMouseEnter={() => onActive(session.id)}
            onMouseLeave={() => onActive(undefined)}
          >
            <div className="session-time">
              {i === 0 || sessions[i - 1].start !== session.start ? (
                <>
                  <strong>{timeLabel(session.start)}</strong>
                  <span>until {timeLabel(session.end)}</span>
                </>
              ) : (
                <span className="same-time">same time</span>
              )}
            </div>
            <div className="session-details">
              <button
                className="session-title"
                onFocus={() => onActive(session.id)}
                onBlur={() => onActive(undefined)}
                onClick={() => onActive(session.id)}
              >
                {session.title}
              </button>
              <span className="session-location">
                <MapPin size={13} />
                {session.spaceLabel}
              </span>
              <div className="seat-line">
                <div className="seat-dots" aria-hidden="true">
                  {Array.from(
                    { length: Math.min(session.capacity, 10) },
                    (_, j) => (
                      <span
                        key={j}
                        className={j < session.booked ? "filled" : ""}
                      />
                    ),
                  )}
                </div>
                <span>
                  {session.booked}/{session.capacity} joined
                </span>
              </div>
            </div>
            <span
              className={`remaining ${session.booked >= session.capacity ? "full" : ""}`}
            >
              {session.booked >= session.capacity
                ? "Full"
                : `${session.capacity - session.booked} open`}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function Review({
  proposal,
  event,
  busy,
  onRevise,
  onApply,
  onDismiss,
  onDiscard,
  onRetry,
}: {
  proposal: ReviewedProposal;
  event: EventView;
  busy: string;
  onRevise: (draft: DraftPlan) => Promise<void>;
  onApply: () => void;
  onDismiss: () => void;
  onDiscard: () => void;
  onRetry: () => void;
}) {
  const [editing, setEditing] = useState(
    proposal.source === "manual" || proposal.preview.conflicts.length > 0,
  );
  const [draft, setDraft] = useState(proposal.draft);
  const [dirty, setDirty] = useState(false);
  const stale = event.version !== proposal.baseVersion;
  const conflicts = proposal.preview.conflicts;
  async function save() {
    try {
      await onRevise(draft);
      setDirty(false);
    } catch {
      /* Error appears in the workspace notice. */
    }
  }
  if (proposal.status !== "review")
    return (
      <section
        className="review-panel review-settled"
        aria-label="Saved review"
      >
        <div className="review-heading">
          <div className="review-symbol">
            <CheckCheck size={25} />
          </div>
          <div>
            <h2>
              {proposal.status === "applied"
                ? "Changes applied."
                : "Current plan kept."}
            </h2>
            <p>
              {proposal.status === "applied"
                ? `${proposal.preview.retainedBookings} registration${proposal.preview.retainedBookings === 1 ? "" : "s"} preserved when this review was applied.`
                : "This proposal was discarded. No sessions or registrations changed."}
            </p>
          </div>
          <button
            className="icon-button"
            onClick={onDismiss}
            aria-label="Close saved review"
          >
            <X size={19} />
          </button>
        </div>
        <WorkflowProgress proposal={proposal} busy={!!busy} onRetry={onRetry} />
        <div className="review-receipt">
          {proposal.preview.changes.map((change, i) => (
            <p key={i}>
              <strong>{change.entity}</strong> · {change.detail}
            </p>
          ))}
        </div>
      </section>
    );
  return (
    <section className="review-panel" aria-label="Review proposed changes">
      <div className="review-heading">
        <div className="review-symbol">
          <FilePenLine size={25} />
        </div>
        <div>
          <h2>
            {proposal.source === "sample"
              ? "An example paper edit."
              : proposal.source === "manual"
                ? "Check your plan."
                : "Here’s what the paper says."}
          </h2>
          <p>
            {proposal.source === "sample"
              ? "This uses a prepared example reading. Your live event changes only when you approve."
              : proposal.source === "manual"
                ? "Add or edit your tables and sessions, then check the changes before you approve."
                : "Compare the reading with your paper. Nothing changes until you approve."}
          </p>
        </div>
        <button
          className="icon-button"
          onClick={onDismiss}
          disabled={!!busy}
          aria-label="Close review without applying"
        >
          <X size={19} />
        </button>
      </div>
      <WorkflowProgress proposal={proposal} busy={!!busy} onRetry={onRetry} />
      <div className="review-body">
        <div className="review-photo">
          <Paper
            eventId={event.id}
            photoId={proposal.photoId}
            sessions={proposal.preview.sessions}
            compact
          />
          <p className="fine-print">
            {proposal.source === "vision"
              ? "AI reading · check names, times, capacities, and identity matches."
              : "Example and manual readings do not run image recognition."}
          </p>
        </div>
        <div className="review-results">
          {stale && (
            <div className="notice warning" role="status">
              <RefreshCw size={18} />
              <div>
                <strong>The live plan changed.</strong>
                <p>
                  Recheck this proposal against the latest registrations before
                  approving.
                </p>
                <button
                  className="text-button"
                  disabled={!!busy}
                  onClick={save}
                >
                  Recheck against live plan <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
          {conflicts.length > 0 ? (
            <div className="conflict-list">
              <h3>
                <AlertCircle size={18} />
                {conflicts.length} thing{conflicts.length === 1 ? "" : "s"} to
                resolve
              </h3>
              <ul>
                {conflicts.map((c, i) => (
                  <li key={i}>{c.message}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="preserved">
              <CheckCheck size={22} />
              <div>
                <strong>
                  {proposal.preview.retainedBookings
                    ? `${proposal.preview.retainedBookings} registration${proposal.preview.retainedBookings === 1 ? "" : "s"} preserved`
                    : "The plan fits together."}
                </strong>
                <span>
                  {proposal.preview.retainedBookings
                    ? "Same people. Same sessions. Updated plan."
                    : "Tables, times, and player limits checked."}
                </span>
              </div>
            </div>
          )}
          <div className="change-list">
            {proposal.preview.changes.length === 0 ? (
              <p className="no-changes">
                No meaningful plan changes found. You can keep this as the
                latest photograph.
              </p>
            ) : (
              proposal.preview.changes.map((change, i) => (
                <div key={i} className="change-row">
                  <span className={`change-icon ${change.kind}`}>
                    {change.kind === "move" ? (
                      <ArrowRight size={17} />
                    ) : change.kind === "remove" ? (
                      <X size={17} />
                    ) : change.kind === "add" ? (
                      <Plus size={17} />
                    ) : (
                      <FilePenLine size={17} />
                    )}
                  </span>
                  <div>
                    <strong>{change.entity}</strong>
                    {change.kind === "move" && change.before && change.after ? (
                      <>
                        <div className="change-location" aria-label={`Location changes from ${change.before} to ${change.after}`}>
                          <div><span>Current table</span><del>{change.before}</del></div>
                          <ArrowRight size={22} aria-hidden="true" />
                          <div><span>Proposed table</span><b>{change.after}</b></div>
                        </div>
                        <p>{change.affected === 0 ? "The session keeps its link." : `${change.affected} booked ${change.affected === 1 ? "place stays" : "places stay"} with this session.`}</p>
                      </>
                    ) : <p>{change.detail}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            className="text-button edit-reading"
            onClick={() => setEditing((v) => !v)}
          >
            <FilePenLine size={16} />
            {editing
              ? "Hide reading editor"
              : "Edit reading & identity matches"}
            <ChevronDown size={16} className={editing ? "rotate" : ""} />
          </button>
          {editing && (
            <DraftEditor
              event={event}
              draft={draft}
              onChange={(value) => {
                setDraft(value);
                setDirty(true);
              }}
            />
          )}
          <div className="review-actions">
            {dirty ? (
              <button
                className="button primary"
                disabled={!!busy}
                onClick={save}
              >
                {busy === "revise"
                  ? "Checking the plan…"
                  : "Recheck my corrections"}
                <RefreshCw size={16} />
              </button>
            ) : (
              <button
                className="button primary"
                disabled={
                  !!busy ||
                  !!conflicts.length ||
                  stale ||
                  proposal.workflow?.status === "unavailable" ||
                  (proposal.workflow?.status === "tracked" &&
                    !proposal.workflow.approve.allowed)
                }
                onClick={onApply}
              >
                {busy === "approve"
                  ? "Applying changes…"
                  : proposal.preview.changes.length
                    ? `Approve ${proposal.preview.changes.length} change${proposal.preview.changes.length === 1 ? "" : "s"}`
                    : "Use this photograph"}
                <Check size={17} />
              </button>
            )}
            <button
              className="text-button"
              onClick={onDiscard}
              disabled={!!busy}
            >
              {busy === "discard"
                ? "Discarding…"
                : "Discard & keep current plan"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Workspace({ id }: { id: string }) {
  const { event, error: loadError, connected, refresh } = useEvent(id);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [proposal, setProposal] = useState<ReviewedProposal | null>(null);
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [reviewsError, setReviewsError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [active, setActive] = useState<string>();
  const [tab, setTab] = useState<"schedule" | "people" | "history">("schedule");
  const [highlighted, setHighlighted] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (event?.role !== "organizer") return;
    let active = true;
    void api<ReviewSummary[]>(`/api/events/${id}/proposals`, undefined, "GET")
      .then((items) => {
        if (active) {
          setReviews(items);
          setReviewsError("");
        }
      })
      .catch(() => {
        if (active)
          setReviewsError("Saved reviews could not load. Refresh to retry.");
      });
    return () => {
      active = false;
    };
  }, [id, event?.role, proposal?.id, proposal?.status]);
  async function reopen(proposalId: string) {
    await action("reopen", async () =>
      showProposal(
        await api<ReviewedProposal>(
          `/api/events/${id}/proposals/${proposalId}`,
          undefined,
          "GET",
        ),
      ),
    );
  }
  async function discard() {
    if (!proposal) return;
    await action("discard", async () => {
      setProposal(
        await api<ReviewedProposal>(
          `/api/events/${id}/proposals/${proposal.id}`,
          undefined,
          "DELETE",
        ),
      );
    });
  }
  async function action(name: string, run: () => Promise<void>) {
    setBusy(name);
    setError("");
    setNotice("");
    try {
      await run();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function showProposal(next: ReviewedProposal) {
    setProposal(next);
    requestAnimationFrame(() =>
      reviewRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      }),
    );
  }
  async function scan(file: File | undefined, source: "upload" | "camera") {
    if (!file) return;
    await action("scan", async () => {
      const image = await imageData(file);
      showProposal(
        await api<ReviewedProposal>(`/api/events/${id}/scan`, {
          image,
          label: file.name,
          source,
        }),
      );
    });
  }
  async function example(change: "remove-table" | "capacity" | "rename") {
    await action(change, async () =>
      showProposal(
        await api<ReviewedProposal>(`/api/events/${id}/proposals`, {
          sampleChange: change,
        }),
      ),
    );
  }
  async function manual() {
    if (!event) return;
    await action("manual", async () => {
      const draft = event.spaces.length
        ? eventToDraft(event)
        : {
            ...sampleDraft(event.date, event.timeZone),
            title: event.title,
            sessions: [],
            spaces: [{ ...sampleDraft().spaces[0] }],
          };
      showProposal(
        await api<ReviewedProposal>(`/api/events/${id}/proposals`, { draft }),
      );
    });
  }
  async function revise(draft: DraftPlan) {
    if (!proposal) return;
    setBusy("revise");
    setError("");
    try {
      setProposal(
        await api<ReviewedProposal>(
          `/api/events/${id}/proposals/${proposal.id}`,
          { draft },
          "PUT",
        ),
      );
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy("");
    }
  }
  async function approve() {
    if (!proposal) return;
    await action("approve", async () => {
      const result = await api<{ proposal: ReviewedProposal }>(
        `/api/events/${id}/proposals/${proposal.id}/approve`,
        {
          reviewed: true,
          baseVersion: proposal.baseVersion,
        },
      );
      setNotice(
        `${proposal.preview.changes.length} change${proposal.preview.changes.length === 1 ? "" : "s"} applied. ${proposal.preview.retainedBookings} registration${proposal.preview.retainedBookings === 1 ? "" : "s"} kept.`,
      );
      setProposal(result.proposal);
      await refresh();
      setHighlighted(true);
      setTimeout(() => setHighlighted(false), 3500);
    });
  }
  if (!event)
    return (
      <>
        <HeaderMinimal />
        <main className="workspace">
          {loadError ? (
            <div className="error-empty">
              <h1>We couldn’t open that plan.</h1>
              <p role="alert">{loadError}</p>
              <Link className="button primary" href="/">
                Start a new plan
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <Loading />
          )}
        </main>
      </>
    );
  if (event.role !== "organizer")
    return (
      <>
        <HeaderMinimal />
        <main className="workspace">
          <div className="error-empty">
            <h1>You’re invited.</h1>
            <p>
              Use the participant page to join. If you organize this gathering,
              open it in your original browser or use your saved access code.
            </p>
            <Link className="button primary" href={`/join/${id}`}>
              Join {event.title}
              <ArrowRight size={16} />
            </Link>
            <Link className="text-button" href="/restore">
              Restore organizer access <ArrowRight size={16} />
            </Link>
          </div>
        </main>
      </>
    );
  return (
    <>
      <div hidden>
        <SanityLiveBridge id={id} onVersion={refresh} />
      </div>
      <header className="workspace-header">
        <Brand small />
        <Link href="/gatherings" className="text-button">
          Your gatherings
        </Link>
        <span className="storage-label">
          <span className={`status-dot ${!connected ? "disconnected" : ""}`} />
          {connected
            ? event.storage === "sanity"
              ? "All changes saved"
              : "Saved on this computer"
            : "Reconnecting…"}
        </span>
      </header>
      <main className="workspace">
        <div className="event-heading">
          <div>
            <h1>{event.title}</h1>
            <p>
              <span>{dateLabel(event.date)}</span>
              <span className="meta-divider" />
              {event.sessions.length} sessions
              <span className="meta-divider" />
              {event.timeZone.replaceAll("_", " ")}
            </p>
          </div>
          <button
            className="button dark"
            onClick={() => setSharing((v) => !v)}
            disabled={!event.sessions.length}
            title={
              !event.sessions.length
                ? "Add and approve a session before inviting people"
                : undefined
            }
          >
            <Share2 size={17} />
            Invite people
            <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="workspace-utilities">
          <button
            className="text-button"
            onClick={() => setSavingAccess((open) => !open)}
            aria-expanded={savingAccess}
          >
            <KeyRound size={15} />
            Save organizer access
          </button>
          <Link className="text-button" href="/help">
            Organizer guide <ArrowUpRight size={14} />
          </Link>
          {event.sample && (
            <span className="practice-label">Practice gathering</span>
          )}
        </div>
        {savingAccess && (
          <OrganizerAccess id={id} onClose={() => setSavingAccess(false)} />
        )}
        {sharing && <SharePanel id={id} onClose={() => setSharing(false)} />}
        {!event.sessions.length && !proposal && (
          <section className="first-plan-guide">
            <div>
              <h2>Give your gathering a plan.</h2>
              <p>
                Add the tables, activities and available places. You’ll check
                everything before people can join.
              </p>
            </div>
            <button
              className="button primary"
              disabled={!!busy}
              onClick={() => upload.current?.click()}
            >
              <ImagePlus size={17} />
              Upload a plan
            </button>
            <button
              className="button secondary"
              disabled={!!busy}
              onClick={manual}
            >
              <FilePenLine size={17} />
              Start by typing
            </button>
          </section>
        )}
        {error && (
          <div className="notice warning" role="alert">
            <AlertCircle size={19} />
            <span>{error}</span>
            <button
              className="icon-button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div className="notice success" role="status">
            <CheckCheck size={21} />
            {notice}
            <button
              className="icon-button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="workspace-grid">
          <section className="paper-column">
            <div className="section-toolbar">
              <h2>Your paper</h2>
              <span className="version-label">
                {event.photoId
                  ? `Revision ${event.history.filter((h) => h.action === "Paper changes applied").length + 1}`
                  : "First draft"}
              </span>
            </div>
            <div className="photo-actions">
              <button
                className="button primary"
                disabled={!!busy}
                onClick={() => camera.current?.click()}
              >
                <Camera size={18} />
                {busy === "scan"
                  ? "Reading your paper…"
                  : event.photoId
                    ? "Photograph an edit"
                    : "Photograph my plan"}
              </button>
              <button
                className="button secondary icon-button-large"
                aria-label="Upload a plan photograph"
                title="Upload a photo"
                onClick={() => upload.current?.click()}
                disabled={!!busy}
              >
                <ImagePlus size={20} />
              </button>
            </div>
            <input
              ref={camera}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              capture="environment"
              className="visually-hidden"
              aria-label="Take a photograph of your event plan"
              onChange={(e) => {
                void scan(e.target.files?.[0], "camera");
                e.target.value = "";
              }}
            />
            <input
              ref={upload}
              type="file"
              accept="image/*"
              className="visually-hidden"
              aria-label="Choose an event plan photograph"
              onChange={(e) => {
                void scan(e.target.files?.[0], "upload");
                e.target.value = "";
              }}
            />
            <p className="photo-hint">
              Keep the whole page in view. You’ll check the reading before
              anything changes.
            </p>
            <button className="text-button" disabled={!!busy} onClick={manual}>
              <FilePenLine size={15} />
              {event.sessions.length ? "Edit plan" : "Enter a plan by hand"}
            </button>
            <Paper
              eventId={id}
              photoId={event.photoId}
              sessions={event.sessions}
              active={active}
              onActive={setActive}
            />
            {busy === "scan" && (
              <div className="scan-progress" role="status">
                <ScanLine size={18} className="scan-icon" />
                <div>
                  <strong>Reading the new photograph</strong>
                  <p>
                    Finding tables, sessions, and what changed. Your current
                    plan stays live.
                  </p>
                </div>
              </div>
            )}
            {event.sample && (
              <div className="try-edit">
                <div className="try-edit-heading">
                  <Sparkles size={18} />
                  <h3>Try changing the plan.</h3>
                </div>
                <p>
                  First, invite someone to Ticket to Ride. Then remove Table B
                  and see what happens.
                </p>
                <button
                  className="button secondary"
                  disabled={
                    !!busy ||
                    !event.spaces.some(
                      (s) => s.label === "Table B" && !s.removed,
                    )
                  }
                  onClick={() => example("remove-table")}
                >
                  Use the crossed-out example <ArrowRight size={17} />
                </button>
                <div className="example-links">
                  <button onClick={() => example("rename")} disabled={!!busy}>
                    Try a rename
                  </button>
                  <button onClick={() => example("capacity")} disabled={!!busy}>
                    Try a smaller player limit
                  </button>
                </div>
                <span className="fine-print">
                  Prepared examples. Upload a photo to test the reader.
                </span>
              </div>
            )}
          </section>
          <section className="plan-column">
            <div className="section-toolbar">
              <div
                className="tab-list"
                role="group"
                aria-label="Event information"
              >
                <button
                  aria-pressed={tab === "schedule"}
                  onClick={() => setTab("schedule")}
                >
                  The live plan
                </button>
                <button
                  aria-pressed={tab === "people"}
                  onClick={() => setTab("people")}
                >
                  People <span>{event.totalBookings}</span>
                </button>
                <button
                  aria-pressed={tab === "history"}
                  onClick={() => setTab("history")}
                  aria-label="Change history"
                >
                  <History size={17} />
                </button>
              </div>
              <span className="live-label">
                <span
                  className={`status-dot ${!connected ? "disconnected" : ""}`}
                />
                {connected ? "Live" : "Offline"}
              </span>
            </div>
            {tab === "schedule" && (
              <>
                <div className="schedule-summary">
                  <span>
                    <Table2 size={16} />
                    {event.spaces.filter((s) => !s.removed).length} tables
                  </span>
                  <span>
                    <Users size={16} />
                    {event.totalBookings}{" "}
                    {event.totalBookings === 1 ? "person" : "people"} joined
                  </span>
                </div>
                <Schedule
                  event={event}
                  active={active}
                  onActive={setActive}
                  highlighted={highlighted}
                />
                <div className="plan-note">
                  <CheckCheck size={18} />
                  <p>
                    People join the session.
                    <br />
                    <strong>Their place stays with them when it moves.</strong>
                  </p>
                </div>
              </>
            )}
            {tab === "people" && (
              <div className="people-list">
                {event.bookings?.length ? (
                  event.bookings.map((b, i) => (
                    <div className="person-row" key={b.id}>
                      <span className={`person-avatar tone-${i % 3}`}>
                        {b.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <strong>{b.name}</strong>
                        <span>
                          {
                            event.sessions.find((s) => s.id === b.sessionId)
                              ?.title
                          }
                        </span>
                      </div>
                      <span className="person-table">
                        {
                          event.sessions.find((s) => s.id === b.sessionId)
                            ?.spaceLabel
                        }
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-schedule">
                    <Users size={32} strokeWidth={1.2} />
                    <h3>There’s room for everyone to start.</h3>
                    <p>Share your invite link to welcome the first person.</p>
                    <button
                      className="button secondary"
                      onClick={() => setSharing(true)}
                    >
                      Get invite link
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
            {tab === "history" && (
              <div className="history-list">
                {event.history.map((h) => (
                  <div className="history-row" key={h.id}>
                    <span className="history-dot" />
                    <div>
                      <strong>{h.action}</strong>
                      <p>{h.detail}</p>
                      <time dateTime={h.at}>
                        {new Date(h.at).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="invite-strip">
              <div className="invite-symbol">
                <Users size={22} />
              </div>
              <div>
                <strong>A plan is better with people.</strong>
                <p>Send a link. Save them a place.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setSharing(true)}
                aria-label="Share participant invite"
                disabled={!event.sessions.length}
              >
                <ArrowUpRight size={22} />
              </button>
            </div>
          </section>
        </div>
        <div ref={reviewRef} className="review-anchor">
          {proposal && (
            <Review
              key={proposal.id}
              proposal={proposal}
              event={event}
              busy={busy}
              onRevise={revise}
              onApply={approve}
              onDismiss={() => setProposal(null)}
              onDiscard={discard}
              onRetry={() => reopen(proposal.id)}
            />
          )}
        </div>
        {(reviews.length > 0 || reviewsError) && (
          <section
            className="saved-reviews"
            aria-labelledby="saved-reviews-title"
          >
            <h2 id="saved-reviews-title">Saved reviews</h2>
            <p>
              Reopen a reading or see how a decision was recorded. Showing the
              latest 20.
            </p>
            {reviewsError && <p role="status">{reviewsError}</p>}
            <div>
              {reviews.map((item) => (
                <button
                  key={item.id}
                  className="saved-review-row"
                  disabled={!!busy}
                  onClick={() => reopen(item.id)}
                >
                  <span>
                    <strong>
                      {item.source === "vision"
                        ? "Photo reading"
                        : item.source === "sample"
                          ? "Example paper edit"
                          : "Manual plan"}
                    </strong>
                    <time dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  </span>
                  <span>
                    {item.status === "review"
                      ? "Awaiting review"
                      : item.status === "applied"
                        ? "Applied"
                        : "Discarded"}
                    <ArrowUpRight size={16} />
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
        <footer className="workspace-footer">
          <span>Your paper. Your call.</span>
          <span>
            <Link href="/privacy">Privacy</Link>
            <span className="meta-divider" />
            <Link href="/about">About INKSHIFT</Link>
            <details className="technical-details">
              <summary>Technical details</summary>
              <p>
                {event.storage === "sanity"
                  ? "Stored in Sanity Content Lake."
                  : "Stored locally on this computer."}{" "}
                <Link href={`/event/${id}/inspector`}>
                  Open content inspector <ArrowUpRight size={12} />
                </Link>
              </p>
            </details>
          </span>
        </footer>
      </main>
    </>
  );
}
function HeaderMinimal() {
  return (
    <header className="workspace-header">
      <Brand small />
    </header>
  );
}
