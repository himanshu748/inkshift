import Link from "next/link";
import { ProductShell } from "@/components/product-shell";
export const metadata = { title: "About · INKSHIFT" };
export default function Page() {
  return (
    <ProductShell>
      <article className="product-guide">
        <h1>Plans change. People keep their place.</h1>
        <p className="product-lede">
          INKSHIFT helps small gatherings move from a paper plan to a shared
          signup page.
        </p>
        <p>
          Tables and activities have separate identities. If a game moves to
          another table, the registration stays with the game. An organizer
          checks every proposed change before it reaches the people who joined.
        </p>
        <h2>Built in the open</h2>
        <p>
          INKSHIFT is built for the{" "}
          <a
            href="https://dev.to/challenges/sanity-2026-09-16"
            target="_blank"
            rel="noreferrer"
          >
            DEV Sanity Challenge
          </a>
          . It uses Sanity Content Lake for plans and registrations, App SDK for
          live subscriptions, and Sanity Workflows for saved reviews. The{" "}
          <a
            href="https://github.com/himanshu748/inkshift"
            target="_blank"
            rel="noreferrer"
          >
            source and verification records
          </a>{" "}
          are public.
        </p>
        <p>
          The interactive landing example is illustrative. Practice gatherings
          use prepared plans. Uploading your own photo uses the image reader,
          and you can correct its output before approving it.
        </p>
        <div className="guide-actions">
          <Link className="button dark" href="/new">
            Plan a gathering
          </Link>
          <Link className="text-button" href="/help">
            Read the guide
          </Link>
        </div>
      </article>
    </ProductShell>
  );
}
