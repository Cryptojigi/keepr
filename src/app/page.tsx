"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
    <section className="relative min-h-[90dvh] overflow-hidden border-b border-line flex items-center">
      {/* Background image — fades into site via gradient overlay */}
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/another.png"
          alt=""
          fill
          priority
          quality={85}
          sizes="100vw"
          className="object-cover object-right"
          style={{ objectPosition: "70% center" }}
        />
        {/* Fade: only bottom edge blends into next section */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, transparent 70%, var(--color-base) 100%)",
          }}
        />
        {/* Fade: narrow left strip only — keeps text legible without killing image */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, var(--color-base) 0%, rgba(190,185,179,0.5) 22%, transparent 50%)",
          }}
        />
        {/* Mobile overlay — light tint only, image stays bold */}
        <div
          className="absolute inset-0 sm:hidden"
          style={{ background: "rgba(190,185,179,0.25)" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-20 md:py-28">
        <Kicker>Protocol · {NETWORK_LABEL}</Kicker>
        <div className="mt-6 flex items-start gap-4">
          <KeeprMark size={40} className="mt-2 hidden sm:block shrink-0" />
          <h1 className="font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight text-ink sm:text-7xl md:text-8xl lg:text-9xl">
            Keepr
          </h1>
        </div>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-ink sm:text-xl">
          Private subscriptions for agents and creators. Paid from shielded
          notes. Renewed by a keeper. Proven without a wallet scan.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg">
            <Link href="/subscribe">
              Open a channel
              <ArrowRight />
            </Link>
          </Button>
          <a
            href="#loop"
            className="inline-flex h-12 items-center font-mono text-xs uppercase tracking-[0.16em] text-muted hover:text-ink transition-colors"
          >
            They do parts
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
        <Kicker>How it runs</Kicker>
        <h2 className="mt-3 max-w-xl text-3xl md:text-4xl">
          Shield. Subscribe. The keeper does the rest.
        </h2>
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          <TerminalBlock
            title="Shield"
            lines={[
              "$ keepr shield --amount 100 STRK",
              "> depositing to pool 0x0403…812a",
              "> open note 0x9c1e… committed",
              "> public   400 → 300",
              "> shielded  30 → 130",
              "ok",
            ]}
          />
          <TerminalBlock
            title="Subscribe"
            lines={[
              "$ keepr subscribe --to forge.api --tier quota",
              "> op      Subscribe",
              "> sub_id  h(addr, salt)",
              "> deposit 150 STRK → creator note",
              "> session authorized",
              "0x7a1c… confirmed",
            ]}
          />
          <TerminalBlock
            title="Renew"
            lines={[
              "$ keeper tick --interval 60s",
              "> due     3 channels",
              "> skip    1  (note dry)",
              "> renew   2  via session key",
              "> gas     0  (avnu paymaster)",
              "logged",
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
      k: "Payer",
      t: "The world cannot see who subscribed, or how much left the note.",
    },
    {
      k: "Creator",
      t: "You set the rate. MRR sits behind a viewing key. Competitors cannot scrape the book.",
    },
    {
      k: "Access",
      t: "Gates check a proof, not a wallet. Membership without a dox.",
    },
  ];
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <Kicker>Why private</Kicker>
        <h2 className="mt-3 max-w-lg text-3xl md:text-4xl">
          Recurring money, without a public subscriber list.
        </h2>
        <div className="mt-10 grid gap-px bg-line md:grid-cols-3">
          {cols.map((c) => (
            <article key={c.k} className="bg-base px-5 py-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
                {c.k}
              </p>
              <p className="mt-4 text-base leading-relaxed text-ink">{c.t}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Loop() {
  return (
    <section id="loop" className="scroll-mt-16 border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <Kicker>The loop</Kicker>
        <h2 className="mt-3 max-w-2xl text-3xl md:text-4xl">
          They do parts. Nobody runs the whole loop.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink">
          Private pay without renewal. Recurring billing without privacy.
          Keepr is the shielded note, the keeper, the viewing-key receipt, and
          the STARK gate — in one protocol.
        </p>
        <div className="mt-10 -mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
          <div className="shadow-[var(--shadow-border)] min-w-0">
          <table className="w-full min-w-[28rem] border-collapse text-left">
            <thead>
              <tr className="bg-raised">
                {["Capability", "Private pay", "Typical sub", "Keepr"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {LOOP_ROWS.map((row) => (
                <tr key={row.cap} className="border-t border-line bg-base">
                  <td className="px-4 py-3 text-sm text-ink">{row.cap}</td>
                  <Cell v={row.pay} />
                  <Cell v={row.sub} />
                  <Cell v={row.keepr} accent />
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

function Cell({ v, accent }: { v: string; accent?: boolean }) {
  return (
    <td
      className={`px-4 py-3 font-mono text-xs uppercase tracking-[0.12em] ${
        accent && v === "Yes"
          ? "text-accent"
          : v === "No"
            ? "text-subtle"
            : "text-ink"
      }`}
    >
      {v}
    </td>
  );
}

function Rates() {
  const book = useKeepr((s) => s.creatorRates);
  const { formatStrkUsd } = useStrkPrice();

  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Kicker>Rates</Kicker>
            <h2 className="mt-3 max-w-xl text-3xl md:text-4xl">
              You set the rate.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink">
              Each creator posts their own book. The helper charges that amount
              exactly — never more.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/creator">Set your book</Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CREATORS.map((c) => {
            const rates = ratesForCreator(c.id, book ?? CREATOR_RATES);
            return (
              <article
                key={c.id}
                className="bg-raised p-5 shadow-[var(--shadow-border)]"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
                  {c.category}
                </p>
                <h3 className="mt-2 font-display text-xl font-bold uppercase tracking-tight">
                  {c.name}
                </h3>
                <p className="mt-1 font-mono text-[11px] text-subtle">{c.handle}</p>
                <ul className="mt-4 border-t border-line">
                  {rates.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-baseline justify-between gap-3 border-b border-line py-2.5"
                    >
                      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold">
                        {r.name}
                      </span>
                      <span className="text-right">
                        <span className="font-mono text-sm tabular-nums text-ink">
                          {formatStrk(r.strk)} STRK
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] text-subtle">
                          ~{formatStrkUsd(r.strk)} USD
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Keeper({
  ticks,
}: {
  ticks: ReturnType<typeof keeperFeed>;
}) {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Kicker>Keeper</Kicker>
            <h2 className="mt-3 text-3xl md:text-4xl">Every decision is logged.</h2>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">
            Tick 60s · max 1000 STRK · dry-run off
          </p>
        </div>
        <ol className="mt-8 divide-y divide-line bg-ink text-cream shadow-[var(--shadow-border)]">
          {ticks.map((t) => (
            <li
              key={`${t.subId}-${t.at}`}
              className="grid grid-cols-[4rem_1fr] gap-x-3 gap-y-0 px-4 py-3 font-mono text-[10px] sm:grid-cols-[5.5rem_5rem_8rem_1fr] sm:text-xs"
            >
              <span className="tabular-nums text-cream/75">
                {formatStamp(t.at)}
              </span>
              <span className="truncate text-cream">{t.detail}</span>
              <span className="hidden sm:block col-span-0">
                <span
                  className={
                    t.status === "hold" ? "text-amber" : "uppercase text-cream"
                  }
                >
                  {t.action}
                </span>
              </span>
              <span className="hidden truncate text-cream/80 sm:block">
                {t.subId}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Close() {
  return (
    <section className="keepr-footer bg-ink text-cream">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <Kicker>Start</Kicker>
        <h2 className="mt-3 max-w-xl text-3xl text-cream md:text-5xl">
          Open a channel. The keeper keeps it.
        </h2>
        <div className="mt-8">
          <Button asChild size="lg" variant="cream">
            <Link href="/subscribe">
              Subscribe
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
