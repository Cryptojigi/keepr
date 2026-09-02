"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, RefreshCw, KeyRound, Check } from "lucide-react";
import { HeroCanvas } from "@/components/hero-canvas";
import { Kicker } from "@/components/kicker";
import { KeeprMark } from "@/components/mark";
import { TerminalBlock } from "@/components/terminal-block";
import { Button } from "@/components/ui/button";
import { NETWORK_LABEL } from "@/lib/keepr/constants";
import {
  CREATORS,
  CREATOR_RATES,
  keeperFeed,
  LOOP_ROWS,
  ratesForCreator,
  usdFromStrk,
} from "@/lib/keepr/data";
import { formatStamp, formatStrk } from "@/lib/keepr/format";
import { useKeepr } from "@/lib/keepr/store";
import { useStrkPrice } from "@/lib/keepr/price";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  const ticks = keeperFeed();

  return (
    <main className="w-full max-w-[100vw] overflow-x-hidden">
      <Hero />
      <How />
      <Why />
      <Loop />
      <Rates />
      <Keeper ticks={ticks} />
      <Close />
      <SiteFooter />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line flex items-center min-h-[72dvh] sm:min-h-[80dvh] md:min-h-[78dvh]">
      {/* Animated canvas background */}
      <div className="pointer-events-none absolute inset-0">
        <HeroCanvas />
        {/* Bottom fade into page base */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 55%, var(--color-base) 100%)",
          }}
        />
        {/* Left text-protection fade */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(8,2,2,0.72) 0%, rgba(8,2,2,0.3) 40%, transparent 70%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-14 sm:py-20 md:py-24">
        <Kicker className="text-cream/70">Protocol · {NETWORK_LABEL}</Kicker>
        <div className="mt-6 flex items-start gap-4">
          <KeeprMark size={40} className="mt-2 hidden sm:block shrink-0" />
          <h1 className="font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight text-cream sm:text-7xl md:text-8xl lg:text-9xl">
            Keepr
          </h1>
        </div>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-cream/80 sm:text-xl font-prose">
          Private on-chain subscriptions on Starknet. Shield your STRK tokens, subscribe to creators and AI agents, and let automated keepers handle renewals without exposing your wallet address.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg">
            <Link href="/subscribe">
              Explore Channels
              <ArrowRight />
            </Link>
          </Button>
          <a
            href="#loop"
            className="inline-flex h-12 items-center font-mono text-xs uppercase tracking-[0.16em] text-cream/60 hover:text-cream transition-colors"
          >
            How it compares
          </a>
        </div>
      </div>
    </section>
  );
}

function How() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <Kicker>Protocol Lifecycle</Kicker>
        <h2 className="mt-3 max-w-xl text-3xl md:text-4xl font-display font-bold uppercase tracking-tight text-ink">
          Shield. Subscribe. Keepers handle the rest.
        </h2>
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          <TerminalBlock
            title="1. Shield"
            lines={[
              "$ keepr shield --amount 100 STRK",
              "> depositing to STRK20 pool",
              "> anonymous note created",
              "> public balance updated",
              "> shielded balance ready",
              "status: ready",
            ]}
          />
          <TerminalBlock
            title="2. Subscribe"
            lines={[
              "$ keepr subscribe --to cipher.brief --tier desk",
              "> action: Subscribe",
              "> identity: poseidon(address, salt)",
              "> transfer: 15 STRK to creator note",
              "> session key authorized",
              "status: channel active",
            ]}
          />
          <TerminalBlock
            title="3. Auto-Renew"
            lines={[
              "$ keeper daemon --interval 60s",
              "> scanning active subscriptions",
              "> evaluating renewal window",
              "> renewing via delegated session key",
              "> gas: sponsored by paymaster",
              "status: renewed successfully",
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function Why() {
  const cols = [
    {
      k: "Subscribers",
      t: "Your wallet address never appears on public ledgers or creator subscriber lists. Payments are transferred from private shielded notes.",
    },
    {
      k: "Creators",
      t: "You set tier prices in STRK. Your revenue and subscriber metrics remain completely private to you through viewing keys.",
    },
    {
      k: "Gated Services",
      t: "Discord bots, Telegram gates, and APIs verify active tier access using zero-knowledge cryptographic proofs rather than public wallet scans.",
    },
  ];
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <Kicker>Privacy Guarantees</Kicker>
        <h2 className="mt-3 max-w-lg text-3xl md:text-4xl font-display font-bold uppercase tracking-tight text-ink">
          Recurring payments with zero identity exposure.
        </h2>
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {cols.map((c) => (
            <div
              key={c.k}
              className="border border-line bg-raised p-6 shadow-[var(--shadow-border)]"
            >
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent font-semibold">
                {c.k}
              </p>
              <p className="mt-3 text-base leading-relaxed text-ink font-prose">
                {c.t}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Loop() {
  return (
    <section id="loop" className="border-b border-line scroll-mt-14">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <Kicker>Feature Comparison</Kicker>
        <h2 className="mt-3 max-w-lg text-3xl md:text-4xl font-display font-bold uppercase tracking-tight text-ink">
          Why Keepr is built differently.
        </h2>
        <div className="mt-10 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <div className="min-w-[28rem]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-raised">
                <th className="p-4 font-mono text-xs uppercase tracking-[0.16em] text-muted">
                  Capability
                </th>
                <th className="p-4 font-mono text-xs uppercase tracking-[0.16em] text-muted">
                  Standard Web3
                </th>
                <th className="p-4 font-mono text-xs uppercase tracking-[0.16em] text-muted">
                  Traditional SaaS
                </th>
                <th className="p-4 font-mono text-xs uppercase tracking-[0.16em] text-accent font-bold">
                  Keepr on STRK20
                </th>
              </tr>
            </thead>
            <tbody>
              {LOOP_ROWS.map((r, i) => (
                <tr
                  key={r.cap}
                  className={`border-b border-line/60 ${
                    i % 2 === 0 ? "bg-base" : "bg-raised/40"
                  }`}
                >
                  <td className="p-4 font-mono text-xs text-ink font-medium">{r.cap}</td>
                  <td className="p-4 font-mono text-xs text-muted">{r.pay}</td>
                  <td className="p-4 font-mono text-xs text-muted">{r.sub}</td>
                  <td className="p-4 font-mono text-xs font-bold text-accent">
                    {r.keepr}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function Rates() {
  const { formatStrkUsd } = useStrkPrice();

  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <Kicker>Active Channels</Kicker>
        <h2 className="mt-3 max-w-lg text-3xl md:text-4xl font-display font-bold uppercase tracking-tight text-ink">
          Channels built on Keepr.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {CREATORS.map((c) => {
            const rates = ratesForCreator(c.id);
            return (
              <div
                key={c.id}
                className="flex flex-col justify-between border border-line bg-raised p-6 shadow-[var(--shadow-border)]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-[0.14em] text-accent font-semibold">
                      {c.category}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {c.subscribers} active subscribers
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-ink">
                    {c.name}
                  </h3>
                  <p className="mt-2 font-mono text-xs text-muted">@{c.handle}</p>
                  <p className="mt-4 text-base leading-relaxed text-ink font-prose">
                    {c.blurb}
                  </p>
                </div>

                <div className="mt-6 border-t border-line/60 pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-subtle mb-2">
                    Monthly Tiers
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {rates.map((r) => (
                      <div key={r.id} className="border border-line bg-base p-2.5 text-center">
                        <p className="font-mono text-[11px] font-bold text-ink uppercase">
                          {r.name}
                        </p>
                        <p className="font-mono text-xs font-semibold text-accent mt-0.5">
                          {r.strk} STRK
                        </p>
                        <p className="font-mono text-[9px] text-muted">
                          ~{formatStrkUsd(r.strk)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5">
                    <Button asChild className="w-full">
                      <Link href={`/subscribe?channel=${c.id}`}>
                        Subscribe to {c.name}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Keeper({ ticks }: { ticks: any[] }) {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <Kicker>Autonomous Automation</Kicker>
        <h2 className="mt-3 max-w-lg text-3xl md:text-4xl font-display font-bold uppercase tracking-tight text-ink">
          24/7 Keeper Activity.
        </h2>
        <p className="mt-3 max-w-xl text-base text-ink font-prose leading-relaxed">
          Keepers continuously scan active channels on Starknet Mainnet. When a subscription reaches its renewal window, the keeper executes the payment from the shielded note using the delegated session key.
        </p>

        <div className="mt-8 overflow-x-auto border border-line bg-raised shadow-[var(--shadow-border)]">
          <div className="border-b border-line bg-cream px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-ink font-semibold flex items-center justify-between">
            <span>Recent Keeper Operations</span>
            <span className="flex items-center gap-1.5 text-accent text-[11px]">
              <span className="led led-ok led-pulse" aria-hidden /> Live
            </span>
          </div>
          <ul className="divide-y divide-line/60">
            {ticks.map((t, i) => (
              <li key={i} className="flex flex-col gap-1 px-4 py-3 font-mono text-xs sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-accent uppercase font-bold shrink-0">{t.action}</span>
                  <span className="text-muted truncate max-w-[9rem] sm:max-w-none">{t.subId}</span>
                  <span className="text-ink">{t.detail}</span>
                </div>
                <span className="text-subtle text-[11px] shrink-0">
                  {formatStamp(t.at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Close() {
  return (
    <section className="bg-accent text-cream py-20 text-center">
      <div className="mx-auto max-w-3xl px-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-cream/75 font-semibold">
          Get Started
        </p>
        <h2 className="mt-4 font-display text-4xl font-bold uppercase tracking-tight text-cream md:text-5xl">
          Private subscriptions on Starknet.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-cream/90 font-prose leading-relaxed">
          Shield your STRK balance, choose your channel, and enjoy seamless recurring access without identity leaks.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="border-cream bg-cream text-ink hover:bg-cream/90 font-mono text-xs uppercase tracking-wider">
            <Link href="/subscribe">Open a Channel</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-cream/40 bg-transparent text-cream hover:bg-cream/10 font-mono text-xs uppercase tracking-wider">
            <Link href="/docs">Read Documentation</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
