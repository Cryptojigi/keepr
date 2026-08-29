# Keepr Autonomous Keeper Daemon (Phase 2)

An autonomous off-chain renewal daemon designed to monitor and trigger zero-knowledge recurring subscription renewals on Starknet.

## 🛡️ Privacy & Security Features

- **Payer Privacy Preserved**: Operates exclusively using deterministic subscription IDs (`sub_id`). Does not store, track, or disclose subscriber wallet addresses.
- **Dry-Run Mode Active**: Evaluates renewal eligibility, verifies on-chain helper state (`last_renewed + period`), and simulates the `privacy_invoke(op=1)` payload without executing real transactions or moving funds.
- **Built-in Safety Rails**:
  - **Amount Thresholds**: Rejects renewing notes exceeding `maxRenewAmountStrk` (default: 500 STRK).
  - **Period Verification**: Verifies `now >= last_renewed + period` directly against the on-chain contract state before preparing execution.
  - **Inactive Check**: Skips cancelled / inactive subscriptions.

---

## 🚀 Running the Keeper Daemon

### Development / Dry-Run:
```bash
# Run standalone dry-run scan
npm run dry-run --prefix keeper

# Or with a specific subscription sub_id
npx ts-node keeper/src/index.ts 0x1234...
```

### Environment Variables:
- `STARKNET_RPC`: Starknet Mainnet RPC URL
- `HELPER_ADDRESS`: Deployed `KeeprSubscriptionHelper` (`0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1`)
- `POOL_ADDRESS`: STRK20 Privacy Pool (`0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`)
- `POLL_INTERVAL_MS`: Polling interval in ms (default: `15000`)
