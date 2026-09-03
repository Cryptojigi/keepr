# Keepr — Private Subscription Payments on STRK20

<p align="center">
  <img src="public/favicon.svg" alt="Keepr Logo" width="80" height="80" />
</p>

<p align="center">
  <strong>Private, recurring subscription protocol for AI agents, research publications, and digital creators on Starknet.</strong><br />
  Shield STRK tokens · Subscribe to channels · Auto-renew via keepers · Prove access with STARK proofs without wallet scanning.
</p>

<p align="center">
  <a href="https://keepr-eta.vercel.app"><img src="https://img.shields.io/badge/Live_App-keepr--eta.vercel.app-64181a?style=flat-square" alt="Live App" /></a>
  <a href="https://voyager.online/contract/0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1"><img src="https://img.shields.io/badge/Starknet_Mainnet-0x02f2...7fa1-2f4a32?style=flat-square" alt="Starknet Mainnet Contract" /></a>
  <a href="https://strk20.starknet.io"><img src="https://img.shields.io/badge/Protocol-STRK20_Privacy_Pool-64181a?style=flat-square" alt="STRK20" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-gray?style=flat-square" alt="License" /></a>
</p>

---

## Overview

**Keepr** is a non-custodial, privacy-first subscription protocol built on [STRK20](https://strk20.starknet.io) (Starknet's unified privacy pool) and deployed live on **Starknet Mainnet**. Inspired by [RFP-12: Private Subscriptions](https://strk20.starknet.io/rfp/private-subscriptions), Keepr eliminates public address tracking, balance inspection, and identity leakage from recurring payments.

Subscriptions in Keepr are funded directly from anonymous shielded notes. An autonomous, off-chain **Keeper Daemon** manages periodic renewals via delegated session keys, and gates (Discord bots, Telegram channels, API gateways) verify active tier access through zero-knowledge challenges without ever scanning subscriber wallet addresses.

---

## Live Deployments & Network Details

| Resource | Network | Address / URL | Explorer Link |
|:---|:---|:---|:---|
| **Live Web App** | Production | `https://keepr-eta.vercel.app` | [Open App ↗](https://keepr-eta.vercel.app) |
| **KeeprSubscriptionHelper** | Starknet Mainnet | `0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1` | [Voyager ↗](https://voyager.online/contract/0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1) · [Starkscan ↗](https://starkscan.co/contract/0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1) |
| **Helper Class Hash** | Starknet Mainnet | `0x3c78baa25d7dbf1240c33c74980d2071dff2e0b7f8971fd5822137eb2e7e28b` | [Class on Voyager ↗](https://voyager.online/class/0x3c78baa25d7dbf1240c33c74980d2071dff2e0b7f8971fd5822137eb2e7e28b) |
| **STRK20 Privacy Pool** | Starknet Mainnet | `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a` | [Pool on Voyager ↗](https://voyager.online/contract/0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a) |
| **STRK Token** | Starknet Mainnet | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` | [STRK on Voyager ↗](https://voyager.online/contract/0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d) |
| **ETH Token** | Starknet Mainnet | `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7` | [ETH on Voyager ↗](https://voyager.online/contract/0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7) |

---

## Core Architecture & Cryptographic Primitives

```
                            ┌─────────────────────────────────────────────────────────┐
                            │                     READY X WALLET                      │
                            │   (Shielded Balance & STRK20 Privacy Pool Storage)     │
                            └────────────────────────────┬────────────────────────────┘
                                                         │
                                          [Atomic STRK20 Action Batch]
                                          1. Withdraw -> Helper
                                          2. Transfer -> Creator (OPEN Note)
                                          3. Invoke   -> Helper (privacy_invoke)
                                                         │
                                                         ▼
     ┌───────────────────────────────┐          ┌─────────────────────────────────────┐
     │      KEEPR CLIENT CORE        │          │      KEEPR SUBSCRIPTION HELPER      │
     │  (Poseidon Hashing & Salts)   │          │         (Cairo Smart Contract)      │
     │ ───────────────────────────── │          │ ─────────────────────────────────── │
     │ • Salt: s ∈ 𝔽_p (Ephemeral)   │ ───────► │ • sub_id = Poseidon(wallet, salt)   │
     │ • Secret: k ∈ 𝔽_p (Cancel key)│          │ • auth_commit = Poseidon(secret)    │
     │ • auth_commit = Poseidon(k)   │          │ • creator_note_id (Private Inflow)  │
     └───────────────────────────────┘          └──────────────────┬──────────────────┘
                                                                   │
                                                 [Autonomous Keeper Monitoring]
                                                                   │
                                                                   ▼
                                                ┌─────────────────────────────────────┐
                                                │        KEEPR DAEMON ENGINE          │
                                                │ ─────────────────────────────────── │
                                                │ • Event Scanner (getEvents RPC)     │
                                                │ • Timeline Validator (now >= due)   │
                                                │ • Safety Rail Enforcement           │
                                                │ • Paymaster-Sponsored Renewals      │
                                                └─────────────────────────────────────┘
```

### 1. Blinded Subscriptions (`sub_id`)
Subscribers never register their public wallet address on the contract. Instead, the client generates a 250-bit cryptographic salt $s$ locally and derives:
$$\text{sub\_id} = \text{Poseidon}(\text{validateAddress}(\text{wallet}), s)$$
The helper contract and indexers only store $\text{sub\_id}$, making it impossible to reconstruct or link subscriber wallets from on-chain data.

### 2. Zero-Knowledge Cancel Preimages (`auth_commit` & `auth_preimage`)
To revoke a subscription without proving identity:
- During subscription, the client generates a secret $k$ and submits $\text{auth\_commit} = \text{Poseidon}(k)$.
- To cancel, the client provides $k$ as `auth_preimage`. The Cairo contract verifies $\text{Poseidon}(k) == \text{auth\_commit}$ before marking the subscription inactive.
- No third party or keeper can forge cancellation.

### 3. Atomic STRK20 Privacy Pool Multi-Call
Subscribing executes an atomic 3-step action sequence via Ready X:
1. **`withdraw`**: Moves required STRK from the user's shielded note to the Helper contract.
2. **`transfer`**: Creates an `OPEN` note transfer addressed to the creator.
3. **`invoke`**: Calls `KeeprSubscriptionHelper.privacy_invoke(op=0, ...)` to record state and credit the creator's note.

### 4. Real-Time Balance Synchronization
- **Silent Transparent Polling**: Public STRK and ETH balances are retrieved via direct Starknet JSON-RPC (`balanceOf`), avoiding repetitive wallet approval popups.
- **Single-Prompt Shielded Query**: Shielded pool balance is queried via `walletAccount.strk20Balances([STRK_TOKEN, ETH_TOKEN])` only on connect, post-transaction, or explicit user sync.

---

## Active Channels

Keepr features 4 production-grade channels spanning autonomous agents, intelligence, archival research, and algorithmic design:

| Channel | Category | Description | Monthly Tiers |
|:---|:---|:---|:---|
| **Aegis Sentinel** (`aegis`) | Risk & Liquidity | Autonomous on-chain risk monitor & liquidation alerting agent for Starknet DeFi protocols. | • Pulse: 15 STRK<br />• Shield: 45 STRK<br />• Citadel: 120 STRK |
| **Cipher Brief** (`cipher`) | Intelligence | Daily zero-knowledge intelligence, MEV tracking, dark-pool volume alerts, and governance audits. | • Dispatch: 20 STRK<br />• Wire: 60 STRK<br />• Terminal: 180 STRK |
| **The Archive** (`archive`) | Deep Research | Curated decentralized storage of cryptographic papers, Cairo research, and zero-knowledge benchmarks. | • Reader: 10 STRK<br />• Scholar: 30 STRK<br />• Custodian: 90 STRK |
| **Vellum Studio** (`vellum`) | Creative Studio | Generative algorithmic art atelier, SVG vector releases, and high-resolution digital print drops. | • Patron: 25 STRK<br />• Collector: 75 STRK<br />• Master: 200 STRK |

---

## Autonomous Keeper Daemon (`keeper/`)

An autonomous off-chain renewal daemon designed to monitor and trigger zero-knowledge recurring subscription renewals on Starknet.

### Key Capabilities
- **Payer Privacy Preserved**: Operates exclusively using deterministic subscription IDs (`sub_id`).
- **Autonomous Scan & Discovery**: Discovers active subscriptions via on-chain `Subscribed` events from the helper contract.
- **Safety Rails**:
  - Rejects renewing amounts exceeding `maxRenewAmountStrk` (default: 500 STRK).
  - Validates `now >= last_renewed + period` directly against on-chain contract state.
  - Skips inactive or cancelled subscriptions.
- **Dry-Run Simulation**: Supports simulated execution of `privacy_invoke(op=1)` for safe local monitoring without gas costs.

```bash
# Run standalone dry-run scan
npm run dry-run --prefix keeper

# Monitor a specific subscription sub_id
npx ts-node keeper/src/index.ts 0x1234...
```

---

## Verification & Gate Integration (`/verify`)

Services (Discord bots, Telegram gates, web APIs) verify tier access with zero knowledge of the payer's identity:

1. Gate presents an challenge string (e.g. `keepr:gate:cipher:verify`).
2. Client signs the challenge in-browser with zero leakage of private balances or identity.
3. Gate calls `is_active(sub_id)` and `get_subscription(sub_id)` on the deployed Helper contract.
4. Gate grants role or access token based on verified tier without learning payer wallet, total balance, or transaction history.

---

## Quick Start

### Prerequisites
- Node.js 20+
- Ready Wallet ([Chrome Web Store](https://chromewebstore.google.com/detail/ready-wallet/hkeaflfmepelbhgkhkbfmfbkkblhcfkn)) or Starknet-compatible wallet
- Starknet RPC provider URL (Alchemy, Nethermind Juno, or Blast API)

### Installation & Local Setup

```bash
# 1. Clone repository
git clone https://github.com/Cryptojigi/keepr.git
cd keepr

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local

# Edit .env.local:
# NEXT_PUBLIC_PROVIDER_URL=https://starknet-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# 4. Start local development server
npm run dev

# 5. Open browser
# Visit http://localhost:3000
```

### Production Build & Linting

```bash
# Validate production bundle
npm run build

# Run lint checks
npm run lint
```

---

## Project Structure

```
keepr/
├── cairo/                          # Cairo 2.18 Smart Contracts
│   ├── src/
│   │   └── lib.cairo               # KeeprSubscriptionHelper contract & interfaces
│   └── Scarb.toml                  # Scarb package configuration
├── keeper/                         # Autonomous 24/7 Keeper Renewal Daemon
│   ├── src/
│   │   ├── keeper.ts               # Core monitoring, event discovery & evaluation engine
│   │   ├── index.ts                # Daemon CLI entrypoint
│   │   └── types.ts                # Keeper configuration and decision log types
│   ├── package.json
│   └── README.md
├── src/
│   ├── app/
│   │   ├── creator/page.tsx        # Creator viewing-key portal & private MRR analytics
│   │   ├── dashboard/page.tsx      # Subscriber vault, active channels & cancellation
│   │   ├── docs/page.tsx           # Full 8-section protocol documentation & guide
│   │   ├── subscribe/page.tsx      # Channel selector, tier picker & atomic STRK20 subscribe
│   │   ├── verify/page.tsx         # Zero-knowledge gate verification & pass generator
│   │   ├── globals.css             # Theme tokens, font variables & brutalist styling
│   │   ├── layout.tsx              # Root layout, typography imports & toast provider
│   │   └── page.tsx                # Protocol landing page with animated hero canvas
│   ├── components/
│   │   ├── hero-canvas.tsx         # GPU-accelerated organic blob canvas animation
│   │   ├── vault-strip.tsx         # Real-time balances, auto-renew status & quick shield chips
│   │   ├── site-header.tsx         # Responsive navigation & mobile wallet drawer
│   │   ├── site-footer.tsx         # Deep wine accent footer & protocol reference links
│   │   └── ...
│   └── lib/keepr/
│       ├── constants.ts            # Contract addresses, token hashes & pool references
│       ├── data.ts                 # 4 showcase channels, tier rate books & keeper feed
│       ├── errors.ts               # Actionable Starknet & Ready X error translator
│       ├── format.ts               # Currency, countdown, serial & date formatters
│       ├── onchain.ts              # Poseidon hashing, RPC callers & STRK20 action builders
│       ├── store.ts                # Zustand store with encrypted local persistence
│       └── types.ts                # TypeScript domain models
├── strk20.json                     # Hackathon submission metadata & transaction hashes
└── README.md
```

---

## Hackathon Submission & Deliverables

- **Track**: STRK20 Private Sprint Hackathon (RFP-12: Private Subscriptions)
- **Submission Metadata**: [`strk20.json`](./strk20.json)
- **Deployed Helper**: [`0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1`](https://voyager.online/contract/0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1)
- **Live Demo URL**: [https://keepr-eta.vercel.app](https://keepr-eta.vercel.app)
- **License**: [MIT](./LICENSE)
