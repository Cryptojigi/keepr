import Image from "next/image";
import { cn } from "@/lib/utils";

export function KeeprMark({
  className,
  size = 32,
  title,
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <span
      className={cn("inline-flex shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      <Image
        src="/favicon.svg"
        alt={title ?? "Keepr"}
        width={size}
        height={size}
        priority
      />
    </span>
  );
}

export function KeeprWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-display text-lg font-bold uppercase tracking-[0.12em] text-ink",
        className,
      )}
    >
      <KeeprMark size={28} />
      Keepr
    </span>
  );
}
