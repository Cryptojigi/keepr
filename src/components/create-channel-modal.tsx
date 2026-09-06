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
import type { CreatorRate, TierId, PricingType } from "@/lib/keepr/types";
import { cn } from "@/lib/utils";

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
  const isStoreConnected = useKeepr((s) => s.connected);
  const createChannel = useKeepr((s) => s.createChannel);

  // Derive active address safely
  const effectiveAddress = connectedAddress || (isStoreConnected ? storeAddress : "");

  // Form State
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [category, setCategory] = useState("AI Agent");
  const [blurb, setBlurb] = useState("");
  const [payoutAddress, setPayoutAddress] = useState(effectiveAddress);
  const [serviceUrl, setServiceUrl] = useState("");
  const [discoverable, setDiscoverable] = useState(true);

  // Pricing Model State
  const [pricingModel, setPricingModel] = useState<PricingType>("flat");
  const [flatPlanName, setFlatPlanName] = useState("Standard Access");
  const [flatPlanStrk, setFlatPlanStrk] = useState("25");

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

    // Parse rates based on selected pricing model
    let rates: CreatorRate[];
    if (pricingModel === "flat") {
      const flatRate = Math.max(1, parseInt(flatPlanStrk, 10) || 25);
      rates = [
        {
          id: 0 as TierId,
          name: flatPlanName.trim() || "Standard Access",
          strk: flatRate,
        },
      ];
    } else {
      const t0 = Math.max(1, parseInt(tier0Strk, 10) || 5);
      const t1 = Math.max(1, parseInt(tier1Strk, 10) || 15);
      const t2 = Math.max(1, parseInt(tier2Strk, 10) || 35);
      rates = [
        { id: 0 as TierId, name: tier0Name.trim() || "Basic", strk: t0 },
        { id: 1 as TierId, name: tier1Name.trim() || "Pro", strk: t1 },
        { id: 2 as TierId, name: tier2Name.trim() || "VIP", strk: t2 },
      ];
    }

    const owner = effectiveAddress || targetPayout;

    const channel = createChannel({
      name: name.trim(),
      handle: handle.trim(),
      category: category.trim(),
      blurb: blurb.trim(),
      payoutAddress: targetPayout,
      ownerAddress: owner,
      rates,
      pricingType: pricingModel,
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto border border-line bg-raised p-4 sm:p-6 shadow-2xl">
        <DialogHeader>
          <p className="kicker">Creator Self-Service</p>
          <DialogTitle className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
            Launch Subscription Channel
          </DialogTitle>
          <DialogDescription className="font-sans text-xs text-muted leading-relaxed">
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
              className="mt-1 w-full border border-line bg-cream px-3 py-2 font-sans text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
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
            <p className="mt-1 font-sans text-[11px] text-muted leading-relaxed">
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
            <p className="mt-1 font-sans text-[11px] text-muted leading-relaxed">
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
              <p className="mt-1 font-sans text-[11px] text-muted leading-relaxed">
                {discoverable
                  ? "Appears in the public explorer catalog on /subscribe."
                  : "Hidden from catalog. Reachable only via your direct share link (/subscribe?channel=...)"}
              </p>
            </div>
            <Switch checked={discoverable} onCheckedChange={setDiscoverable} />
          </div>

          {/* Pricing Model Configuration */}
          <div className="border border-line bg-cream/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-ink">
                  Subscription Pricing Model
                </p>
                <p className="mt-0.5 font-sans text-[11px] text-muted leading-relaxed">
                  Choose a single renewable flat rate or a 3-tier structure
                </p>
              </div>
              <div className="inline-flex border border-line bg-raised p-0.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setPricingModel("flat")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                    pricingModel === "flat"
                      ? "bg-accent text-cream shadow-sm"
                      : "text-muted hover:text-ink",
                  )}
                >
                  Single Plan (Flat)
                </button>
                <button
                  type="button"
                  onClick={() => setPricingModel("tiered")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                    pricingModel === "tiered"
                      ? "bg-accent text-cream shadow-sm"
                      : "text-muted hover:text-ink",
                  )}
                >
                  3-Tiered Plans
                </button>
              </div>
            </div>

            {pricingModel === "flat" ? (
              <div className="mt-3 border border-line/60 bg-raised p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-accent font-semibold">
                    One-Time Renewable Pass
                  </span>
                  <span className="font-mono text-[10px] text-muted">
                    Duration: 30 Days
                  </span>
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-[1.5fr_1fr]">
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-wider text-subtle">
                      Plan Label / Title
                    </label>
                    <Input
                      value={flatPlanName}
                      onChange={(e) => setFlatPlanName(e.target.value)}
                      placeholder="e.g. Standard Pass, All-Access, Monthly Pass"
                      className="mt-1 bg-cream text-xs font-sans font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-wider text-subtle">
                      Price (STRK / 30d)
                    </label>
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-xs">
                      <Input
                        type="number"
                        min={1}
                        value={flatPlanStrk}
                        onChange={(e) => setFlatPlanStrk(e.target.value)}
                        className="bg-cream text-xs font-bold"
                      />
                      <span className="text-muted text-[10px] font-bold">STRK</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 font-sans text-[11px] text-muted leading-relaxed">
                  Subscribers pay this single flat rate for 30 days of access. No tiers required. Access can be renewed manually or via automated session keepers when expired.
                </p>
              </div>
            ) : (
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
            )}
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
