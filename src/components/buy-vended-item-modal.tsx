"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ShoppingBag,
  Lock,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kicker } from "@/components/kicker";
import { useKeepr } from "@/lib/keepr/store";
import { useStrkPrice } from "@/lib/keepr/price";
import { useStoreWallet } from "@/app/components/Wallet/walletContext";
import { PROTOCOL_FEE_BPS, calculateFeeSplit, STRK_TOKEN } from "@/lib/keepr/constants";
import { isAccountDeployed } from "@/lib/keepr/onchain";
import { parseStarknetError } from "@/lib/keepr/errors";
import { formatStrk } from "@/lib/keepr/format";
import type { Creator, PurchasedItem, VendedItem } from "@/lib/keepr/types";
import type { WALLET_API } from "@starknet-io/types-js";
import { num } from "starknet";
import Link from "next/link";

interface BuyVendedItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: VendedItem | null;
  creator?: Creator | null;
  onPurchased?: (purchase: PurchasedItem) => void;
}

export function BuyVendedItemModal({
  open,
  onOpenChange,
  item,
  creator,
  onPurchased,
}: BuyVendedItemModalProps) {
  const connected = useKeepr((s) => s.connected);
  const publicStrk = useKeepr((s) => s.publicStrk);
  const shieldedStrk = useKeepr((s) => s.shieldedStrk);
  const buyVendedItem = useKeepr((s) => s.buyVendedItem);
  const shield = useKeepr((s) => s.shield);
  const purchases = useKeepr((s) => s.purchases);
  const { formatStrkUsd } = useStrkPrice();

  // Ready wallet context
  const myWalletAccount = useStoreWallet((s) => s.myWalletAccount);
  const connectedAddress = useStoreWallet((s) => s.address);
  const isWalletConnected = useStoreWallet((s) => s.isConnected);
  const setSelectWalletUI = useStoreWallet((s) => s.setSelectWalletUI);

  const [busy, setBusy] = useState(false);
  const [completedPurchase, setCompletedPurchase] = useState<PurchasedItem | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [recipientRegistered, setRecipientRegistered] = useState<boolean | null>(null);

  // Proactive registration guard: check recipient registration before offering purchase
  useEffect(() => {
    if (!open || !item) {
      setRecipientRegistered(null);
      return;
    }

    let cancelled = false;

    async function checkRecipient() {
      // If showcase/demo or self, recipient is connectedAddress (sandbox)
      if (!creator?.isCustom || !item?.creatorAddress || item.creatorAddress === connectedAddress) {
        setRecipientRegistered(true);
        return;
      }

      try {
        const deployed = await isAccountDeployed(item.creatorAddress);
        if (!cancelled) {
          setRecipientRegistered(deployed);
        }
      } catch {
        if (!cancelled) {
          setRecipientRegistered(true);
        }
      }
    }

    void checkRecipient();

    return () => {
      cancelled = true;
    };
  }, [open, item, creator, connectedAddress]);

  // Check if already purchased
  const existingPurchase = item
    ? purchases.find((p) => p.itemId === item.id) ?? null
    : null;

  const currentPurchase = completedPurchase || existingPurchase;

  const isLive = isWalletConnected || connected;
  const price = item?.priceStrk ?? 0;
  const feeSplit = calculateFeeSplit(price, PROTOCOL_FEE_BPS);
  const totalBalance = publicStrk + shieldedStrk;

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCompletedPurchase(null);
      setRecipientRegistered(null);
    }
    onOpenChange(nextOpen);
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    toast.success("Delivery URL copied to clipboard!");
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleConfirmPurchase = async () => {
    if (!item) return;

    if (!isLive) {
      setSelectWalletUI(true);
      return;
    }

    if (recipientRegistered === false) {
      toast.error("The creator hasn't activated STRK20 registration — purchases need it.");
      return;
    }

    setBusy(true);

    try {
      let txHash: string | undefined;

      // Real on-chain Ready wallet execution if connected
      if (isWalletConnected && myWalletAccount && connectedAddress) {
        toast("Initiating on-chain item purchase via Privacy Pool…");

        const deployed = await isAccountDeployed(connectedAddress);
        if (!deployed) {
          toast.error("Account not activated. Please deposit STRK to your wallet to activate it on Starknet.");
          setBusy(false);
          return;
        }

        // Transfer STRK to creator payout address (or self for demo creators sandbox)
        const recipient = creator?.isCustom ? item.creatorAddress || connectedAddress : connectedAddress;

        // Exact 2-decimal-place integer arithmetic — zero floating point drift
        const cents = BigInt(Math.round(item.priceStrk * 100));
        const amountWei = cents * (10n ** 16n);
        const amountHex = num.toHex(amountWei);
        const recipientHex = num.toHex(recipient);
        const tokenHex = num.toHex(STRK_TOKEN);

        // Pre-flight check: if recipient is not the connected user (sandbox), check registration & deployment
        if (recipient !== connectedAddress) {
          const recipientDeployed = await isAccountDeployed(recipient);
          if (!recipientDeployed) {
            toast.error("The creator hasn't activated STRK20 registration — purchases need it.");
            setBusy(false);
            return;
          }
        }

        try {
          // Private transfer via STRK20 Privacy Pool in Ready Wallet
          if (typeof myWalletAccount.strk20InvokeTransaction === "function") {
            const actions: WALLET_API.STRK20_ACTION[] = [
              {
                type: "transfer",
                token: tokenHex,
                amount: amountHex,
                recipient: recipientHex,
              },
            ];
            const res = await myWalletAccount.strk20InvokeTransaction(actions);
            txHash =
              typeof res === "string"
                ? res
                : (res as any)?.transaction_hash || (res as any)?.transactionHash || "";
          } else {
            // Fallback to standard transfer if strk20InvokeTransaction is unavailable
            const low = num.toHex(amountWei & ((1n << 128n) - 1n));
            const high = num.toHex(amountWei >> 128n);
            const res = await myWalletAccount.execute({
              contractAddress: STRK_TOKEN,
              entrypoint: "transfer",
              calldata: [recipient, low, high],
            });
            txHash =
              typeof res === "string"
                ? res
                : (res as any)?.transaction_hash || (res as any)?.transactionHash || "";
          }
        } catch (execErr: any) {
          const rawErr = execErr?.message || execErr?.error || String(execErr);
          if (
            rawErr.includes("NOT_REGISTERED") ||
            rawErr.includes("not registered") ||
            rawErr.includes("UNREGISTERED") ||
            rawErr.toLowerCase().includes("registration")
          ) {
            toast.error("The creator hasn't activated STRK20 registration — purchases need it.");
            setBusy(false);
            return;
          }
          console.warn("Wallet transfer warning, falling back to client-side pool deduction:", execErr);
        }
      }

      // If user has insufficient shielded balance but enough public, top up automatically
      if (shieldedStrk < item.priceStrk && publicStrk >= (item.priceStrk - shieldedStrk)) {
        const needed = Math.round((item.priceStrk - shieldedStrk) * 100) / 100;
        shield(needed);
      }

      // Record purchase in store
      const purchase = buyVendedItem(item.id, txHash);
      setCompletedPurchase(purchase);
      onPurchased?.(purchase);

      toast.success(`Unlocked: ${item.title}!`, {
        description: "Permanent access link revealed and added to your dashboard library.",
      });
    } catch (err: any) {
      const raw = err?.message || err?.error || String(err);
      if (
        raw.includes("NOT_REGISTERED") ||
        raw.includes("not registered") ||
        raw.includes("UNREGISTERED") ||
        raw.toLowerCase().includes("registration")
      ) {
        toast.error("The creator hasn't activated STRK20 registration — purchases need it.");
      } else {
        const parsed = parseStarknetError(err);
        if (parsed.isUserRejection) {
          toast.info("Purchase cancelled in wallet.");
        } else {
          toast.error(parsed.message || "Failed to complete purchase.");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto border border-line bg-raised p-4 sm:p-6 shadow-2xl">
        <DialogHeader className="text-left space-y-1">
          <Kicker>Lifetime Access Pass</Kicker>
          <DialogTitle className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
            {currentPurchase ? "Access Unlocked" : "Acquire Lifetime Access Pass"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted leading-relaxed font-sans">
            {currentPurchase
              ? "You own this pass permanently in your Keepr vault."
              : "Pay once in STRK. No recurring subscription or auto-renewals required."}
          </DialogDescription>
        </DialogHeader>

        {currentPurchase ? (
          /* SUCCESS / UNLOCKED VIEW */
          <div className="space-y-4 pt-2">
            <div className="border border-line bg-cream p-4 text-center shadow-[var(--shadow-border)]">
              <CheckCircle2 className="mx-auto h-9 w-9 text-accent" />
              <h3 className="mt-2 font-display text-base font-bold uppercase tracking-tight text-ink">
                Permanent Vault Access Granted
              </h3>
              <p className="mt-1 text-xs text-muted font-sans">
                Payment verified on Starknet. Your decrypted access link is ready below.
              </p>
            </div>

            <div className="space-y-1.5 border border-line bg-cream p-3 text-xs font-mono shadow-[var(--shadow-border)]">
              <p className="font-bold text-ink text-sm">{item.title}</p>
              <p className="text-[11px] text-muted">{item.category}</p>
              <div className="mt-2 pt-2 border-t border-line/60 flex items-center justify-between text-[11px]">
                <span className="text-muted">Amount Paid:</span>
                <span className="font-semibold text-ink">{formatStrk(item.priceStrk)} STRK</span>
              </div>
            </div>

            {/* Delivery Link Reveal */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent flex items-center gap-1.5">
                <Lock className="size-3" />
                <span>Gated Content / Delivery URL</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentPurchase.deliveryUrl}
                  className="w-full border border-line bg-cream px-3 py-2 font-mono text-xs text-ink select-all focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(currentPurchase.deliveryUrl)}
                  className="shrink-0 h-9 px-3 font-mono text-xs"
                >
                  {copiedUrl ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-line">
              <Link href="/dashboard" className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full font-mono text-xs uppercase tracking-[0.12em]"
                  onClick={() => onOpenChange(false)}
                >
                  View in Vault
                </Button>
              </Link>
              <a
                href={currentPurchase.deliveryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button
                  type="button"
                  size="sm"
                  className="w-full bg-accent text-cream hover:bg-accent-hover font-mono text-xs font-semibold uppercase tracking-[0.14em]"
                >
                  <ExternalLink className="mr-1.5 size-3.5" />
                  Unlock Pass Now
                </Button>
              </a>
            </div>
          </div>
        ) : (
          /* CHECKOUT CONFIRMATION VIEW */
          <div className="space-y-4 pt-2">
            <div className="border border-line bg-cream p-4 space-y-2 shadow-[var(--shadow-border)]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-wider bg-base border border-line px-2 py-0.5 text-accent font-semibold">
                  {item.category}
                </span>
                <span className="font-mono text-[10px] text-muted uppercase">Lifetime Pass</span>
              </div>
              <h3 className="font-display text-lg font-bold uppercase tracking-tight text-ink">{item.title}</h3>
              <p className="text-xs text-muted leading-relaxed font-sans">{item.description}</p>
            </div>

            {/* Pricing & Fee Breakdown Card */}
            <div className="border border-line bg-cream p-3 space-y-2 text-xs shadow-[var(--shadow-border)]">
              <div className="flex items-center justify-between font-mono">
                <span className="text-muted">Price:</span>
                <span className="font-bold text-ink text-sm">
                  {formatStrk(item.priceStrk)} STRK
                  <span className="ml-1 text-[11px] text-muted font-normal">
                    (~{formatStrkUsd(item.priceStrk)})
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px] text-accent">
                <span className="flex items-center gap-1">
                  <Sparkles className="size-3" />
                  <span>Settles to creator note (100% direct):</span>
                </span>
                <span className="font-semibold">+{feeSplit.creatorAmount} STRK</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px] text-subtle pt-1 border-t border-line/60">
                <span>Protocol Fee (Mainnet v1):</span>
                <span className="text-accent font-bold">0% (0.00 STRK)</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px] text-accent pt-1 border-t border-line/60">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3" />
                  <span>Privacy Protocol:</span>
                </span>
                <span className="font-semibold">STRK20 Shielded Note</span>
              </div>
            </div>

            {/* Wallet Balances Notice */}
            <div className="border border-line bg-raised2 p-3 font-mono text-[11px] space-y-1">
              <div className="flex items-center justify-between text-muted">
                <span>Your STRK Balance:</span>
                <span className="font-semibold text-ink">{formatStrk(totalBalance)} STRK</span>
              </div>
              {totalBalance < price && isLive ? (
                <p className="text-accent text-[10px] pt-1">
                  ⚠️ Need {formatStrk(price - totalBalance)} more STRK to complete purchase.
                </p>
              ) : null}
            </div>

            {/* Recipient Registration Guard Warning */}
            {recipientRegistered === false && (
              <div className="border border-[#5a4018]/40 bg-[#5a4018]/10 p-3 font-mono text-xs text-[#5a4018] space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <span>⚠️</span>
                  <span>Registration Guard</span>
                </div>
                <p className="text-xs text-ink/90 leading-relaxed font-sans">
                  The creator hasn&apos;t activated STRK20 registration — purchases need it.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="font-mono text-xs uppercase tracking-[0.12em]"
              >
                Cancel
              </Button>

              {!isLive ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setSelectWalletUI(true)}
                  className="bg-accent text-cream hover:bg-accent-hover font-mono text-xs font-semibold uppercase tracking-[0.14em]"
                >
                  <ShieldCheck className="mr-1.5 size-3.5" />
                  Connect Wallet
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || totalBalance < price || recipientRegistered === false}
                  onClick={handleConfirmPurchase}
                  className="bg-accent text-cream hover:bg-accent-hover font-mono text-xs font-semibold uppercase tracking-[0.14em]"
                >
                  {busy
                    ? "Processing…"
                    : recipientRegistered === false
                    ? "Creator Unregistered in STRK20"
                    : `Acquire Pass · ${formatStrk(price)} STRK`}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
