import { cn } from "@/lib/utils";

function bitsFrom(seed: string, count: number): boolean[] {
  const bytes: number[] = [];
  for (let i = 0; i < seed.length; i += 2) {
    bytes.push(parseInt(seed.slice(i, i + 2) || "0", 16) || seed.charCodeAt(i));
  }
  const out: boolean[] = [];
  let n = 0;
  while (out.length < count) {
    const b = bytes[n % bytes.length] ?? 0;
    const mix = (b + n * 17) & 0xff;
    out.push((mix & 1) === 1);
    n += 1;
  }
  return out;
}

export function HashGrid({
  seed,
  size = 8,
  className,
}: {
  seed: string;
  size?: number;
  className?: string;
}) {
  const cells = bitsFrom(seed.replace(/[^a-f0-9]/gi, "") || "keepr", size * size);
  return (
    <div
      className={cn("grid gap-px bg-ink/20", className)}
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {cells.map((on, i) => (
        <span key={i} className={cn("hash-cell", on && "on")} />
      ))}
    </div>
  );
}
