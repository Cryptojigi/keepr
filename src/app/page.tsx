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
    <section className="relative overflow-hidden border-b border-line flex items-center min-h-[48dvh] sm:min-h-[54dvh] md:min-h-[52dvh]">
      {/* Animated canvas background */}
      <div className="pointer-events-none absolute inset-0">
        <HeroCanvas />
        {/* Bottom fade into page base */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 45%, rgba(190, 185, 179, 0.35) 75%, var(--color-base) 100%)",
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
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-9 sm:py-12 md:py-14">
        <Kicker className="text-cream/70">Protocol · {NETWORK_LABEL}</Kicker>
        <div className="mt-4 flex items-start gap-3 sm:gap-4">
          <KeeprMark size={36} className="mt-1.5 hidden sm:block shrink-0" />
          <h1 className="font-display text-5xl font-bold uppercase leading-[0.92] tracking-tight text-cream sm:text-6xl md:text-7xl lg:text-8xl">
            Keepr
          </h1>
        </div>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-cream/80 sm:text-lg font-prose">
          Private on-chain subscriptions on Starknet. Shield your STRK tokens, subscribe to creators and AI agents, and let automated keepers handle renewals without exposing your wallet address.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg">
            <Link href="/subscribe">
              Explore Channels
              <ArrowRight />
            </Link>
          </Button>
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