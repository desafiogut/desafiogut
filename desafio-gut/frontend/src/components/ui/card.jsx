import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef(({ className, glow, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // MC20.2 — vidro temperado (assinatura única .gut-glass): bg navy/25,
      // backdrop-blur-xl, border white/10, shadow, ring-inset white/5 + reflexo.
      "gut-glass rounded-2xl text-[var(--color-gut-text)]",
      // conditional glow animation (sobrepõe o box-shadow durante o pulso — efeito desejado)
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
