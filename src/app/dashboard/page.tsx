"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Copy,
  ExternalLink,
  Lock,
  RotateCcw,
  ShieldAlert,
  ShoppingBag,
} from "lucide-react";
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
import { fetchRegistryChannels, fetchAccessPassesFromRegistry } from "@/lib/supabase/registry";
import type { PurchasedItem, Subscription } from "@/lib/keepr/types";
import { cn } from "@/lib/utils";

// 3-Day Grace period before permanent auto-removal from client vault
const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

export default function DashboardPage() {
  const connected = useKeepr((s) => s.connected);
  const hasHydrated = useKeepr((s) => s.hasHydrated);
  const subs = useKeepr((s) => s.subs);
  const purchases = useKeepr((s) => s.purchases);
  const customCreators = useKeepr((s) => s.customCreators);
  const sessionKey = useKeepr((s) => s.sessionKey);
  const reset = useKeepr((s) => s.reset);
  const syncOnchainSubscriptions = useKeepr((s) => s.syncOnchainSubscriptions);
  const mergeRegistryChannels = useKeepr((s) => s.mergeRegistryChannels);
  const [now, setNow] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<"subscriptions" | "library">("subscriptions");

  const connectedAddress = useStoreWallet((s) => s.address);
  const isWalletConnected = useStoreWallet((s) => s.isConnected);

  // Sync registry channels from Supabase
  useEffect(() => {
    fetchRegistryChannels().then(({ channels, rates }) => {
      if (channels.length > 0) {
        fetchAccessPassesFromRegistry().then((passes) => {
          mergeRegistryChannels(channels, rates, passes);
        });
      }
    });
  }, [mergeRegistryChannels]);

  // Pure on-chain subscriber sync: query is_active(sub_id) directly on Starknet via RPC (no database)
  useEffect(() => {
    if (connectedAddress) {
      void syncOnchainSubscriptions(connectedAddress);
    }
  }, [connectedAddress, syncOnchainSubscriptions, customCreators.length]);

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
            {activeTab === "subscriptions" ? "Active Subscriptions" : "Lifetime Access Vault"}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink font-prose">
            {activeTab === "subscriptions"
              ? "Manage your active channels and automated renewals. Subscriptions renew autonomously via delegated session keys and can be revoked on-chain at any time."
              : "Permanent cryptographically verified vault of your single licenses, software passes, and lifetime access keys."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex border border-line bg-cream p-0.5 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("subscriptions")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                activeTab === "subscriptions"
                  ? "bg-accent text-cream shadow-sm"
                  : "text-muted hover:text-ink",
              )}
            >
              Subscriptions ({active.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("library")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                activeTab === "library"
                  ? "bg-accent text-cream shadow-sm"
                  : "text-muted hover:text-ink",
              )}
            >
              Lifetime Vault ({purchases.length})
            </button>
          </div>

          {connected && !isWalletConnected && (
            <Button variant="ghost" size="sm" onClick={() => reset()} className="text-xs font-mono">
              Reset Simulation
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8">
        <VaultStrip />
      </div>

      {activeTab === "subscriptions" ? (
        <>
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
        </>
      ) : (
        /* LIFETIME ACCESS VAULT TAB */
        <>
          {purchases.length === 0 ? (
            <section className="mt-10 bg-raised px-5 py-12 text-center shadow-[var(--shadow-border)]">
              <ShoppingBag className="mx-auto size-10 text-muted" />
              <p className="kicker mt-3">Lifetime Access Vault</p>
              <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-ink">
                No lifetime passes in vault
              </h2>
              <p className="mt-2 text-sm text-muted max-w-md mx-auto font-sans leading-relaxed">
                You haven't acquired any lifetime access passes or licenses yet. Standalone passes purchased from creator catalogs are cryptographically stored here.
              </p>
              <Button asChild className="mt-6">
                <Link href="/subscribe">Explore Access Passes</Link>
              </Button>
            </section>
          ) : (
            <section className="mt-10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-accent">
                    Lifetime Vault Assets
                  </p>
                  <p className="text-xs text-muted font-sans mt-0.5 leading-relaxed">
                    {purchases.length} lifetime {purchases.length === 1 ? "pass" : "passes"} unlocked permanently with on-chain cryptographic settlement.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {purchases.map((p) => (
                  <PurchasedItemCard
                    key={p.id}
                    purchase={p}
                    customCreators={customCreators}
                  />
                ))}
              </div>
            </section>
          )}
        </>
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
              {creator?.pricingType === "flat" ? `${tier.name} (Single Plan)` : tier.name} · {formatStrk(sub.amountStrk)} STRK (~{formatStrkUsd(sub.amountStrk)}) / 30 days
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="stamp">Active</span>
            <span className="inline-flex items-center gap-1 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Keeper Monitored
            </span>
          </div>
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
          <DialogDescription className="font-sans text-xs text-muted leading-relaxed">
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
              {creator?.pricingType === "flat" ? `${tier.name} (Single Plan)` : tier.name} · {formatStrk(sub.amountStrk)} STRK (~{formatStrkUsd(sub.amountStrk)})
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

function PurchasedItemCard({
  purchase,
  customCreators,
}: {
  purchase: PurchasedItem;
  customCreators: any[];
}) {
  const [copied, setCopied] = useState(false);
  const creator = findCreator(purchase.creatorId, customCreators);
  const { formatStrkUsd } = useStrkPrice();

  const handleCopy = () => {
    navigator.clipboard.writeText(purchase.deliveryUrl);
    setCopied(true);
    toast.success("Delivery URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="border border-line bg-raised p-5 shadow-[var(--shadow-border)] flex flex-col justify-between space-y-4">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[9px] uppercase tracking-wider bg-base border border-emerald-500/30 text-emerald-400 px-2 py-0.5 font-semibold">
            Lifetime Pass
          </span>
          <span className="font-mono text-[10px] text-muted">
            Acquired {formatDate(purchase.purchasedAt)}
          </span>
        </div>

        <h3 className="font-display text-lg font-bold uppercase text-ink leading-snug">
          {purchase.title}
        </h3>

        <p className="font-sans text-xs text-muted">
          Channel: <span className="text-ink font-semibold">{creator?.name || purchase.creatorId}</span>
          {creator?.handle ? ` (${creator.handle})` : ""}
        </p>

        <div className="pt-2 border-t border-line/60 flex items-center justify-between text-xs font-mono">
          <span className="text-subtle">Amount Paid:</span>
          <span className="font-bold text-ink">
            {formatStrk(purchase.amountStrk)} STRK
            <span className="text-muted font-normal ml-1">
              (~{formatStrkUsd(purchase.amountStrk)})
            </span>
          </span>
        </div>

        {purchase.txHash && !purchase.txHash.startsWith("sub_") ? (
          <div className="text-[11px] font-mono text-subtle truncate pt-1">
            Proof:{" "}
            <a
              href={`https://starkscan.co/tx/${purchase.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {purchase.txHash.slice(0, 16)}…
            </a>
          </div>
        ) : null}
      </div>

      <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          title="Copy Access Link"
          className="h-8 px-2.5 font-mono text-xs"
        >
          {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
        </Button>
        <a
          href={purchase.deliveryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <Button
            size="sm"
            className="w-full h-8 font-mono text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="size-3.5" />
            Unlock Lifetime Pass
          </Button>
        </a>
      </div>
    </article>
  );
}

