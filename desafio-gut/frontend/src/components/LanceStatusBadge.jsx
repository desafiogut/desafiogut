import { motion, AnimatePresence } from "framer-motion";

export default function LanceStatusBadge({ valor, status, mudou }) {
  if (!status) return null;

  return (
    <div className="bg-navy-light/20 backdrop-blur-sm rounded-xl p-4 border border-white/5">
      <p className="text-white/60 text-sm mb-1">O SEU ÚLTIMO LANCE</p>
      <p className="text-2xl font-bold text-white mb-2">
        R$ {(valor / 100).toFixed(2)}
      </p>
      <AnimatePresence mode="wait">
        {status.unico ? (
          <motion.div
            key="unico"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-green-400"
          >
            <span>✅</span>
            <span className="font-medium">Único — mantenha-se atento!</span>
          </motion.div>
        ) : (
          <motion.div
            key="repetido"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-orange-400"
          >
            <span>❌</span>
            <span className="font-medium">Repetido — dê um novo lance!</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {mudou && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 bg-red-500/20 border border-red-500/30 rounded-lg p-2 text-red-300 text-sm text-center"
          >
            ⚠️ O seu lance deixou de ser único! Tente outro valor.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
