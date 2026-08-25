import { cn } from "@/lib/utils";

export function KeeprMark({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7 text-accent", className)}
      fill="none"
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="16" cy="14.5" r="3.1" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M16 17.6 V23.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
      <path
        d="M8 25.5 H24"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
    </svg>
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
      <KeeprMark />
      Keepr
    </span>
  );
}
