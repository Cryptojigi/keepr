"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useStoreWallet } from "@/app/components/Wallet/walletContext";
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
import { buildCancelActions } from "@/lib/keepr/onchain";
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
  const [confirm, setConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const creatorRates = useKeepr((s) => s.creatorRates);
  const cancel = useKeepr((s) => s.cancel);
  const setAutoRenew = useKeepr((s) => s.setAutoRenew);
  const myWalletAccount = useStoreWallet((s) => s.myWalletAccount);
  const isWalletConnected = useStoreWallet((s) => s.isConnected);

  const creator = creatorById(sub.creatorId);
  const tier = rateById(sub.creatorId, sub.tier, creatorRates);

  async function handleConfirmCancel() {
    setCancelling(true);
    try {
      if (isWalletConnected && myWalletAccount && sub.authSecret && creator?.address) {
        toast("Submitting on-chain cancellation through Privacy Pool…");
        const actions = buildCancelActions({
          creatorAddress: creator.address,
          tierId: sub.tier,
          subId: sub.id,
          authPreimage: sub.authSecret,
        });
        const res = await myWalletAccount.strk20InvokeTransaction(actions);
        const txHash =
          typeof res === "string"
            ? res
            : (res as { transaction_hash?: string; transactionHash?: string })?.transaction_hash ||
              "";
        toast.success(
          `Cancelled on-chain! Tx: ${txHash ? `${txHash.slice(0, 12)}…` : "Submitted"}`,
        );
      } else {
        toast("Channel revoked.");
      }
      cancel(sub.id);
      setConfirm(false);
    } catch (err) {
      console.error("Cancel failed:", err);
      toast.error(err instanceof Error ? err.message : "Cancel transaction failed.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="bg-raised p-5 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
            {creator?.category ?? "Channel"}
          </p>
          <h3 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight">
            {creator?.name ?? sub.creatorId}
          </h3>
          <p className="mt-1 font-mono text-xs text-muted">
            {tier.name} · {formatStrk(sub.amountStrk)} STRK / 30 days
          </p>
        </div>
        <span className="stamp">Active</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 font-mono text-xs sm:grid-cols-3">
        <div>
          <p className="uppercase tracking-[0.14em] text-subtle">Opened</p>
          <p className="mt-1 text-ink">{formatDate(sub.startedAt)}</p>
        </div>
        <div>
          <p className="uppercase tracking-[0.14em] text-subtle">Next charge</p>
          <p className="mt-1 text-ink">{formatDate(sub.nextRenewalAt)}</p>
        </div>
        <div>
          <p className="uppercase tracking-[0.14em] text-subtle">Keeper window</p>
          <p className="mt-1 tabular-nums text-gold">
            {formatCountdown(sub.nextRenewalAt)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
        <label className="flex cursor-pointer items-center gap-3 font-mono text-xs">
          <Switch
            checked={sub.autoRenew}
            onCheckedChange={(c) => setAutoRenew(sub.id, c)}
          />
          <span className="uppercase tracking-[0.14em] text-ink">
            Keeper auto-renewal
          </span>
        </label>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/verify`}>Proof pass</Link>
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
              disabled={cancelling}
              onClick={() => void handleConfirmCancel()}
            >
              {cancelling ? "Cancelling…" : "Confirm cancel"}
            </Button>
            <Button
              variant="ghost"
              disabled={cancelling}
              onClick={() => setConfirm(false)}
            >
              Keep
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
