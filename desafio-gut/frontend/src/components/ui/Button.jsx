import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Button — MC21.1
 * Variantes:
 *  - primary   → acento cirúrgico laranja (1 CTA por vista, @impeccable-design).
 *  - secondary → vidro temperado (.glass-panel).
 *  - ghost     → transparente.
 * Spring physics (@design-engineering): whileTap scale 0.98, stiffness 400 / damping 25.
 * useReducedMotion desativa o movimento.
 */
const VARIANTS = {
  primary:
    "bg-orange-500 text-[#0a0f1a] font-bold hover:bg-orange-400 shadow-[0_4px_24px_rgba(255,107,53,0.35)]",
  secondary: "glass-panel text-[var(--color-gut-text)] hover:bg-white/[0.06]",
  ghost:
    "bg-transparent text-[var(--color-gut-text)] hover:bg-white/[0.04] border border-transparent",
};

const SIZES = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-5 text-sm rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
};

const Button = React.forwardRef(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref
) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 select-none cursor-pointer",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-0",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        className
      )}
      {...props}
    />
  );
});

export { Button };
export default Button;
