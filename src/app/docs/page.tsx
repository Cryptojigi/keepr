"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Kicker } from "@/components/kicker";
import {
  HELPER_MAINNET,
  STRK20_POOL,
  STRK_TOKEN,
  REPO_URL,
  STRK20_URL,
  RFP_URL,
  READY_URL,
} from "@/lib/keepr/constants";

const SECTIONS = [
  { id: "overview", label: "Overview", children: [{ id: "what-is-keepr", label: "What is Keepr?" }, { id: "how-it-works", label: "How it works" }, { id: "protocol-roles", label: "Protocol roles" }] },
  { id: "shield", label: "Shield", children: [{ id: "shielding-strk", label: "Shielding STRK" }, { id: "privacy-pool", label: "Privacy pool" }, { id: "notes", label: "Notes & commitments" }] },
  { id: "subscribe", label: "Subscribe", children: [{ id: "opening-a-channel", label: "Opening a channel" }, { id: "tiers", label: "Tiers & rates" }, { id: "session-keys", label: "Session keys" }] },
  { id: "keeper", label: "Keeper", children: [{ id: "keeper-daemon", label: "Keeper daemon" }, { id: "renewal", label: "Auto-renewal" }, { id: "dry-note", label: "Dry-note behaviour" }] },
  { id: "verify", label: "Verify", children: [{ id: "proof-gate", label: "Proof gate" }, { id: "viewing-keys", label: "Viewing keys" }, { id: "api-gate", label: "API gating" }] },
  { id: "creator", label: "Creator", children: [{ id: "rate-book", label: "Rate book" }, { id: "mrr", label: "Private MRR" }, { id: "cancel", label: "Cancel & revocation" }] },
  { id: "contracts", label: "Contracts", children: [{ id: "addresses", label: "Deployed addresses" }, { id: "opcodes", label: "Opcodes" }, { id: "integration", label: "Integration guide" }] },
  { id: "reference", label: "Reference", children: [{ id: "faq", label: "FAQ" }, { id: "glossary", label: "Glossary" }, { id: "links", label: "Links" }] },
] as const;

function Anchor({ id }: { id: string }) {
  return <span id={id} className="relative -top-24 block" />;
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-none border border-line bg-raised px-1.5 py-0.5 font-mono text-[0.8125rem] text-accent">
      {children}
    </code>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="my-5 shadow-[var(--shadow-border)]">
      {title && (
        <div className="border-b border-line bg-raised px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
          {title}
        </div>
      )}
      <pre className="overflow-x-auto bg-ink p-4 font-mono text-[0.8125rem] leading-relaxed text-cream/90 max-w-full">
        <code className="block min-w-0">{children.trim()}</code>
      </pre>
    </div>
  );
}

function DocSection({ children, id }: { children: React.ReactNode; id: string }) {
  return <section id={id} className="mb-14 scroll-mt-24">{children}</section>;
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 font-display text-2xl font-bold uppercase tracking-tight text-ink md:text-3xl">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-8 mb-3 font-display text-lg font-bold uppercase tracking-tight text-ink">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-[1.0625rem] leading-[1.8] text-ink">{children}</p>;
}

function CallOut({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warn" | "tip" }) {
  const styles = { info: "border-l-4 border-accent bg-accent-muted/50", warn: "border-l-4 border-amber bg-raised2", tip: "border-l-4 border-ok/60 bg-raised" };
  const labels = { info: "Note", warn: "Warning", tip: "Tip" };
  return (
    <div className={`my-5 px-4 py-3 text-sm leading-relaxed text-ink ${styles[type]}`}>
      <span className="mr-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-subtle">{labels[type]}</span>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="my-10 h-px w-full bg-line opacity-50" />;
}

function Sidebar({ active }: { active: string }) {
  return (
    <aside className="hidden w-52 shrink-0 lg:block">
      <nav className="sticky top-24">
        {SECTIONS.map((s) => (
          <div key={s.id} className="mb-5">
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{s.label}</p>
            <ul>
              {s.children.map((c) => (
                <li key={c.id}>
                  <a href={`#${c.id}`} className={`flex items-center gap-1 py-1 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${active === c.id ? "text-ink" : "text-muted hover:text-ink"}`}>
                    {active === c.id && <ChevronRight className="size-3 shrink-0 text-accent" />}
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default function DocsPage() {
  const [active] = useState("what-is-keepr");

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-16">
      <div className="mb-10 border-b border-line pb-8">
        <Kicker>Documentation</Kicker>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-ink md:text-5xl">
          Keepr Protocol
        </h1>
        <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-ink">
          A complete reference for the Keepr private subscription protocol built on STRK20 and Starknet.
          Shield notes, subscribe to channels, and prove tier access — without a wallet scan.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center border border-line bg-raised px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink hover:bg-raised2 transition-colors">GitHub ↗</a>
          <a href={STRK20_URL} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center border border-line bg-raised px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink hover:bg-raised2 transition-colors">STRK20 Spec ↗</a>
          <a href={RFP_URL} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center border border-accent bg-accent px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-cream hover:bg-accent/90 transition-colors">RFP-12 ↗</a>
        </div>
      </div>

      <div className="flex gap-10 min-w-0">
        <Sidebar active={active} />

        <article className="min-w-0 flex-1 overflow-hidden">

          <DocSection id="overview">
            <Anchor id="what-is-keepr" />
            <H2>What is Keepr?</H2>
            <P>
              Keepr is a privacy-preserving subscription protocol running on Starknet Mainnet. It enables recurring payments between payers and creators — AI agents, newsletters, data feeds, private communities — without either party revealing their on-chain identity to outside observers.
            </P>
            <P>
              Payments flow through the STRK20 privacy pool. A payer shields STRK into an anonymous note, subscribes to a creator&apos;s channel, and a trustless autonomous agent (the <em>keeper</em>) handles renewals using a delegated session key. Creators receive payment, but their subscriber list is never public. Gated services verify tier access with a zero-knowledge proof, not a wallet address lookup.
            </P>
            <CallOut type="info">
              Keepr satisfies <a href={RFP_URL} target="_blank" rel="noreferrer" className="underline decoration-accent underline-offset-2">STRK20 RFP-12</a> — Private Subscription Protocol for Starknet.
            </CallOut>

            <Anchor id="how-it-works" />
            <H3>How it works</H3>
            <P>The protocol has three phases that compose into a complete private payment loop:</P>
            <ol className="mb-6 ml-6 list-decimal space-y-3 text-[1.0625rem] leading-relaxed text-ink marker:font-mono marker:text-accent">
              <li><strong>Shield</strong> — Deposit public STRK into the STRK20 privacy pool. Your balance is now shielded: indistinguishable from all other pool participants.</li>
              <li><strong>Subscribe</strong> — Choose a creator channel and tier. Keepr routes an OPEN note transfer to the creator, records a hashed subscriber ID on-chain, and grants a session key to the keeper daemon.</li>
              <li><strong>Renew / Gate</strong> — The keeper auto-renews on a 60-second tick. Gated services verify tier access via a cryptographic proof without a chain query.</li>
            </ol>

            <Anchor id="protocol-roles" />
            <H3>Protocol roles</H3>
            <div className="mt-4 grid gap-px bg-line md:grid-cols-3">
              {[
                { role: "Payer", desc: "Any wallet that shields STRK and opens a subscription channel. The payer's address never appears in subscription records — only a salted hash does." },
                { role: "Creator", desc: "Sets tier rates via the Rate Book. Receives shielded note payouts. Controls MRR visibility via viewing keys. Never holds subscriber lists in plaintext." },
                { role: "Keeper", desc: "An autonomous off-chain daemon that holds delegated session keys. Ticks every 60 seconds, renewing subscriptions within their renewal window." },
              ].map((r) => (
                <div key={r.role} className="bg-base px-5 py-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{r.role}</p>
                  <p className="mt-3 text-sm leading-relaxed text-ink">{r.desc}</p>
                </div>
              ))}
            </div>
          </DocSection>

          <Divider />

          <DocSection id="shield">
            <Anchor id="shielding-strk" />
            <H2>Shield</H2>
            <P>
              Shielding moves your STRK from a transparent on-chain balance into the STRK20 privacy pool. Once shielded, the tokens exist as a cryptographic note — a commitment that proves ownership without revealing the amount or owner to chain observers.
            </P>

            <Anchor id="privacy-pool" />
            <H3>Privacy pool</H3>
            <P>The STRK20 privacy pool accepts OPEN (deposit) and CLOSE (withdraw) operations of STRK using note-based accounting.</P>
            <div className="mb-5 overflow-x-auto">
              <table className="w-full min-w-[22rem] border-collapse text-left">
                <thead><tr className="bg-raised">{["Parameter", "Value"].map((h) => <th key={h} className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">{h}</th>)}</tr></thead>
                <tbody>
                  {[["Pool address", STRK20_POOL], ["Token", "STRK (ERC-20)"], ["Token address", STRK_TOKEN], ["Network", "Starknet Mainnet"], ["Denomination", "Any amount (felt252)"]].map(([k, v]) => (
                    <tr key={k} className="border-t border-line bg-base">
                      <td className="px-4 py-2.5 font-mono text-xs text-muted">{k}</td>
                      <td className="break-all px-4 py-2.5 font-mono text-[11px] text-ink">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Anchor id="notes" />
            <H3>Notes &amp; commitments</H3>
            <P>
              When you shield STRK, the pool records a <em>note commitment</em> — a Pedersen hash of your address, amount, and a random salt. Notes are consumed (nullified) when spent; spending proves you own a valid note without revealing which one.
            </P>
            <CodeBlock title="Shield operation (simplified)">{`// keepr shield --amount 12 STRK\ncommitment = Pedersen(address, amount, salt)\npool.OPEN(commitment, amount)\n\n// Your shielded note:\nnote = { address, amount: 12_000_000_000_000_000_000, salt }\nnullifier = Pedersen(note, viewing_key)`}</CodeBlock>
            <CallOut type="warn">Shield operations require a connected Ready Wallet for client-side ZK proof generation.</CallOut>
          </DocSection>

          <Divider />

          <DocSection id="subscribe">
            <Anchor id="opening-a-channel" />
            <H2>Subscribe</H2>
            <P>
              A subscription channel is an on-chain record linking a hashed subscriber identity to a creator, a tier, and an expiry timestamp. Opening a channel does not reveal the payer&apos;s wallet address — only a salted hash derived from the address and a random nonce.
            </P>
            <P>
              The <InlineCode>KeeprSubscriptionHelper</InlineCode> contract validates the Subscribe opcode, records the channel, and routes an OPEN note transfer to the creator&apos;s registered payout address.
            </P>
            <CodeBlock title="Subscribe opcode call">{`// Computed client-side\nsub_id      = Pedersen(connected_address, salt)\nauth_commit = Pedersen(cancel_secret)\n\nactions = [\n  OPEN(creatorAddress, tierId, amountStrk),\n  SUBSCRIBE(subId, authCommit, period)\n]\nhelper.execute(actions, proof)`}</CodeBlock>

            <Anchor id="tiers" />
            <H3>Tiers &amp; rates</H3>
            <div className="mb-5 overflow-x-auto">
              <table className="w-full min-w-[22rem] border-collapse text-left">
                <thead><tr className="bg-raised">{["Tier ID", "Name", "Description"].map((h) => <th key={h} className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">{h}</th>)}</tr></thead>
                <tbody>
                  {[["0", "Calls", "Entry access — limited API calls or basic read access."], ["1", "Quota", "Standard access — daily quota, standard throughput."], ["2", "Uncapped", "Full access — no rate limits, highest tier."]].map(([id, name, desc]) => (
                    <tr key={id} className="border-t border-line bg-base">
                      <td className="px-4 py-2.5 font-mono text-xs text-accent">{id}</td>
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-ink">{name}</td>
                      <td className="px-4 py-2.5 text-sm text-ink">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Anchor id="session-keys" />
            <H3>Session keys</H3>
            <P>
              After a successful subscription, the helper grants a session key to the keeper daemon — a narrow delegation that authorises <em>only</em> renewal transactions at the exact charge defined at subscription time.
            </P>
            <CallOut type="tip">Session keys are revoked automatically when a subscription is cancelled. You can also revoke them from the Vault at any time.</CallOut>
          </DocSection>

          <Divider />

          <DocSection id="keeper">
            <Anchor id="keeper-daemon" />
            <H2>Keeper</H2>
            <P>
              The Keeper is a TypeScript daemon that runs on any internet-connected machine. It holds session keys for all active subscriptions and ticks every 60 seconds, submitting renewal transactions so payers never pay gas for renewals.
            </P>
            <CodeBlock title="Start the keeper daemon">{`cd keeper/\ncp .env.example .env\n# Configure SESSION_KEY, RPC_URL, HELPER_ADDRESS\n\nnpm install && npm run start\n\n# keeper tick 00:00 - scanning 3 active channels\n# renew  0x7a1c… cipher.brief   15 STRK   ok\n# skip   0x3b9d… aegis.agent    dry note (0 shielded)\n# renew  0x1c4f… vellum.studio  10 STRK   ok`}</CodeBlock>

            <Anchor id="renewal" />
            <H3>Auto-renewal</H3>
            <P>A renewal is submitted when all three conditions hold:</P>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-[1.0625rem] leading-relaxed text-ink marker:text-accent">
              <li>The subscription expires within the next 24 hours.</li>
              <li>The shielded note balance covers the renewal charge.</li>
              <li>The session key is still valid (not revoked).</li>
            </ul>
            <P>
              The Renew opcode updates the channel&apos;s <InlineCode>last_renewed</InlineCode> timestamp. Period is always exactly 30 days from the last renewal, never drifting.
            </P>

            <Anchor id="dry-note" />
            <H3>Dry-note behaviour</H3>
            <P>
              If the shielded balance is insufficient at renewal time, the keeper logs a dry-note event and skips the channel. No partial charge is taken. The channel lapses silently when its current period expires, preserving privacy.
            </P>
            <CallOut type="warn">A lapsed channel cannot be re-opened automatically. The payer must top up their shield balance and re-subscribe.</CallOut>
          </DocSection>

          <Divider />

          <DocSection id="verify">
            <Anchor id="proof-gate" />
            <H2>Verify</H2>
            <P>
              The Verify page and gate API let third-party services (such as Discord bots, Telegram gates, and private APIs) confirm that a user holds an active subscription without learning their wallet address.
            </P>
            <CodeBlock title="Proof gate flow">{`// 1. Gate issues challenge\nchallenge = "keepr:gate:cipher.brief:verify"\n\n// 2. Payer signs in-browser (no wallet popup)\nsignature = wallet.sign(challenge)\n\n// 3. Gate checks on-chain\nresult = helper.verify(sub_id, signature, challenge)\n// → { tier: 1, expiry: 1756339200, active: true }\n\n// The gate never sees the wallet address.`}</CodeBlock>

            <Anchor id="viewing-keys" />
            <H3>Viewing keys</H3>
            <P>
              Viewing keys give selective disclosure of shielded note data. A creator can share their viewing key with an auditor or revenue partner without revealing subscriber identities. The viewing key decrypts amounts; it does not allow spending.
            </P>

            <Anchor id="api-gate" />
            <H3>API gating</H3>
            <CodeBlock title="API gate integration (TypeScript)">{`import { RpcProvider, Contract } from "starknet";\n\nconst provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC });\nconst helper = new Contract(ABI, HELPER_MAINNET, provider);\n\nasync function checkAccess(subId: string): Promise<boolean> {\n  const [active] = await helper.call("is_active", [subId]);\n  return active === BigInt(1);\n}`}</CodeBlock>
          </DocSection>

          <Divider />

          <DocSection id="creator">
            <Anchor id="rate-book" />
            <H2>Creator</H2>
            <P>
              The Creator Portal (<Link href="/creator" className="underline decoration-accent underline-offset-2">keepr.app/creator</Link>) is a private dashboard for channel operators. It shows shielded MRR, subscriber counts by tier, and provides a Rate Book editor for tier pricing.
            </P>
            <P>Rate Book changes apply only to <em>new</em> subscriptions — existing channels are locked to the rate set at subscription time.</P>

            <Anchor id="mrr" />
            <H3>Private MRR</H3>
            <P>
              Monthly Recurring Revenue is computed locally in the browser from your viewing key — it never hits a public endpoint. Competitors cannot scrape your MRR. Subscribers cannot see each other.
            </P>

            <Anchor id="cancel" />
            <H3>Cancel &amp; revocation</H3>
            <P>
              Cancellation from the Vault (<Link href="/dashboard" className="underline decoration-accent underline-offset-2">keepr.app/vault</Link>) requires the <em>cancel secret</em> — a pre-image committed to on-chain at subscription time. This proves ownership without revealing the payer&apos;s address.
            </P>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-[1.0625rem] leading-relaxed text-ink marker:text-accent">
              <li>Session key is revoked immediately.</li>
              <li>Channel is marked inactive on-chain.</li>
              <li>Remaining period is forfeited (no partial refund).</li>
            </ul>
          </DocSection>

          <Divider />

          <DocSection id="contracts">
            <Anchor id="addresses" />
            <H2>Contracts</H2>
            <div className="mb-6 overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse text-left">
                <thead><tr className="bg-raised">{["Contract", "Address", "Network"].map((h) => <th key={h} className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">{h}</th>)}</tr></thead>
                <tbody>
                  {[["KeeprSubscriptionHelper", HELPER_MAINNET, "Mainnet"], ["STRK20 Privacy Pool", STRK20_POOL, "Mainnet"], ["STRK Token", STRK_TOKEN, "Mainnet"]].map(([name, addr, net]) => (
                    <tr key={name} className="border-t border-line bg-base">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-ink">{name}</td>
                      <td className="break-all px-4 py-2.5 font-mono text-[11px] text-accent">{addr}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted">{net}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Anchor id="opcodes" />
            <H3>Opcodes</H3>
            <div className="mt-4 grid gap-px bg-line md:grid-cols-3">
              {[{ op: "Subscribe", code: "0x01", desc: "Opens a new subscription channel. Requires a valid shielded note and auth commitment." }, { op: "Renew", code: "0x02", desc: "Renews an existing channel for one period. Requires a valid session key." }, { op: "Cancel", code: "0x03", desc: "Closes a channel permanently. Requires the cancel secret pre-image." }].map((o) => (
                <div key={o.op} className="bg-base px-5 py-5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted">{o.code}</span>
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">{o.op}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink">{o.desc}</p>
                </div>
              ))}
            </div>

            <Anchor id="integration" />
            <H3>Integration guide</H3>
            <CodeBlock title="Install">{`npm install starknet @starknet-io/types-js`}</CodeBlock>
            <CodeBlock title="Read a subscription on-chain">{`import { RpcProvider, Contract } from "starknet";\n\nconst provider = new RpcProvider({\n  nodeUrl: "https://starknet-mainnet.infura.io/v3/YOUR_KEY"\n});\nconst helper = new Contract(KEEPR_ABI, HELPER_MAINNET, provider);\n\n// sub_id = Pedersen(address, salt) — computed client-side at subscribe time\nconst [active] = await helper.call("is_active", [sub_id]);\n// active === 1n  →  subscription is live`}</CodeBlock>
            <CallOut type="info">
              Full ABI and Cairo source at{" "}
              <a href={REPO_URL} target="_blank" rel="noreferrer" className="underline decoration-accent underline-offset-2">github.com/Cryptojigi/keepr</a>
              {" "}→ <InlineCode>cairo/src/lib.cairo</InlineCode>
            </CallOut>
          </DocSection>

          <Divider />

          <DocSection id="reference">
            <Anchor id="faq" />
            <H2>Reference</H2>
            <H3>FAQ</H3>
            <div className="mt-4">
              {[
                { q: "Does the creator know who subscribed?", a: "No. Only a salted hash of the subscriber's address is stored on-chain. The creator cannot reverse it without the original address and salt." },
                { q: "Can someone see how much I pay?", a: "Amounts inside the STRK20 pool are hidden. Note commitments reveal nothing about their contents without the viewing key." },
                { q: "What if I lose my cancel secret?", a: "The subscription continues until it expires naturally. Without the cancel secret pre-image, the Cancel opcode will reject the transaction. Always back up your cancel secret." },
                { q: "Does Keepr work with Argent or Braavos?", a: "The demo vault works with any Starknet wallet. However, live on-chain shielded note operations require Ready Wallet for client-side ZK proof generation." },
                { q: "What network does Keepr run on?", a: "Starknet Mainnet exclusively. Both the STRK20 privacy pool and the KeeprSubscriptionHelper are Mainnet deployments." },
                { q: "Is the keeper trustless?", a: "The keeper holds session keys with narrow, scoped delegation — only renewal transactions at the exact charge. It cannot access the underlying note or spend other funds. Revoke session keys from the Vault at any time." },
              ].map(({ q, a }) => (
                <div key={q} className="mb-6 border-b border-line pb-6 last:border-0 last:pb-0">
                  <p className="font-display text-base font-bold uppercase tracking-tight text-ink">{q}</p>
                  <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink">{a}</p>
                </div>
              ))}
            </div>

            <Anchor id="glossary" />
            <H3>Glossary</H3>
            <dl className="mt-4 space-y-4">
              {[
                ["Note", "A cryptographic commitment representing shielded STRK. Identified by its hash; consumed by a nullifier on spend."],
                ["Sub ID", "Pedersen(address, salt). Stored on-chain as the channel identifier — not the raw wallet address."],
                ["Auth Commit", "Pedersen(cancel_secret). Presenting the pre-image is required to cancel a channel."],
                ["Session Key", "A scoped delegation to the keeper daemon. Authorises only renewals at the exact tier rate."],
                ["Viewing Key", "Decrypts note amounts for selective disclosure to auditors. Does not allow spending."],
                ["Keeper", "The off-chain daemon that holds session keys and submits renewal transactions autonomously."],
                ["OPEN / CLOSE", "Pool opcodes for depositing (shielding) and withdrawing (unshielding) STRK."],
                ["Rate Book", "The on-chain tier price record. Changes apply to new subscriptions only."],
              ].map(([term, def]) => (
                <div key={term} className="flex gap-4">
                  <dt className="w-28 shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">{term}</dt>
                  <dd className="text-[1rem] leading-relaxed text-ink">{def}</dd>
                </div>
              ))}
            </dl>

            <Anchor id="links" />
            <H3>Links</H3>
            <ul className="mt-4 space-y-2">
              {[
                { label: "Keepr GitHub", href: REPO_URL },
                { label: "STRK20 Protocol Spec", href: STRK20_URL },
                { label: "RFP-12 — Private Subscriptions", href: RFP_URL },
                { label: "Ready Wallet", href: READY_URL },
                { label: "KeeprSubscriptionHelper on Starkscan", href: `https://starkscan.co/contract/${HELPER_MAINNET}` },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-accent underline-offset-2 hover:underline">
                    {label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </DocSection>

        </article>
      </div>
    </main>
  );
}
