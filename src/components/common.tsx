"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoveUpRight, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { EventView } from "@/lib/model";

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link
      className={`brand ${small ? "brand-small" : ""}`}
      href="/"
      aria-label="INKSHIFT home"
    >
      <span className="brand-mark">
        <MoveUpRight size={22} strokeWidth={2.8} />
      </span>
      INKSHIFT<span className="brand-period">.</span>
    </Link>
  );
}
export function Header() {
  const path = usePathname();
  return (
    <header className="site-header">
      <Brand />
      <nav className="product-navigation" aria-label="Main navigation">
        <Link href="/#how-it-works" className="how-link">
          How it works
        </Link>
        <Link
          href="/gatherings"
          aria-current={path === "/gatherings" ? "page" : undefined}
        >
          Your gatherings
        </Link>
        <Link href="/help" aria-current={path === "/help" ? "page" : undefined}>
          Help
        </Link>
      </nav>
    </header>
  );
}
export const timeLabel = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h >= 12 ? "PM" : "AM"}`;
};
export const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
export function Loading({ text = "Opening your plan…" }: { text?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={26} />
      <p>{text}</p>
    </div>
  );
}
export async function api<T>(
  url: string,
  payload?: unknown,
  method = "POST",
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: payload ? { "content-type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(80_000),
  }).catch(() => {
    throw new Error(
      "The connection was interrupted. Check your internet connection and try again.",
    );
  });
  const data = await response.json().catch(() => {
    throw new Error(
      "The server could not complete the request. Please try again.",
    );
  });
  if (!response.ok)
    throw new Error(data.error ?? "Something went wrong. Try again.");
  return data;
}
export function useEvent(id: string) {
  const [event, setEvent] = useState<EventView | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const next = await api<EventView>(`/api/events/${id}`, undefined, "GET");
      setEvent((current) =>
        !current || next.version >= current.version ? next : current,
      );
      setError("");
      setConnected(true);
      return next;
    } catch (e) {
      setError((e as Error).message);
      setConnected(false);
      return null;
    }
  }, [id]);
  useEffect(() => {
    let active = true;
    const update = () => {
      if (active && document.visibilityState === "visible") void refresh();
    };
    queueMicrotask(update);
    const timer = setInterval(update, 2500);
    document.addEventListener("visibilitychange", update);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh]);
  return { event, error, connected, refresh };
}
export async function imageData(file: File) {
  if (file.size > 15_000_000)
    throw new Error("Choose a photograph under 15 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image could not be opened. Use JPEG, PNG, or WebP.");
  }
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("Your browser could not prepare the photograph.");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.88, 0.7, 0.5]) {
    const data = canvas.toDataURL("image/jpeg", quality);
    if (data.length < 1_800_000) return data;
  }
  throw new Error(
    "This photo is still too large. Crop closer to the paper and try again.",
  );
}
