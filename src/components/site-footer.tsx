"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { REPO_URL, RFP_URL, STRK20_URL } from "@/lib/keepr/constants";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  const pathname = usePathname();

  return (
    <footer className="mt-auto bg-accent text-cream border-t border-cream/20">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cream/80">
          Keepr · STRK20 private sprint · MIT
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-cream/90">
          <Link href="/" className="hover:text-cream transition-colors">
            Protocol
          </Link>
          <Link href="/docs" className="hover:text-cream transition-colors">
            Docs
          </Link>
          <a href={STRK20_URL} target="_blank" rel="noreferrer" className="hover:text-cream transition-colors">
            STRK20
          </a>
          <a href={RFP_URL} target="_blank" rel="noreferrer" className="hover:text-cream transition-colors">
            RFP-12
          </a>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-cream transition-colors">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
