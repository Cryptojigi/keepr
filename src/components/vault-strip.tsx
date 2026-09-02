"use client";

import { useState } from "react";
import { toast } from "sonner";
import { num } from "starknet";
import { RefreshCw, ShieldCheck, KeyRound, ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { WALLET_API } from "@starknet-io/types-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NETWORK_LABEL, STRK_TOKEN } from "@/lib/keepr/constants";
import { isAccountDeployed, refreshLiveBalances } from "@/lib/keepr/onchain";
import { parseStarknetError } from "@/lib/keepr/errors";
import { formatStrk, shortAddr } from "@/lib/keepr/format";
import { useKeepr } from "@/lib/keepr/store";
import { useStrkPrice } from "@/lib/keepr/price";
import { useStoreWallet } from "@/app/components/Wallet/walletContext";

export function VaultStrip() {
  const connected = useKeepr((s) => s.connected);
  const address = useKeepr((s) => s.address);
  const publicStrk = useKeepr((s) => s.publicStrk);
  const shieldedStrk = useKeepr((s) => s.shieldedStrk);
  const isSyncingBalances = useKeepr((s) => s.isSyncingBalances);
  const sessionKey = useKeepr((s) => s.sessionKey);
  const shield = useKeepr((s) => s.shield);
  const unshield = useKeepr((s) => s.unshield);
  const grantSessionKey = useKeepr((s) => s.grantSessionKey);
  const revokeSessionKey = useKeepr((s) => s.revokeSessionKey);
  const busy = useKeepr((s) => s.busy);
  const setBusy = useKeepr((s) => s.setBusy);
  const [amount, setAmount] = useState("25");
  const { formatStrkUsd } = useStrkPrice();

  // Ready wallet live state
  const myWalletAccount = useStoreWallet((s) => s.myWalletAccount);
  const connectedAddress = useStoreWallet((s) => s.address);
  const isWalletConnected = useStoreWallet((s) => s.isConnected);

  const effectiveAddress = connectedAddress || address;
  const isLive = isWalletConnected || connected;

  if (!isLive) return null;

  async function run(kind: "shield" | "unshield") {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Please enter a valid STRK amount.");
      return;
    }
    setBusy(kind);
    try {
      if (isWalletConnected && myWalletAccount) {
        const account = connectedAddress ?? myWalletAccount.address;
        const deployed = await isAccountDeployed(account);
        if (!deployed) {
          toast.error("Account not activated. Please deposit STRK to your wallet first.");
          return;
        }
        const amountWei = BigInt(Math.floor(n)) * 10n ** 18n;
        const actions: WALLET_API.STRK20_ACTION[] =
          kind === "shield"
            ? [{ type: "deposit", token: STRK_TOKEN, amount: num.toHex(amountWei) }]
            : [
                {
                  type: "withdraw",
                  token: STRK_TOKEN,
                  amount: num.toHex(amountWei),
                  recipient: connectedAddress,
                },
              ];

        const res = await myWalletAccount.strk20InvokeTransaction(actions);
        const txHash =
          typeof res === "string"
            ? res
            : (res as { transaction_hash?: string; transactionHash?: string })?.transaction_hash ||
              (res as { transaction_hash?: string; transactionHash?: string })?.transactionHash ||
              "";

        toast.success(
          `${kind === "shield" ? "Shielded" : "Withdrawn"} ${n} STRK`,
          {
            description: txHash ? `Tx: ${txHash.slice(0, 14)}…` : "Transaction submitted",
            action: txHash
              ? {
                  label: "View",
                  onClick: () => window.open(`https://starkscan.co/tx/${txHash}`, "_blank"),
                }
              : undefined,
          },
        );

        setTimeout(() => {
          void refreshLiveBalances({ fetchShielded: true });
        }, 800);
      } else {
        await wait(600);
        const hash = kind === "shield" ? shield(n) : unshield(n);
        toast.success(
          `${kind === "shield" ? "Shielded" : "Withdrawn"} ${n} STRK`,
          { description: `Tx: ${hash.slice(0, 14)}…` },
        );
      }
    } catch (e: any) {
      const parsed = parseStarknetError(e);
      if (parsed.isUserRejection) {
        toast.info("Transaction cancelled in wallet.");
      } else {
        toast.error(parsed.message, { description: parsed.detail });
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="border border-line bg-raised shadow-[var(--shadow-border)]">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
          <div>
            <p className="kicker">Vault Account</p>
            <p className="mt-0.5 font-mono text-xs text-muted">
              {shortAddr(effectiveAddress, 8, 6)} · {NETWORK_LABEL}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void refreshLiveBalances({ fetchShielded: true });
              toast.info("Updating balances from network…");
            }}
            disabled={isSyncingBalances}
            className="inline-flex items-center gap-1.5 border border-line bg-cream px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:bg-raised transition-colors disabled:opacity-50"
            title="Refresh balances"
          >
            <RefreshCw className={`size-3 text-accent ${isSyncingBalances ? "animate-spin" : ""}`} />
            <span>{isSyncingBalances ? "Syncing…" : "Sync"}</span>
          </button>
        </div>

        {/* 3 Clean Stat Cards */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-px sm:bg-line">
          {/* 1. Shielded Balance */}
          <div className="border border-line sm:border-0 bg-base p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent font-semibold">
                Shielded Balance
              </p>
              <ShieldCheck className="size-3.5 text-accent" />
            </div>
            <p className="mt-1.5 font-mono text-xl font-bold tabular-nums text-accent">
              {formatStrk(shieldedStrk)} <span className="text-xs font-normal text-subtle">STRK</span>
            </p>
            <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted">
              ~{formatStrkUsd(shieldedStrk)} (Private note balance for subscriptions)
            </p>
          </div>

          {/* 2. Public Wallet Balance */}
          <div className="border border-line sm:border-0 bg-base p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
              Public Wallet Balance
            </p>
            <p className="mt-1.5 font-mono text-xl font-bold tabular-nums text-ink">
              {formatStrk(publicStrk)} <span className="text-xs font-normal text-subtle">STRK</span>
            </p>
            <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted">
              ~{formatStrkUsd(publicStrk)} (Available to shield)
            </p>
          </div>

          {/* 3. Auto-Renew Session Key */}
          <div className="border border-line sm:border-0 bg-base p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
                Auto-Renew
              </p>
              <KeyRound className="size-3.5 text-subtle" />
            </div>
            <p className="mt-1.5 font-mono text-xl font-bold tabular-nums text-ink">
              {sessionKey ? "Active" : "Off"}
            </p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
              {sessionKey ? "Keeper renewals enabled" : "Manual monthly renewals"}
            </p>
          </div>
        </div>

        {/* Shield / Unshield Operations */}
        <div className="border border-line/60 bg-cream/40 p-3.5 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink font-semibold">
              Shield or Withdraw STRK
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[10px] text-muted mr-1">Quick:</span>
              {[10, 25, 50, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String(val))}
                  className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                    amount === String(val)
                      ? "border-accent bg-accent text-cream font-bold"
                      : "border-line bg-raised hover:bg-cream text-ink"
                  }`}
                >
                  +{val}
                </button>
              ))}
              {publicStrk > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.floor(publicStrk)))}
                  className="border border-line bg-raised hover:bg-cream px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent font-bold transition-colors"
                >
                  Max
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <Input
                  id="shield-amt"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-10 pr-14 font-mono font-bold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted pointer-events-none">
                  STRK
                </span>
              </div>
              <span className="font-mono text-xs tabular-nums text-muted shrink-0 min-w-[3.5rem] text-right">
                {Number(amount) > 0 ? `~${formatStrkUsd(Number(amount))}` : "$0.00"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => void run("shield")}
                disabled={!!busy}
                className="flex-1 sm:flex-none border-accent text-accent hover:bg-accent hover:text-cream transition-colors h-10"
              >
                <ArrowDownRight className="size-3.5 mr-1" />
                {busy === "shield" ? "Shielding…" : "Shield STRK"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => void run("unshield")}
                disabled={!!busy}
                className="flex-1 sm:flex-none h-10 hover:bg-cream"
              >
                <ArrowUpRight className="size-3.5 mr-1" />
                {busy === "unshield" ? "Withdrawing…" : "Withdraw"}
              </Button>
            </div>
          </div>

          {/* Session Key Delegation */}
          <div className="mt-3 flex items-center justify-between border-t border-line/40 pt-2.5 text-xs">
            <span className="font-mono text-[10px] uppercase tracking-wider text-subtle">
              Keeper Session Key Delegation
            </span>
            {sessionKey ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  revokeSessionKey();
                  toast("Auto-renew session key revoked.");
                }}
                className="h-7 text-[11px] text-accent hover:bg-accent-muted"
              >
                Disable Auto-Renew
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  grantSessionKey();
                  toast.success("Auto-renew session key enabled for keeper.");
                }}
                className="h-7 text-[11px]"
              >
                Enable Auto-Renew
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function wait(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}
