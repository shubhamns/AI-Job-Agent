import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide capitalize",
  {
    variants: {
      variant: {
        default: "bg-primary/12 text-primary ring-1 ring-primary/15",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-success/12 text-success ring-1 ring-success/20",
        warning: "bg-warning/12 text-warning ring-1 ring-warning/20",
        outline: "border border-border bg-white/60 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
