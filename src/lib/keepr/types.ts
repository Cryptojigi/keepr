export type TierId = 0 | 1 | 2;

export type CreatorRate = {
  id: TierId;
  name: string;
  strk: number;
};

export type Tier = {
  id: TierId;
  name: string;
  usd: number;
  strk: number;
  periodDays: number;
  blurb: string;
  features: string[];
};

export type Creator = {
  id: string;
  name: string;
  handle: string;
  category: string;
  blurb: string;
  subscribers: number;
  mrrStrk: number;
  address: string;
};

export type Subscription = {
  id: string;
  creatorId: string;
  tier: TierId;
  amountStrk: number;
  startedAt: number;
  lastRenewedAt: number;
  nextRenewalAt: number;
  active: boolean;
  autoRenew: boolean;
  txHash: string;
  authSecret?: string;
  salt?: string;
  creatorAddress?: string;
};

export type KeeperEvent = {
  at: number;
  action: "renew" | "skip" | "cancel" | "subscribe";
  subId: string;
  detail: string;
  status: "ok" | "hold" | "fail";
};

export type IncomeReceipt = {
  id: string;
  period: string;
  amountStrk: number;
  channels: number;
  createdAt: number;
};
