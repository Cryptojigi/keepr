"use client";

import { useEffect, useState } from "react";
import { HELPER_MAINNET, NETWORK_LABEL, STRK20_POOL } from "@/lib/keepr/constants";
import { cn } from "@/lib/utils";

export function HeroStatus() {
  const [clock, setClock] = useState("21:40:00");
  const [live, setLive] = useState(false);

  useEffect(() => {
    setLive(true);
    const stamp = () => setClock(new Date().toISOString().slice(11, 19));
    stamp();
    const clockId = window.setInterval(stamp, 1000);
    return () => window.clearInterval(clockId);
  }, []);

  return (
    <aside className="bg-base text-ink border border-line shadow-[var(--shadow-border)]">
      <header className="flex items-center justify-between border-b border-line bg-raised px-4 py-2.5">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-accent">
          {NETWORK_LABEL}
        </p>
        <p className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-ink">
          <span className={cn("led led-ok", live && "led-pulse")} aria-hidden />
          <span className="sr-only">Clock</span>
          {clock} UTC
        </p>
      </header>

      <ul className="divide-y divide-line">
        <StatusRow
          label="Pool"
          value={STRK20_POOL}
          hint="STRK20"
          led="ok"
          live={live}
        />
        <StatusRow
          label="Helper"
          value={HELPER_MAINNET ? `${HELPER_MAINNET.slice(0, 6)}…${HELPER_MAINNET.slice(-4)}` : "TBD"}
          hint="Mainnet"
          led="ok"
          live={live}
        />
        <StatusRow label="Token" value="STRK" hint="Whitelisted" led="ok" live={live} />
        <StatusRow
          label="Keeper"
          value="Idle · 60s"
          hint="Not connected"
          led="wait"
          live={false}
        />
      </ul>
    </aside>
  );
}

function StatusRow({
  label,
  value,
  hint,
  led,
  live,
}: {
  label: string;
  value: string;
  hint: string;
  led: "ok" | "wait";
  live: boolean;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className={cn("led", led === "ok" ? "led-ok" : "led-wait", live && "led-pulse")}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
          {label}
          <span className="ml-2 text-muted">{hint}</span>
        </p>
        <p className="mt-0.5 truncate font-mono text-xs tabular-nums text-ink">{value}</p>
      </div>
    </li>
  );
}
