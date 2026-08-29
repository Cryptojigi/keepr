"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import SelectWallet from "@/app/components/client/WalletHandle/SelectWallet";
import { KeeprWordmark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { shortAddr } from "@/lib/keepr/format";
import { useKeepr } from "@/lib/keepr/store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/subscribe", label: "Subscribe" },
  { href: "/dashboard", label: "Vault" },
  { href: "/creator", label: "Creator" },
  { href: "/verify", label: "Verify" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const connected = useKeepr((s) => s.connected);
  const address = useKeepr((s) => s.address);
  const disconnect = useKeepr((s) => s.disconnect);
  const [menu, setMenu] = useState(false);
  const [wallet, setWallet] = useState(false);

  return (
    <header className="keepr-header sticky top-0 z-40 border-b border-line bg-base">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-5">
        <Link href="/" className="shrink-0" onClick={() => setMenu(false)}>
          <KeeprWordmark />
        </Link>
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-2 py-3 font-mono text-xs uppercase tracking-[0.16em] transition-colors duration-150",
                pathname === item.href
                  ? "text-accent"
                  : "text-muted hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:inline-flex">
            <SelectWallet variant="nav" />
          </div>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center text-ink md:hidden"
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-label={menu ? "Close menu" : "Open menu"}
          >
            {menu ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {menu ? (
        <div className="border-t border-line bg-raised md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-5 py-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenu(false)}
                className={cn(
                  "flex h-11 items-center font-mono text-xs uppercase tracking-[0.16em]",
                  pathname === item.href ? "text-accent" : "text-ink",
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 py-2 border-t border-line">
              <SelectWallet variant="gate" />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
