"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { num } from "starknet";
import type { WALLET_API } from "@starknet-io/types-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NETWORK_LABEL, STRK_TOKEN } from "@/lib/keepr/constants";
import { isAccountDeployed } from "@/lib/keepr/onchain";
import { formatStrk, shortAddr } from "@/lib/keepr/format";
import { useKeepr } from "@/lib/keepr/store";
import { useStrkPrice } from "@/lib/keepr/price";
import { useStoreWallet } from "@/app/components/Wallet/walletContext";

export function VaultStrip() {
  const connected = useKeepr((s) => s.connected);
  const address = useKeepr((s) => s.address);
  const publicStrk = useKeepr((s) => s.publicStrk);
  const shieldedStrk = useKeepr((s) => s.shieldedStrk);
  const sessionKey = useKeepr((s) => s.sessionKey);
  const shield = useKeepr((s) => s.shield);
  const unshield = useKeepr((s) => s.unshield);
  const grantSessionKey = useKeepr((s) => s.grantSessionKey);
  const revokeSessionKey = useKeepr((s) => s.revokeSessionKey);
  const busy = useKeepr((s) => s.busy);
  const setBusy = useKeepr((s) => s.setBusy);
  const [amount, setAmount] = useState("10");
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
      toast("Enter a positive STRK amount.");
      return;
    }
    setBusy(kind);
    try {
      if (isWalletConnected && myWalletAccount) {
        toast(`Initiating on-chain ${kind} via STRK20 Privacy Pool…`);
        const account = connectedAddress ?? myWalletAccount.address;
        const deployed = await isAccountDeployed(account);
        if (!deployed) {
          toast.error(
            "Your Starknet wallet isn't deployed/activated yet. Activate it first (Ready: send it a small STRK top-up or use activation in the wallet), then retry.",
          );
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
              "";
        toast.success(
          `${kind === "shield" ? "Shielded" : "Unshielded"} ${n} STRK on-chain! Tx: ${txHash ? `${txHash.slice(0, 12)}…` : "Submitted"}`,
        );
      } else {
        await wait(600);
        const hash = kind === "shield" ? shield(n) : unshield(n);
        toast(
          `${kind === "shield" ? "Shielded" : "Unshielded"} ${n} STRK (demo) · ${hash.slice(0, 10)}…`,
        );
      }
    } catch (e: any) {
      console.error(`${kind} error:`, e);
      const msg = e?.message || String(e);
      if (msg.includes("NOT_REGISTERED")) {
        toast.error(
          "STRK20 registration required: your wallet hasn't registered with the privacy pool yet. Open your Ready wallet and perform one 'Shield' from the wallet itself (it registers automatically), then retry here.",
        );
      } else {
        toast.error(msg || `${kind} transaction rejected or failed.`);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="bg-raised shadow-[var(--shadow-border)]">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker">Vault</p>
            <p className="mt-1 font-mono text-xs text-muted">
              {shortAddr(address, 8, 6)} · {NETWORK_LABEL}
            </p>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
            Session key {sessionKey ? "granted" : "idle"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          <Stat label="Public" value={`${formatStrk(publicStrk)} STRK`} sub={`~${formatStrkUsd(publicStrk)}`} />
          <Stat label="Shielded" value={`${formatStrk(shieldedStrk)} STRK`} sub={`~${formatStrkUsd(shieldedStrk)}`} accent />
          <Stat label="Session" value={sessionKey ? "Live" : "Off"} />
          <Stat label="Pool" value="STRK20" />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="shield-amt">
              Amount in STRK
            </label>
            <Input
              id="shield-amt"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="sm:max-w-28"
            />
            <span className="font-mono text-xs tabular-nums text-muted shrink-0 min-w-[3.5rem]">
              {Number(amount) > 0 ? `~${formatStrkUsd(Number(amount))}` : "$0.00"}
            </span>
          </div>
          <Button
            variant="outline"
            onClick={() => void run("shield")}
            disabled={!!busy}
          >
            {busy === "shield" ? "Shielding" : "Shield"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => void run("unshield")}
            disabled={!!busy}
          >
            {busy === "unshield" ? "Unshielding" : "Unshield"}
          </Button>
          <div className="sm:ml-auto">
            {sessionKey ? (
              <Button variant="ghost" onClick={() => revokeSessionKey()}>
                Revoke keeper
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  grantSessionKey();
                  toast("Session key granted. Keeper may renew.");
                }}
              >
                Grant session key
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-raised px-3 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-sm tabular-nums ${accent ? "text-accent" : "text-ink"}`}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}
