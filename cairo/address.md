# KeeprSubscriptionHelper — MAINNET

- Class hash: `0x3c78baa25d7dbf1240c33c74980d2071dff2e0b7f8971fd5822137eb2e7e28b`
- Contract: `0x02f20862a7c41ac5103efc0d0dda7afcfe60f5b861ccaab9d08937526f727fa1`
- Declare tx: `0x03400b396748d7a674ab1dae92e31a7d0fdea8aff84a2777c1377016556c7f41`
- Deploy tx: `0x0249b376dd445fa87dcd03fcafcc09d820437dd72db8d1704ea2e1a4d3372795`
- Smoke test: `is_active(0x123)` → `false` ✅

## First live transaction (pool → helper)

- Subscribe tx: `0x051dd8a3f97b1186d2220b784828a0387f3cc4e6842e46b454cd466151375055`
- Status: `ACCEPTED_ON_L2` (block 14,111,530) ✅
- Flow: STRK20 pool → `privacy_invoke(op=0)` — VELLUM Studio, 2 STRK, 30-day period
- Helper emitted `Subscribed` (sub_id in keys, amount 2 STRK, period 2,592,000 s)
- Fee: ~3.12 STRK (paid in STRK)

Do not call the echo helper.
