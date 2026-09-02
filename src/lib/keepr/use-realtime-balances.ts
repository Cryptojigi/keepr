"use client";

import { useEffect } from "react";
import { useStoreWallet } from "@/app/components/Wallet/walletContext";
import { useKeepr } from "@/lib/keepr/store";
import { refreshLiveBalances } from "@/lib/keepr/onchain";

/**
 * Hook to keep public wallet balances (Public STRK, ETH gas)
 * continuously synchronized via RPC without triggering wallet extension popups.
 */
export function useRealtimeBalances(intervalMs = 12000) {
  const isConnected = useStoreWallet((s) => s.isConnected);
  const address = useStoreWallet((s) => s.address);
  const demoConnected = useKeepr((s) => s.connected);

  useEffect(() => {
    if (!isConnected && !demoConnected) return;

    // 1. Silent background sync via RPC (no Ready popup)
    void refreshLiveBalances({ fetchShielded: false });

    // 2. Periodic background sync while tab is active
    const interval = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void refreshLiveBalances({ fetchShielded: false });
      }
    }, intervalMs);

    // 3. Sync public balances on tab focus
    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void refreshLiveBalances({ fetchShielded: false });
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [isConnected, address, demoConnected, intervalMs]);
}

