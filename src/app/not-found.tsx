import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-empty">
      <h1>This page wandered off.</h1>
      <p>The event link may be incomplete.</p>
      <Link className="button primary" href="/">
        Back to INKSHIFT
      </Link>
    </main>
  );
}
