"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, RefreshCw, KeyRound } from "lucide-react";
import { HeroCanvas } from "@/components/hero-canvas";
import { Kicker } from "@/components/kicker";
import { KeeprMark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { NETWORK_LABEL } from "@/lib/keepr/constants";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <main className="w-full max-w-[100vw] overflow-x-hidden">
      <Hero />
      <Privacy />
      <Protocol />
      <SiteFooter />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-base flex flex-col justify-center min-h-[56dvh] sm:min-h-[62dvh] py-12 sm:py-16 md:py-20">
      {/* Animated canvas background */}
      <div className="pointer-events-none absolute inset-0">
        <HeroCanvas />
        {/* Full-width dark vignette so text is crisp across the entire width */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(12, 4, 5, 0.48) 0%, rgba(12, 4, 5, 0.78) 100%)",
          }}
        />
        {/* Bottom subtle blend into page base */}
        <div
          className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, var(--color-base) 100%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5">
        {/* Kicker with dash */}
        <div className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] text-amber">
          <span className="inline-block w-6 h-[2px] bg-amber shrink-0" aria-hidden="true" />
          <span>KEEPR PROTOCOL · STARKNET MAINNET · STRK20</span>
        </div>

        {/* Main Title */}
        <h1 className="mt-4 max-w-4xl font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold uppercase leading-[1.02] tracking-tight text-cream">
          <span className="block">Shielded Payments</span>
          <span className="block text-cream/95">& Subscriptions</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 max-w-2xl text-base sm:text-lg font-prose leading-relaxed text-cream/85">
          Decentralized recurring payments on Starknet. Shield your STRK tokens into the privacy pool, subscribe to creators and AI agents, and let automated keepers execute renewals with zero identity exposure.
        </p>

        {/* Action Buttons Row */}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="border-accent bg-accent text-cream hover:bg-accent-hover font-mono text-xs uppercase tracking-[0.14em]">
            <Link href="/subscribe">
              Explore Channels
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-cream/30 bg-cream/10 text-cream hover:bg-cream/20 font-mono text-xs uppercase tracking-[0.14em]">
            <a href="#privacy">
              How It Works
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-cream/30 bg-cream/10 text-cream hover:bg-cream/20 font-mono text-xs uppercase tracking-[0.14em]">
            <Link href="/docs">
              Protocol Docs
            </Link>
          </Button>
        </div>

        {/* 4-Pillar Technical Grid */}
        <div className="mt-12 pt-10 border-t border-cream/20 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-cream">
              Zero Exposure
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/70">
              Shielded STRK20 Notes
            </p>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-cream">
              24/7 Keepers
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/70">
              Autonomous Renewal Engine
            </p>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-cream">
              Prove Access
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/70">
              Cryptographic Tier Passes
            </p>
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-cream">
              Mainnet Live
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/70">
              Verified Helper Contract
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Privacy() {
  const guarantees = [
    {
      icon: ShieldCheck,
      title: "Pay privately",
      body: "Subscriptions are paid from shielded STRK20 notes, not a public wallet trail.",
    },
    {
      icon: KeyRound,
      title: "Prove access",
      body: "Services verify your membership without scanning your address or transaction history.",
    },
    {
      icon: RefreshCw,
      title: "Stay in control",
      body: "Keepers handle renewal mechanics; your cancellation authority stays with you.",
    },
  ];

  return (
    <section id="privacy" className="border-b border-line bg-base scroll-mt-14">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-end md:gap-16">
          <div>
            <Kicker>Private by default</Kicker>
            <h2 className="mt-3 max-w-lg font-display text-4xl font-bold uppercase leading-[0.92] tracking-tight text-ink md:text-5xl">
              Pay for access, not exposure.
            </h2>
          </div>
          <p className="max-w-xl font-prose text-lg leading-relaxed text-muted">
            Keepr replaces public wallet checks with private notes and cryptographic proofs. A channel can confirm access without learning who you are.
          </p>
        </div>

        <div className="mt-12 grid border border-line md:grid-cols-3">
          {guarantees.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="relative min-h-64 border-b border-line bg-raised p-6 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-3 hover:border-accent hover:bg-cream hover:shadow-[0_14px_0_var(--color-accent-dark),0_20px_28px_rgba(28,15,15,0.22)] last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
            >
              <Icon className="mt-3 h-7 w-7 text-accent" strokeWidth={1.5} aria-hidden />
              <h3 className="mt-5 font-display text-2xl font-bold uppercase tracking-tight text-ink">{title}</h3>
              <p className="mt-3 max-w-xs font-prose leading-relaxed text-muted">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Protocol() {
  const steps = [
    ["01", "Choose", "Pick a creator, AI agent, or private service."],
    ["02", "Subscribe", "Approve a shielded STRK payment and keep your identity out of the flow."],
    ["03", "Access", "Use your membership proof. Keepr handles the recurring mechanics."],
  ];

  return (
    <section className="border-b border-accent-dark bg-accent text-cream">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <Kicker className="text-amber">Three moves</Kicker>
            <h2 className="mt-3 font-display text-4xl font-bold uppercase leading-[0.92] tracking-tight md:text-5xl">
              Private access, without the ceremony.
            </h2>
          </div>
          <Button asChild size="lg" className="border-cream bg-cream text-ink hover:bg-raised">
            <Link href="/subscribe">
              Find a channel
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <ol className="mt-12 grid gap-px overflow-hidden border border-cream/35 bg-cream/35 md:grid-cols-3">
          {steps.map(([, title, body]) => (
            <li key={title} className="bg-accent p-6 sm:p-8">
              <h3 className="font-display text-3xl font-bold uppercase tracking-tight text-cream">{title}</h3>
              <p className="mt-4 max-w-xs font-prose leading-relaxed text-cream/80">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}