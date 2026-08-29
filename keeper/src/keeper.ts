import { num, RpcProvider } from "starknet";
import type { DecisionLog, KeeperConfig, SubscriptionRecord } from "./types";

export class KeeprDaemon {
  private provider: RpcProvider;
  private config: KeeperConfig;
  private trackedSubs: Set<string> = new Set();
  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(config: KeeperConfig) {
    this.config = config;
    this.provider = new RpcProvider({ nodeUrl: config.rpcUrl });
  }

  /**
   * Add a known subscription sub_id to monitor.
   */
  public registerSub(subId: string): void {
    const clean = num.toHex(subId);
    this.trackedSubs.add(clean);
    this.logDecision({
      timestamp: new Date().toISOString(),
      subId: clean,
      action: "SCAN",
      reason: `Registered subscription sub_id for keeper monitoring`,
    });
  }

  /**
   * Discover subscriptions by querying events from the KeeprSubscriptionHelper contract.
   */
  public async discoverSubscriptions(): Promise<void> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, blockNumber - 5000);

      // Query contract events
      const eventsRes = await this.provider.getEvents({
        address: this.config.helperAddress,
        from_block: { block_number: fromBlock },
        to_block: "latest",
        chunk_size: 100,
      });

      if (eventsRes && eventsRes.events) {
        for (const evt of eventsRes.events) {
          // In Starknet events, evt.keys[0] is selector, evt.keys[1] is #[key] sub_id
          if (evt.keys && evt.keys.length > 1) {
            const subId = evt.keys[1];
            if (subId && BigInt(subId) !== 0n) {
              this.trackedSubs.add(num.toHex(subId));
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[KEEPER] Event discovery notice: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Query contract state for a single subscription.
   */
  public async fetchSubscription(subId: string): Promise<SubscriptionRecord | null> {
    try {
      const cleanSubId = num.toHex(subId);
      const res = await this.provider.callContract({
        contractAddress: this.config.helperAddress,
        entrypoint: "get_subscription",
        calldata: [cleanSubId],
      });

      if (!res || res.length < 8) return null;

      const active = res[5] === "0x1" || BigInt(res[5]) === 1n;
      // Uninitialized record
      if (BigInt(res[0]) === 0n && !active) return null;

      return {
        subId: cleanSubId,
        creator: res[0],
        tier: Number(BigInt(res[1])),
        amount: BigInt(res[2]),
        period: Number(BigInt(res[3])),
        lastRenewed: Number(BigInt(res[4])),
        active,
        creatorNoteId: res[6],
        authCommit: res[7],
      };
    } catch (err) {
      console.error(`[KEEPER] Failed to query subscription ${subId}:`, err);
      return null;
    }
  }

  /**
   * Evaluate a subscription against renewal timeline and safety rails.
   */
  public evaluateSubscription(record: SubscriptionRecord): DecisionLog {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const amountStrk = Number(record.amount) / 1e18;
    const nextDueSeconds = record.lastRenewed + record.period;
    const isDue = nowSeconds >= nextDueSeconds;

    const baseRecordSummary = {
      creator: record.creator,
      tier: record.tier,
      amountStrk,
      lastRenewed: new Date(record.lastRenewed * 1000).toISOString(),
      nextDue: new Date(nextDueSeconds * 1000).toISOString(),
      active: record.active,
    };

    // Safety Rail 1: Record must be active
    if (!record.active) {
      return {
        timestamp: new Date().toISOString(),
        subId: record.subId,
        action: "SKIPPED_INACTIVE",
        reason: "Subscription is cancelled or inactive.",
        record: baseRecordSummary,
      };
    }

    // Safety Rail 2: Amount cap check
    if (amountStrk > this.config.maxRenewAmountStrk) {
      return {
        timestamp: new Date().toISOString(),
        subId: record.subId,
        action: "REJECTED_SAFETY",
        reason: `Amount (${amountStrk} STRK) exceeds max keeper threshold (${this.config.maxRenewAmountStrk} STRK).`,
        record: baseRecordSummary,
      };
    }

    // Safety Rail 3: Minimum period check
    if (record.period < this.config.minPeriodSeconds) {
      return {
        timestamp: new Date().toISOString(),
        subId: record.subId,
        action: "REJECTED_SAFETY",
        reason: `Period (${record.period}s) is shorter than minimum allowed (${this.config.minPeriodSeconds}s).`,
        record: baseRecordSummary,
      };
    }

    // Not yet due
    if (!isDue) {
      const remainingMinutes = Math.max(0, Math.round((nextDueSeconds - nowSeconds) / 60));
      return {
        timestamp: new Date().toISOString(),
        subId: record.subId,
        action: "HOLD",
        reason: `Not due yet. Due in ~${remainingMinutes} minutes (${new Date(nextDueSeconds * 1000).toLocaleTimeString()}).`,
        record: baseRecordSummary,
      };
    }

    // Due for renewal!
    const calldataPreview = [
      num.toHex(this.config.helperAddress), // contract
      "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d", // token (STRK)
      num.toHex(this.config.poolAddress), // pool
      "0x1", // op = 1 (OP_RENEW)
      record.subId,
      record.creator,
      num.toHex(record.tier),
      num.toHex(record.amount),
      num.toHex(record.period),
      record.creatorNoteId,
      "0x0", // auth_commit unused on renew
      "0x0", // auth_preimage unused on renew
    ];

    return {
      timestamp: new Date().toISOString(),
      subId: record.subId,
      action: "ELIGIBLE",
      reason: `Renewal period elapsed! Due since ${new Date(nextDueSeconds * 1000).toISOString()}. Ready for keeper execution.`,
      record: baseRecordSummary,
      calldataPreview,
    };
  }

  /**
   * Run one full monitoring cycle across all tracked subscriptions.
   */
  public async tick(): Promise<DecisionLog[]> {
    const logs: DecisionLog[] = [];
    console.log(`\n================ [KEEPER DAEMON SCAN @ ${new Date().toLocaleTimeString()}] ================`);
    console.log(`📡 Helper Contract: ${this.config.helperAddress}`);
    console.log(`🛡️ STRK20 Privacy Pool: ${this.config.poolAddress}`);
    console.log(`⚙️ Mode: ${this.config.dryRun ? "DRY-RUN (Simulated Executions Only)" : "LIVE EXECUTION"}`);
    console.log(`🔍 Tracked Channels / Subscriptions: ${this.trackedSubs.size}`);

    // If no subscriptions tracked yet, register sample demo / test sub
    if (this.trackedSubs.size === 0) {
      console.log(`ℹ️ No active subscriptions in local cache. Discovering on-chain events…`);
      await this.discoverSubscriptions();
    }

    for (const subId of this.trackedSubs) {
      const record = await this.fetchSubscription(subId);
      if (!record) {
        const log: DecisionLog = {
          timestamp: new Date().toISOString(),
          subId,
          action: "SCAN",
          reason: "No on-chain record found for this sub_id.",
        };
        logs.push(log);
        this.logDecision(log);
        continue;
      }

      const decision = this.evaluateSubscription(record);
      logs.push(decision);
      this.logDecision(decision);
    }

    console.log(`=========================================================================\n`);
    return logs;
  }

  /**
   * Output decision to terminal and structured log.
   */
  private logDecision(log: DecisionLog): void {
    const prefix = `[${log.action}]`.padEnd(16);
    const subShort = log.subId.length > 14 ? `${log.subId.slice(0, 8)}…${log.subId.slice(-4)}` : log.subId;

    if (log.action === "ELIGIBLE") {
      console.log(`\x1b[32m✨ ${prefix} sub_id: ${subShort} | ${log.reason}\x1b[0m`);
      if (log.calldataPreview) {
        console.log(`   \x1b[33m⚡ Dry-Run Privacy Invoke Payload: [${log.calldataPreview.join(", ")}]\x1b[0m`);
      }
    } else if (log.action === "HOLD") {
      console.log(`\x1b[36m⏳ ${prefix} sub_id: ${subShort} | ${log.reason}\x1b[0m`);
    } else if (log.action === "SKIPPED_INACTIVE") {
      console.log(`\x1b[90m⏸️  ${prefix} sub_id: ${subShort} | ${log.reason}\x1b[0m`);
    } else if (log.action === "REJECTED_SAFETY") {
      console.log(`\x1b[31m🚨 ${prefix} sub_id: ${subShort} | ${log.reason}\x1b[0m`);
    } else {
      console.log(`ℹ️  ${prefix} sub_id: ${subShort} | ${log.reason}`);
    }
  }

  /**
   * Start the continuous daemon loop.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`🚀 Keepr Autonomous Keeper Daemon started (polling every ${this.config.pollIntervalMs / 1000}s)`);

    void this.tick();
    this.pollTimer = setInterval(() => {
      void this.tick();
    }, this.config.pollIntervalMs);
  }

  /**
   * Stop the daemon.
   */
  public stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isRunning = false;
    console.log(`🛑 Keepr Daemon stopped.`);
  }
}
