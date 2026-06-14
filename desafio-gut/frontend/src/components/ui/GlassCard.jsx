import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GlassCard — MC21.1
 * Wrapper que aplica .gut-glass-standard (MC25.3) — padrão navy-based fixo.
 * A arena oficial é visível através dele. Nenhum fundo opaco.
 */
const GlassCard = React.forwardRef(function GlassCard(
  { className, as: Tag = "div", ...props },
  ref
) {
  return (
    <Tag
      ref={ref}
      className={cn(
        "gut-glass-standard rounded-[14px] text-[var(--color-gut-text)]",
        className
      )}
      {...props}
    />
  );
});

export { GlassCard };
export default GlassCard;
