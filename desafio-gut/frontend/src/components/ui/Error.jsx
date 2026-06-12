import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ErrorState — MC21.1 (@taste-engineering regra 4)
 * Erro acionável: diz a causa e a ação de recuperação. Cores DESSATURADAS
 * (rose, não vermelho berrante). Translúcido — a arena permanece visível.
 */
function ErrorState({ title, hint, action, className }) {
  return (
    <div
      role="alert"
      className={cn(
        "glass-panel rounded-2xl border-rose-500/20 text-center",
        "flex flex-col items-center justify-center gap-2 py-8 px-6",
        className
      )}
    >
      <p className="text-base font-semibold text-rose-400">{title}</p>
      {hint && <p className="text-sm text-white/60 max-w-sm">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export { ErrorState };
export default ErrorState;
