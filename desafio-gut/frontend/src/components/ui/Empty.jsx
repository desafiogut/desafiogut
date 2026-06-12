import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Empty — MC21.1 (@taste-engineering regra 4)
 * Estado vazio útil: explica o que vai aparecer e o próximo passo. Nunca espaço
 * em branco. Translúcido — a arena permanece visível.
 */
function Empty({ title, hint, icon, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-2 py-10 px-6",
        className
      )}
    >
      {icon && <div className="text-3xl opacity-70 mb-1">{icon}</div>}
      <p className="text-base font-semibold text-[var(--color-gut-text)]">{title}</p>
      {hint && <p className="text-sm text-white/55 max-w-xs">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export { Empty };
export default Empty;
