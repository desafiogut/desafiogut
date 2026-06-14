import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input — MC21.1
 * Campo em .gut-glass-standard (MC25.3) — navy-based fixo, arena visível atrás.
 * sem fundo opaco. Foco: ring laranja/20. Erro: ring rose/20 (dessaturado).
 */
const Input = React.forwardRef(function Input(
  { className, error = false, type = "text", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={error || undefined}
      className={cn(
        "gut-glass-standard w-full rounded-xl px-3.5 h-11 text-sm text-[var(--color-gut-text)]",
        "placeholder:text-white/40 outline-none transition-[box-shadow,border-color]",
        "focus-visible:ring-2 focus-visible:ring-orange-500/20 focus-visible:border-orange-500/40",
        error && "ring-2 ring-rose-500/20 border-rose-500/40",
        className
      )}
      {...props}
    />
  );
});

export { Input };
export default Input;
