import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GlassCard — MC21.1
 * Wrapper que aplica a Trindade do Vidro (.glass-panel) automaticamente.
 * A arena oficial é visível através dele (Regra de Ouro). Nenhum fundo opaco.
 */
const GlassCard = React.forwardRef(function GlassCard(
  { className, as: Tag = "div", ...props },
  ref
) {
  return (
    <Tag
      ref={ref}
      className={cn(
        "glass-panel rounded-2xl text-[var(--color-gut-text)]",
        className
      )}
      {...props}
    />
  );
});

export { GlassCard };
export default GlassCard;
