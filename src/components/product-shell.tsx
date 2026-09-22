import Link from "next/link";
import { Header } from "./common";

export function ProductShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="product-page">{children}</main>
      <footer className="product-footer">
        <span>INKSHIFT · Your paper. Your call.</span>
        <nav aria-label="Footer">
          <Link href="/help">Help</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/about">About</Link>
        </nav>
      </footer>
    </>
  );
}
