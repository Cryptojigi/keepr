# Keepr Integration Guide

> Plug private, recurring payments into your site, bot, or API — in one afternoon.
> Keepr is a live Starknet mainnet contract + TypeScript SDK. Your users pay from shielded
> balances (nobody sees who paid); your gate verifies active subscriptions without learning
> the subscriber's identity.

## Live addresses (Starknet mainnet)

| Piece | Address |
|---|---|
| STRK20 privacy pool | `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a` |
| Keepr subscription helper | `0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1` |
| STRK token | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |

You deploy nothing. The helper is shared infrastructure — anyone can plug in.

## The three integration surfaces

### 1. Web checkout (subscribe in your frontend)

The subscriber's wallet (Ready/Argent/Braavos) executes a STRK20 private invoke. The
SDK builds the action list; the wallet signs and shields the payment automatically.

```ts
import { computeSubId, computeAuthCommit, buildSubscribeActions } from "./lib/keepr/onchain";

const salt = crypto.getRandomValues(new Uint32Array(4)).join("-");
const cancelSecret = crypto.randomUUID();
const subId = computeSubId(userWalletAddress, salt);      // h(wallet, salt) — never the wallet
const authCommit = computeAuthCommit(cancelSecret);       // h(cancel_secret) — cancel authority

const actions = buildSubscribeActions({
  creatorAddress: YOUR_CREATOR_ADDRESS,  // receives shielded income
  tierId: 1,
  amountStrk: 10,
  subId,
  authCommit,
});

// Wallet signs + shields. The helper records the subscription and credits your note.
await walletAccount.execute({ actions }); // strk20InvokeTransaction under the hood
```

- The wallet address never leaves the browser.
- `sub_id` is an opaque pseudonym — the public ledger shows no payer identity.
- Cancel = prove `cancel_secret` (the auth preimage). Your user can cancel in one click.

### 2. API / bot gate (verify access)

```ts
import { isActiveOnchain, getSubscriptionOnchain } from "./lib/keepr/onchain";

const active = await isActiveOnchain(subId);              // bool, live contract read
if (!active) return 403;
const record = await getSubscriptionOnchain(subId);       // { creator, tier, amount, period, lastRenewed, active, creatorNoteId, authCommit }
```

- `is_active(sub_id)` returns `false` for cancelled **and expired** subs (period-checked on-chain).
- The verifier learns the subscription status — never the wallet. No wallet scanning.
- Drop this behind a Telegram/Discord bot role grant, a SaaS paywall, or an API middleware.

### 3. Keeper (auto-renewal)

Run the keeper daemon (`keeper/`) to renew due subscriptions automatically:

```bash
STARKNET_RPC=... npm run keeper -- --dry-run   # audit mode first
```

It polls the helper, finds subs where `last_renewed + period ≤ now`, and executes renewals
via session-key authorization. Safety rails are hard-coded (per-renewal cap, rate limits,
full decision logging). Session-key/paymaster execution is the documented v2 path.

## Contract interface (for direct integration)

```
privacy_invoke(token, pool_address, op, sub_id, creator, tier, amount, period, creator_note_id, auth_commit, auth_preimage)
  op 0 = Subscribe · 1 = Renew · 2 = Cancel (returns empty deposit span, moves 0 tokens)

get_subscription(sub_id) -> { creator, tier, amount, period, last_renewed, active, creator_note_id, auth_commit }
is_active(sub_id)        -> bool  (active AND within period)
get_invoke_count()       -> u64
```

**Privacy rules (contract-enforced):** never reads/stores `tx_info`; stores only
`h(wallet, salt)`; events carry `sub_id`, never a wallet. Submitter privacy depends on
relayed submission (paymaster) — use one for production traffic.

## v2 roadmap (post-sprint)

- WalletConnect for mobile deep-link checkout
- Membership STARK proof (verifier learns nothing, not even `sub_id`) over a Merkle set of active ids
- Telegram/Discord reference bots (thin adapters over the same verifier)

## License

MIT. Contract verified on Voyager; class hash `0x3c78baa25d7dbf1240c33c74980d2071dff2e0b7f8971fd5822137eb2e7e28b`.
