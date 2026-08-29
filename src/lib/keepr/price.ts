"use client";

import { create } from "zustand";
import { useEffect } from "react";
import { formatUsd } from "./format";

// Default fallback price if offline or rate-limited: ~$0.02434 USD per STRK
export const DEFAULT_STRK_PRICE_USD = 0.02434;

interface PriceState {
  strkPriceUsd: number;
  lastUpdated: number | null;
  loading: boolean;
  fetchPrice: () => Promise<void>;
}

export const usePriceStore = create<PriceState>((set, get) => ({
  strkPriceUsd: DEFAULT_STRK_PRICE_USD,
  lastUpdated: null,
  loading: false,

  fetchPrice: async () => {
    // Avoid spamming requests if updated within the last 60 seconds
    const now = Date.now();
    const { lastUpdated, loading } = get();
    if (loading || (lastUpdated && now - lastUpdated < 60_000)) return;

    set({ loading: true });
    try {
      // 1. Try Binance ticker first (fast, reliable, CORS-friendly)
      const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=STRKUSDT");
      if (res.ok) {
        const data = await res.json();
        const price = parseFloat(data.price);
        if (Number.isFinite(price) && price > 0) {
          set({ strkPriceUsd: price, lastUpdated: now, loading: false });
          return;
        }
      }
    } catch {
      // Fall through to backup
    }

    try {
      // 2. Backup: CoinGecko API
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=starknet&vs_currencies=usd",
      );
      if (res.ok) {
        const data = await res.json();
        const price = data?.starknet?.usd;
        if (typeof price === "number" && price > 0) {
          set({ strkPriceUsd: price, lastUpdated: now, loading: false });
          return;
        }
      }
    } catch {
      // Retain fallback price
    }

    set({ loading: false, lastUpdated: now });
  },
}));

/**
 * Hook that ensures live STRK price is fetched and returns the current price in USD.
 */
export function useStrkPrice(): {
  strkPriceUsd: number;
  formatStrkUsd: (amountStrk: number) => string;
  formatBoth: (amountStrk: number) => string;
} {
  const strkPriceUsd = usePriceStore((s) => s.strkPriceUsd);
  const fetchPrice = usePriceStore((s) => s.fetchPrice);

  useEffect(() => {
    fetchPrice();
    const timer = setInterval(() => {
      fetchPrice();
    }, 60_000);
    return () => clearInterval(timer);
  }, [fetchPrice]);

  return {
    strkPriceUsd,
    formatStrkUsd: (amountStrk: number) => formatUsd(amountStrk * strkPriceUsd),
    formatBoth: (amountStrk: number) => {
      const usd = formatUsd(amountStrk * strkPriceUsd);
      return `${amountStrk} STRK (${usd})`;
    },
  };
}
