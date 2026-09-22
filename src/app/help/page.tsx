import Link from "next/link";
import { ProductShell } from "@/components/product-shell";
export const metadata = { title: "Help · INKSHIFT" };
export default function Page() {
  return (
    <ProductShell>
      <article className="product-guide">
        <h1>A good plan, with room to change.</h1>
        <p className="product-lede">
          A quick guide to organizing a gathering with INKSHIFT.
        </p>
        <h2>Start with your gathering</h2>
        <p>
          <Link href="/new">Create a gathering</Link> with a name, date and time
          zone. Then upload a photo or enter the plan by hand. Add a table or
          space for each location, and a session for each game or activity.
        </p>
        <h2>Give the reader a clear page</h2>
        <p>
          Keep the whole sheet in view, with enough light to read it. Include
          activity names, table names, start and end times, and player limits.
          JPEG, PNG and WebP are supported; if your phone’s photo will not open,
          export it as JPEG. You can always type or correct the plan yourself.
        </p>
        <p>
          The reader can miss details or match a game incorrectly. Check every
          reading before you approve it. A new photo is a proposal; it does not
          change the live plan on its own.
        </p>
        <h2>Invite people once the plan is ready</h2>
        <p>
          Choose <strong>Invite people</strong> and share the participant link
          or QR code. Guests enter a name and join a session. Their place is
          saved in that browser. They can leave a session from the same page.
        </p>
        <h2>Change a table, keep the people</h2>
        <p>
          Upload an edited plan or choose <strong>Edit plan</strong>. Match each
          existing activity to the same session before approving. When a session
          moves, its registrations move with it. INKSHIFT checks table
          availability, time conflicts and capacity.
        </p>
        <p>
          If someone joins while you are reviewing, recheck the proposal before
          approving. Discarding a proposal keeps the live plan unchanged. Saved
          reviews show the outcome of earlier decisions.
        </p>
        <h2 id="access">Keep organizer access</h2>
        <p>
          <Link href="/gatherings">Your gatherings</Link> shows plans you can
          manage in this browser. Organizer access lasts 30 days in the browser
          unless its cookies are cleared sooner.
        </p>
        <p>
          In the workspace, choose <strong>Save organizer access</strong> and
          save the private code in your password manager. Use{" "}
          <Link href="/restore">Restore access</Link> on another device to
          reopen organizer controls. The code stays valid for that gathering;
          anyone who has it can manage the plan. It is separate from the
          participant invite.
        </p>
        <p>
          If you lose both the saved code and the browser’s access, INKSHIFT
          cannot recover organizer access for you.
        </p>
        <h2>Current limits</h2>
        <p>
          A gathering supports one day of activities, up to 12 tables or spaces,
          30 sessions and 300 registrations. Photos need checking; photographed
          handwriting across different conditions has not yet been validated.
          Shared daily limits apply to new gatherings and photo readings.
          Existing plans continue to work when those limits are reached.
        </p>
        <p>
          For details about photographs, participant names and the public signup
          page, read <Link href="/privacy">Privacy &amp; your data</Link>.
        </p>
      </article>
    </ProductShell>
  );
}
