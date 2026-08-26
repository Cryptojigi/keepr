# Keepr — Private Subscription Payments on STRK20

<p align="center">
  <img src="public/favicon.svg" alt="Keepr Logo" width="96" />
</p>

> **Private subscription payments for AI agents and digital creators on STRK20** — shield, subscribe, auto-renew via keepers, and prove tier access with STARK proofs without wallet scanning.

Built for the **STRK20 Private Sprint Hackathon** (Inspired by [RFP-12: Private Subscriptions](https://strk20.starknet.io/rfp/private-subscriptions)).

---

## What is Keepr?

Keepr is a non-custodial recurring payment protocol on [STRK20](https://strk20.starknet.io) (Starknet's unified privacy pool). It solves three major pain points in on-chain subscriptions:

1. **Payer Privacy** — Subscriptions are paid from shielded notes inside the STRK20 pool. The creator gets paid, but the world cannot see who subscribed or how much was paid.
2. **Set-and-Forget Renewal Friction** — Subscriptions auto-renew via an autonomous **24/7 Keeper Agent** utilizing session keys and Avnu paymaster sponsorship (gasless renewals).
3. **Creator Privacy & Viewing-Key Receipts** — Earnings analytics are private to the creator via viewing keys. Competitors cannot scrape pricing or revenue, while creators can generate provable income receipts for taxes/compliance.
4. **Nameless Membership Proofs** — Tier-gated access (Discord/Telegram/API gates) is validated via cryptographic proofs ("membership cards") rather than intrusive wallet scanning.

---

## Subscription Tiers (Hackathon Showcase)

Keepr ships with 3 standardized demo tiers (with custom creator-configurable pricing supported in the protocol):

| Tier | Price (USD) | STRK Amount | Frequency | Key Features |
|---|---|---|---|---|
| **Basic** | **$5 / mo** | ~25 STRK | 30 Days | Shielded payments, nameless membership proof, Telegram gate access |
| **Pro** | **$20 / mo** | ~100 STRK | 30 Days | All Basic features, AI Agent API quota, viewing-key income receipts |
| **VIP** | **$50 / mo** | ~250 STRK | 30 Days | All Pro features, uncapped agent bandwidth, custom STARK proof pass |

---

## Architecture

```
[ Subscriber ] ──(Shielded Balance)──► [ STRK20 Privacy Pool ] ──► [ Keepr Helper Contract ]
                                                                             │
[ 24/7 Keeper Agent ] ──(Session Keys + Paymaster)──► Auto-Renews ────────────┘
                                                                             │
[ Creator Dashboard ] ◄──(Viewing Key)── Private Analytics & Income Receipts ─┘
```

---

## Quick Start

### 1. Prerequisites
- Node.js 20+
- A Starknet privacy-enabled wallet ([Ready Wallet](https://readywallet.xyz))
- An Alchemy Starknet RPC key (free at [alchemy.com](https://alchemy.com))

### 2. Install & Run

```bash
# Clone repository
git clone https://github.com/Cryptojigi/keepr.git
cd keepr

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Set NEXT_PUBLIC_PROVIDER_URL=your_alchemy_rpc_key

# Run local development server
npm run dev
# Open http://localhost:3000
```

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Zustand, Vanilla CSS / STRK20 Industrial Brand Design
- **Contracts**: Cairo 2.18 (`privacy_invoke` anonymizer pattern on Starknet Mainnet & Sepolia)
- **Starknet Integration**: `starknet.js` v10.4.0, `@starknet-io/get-starknet-discovery`, `@starknet-io/get-starknet-wallet-standard`
- **Automation**: Node.js Keeper Daemon with Session Keys

---

## Submission & Verification

- Submission metadata: [`strk20.json`](./strk20.json)
- License: [MIT](./LICENSE)
