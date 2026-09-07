# Keepr — Private Subscription Payments on STRK20

<p align="center">
  <img src="public/favicon.svg" alt="Keepr Logo" width="80" height="80" />
</p>

<p align="center">
  <strong>Private, recurring subscription protocol for AI agents, research publications, and digital creators on Starknet.</strong><br />
  Shield STRK tokens · Subscribe to channels · Auto-renew via keepers · Prove tier access with zero-knowledge proofs without revealing wallet addresses.
</p>

<p align="center">
  <a href="https://keepr-eta.vercel.app"><img src="https://img.shields.io/badge/Live_App-keepr--eta.vercel.app-64181a?style=flat-square" alt="Live App" /></a>
  <a href="https://voyager.online/contract/0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1"><img src="https://img.shields.io/badge/Starknet_Mainnet-0x02f2...7fa1-2f4a32?style=flat-square" alt="Starknet Mainnet Contract" /></a>
  <a href="https://strk20.starknet.io"><img src="https://img.shields.io/badge/Protocol-STRK20_Privacy_Pool-64181a?style=flat-square" alt="STRK20" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-gray?style=flat-square" alt="License" /></a>
</p>

---

## What is Keepr?

**Keepr** is an autonomous, privacy-preserving subscription and software licensing protocol built on [STRK20](https://strk20.starknet.io) (Starknet's unified privacy pool) and deployed live on **Starknet Mainnet**. Inspired by [RFP-12: Private Subscriptions](https://strk20.starknet.io/rfp/private-subscriptions), Keepr eliminates public address tracking, balance inspection, and identity leakage from digital commerce.

In legacy web3 models, subscribing to a service permanently links your public wallet address and net worth to that creator. With Keepr:
1. **Payers remain completely anonymous**: Payments originate from shielded pool notes. Subscriptions use blinded identities derived with Poseidon hashes (`sub_id = Poseidon(wallet, salt)`).
2. **Creators receive direct, untraceable revenue**: 100% of payments route directly into creator notes or designated payout addresses with **0% protocol fees** on Mainnet v1.
3. **Renewals happen autonomously**: An off-chain **Keeper Daemon** triggers recurring renewals via scoped session keys without exposing the payer's private keys.
4. **Gates verify cryptographically**: External bots (Discord, Telegram) and API gateways verify access via zero-knowledge challenge proofs rather than balance or transaction history scanning.

---

## Verified Mainnet Deployments & Transactions

Keepr is fully deployed and verified on **Starknet Mainnet**.

### Deployed Contracts

| Component | Network | Address / Hash | Explorer Links |
|:---|:---|:---|:---|
| **KeeprSubscriptionHelper** | Starknet Mainnet | `0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1` | [Voyager ↗](https://voyager.online/contract/0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1) · [Starkscan ↗](https://starkscan.co/contract/0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1) |
| **Helper Class Hash** | Starknet Mainnet | `0x3c78baa25d7dbf1240c33c74980d2071dff2e0b7f8971fd5822137eb2e7e28b` | [Voyager ↗](https://voyager.online/class/0x3c78baa25d7dbf1240c33c74980d2071dff2e0b7f8971fd5822137eb2e7e28b) |
| **STRK20 Privacy Pool** | Starknet Mainnet | `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a` | [Voyager ↗](https://voyager.online/contract/0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a) |
| **STRK Token (ERC-20)** | Starknet Mainnet | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` | [Voyager ↗](https://voyager.online/contract/0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d) |

### Verified On-Chain Transactions (Live Execution Proofs)

All protocol phases have been executed and confirmed on-chain on Starknet Mainnet:

| # | Action | Transaction Hash | Status & Block | Purpose & Verifiable Data |
|:---:|:---|:---|:---|:---|
| 1 | **Class Declaration** | [`0x03400b...c7f41`](https://voyager.online/tx/0x03400b396748d7a674ab1dae92e31a7d0fdea8aff84a2777c1377016556c7f41) | `ACCEPTED_ON_L2` | Declares Cairo 2.18 contract class hash `0x3c78...28b` on Mainnet. |
| 2 | **Contract Deployment** | [`0x0249b3...72795`](https://voyager.online/tx/0x0249b376dd445fa87dcd03fcafcc09d820437dd72db8d1704ea2e1a4d3372795) | `ACCEPTED_ON_L2` | Deploys `KeeprSubscriptionHelper` initialized with STRK20 pool references. |
| 3 | **First Live Subscription** | [`0x051dd8...75055`](https://voyager.online/tx/0x051dd8a3f97b1186d2220b784828a0387f3cc4e6842e46b454cd466151375055) | `ACCEPTED_ON_L2`<br />(Block 14,111,530) | Subscribes to Vellum Studio (2 STRK / 30 days) via atomic note transfer. |
| 4 | **Subscription Renewal** | [`0x066212...deebd`](https://voyager.online/tx/0x0662126a9d83307620d6c404cd55eddfb0d1424fab6730bed556a94c265deebd) | `ACCEPTED_ON_L2` | Recurring renewal transaction demonstrating active subscription lifecycle. |
| 5 | **STRK20 Note Transfer Multi-Call** | [`0x016c76...33d0e`](https://voyager.online/tx/0x016c7695ad420a0172ab4827165529764d5647eee26906398f297f345b433d0e) | `ACCEPTED_ON_L2` | Multi-call batch executing private shielded note transfer and registration. |
| 6 | **ZK Preimage Cancellation** | [`0x015e03...d1235`](https://voyager.online/tx/0x015e0367eb7833e71e64d436c0052f2bd3ecbd72ab358de4c368c8024c5d1235) | `ACCEPTED_ON_L2`<br />(Block 14,253,642) | Revokes subscription using zero-knowledge Poseidon preimage cancellation. |

---

## Core Architecture

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
Subscribers never submit their public Starknet address to the contract. Instead, the browser computes a deterministic Poseidon hash:
$$\text{sub\_id} = \text{Poseidon}(\text{cleanAddress}(\text{wallet}), \text{felt}(\text{channelId}))$$
The smart contract and indexers only record $\text{sub\_id}$. Even with full access to the blockchain ledger, third parties cannot identify the subscriber.

### 2. Zero-Knowledge Cancel Preimages (`auth_commit`)
Subscribers generate a secret key $k$ locally upon subscribing. The contract stores only the hash $\text{auth\_commit} = \text{Poseidon}(k)$. When canceling, the user presents $k$. The Cairo contract verifies $\text{Poseidon}(k) == \text{auth\_commit}$ before inactivating the subscription. No third party or keeper can forge cancellation.

### 3. Global Yellow-Pages & Zero-Database Subscriber Privacy
Keepr decouples discovery from subscriber identity:
- **Creators Broadcast Publicly**: Channels and lifetime access passes are stored in a public directory so users across any computer can explore and subscribe.
- **Zero Database Records for Subscribers**: Subscribers NEVER write to a centralized database. Subscription state is verified directly from Starknet RPC nodes using the blinded `sub_id`.

### 4. Lifetime Access Passes & Licenses
In addition to recurring monthly tiers, creators can issue permanent lifetime access passes and digital licenses. Buyers pay a one-time STRK fee, and the permanent access entitlement is stored in their subscriber vault.

---

## Running the Autonomous Keeper Daemon

The Keeper Daemon monitors on-chain events and executes scheduled renewals for expiring channels:

```bash
# 1. Navigate to keeper directory
cd keeper

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Copy keeper/.env.example to keeper/.env:
# STARKNET_RPC_URL=https://starknet-mainnet.g.alchemy.com/v2/YOUR_KEY
# KEEPER_PRIVATE_KEY=0x...
# KEEPER_ACCOUNT_ADDRESS=0x...

# 4. Run keeper in evaluation mode (one-shot check)
npm run check

# 5. Run keeper daemon in continuous background loop (60s intervals)
npm run start
```

---

## Quick Start (Web Application)

### Prerequisites
- Node.js 20+
- Ready Wallet ([Chrome Web Store](https://chromewebstore.google.com/detail/ready-wallet/hkeaflfmepelbhgkhkbfmfbkkblhcfkn)) or Starknet-compatible wallet
- Starknet Mainnet RPC endpoint (Alchemy, Nethermind Juno, Blast API)

### Local Setup

```bash
# 1. Clone repository
git clone https://github.com/Cryptojigi/keepr.git
cd keepr

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Add your RPC endpoint and Supabase keys in .env.local

# 4. Start local development server
npm run dev

# 5. Open in browser
# http://localhost:3000
```

---

## Developer SDK & Verification (`/verify`)

Integrate gated access into Discord bots, Telegram channels, or API servers in 5 lines of code:

```typescript
import { RpcProvider } from "starknet";

const HELPER_ADDRESS = "0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1";
const provider = new RpcProvider({ nodeUrl: "https://starknet-mainnet.g.alchemy.com/v2/YOUR_KEY" });

// Pure zero-knowledge verification: zero database queries needed
export async function isSubscriptionActive(subId: string): Promise<boolean> {
  const res = await provider.callContract({
    contractAddress: HELPER_ADDRESS,
    entrypoint: "is_active",
    calldata: [subId],
  });
  return res.result[0] === "0x1";
}
```

Interactive snippets in **TypeScript**, **Python** (`starknet-py`), and **cURL** / JSON-RPC are available at [`/verify`](https://keepr-eta.vercel.app/verify).

---

## Legal Notice & Protocol Disclaimer

> [!IMPORTANT]
> **PLEASE READ THIS NOTICE CAREFULLY BEFORE USING OR INTERACTING WITH THE KEEPR PROTOCOL.**

1. **Non-Custodial Cryptographic Infrastructure**: Keepr is an autonomous, open-source software protocol composed of smart contracts on the Starknet network and client-side interfaces. At no point does Keepr, its developers, contributors, or affiliated entities hold, custody, manage, escrow, or control user funds, private keys, or digital assets. All transactions settle peer-to-peer directly between user wallets, the STRK20 Privacy Pool, and creator payout addresses.

2. **No Financial or Intermediary Services**: Keepr is not a bank, broker, money transmitter, custodian, payment service provider, or financial institution. The software does not provide financial, legal, investment, or tax advice. Users are solely responsible for managing their private keys, session keys, and cancellation secrets, and for ensuring their transactions comply with applicable local laws, regulations, and tax reporting requirements in their jurisdiction.

3. **Autonomous and Experimental Technology**: The protocol operates on Starknet Mainnet and utilizes cryptographic privacy pools and zero-knowledge primitives. While contracts are verified on-chain, all blockchain-based software carries inherent technical risks, including potential smart contract vulnerabilities, network congestion, changes to underlying L2 protocols, and third-party RPC downtimes. The software is provided **"AS IS" and "AS AVAILABLE"**, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement.

4. **Independent Creator Services**: Keepr acts strictly as a decentralized payment and verification rail. Content creators, publishers, and AI agents operating channels or vending lifetime passes on Keepr are completely independent third parties. Keepr does not endorse, curate, moderate, audit, or assume liability for the accuracy, legality, or availability of any third-party services, gated URLs, external content, or digital deliverables provided by creators.

5. **Assumption of Risk**: By connecting a wallet, shielding assets, subscribing to a channel, or vending access passes on Keepr, you acknowledge and agree that you understand the mechanics of Starknet, zero-knowledge proofs, and cryptographic notes, and you accept full responsibility for any risks, losses, or costs associated with your use of the protocol.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.
