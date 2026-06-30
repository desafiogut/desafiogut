// src/lib/leilaoTimer.js — helpers puros de persistência do prazo do leilão (MC39.22.1 — EX-7).
//
// Extraídos de AppContext.jsx SEM alteração de comportamento. O timer do leilão é
// IMUNE a refresh: cada tipo (flash/programado) guarda o seu prazo absoluto (epoch
// em segundos) no localStorage e o cálculo é sempre `prazo - now`; o setInterval só
// re-renderiza. Estes helpers apenas leem/gravam esse epoch — funções PURAS (sem
// React), portanto testáveis e reutilizáveis isoladamente.
//
// NOTA honesta (SUPERPERS): a máquina de estado do timer (states prazoFlash/
// prazoProgramado, derivação de tempoRestante, setInterval de 250ms, hidratação
// on-chain via getEdicaoPrazo, notificações e flag `encerrado`) PERMANECE em
// AppContext — está entrelaçada com tipoLeilao/notificações/encerrado e NÃO é
// duplicação. Movê-la para um hook seria reescrita do núcleo do leilão, não
// enxugamento; fica como candidato futuro (não executado aqui por risco/escopo).

export const LS_PRAZO_FLASH = "gut_prazo_flash";
export const LS_PRAZO_PROG  = "gut_prazo_programado";

/** Lê um prazo (epoch s) do localStorage. Descarta inválidos ou vencidos há +10 min. */
export function lerPrazoStorage(chave) {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(chave);
    if (!v) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    // Descarta prazos vencidos há mais de 10 min (evita prender em "encerrado").
    if (n + 600 < Math.floor(Date.now() / 1000)) return null;
    return n;
  } catch { return null; }
}

/** Grava um prazo (epoch s) no localStorage (best-effort; ignora falha de quota/privacy). */
export function gravarPrazoStorage(chave, prazo) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(chave, String(prazo)); } catch {}
}
