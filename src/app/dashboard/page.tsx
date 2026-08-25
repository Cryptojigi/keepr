"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConnectGate } from "@/components/connect-gate";
import { Kicker } from "@/components/kicker";
import { ProofCard } from "@/components/proof-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { VaultStrip } from "@/components/vault-strip";
import { LoadingVault } from "@/components/loading-vault";
import { creatorById, rateById } from "@/lib/keepr/data";
import { formatCountdown, formatDate, formatStrk } from "@/lib/keepr/format";
import { useKeepr } from "@/lib/keepr/store";
import type { Subscription } from "@/lib/keepr/types";

export default function DashboardPage() {
  const connected = useKeepr((s) => s.connected);
  const hasHydrated = useKeepr((s) => s.hasHydrated);
  const subs = useKeepr((s) => s.subs);
  const sessionKey = useKeepr((s) => s.sessionKey);
  const reset = useKeepr((s) => s.reset);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!hasHydrated) return <LoadingVault />;

  if (!connected) {
    return (
      <main className="mx-auto max-w-6xl px-5">
        <ConnectGate
          title="Your vault is closed."
          body="Open the demo vault to see active channels, the membership card, and one-click cancel."
        >
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">
            FTC click-to-cancel. Instant.
          </p>
        </ConnectGate>
      </main>
    );
  }

  const active = subs.filter((s) => s.active);
  const ended = subs.filter((s) => !s.active);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>Vault</Kicker>
          <h1 className="mt-3 text-4xl md:text-5xl">Your channels.</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink">
            Auto-renew is a session key. Cancel is one click. The proof never
            reveals this address.
          </p>
        </div>
        <Button variant="ghost" onClick={() => reset()}>
          Reset demo
        </Button>
      </div>

      <div className="mt-8">
        <VaultStrip />
      </div>

      {active.length === 0 ? (
        <section className="mt-10 bg-raised px-5 py-12 text-center shadow-[var(--shadow-border)]">
          <p className="kicker">Empty</p>
          <h2 className="mt-3 text-2xl">No active channels.</h2>
          <p className="mt-2 text-sm text-muted">
            Shield, pick a creator, subscribe. The keeper takes it from there.
          </p>
          <Button asChild className="mt-6">
            <Link href="/subscribe">Open a channel</Link>
          </Button>
        </section>
      ) : (
        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          {active.map((s) => (
            <ChannelRow key={s.id} sub={s} now={now} sessionKey={sessionKey} />
          ))}
        </section>
      )}

      {ended.length > 0 ? (
        <section className="mt-12">
          <Kicker>Revoked</Kicker>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {ended.map((s) => (
              <ProofCard key={s.id} sub={s} compact />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function ChannelRow({
  sub,
  now,
  sessionKey,
}: {
  sub: Subscription;
  now: number;
  sessionKey: boolean;
}) {
  const creator = creatorById(sub.creatorId);
  const book = useKeepr((s) => s.creatorRates);
  const tier = rateById(sub.creatorId, sub.tier, book);
  const cancel = useKeepr((s) => s.cancel);
  const setAutoRenew = useKeepr((s) => s.setAutoRenew);
  const simulateRenew = useKeepr((s) => s.simulateRenew);
  const [confirm, setConfirm] = useState(false);

  function onToggle(on: boolean) {
    try {
      setAutoRenew(sub.id, on);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Rejected.");
    }
  }

  function onRenew() {
    try {
      const hash = simulateRenew(sub.id);
      toast(`Keeper renewed · ${hash.slice(0, 12)}…`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Rejected.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ProofCard sub={sub} />
      <div className="flex flex-col gap-3 bg-raised p-4 shadow-[var(--shadow-border)] sm:flex-row sm:items-center">
        <div className="flex min-h-11 flex-1 items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
              Auto-renew
            </p>
            <p className="mt-0.5 font-mono text-xs tabular-nums text-ink">
              Next {formatCountdown(sub.nextRenewalAt - now)} ·{" "}
              {formatDate(sub.nextRenewalAt)}
            </p>
          </div>
          <Switch
            checked={sub.autoRenew && sessionKey}
            onCheckedChange={onToggle}
            aria-label={`Auto-renew ${creator?.name ?? "channel"}`}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRenew}>
            Simulate tick
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
            Cancel
          </Button>
        </div>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <Kicker>Cancel</Kicker>
          <DialogTitle className="mt-3">End this channel.</DialogTitle>
          <DialogDescription>
            {creator?.name} · {tier.name} · {formatStrk(sub.amountStrk)} STRK.
            Instant. No fund movement. FTC click-to-cancel.
          </DialogDescription>
          <div className="mt-6 flex gap-2">
            <Button
              variant="danger"
              onClick={() => {
                cancel(sub.id);
                setConfirm(false);
                toast("Channel revoked.");
              }}
            >
              Confirm cancel
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
