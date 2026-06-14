import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Modal — MC21.1 / MC23.3
 * Overlay bg-black/60 (escurece a arena sem a tapar com cor sólida de painel) +
 * conteúdo em vidro temperado (.glass-panel). Entrada com spring (scale 0.95→1).
 * Fecha por backdrop ou Esc. @design-engineering (spring) + @impeccable-design.
 *
 * @param {"center"|"bottom"} position — "center" (default) centrado com spring scale;
 *   "bottom" alinha ao fundo (mobile bottom-sheet) com slide-up + spring.
 */
function Modal({ open, onClose, children, className, labelledBy, position = "center" }) {
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isBottom = position === "bottom";

  const containerAnim = isBottom
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  const panelAnim = isBottom
    ? {
        initial: reduce ? { opacity: 0 } : { opacity: 0, y: "100%" },
        animate: reduce ? { opacity: 1 } : { opacity: 1, y: 0 },
        exit: reduce ? { opacity: 0 } : { opacity: 0, y: "100%" },
      }
    : {
        initial: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95 },
        animate: reduce ? { opacity: 1 } : { opacity: 1, scale: 1 },
        exit: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95 },
      };

  const panelTransition = reduce
    ? { duration: 0 }
    : isBottom
      ? { type: "spring", stiffness: 380, damping: 32 }
      : { type: "spring", stiffness: 380, damping: 28 };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            "fixed inset-0 z-[60] flex p-4",
            isBottom ? "items-end justify-center" : "items-center justify-center"
          )}
          {...containerAnim}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            {...panelAnim}
            transition={panelTransition}
            className={cn(
              "glass-panel relative z-10 w-full max-w-lg rounded-2xl p-6 text-[var(--color-gut-text)]",
              isBottom && "rounded-b-none max-w-full",
              className
            )}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { Modal };
export default Modal;
