import Link from "next/link";
import { ProductShell } from "@/components/product-shell";
export const metadata = { title: "Privacy & your data · INKSHIFT" };
export default function Page() {
  return (
    <ProductShell>
      <article className="product-guide">
        <h1>Privacy &amp; your data.</h1>
        <p className="product-lede">
          What you share, what stays private, and what to keep safe.
        </p>
        <h2>Your public signup page</h2>
        <p>
          A gathering’s name, date, time zone, table names, activities and
          available-place counts are public to anyone with its link. Use details
          you are comfortable sharing. Other participants’ names, registrations,
          organizer controls and uploaded photos are not included in that public
          view.
        </p>
        <h2>Your photographs</h2>
        <p>
          Photos are stored privately in Sanity Content Lake. When you ask
          INKSHIFT to read a photo, it sends the image to Qwen3-VL through
          Hugging Face Inference Providers. It may also send the previous photo
          and approved schedule to understand an edit. Participant names and
          organizer access codes are excluded from that request.
        </p>
        <p>
          Upload event plans you have permission to use. Avoid private contact
          information or unrelated personal details on the sheet. Photos and
          previous plan revisions remain stored; there is no automatic deletion
          schedule or in-app deletion tool yet.
        </p>
        <h2>Names and registrations</h2>
        <p>
          Participants supply a name so the organizer can identify their
          booking. The organizer can see names and registrations. Each
          participant can see and cancel their own bookings from the browser
          they used to join. There is no email verification, and separate
          browsers can create separate registrations.
        </p>
        <h2>Browser access</h2>
        <p>
          INKSHIFT uses essential browser cookies for organizer and participant
          access. Those cookies last 30 days unless cleared sooner. A saved
          organizer access code lets you reopen a gathering on another device.
          Keep it private: it grants the same control as the original browser.
        </p>
        <p>
          INKSHIFT does not add advertising trackers or analytics scripts. Its
          hosting and data providers may keep operational request logs.
        </p>
        <h2>Before you invite people</h2>
        <p>
          Check the date, time zone and plan, then share the participant link.
          Keep the organizer code separate.{" "}
          <Link href="/help">Read the organizer guide</Link> for setup and
          recovery.
        </p>
      </article>
    </ProductShell>
  );
}
