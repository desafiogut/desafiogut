import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
        secondary:   "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
        destructive: "bg-[var(--color-destructive)] text-white",
        success:     "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50",
        warning:     "bg-red-900/60 text-red-300 border border-red-700/50",
        outline:     "border border-white/10 text-[var(--color-foreground)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
