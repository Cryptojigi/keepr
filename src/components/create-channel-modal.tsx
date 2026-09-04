"use client";

import { useState } from "react";
import { toast } from "sonner";
import { validateAndParseAddress } from "starknet";
import { Globe, Lock, Plus, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useKeepr } from "@/lib/keepr/store";
import { useStoreWallet } from "@/app/components/Wallet/walletContext";
import type { CreatorRate, TierId } from "@/lib/keepr/types";

interface CreateChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (channelId: string) => void;
}

const CATEGORIES = [
  "AI Agent",
  "Alpha Intelligence",
  "DeFi Risk",
  "Editorial & Writing",
  "Engineering & Code",
  "Security & Audits",
  "Signals & Trading",
  "General",
] as const;

export function CreateChannelModal({
  open,
  onOpenChange,
  onCreated,
}: CreateChannelModalProps) {
  const connectedAddress = useStoreWallet((s) => s.address);
  const isWalletConnected = useStoreWallet((s) => s.isConnected);
  const storeAddress = useKeepr((s) => s.address);
  const createChannel = useKeepr((s) => s.createChannel);

  const effectiveAddress = connectedAddress || storeAddress || "";

  // Form State
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [category, setCategory] = useState("AI Agent");
  const [blurb, setBlurb] = useState("");
  const [payoutAddress, setPayoutAddress] = useState(effectiveAddress);
  const [serviceUrl, setServiceUrl] = useState("");
  const [discoverable, setDiscoverable] = useState(true);

  // Tiers State
  const [tier0Name, setTier0Name] = useState("Basic");
  const [tier0Strk, setTier0Strk] = useState("5");
  const [tier1Name, setTier1Name] = useState("Pro");
  const [tier1Strk, setTier1Strk] = useState("15");
  const [tier2Name, setTier2Name] = useState("VIP");
  const [tier2Strk, setTier2Strk] = useState("35");

  // Keep payout address updated with connected wallet when opened
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !payoutAddress && effectiveAddress) {
      setPayoutAddress(effectiveAddress);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a channel name.");
      return;
    }

    if (!handle.trim()) {
      toast.error("Please enter a unique channel handle.");
      return;
    }

    // Validate payout address
    const targetPayout = (payoutAddress || effectiveAddress).trim();
    if (!targetPayout) {
      toast.error("Please connect your wallet or specify a payout address.");
      return;
    }

    try {
      validateAndParseAddress(targetPayout);
    } catch {
      toast.error("Invalid Starknet payout address format.");
      return;
    }

    // Validate serviceUrl if provided
    if (serviceUrl.trim()) {
      const url = serviceUrl.trim().toLowerCase();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        toast.error("Service URL must start with http:// or https://");
        return;
      }
    }

    // Parse tiers
    const t0 = Math.max(1, parseInt(tier0Strk, 10) || 5);
    const t1 = Math.max(1, parseInt(tier1Strk, 10) || 15);
    const t2 = Math.max(1, parseInt(tier2Strk, 10) || 35);

    const rates: CreatorRate[] = [
      { id: 0 as TierId, name: tier0Name.trim() || "Basic", strk: t0 },
      { id: 1 as TierId, name: tier1Name.trim() || "Pro", strk: t1 },
      { id: 2 as TierId, name: tier2Name.trim() || "VIP", strk: t2 },
    ];

    const owner = effectiveAddress || targetPayout;

    const channel = createChannel({
      name: name.trim(),
      handle: handle.trim(),
      category: category.trim(),
      blurb: blurb.trim(),
      payoutAddress: targetPayout,
      ownerAddress: owner,
      rates,
      discoverable,
      serviceUrl: serviceUrl.trim() || undefined,
    });

    toast.success(`Channel "${channel.name}" launched!`, {
      description: discoverable
        ? "Listed in discovery catalog."
        : "Private channel ready. Share your direct link with subscribers.",
      action: {
        label: "Copy Link",
        onClick: () => {
          const url = `${window.location.origin}/subscribe?channel=${channel.id}`;
          void navigator.clipboard.writeText(url);
          toast.info("Channel link copied to clipboard!");
        },
      },
    });

    onOpenChange(false);
    if (onCreated) {
      onCreated(channel.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto border border-line bg-raised p-6 shadow-2xl">
        <DialogHeader>
          <p className="kicker">Creator Self-Service</p>
          <DialogTitle className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
            Launch Subscription Channel
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted">
            Create a permissionless private subscription channel on Starknet. Receive recurring shielded STRK notes directly to your payout address.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* Identity */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                Channel Name *
              </label>
              <Input
                placeholder="e.g. Aegis Sentinel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 bg-cream"
                required
              />
            </div>
            <div>
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                Handle *
              </label>
              <Input
                placeholder="e.g. aegis.agent"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="mt-1 bg-cream"
                required
              />
            </div>
          </div>

          {/* Category & Blurb */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full border border-line bg-cream px-3 py-2 font-mono text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
              Channel Description & Subscriber Offer
            </label>
            <textarea
              rows={2}
              placeholder="What do subscribers get? (e.g. Weekly alpha dispatch, high-frequency inference quota, private signals)"
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              className="mt-1 w-full border border-line bg-cream p-2.5 font-prose text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Payout Address */}
          <div>
            <div className="flex items-center justify-between">
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                Payout Address (Starknet Mainnet) *
              </label>
              {effectiveAddress && (
                <button
                  type="button"
                  onClick={() => setPayoutAddress(effectiveAddress)}
                  className="font-mono text-[10px] uppercase text-accent hover:underline"
                >
                  Use Connected Wallet
                </button>
              )}
            </div>
            <Input
              placeholder="0x0..."
              value={payoutAddress}
              onChange={(e) => setPayoutAddress(e.target.value)}
              className="mt-1 bg-cream font-mono text-xs"
              required
            />
            <p className="mt-1 font-mono text-[10px] text-muted">
              Subscription funds will be deposited directly to an open STRK note assigned to this address.
            </p>
          </div>

          {/* Billable Service Link */}
          <div>
            <div className="flex items-center justify-between">
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                Service / Content URL (Optional)
              </label>
              <span className="font-mono text-[10px] text-muted">Gated URL</span>
            </div>
            <Input
              placeholder="https://t.me/my_alpha_bot or https://api.myagent.ai"
              value={serviceUrl}
              onChange={(e) => setServiceUrl(e.target.value)}
              className="mt-1 bg-cream font-mono text-xs"
            />
            <p className="mt-1 font-mono text-[10px] text-muted">
              Subscribers receive an active access button pointing here once subscribed.
            </p>
          </div>

          {/* Discovery Toggle */}
          <div className="border border-line bg-cream p-3 flex items-center justify-between">
            <div className="pr-4">
              <div className="flex items-center gap-2">
                {discoverable ? (
                  <Globe className="size-4 text-accent" />
                ) : (
                  <Lock className="size-4 text-muted" />
                )}
                <span className="font-mono text-xs font-bold uppercase text-ink">
                  {discoverable ? "Public Channel (Discoverable)" : "Private Channel (Unlisted)"}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted">
                {discoverable
                  ? "Appears in the public explorer catalog on /subscribe."
                  : "Hidden from catalog. Reachable only via your direct share link (/subscribe?channel=...)"}
              </p>
            </div>
            <Switch checked={discoverable} onCheckedChange={setDiscoverable} />
          </div>

          {/* Subscription Tiers */}
          <div className="border border-line bg-cream/70 p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-ink">
              Monthly Subscription Tiers (STRK / 30 Days)
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {/* Tier 0 */}
              <div className="border border-line/60 bg-raised p-2.5">
                <p className="font-mono text-[10px] uppercase text-accent font-semibold">Tier 0 (Entry)</p>
                <Input
                  value={tier0Name}
                  onChange={(e) => setTier0Name(e.target.value)}
                  placeholder="Tier Name"
                  className="mt-1 h-8 bg-cream text-xs"
                />
                <div className="mt-1.5 flex items-center gap-1 font-mono text-xs">
                  <Input
                    type="number"
                    min={1}
                    value={tier0Strk}
                    onChange={(e) => setTier0Strk(e.target.value)}
                    className="h-8 bg-cream text-xs font-bold"
                  />
                  <span className="text-muted text-[10px]">STRK</span>
                </div>
              </div>

              {/* Tier 1 */}
              <div className="border border-line/60 bg-raised p-2.5">
                <p className="font-mono text-[10px] uppercase text-accent font-semibold">Tier 1 (Pro)</p>
                <Input
                  value={tier1Name}
                  onChange={(e) => setTier1Name(e.target.value)}
                  placeholder="Tier Name"
                  className="mt-1 h-8 bg-cream text-xs"
                />
                <div className="mt-1.5 flex items-center gap-1 font-mono text-xs">
                  <Input
                    type="number"
                    min={1}
                    value={tier1Strk}
                    onChange={(e) => setTier1Strk(e.target.value)}
                    className="h-8 bg-cream text-xs font-bold"
                  />
                  <span className="text-muted text-[10px]">STRK</span>
                </div>
              </div>

              {/* Tier 2 */}
              <div className="border border-line/60 bg-raised p-2.5">
                <p className="font-mono text-[10px] uppercase text-accent font-semibold">Tier 2 (VIP)</p>
                <Input
                  value={tier2Name}
                  onChange={(e) => setTier2Name(e.target.value)}
                  placeholder="Tier Name"
                  className="mt-1 h-8 bg-cream text-xs"
                />
                <div className="mt-1.5 flex items-center gap-1 font-mono text-xs">
                  <Input
                    type="number"
                    min={1}
                    value={tier2Strk}
                    onChange={(e) => setTier2Strk(e.target.value)}
                    className="h-8 bg-cream text-xs font-bold"
                  />
                  <span className="text-muted text-[10px]">STRK</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              <Sparkles className="size-4 mr-1.5" />
              Launch Channel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
