"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Copy, KeyRound, X, ArrowRight } from "lucide-react";
import { api } from "./common";

export function OrganizerAccess({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);
  async function copy() {
    setBusy(true);
    setError("");
    try {
      const value =
        code || (await api<{ code: string }>(`/api/events/${id}/access`)).code;
      setCode(value);
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
      } catch {
        setError(
          "Clipboard access isn’t available. Reveal the code, then select and copy it.",
        );
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="organizer-access" aria-label="Organizer access">
      <button
        className="icon-button close-panel"
        onClick={onClose}
        aria-label="Close organizer access"
      >
        <X size={18} />
      </button>
      <KeyRound size={25} strokeWidth={1.5} />
      <div>
        <h2>Keep your way back.</h2>
        <p>
          Save a private access code in your password manager. Use it to open
          this gathering on another device or after clearing this browser.
        </p>
        <p>
          <strong>Anyone with this code can manage your gathering.</strong> Send
          guests the participant invite instead.
        </p>
        <button className="button secondary" onClick={copy} disabled={busy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {busy
            ? "Preparing code…"
            : copied
              ? "Code copied"
              : "Copy private access code"}
        </button>
        {code && (
          <div className="access-code-field">
            <label htmlFor="organizer-code">Private access code</label>
            <input
              id="organizer-code"
              type={show ? "text" : "password"}
              readOnly
              value={code}
              autoComplete="off"
              onFocus={(event) => event.target.select()}
            />
            <button className="text-button" onClick={() => setShow(!show)}>
              {show ? "Hide code" : "Reveal code"}
            </button>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Link className="text-button" href="/help#access">
          How organizer access works
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}

export function RestoreAccess() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function restore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ id: string }>("/api/restore", {
        code: code.trim(),
      });
      setCode("");
      router.replace(`/event/${result.id}`);
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }
  return (
    <section className="restore-page">
      <KeyRound size={30} strokeWidth={1.5} />
      <h1>Back to your gathering.</h1>
      <p className="product-lede">
        Paste the private access code you saved from your organizer workspace.
      </p>
      <form className="setup-form" onSubmit={restore}>
        <label htmlFor="restore-code">Organizer access code</label>
        <input
          id="restore-code"
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          required
          maxLength={150}
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
        />
        <p className="field-help">
          Your participant invite is a different link and cannot unlock
          organizer controls.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button dark" disabled={busy}>
          {busy ? "Checking your code…" : "Open my gathering"}
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="restore-help">
        Don’t have a code? Open the gathering in the browser where you created
        it and choose <strong>Save organizer access</strong>.{" "}
        <Link href="/help#access">Read the access guide</Link>.
      </p>
    </section>
  );
}
