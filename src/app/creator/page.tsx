"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  Globe,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Kicker } from "@/components/kicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateChannelModal } from "@/components/create-channel-modal";
import { CreateVendedItemModal } from "@/components/create-vended-item-modal";
import { DEMO_RECEIPTS, MRR_SERIES, isAddressEqual } from "@/lib/keepr/data";
import { formatDate, formatStrk } from "@/lib/keepr/format";
import { useKeepr } from "@/lib/keepr/store";
import { useStrkPrice } from "@/lib/keepr/price";
import { useStoreWallet } from "@/app/components/Wallet/walletContext";
import { buildShareableChannelUrl } from "@/lib/keepr/share";
import { PROTOCOL_FEE_BPS, calculateFeeSplit } from "@/lib/keepr/constants";
import {
  fetchRegistryChannels,
  fetchAccessPassesFromRegistry,
  saveChannelToRegistry,
  saveAccessPassToRegistry,
} from "@/lib/supabase/registry";
import type { Creator, CreatorRate, PricingType, TierId, VendedItem } from "@/lib/keepr/types";
import { cn } from "@/lib/utils";

function truncateAddress(addr?: string | null) {
  if (!addr) return "";
  if (addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function CreatorPage() {
  const customCreators = useKeepr((s) => s.customCreators);
  const subs = useKeepr((s) => s.subs);
  const deleteChannel = useKeepr((s) => s.deleteChannel);
  const vendedItems = useKeepr((s) => s.vendedItems);
  const deleteVendedItem = useKeepr((s) => s.deleteVendedItem);
  const mergeRegistryChannels = useKeepr((s) => s.mergeRegistryChannels);

  // Load public channels from Supabase registry on mount so creator channels are visible across all devices
  useEffect(() => {
    fetchRegistryChannels().then(({ channels, rates }) => {
      if (channels.length > 0) {
        fetchAccessPassesFromRegistry().then((passes) => {
          mergeRegistryChannels(channels, rates, passes);
        });
      }
    });
  }, [mergeRegistryChannels]);

  // Wallet context
  const connectedAddress = useStoreWallet((s) => s.address);
  const isWalletConnected = useStoreWallet((s) => s.isConnected);
  const setSelectWalletUI = useStoreWallet((s) => s.setSelectWalletUI);

  // Demo store fallback
  const demoConnected = useKeepr((s) => s.connected);
  const demoAddress = useKeepr((s) => s.address);

  const activeAddress = connectedAddress || (demoConnected ? demoAddress : "");
  const isEffectiveConnected =
    isWalletConnected || (demoConnected && Boolean(demoAddress));

  // Channels owned strictly by the connected wallet
  const ownedChannels = useMemo(() => {
    if (!activeAddress) return [];
    return customCreators.filter((c) =>
      isAddressEqual(c.ownerAddress, activeAddress),
    );
  }, [customCreators, activeAddress]);

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null,
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [chartOn, setChartOn] = useState(false);
  const [vendedModalOpen, setVendedModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VendedItem | null>(null);

  useEffect(() => {
    setChartOn(true);
  }, []);

  // Sync selected channel ID
  useEffect(() => {
    if (ownedChannels.length > 0) {
      if (!selectedChannelId || !ownedChannels.some((c) => c.id === selectedChannelId)) {
        setSelectedChannelId(ownedChannels[0].id);
      }
    } else {
      setSelectedChannelId(null);
    }
  }, [ownedChannels, selectedChannelId]);

  const activeChannel = useMemo(() => {
    return ownedChannels.find((c) => c.id === selectedChannelId) ?? ownedChannels[0];
  }, [ownedChannels, selectedChannelId]);

  const { formatStrkUsd } = useStrkPrice();

  // Metrics for active channel
  const localActive = useMemo(() => {
    if (!activeChannel) return 0;
    return subs.filter((s) => s.creatorId === activeChannel.id && s.active).length;
  }, [subs, activeChannel]);

  const subscribers = (activeChannel?.subscribers ?? 0) + localActive;

  const extraMrr = useMemo(() => {
    if (!activeChannel) return 0;
    return subs
      .filter((s) => s.creatorId === activeChannel.id && s.active)
      .reduce((n, s) => n + s.amountStrk, 0);
  }, [subs, activeChannel]);

  const mrr = (activeChannel?.mrrStrk ?? 0) + extraMrr;

  // Lifetime pass metrics for the active channel
  const channelVendedItems = useMemo(() => {
    if (!activeChannel) return [];
    return vendedItems.filter((i) => i.creatorId === activeChannel.id);
  }, [vendedItems, activeChannel]);

  const totalVendedRevenue = useMemo(() => {
    return channelVendedItems.reduce(
      (sum, item) => sum + item.priceStrk * (item.salesCount || 0),
      0,
    );
  }, [channelVendedItems]);

  const totalVendedSales = useMemo(() => {
    return channelVendedItems.reduce(
      (sum, item) => sum + (item.salesCount || 0),
      0,
    );
  }, [channelVendedItems]);

  const isCustomChannel = Boolean(activeChannel?.isCustom || activeChannel?.ownerAddress || !activeChannel?.isDemo);

  // Inflow chart series: real dynamic 5-month curve for custom channels, demo curve for demo channels
  const series = useMemo(() => {
    if (!isCustomChannel && activeChannel?.isDemo) {
      return MRR_SERIES.map((p, i) =>
        i === MRR_SERIES.length - 1 ? { ...p, v: mrr > 0 ? mrr : p.v } : p,
      );
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();

    const windowMonths: { m: string; v: number }[] = [];
    const totalCurrentInflow = mrr + totalVendedRevenue;

    for (let i = 4; i >= 0; i--) {
      const d = new Date(currentYear, currentMonthIdx - i, 1);
      const mLabel = monthNames[d.getMonth()];
      windowMonths.push({
        m: mLabel,
        v: i === 0 ? totalCurrentInflow : 0,
      });
    }

    return windowMonths;
  }, [isCustomChannel, activeChannel?.isDemo, mrr, totalVendedRevenue]);

  // Receipts: real statements for custom channels, demo receipts for demo channels
  const channelReceipts: Array<{
    id: string;
    period: string;
    amountStrk: number;
    channels: number;
    createdAt: number;
  }> = useMemo(() => {
    if (!isCustomChannel && activeChannel?.isDemo) {
      return DEMO_RECEIPTS;
    }

    const totalInflows = mrr + totalVendedRevenue;
    const totalPasses = subscribers + totalVendedSales;

    if (totalInflows <= 0 && totalPasses <= 0) {
      return [];
    }

    const now = new Date();
    const currentPeriod = `${now.toLocaleString("en-US", { month: "long" })} ${now.getFullYear()}`;

    return [
      {
        id: `rcpt_${activeChannel?.id.slice(0, 8) || "chan"}_${now.getFullYear()}_${now.getMonth() + 1}`,
        period: currentPeriod,
        amountStrk: totalInflows,
        channels: totalPasses,
        createdAt: activeChannel?.createdAt || Date.now(),
      },
    ];
  }, [isCustomChannel, activeChannel?.isDemo, activeChannel?.id, activeChannel?.createdAt, mrr, totalVendedRevenue, subscribers, totalVendedSales]);

  function handleCopyShareLink(channelId: string) {
    if (!activeChannel) return;
    const channelRates = useKeepr.getState().creatorRates[channelId] ?? [
      { id: 0, name: "Standard", strk: 25 },
    ];
    const channelItems = useKeepr
      .getState()
      .vendedItems.filter((i) => i.creatorId === channelId);

    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://keepr.cash";

    const url = buildShareableChannelUrl({
      channel: activeChannel,
      rates: channelRates,
      items: channelItems,
      origin,
    });

    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Self-describing channel link copied!", {
      description:
        "Link includes full channel metadata, pricing rates & storefront goods for instant cross-device sharing.",
    });
    setTimeout(() => setCopiedLink(false), 2000);
  }



  // 1) DISCONNECTED STATE
  if (!isEffectiveConnected) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Kicker>Creator Portal</Kicker>
          <h1 className="mt-4 font-display text-4xl font-bold uppercase tracking-tight md:text-5xl text-ink">
            Monetize your work privately.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Deploy your own subscription channel on Starknet in 60 seconds. Set
            custom rates, bind your gated Discord or API services, and collect
            recurring STRK without exposing your books on a public indexer.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => setSelectWalletUI(true)}
              className="h-12 px-6 font-mono text-xs uppercase tracking-[0.16em]"
            >
              <ShieldCheck className="mr-2 size-4" />
              Connect Wallet
            </Button>
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(true)}
              className="h-12 px-6 font-mono text-xs uppercase tracking-[0.16em]"
            >
              <Sparkles className="mr-2 size-4 text-accent" />
              Launch Channel in 60s
            </Button>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-3 text-left">
            <div className="bg-raised p-5 border border-line">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                01 · Direct Payouts
              </p>
              <h3 className="mt-2 font-display text-lg font-bold uppercase">
                Zero Intermediaries
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Our permissionless Starknet helper streams STRK directly to your
                specified wallet address upon each subscription renewal.
              </p>
            </div>

            <div className="bg-raised p-5 border border-line">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                02 · Discovery Control
              </p>
              <h3 className="mt-2 font-display text-lg font-bold uppercase">
                Public or Private
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Toggle your channel between public directory listing or secret,
                unlisted direct-link mode for exclusive invite rings.
              </p>
            </div>

            <div className="bg-raised p-5 border border-line">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                03 · Gated Services
              </p>
              <h3 className="mt-2 font-display text-lg font-bold uppercase">
                Instant Access
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Attach your Telegram, Discord, or API link. Subscribers unlock
                instant access as long as their on-chain pass is valid.
              </p>
            </div>
          </div>
        </div>

        <CreateChannelModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onCreated={(id) => {
            setSelectedChannelId(id);
          }}
        />
      </main>
    );
  }

  // 2) CONNECTED BUT NO OWNED CHANNELS
  if (ownedChannels.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="mx-auto max-w-xl text-center">
          <div className="inline-flex items-center gap-2 border border-line bg-raised px-3 py-1 font-mono text-xs text-muted">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>Connected: {truncateAddress(activeAddress)}</span>
          </div>

          <h1 className="mt-6 font-display text-3xl font-bold uppercase tracking-tight md:text-5xl text-ink">
            Create Channel in 60s
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            No channels are currently registered under your wallet address.
            Launch your first channel to set subscription rates, configure
            discovery options, and link your billable services.
          </p>

          <div className="mt-8">
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="h-12 px-8 font-mono text-xs uppercase tracking-[0.16em]"
            >
              <Plus className="mr-2 size-4" />
              Launch Channel in 60s
            </Button>
          </div>

          <div className="mt-12 border border-line bg-raised p-6 text-left">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
              Self-Service Protocol Architecture
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
              <li className="flex items-start gap-2">
                <span className="font-mono text-accent">✓</span>
                <span>
                  Channels are tied strictly to your wallet checksummed address
                  on Starknet.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-accent">✓</span>
                <span>
                  Set 3 custom tiers with your own STRK pricing and duration
                  rules.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-accent">✓</span>
                <span>
                  Toggle discovery anytime: keep it unlisted or broadcast on the
                  Explorer.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <CreateChannelModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onCreated={(id) => {
            setSelectedChannelId(id);
          }}
        />
      </main>
    );
  }

  // 3) CONNECTED WITH 1+ OWNED CHANNELS
  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      {/* Top Channel Switcher & Launch Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle mr-1">
            Your Channels ({ownedChannels.length}):
          </span>
          {ownedChannels.map((c) => {
            const isSelected = c.id === activeChannel?.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedChannelId(c.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] transition-colors border",
                  isSelected
                    ? "bg-accent text-cream border-accent shadow-sm"
                    : "bg-raised text-muted border-line hover:border-accent/40",
                )}
              >
                <span>{c.name}</span>
                {!c.discoverable ? (
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 font-mono uppercase tracking-wider font-bold",
                      isSelected
                        ? "bg-cream/20 text-cream"
                        : "bg-base border border-line text-ink/70",
                    )}
                  >
                    Private
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="bg-accent hover:bg-accent-hover text-cream font-mono text-[11px] uppercase tracking-[0.14em] font-semibold"
          >
            <Plus className="mr-1.5 size-3.5" />
            New Channel
          </Button>
        </div>
      </div>

      {activeChannel ? (
        <div className="mt-8 space-y-8">
          {/* Channel Header Banner */}
          <div className="bg-raised p-6 border border-line shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Kicker>{activeChannel.category}</Kicker>
                  {activeChannel.discoverable ? (
                    <span className="inline-flex items-center gap-1 border border-[#2f4a32]/40 bg-[#2f4a32]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#2f4a32] font-semibold">
                      <Globe className="size-3" />
                      Public · Listed on Explorer
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 border border-[#5a4018]/40 bg-[#5a4018]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#5a4018] font-semibold">
                      <Lock className="size-3" />
                      Private · Unlisted (Link-Only)
                    </span>
                  )}
                </div>

                <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight md:text-4xl text-ink">
                  {activeChannel.name}
                </h1>
                <p className="mt-1 font-mono text-xs text-muted">
                  {activeChannel.handle} · Payout:{" "}
                  {truncateAddress(activeChannel.address)} · Owner:{" "}
                  {truncateAddress(activeChannel.ownerAddress)}
                </p>
                <p className="mt-3 max-w-2xl text-xs sm:text-sm text-ink leading-relaxed">
                  {activeChannel.blurb}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyShareLink(activeChannel.id)}
                  className="font-mono text-xs uppercase tracking-[0.12em]"
                >
                  {copiedLink ? (
                    <>
                      <Check className="mr-1.5 size-3.5 text-accent" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 size-3.5" />
                      Share Link
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="font-mono text-xs uppercase tracking-[0.12em] text-accent border border-accent/40 hover:bg-accent hover:text-cream transition-colors"
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  Delete Channel
                </Button>
              </div>
            </div>

            {/* Billable Service Link Bar */}
            <div className="mt-6 border-t border-line pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
                    Gated Service URL:
                  </span>
                  {activeChannel.serviceUrl ? (
                    <a
                      href={activeChannel.serviceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline break-all"
                    >
                      {activeChannel.serviceUrl}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="font-mono text-xs text-muted italic">
                      No service link configured (subscribers won't receive an
                      access link)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-px bg-line sm:grid-cols-3">
            <Stat k="Active subscribers" v={String(subscribers)} />
            <Stat
              k="Private MRR"
              v={`${formatStrk(mrr)} STRK`}
              sub={`~${formatStrkUsd(mrr)} USD`}
              accent
            />
            <Stat
              k="Catalog Status"
              v={activeChannel.discoverable ? "Public" : "Private"}
              sub={
                activeChannel.discoverable
                  ? "Listed on discovery catalog"
                  : "Accessible via direct link only"
              }
            />
          </div>

          {/* Rate Book Configuration */}
          <RateBook channel={activeChannel} />

          {/* Lifetime Access Passes & Licenses Section */}
          <section className="border border-line bg-raised p-5 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Kicker>Lifetime Access Passes & Licenses</Kicker>
                  <span className="font-mono text-[9px] uppercase border border-[#2f4a32]/40 px-2 py-0.5 bg-[#2f4a32]/10 text-[#2f4a32] font-semibold">
                    Pay-Once · Perpetual Access
                  </span>
                </div>
                <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-ink">
                  Perpetual passes & single licenses.
                </h2>
                <p className="mt-1 font-sans text-xs sm:text-sm text-muted max-w-xl leading-relaxed">
                  Issue standalone software licenses, permanent access keys, or perpetual research passes without recurring renewals. Buyers pay once in STRK and unlock permanent vault access.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="border border-line bg-base px-3 py-1.5 font-mono text-xs text-muted">
                  <span className="text-subtle text-[10px] uppercase block">Platform Fee</span>
                  <span className="text-accent font-bold">0% protocol (Mainnet v1)</span> · 100% net to your payout note
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingItem(null);
                    setVendedModalOpen(true);
                  }}
                  className="bg-accent hover:bg-accent-hover text-cream font-mono text-xs uppercase tracking-[0.14em] font-semibold"
                >
                  <Plus className="mr-1.5 size-3.5" />
                  Issue Lifetime Pass
                </Button>
              </div>
            </div>

            {/* Passes Stats Bar */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-px bg-line border border-line">
              <div className="bg-base p-3 font-mono">
                <span className="text-[10px] uppercase text-subtle block">Passes Issued</span>
                <span className="text-lg font-bold text-ink">{channelVendedItems.length}</span>
              </div>
              <div className="bg-base p-3 font-mono">
                <span className="text-[10px] uppercase text-subtle block">Passes Acquired</span>
                <span className="text-lg font-bold text-ink">{totalVendedSales}</span>
              </div>
              <div className="bg-base p-3 font-mono col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase text-subtle block">Gross STRK Earned</span>
                <span className="text-lg font-bold text-ink">
                  {formatStrk(totalVendedRevenue)} STRK
                  <span className="text-xs text-muted font-normal ml-1">
                    (~{formatStrkUsd(totalVendedRevenue)})
                  </span>
                </span>
              </div>
            </div>

            {/* List of items */}
            {channelVendedItems.length > 0 ? (
              <ul className="mt-4 divide-y divide-line border border-line bg-cream shadow-[var(--shadow-border)]">
                {channelVendedItems.map((item) => {
                  const split = calculateFeeSplit(item.priceStrk, PROTOCOL_FEE_BPS);
                  return (
                    <li
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4"
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] uppercase tracking-wider bg-base border border-line px-2 py-0.5 text-accent font-semibold">
                            {item.category}
                          </span>
                          <h3 className="font-display text-base font-bold uppercase tracking-tight text-ink">
                            {item.title}
                          </h3>
                        </div>
                        <p className="font-sans text-xs text-muted line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-[11px] text-subtle">
                          <span>
                            Delivery target:{" "}
                            <span className="text-muted font-mono break-all">{item.deliveryUrl.slice(0, 45)}...</span>
                          </span>
                          <span>·</span>
                          <span className="text-[#2f4a32] font-semibold">
                            {item.salesCount || 0} sales recorded
                          </span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col sm:items-end justify-between items-center gap-2 shrink-0 border-t sm:border-t-0 border-line pt-2 sm:pt-0">
                        <div className="text-right font-mono">
                          <p className="text-base font-bold text-ink">
                            {formatStrk(item.priceStrk)} STRK
                          </p>
                          <p className="text-[10px] text-accent font-semibold">
                            +{split.creatorAmount} STRK net (100% direct)
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingItem(item);
                              setVendedModalOpen(true);
                            }}
                            className="h-8 font-mono text-xs"
                          >
                            <Edit3 className="mr-1 size-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              deleteVendedItem(item.id);
                              toast.success("Pass removed from catalog");
                            }}
                            className="h-8 font-mono text-xs text-accent border border-accent/40 hover:bg-accent hover:text-cream"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-4 border border-dashed border-line bg-base/50 p-8 text-center">
                <ShoppingBag className="mx-auto size-8 text-muted" />
                <h3 className="mt-2 font-display text-base font-bold uppercase tracking-tight text-ink">
                  No lifetime passes issued yet
                </h3>
                <p className="mt-1 font-sans text-xs text-muted max-w-md mx-auto leading-relaxed">
                  Issue perpetual software licenses, intelligence dossier passes, or invite keys. Subscribers can acquire them with STRK without recurring renewals.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingItem(null);
                    setVendedModalOpen(true);
                  }}
                  className="mt-4 bg-accent hover:bg-accent-hover text-cream font-mono text-xs uppercase tracking-[0.14em] font-semibold"
                >
                  <Plus className="mr-1.5 size-3.5" />
                  Issue Your First Lifetime Pass
                </Button>
              </div>
            )}
          </section>

          {/* Inflows Chart */}
          <section className="bg-raised p-4 shadow-[var(--shadow-border)] sm:p-5 border border-line">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Kicker>Private inflows</Kicker>
                {series.every((p) => p.v === 0) && (
                  <span className="border border-line bg-surface/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-subtle">
                    Awaiting Inflows
                  </span>
                )}
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
                5 months · channel ledger
              </p>
            </div>
            <div className="mt-4 h-52 w-full">
              {chartOn ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={series}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="keeprFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                           offset="0%"
                          stopColor="var(--color-accent)"
                          stopOpacity={0.28}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--color-accent)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="m"
                      stroke="var(--color-ink-subtle)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      fontFamily="var(--font-mono)"
                    />
                    <YAxis
                      stroke="var(--color-ink-subtle)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      fontFamily="var(--font-mono)"
                      tickFormatter={(v) => `${v}`}
                      domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax * 1.2))]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-bg-base)",
                        border: "1px solid var(--color-border)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                      }}
                      formatter={(value) => [
                        `${String(value)} STRK (~${formatStrkUsd(Number(value) || 0)})`,
                        "Inflow",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="var(--color-accent)"
                      strokeWidth={2}
                      fill="url(#keeprFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full bg-deep/30" />
              )}
            </div>
          </section>

          {/* Income Statements / Receipts */}
          <section className="bg-raised p-4 shadow-[var(--shadow-border)] sm:p-5 border border-line">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Kicker>Income statements</Kicker>
                {channelReceipts.length === 0 && (
                  <span className="border border-line bg-surface/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-subtle">
                    0 Settled
                  </span>
                )}
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
                Provable receipts
              </p>
            </div>

            {channelReceipts.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center border border-dashed border-line bg-base/50 px-6 py-10 text-center">
                <FileText className="size-8 text-subtle" />
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">
                  Awaiting First Epoch Settlement
                </p>
                <p className="mt-1 max-w-md text-xs text-subtle leading-relaxed">
                  Provable viewing-key receipts generate automatically upon subscriber payment renewal or lifetime pass acquisition. Payer identities remain cryptographically shielded.
                </p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-line border-t border-line">
                {channelReceipts.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-mono text-sm text-ink">{r.period}</p>
                      <p className="mt-1 font-mono text-[11px] text-subtle">
                        {r.channels} active pass{r.channels === 1 ? "" : "es"} · issued{" "}
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-mono text-sm tabular-nums text-ink">
                        {formatStrk(r.amountStrk)} STRK
                        <span className="ml-1 text-muted text-xs">
                          (~{formatStrkUsd(r.amountStrk)})
                        </span>
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          downloadReceipt({
                            ...r,
                            creator: activeChannel.handle,
                          })
                        }
                      >
                        Export
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {/* Delete Channel Confirmation Dialog */}
      {activeChannel ? (
        <Dialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
        >
          <DialogContent className="max-w-md border border-accent/40 bg-raised font-mono shadow-[var(--shadow-border)]">
            <DialogHeader>
              <DialogTitle className="font-display text-xl uppercase tracking-tight text-accent flex items-center gap-2">
                <Trash2 className="size-5 text-accent" />
                Delete Channel Permanently
              </DialogTitle>
              <DialogDescription className="text-xs text-ink/80 leading-relaxed pt-2">
                Are you sure you want to delete <strong className="text-ink font-mono font-bold">{activeChannel.name}</strong>?
                This will permanently remove the channel, its rate book, and all associated lifetime access passes from Keepr.
              </DialogDescription>
            </DialogHeader>

            <div className="border border-accent/30 bg-accent/10 p-3 font-mono text-xs text-ink leading-relaxed mt-2">
              <strong className="text-accent font-bold mr-1">WARNING:</strong> This action is immediate and cannot be undone. All public records and associated lifetime passes will be permanently erased.
            </div>

            <div className="mt-4 flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmOpen(false)}
                className="font-mono text-xs uppercase tracking-wider text-ink border-line hover:bg-cream"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const channelName = activeChannel.name;
                  deleteChannel(activeChannel.id);
                  setDeleteConfirmOpen(false);
                  toast.success(`Channel "${channelName}" permanently deleted.`);
                }}
                className="bg-accent hover:bg-accent-hover text-cream font-mono text-xs uppercase tracking-[0.14em] font-semibold flex items-center gap-1.5 px-4 py-2"
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Confirm Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Create Channel Modal */}
      <CreateChannelModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreated={(id) => {
          setSelectedChannelId(id);
        }}
      />

      {/* Create / Edit Vended Item Modal */}
      {activeChannel ? (
        <CreateVendedItemModal
          open={vendedModalOpen}
          onOpenChange={setVendedModalOpen}
          creatorId={activeChannel.id}
          creatorAddress={activeChannel.address}
          editItem={editingItem}
        />
      ) : null}
    </main>
  );
}



function RateBook({ channel }: { channel: Creator }) {
  const book = useKeepr((s) => s.creatorRates);
  const setCreatorRates = useKeepr((s) => s.setCreatorRates);
  const defaultRates = useMemo<CreatorRate[]>(
    () => [
      { id: 0, name: "Basic", strk: 25 },
      { id: 1, name: "Pro", strk: 100 },
      { id: 2, name: "VIP", strk: 250 },
    ],
    [],
  );

  const rates = book[channel.id] ?? defaultRates;
  const isSinglePlan = channel.pricingType === "flat" || rates.length === 1;

  function handleTogglePricingModel(targetType: "flat" | "tiered") {
    if (targetType === "flat") {
      const flatRate: CreatorRate = {
        id: 0,
        name: rates[0]?.name || "Standard Access",
        strk: rates[0]?.strk || 25,
      };
      setCreatorRates(channel.id, [flatRate], "flat");
      toast.success("Switched to Single Renewable Plan");
    } else {
      const tieredRates: CreatorRate[] = [
        rates[0] ?? { id: 0, name: "Basic", strk: 25 },
        rates[1] ?? { id: 1, name: "Pro", strk: 100 },
        rates[2] ?? { id: 2, name: "VIP", strk: 250 },
      ];
      setCreatorRates(channel.id, tieredRates, "tiered");
      toast.success("Switched to 3-Tiered Plans");
    }
  }

  return (
    <section className="mt-6 border border-line bg-raised p-5 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Kicker>Rate Book</Kicker>
            <span className="font-mono text-[9px] uppercase border border-line px-1.5 py-0.5 bg-cream text-subtle font-semibold">
              {isSinglePlan ? "Single Renewable Plan" : "3-Tier Structure"}
            </span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight">
            {isSinglePlan ? "Set your flat rate." : "Set what you charge."}
          </h2>
          <p className="mt-1 font-mono text-[11px] text-muted">
            Protocol fee: <span className="text-accent font-semibold">0% (Mainnet v1)</span> · <span className="text-ink font-semibold">100%</span> settles directly to payout wallet ({truncateAddress(channel.address)}).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="inline-flex border border-line bg-cream p-0.5 font-mono text-xs">
            <button
              type="button"
              onClick={() => handleTogglePricingModel("flat")}
              className={cn(
                "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                isSinglePlan
                  ? "bg-accent text-cream shadow-sm"
                  : "text-muted hover:text-ink",
              )}
            >
              Single Plan
            </button>
            <button
              type="button"
              onClick={() => handleTogglePricingModel("tiered")}
              className={cn(
                "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                !isSinglePlan
                  ? "bg-accent text-cream shadow-sm"
                  : "text-muted hover:text-ink",
              )}
            >
              3 Tiers
            </button>
          </div>
          <p className="max-w-xs font-mono text-[11px] leading-relaxed text-subtle">
            {isSinglePlan
              ? "Subscribers pay this one-time flat rate for 30 days of access, renewable on expiry."
              : "New rates apply immediately to future subscriptions and next renewals."}
          </p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-line bg-cream shadow-[var(--shadow-border)]">
        {rates.map((r) => (
          <RateRow
            key={r.id}
            creatorId={channel.id}
            rate={r}
            isSinglePlan={isSinglePlan}
          />
        ))}
      </ul>
    </section>
  );
}

function RateRow({
  creatorId,
  rate,
  isSinglePlan,
}: {
  creatorId: string;
  rate: CreatorRate;
  isSinglePlan?: boolean;
}) {
  const setCreatorRate = useKeepr((s) => s.setCreatorRate);
  const [name, setName] = useState(rate.name);
  const [strk, setStrk] = useState(String(rate.strk));
  const { formatStrkUsd } = useStrkPrice();

  useEffect(() => {
    setName(rate.name);
    setStrk(String(rate.strk));
  }, [creatorId, rate.id, rate.name, rate.strk]);

  function commitName() {
    const trimmed = name.trim().slice(0, 16) || rate.name;
    setName(trimmed);
    setCreatorRate(creatorId, rate.id as TierId, { name: trimmed });
    toast.success(`Updated ${rate.name} plan label to ${trimmed}`);
  }

  function commitStrk() {
    const n = Math.round(Number(strk));
    const v = Number.isFinite(n) ? Math.min(10_000, Math.max(1, n)) : rate.strk;
    setStrk(String(v));
    setCreatorRate(creatorId, rate.id as TierId, { strk: v });
    toast.success(`Updated ${name} rate to ${v} STRK / 30d`);
  }

  const numStrk = Math.max(0, Number(strk) || 0);
  const netCreatorStrk = calculateFeeSplit(numStrk, PROTOCOL_FEE_BPS).creatorAmount;

  return (
    <li className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_10rem_7rem] sm:items-end">
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
          {isSinglePlan ? "Plan Title" : "Plan Tier"}
        </span>
        <Input
          className="mt-1 uppercase tracking-[0.08em]"
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
        />
      </label>
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
          STRK / 30d
        </span>
        <Input
          className="mt-1"
          type="number"
          min={1}
          max={10000}
          step={1}
          placeholder="0"
          value={strk}
          onChange={(e) => setStrk(e.target.value)}
          onBlur={commitStrk}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </label>
      <div className="font-mono text-xs tabular-nums text-muted sm:pb-3 sm:text-right">
        <p className="text-ink">
          {numStrk > 0 ? `~${formatStrkUsd(numStrk)} USD` : "$0.00 USD"}
        </p>
        {numStrk > 0 ? (
          <p className="text-[10px] text-accent font-semibold">
            +{netCreatorStrk} STRK net (100% direct)
          </p>
        ) : null}
      </div>
    </li>
  );
}

function Stat({
  k,
  v,
  sub,
  accent,
}: {
  k: string;
  v: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-base px-5 py-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
        {k}
      </p>
      <p
        className={`mt-2 font-display text-3xl font-bold tabular-nums tracking-tight ${accent ? "text-accent" : "text-ink"}`}
      >
        {v}
      </p>
      {sub ? (
        <p className="mt-1 font-mono text-xs tabular-nums text-muted">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function downloadReceipt(r: {
  id: string;
  period: string;
  amountStrk: number;
  channels: number;
  createdAt: number;
  creator: string;
}) {
  const body = {
    protocol: "keepr",
    network: "starknet-mainnet",
    pool: "STRK20",
    statement: "viewing-key income receipt",
    creator: r.creator,
    period: r.period,
    amountStrk: r.amountStrk,
    activeChannels: r.channels,
    issuedAt: new Date(r.createdAt).toISOString(),
    note: "Payer identities are not included. Amounts are provable against open notes.",
  };
  const blob = new Blob([JSON.stringify(body, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `keepr-receipt-${r.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
