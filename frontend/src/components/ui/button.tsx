import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "gradient-primary text-primary-foreground shadow-[0_4px_14px_-4px_oklch(0.45_0.2_278/0.55)] hover:shadow-[0_6px_20px_-4px_oklch(0.45_0.2_278/0.6)] hover:brightness-105",
        secondary: "bg-secondary/90 text-secondary-foreground hover:bg-secondary",
        outline: "border border-border bg-white/70 hover:border-primary/35 hover:bg-white",
        ghost: "hover:bg-accent/80 hover:text-accent-foreground",
        destructive: "bg-destructive text-white shadow-sm hover:opacity-90",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-2xl px-7 text-base",
        icon: "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
