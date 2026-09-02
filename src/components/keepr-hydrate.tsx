"use client";

import { useEffect } from "react";
import { useKeepr } from "@/lib/keepr/store";
import { useRealtimeBalances } from "@/lib/keepr/use-realtime-balances";

export function KeeprHydrate() {
  // Global real-time wallet balance synchronization
  useRealtimeBalances(8000);

  useEffect(() => {
    const persist = useKeepr.persist;
    const unsub = persist.onFinishHydration(() => {
      useKeepr.getState().setHydrated();
    });
    void persist.rehydrate();
    if (persist.hasHydrated()) {
      useKeepr.getState().setHydrated();
    }
    return unsub;
  }, []);
  return null;
}

