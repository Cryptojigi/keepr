export function shortAddr(addr: string, head = 6, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function formatStrk(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "$0.00";
  if (n < 0.01 && n > 0) return `<$0.01`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function usdFromStrk(strkAmount: number, strkPriceUsd = 0.02434): string {
  return formatUsd(strkAmount * strkPriceUsd);
}

export function formatStrkWithUsd(strkAmount: number, strkPriceUsd = 0.02434): string {
  const strkFmt = formatStrk(strkAmount);
  const usdFmt = formatUsd(strkAmount * strkPriceUsd);
  return `${strkFmt} STRK (${usdFmt})`;
}

export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(ts));
}

export function formatStamp(ts: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(ts));
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "due";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function serialFromId(id: string): string {
  const hex = id.replace(/[^a-f0-9]/gi, "").toUpperCase().padEnd(8, "0");
  return `KPR-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}
