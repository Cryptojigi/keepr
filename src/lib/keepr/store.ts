import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEMO_ADDRESS, PERIOD_MS } from "./constants";
import { cloneRates, creatorById, rateById, CREATORS } from "./data";
import type { Creator, CreatorRate, Subscription, TierId } from "./types";

type KeeprStore = {
  hasHydrated: boolean;
  connected: boolean;
  address: string;
  publicStrk: number;
  shieldedStrk: number;
  ethBalance: number;
  isSyncingBalances: boolean;
  lastBalanceSync: number;
  sessionKey: boolean;
  subs: Subscription[];
  customCreators: Creator[];
  creatorUnlocked: boolean;
  activeCreatorId: string;
  creatorRates: Record<string, CreatorRate[]>;
  lastError: string | null;
  busy: string | null;
  setHydrated: () => void;
  connectDemo: () => void;
  disconnect: () => void;
  setBusy: (v: string | null) => void;
  setSyncingBalances: (isSyncing: boolean) => void;
  setLiveBalances: (publicStrk: number, shieldedStrk: number, ethBalance?: number) => void;
  shield: (amount: number) => string;
  unshield: (amount: number) => string;
  subscribe: (creatorId: string, tier: TierId) => Subscription;
  createChannel: (channel: {
    name: string;
    handle: string;
    category: string;
    blurb: string;
    payoutAddress: string;
    ownerAddress: string;
    rates: CreatorRate[];
    discoverable?: boolean;
    serviceUrl?: string;
  }) => Creator;
  updateChannel: (creatorId: string, patch: Partial<Creator>) => void;
  archiveChannel: (creatorId: string) => void;
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
  ethBalance: 0,
  isSyncingBalances: false,
  lastBalanceSync: 0,
  sessionKey: false,
  subs: [] as Subscription[],
  customCreators: [] as Creator[],
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
          ethBalance: 0.25,
          lastBalanceSync: Date.now(),
          lastError: null,
        }),
      disconnect: () =>
        set({
          connected: false,
          address: "",
          publicStrk: 0,
          shieldedStrk: 0,
          ethBalance: 0,
          sessionKey: false,
        }),
      setBusy: (v) => set({ busy: v }),
      setSyncingBalances: (isSyncing) => set({ isSyncingBalances: isSyncing }),
      setLiveBalances: (publicStrk, shieldedStrk, ethBalance) =>
        set((state) => ({
          publicStrk: round2(publicStrk),
          shieldedStrk: round2(shieldedStrk),
          ...(typeof ethBalance === "number" ? { ethBalance: round4(ethBalance) } : {}),
          lastBalanceSync: Date.now(),
        })),
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
      createChannel: (params) => {
        const rawId = params.handle
          .replace(/^@/, "")
          .toLowerCase()
          .replace(/[^a-z0-9_.-]/g, "-")
          .trim();
        const cleanId = rawId || `ch_${Date.now()}`;

        const newChannel: Creator = {
          id: cleanId,
          name: params.name.trim(),
          handle: params.handle.startsWith("@") ? params.handle.trim() : `@${params.handle.replace(/^@/, "").trim()}`,
          category: params.category.trim() || "General",
          blurb: params.blurb.trim() || "Private on-chain subscription channel.",
          subscribers: 0,
          mrrStrk: 0,
          address: params.payoutAddress,
          ownerAddress: params.ownerAddress,
          discoverable: params.discoverable ?? true,
          serviceUrl: params.serviceUrl?.trim() || undefined,
          archived: false,
          isCustom: true,
          isDemo: false,
          createdAt: Date.now(),
        };

        const existing = get().customCreators;
        const customCreators = [newChannel, ...existing.filter((c) => c.id !== cleanId)];
        const creatorRates = {
          ...get().creatorRates,
          [cleanId]: params.rates,
        };

        set({
          customCreators,
          creatorRates,
          activeCreatorId: cleanId,
          creatorUnlocked: true,
        });

        return newChannel;
      },
      updateChannel: (creatorId, patch) => {
        const customCreators = get().customCreators.map((c) =>
          c.id === creatorId ? { ...c, ...patch } : c
        );
        set({ customCreators });
      },
      archiveChannel: (creatorId) => {
        const customCreators = get().customCreators.map((c) =>
          c.id === creatorId ? { ...c, archived: true, discoverable: false } : c
        );
        set({ customCreators });
      },
      subscribe: (creatorId, tierId) => {
        const { connected, shieldedStrk, subs, sessionKey, creatorRates, customCreators } = get();
        if (!connected) throw new Error("Vault closed.");
        const creator = customCreators.find((c) => c.id === creatorId) ?? creatorById(creatorId);
        if (!creator) throw new Error("Unknown channel.");
        if (creator.archived) throw new Error("This channel is archived and no longer accepting subscriptions.");
        if (subs.some((s) => s.creatorId === creatorId && s.active)) {
          throw new Error("Already subscribed to this channel.");
        }
        const rates = creatorRates[creatorId] ?? cloneRates().archive;
        const rate = rates.find((r) => r.id === tierId) ?? rates[0];
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
          creatorAddress: creator.address,
          serviceUrl: creator.serviceUrl,
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
          customCreators: [],
          hasHydrated: true,
        }),
    }),
    {
      name: "keepr.v3",
      skipHydration: true,
      partialize: (s) => ({
        connected: s.connected,
        address: s.address,
        publicStrk: s.publicStrk,
        shieldedStrk: s.shieldedStrk,
        sessionKey: s.sessionKey,
        subs: s.subs,
        customCreators: s.customCreators,
        creatorUnlocked: s.creatorUnlocked,
        activeCreatorId: s.activeCreatorId,
        creatorRates: s.creatorRates,
      }),
    },
  ),
);

/**
 * Returns all available channels: custom user channels (demo registry in localStorage) + default showcase channels.
 */
export function getAllCreators(customCreators: Creator[] = []): Creator[] {
  // Filter out archived channels unless explicitly requested
  return [...customCreators.filter((c) => !c.archived), ...CREATORS];
}

/**
 * Find creator by ID from either custom creators or default showcase creators.
 */
export function findCreator(id: string, customCreators: Creator[] = []): Creator | undefined {
  return customCreators.find((c) => c.id === id) ?? creatorById(id);
}

function ratesOrDefault(
  book: Record<string, CreatorRate[]>,
  creatorId: string,
): CreatorRate[] {
  return book[creatorId] ?? cloneRates()[creatorId] ?? cloneRates().archive;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}
