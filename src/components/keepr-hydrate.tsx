"use client";

import { useEffect } from "react";
import { useKeepr } from "@/lib/keepr/store";

export function KeeprHydrate() {
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
