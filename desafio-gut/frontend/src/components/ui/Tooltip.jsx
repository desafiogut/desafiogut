import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Tooltip — MC21.1
 * Dica leve em vidro temperado, sem dependências. Aparece em hover/focus.
 * Translúcido (a arena permanece visível). Posições: top (default) / bottom.
 */
function Tooltip({ label, children, side = "top", className }) {
  const pos =
    side === "bottom"
      ? "top-full mt-2"
      : "bottom-full mb-2";
  return (
    <span className={cn("relative inline-flex group", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 whitespace-nowrap",
          "gut-glass-standard rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-gut-text)]",
          "opacity-0 translate-y-1 transition-all duration-150",
          "group-hover:opacity-100 group-hover:translate-y-0",
          "group-focus-within:opacity-100 group-focus-within:translate-y-0",
          pos
        )}
      >
        {label}
      </span>
    </span>
  );
}

export { Tooltip };
export default Tooltip;
