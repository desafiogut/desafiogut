import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Modal — MC21.1
 * Overlay bg-black/60 (escurece a arena sem a tapar com cor sólida de painel) +
 * conteúdo em vidro temperado (.glass-panel). Entrada com spring (scale 0.95→1).
 * Fecha por backdrop ou Esc. @design-engineering (spring) + @impeccable-design.
 */
function Modal({ open, onClose, children, className, labelledBy }) {
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 28 }}
            className={cn(
              "glass-panel relative z-10 w-full max-w-lg rounded-2xl p-6 text-[var(--color-gut-text)]",
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
