import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef(({ className, glow, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // base glass
      "relative rounded-2xl border text-[var(--color-gut-text)]",
      "bg-[rgba(8,18,36,0.65)] [backdrop-filter:blur(22px)] [-webkit-backdrop-filter:blur(22px)]",
      "border-[rgba(0,212,170,0.18)]",
      "shadow-[0_32px_64px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)]",
      // conditional glow animation
      glow === "primary" && "[animation:var(--animate-glow-pulse)]",
      glow === "gold"    && "[animation:var(--animate-gold-pulse)]",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("font-bold leading-none tracking-tight text-[var(--color-gut-text)]", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
