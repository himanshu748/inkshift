"use client";
import { Component, useEffect, type ReactNode } from "react";
import { useQuery } from "@sanity/sdk-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand, Loading } from "./common";

type Projection = {
  title: string;
  version: number;
  updatedAt: string;
  spaces: { id: string; label: string; capacity: number }[];
  sessions: {
    id: string;
    title: string;
    spaceId: string;
    start: string;
    end: string;
    capacity: number;
    booked: number;
  }[];
};
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
// App SDK subscriptions have no server snapshot. Keep the page shell rendered
// on the server and connect its live data only in the browser.
const Provider = dynamic(() => import("./sanity-provider"), {
  ssr: false,
  loading: () => <Loading text="Connecting to Sanity App SDK…" />,
});
class ConnectionBoundary extends Component<
  { children: ReactNode; quiet?: boolean },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      this.props.quiet ? null : (
        <div className="notice warning">
          The direct Sanity connection is unavailable from this address. Add
          this site’s origin to the Sanity project’s CORS settings. Your
          organizer workspace still uses the server connection.
        </div>
      )
    ) : (
      this.props.children
    );
  }
}
function usePublicEvent(id: string) {
  return useQuery<Projection | null>({
    projectId,
    dataset,
    query: "*[_id == $id][0]{title,version,updatedAt,spaces,sessions}",
    params: { id: `inkshift-public-${id}` },
  });
}
function Watcher({ id, onVersion }: { id: string; onVersion: () => void }) {
  const { data } = usePublicEvent(id);
  const version = data?.version;
  useEffect(() => {
    if (version !== undefined) onVersion();
  }, [version, onVersion]);
  return null;
}
export function SanityLiveBridge({
  id,
  onVersion,
}: {
  id: string;
  onVersion: () => void;
}) {
  if (!projectId) return null;
  return (
    <ConnectionBoundary quiet>
      <Provider>
        <Watcher id={id} onVersion={onVersion} />
      </Provider>
    </ConnectionBoundary>
  );
}
function LiveContent({ id }: { id: string }) {
  const { data, isPending } = usePublicEvent(id);
  if (!data)
    return (
      <p>
        No public event projection found. Open the organizer workspace to create
        the event.
      </p>
    );
  return (
    <>
      <div className="notice success">
        <span className="status-dot" />
        {isPending
          ? "Receiving changes…"
          : `App SDK connected · revision ${data.version}`}
      </div>
      <h2>{data.title}</h2>
      <table>
        <thead>
          <tr>
            <th>Session</th>
            <th>Stable identity</th>
            <th>Table</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {data.sessions.map((s) => (
            <tr key={s.id}>
              <td>{s.title}</td>
              <td>
                <code>{s.id}</code>
              </td>
              <td>{data.spaces.find((t) => t.id === s.spaceId)?.label}</td>
              <td>
                {s.booked}/{s.capacity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <details>
        <summary>Inspect the public Content Lake projection</summary>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </details>
      <p>
        Names, registration identities, organizer access, and uploaded
        photographs stay in private documents. This public view contains the
        schedule and counts.
      </p>
    </>
  );
}
export function Inspector({ id }: { id: string }) {
  return (
    <>
      <header className="workspace-header">
        <Brand small />
      </header>
      <main className="inspector">
        <Link className="text-button" href={`/event/${id}`}>
          <ArrowLeft size={16} />
          Back to organizer
        </Link>
        <h1>The content behind the paper.</h1>
        <p>
          This view uses Sanity App SDK to subscribe directly to the event’s
          public projection. Join a session on another device and watch the
          counts change.
        </p>
        <p>
          Project <code>{projectId || "not connected"}</code> · Dataset{" "}
          <code>{dataset}</code>
        </p>
        {projectId ? (
          <ConnectionBoundary>
            <Provider>
              <LiveContent id={id} />
            </Provider>
          </ConnectionBoundary>
        ) : (
          <p>Connect a Sanity project to use the live content inspector.</p>
        )}
      </main>
    </>
  );
}
