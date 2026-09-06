"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ShoppingBag, Lock, Sparkles, Tag, DollarSign, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kicker } from "@/components/kicker";
import { useKeepr } from "@/lib/keepr/store";
import { PROTOCOL_FEE_BPS, calculateFeeSplit } from "@/lib/keepr/constants";
import type { VendedItem } from "@/lib/keepr/types";

interface CreateVendedItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorAddress: string;
  editItem?: VendedItem | null;
  onSaved?: (itemId: string) => void;
}

const ITEM_CATEGORIES = [
  "Agent License",
  "Code & Scripts",
  "Research Dossier",
  "Dataset & Corpus",
  "API Access Key",
  "Private Community Invite",
  "Consultation & Service",
  "Lifetime Pass",
] as const;

export function CreateVendedItemModal({
  open,
  onOpenChange,
  creatorId,
  creatorAddress,
  editItem,
  onSaved,
}: CreateVendedItemModalProps) {
  const createVendedItem = useKeepr((s) => s.createVendedItem);
  const updateVendedItem = useKeepr((s) => s.updateVendedItem);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Agent License");
  const [priceStrk, setPriceStrk] = useState("15");
  const [description, setDescription] = useState("");
  const [deliveryUrl, setDeliveryUrl] = useState("");

  useEffect(() => {
    if (editItem) {
      setTitle(editItem.title);
      setCategory(editItem.category);
      setPriceStrk(String(editItem.priceStrk));
      setDescription(editItem.description);
      setDeliveryUrl(editItem.deliveryUrl);
    } else {
      setTitle("");
      setCategory("Agent License");
      setPriceStrk("15");
      setDescription("");
      setDeliveryUrl("");
    }
  }, [editItem, open]);

  const numPrice = Math.max(0.01, parseFloat(priceStrk) || 0);
  const feeSplit = calculateFeeSplit(numPrice, PROTOCOL_FEE_BPS);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter an item title.");
      return;
    }

    if (numPrice <= 0 || isNaN(numPrice)) {
      toast.error("Please specify a valid price in STRK (> 0).");
      return;
    }

    if (!deliveryUrl.trim()) {
      toast.error("Please provide a gated delivery link or secret resource URL.");
      return;
    }

    const cleanUrl = deliveryUrl.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://") && !cleanUrl.startsWith("ipfs://")) {
      toast.error("Delivery URL must start with https://, http://, or ipfs://");
      return;
    }

    if (editItem) {
      updateVendedItem(editItem.id, {
        title: title.trim(),
        category,
        priceStrk: numPrice,
        description: description.trim() || "No description provided.",
        deliveryUrl: cleanUrl,
      });
      toast.success("Pass updated in your channel catalog!");
      onSaved?.(editItem.id);
    } else {
      const newItem = createVendedItem({
        creatorId,
        creatorAddress,
        title: title.trim(),
        description: description.trim() || "Standalone digital pass unlocked permanently on-chain.",
        category,
        priceStrk: numPrice,
        deliveryUrl: cleanUrl,
      });
      toast.success("Lifetime pass issued! Users can now acquire it permanently.");
      onSaved?.(newItem.id);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto border border-line bg-raised p-4 sm:p-6 shadow-2xl">
        <DialogHeader className="text-left space-y-1">
          <Kicker>Channel Catalog</Kicker>
          <DialogTitle className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
            {editItem ? "Edit Lifetime Pass" : "Issue Lifetime Access Pass or License"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted leading-relaxed font-sans">
            Issue standalone software licenses, permanent access keys, or perpetual research passes without requiring ongoing subscriptions. Buyers pay once in STRK and retain permanent access in their vault.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between">
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                Pass / License Title *
              </label>
              <span className="text-[10px] text-muted">e.g. Sentinel Daemon License</span>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Automated CDP Liquidation Sentinel Daemon"
              maxLength={80}
              className="mt-1 bg-cream border border-line text-ink font-sans text-sm focus:border-accent"
              required
            />
          </div>

          {/* Category & Price Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle flex items-center gap-1.5">
                <Tag className="size-3 text-muted" />
                <span>Category</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full h-10 border border-line bg-cream px-3 py-1 text-sm font-sans text-ink focus:outline-none focus:border-accent"
              >
                {ITEM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-cream text-ink">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle flex items-center gap-1.5">
                  <DollarSign className="size-3 text-accent" />
                  <span>Price (STRK) *</span>
                </label>
                <span className="text-[10px] text-muted">One-time payment</span>
              </div>
              <Input
                type="number"
                min="0.01"
                step="0.1"
                value={priceStrk}
                onChange={(e) => setPriceStrk(e.target.value)}
                placeholder="15"
                className="mt-1 bg-cream border border-line text-ink font-mono text-sm focus:border-accent"
                required
              />
            </div>
          </div>

          {/* Protocol Fee Breakdown Card */}
          <div className="border border-line bg-cream p-3 text-xs space-y-1.5 shadow-[var(--shadow-border)]">
            <div className="flex items-center justify-between font-mono">
              <span className="text-muted">Price per pass:</span>
              <span className="font-bold text-ink">{feeSplit.grossAmount} STRK</span>
            </div>
            <div className="flex items-center justify-between font-mono text-accent">
              <span className="flex items-center gap-1">
                <Sparkles className="size-3" />
                <span>Net to your payout note (100% direct):</span>
              </span>
              <span className="font-bold">+{feeSplit.creatorAmount} STRK</span>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] text-subtle pt-1 border-t border-line/60">
              <span>Keepr Protocol fee (Mainnet v1):</span>
              <span className="text-emerald-400 font-semibold">0% (0.00 STRK)</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between">
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                Description / What Licensees Get
              </label>
              <span className="text-[10px] text-muted">Markdown supported</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the utility, contents, installation instructions, or access rights that the buyer unlocks..."
              rows={3}
              maxLength={400}
              className="mt-1 w-full border border-line bg-cream p-2.5 text-sm font-sans text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent"
            />
          </div>

          {/* Delivery URL (Gated Secret) */}
          <div>
            <div className="flex items-center justify-between">
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent flex items-center gap-1.5">
                <Lock className="size-3" />
                <span>Gated Delivery / Download URL *</span>
              </label>
              <span className="text-[10px] text-muted">Revealed only after payment</span>
            </div>
            <Input
              value={deliveryUrl}
              onChange={(e) => setDeliveryUrl(e.target.value)}
              placeholder="https://drive.google.com/... or https://github.com/..."
              className="mt-1 bg-cream border border-line text-ink font-mono text-sm focus:border-accent"
              required
            />
            <p className="mt-1 text-[11px] text-muted flex items-center gap-1 font-sans">
              <Info className="size-3 text-muted shrink-0" />
              <span>
                Licensees only receive this link after verified payment on Starknet. It will be permanently stored in their dashboard vault.
              </span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="font-mono text-xs uppercase tracking-[0.12em]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-accent text-cream hover:bg-accent-hover font-mono text-xs font-semibold uppercase tracking-[0.14em]"
            >
              {editItem ? "Save Changes" : "Issue Lifetime Pass"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
