"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Lock, RotateCcw, ShieldAlert } from "lucide-react";
import { useStoreWallet } from "@/app/components/Wallet/walletContext";
import { WalletModal } from "@/components/wallet-modal";
import { Kicker } from "@/components/kicker";
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
import { rateById } from "@/lib/keepr/data";
import { formatCountdown, formatDate, formatStrk } from "@/lib/keepr/format";
import { buildCancelActions, refreshLiveBalances } from "@/lib/keepr/onchain";
import { findCreator, useKeepr } from "@/lib/keepr/store";
import { useStrkPrice } from "@/lib/keepr/price";
import { parseStarknetError } from "@/lib/keepr/errors";
import type { Subscription } from "@/lib/keepr/types";

// 3-Day Grace period before permanent auto-removal from client vault
const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

export default function DashboardPage() {
  const connected = useKeepr((s) => s.connected);
  const hasHydrated = useKeepr((s) => s.hasHydrated);
  const subs = useKeepr((s) => s.subs);
  const customCreators = useKeepr((s) => s.customCreators);
  const sessionKey = useKeepr((s) => s.sessionKey);
  const reset = useKeepr((s) => s.reset);
  const [now, setNow] = useState(() => Date.now());

  const isWalletConnected = useStoreWallet((s) => s.isConnected);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const [walletModalOpen, setWalletModalOpen] = useState(false);

  if (!hasHydrated) return <LoadingVault />;

  const isLive = isWalletConnected || connected;

  // Active subscriptions
  const active = isLive ? subs.filter((s) => s.active) : [];

  // Inactive subscriptions within the 3-day grace window
  // (Subscriptions expired for > 3 days are filtered out / auto-removed from the vault)
  const graceSubs = isLive
    ? subs.filter(
        (s) =>
          !s.active &&
          now <= (s.nextRenewalAt || s.startedAt) + GRACE_PERIOD_MS,
      )
    : [];

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
            <ChannelRow
              key={s.id}
              sub={s}
              now={now}
              sessionKey={sessionKey}
              customCreators={customCreators}
            />
          ))}
        </section>
      )}

      {/* 3-Day Grace Period / Expired Channels Section */}
      {graceSubs.length > 0 && (
        <section className="mt-14 border-t border-line/80 pt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="kicker text-gold flex items-center gap-1.5">
                <ShieldAlert className="size-3.5" />
                <span>Expired Channels · 3-Day Grace Period</span>
              </p>
              <p className="mt-1 font-mono text-xs text-muted">
                Re-subscribe to restore access. Channels are automatically cleared from the vault after 3 days.
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase border border-line bg-cream px-2 py-1 text-gold font-bold">
              Cleared after 3 days
            </span>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {graceSubs.map((s) => (
              <GraceChannelRow
                key={s.id}
                sub={s}
                now={now}
                customCreators={customCreators}
              />
            ))}
          </div>
        </section>
      )}

      <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
    </main>
  );
}

function ChannelRow({
  sub,
  now,
  sessionKey,
  customCreators,
}: {
  sub: Subscription;
  now: number;
  sessionKey: boolean;
  customCreators: any[];
}) {
  const [confirm, setConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const creatorRates = useKeepr((s) => s.creatorRates);
  const cancel = useKeepr((s) => s.cancel);
  const setAutoRenew = useKeepr((s) => s.setAutoRenew);
  const myWalletAccount = useStoreWallet((s) => s.myWalletAccount);
  const isWalletConnected = useStoreWallet((s) => s.isConnected);

  const creator = findCreator(sub.creatorId, customCreators);
  const tier = rateById(sub.creatorId, sub.tier, creatorRates);
  const { formatStrkUsd } = useStrkPrice();

  const serviceUrl = sub.serviceUrl || creator?.serviceUrl;

  async function handleConfirmCancel() {
    setCancelling(true);
    const connectedAddress = useStoreWallet.getState().address;
    const payoutAddress =
      sub.creatorAddress ||
      creator?.address ||
      process.env.NEXT_PUBLIC_CREATOR_PAYOUT ||
      connectedAddress ||
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
            : (res as { transaction_hash?: string; transactionHash?: string })
                ?.transaction_hash || "";
        toast.success("Subscription channel cancelled on-chain", {
          description: txHash
            ? `Tx: ${txHash.slice(0, 14)}…`
            : "Cancellation confirmed on Starknet",
          action: txHash
            ? {
                label: "View",
                onClick: () =>
                  window.open(`https://starkscan.co/tx/${txHash}`, "_blank"),
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
    <div className="bg-raised p-5 shadow-[var(--shadow-border)] flex flex-col justify-between">
      <div>
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

        {/* Gated Billable Service Link (Accessible while sub is active) */}
        {serviceUrl && (
          <div className="mt-4 border border-line bg-cream p-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase font-bold text-accent tracking-[0.12em]">
                Gated Service Access
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-muted truncate">
                {serviceUrl}
              </p>
            </div>
            <a
              href={serviceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-line bg-accent text-cream px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] hover:bg-accent-hover transition-colors shrink-0"
            >
              <span>Access</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        )}

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
        <DialogContent className="max-w-md border border-line bg-raised p-6 shadow-2xl">
          <p className="kicker text-accent">Revoke Subscription</p>
          <DialogTitle className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
            Cancel Channel Subscription?
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted">
            The keeper will cease auto-renewing payments for {creator?.name ?? sub.creatorId}. You will keep access until the 3-day grace period concludes.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirm(false)}
              disabled={cancelling}
            >
              Keep Subscription
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleConfirmCancel()}
              disabled={cancelling}
            >
              {cancelling ? "Revoking on-chain…" : "Confirm Cancel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GraceChannelRow({
  sub,
  now,
  customCreators,
}: {
  sub: Subscription;
  now: number;
  customCreators: any[];
}) {
  const creatorRates = useKeepr((s) => s.creatorRates);
  const creator = findCreator(sub.creatorId, customCreators);
  const tier = rateById(sub.creatorId, sub.tier, creatorRates);
  const { formatStrkUsd } = useStrkPrice();

  const cutoff = (sub.nextRenewalAt || sub.startedAt) + GRACE_PERIOD_MS;
  const remainingMs = Math.max(0, cutoff - now);
  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  const remainingDays = Math.ceil(remainingHours / 24);

  const serviceUrl = sub.serviceUrl || creator?.serviceUrl;

  return (
    <div className="border border-line/70 bg-raised/70 p-5 shadow-[var(--shadow-border)] flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              {creator?.category ?? "Channel"}
            </p>
            <h3 className="mt-1 font-display text-xl font-bold uppercase tracking-tight text-ink">
              {creator?.name ?? sub.creatorId}
            </h3>
            <p className="mt-1 font-mono text-xs text-muted">
              {tier.name} · {formatStrk(sub.amountStrk)} STRK (~{formatStrkUsd(sub.amountStrk)})
            </p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] border border-line bg-cream px-2 py-0.5 text-gold font-bold">
            Expired
          </span>
        </div>

        {/* Service Lock state */}
        {serviceUrl && (
          <div className="mt-3 border border-line/60 bg-raised2 p-2.5 flex items-center gap-2">
            <Lock className="size-3.5 text-subtle shrink-0" />
            <span className="font-mono text-[10px] uppercase text-muted truncate">
              Service Locked (Subscription Inactive)
            </span>
          </div>
        )}

        <div className="mt-4 border-t border-line/60 pt-3 font-mono text-xs flex items-center justify-between text-muted">
          <span>Grace Period Remaining:</span>
          <span className="font-bold text-gold tabular-nums">
            {remainingHours > 24 ? `${remainingDays} days` : `${remainingHours} hours`}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-3">
        <span className="font-mono text-[10px] text-subtle">
          Cleared after 3 days
        </span>
        <Button asChild size="sm">
          <Link href={`/subscribe?channel=${sub.creatorId}`}>
            <RotateCcw className="size-3.5 mr-1" />
            Re-subscribe
          </Link>
        </Button>
      </div>
    </div>
  );
}
