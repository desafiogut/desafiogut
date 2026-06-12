import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton — MC21.1 (@design-engineering regra 3, anti-CLS)
 * Reserva o espaço EXATO do conteúdo assíncrono antes de chegar, evitando layout
 * shift. Pulso por opacidade (compositor-friendly). Translúcido sobre a arena.
 */
function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-lg bg-white/[0.06] border border-white/5",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
export default Skeleton;
