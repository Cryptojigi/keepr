import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center border border-line bg-deep/40 transition-[background-color] duration-150 focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_var(--color-accent)] data-[state=checked]:bg-accent data-[state=checked]:border-accent disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 translate-x-px bg-cream shadow-sm transition-transform duration-150 data-[state=checked]:translate-x-[22px]" />
    </SwitchPrimitive.Root>
  );
}
