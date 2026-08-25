import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEMO_ADDRESS, PERIOD_MS } from "./constants";
import { cloneRates, creatorById, rateById } from "./data";
import type { CreatorRate, Subscription, TierId } from "./types";

type KeeprStore = {
  hasHydrated: boolean;
  connected: boolean;
  address: string;
  publicStrk: number;
  shieldedStrk: number;
  sessionKey: boolean;
  subs: Subscription[];
  creatorUnlocked: boolean;
  activeCreatorId: string;
  creatorRates: Record<string, CreatorRate[]>;
  lastError: string | null;
  busy: string | null;
  setHydrated: () => void;
  connectDemo: () => void;
  disconnect: () => void;
  setBusy: (v: string | null) => void;
  shield: (amount: number) => string;
  unshield: (amount: number) => string;
  subscribe: (creatorId: string, tier: TierId) => Subscription;
  cancel: (subId: string) => void;
  setAutoRenew: (subId: string, on: boolean) => void;
  grantSessionKey: () => void;
  revokeSessionKey: () => void;
  simulateRenew: (subId: string) => string;
  unlockCreator: (creatorId: string) => void;
  setCreatorRate: (
    creatorId: string,
    tierId: TierId,
    patch: Partial<Pick<CreatorRate, "name" | "strk">>,
  ) => void;
  reset: () => void;
};

function txHash(): string {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return `0x${[...a].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function subId(): string {
  const a = new Uint8Array(4);
  crypto.getRandomValues(a);
  return `sub_0x${[...a].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

const initial = {
  hasHydrated: false,
  connected: false,
  address: "",
  publicStrk: 0,
  shieldedStrk: 0,
  sessionKey: false,
  subs: [] as Subscription[],
  creatorUnlocked: false,
  activeCreatorId: "archive",
  creatorRates: cloneRates(),
  lastError: null as string | null,
  busy: null as string | null,
};

export const useKeepr = create<KeeprStore>()(
  persist(
    (set, get) => ({
      ...initial,
      setHydrated: () => set({ hasHydrated: true }),
      connectDemo: () =>
        set({
          connected: true,
          address: DEMO_ADDRESS,
          publicStrk: 400,
          shieldedStrk: 30,
          lastError: null,
        }),
      disconnect: () =>
        set({
          connected: false,
          address: "",
          publicStrk: 0,
          shieldedStrk: 0,
          sessionKey: false,
        }),
      setBusy: (v) => set({ busy: v }),
      shield: (amount) => {
        const { publicStrk, shieldedStrk, connected } = get();
        if (!connected) throw new Error("Vault closed.");
        if (amount <= 0) throw new Error("Amount must be positive.");
        if (amount > publicStrk) throw new Error("Not enough public STRK.");
        const hash = txHash();
        set({
          publicStrk: round2(publicStrk - amount),
          shieldedStrk: round2(shieldedStrk + amount),
          lastError: null,
        });
        return hash;
      },
      unshield: (amount) => {
        const { publicStrk, shieldedStrk, connected } = get();
        if (!connected) throw new Error("Vault closed.");
        if (amount <= 0) throw new Error("Amount must be positive.");
        if (amount > shieldedStrk) throw new Error("Not enough shielded STRK.");
        const hash = txHash();
        set({
          publicStrk: round2(publicStrk + amount),
          shieldedStrk: round2(shieldedStrk - amount),
          lastError: null,
        });
        return hash;
      },
      subscribe: (creatorId, tierId) => {
        const { connected, shieldedStrk, subs, sessionKey, creatorRates } = get();
        if (!connected) throw new Error("Vault closed.");
        const creator = creatorById(creatorId);
        if (!creator) throw new Error("Unknown channel.");
        if (subs.some((s) => s.creatorId === creatorId && s.active)) {
          throw new Error("Already subscribed to this channel.");
        }
        const rate = rateById(creatorId, tierId, creatorRates);
        if (shieldedStrk < rate.strk) {
          throw new Error(
            `Need ${rate.strk} shielded STRK. Shield the remainder first.`,
          );
        }
        const now = Date.now();
        const sub: Subscription = {
          id: subId(),
          creatorId,
          tier: rate.id,
          amountStrk: rate.strk,
          startedAt: now,
          lastRenewedAt: now,
          nextRenewalAt: now + PERIOD_MS,
          active: true,
          autoRenew: sessionKey,
          txHash: txHash(),
        };
        set({
          shieldedStrk: round2(shieldedStrk - rate.strk),
          subs: [sub, ...subs],
          lastError: null,
        });
        return sub;
      },
      cancel: (subIdValue) => {
        set({
          subs: get().subs.map((s) =>
            s.id === subIdValue ? { ...s, active: false, autoRenew: false } : s,
          ),
        });
      },
      setAutoRenew: (subIdValue, on) => {
        if (on && !get().sessionKey) {
          throw new Error("Grant a session key first.");
        }
        set({
          subs: get().subs.map((s) =>
            s.id === subIdValue && s.active ? { ...s, autoRenew: on } : s,
          ),
        });
      },
      grantSessionKey: () => set({ sessionKey: true }),
      revokeSessionKey: () =>
        set({
          sessionKey: false,
          subs: get().subs.map((s) => ({ ...s, autoRenew: false })),
        }),
      simulateRenew: (subIdValue) => {
        const { subs, shieldedStrk, sessionKey } = get();
        const sub = subs.find((s) => s.id === subIdValue);
        if (!sub || !sub.active) throw new Error("No active channel.");
        if (!sessionKey || !sub.autoRenew) {
          throw new Error("Keeper has no session key for this channel.");
        }
        if (shieldedStrk < sub.amountStrk) {
          throw new Error("Note dry. Shield before the keeper ticks.");
        }
        const now = Date.now();
        const hash = txHash();
        set({
          shieldedStrk: round2(shieldedStrk - sub.amountStrk),
          subs: subs.map((s) =>
            s.id === subIdValue
              ? {
                  ...s,
                  lastRenewedAt: now,
                  nextRenewalAt: now + PERIOD_MS,
                  txHash: hash,
                }
              : s,
          ),
        });
        return hash;
      },
      unlockCreator: (creatorId) =>
        set({ creatorUnlocked: true, activeCreatorId: creatorId }),
      setCreatorRate: (creatorId, tierId, patch) => {
        const book = get().creatorRates;
        const current = ratesOrDefault(book, creatorId);
        const next = current.map((row) => {
          if (row.id !== tierId) return row;
          const name =
            typeof patch.name === "string"
              ? patch.name.replace(/\s+/g, " ").trim().slice(0, 16) || row.name
              : row.name;
          const strk =
            typeof patch.strk === "number" && Number.isFinite(patch.strk)
              ? Math.min(10_000, Math.max(1, Math.round(patch.strk)))
              : row.strk;
          return { ...row, name, strk };
        });
        set({ creatorRates: { ...book, [creatorId]: next } });
      },
      reset: () =>
        set({
          ...initial,
          creatorRates: cloneRates(),
          hasHydrated: true,
        }),
    }),
    {
      name: "keepr.v2",
      skipHydration: true,
      partialize: (s) => ({
        connected: s.connected,
        address: s.address,
        publicStrk: s.publicStrk,
        shieldedStrk: s.shieldedStrk,
        sessionKey: s.sessionKey,
        subs: s.subs,
        creatorUnlocked: s.creatorUnlocked,
        activeCreatorId: s.activeCreatorId,
        creatorRates: s.creatorRates,
      }),
    },
  ),
);

function ratesOrDefault(
  book: Record<string, CreatorRate[]>,
  creatorId: string,
): CreatorRate[] {
  return book[creatorId] ?? cloneRates()[creatorId] ?? cloneRates().archive;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
