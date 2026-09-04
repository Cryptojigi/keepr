"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Globe, Lock, Plus, Sparkles } from "lucide-react";
import { useStoreWallet } from "@/app/components/Wallet/walletContext";
import { CreateChannelModal } from "@/components/create-channel-modal";
import { Kicker } from "@/components/kicker";
import { LoadingVault } from "@/components/loading-vault";
import { Button } from "@/components/ui/button";
import { VaultStrip } from "@/components/vault-strip";
import { WalletModal } from "@/components/wallet-modal";
import { CREATORS, ratesForCreator } from "@/lib/keepr/data";
import { formatStrk } from "@/lib/keepr/format";
import {
  buildSubscribeActions,
  computeAuthCommit,
  computeSubId,
  isAccountDeployed,
  refreshLiveBalances,
} from "@/lib/keepr/onchain";
import { getAllCreators, useKeepr } from "@/lib/keepr/store";
import { useStrkPrice } from "@/lib/keepr/price";
import { parseStarknetError } from "@/lib/keepr/errors";
import type { Creator, TierId } from "@/lib/keepr/types";
import { cn } from "@/lib/utils";

export default function SubscribePage() {
  return (
    <Suspense fallback={<LoadingVault />}>
      <SubscribeContent />
    </Suspense>
  );
}

function SubscribeContent() {
  const connected = useKeepr((s) => s.connected);
  const hasHydrated = useKeepr((s) => s.hasHydrated);
  const shieldedStrk = useKeepr((s) => s.shieldedStrk);
  const publicStrk = useKeepr((s) => s.publicStrk);
  const sessionKey = useKeepr((s) => s.sessionKey);
  const grantSessionKey = useKeepr((s) => s.grantSessionKey);
  const subscribe = useKeepr((s) => s.subscribe);
  const shield = useKeepr((s) => s.shield);
  const setBusy = useKeepr((s) => s.setBusy);
  const busy = useKeepr((s) => s.busy);
  const subs = useKeepr((s) => s.subs);
  const customCreators = useKeepr((s) => s.customCreators);
  const creatorRates = useKeepr((s) => s.creatorRates);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatStrkUsd } = useStrkPrice();

  // Ready wallet on-chain state
  const myWalletAccount = useStoreWallet((s) => s.myWalletAccount);
  const connectedAddress = useStoreWallet((s) => s.address);
  const isWalletConnected = useStoreWallet((s) => s.isConnected);
  const walletObj = useStoreWallet((s) => s.StarknetWalletObject);
  const isReadyWallet = walletObj?.name
    ? walletObj.name.toLowerCase().includes("ready")
    : true;

  const [picked, setPicked] = useState<string | null>(null);
  const [tier, setTier] = useState<TierId>(1);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Handle direct link via ?channel=<id>
  const directChannelParam = searchParams.get("channel");
  useEffect(() => {
    if (directChannelParam) {
      setPicked(directChannelParam);
      setTier(1);
    }
  }, [directChannelParam]);

  const allChannels = useMemo(
    () => [...customCreators, ...CREATORS],
    [customCreators],
  );

  const creator = useMemo(
    () => (picked ? allChannels.find((c) => c.id === picked) ?? null : null),
    [picked, allChannels],
  );

  const rates = useMemo(
    () => (creator ? ratesForCreator(creator.id, creatorRates) : []),
    [creator, creatorRates],
  );

  const selectedTier = useMemo(
    () =>
      creator && rates.length > 0
        ? rates.find((t) => t.id === tier) ?? rates[1] ?? rates[0]
        : null,
    [creator, rates, tier],
  );

  const already = creator
    ? subs.some((s) => s.creatorId === creator.id && s.active)
    : false;
  const shortfall = selectedTier
    ? Math.max(0, selectedTier.strk - shieldedStrk)
    : 0;

  // Split channels:
  // 1. Public Custom Channels
  const publicCustomChannels = useMemo(
    () => customCreators.filter((c) => c.discoverable !== false && !c.archived),
    [customCreators],
  );

  // 2. Direct-linked private channel (if visited with direct link)
  const directLinkedPrivateChannel = useMemo(() => {
    if (!picked) return null;
    const ch = customCreators.find((c) => c.id === picked);
    return ch && ch.discoverable === false && !ch.archived ? ch : null;
  }, [picked, customCreators]);

  // 3. Demo Showcase Channels
  const showcaseChannels = CREATORS;

  const isLive = isWalletConnected || connected;

  async function onSubscribe() {
    if (!creator || !selectedTier) {
      toast.error("Please select a channel first.");
      return;
    }
    if (!isLive) {
      setWalletModalOpen(true);
      return;
    }
    if (already) {
      toast.info("You already have an active subscription to this channel.");
      return;
    }
    setBusy("subscribe");
    try {
      // 1. Real on-chain flow when Ready wallet is connected
      if (isWalletConnected && myWalletAccount && connectedAddress) {
        toast("Initiating on-chain subscription via Privacy Pool…");

        // Verify the wallet account is deployed on-chain
        const deployed = await isAccountDeployed(connectedAddress);
        if (!deployed) {
          toast.error(
            "Account not activated. Please deposit STRK to your wallet to activate it on Starknet.",
          );
          return;
        }

        // Generate client-side secret & salt
        const salt =
          "0x" +
          Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        const cancelSecret =
          "0x" +
          Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        const subId = computeSubId(connectedAddress, salt);
        const authCommit = computeAuthCommit(cancelSecret);

        // Payout address binds directly to the creator's address
        const creatorPayoutAddress =
          creator.address ||
          process.env.NEXT_PUBLIC_CREATOR_PAYOUT ||
          connectedAddress;

        const actions = buildSubscribeActions({
          creatorAddress: creatorPayoutAddress,
          tierId: selectedTier.id,
          amountStrk: selectedTier.strk,
          periodSeconds: 30 * 24 * 60 * 60,
          subId,
          authCommit,
        });

        // Send via Ready Wallet Account V6
        const res = await myWalletAccount.strk20InvokeTransaction(actions);
        const txHash =
          typeof res === "string"
            ? res
            : (res as { transaction_hash?: string; transactionHash?: string })
                ?.transaction_hash ||
              (res as { transaction_hash?: string; transactionHash?: string })
                ?.transactionHash ||
              "";

        toast.success(`Subscribed to ${creator.name}!`, {
          description: txHash
            ? `Tx: ${txHash.slice(0, 14)}…`
            : "Subscription confirmed on-chain",
          action: txHash
            ? {
                label: "View",
                onClick: () =>
                  window.open(`https://starkscan.co/tx/${txHash}`, "_blank"),
              }
            : undefined,
        });

        // Record in store
        const now = Date.now();
        useKeepr.setState((s) => ({
          subs: [
            {
              id: subId,
              creatorId: creator.id,
              tier: selectedTier.id,
              amountStrk: selectedTier.strk,
              startedAt: now,
              lastRenewedAt: now,
              nextRenewalAt: now + 30 * 24 * 60 * 60 * 1000,
              active: true,
              autoRenew: !!sessionKey,
              txHash: txHash || `0x${Date.now().toString(16)}`,
              authSecret: cancelSecret,
              salt,
              creatorAddress: creatorPayoutAddress,
              serviceUrl: creator.serviceUrl,
            },
            ...s.subs,
          ],
        }));

        setTimeout(() => {
          void refreshLiveBalances({ fetchShielded: true });
        }, 800);

        router.push("/dashboard");
        return;
      }

      // 2. Simulated flow fallback
      if (shortfall > 0) {
        if (publicStrk < shortfall) {
          toast.error("Not enough public STRK in your wallet to cover the note.");
          return;
        }
        await wait(500);
        shield(shortfall);
        toast.info(`Shielded ${shortfall} STRK to cover the note.`);
      }
      if (!sessionKey) grantSessionKey();
      await wait(900);
      subscribe(creator.id, selectedTier.id);
      toast.success(`Subscribed to ${creator.name}!`);
      router.push("/dashboard");
    } catch (e: any) {
      const parsed = parseStarknetError(e);
      if (parsed.isUserRejection) {
        toast.info("Subscription cancelled in Ready X.");
      } else {
        toast.error(parsed.message, { description: parsed.detail });
      }
    } finally {
      setBusy(null);
    }
  }

  if (!hasHydrated) {
    return <LoadingVault />;
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>STRK20 Subscriptions</Kicker>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-ink md:text-5xl">
            Explore Channels
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink font-prose">
            Subscribe to AI agents, automated intelligence feeds, and research publications. All payments settle privately on Starknet with zero address exposure.
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="h-11 shadow-[var(--shadow-border)]"
        >
          <Plus className="size-4 mr-1.5" />
          Create Channel
        </Button>
      </div>

      <div className="mt-8">
        <VaultStrip />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-8">
          {/* Direct-Linked Private Channel Banner */}
          {directLinkedPrivateChannel && (
            <div className="border border-line bg-cream p-5 shadow-[var(--shadow-border)]">
              <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-gold" />
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-ink">
                    Private Channel (Direct Link Access)
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase text-muted bg-raised px-2 py-0.5 border border-line">
                  Unlisted
                </span>
              </div>
              <div className="mt-4">
                <CreatorCard
                  creator={directLinkedPrivateChannel}
                  active={directLinkedPrivateChannel.id === picked}
                  subscribed={subs.some(
                    (s) => s.creatorId === directLinkedPrivateChannel.id && s.active,
                  )}
                  onPick={() => {
                    setPicked(directLinkedPrivateChannel.id);
                    setTier(1);
                  }}
                  formatStrkUsd={formatStrkUsd}
                />
              </div>
            </div>
          )}

          {/* Live Community Channels (User Created) */}
          {publicCustomChannels.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-accent">
                  Community Channels
                </p>
                <span className="font-mono text-[10px] text-muted">
                  {publicCustomChannels.length} published
                </span>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {publicCustomChannels.map((c) => (
                  <li key={c.id}>
                    <CreatorCard
                      creator={c}
                      active={c.id === picked}
                      subscribed={subs.some(
                        (s) => s.creatorId === c.id && s.active,
                      )}
                      onPick={() => {
                        setPicked(c.id);
                        setTier(1);
                      }}
                      formatStrkUsd={formatStrkUsd}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Showcase Demo Channels */}
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-t border-line/70 pt-6">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-subtle">
                  Demo Channels
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted">
                  Preset reference channels demonstrating autonomous agent monetization
                </p>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] border border-line px-2 py-1 bg-cream text-muted font-bold">
                DEMO SHOWCASE
              </span>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {showcaseChannels.map((c) => (
                <li key={c.id}>
                  <CreatorCard
                    creator={c}
                    active={c.id === picked}
                    subscribed={subs.some(
                      (s) => s.creatorId === c.id && s.active,
                    )}
                    onPick={() => {
                      setPicked(c.id);
                      setTier(1);
                    }}
                    formatStrkUsd={formatStrkUsd}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>

        {creator && selectedTier ? (
          <aside className="h-fit bg-cream p-5 shadow-[var(--shadow-border)] lg:sticky lg:top-20">
            <div className="flex items-center justify-between">
              <p className="kicker">Confirm</p>
              {creator.isDemo ? (
                <span className="font-mono text-[9px] uppercase border border-line px-1.5 py-0.5 bg-raised text-muted font-semibold">
                  Demo
                </span>
              ) : (
                <span className="font-mono text-[9px] uppercase border border-line px-1.5 py-0.5 bg-accent text-cream font-semibold">
                  Community
                </span>
              )}
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight">
              {creator.name}
            </h2>
            <p className="mt-1 font-mono text-xs text-muted">@{creator.handle.replace(/^@/, "")}</p>

            {creator.serviceUrl && (
              <div className="mt-3 border border-line/60 bg-raised p-2.5 flex items-center gap-2">
                <ExternalLink className="size-3.5 text-accent shrink-0" />
                <div className="min-w-0 flex-1 font-mono text-[10px]">
                  <p className="text-subtle font-semibold uppercase">Includes Billable Service</p>
                  <p className="text-muted truncate">{creator.serviceUrl}</p>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2">
              {rates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTier(t.id)}
                  className={cn(
                    "flex items-center justify-between px-3 py-3 text-left transition-[background-color,box-shadow] duration-150",
                    t.id === tier
                      ? "bg-accent-muted shadow-[inset_3px_0_0_0_var(--color-accent)]"
                      : "bg-raised/70 hover:bg-raised",
                  )}
                >
                  <span className="font-mono text-xs uppercase tracking-[0.14em] text-gold">
                    {t.name}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-ink text-right">
                    <span>{formatStrk(t.strk)} STRK</span>
                    <span className="ml-1.5 text-[10px] text-muted">
                      (~{formatStrkUsd(t.strk)})
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <dl className="mt-5 space-y-2 border-t border-line pt-4 font-mono text-xs">
              <Row
                k="Monthly Rate"
                v={`${formatStrk(selectedTier.strk)} STRK (~${formatStrkUsd(selectedTier.strk)})`}
              />
              <Row k="Duration" v="30 days" />
              <Row
                k="Shielded Note"
                v={`${formatStrk(shieldedStrk)} STRK (~${formatStrkUsd(shieldedStrk)})`}
              />
              <Row
                k="Required Top-up"
                v={
                  shortfall > 0
                    ? `${formatStrk(shortfall)} STRK (~${formatStrkUsd(shortfall)})`
                    : "None (sufficient note balance)"
                }
              />
              <Row
                k="Auto-Renew"
                v={sessionKey ? "Enabled via Session Key" : "Manual monthly renewal"}
              />
            </dl>

            <Button
              className="mt-5 w-full h-11"
              onClick={() => void onSubscribe()}
              disabled={!!busy || already}
            >
              {already
                ? "Channel already active"
                : busy
                  ? "Processing subscription…"
                  : `Subscribe · ${formatStrk(selectedTier.strk)} STRK (~${formatStrkUsd(selectedTier.strk)})`}
            </Button>

            {isWalletConnected && !isReadyWallet ? (
              <div className="mt-3 border border-line bg-raised p-3 font-mono text-[11px] leading-relaxed text-ink">
                <p className="text-accent font-semibold uppercase tracking-wider">
                  STRK20 Privacy Pool
                </p>
                <p className="mt-1 text-muted">
                  Live on-chain shielded notes require <strong>Ready Wallet</strong> for client-side zero-knowledge proofs.
                </p>
              </div>
            ) : null}

            <p className="mt-3 font-mono text-[10px] leading-relaxed text-subtle">
              Subscriptions can be cancelled on-chain at any time. Keepers cannot withdraw more than the configured tier rate.
            </p>
          </aside>
        ) : (
          <aside className="h-fit bg-cream p-5 shadow-[var(--shadow-border)] lg:sticky lg:top-20">
            <p className="kicker">Confirm</p>
            <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-ink">
              Select Channel
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Choose an agent or creator from the list to view subscription tiers, pricing, and confirm shielded access.
            </p>

            <div className="mt-6 border border-dashed border-line bg-raised/40 p-6 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-subtle">
                No channel selected
              </p>
              <p className="mt-1 text-xs text-muted">
                Click any channel card on the left to begin
              </p>
            </div>

            <Button
              className="mt-6 w-full opacity-50 cursor-not-allowed h-11"
              disabled
            >
              Select a Channel to Subscribe
            </Button>

            <p className="mt-3 font-mono text-[10px] leading-relaxed text-subtle">
              Subscriptions can be cancelled on-chain at any time.
            </p>
          </aside>
        )}
      </div>

      <CreateChannelModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreated={(channelId) => {
          setPicked(channelId);
          setTier(1);
        }}
      />
      <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
    </main>
  );
}

function CreatorCard({
  creator,
  active,
  subscribed,
  onPick,
  formatStrkUsd,
}: {
  creator: Creator;
  active: boolean;
  subscribed: boolean;
  onPick: () => void;
  formatStrkUsd: (amount: number) => string;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex h-full w-full flex-col p-4 text-left transition-[box-shadow,background-color] duration-150",
        active
          ? "bg-cream shadow-[var(--shadow-border-hover)]"
          : "bg-raised shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
            {creator.category}
          </p>
          {creator.isDemo ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] border border-line px-1.5 py-0.2 bg-cream text-muted font-semibold">
              DEMO
            </span>
          ) : !creator.discoverable ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] border border-line px-1.5 py-0.2 bg-gold/20 text-gold font-semibold flex items-center gap-1">
              <Lock className="size-2.5" /> PRIVATE
            </span>
          ) : (
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-accent font-semibold">
              COMMUNITY
            </span>
          )}
        </div>
        {subscribed ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent font-bold">
            Active
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 font-display text-xl font-bold uppercase tracking-tight">
        {creator.name}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink font-prose">{creator.blurb}</p>

      {creator.serviceUrl && (
        <div className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-accent">
          <ExternalLink className="size-3 shrink-0" />
          <span className="truncate">Includes Gated Service Link</span>
        </div>
      )}

      <p className="mt-4 font-mono text-[11px] tabular-nums text-subtle">
        {creator.subscribers} subscribers · {formatStrk(creator.mrrStrk)} STRK MRR
        <span className="ml-1 text-muted">(~{formatStrkUsd(creator.mrrStrk)})</span>
      </p>
    </button>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="uppercase tracking-[0.14em] text-subtle">{k}</dt>
      <dd className="tabular-nums text-ink font-medium">{v}</dd>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}
