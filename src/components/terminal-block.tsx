import { cn } from "@/lib/utils";

export function TerminalBlock({
  title,
  lines,
  className,
}: {
  title: string;
  lines: string[];
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "flex min-h-full flex-col bg-ink text-cream shadow-[var(--shadow-border)]",
        className,
      )}
    >
      <figcaption className="flex items-center justify-between border-b border-cream/15 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cream/80">
        <span>{title}</span>
        <span className="text-accent">STRK20</span>
      </figcaption>
      <pre className="flex-1 overflow-x-auto px-4 py-4 font-mono text-[11px] leading-6 text-cream/90 sm:text-xs max-w-full">
        {lines.map((line, i) => {
          const isPrompt = line.startsWith("$");
          const isOk = line === "ok" || line === "logged" || line.endsWith("confirmed");
          return (
            <div
              key={`${i}-${line}`}
              className={cn(
                isPrompt && "text-cream keepr-cursor",
                isOk && "text-cream/85",
                line.startsWith(">") && "text-cream/85",
              )}
            >
              {line.length === 0 ? " " : line}
            </div>
          );
        })}
      </pre>
    </figure>
  );
}
