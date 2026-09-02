"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useStoreWallet } from "@/app/components/Wallet/walletContext";
import { WalletModal } from "@/components/wallet-modal";
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
import { buildCancelActions, refreshLiveBalances } from "@/lib/keepr/onchain";
import { useKeepr } from "@/lib/keepr/store";
import { useStrkPrice } from "@/lib/keepr/price";
import { parseStarknetError } from "@/lib/keepr/errors";
import type { Subscription } from "@/lib/keepr/types";

export default function DashboardPage() {
  const connected = useKeepr((s) => s.connected);
  const hasHydrated = useKeepr((s) => s.hasHydrated);
  const subs = useKeepr((s) => s.subs);
  const sessionKey = useKeepr((s) => s.sessionKey);
  const reset = useKeepr((s) => s.reset);
  const [now, setNow] = useState(() => Date.now());

  const isWalletConnected = useStoreWallet((s) => s.isConnected);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const [walletModalOpen, setWalletModalOpen] = useState(false);

  if (!hasHydrated) return <LoadingVault />;

  const isLive = isWalletConnected || connected;

  const active = isLive ? subs.filter((s) => s.active) : [];
  const ended = isLive ? subs.filter((s) => !s.active) : [];

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>Dashboard</Kicker>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-ink md:text-5xl">
            Active Subscriptions
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink font-prose">
            Manage your active channels and automated renewals. Subscriptions renew autonomously via delegated session keys and can be revoked on-chain at any time.
          </p>
        </div>
        {connected && !isWalletConnected && (
          <Button variant="ghost" onClick={() => reset()}>
            Reset Simulation
          </Button>
        )}
      </div>

      <div className="mt-8">
        <VaultStrip />
      </div>

      {active.length === 0 ? (
        <section className="mt-10 bg-raised px-5 py-12 text-center shadow-[var(--shadow-border)]">
          <p className="kicker">No Active Channels</p>
          <h2 className="mt-3 font-display text-2xl font-bold uppercase tracking-tight text-ink">
            No active subscriptions found
          </h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Shield your STRK tokens into a private note and choose a channel to start your first private subscription.
          </p>
          <Button asChild className="mt-6">
            <Link href="/subscribe">Explore Channels</Link>
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

      <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
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
  const { formatStrkUsd } = useStrkPrice();

  async function handleConfirmCancel() {
    setCancelling(true);
    const connectedAddress = useStoreWallet.getState().address;
    const payoutAddress =
      sub.creatorAddress ||
      process.env.NEXT_PUBLIC_CREATOR_PAYOUT ||
      connectedAddress ||
      creator?.address ||
      "";

    try {
      if (isWalletConnected && myWalletAccount && sub.authSecret && payoutAddress) {
        toast("Submitting on-chain cancellation through Privacy Pool…");
        const actions = buildCancelActions({
          creatorAddress: payoutAddress,
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
        toast.success("Subscription channel cancelled on-chain", {
          description: txHash ? `Tx: ${txHash.slice(0, 14)}…` : "Cancellation confirmed on Starknet",
          action: txHash
            ? {
                label: "View",
                onClick: () => window.open(`https://starkscan.co/tx/${txHash}`, "_blank"),
              }
            : undefined,
        });

        setTimeout(() => {
          void refreshLiveBalances({ fetchShielded: true });
        }, 800);
      } else {
        toast.info("Channel revoked (demo mode).");
      }
      cancel(sub.id);
      setConfirm(false);
    } catch (err: any) {
      const parsed = parseStarknetError(err);
      if (parsed.isUserRejection) {
        toast.info("Cancellation rejected in Ready X.");
      } else {
        toast.error(parsed.message, { description: parsed.detail });
      }
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
            {tier.name} · {formatStrk(sub.amountStrk)} STRK (~{formatStrkUsd(sub.amountStrk)}) / 30 days
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
