// _stubs-provider/leilaoLock-aberto.js — UTAC000.15. O `leilaoLock.js` REAL com UMA diferença:
// `EM_BREVE_MODE = false` (leilão aberto). Serve para exercitar, em runtime, o caminho que abre o
// overlay do vencedor (UTAC000.14: `if (!EM_BREVE_MODE) setShowOverlay(true)`). Tudo o resto é o real.
export * from "../../lib/leilaoLock.js";
export const EM_BREVE_MODE = false;
