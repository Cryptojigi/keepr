"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useStoreWallet } from "@/app/components/Wallet/walletContext";
import { HashGrid } from "@/components/hash-grid";
import { Kicker } from "@/components/kicker";
import { Button } from "@/components/ui/button";
import { CREATORS, creatorById, rateById } from "@/lib/keepr/data";
import { formatDate } from "@/lib/keepr/format";
import { getSubscriptionOnchain, isActiveOnchain } from "@/lib/keepr/onchain";
import { useKeepr } from "@/lib/keepr/store";

type Phase = "idle" | "signing" | "checking" | "valid" | "none";

interface VerifiedPass {
  creatorId: string;
  tier: number;
  expiryMs: number;
  subId: string;
  txHash: string;
  isOnchain: boolean;
}

export default function VerifyPage() {
  const connected = useKeepr((s) => s.connected);
  const creatorRates = useKeepr((s) => s.creatorRates);
  const address = useKeepr((s) => s.address);
  const subs = useKeepr((s) => s.subs);

  // Ready wallet state
  const isWalletConnected = useStoreWallet((s) => s.isConnected);
  const walletAddress = useStoreWallet((s) => s.address);

  const [phase, setPhase] = useState<Phase>("idle");
  const [picked, setPicked] = useState("cipher");
  const [result, setResult] = useState<VerifiedPass | null>(null);

  const challenge = `keepr:gate:${picked}:verify`;
  const creator = creatorById(picked);

  const effectiveAddress = walletAddress || address;
  const isLive = isWalletConnected || connected;

  async function run() {
    let current = useKeepr.getState();
    if (!current.hasHydrated) {
      await wait(250);
      current = useKeepr.getState();
    }
    if (!isLive) {
      toast("Open the vault or connect your wallet first.");
      return;
    }
    setPhase("signing");
    setResult(null);
    await wait(400);
    setPhase("checking");

    try {
      const localSub = subs.find((s) => s.creatorId === picked && s.active);
      const targetSubId = localSub?.id;

      // 1. If Ready wallet is connected, verify on-chain
      if (isWalletConnected) {
        if (targetSubId) {
          const onchainActive = await isActiveOnchain(targetSubId);
          if (onchainActive) {
            const onchainRecord = await getSubscriptionOnchain(targetSubId);
            if (onchainRecord && onchainRecord.active) {
              const expiryMs = (onchainRecord.lastRenewed + onchainRecord.period) * 1000;
              setResult({
                creatorId: picked,
                tier: onchainRecord.tier,
                expiryMs,
                subId: targetSubId,
                txHash: localSub?.txHash || targetSubId,
                isOnchain: true,
              });
              setPhase("valid");
              return;
            }
          }
        }
        setPhase("none");
        return;
      }

      // 2. Demo mode fallback
      if (connected && localSub) {
        setResult({
          creatorId: picked,
          tier: localSub.tier,
          expiryMs: localSub.nextRenewalAt,
          subId: localSub.id,
          txHash: localSub.txHash,
          isOnchain: false,
        });
        setPhase("valid");
        return;
      }

      setPhase("none");
    } catch (err) {
      console.error("Verification check failed:", err);
      setPhase("none");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:py-14">
      <Kicker>Gate</Kicker>
      <h1 className="mt-3 text-4xl md:text-5xl">Prove the pass. Hide the payer.</h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-ink">
        A gate (Telegram, API, Discord) learns that a tier is live. It never
        learns the wallet. Sign a challenge in-browser; the helper answers
        with creator, tier, expiry.
      </p>

      <section className="mt-10 bg-raised p-5 shadow-[var(--shadow-border)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
          Channel to gate
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CREATORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setPicked(c.id);
                setPhase("idle");
              }}
              className={`h-11 px-3 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
                c.id === picked
                  ? "bg-accent text-cream"
                  : "bg-transparent text-muted shadow-[var(--shadow-border)] hover:bg-accent-muted"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="mt-6 bg-ink px-4 py-4 font-mono text-[11px] leading-6 text-cream/85">
          <p className="text-cream/75">challenge</p>
          <p className="break-all">{challenge}</p>
          <p className="mt-3 text-cream/75">wallet</p>
          <p>
            {isLive && effectiveAddress
              ? `${effectiveAddress.slice(0, 10)}… (stays in browser)`
              : "not connected"}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => void run()}
            disabled={phase === "signing" || phase === "checking"}
          >
            {phase === "signing"
              ? "Signing"
              : phase === "checking"
                ? "Checking helper"
                : "Sign & verify"}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/subscribe">Need a channel?</Link>
          </Button>
        </div>
      </section>

      {phase === "valid" && result ? (
        <ResultValid
          creatorName={creator?.name ?? picked}
          handle={creator?.handle ?? ""}
          tierName={rateById(result.creatorId, result.tier, creatorRates).name}
          expiry={result.expiryMs}
          seed={result.txHash}
          isOnchain={result.isOnchain}
        />
      ) : null}

      {phase === "none" ? (
        <section className="mt-6 bg-cream px-5 py-6 shadow-[var(--shadow-border)]">
          <p className="kicker">No pass</p>
          <h2 className="mt-2 text-2xl">Helper found no active record.</h2>
          <p className="mt-2 text-sm text-ink">
            Subscribe to {creator?.name ?? "this channel"} first. The verifier
            still does not see your address.
          </p>
        </section>
      ) : null}

      <section className="mt-10">
        <Kicker>What the gate learns</Kicker>
        <ul className="mt-4 divide-y divide-line">
          {[
            ["Creator", "Yes"],
            ["Tier", "Yes"],
            ["Expiry", "Yes"],
            ["Payer address", "Never"],
            ["Amount paid", "Never"],
            ["Viewing key", "Never"],
          ].map(([k, v]) => (
            <li
              key={k}
              className="flex items-center justify-between py-3 font-mono text-xs"
            >
              <span className="uppercase tracking-[0.14em] text-muted">{k}</span>
              <span className={v === "Never" ? "text-accent" : "text-ink"}>
                {v}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function ResultValid({
  creatorName,
  handle,
  tierName,
  expiry,
  seed,
  isOnchain,
}: {
  creatorName: string;
  handle: string;
  tierName: string;
  expiry: number;
  seed: string;
  isOnchain?: boolean;
}) {
  return (
    <section className="mt-6 bg-cream p-5 shadow-[var(--shadow-border)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="kicker">Valid</p>
            {isOnchain ? (
              <span className="rounded bg-ok/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ok">
                On-Chain Verified
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 text-2xl">{creatorName}</h2>
          <p className="mt-1 font-mono text-xs text-muted">{handle}</p>
        </div>
        <span className="stamp">Pass</span>
      </div>
      <div className="mt-5 flex items-end gap-4">
        <HashGrid seed={seed} className="h-14 w-14" />
        <dl className="grid flex-1 grid-cols-2 gap-3 font-mono text-xs">
          <div>
            <dt className="uppercase tracking-[0.14em] text-gold">{tierName}</dt>
            <dd className="mt-1">tier disclosed</dd>
          </div>
          <div>
            <dt className="uppercase tracking-[0.14em] text-subtle">Until</dt>
            <dd className="mt-1 tabular-nums">{formatDate(expiry)}</dd>
          </div>
        </dl>
      </div>
      <p className="mt-5 font-mono text-[11px] leading-relaxed text-ok">
        Gate may grant the role. Payer identity never left the browser.
      </p>
    </section>
  );
}

function wait(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}
