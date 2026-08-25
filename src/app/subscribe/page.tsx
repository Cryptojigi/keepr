"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConnectGate } from "@/components/connect-gate";
import { Kicker } from "@/components/kicker";
import { LoadingVault } from "@/components/loading-vault";
import { Button } from "@/components/ui/button";
import { VaultStrip } from "@/components/vault-strip";
import { CREATORS, ratesForCreator } from "@/lib/keepr/data";
import { formatStrk } from "@/lib/keepr/format";
import { useKeepr } from "@/lib/keepr/store";
import type { Creator, TierId } from "@/lib/keepr/types";
import { cn } from "@/lib/utils";

export default function SubscribePage() {
  const connected = useKeepr((s) => s.connected);
  const hasHydrated = useKeepr((s) => s.hasHydrated);
  const shieldedStrk = useKeepr((s) => s.shieldedStrk);
  const publicStrk = useKeepr((s) => s.publicStrk);
  const sessionKey = useKeepr((s) => s.sessionKey);
  const grantSessionKey = useKeepr((s) => s.grantSessionKey);
  const subscribe = useKeepr((s) => s.subscribe);
  const shield = useKeepr((s) => s.shield);
  const setBusy = useKeepr((s) => s.setBusy);
  const busy = useKeepr((s) => s.busy);
  const subs = useKeepr((s) => s.subs);
  const router = useRouter();

  const creatorRates = useKeepr((s) => s.creatorRates);
  const [picked, setPicked] = useState<string>("forge");
  const [tier, setTier] = useState<TierId>(1);

  const creator = useMemo(
    () => CREATORS.find((c) => c.id === picked) ?? CREATORS[0],
    [picked],
  );
  const rates = ratesForCreator(creator.id, creatorRates);
  const selectedTier = rates.find((t) => t.id === tier) ?? rates[1] ?? rates[0];
  const already = subs.some((s) => s.creatorId === creator.id && s.active);
  const shortfall = Math.max(0, selectedTier.strk - shieldedStrk);

  async function onSubscribe() {
    if (already) {
      toast("Already subscribed to this channel.");
      return;
    }
    setBusy("subscribe");
    try {
      if (shortfall > 0) {
        if (publicStrk < shortfall) {
          toast("Not enough public STRK to shield the remainder.");
          return;
        }
        await wait(500);
        shield(shortfall);
        toast(`Shielded ${shortfall} STRK to cover the note.`);
      }
      if (!sessionKey) grantSessionKey();
      await wait(900);
      const sub = subscribe(creator.id, selectedTier.id);
      toast(`Channel open · ${sub.txHash.slice(0, 12)}…`);
      router.push("/dashboard");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Rejected.");
    } finally {
      setBusy(null);
    }
  }

  if (!hasHydrated) {
    return <LoadingVault />;
  }

  if (!connected) {
    return (
      <main className="mx-auto max-w-6xl px-5">
        <ConnectGate
          title="A vault first."
          body="Connect Ready on mainnet, or enter the demo vault to walk shield → subscribe → proof without a live wallet."
        >
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">
            Demo starts with 400 public · 30 shielded STRK
          </p>
        </ConnectGate>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <Kicker>Subscribe</Kicker>
      <h1 className="mt-3 text-4xl md:text-5xl">Pick a channel.</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-ink">
        The creator set these rates. The helper will not over-charge. Your
        address is stored as a hash — never in the clear.
      </p>

      <div className="mt-8">
        <VaultStrip />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <ul className="grid gap-3 sm:grid-cols-2">
          {CREATORS.map((c) => (
            <li key={c.id}>
              <CreatorCard
                creator={c}
                active={c.id === creator.id}
                subscribed={subs.some((s) => s.creatorId === c.id && s.active)}
                onPick={() => setPicked(c.id)}
              />
            </li>
          ))}
        </ul>

        <aside className="h-fit bg-cream p-5 shadow-[var(--shadow-border)] lg:sticky lg:top-20">
          <p className="kicker">Confirm</p>
          <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight">
            {creator.name}
          </h2>
          <p className="mt-1 font-mono text-xs text-muted">{creator.handle}</p>

          <div className="mt-5 flex flex-col gap-2">
            {rates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTier(t.id)}
                className={cn(
                  "flex items-center justify-between px-3 py-3 text-left transition-[background-color,box-shadow] duration-150",
                  t.id === tier
                    ? "bg-accent-muted shadow-[inset_3px_0_0_0_var(--color-accent)]"
                    : "bg-raised/70 hover:bg-raised",
                )}
              >
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-gold">
                  {t.name}
                </span>
                <span className="font-mono text-sm tabular-nums text-ink">
                  {formatStrk(t.strk)} STRK
                </span>
              </button>
            ))}
          </div>

          <dl className="mt-5 space-y-2 border-t border-line pt-4 font-mono text-xs">
            <Row k="Charge" v={`${formatStrk(selectedTier.strk)} STRK`} />
            <Row k="Period" v="30 days" />
            <Row k="Shielded" v={`${formatStrk(shieldedStrk)} STRK`} />
            <Row
              k="To shield"
              v={shortfall > 0 ? `${formatStrk(shortfall)} STRK` : "—"}
            />
            <Row k="Session" v={sessionKey ? "Granted" : "Will grant"} />
          </dl>

          <Button
            className="mt-5 w-full"
            onClick={() => void onSubscribe()}
            disabled={!!busy || already}
          >
            {already
              ? "Already open"
              : busy
                ? "Submitting"
                : `Subscribe · ${formatStrk(selectedTier.strk)} STRK`}
          </Button>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-subtle">
            Cancel is one click. The keeper never moves more than the exact
            renewal.
          </p>
        </aside>
      </div>
    </main>
  );
}

function CreatorCard({
  creator,
  active,
  subscribed,
  onPick,
}: {
  creator: Creator;
  active: boolean;
  subscribed: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex h-full w-full flex-col p-4 text-left transition-[box-shadow,background-color] duration-150",
        active
          ? "bg-cream shadow-[var(--shadow-border-hover)]"
          : "bg-raised shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
          {creator.category}
        </p>
        {subscribed ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
            Open
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 font-display text-xl font-bold uppercase tracking-tight">
        {creator.name}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink">{creator.blurb}</p>
      <p className="mt-4 font-mono text-[11px] tabular-nums text-subtle">
        {creator.subscribers} shielded · {formatStrk(creator.mrrStrk)} STRK MRR
      </p>
    </button>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="uppercase tracking-[0.14em] text-subtle">{k}</dt>
      <dd className="tabular-nums text-ink">{v}</dd>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}
