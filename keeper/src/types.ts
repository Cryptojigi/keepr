export interface KeeperConfig {
  rpcUrl: string;
  helperAddress: string;
  poolAddress: string;
  pollIntervalMs: number;
  dryRun: boolean;
  maxRenewAmountStrk: number;
  minPeriodSeconds: number;
}

export interface SubscriptionRecord {
  subId: string;
  creator: string;
  tier: number;
  amount: bigint;
  period: number;
  lastRenewed: number;
  active: boolean;
  creatorNoteId: string;
  authCommit: string;
}

export interface DecisionLog {
  timestamp: string;
  subId: string;
  action: "SCAN" | "HOLD" | "ELIGIBLE" | "RENEW_SIMULATED" | "SKIPPED_INACTIVE" | "REJECTED_SAFETY";
  reason: string;
  record?: {
    creator: string;
    tier: number;
    amountStrk: number;
    lastRenewed: string;
    nextDue: string;
    active: boolean;
  };
  calldataPreview?: string[];
}
