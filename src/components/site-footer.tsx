"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { REPO_URL, RFP_URL, STRK20_URL } from "@/lib/keepr/constants";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  const pathname = usePathname();
  const underClose = pathname === "/";

  return (
    <footer
      className={cn(
        "mt-auto bg-ink text-cream",
        underClose ? "border-t border-cream/15" : "keepr-footer",
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cream/75">
          Keepr · STRK20 private sprint · MIT
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-cream/80">
          <Link href="/" className="hover:text-cream">
            Protocol
          </Link>
          <Link href="/docs" className="hover:text-cream">
            Docs
          </Link>
          <a href={STRK20_URL} target="_blank" rel="noreferrer" className="hover:text-cream">
            STRK20
          </a>
          <a href={RFP_URL} target="_blank" rel="noreferrer" className="hover:text-cream">
            RFP-12
          </a>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-cream">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
