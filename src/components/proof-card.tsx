"use client";

import { useState } from "react";
import { HashGrid } from "@/components/hash-grid";
import { Button } from "@/components/ui/button";
import { creatorById, rateById } from "@/lib/keepr/data";
import { formatDate, serialFromId } from "@/lib/keepr/format";
import { useKeepr } from "@/lib/keepr/store";
import type { Subscription } from "@/lib/keepr/types";
import { cn } from "@/lib/utils";

export function ProofCard({
  sub,
  compact = false,
}: {
  sub: Subscription;
  compact?: boolean;
}) {
  const creator = creatorById(sub.creatorId);
  const book = useKeepr((s) => s.creatorRates);
  const tier = rateById(sub.creatorId, sub.tier, book);
  const [phase, setPhase] = useState<"idle" | "proving" | "valid">("idle");

  function verify() {
    setPhase("proving");
    window.setTimeout(() => setPhase("valid"), 1200);
  }

  return (
    <article className="bg-cream text-ink shadow-[var(--shadow-border)]">
      <div className="perforation bg-cream" />
      <div className={cn("px-5 py-5", compact ? "sm:px-5" : "sm:px-6 sm:py-6")}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="kicker">{sub.active ? "Active subscription" : "Revoked"}</p>
            <h3 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight">
              {creator?.name ?? sub.creatorId}
            </h3>
            <p className="mt-1 font-mono text-xs text-muted">{creator?.handle}</p>
          </div>
          <span className="stamp">{sub.active ? "Valid" : "Void"}</span>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-xs sm:grid-cols-4">
          <div>
            <dt className="uppercase tracking-[0.16em] text-gold">{tier.name}</dt>
            <dd className="mt-1 tabular-nums text-ink">{sub.amountStrk} STRK / 30d</dd>
          </div>
          <div>
            <dt className="uppercase tracking-[0.16em] text-subtle">Issued</dt>
            <dd className="mt-1 tabular-nums">{formatDate(sub.startedAt)}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-[0.16em] text-subtle">Renews</dt>
            <dd className="mt-1 tabular-nums">{formatDate(sub.nextRenewalAt)}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-[0.16em] text-subtle">Serial</dt>
            <dd className="mt-1 tabular-nums">{serialFromId(sub.id)}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
          <HashGrid seed={sub.txHash + sub.id} className="h-16 w-16 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
              Membership note
            </p>
            <p className="mt-1 truncate font-mono text-[11px] text-ink">
              {sub.id} · {sub.txHash.slice(0, 18)}…
            </p>
            {phase === "proving" ? (
              <div className="mt-3 h-0.5 w-full bg-line">
                <div className="prove-bar h-0.5 bg-accent" />
              </div>
            ) : null}
            {phase === "valid" ? (
              <p className="mt-2 font-mono text-[11px] text-ok">
                Proof holds. Verifier learns tier and expiry — not the payer.
              </p>
            ) : null}
          </div>
          {sub.active ? (
            <Button
              variant={phase === "valid" ? "cream" : "outline"}
              size="sm"
              onClick={verify}
              disabled={phase === "proving"}
            >
              {phase === "idle"
                ? "Verify"
                : phase === "proving"
                  ? "Proving"
                  : "Holds"}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="perforation rotate-180 bg-cream" />
    </article>
  );
}
