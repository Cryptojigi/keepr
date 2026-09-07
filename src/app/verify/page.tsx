"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Code2 } from "lucide-react";
import { useStoreWallet } from "@/app/components/Wallet/walletContext";
import { HashGrid } from "@/components/hash-grid";
import { Kicker } from "@/components/kicker";
import { Button } from "@/components/ui/button";
import { CREATORS, creatorById, rateById } from "@/lib/keepr/data";
import { formatDate } from "@/lib/keepr/format";
import { getSubscriptionOnchain, isActiveOnchain } from "@/lib/keepr/onchain";
import { useKeepr } from "@/lib/keepr/store";
import { cn } from "@/lib/utils";

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
  const customCreators = useKeepr((s) => s.customCreators);

  // Ready wallet state
  const isWalletConnected = useStoreWallet((s) => s.isConnected);
  const walletAddress = useStoreWallet((s) => s.address);

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<VerifiedPass | null>(null);
  const [showDemoGates, setShowDemoGates] = useState(false);

  // Active user subscriptions
  const activeSubs = useMemo(() => subs.filter((s) => s.active), [subs]);
  const subscribedChannels = useMemo(() => {
    return activeSubs.map((s) => {
      const found =
        customCreators.find((c) => c.id === s.creatorId) ?? creatorById(s.creatorId);
      return {
        id: s.creatorId,
        name: found?.name ?? s.creatorId,
        tier: s.tier,
        subId: s.id,
      };
    });
  }, [activeSubs, customCreators]);

  const [picked, setPicked] = useState<string>("cipher");

  // Default to user's first active subscription if available
  useEffect(() => {
    if (subscribedChannels.length > 0) {
      setPicked(subscribedChannels[0].id);
    }
  }, [subscribedChannels]);

  const challenge = `keepr:gate:${picked}:verify`;
  const creator = useMemo(() => {
    return customCreators.find((c) => c.id === picked) ?? creatorById(picked);
  }, [picked, customCreators]);

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
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle font-bold">
            Channel to gate
          </p>
          {subscribedChannels.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDemoGates((v) => !v)}
              className="font-mono text-[10px] uppercase text-muted hover:text-accent underline transition-colors"
            >
              {showDemoGates ? "Hide Demo Channels" : "Test with Demo Channels"}
            </button>
          )}
        </div>

        {/* 1. If user holds active passes, show them first */}
        {subscribedChannels.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-accent font-semibold flex items-center gap-1.5">
              <span className="led led-ok" aria-hidden />
              <span>Your Active Memberships</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {subscribedChannels.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setPicked(c.id);
                    setPhase("idle");
                    setResult(null);
                  }}
                  className={`h-11 px-3.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors flex items-center gap-2 border ${
                    c.id === picked
                      ? "bg-accent text-cream border-accent font-bold shadow-[var(--shadow-border)]"
                      : "bg-cream text-ink border-line hover:bg-accent-muted"
                  }`}
                >
                  <span className="size-2 rounded-full bg-ok" />
                  <span>{c.name}</span>
                  <span className="text-[9px] font-normal opacity-75">
                    (Tier {c.tier})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. Demo Reference Channels */}
        {(subscribedChannels.length === 0 || showDemoGates) && (
          <div className={`space-y-2 ${subscribedChannels.length > 0 ? "mt-4 pt-3 border-t border-line/60" : "mt-3"}`}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-subtle font-semibold">
                {subscribedChannels.length > 0 ? "Simulation / Reference Channels" : "Reference Channels (Demo Simulation)"}
              </p>
              <span className="font-mono text-[9px] uppercase border border-line px-1.5 py-0.5 bg-cream text-muted font-semibold">
                Demo
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CREATORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setPicked(c.id);
                    setPhase("idle");
                    setResult(null);
                  }}
                  className={`h-11 px-3 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors border ${
                    c.id === picked
                      ? "bg-accent text-cream border-accent font-bold"
                      : "bg-transparent text-muted border-line/60 shadow-[var(--shadow-border)] hover:bg-accent-muted"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {subscribedChannels.length === 0 && (
              <p className="font-mono text-[10px] text-muted pt-1">
                No active subscriptions found in this wallet. You can simulate the gate flow with reference channels above, or <Link href="/subscribe" className="text-accent underline font-semibold">subscribe to a channel</Link>.
              </p>
            )}
          </div>
        )}

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

      <section className="mt-12 border border-line bg-raised p-5 shadow-[var(--shadow-border)]">
        <div className="flex items-center justify-between">
          <Kicker>Developer SDK & Bot Integration</Kicker>
          <span className="font-mono text-[9px] uppercase border border-line px-2 py-0.5 bg-cream text-accent font-semibold">
            Zero-Knowledge Gating
          </span>
        </div>
        <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-ink">
          Gate Telegram, Discord, or APIs.
        </h2>
        <p className="mt-1 text-xs text-muted leading-relaxed font-sans max-w-xl">
          Integrate Keepr verification into your Telegram bot, Discord role-assigner, or backend middleware. Verify whether any subscriber pseudonym (<code className="font-mono text-accent">sub_id</code>) has an active on-chain subscription on Starknet in under 5 lines of code.
        </p>
        <DeveloperIntegrationSection />
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

function DeveloperIntegrationSection() {
  const [lang, setLang] = useState<"ts" | "python" | "curl">("ts");
  const [copied, setCopied] = useState(false);

  const snippets = {
    ts: `import { RpcProvider } from "starknet";

// Keepr Subscription Helper on Starknet Mainnet
const HELPER_ADDRESS = "0x02f23246ebf4585121b6d05f96fc102f1d5ba596d66e5d8ff8e3eecb2fb37fa1";
const provider = new RpcProvider({ 
  nodeUrl: "https://starknet-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY" 
});

/**
 * Verifies if a user's pseudonymous sub_id has an active subscription.
 * Works for Telegram bots, Discord bots, or API middlewares with ZERO database knowledge.
 */
export async function isSubscriptionActive(subId: string): Promise<boolean> {
  const res = await provider.callContract({
    contractAddress: HELPER_ADDRESS,
    entrypoint: "is_active",
    calldata: [subId],
  });
  return res.result[0] === "0x1";
}`,
    python: `import asyncio
from starknet_py.net.full_node_client import FullNodeClient

# Keepr Subscription Helper on Starknet Mainnet
HELPER_ADDRESS = 0x02f23246ebf4585121b6d05f96fc102f1d5ba596d66e5d8ff8e3eecb2fb37fa1
client = FullNodeClient(node_url="https://starknet-mainnet.g.alchemy.com/v2/YOUR_KEY")

async def is_subscription_active(sub_id_hex: str) -> bool:
    """
    Verifies subscription state for a Telegram user or Discord member.
    Zero KYC, zero database, pure Starknet state verification.
    """
    sub_id_int = int(sub_id_hex, 16)
    result = await client.call_contract(
        contract_address=HELPER_ADDRESS,
        selector="is_active",
        calldata=[sub_id_int]
    )
    return result[0] == 1

# asyncio.run(is_subscription_active("0x123..."))`,
    curl: `curl -X POST https://starknet-mainnet.g.alchemy.com/v2/YOUR_KEY \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "starknet_call",
    "params": [{
      "contract_address": "0x02f23246ebf4585121b6d05f96fc102f1d5ba596d66e5d8ff8e3eecb2fb37fa1",
      "entry_point_selector": "0x02a2818a7a8d56fa7ea777174dbff6361a861614f1076b92fbc892ea01eb65ad",
      "calldata": ["0xYOUR_SUB_ID_HEX"]
    }, "latest"],
    "id": 1
  }'`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[lang]);
    setCopied(true);
    toast.success(`Copied ${lang.toUpperCase()} snippet to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-1.5">
          {(["ts", "python", "curl"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setLang(t)}
              className={cn(
                "px-3 py-1 font-mono text-xs uppercase tracking-wider transition-colors border",
                lang === t
                  ? "bg-accent text-cream border-accent font-semibold"
                  : "bg-base text-muted border-line hover:text-ink"
              )}
            >
              {t === "ts" ? "Node.js / TS" : t === "python" ? "Python" : "cURL / RPC"}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-8 px-3 font-mono text-xs"
        >
          {copied ? <Check className="mr-1.5 size-3.5 text-accent" /> : <Copy className="mr-1.5 size-3.5" />}
          {copied ? "Copied" : "Copy Snippet"}
        </Button>
      </div>

      <pre className="overflow-x-auto bg-ink p-4 font-mono text-xs text-cream/90 leading-relaxed border border-line shadow-inner">
        <code>{snippets[lang]}</code>
      </pre>
    </div>
  );
}
