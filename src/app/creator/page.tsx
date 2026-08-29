"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Kicker } from "@/components/kicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEMO_VIEWING_KEY } from "@/lib/keepr/constants";
import {
  CREATORS,
  CREATOR_RATES,
  DEMO_RECEIPTS,
  MRR_SERIES,
  usdFromStrk,
} from "@/lib/keepr/data";
import { formatDate, formatStrk } from "@/lib/keepr/format";
import { useKeepr } from "@/lib/keepr/store";
import { useStrkPrice } from "@/lib/keepr/price";
import type { CreatorRate, TierId } from "@/lib/keepr/types";
import { cn } from "@/lib/utils";

export default function CreatorPage() {
  const unlocked = useKeepr((s) => s.creatorUnlocked);
  const activeCreatorId = useKeepr((s) => s.activeCreatorId);
  const unlockCreator = useKeepr((s) => s.unlockCreator);
  const subs = useKeepr((s) => s.subs);
  const [chartOn, setChartOn] = useState(false);
  const { formatStrkUsd } = useStrkPrice();

  useEffect(() => {
    setChartOn(true);
  }, []);

  const creator =
    CREATORS.find((c) => c.id === activeCreatorId) ?? CREATORS[3];

  const localActive = subs.filter(
    (s) => s.creatorId === creator.id && s.active,
  ).length;
  const subscribers = creator.subscribers + localActive;
  const extraMrr = subs
    .filter((s) => s.creatorId === creator.id && s.active)
    .reduce((n, s) => n + s.amountStrk, 0);
  const mrr = creator.mrrStrk + extraMrr;
  const churn = 4.2;

  const series = useMemo(
    () =>
      MRR_SERIES.map((p, i) =>
        i === MRR_SERIES.length - 1 ? { ...p, v: mrr } : p,
      ),
    [mrr],
  );

  if (!unlocked) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-16">
        <div className="mx-auto max-w-lg text-center">
          <Kicker>Viewing key</Kicker>
          <h1 className="mt-4 font-display text-4xl font-bold uppercase tracking-tight md:text-5xl">
            Your books are yours.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink">
            Unlock a demo viewing key to set what you charge, read subscriber
            count and MRR, and export receipts. Earnings never appear on a
            public indexer.
          </p>
          <div className="mt-8 flex flex-col gap-2">
            {CREATORS.map((c) => (
              <Button
                key={c.id}
                variant="outline"
                className="w-full justify-between"
                onClick={() => unlockCreator(c.id)}
              >
                <span>{c.name}</span>
                <span className="normal-case tracking-normal text-subtle">
                  {c.handle}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>Ledger</Kicker>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight md:text-5xl">
            {creator.name}
          </h1>
          <p className="mt-2 font-mono text-xs text-muted">
            {creator.handle} · viewing key {DEMO_VIEWING_KEY}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CREATORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => unlockCreator(c.id)}
              className={cn(
                "h-11 px-3 font-mono text-[11px] uppercase tracking-[0.14em]",
                c.id === creator.id
                  ? "bg-accent text-cream"
                  : "text-muted shadow-[var(--shadow-border)] hover:bg-accent-muted",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 max-w-xl text-sm leading-relaxed text-ink">
        Your earnings are hidden from everyone but you. Receipts are provable
        for tax and compliance without publishing the subscriber list.
      </p>

      <div className="mt-8 grid gap-px bg-line sm:grid-cols-3">
        <Stat k="Active channels" v={String(subscribers)} />
        <Stat
          k="Private MRR"
          v={`${formatStrk(mrr)} STRK`}
          sub={`~${formatStrkUsd(mrr)} USD`}
          accent
        />
        <Stat k="Churn" v={`${churn.toFixed(1)}%`} />
      </div>

      <RateBook creatorId={creator.id} />

      <section className="mt-8 bg-raised p-4 shadow-[var(--shadow-border)] sm:p-5">
        <div className="flex items-center justify-between">
          <Kicker>Private inflows</Kicker>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
            6 months · viewing-key only
          </p>
        </div>
        <div className="mt-4 h-52 w-full">
          {chartOn ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={series}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="keeprFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="m"
                  stroke="var(--color-ink-subtle)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  fontFamily="var(--font-mono)"
                />
                <YAxis
                  stroke="var(--color-ink-subtle)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  fontFamily="var(--font-mono)"
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-bg-base)",
                    border: "1px solid var(--color-border)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                  }}
                  formatter={(value) => [`${String(value)} STRK (~${formatStrkUsd(Number(value) || 0)})`, "Inflow"]}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  fill="url(#keeprFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full bg-deep/30" />
          )}
        </div>
      </section>

      <section className="mt-8 bg-raised p-4 shadow-[var(--shadow-border)] sm:p-5">
        <div className="flex items-center justify-between">
          <Kicker>Income statements</Kicker>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
            Provable receipts
          </p>
        </div>
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {DEMO_RECEIPTS.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-mono text-sm text-ink">{r.period}</p>
                <p className="mt-1 font-mono text-[11px] text-subtle">
                  {r.channels} channels · issued {formatDate(r.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-mono text-sm tabular-nums text-ink">
                  {formatStrk(r.amountStrk)} STRK
                  <span className="ml-1 text-muted text-xs">
                    (~{formatStrkUsd(r.amountStrk)})
                  </span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadReceipt({ ...r, creator: creator.handle })
                  }
                >
                  Export
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function RateBook({ creatorId }: { creatorId: string }) {
  const book = useKeepr((s) => s.creatorRates);
  const rates = book[creatorId] ?? CREATOR_RATES[creatorId] ?? CREATOR_RATES.archive;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Kicker>Your book</Kicker>
          <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight">
            Set what you charge.
          </h2>
        </div>
        <p className="max-w-sm font-mono text-[11px] leading-relaxed text-subtle">
          Posted amounts apply to new channels. Open ones keep the rate they
          started on.
        </p>
      </div>
      <ul className="mt-4 divide-y divide-line bg-cream shadow-[var(--shadow-border)]">
        {rates.map((r) => (
          <RateRow key={r.id} creatorId={creatorId} rate={r} />
        ))}
      </ul>
    </section>
  );
}

function RateRow({
  creatorId,
  rate,
}: {
  creatorId: string;
  rate: CreatorRate;
}) {
  const setCreatorRate = useKeepr((s) => s.setCreatorRate);
  const [name, setName] = useState(rate.name);
  const [strk, setStrk] = useState(String(rate.strk));
  const { formatStrkUsd } = useStrkPrice();

  useEffect(() => {
    setName(rate.name);
    setStrk(String(rate.strk));
  }, [creatorId, rate.id, rate.name, rate.strk]);

  function commitName() {
    const trimmed = name.trim().slice(0, 16) || rate.name;
    setName(trimmed);
    setCreatorRate(creatorId, rate.id as TierId, { name: trimmed });
  }

  function commitStrk() {
    const n = Math.round(Number(strk));
    const v = Number.isFinite(n) ? Math.min(10_000, Math.max(1, n)) : rate.strk;
    setStrk(String(v));
    setCreatorRate(creatorId, rate.id as TierId, { strk: v });
  }

  return (
    <li className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_10rem_7rem] sm:items-end">
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
          Plan
        </span>
        <Input
          className="mt-1 uppercase tracking-[0.08em]"
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
        />
      </label>
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
          STRK / 30d
        </span>
        <Input
          className="mt-1"
          type="number"
          min={1}
          max={10000}
          step={1}
          placeholder="0"
          value={strk}
          onChange={(e) => setStrk(e.target.value)}
          onBlur={commitStrk}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </label>
      <p className="font-mono text-xs tabular-nums text-muted sm:pb-3 sm:text-right">
        {Number(strk) > 0 ? `~${formatStrkUsd(Number(strk))} USD` : "$0.00 USD"}
      </p>
    </li>
  );
}

function Stat({
  k,
  v,
  sub,
  accent,
}: {
  k: string;
  v: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-base px-5 py-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
        {k}
      </p>
      <p
        className={`mt-2 font-display text-3xl font-bold tabular-nums tracking-tight ${accent ? "text-accent" : "text-ink"}`}
      >
        {v}
      </p>
      {sub ? (
        <p className="mt-1 font-mono text-xs tabular-nums text-muted">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function downloadReceipt(r: {
  id: string;
  period: string;
  amountStrk: number;
  channels: number;
  createdAt: number;
  creator: string;
}) {
  const body = {
    protocol: "keepr",
    network: "starknet-mainnet",
    pool: "STRK20",
    statement: "viewing-key income receipt",
    creator: r.creator,
    period: r.period,
    amountStrk: r.amountStrk,
    activeChannels: r.channels,
    issuedAt: new Date(r.createdAt).toISOString(),
    note: "Payer identities are not included. Amounts are provable against open notes.",
  };
  const blob = new Blob([JSON.stringify(body, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `keepr-receipt-${r.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
