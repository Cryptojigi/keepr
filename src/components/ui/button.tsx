import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-mono text-xs font-medium uppercase tracking-[0.14em] transition-[background-color,box-shadow,color] duration-150 focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_var(--color-accent)] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-cream hover:bg-accent-hover shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
        outline:
          "bg-transparent text-ink shadow-[var(--shadow-border)] hover:bg-accent-muted hover:shadow-[var(--shadow-border-hover)]",
        ghost: "bg-transparent text-muted hover:bg-accent-muted hover:text-ink",
        cream:
          "bg-cream text-ink shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
        danger:
          "bg-transparent text-accent shadow-[0_0_0_1px_var(--color-accent)] hover:bg-accent hover:text-cream",
      },
      size: {
        sm: "h-11 min-h-11 px-3.5",
        md: "h-11 min-h-11 px-5",
        lg: "h-12 min-h-12 px-6",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
