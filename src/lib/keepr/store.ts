import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEMO_ADDRESS, PERIOD_MS } from "./constants";
import { cloneRates, creatorById, rateById, CREATORS } from "./data";
import type { Creator, CreatorRate, PricingType, PurchasedItem, Subscription, TierId, VendedItem } from "./types";
import type { PortableChannelPayload } from "./share";
import { isSupabaseConfigured } from "../supabase/client";
import { saveChannelToRegistry, deleteChannelFromRegistry, saveAccessPassToRegistry, deleteAccessPassFromRegistry } from "../supabase/registry";
import { scanUserSubscriptionsOnchain } from "./onchain";

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
  vendedItems: VendedItem[];
  purchases: PurchasedItem[];
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
    pricingType?: PricingType;
  }) => Creator;
  updateChannel: (creatorId: string, patch: Partial<Creator>) => void;
  archiveChannel: (creatorId: string) => void;
  deleteChannel: (creatorId: string) => void;
  createVendedItem: (params: {
    creatorId: string;
    creatorAddress: string;
    title: string;
    description: string;
    category: string;
    priceStrk: number;
    deliveryUrl: string;
  }) => VendedItem;
  updateVendedItem: (itemId: string, patch: Partial<VendedItem>) => void;
  deleteVendedItem: (itemId: string) => void;
  buyVendedItem: (itemId: string, txHash?: string) => PurchasedItem;
  importChannelFromPayload: (payload: PortableChannelPayload) => Creator;
  mergeRegistryChannels: (
    channels: Creator[],
    rates: Record<string, CreatorRate[]>,
    passes?: VendedItem[]
  ) => void;
  syncOnchainSubscriptions: (userAddress: string) => Promise<void>;
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
  setCreatorRates: (
    creatorId: string,
    rates: CreatorRate[],
    pricingType?: PricingType,
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

export const INITIAL_VENDED_ITEMS: VendedItem[] = [
  {
    id: "item_aegis_1",
    creatorId: "aegis",
    creatorAddress: "0x05b2b2b1a8d7c6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1",
    title: "Automated CDP Liquidation Sentinel Daemon",
    description: "Production Python & Starknet.py monitoring daemon for CDP vaults with auto-unwind hooks and Telegram alerts.",
    category: "Code & Automation",
    priceStrk: 35,
    deliveryUrl: "https://github.com/keepr-sentinel/mev-protection-release/archive/v1.0.tar.gz",
    active: true,
    salesCount: 28,
    createdAt: 1787000000000,
  },
  {
    id: "item_cipher_1",
    creatorId: "cipher",
    creatorAddress: "0x02a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
    title: "Quarterly ZK-SNARK Anonymity Dossier & Alpha Map",
    description: "In-depth cryptographic intelligence report examining privacy pool anonymity sets, recursive proof composition, and Starknet flow graphs.",
    category: "Research Dossier",
    priceStrk: 20,
    deliveryUrl: "https://cipherbrief.crypto/dossiers/zk-anonymity-q3-2026.pdf",
    active: true,
    salesCount: 64,
    createdAt: 1787100000000,
  },
  {
    id: "item_archive_1",
    creatorId: "archive",
    creatorAddress: "0x03c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4",
    title: "Cairo 1.0 to 2.8 Genesis Bytecode Corpus & Proofs",
    description: "Offline database containing 10,000+ verified Starknet smart contract bytecodes, ABI schemas, and formal verification proofs.",
    category: "Dataset & Corpus",
    priceStrk: 15,
    deliveryUrl: "https://archive.keepr.cash/corpus/starknet-cairo-verified-corpus.zip",
    active: true,
    salesCount: 41,
    createdAt: 1786900000000,
  },
];

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
  vendedItems: INITIAL_VENDED_ITEMS,
  purchases: [] as PurchasedItem[],
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
          pricingType: params.pricingType ?? (params.rates.length === 1 ? "flat" : "tiered"),
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

        if (isSupabaseConfigured()) {
          void saveChannelToRegistry(newChannel, params.rates, params.ownerAddress);
        }

        return newChannel;
      },
      updateChannel: (creatorId, patch) => {
        const customCreators = get().customCreators.map((c) =>
          c.id === creatorId ? { ...c, ...patch } : c
        );
        set({ customCreators });
        const updated = customCreators.find((c) => c.id === creatorId);
        if (updated && isSupabaseConfigured()) {
          const rates = get().creatorRates[creatorId] || [];
          void saveChannelToRegistry(updated, rates, updated.ownerAddress);
        }
      },
      archiveChannel: (creatorId) => {
        const customCreators = get().customCreators.map((c) =>
          c.id === creatorId ? { ...c, archived: true, discoverable: false } : c
        );
        set({ customCreators });
        const updated = customCreators.find((c) => c.id === creatorId);
        if (updated && isSupabaseConfigured()) {
          const rates = get().creatorRates[creatorId] || [];
          void saveChannelToRegistry(updated, rates, updated.ownerAddress);
        }
      },
      deleteChannel: (creatorId) => {
        const { customCreators, creatorRates, vendedItems } = get();
        const target = customCreators.find((c) => c.id === creatorId);
        const updatedCreators = customCreators.filter((c) => c.id !== creatorId);
        const { [creatorId]: _, ...remainingRates } = creatorRates;
        const remainingItems = vendedItems.filter((i) => i.creatorId !== creatorId);

        set({
          customCreators: updatedCreators,
          creatorRates: remainingRates,
          vendedItems: remainingItems,
          activeCreatorId: updatedCreators[0]?.id ?? "",
        });

        if (isSupabaseConfigured()) {
          void deleteChannelFromRegistry(creatorId, target?.ownerAddress || target?.address);
        }
      },
      createVendedItem: (params) => {
        const item: VendedItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          creatorId: params.creatorId,
          creatorAddress: params.creatorAddress,
          title: params.title.trim(),
          description: params.description.trim(),
          category: params.category.trim() || "Digital Asset",
          priceStrk: Math.max(1, Math.round(params.priceStrk)),
          deliveryUrl: params.deliveryUrl.trim(),
          active: true,
          salesCount: 0,
          createdAt: Date.now(),
        };
        set((state) => ({
          vendedItems: [item, ...state.vendedItems],
        }));

        if (isSupabaseConfigured()) {
          void saveAccessPassToRegistry(item);
        }

        return item;
      },
      updateVendedItem: (itemId, patch) => {
        set((state) => ({
          vendedItems: state.vendedItems.map((item) =>
            item.id === itemId ? { ...item, ...patch } : item
          ),
        }));
      },
      deleteVendedItem: (itemId) => {
        set((state) => ({
          vendedItems: state.vendedItems.filter((item) => item.id !== itemId),
        }));
        if (isSupabaseConfigured()) {
          void deleteAccessPassFromRegistry(itemId);
        }
      },
      buyVendedItem: (itemId, txHashVal) => {
        const { shieldedStrk, vendedItems, purchases } = get();
        const item = vendedItems.find((i) => i.id === itemId);
        if (!item) throw new Error("Item not found");
        if (!item.active) throw new Error("Item is currently not available for purchase");

        const existing = purchases.find((p) => p.itemId === itemId);
        if (existing) {
          return existing;
        }

        if (shieldedStrk < item.priceStrk) {
          throw new Error(`Need ${item.priceStrk} shielded STRK. Shield remainder first.`);
        }

        const hash = txHashVal || txHash();
        const purchase: PurchasedItem = {
          id: `purch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          itemId: item.id,
          creatorId: item.creatorId,
          title: item.title,
          amountStrk: item.priceStrk,
          purchasedAt: Date.now(),
          deliveryUrl: item.deliveryUrl,
          txHash: hash,
          creatorAddress: item.creatorAddress,
        };

        set((state) => ({
          shieldedStrk: round2(state.shieldedStrk - item.priceStrk),
          purchases: [purchase, ...state.purchases],
          vendedItems: state.vendedItems.map((i) =>
            i.id === itemId ? { ...i, salesCount: (i.salesCount || 0) + 1 } : i
          ),
        }));

        return purchase;
      },
      importChannelFromPayload: (payload) => {
        const { customCreators, creatorRates, vendedItems } = get();
        const existing = customCreators.find((c) => c.id === payload.id);
        const channel: Creator = {
          id: payload.id,
          name: payload.name,
          handle: payload.handle,
          category: payload.category,
          blurb: payload.blurb,
          subscribers: existing?.subscribers ?? 0,
          mrrStrk: existing?.mrrStrk ?? 0,
          address: payload.address,
          ownerAddress: payload.ownerAddress,
          pricingType: payload.pricingType ?? (payload.rates.length === 1 ? "flat" : "tiered"),
          discoverable: payload.discoverable ?? true,
          serviceUrl: payload.serviceUrl,
          archived: false,
          isCustom: true,
          isDemo: false,
          createdAt: existing?.createdAt ?? Date.now(),
        };

        const nextCustom = [channel, ...customCreators.filter((c) => c.id !== payload.id)];
        const nextRates = {
          ...creatorRates,
          [payload.id]: payload.rates.map((r) => ({ id: r.id as TierId, name: r.name, strk: r.strk })),
        };

        let nextItems = [...vendedItems];
        if (Array.isArray(payload.items)) {
          for (const item of payload.items) {
            if (!nextItems.some((i) => i.id === item.id)) {
              nextItems.push({
                id: item.id,
                creatorId: payload.id,
                creatorAddress: payload.address,
                title: item.title,
                description: item.description,
                category: item.category,
                priceStrk: item.priceStrk,
                deliveryUrl: item.deliveryUrl,
                active: true,
                salesCount: 0,
                createdAt: Date.now(),
              });
            }
          }
        }

        set({
          customCreators: nextCustom,
          creatorRates: nextRates,
          vendedItems: nextItems,
        });

        return channel;
      },
      mergeRegistryChannels: (channels, rates, passes) => {
        const { customCreators, creatorRates, vendedItems } = get();
        const nextCustom = [...customCreators];

        for (const regChan of channels) {
          const idx = nextCustom.findIndex((c) => c.id === regChan.id);
          if (idx === -1) {
            nextCustom.push(regChan);
          } else {
            nextCustom[idx] = {
              ...regChan,
              ...nextCustom[idx],
              discoverable: regChan.discoverable ?? nextCustom[idx].discoverable,
            };
          }
        }

        const nextRates = { ...creatorRates, ...rates };
        let nextPasses = [...vendedItems];

        if (Array.isArray(passes)) {
          for (const pass of passes) {
            if (!nextPasses.some((p) => p.id === pass.id)) {
              nextPasses.push(pass);
            }
          }
        }

        set({
          customCreators: nextCustom,
          creatorRates: nextRates,
          vendedItems: nextPasses,
        });
      },
      syncOnchainSubscriptions: async (userAddress) => {
        if (!userAddress) return;
        const { subs, customCreators } = get();
        const allChannels = [...CREATORS, ...customCreators];

        try {
          const onchainSubs = await scanUserSubscriptionsOnchain(userAddress, allChannels);
          if (onchainSubs.length === 0) return;

          let nextSubs = [...subs];
          let updated = false;

          for (const item of onchainSubs) {
            const existingIdx = nextSubs.findIndex(
              (s) => s.id === item.subId || s.creatorId === item.channelId
            );
            const channel = allChannels.find((c) => c.id === item.channelId);
            const now = Date.now();
            const periodMs = (item.record.period || 30 * 86400) * 1000;
            const lastRenewedMs = (item.record.lastRenewed || Math.floor(now / 1000)) * 1000;

            const subObj: Subscription = {
              id: item.subId,
              creatorId: item.channelId,
              tier: (item.record.tier as TierId) || 0,
              amountStrk: Number(item.record.amount) / 1e18 || 10,
              startedAt: lastRenewedMs,
              lastRenewedAt: lastRenewedMs,
              nextRenewalAt: lastRenewedMs + periodMs,
              active: item.record.active,
              autoRenew: false,
              txHash: `0x${item.record.creatorNoteId || "onchain"}`,
              creatorAddress: channel?.address || item.record.creator,
              serviceUrl: channel?.serviceUrl,
            };

            if (existingIdx === -1) {
              nextSubs.unshift(subObj);
              updated = true;
            } else if (!nextSubs[existingIdx].active && item.record.active) {
              nextSubs[existingIdx] = { ...nextSubs[existingIdx], ...subObj };
              updated = true;
            }
          }

          if (updated) {
            set({ subs: nextSubs });
          }
        } catch (err) {
          console.warn("syncOnchainSubscriptions caught error:", err);
        }
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
        const updated = get().customCreators.find((c) => c.id === creatorId);
        if (updated && isSupabaseConfigured()) {
          void saveChannelToRegistry(updated, next, updated.ownerAddress);
        }
      },
      setCreatorRates: (creatorId, rates, pricingType) => {
        const customCreators = get().customCreators.map((c) =>
          c.id === creatorId
            ? { ...c, ...(pricingType ? { pricingType } : {}) }
            : c,
        );
        set({
          creatorRates: {
            ...get().creatorRates,
            [creatorId]: rates,
          },
          customCreators,
        });
        const updated = customCreators.find((c) => c.id === creatorId);
        if (updated && isSupabaseConfigured()) {
          void saveChannelToRegistry(updated, rates, updated.ownerAddress);
        }
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
        vendedItems: s.vendedItems,
        purchases: s.purchases,
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        vendedItems:
          Array.isArray(persistedState?.vendedItems) && persistedState.vendedItems.length > 0
            ? persistedState.vendedItems
            : currentState.vendedItems,
        purchases: Array.isArray(persistedState?.purchases)
          ? persistedState.purchases
          : currentState.purchases,
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
