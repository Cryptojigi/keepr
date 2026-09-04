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

const LANDING_NAV = [
  { href: "/", label: "Home" },
  { href: "/#how", label: "How it works" },
  { href: "/docs", label: "Docs" },
  { href: "/subscribe", label: "Explorer" },
] as const;

const APP_NAV = [
  { href: "/", label: "Home" },
  { href: "/subscribe", label: "Subscribe" },
  { href: "/dashboard", label: "Vault" },
  { href: "/creator", label: "Creator" },
  { href: "/verify", label: "Verify" },
  { href: "/docs", label: "Docs" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const connected = useKeepr((s) => s.connected);
  const [menu, setMenu] = useState(false);

  const isLanding = pathname === "/";
  const navItems = isLanding ? LANDING_NAV : APP_NAV;

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    if (href === "/#how" && pathname === "/") {
      e.preventDefault();
      const el = document.getElementById("how");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
      setMenu(false);
    } else if (href === "/" && pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      setMenu(false);
    } else {
      setMenu(false);
    }
  };

  const checkActive = (href: string) => {
    if (isLanding) {
      return href === "/";
    }
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <header className="keepr-header sticky top-0 z-40 border-b border-line bg-base overflow-hidden">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-5">
        <Link href="/" className="shrink-0" onClick={() => setMenu(false)}>
          <KeeprWordmark />
        </Link>
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = checkActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(item.href, e)}
                className={cn(
                  "px-2.5 py-3 font-mono text-xs uppercase tracking-[0.16em] transition-colors duration-150",
                  isActive
                    ? "text-accent font-semibold"
                    : "text-muted hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SelectWallet variant="nav" />
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
          {/* Mobile Connected Balance Bar */}
          {connected && (
            <div className="border-b border-line bg-cream px-5 py-2.5 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="led led-ok" aria-hidden />
                <span className="text-subtle text-[10px] uppercase">Shielded:</span>
                <span className="font-bold text-accent">{useKeepr.getState().shieldedStrk} STRK</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-subtle text-[10px] uppercase">Pub:</span>
                <span className="font-bold text-ink">{useKeepr.getState().publicStrk} STRK</span>
              </div>
            </div>
          )}
          <nav className="mx-auto flex max-w-6xl flex-col px-5 py-3">
            {navItems.map((item) => {
              const isActive = checkActive(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.href, e)}
                  className={cn(
                    "flex h-11 items-center font-mono text-xs uppercase tracking-[0.16em]",
                    isActive ? "text-accent font-semibold" : "text-ink",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
