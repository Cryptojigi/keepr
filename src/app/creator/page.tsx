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
  Archive,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Kicker } from "@/components/kicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateChannelModal } from "@/components/create-channel-modal";
import { DEMO_RECEIPTS, MRR_SERIES, isAddressEqual } from "@/lib/keepr/data";
import { formatDate, formatStrk } from "@/lib/keepr/format";
import { useKeepr } from "@/lib/keepr/store";
import { useStrkPrice } from "@/lib/keepr/price";
import { useStoreWallet } from "@/app/components/Wallet/walletContext";
import type { Creator, CreatorRate, TierId } from "@/lib/keepr/types";
import { cn } from "@/lib/utils";

function truncateAddress(addr?: string | null) {
  if (!addr) return "";
  if (addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function CreatorPage() {
  const customCreators = useKeepr((s) => s.customCreators);
  const subs = useKeepr((s) => s.subs);
  const updateChannel = useKeepr((s) => s.updateChannel);
  const archiveChannel = useKeepr((s) => s.archiveChannel);

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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [chartOn, setChartOn] = useState(false);

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
  const churn = 3.8;

  const series = useMemo(
    () =>
      MRR_SERIES.map((p, i) =>
        i === MRR_SERIES.length - 1 ? { ...p, v: mrr > 0 ? mrr : p.v } : p,
      ),
    [mrr],
  );

  function handleCopyShareLink(channelId: string) {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/subscribe?channel=${channelId}`
        : `https://keepr.cash/subscribe?channel=${channelId}`;

    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Share link copied to clipboard!", {
      description: url,
    });
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleToggleDiscoverable() {
    if (!activeChannel) return;
    const nextState = !activeChannel.discoverable;
    updateChannel(activeChannel.id, { discoverable: nextState });
    toast.success(
      nextState
        ? "Channel is now Public (visible in Explorer)"
        : "Channel is now Private (accessible only via direct link)",
    );
  }

  function handleArchiveChannel() {
    if (!activeChannel) return;
    archiveChannel(activeChannel.id);
    setArchiveConfirmOpen(false);
    toast.success("Channel archived", {
      description:
        "Channel is unlisted and closed to new subscribers. Existing subscriptions remain active until expiry.",
    });
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
                {c.archived ? (
                  <span className="text-[9px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded">
                    Archived
                  </span>
                ) : !c.discoverable ? (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded">
                    Private
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          className="font-mono text-[11px] uppercase tracking-[0.14em]"
        >
          <Plus className="mr-1.5 size-3.5" />
          New Channel
        </Button>
      </div>

      {activeChannel ? (
        <div className="mt-8 space-y-8">
          {/* Channel Header Banner */}
          <div className="bg-raised p-6 border border-line shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Kicker>{activeChannel.category}</Kicker>
                  {activeChannel.archived ? (
                    <span className="inline-flex items-center gap-1 border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-red-400">
                      <Archive className="size-3" />
                      Archived (No New Subs)
                    </span>
                  ) : activeChannel.discoverable ? (
                    <span className="inline-flex items-center gap-1 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                      <Globe className="size-3" />
                      Public · Listed on Explorer
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-300">
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
                      <Check className="mr-1.5 size-3.5 text-emerald-400" />
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
                  onClick={handleToggleDiscoverable}
                  className="font-mono text-xs uppercase tracking-[0.12em]"
                  title="Toggle discovery in Explorer"
                >
                  {activeChannel.discoverable ? (
                    <>
                      <EyeOff className="mr-1.5 size-3.5 text-amber-400" />
                      Make Private
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1.5 size-3.5 text-emerald-400" />
                      Make Public
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                  className="font-mono text-xs uppercase tracking-[0.12em]"
                >
                  <Settings2 className="mr-1.5 size-3.5" />
                  Edit Settings
                </Button>

                {!activeChannel.archived ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setArchiveConfirmOpen(true)}
                    className="font-mono text-xs uppercase tracking-[0.12em] text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Archive className="mr-1.5 size-3.5" />
                    Archive
                  </Button>
                ) : null}
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

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                  className="h-7 text-[11px] font-mono uppercase text-subtle hover:text-ink"
                >
                  {activeChannel.serviceUrl ? "Change URL" : "+ Add Service Link"}
                </Button>
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
          <RateBook creatorId={activeChannel.id} />

          {/* Inflows Chart */}
          <section className="bg-raised p-4 shadow-[var(--shadow-border)] sm:p-5 border border-line">
            <div className="flex items-center justify-between">
              <Kicker>Private inflows</Kicker>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
                6 months · channel ledger
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
              <Kicker>Income statements</Kicker>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
                Provable receipts
              </p>
            </div>
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {DEMO_RECEIPTS.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-mono text-sm text-ink">{r.period}</p>
                    <p className="mt-1 font-mono text-[11px] text-subtle">
                      {r.channels} active passes · issued{" "}
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
          </section>
        </div>
      ) : null}

      {/* Edit Channel Settings Dialog */}
      {activeChannel ? (
        <EditChannelDialog
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          channel={activeChannel}
          onSave={(patch) => {
            updateChannel(activeChannel.id, patch);
            setEditModalOpen(false);
            toast.success("Channel settings updated");
          }}
        />
      ) : null}

      {/* Archive Channel Confirmation Dialog */}
      {activeChannel ? (
        <Dialog
          open={archiveConfirmOpen}
          onOpenChange={setArchiveConfirmOpen}
        >
          <DialogContent className="max-w-md border-line bg-raised font-mono">
            <DialogHeader>
              <DialogTitle className="font-display text-xl uppercase tracking-tight text-red-400">
                Archive Channel?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted leading-relaxed pt-2">
                Archiving <strong>{activeChannel.name}</strong> will
                immediately unlist it from discovery and reject all new
                subscription attempts.
                <br />
                <br />
                Existing subscribers will retain access until their paid 30-day
                period expires. This action cannot be easily undone.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setArchiveConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleArchiveChannel}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Confirm Archive
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
    </main>
  );
}

function EditChannelDialog({
  open,
  onOpenChange,
  channel,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Creator;
  onSave: (patch: Partial<Creator>) => void;
}) {
  const [blurb, setBlurb] = useState(channel.blurb);
  const [serviceUrl, setServiceUrl] = useState(channel.serviceUrl ?? "");
  const [category, setCategory] = useState(channel.category);
  const [discoverable, setDiscoverable] = useState(channel.discoverable ?? true);
  const [urlError, setUrlError] = useState("");

  useEffect(() => {
    setBlurb(channel.blurb);
    setServiceUrl(channel.serviceUrl ?? "");
    setCategory(channel.category);
    setDiscoverable(channel.discoverable ?? true);
    setUrlError("");
  }, [channel, open]);

  function handleSave() {
    let cleanUrl = serviceUrl.trim();
    if (cleanUrl) {
      if (!/^https?:\/\//i.test(cleanUrl)) {
        setUrlError("Service URL must start with http:// or https://");
        return;
      }
    }

    onSave({
      blurb: blurb.trim() || channel.blurb,
      serviceUrl: cleanUrl || undefined,
      category: category.trim() || channel.category,
      discoverable,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-line bg-raised font-mono">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase tracking-tight">
            Edit Channel Settings
          </DialogTitle>
          <DialogDescription className="text-xs text-muted">
            Update your public blurb, billable service destination, and
            discovery listing.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.16em] text-subtle mb-1">
              Category
            </label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. AI Agent, Signals, Engineering"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.16em] text-subtle mb-1">
              Channel Blurb / Description
            </label>
            <textarea
              rows={3}
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              className="w-full border border-line bg-base p-2 font-mono text-xs text-ink focus:outline-none focus:border-accent"
              placeholder="Tell subscribers what value they receive..."
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.16em] text-subtle mb-1">
              Billable Service URL (Discord, Telegram, API, etc.)
            </label>
            <Input
              value={serviceUrl}
              onChange={(e) => {
                setServiceUrl(e.target.value);
                setUrlError("");
              }}
              placeholder="https://t.me/+xyz or https://api.service.com"
            />
            {urlError ? (
              <p className="mt-1 text-[11px] text-red-400">{urlError}</p>
            ) : (
              <p className="mt-1 text-[10px] text-muted">
                Active subscribers can click "Access Gated Service" to visit
                this link. Unsubscribed users see a locked gate.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink">
                Public Discovery
              </p>
              <p className="text-[10px] text-muted">
                List this channel in the public /subscribe catalog.
              </p>
            </div>
            <Switch
              checked={discoverable}
              onCheckedChange={setDiscoverable}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RateBook({ creatorId }: { creatorId: string }) {
  const book = useKeepr((s) => s.creatorRates);
  const defaultRates = useMemo<CreatorRate[]>(
    () => [
      { id: 0, name: "Basic", strk: 25 },
      { id: 1, name: "Pro", strk: 100 },
      { id: 2, name: "VIP", strk: 250 },
    ],
    [],
  );

  const rates = book[creatorId] ?? defaultRates;

  return (
    <section className="mt-6 border border-line bg-raised p-5 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Kicker>Rate Book</Kicker>
          <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight">
            Set what you charge.
          </h2>
        </div>
        <p className="max-w-sm font-mono text-[11px] leading-relaxed text-subtle">
          New rates apply immediately to future subscriptions and next renewals.
        </p>
      </div>
      <ul className="mt-4 divide-y divide-line bg-cream shadow-[var(--shadow-border)]">
        {rates.map((r) => (
          <RateRow key={r.id} creatorId={creatorId} rate={r} />
        ))}
      </ul>
    </section>
  );
}

function RateRow({
  creatorId,
  rate,
}: {
  creatorId: string;
  rate: CreatorRate;
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

  return (
    <li className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_10rem_7rem] sm:items-end">
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
          Plan
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
      <p className="font-mono text-xs tabular-nums text-muted sm:pb-3 sm:text-right">
        {Number(strk) > 0
          ? `~${formatStrkUsd(Number(strk))} USD`
          : "$0.00 USD"}
      </p>
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
