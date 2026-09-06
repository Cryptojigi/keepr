"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Check, ExternalLink, Globe, Lock, Plus, ShoppingBag, Sparkles, Tag } from "lucide-react";
import { useStoreWallet } from "@/app/components/Wallet/walletContext";
import { CreateChannelModal } from "@/components/create-channel-modal";
import { BuyVendedItemModal } from "@/components/buy-vended-item-modal";
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
  computeDeterministicSalt,
  computeSubId,
  isAccountDeployed,
  refreshLiveBalances,
} from "@/lib/keepr/onchain";
import { fetchRegistryChannels, fetchAccessPassesFromRegistry } from "@/lib/supabase/registry";
import { getAllCreators, useKeepr } from "@/lib/keepr/store";
import { useStrkPrice } from "@/lib/keepr/price";
import { parseStarknetError } from "@/lib/keepr/errors";
import { decodeChannelSharePayload } from "@/lib/keepr/share";
import type { Creator, TierId, VendedItem } from "@/lib/keepr/types";
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
  const vendedItems = useKeepr((s) => s.vendedItems);
  const purchases = useKeepr((s) => s.purchases);
  const importChannelFromPayload = useKeepr((s) => s.importChannelFromPayload);
  const mergeRegistryChannels = useKeepr((s) => s.mergeRegistryChannels);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatStrkUsd } = useStrkPrice();

  // Load public channels from Supabase registry on mount
  useEffect(() => {
    fetchRegistryChannels().then(({ channels, rates }) => {
      if (channels.length > 0) {
        fetchAccessPassesFromRegistry().then((passes) => {
          mergeRegistryChannels(channels, rates, passes);
        });
      }
    });
  }, [mergeRegistryChannels]);

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
  const [selectedBuyItem, setSelectedBuyItem] = useState<VendedItem | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);

  // Handle direct portable channel data via ?data=<base64>
  const dataParam = searchParams.get("data");
  useEffect(() => {
    if (dataParam) {
      try {
        const decoded = decodeChannelSharePayload(dataParam);
        if (decoded) {
          const imported = importChannelFromPayload(decoded);
          setPicked(imported.id);
          setTier(1);
          toast.success(`Loaded channel: ${imported.name}`, {
            description: "Channel rates & storefront goods loaded directly from link.",
          });
        }
      } catch (err) {
        console.warn("Could not decode portable channel payload:", err);
      }
    }
  }, [dataParam, importChannelFromPayload]);

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

  const isSinglePlan = creator?.pricingType === "flat" || rates.length === 1;

  useEffect(() => {
    if (isSinglePlan && tier !== 0) {
      setTier(0);
    }
  }, [isSinglePlan, tier]);

  const selectedTier = useMemo(() => {
    if (!creator || rates.length === 0) return null;
    if (isSinglePlan) return rates[0];
    return rates.find((t) => t.id === tier) ?? rates[1] ?? rates[0];
  }, [creator, rates, tier, isSinglePlan]);

  const already = creator
    ? subs.some((s) => s.creatorId === creator.id && s.active)
    : false;
  const shortfall = selectedTier
    ? Math.max(0, selectedTier.strk - shieldedStrk)
    : 0;

  // Active channel vended goods
  const activeChannelVendedItems = useMemo(() => {
    if (!creator) return [];
    return vendedItems.filter((i) => i.creatorId === creator.id && i.active !== false);
  }, [vendedItems, creator]);

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
      // 1. Real on-chain flow when Ready wallet is connected. Payout routing:
      //    - Custom channels → the creator's genuine payout address.
      //    - Showcase/demo channels → the SUBSCRIBER's own wallet (sandbox pattern):
      //      real tx, real proof, but the OPEN note routes back to the user so funds
      //      are recoverable via unshield — never to the demo's fabricated address.
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

        // Generate client-side secret & deterministic salt for cross-device zero-knowledge recovery
        const salt = computeDeterministicSalt(connectedAddress, creator.id);
        const cancelSecret =
          "0x" +
          Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        const subId = computeSubId(connectedAddress, salt);
        const authCommit = computeAuthCommit(cancelSecret);

        // Payout address: custom channels pay the creator; demo channels route the
        // OPEN note back to the subscriber (sandbox — funds recoverable, never lost).
        const creatorPayoutAddress = creator.isCustom
          ? creator.address || connectedAddress
          : connectedAddress;

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

        toast.success(
          creator.isCustom
            ? `Subscribed to ${creator.name}!`
            : `Subscribed to ${creator.name} (demo) — payment routed back to your wallet.`,
          {
            description: creator.isCustom
              ? txHash
                ? `Tx: ${txHash.slice(0, 14)}…`
                : "Subscription confirmed on-chain"
              : txHash
                ? `Sandbox sub · funds recoverable via unshield · Tx: ${txHash.slice(0, 14)}…`
                : "Sandbox sub · funds recoverable via unshield",
            action: txHash
              ? {
                  label: "View",
                  onClick: () =>
                    window.open(`https://starkscan.co/tx/${txHash}`, "_blank"),
                }
              : undefined,
          },
        );

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
                  goodsCount={
                    vendedItems.filter(
                      (i) =>
                        i.creatorId === directLinkedPrivateChannel.id &&
                        i.active !== false,
                    ).length
                  }
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
                      goodsCount={
                        vendedItems.filter(
                          (i) => i.creatorId === c.id && i.active !== false,
                        ).length
                      }
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
                    goodsCount={
                      vendedItems.filter(
                        (i) => i.creatorId === c.id && i.active !== false,
                      ).length
                    }
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

            {isSinglePlan ? (
              <div className="mt-5 border border-line/70 bg-raised p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent font-bold">
                    One-Time Renewable Pass
                  </span>
                  <span className="font-mono text-[9px] border border-accent/40 bg-accent/10 text-accent px-2 py-0.5 uppercase tracking-wider font-semibold">
                    30 Days
                  </span>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <h3 className="font-display text-lg font-bold uppercase text-ink">
                    {selectedTier.name}
                  </h3>
                  <p className="font-mono text-base font-bold text-ink">
                    {formatStrk(selectedTier.strk)} STRK
                    <span className="ml-1 text-xs font-normal text-muted">
                      (~{formatStrkUsd(selectedTier.strk)})
                    </span>
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted leading-relaxed font-prose">
                  Single flat rate. Pay once for 30 days of access; renew anytime manually or via session key.
                </p>
              </div>
            ) : (
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
            )}

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

            {/* Lifetime Access Passes & Channel Licenses */}
            {activeChannelVendedItems.length > 0 && (
              <div className="mt-6 border-t border-line pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="size-3.5 text-accent" />
                    <span className="font-display text-sm font-bold uppercase tracking-tight text-ink">
                      Lifetime Access Passes ({activeChannelVendedItems.length})
                    </span>
                  </div>
                  <span className="font-mono text-[9px] uppercase border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 font-semibold">
                    Lifetime Pass
                  </span>
                </div>
                <p className="font-sans text-xs text-muted leading-relaxed">
                  Permanent channel passes, tools & agent licenses without recurring renewals. Saved directly in your vault.
                </p>

                <div className="space-y-2.5">
                  {activeChannelVendedItems.map((item) => {
                    const isPurchased = purchases.some((p) => p.itemId === item.id);
                    return (
                      <div
                        key={item.id}
                        className="border border-line/70 bg-raised/80 p-3 space-y-2 hover:border-accent/40 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[9px] uppercase tracking-wider bg-base border border-line px-1.5 py-0.5 text-accent font-semibold">
                            {item.category}
                          </span>
                          <span className="font-mono text-xs font-bold text-ink">
                            {formatStrk(item.priceStrk)} STRK
                            <span className="text-[10px] font-normal text-muted ml-1">
                              (~{formatStrkUsd(item.priceStrk)})
                            </span>
                          </span>
                        </div>
                        <h4 className="font-display text-sm font-bold uppercase tracking-tight text-ink leading-snug">{item.title}</h4>
                        <p className="font-sans text-xs text-muted line-clamp-2 leading-relaxed">{item.description}</p>
                        <div className="pt-1 flex items-center justify-between border-t border-line/50">
                          <span className="font-mono text-[10px] text-subtle">
                            {item.salesCount || 0} claimed
                          </span>
                          {isPurchased ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBuyItem(item);
                                setBuyModalOpen(true);
                              }}
                              className="h-7 text-[10px] font-mono border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <Check className="mr-1 size-3" />
                              Owned · View Access
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBuyItem(item);
                                setBuyModalOpen(true);
                              }}
                              className="h-7 text-[10px] font-mono bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                            >
                              Acquire Pass · {formatStrk(item.priceStrk)} STRK
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

      <BuyVendedItemModal
        open={buyModalOpen}
        onOpenChange={setBuyModalOpen}
        item={selectedBuyItem}
        creator={creator}
      />
    </main>
  );
}

function CreatorCard({
  creator,
  active,
  subscribed,
  goodsCount,
  onPick,
  formatStrkUsd,
}: {
  creator: Creator;
  active: boolean;
  subscribed: boolean;
  goodsCount?: number;
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
          {creator.pricingType === "flat" ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] border border-line px-1.5 py-0.2 bg-raised text-subtle font-semibold">
              Single Plan
            </span>
          ) : null}
          {goodsCount && goodsCount > 0 ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] border border-emerald-500/30 px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 font-semibold flex items-center gap-1">
              <ShoppingBag className="size-2.5" /> {goodsCount} {goodsCount === 1 ? "good" : "goods"}
            </span>
          ) : null}
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
