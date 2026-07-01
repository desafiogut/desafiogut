// MC43 — Padrão ÚNICO de transição suave de entrada (design system).
//
// Referência: o painel "Indique e Ganhe" (components/PainelIndicacao.jsx), que
// entra com opacity 0→1 + y 8→0 em 0.35s (framer-motion, ease default). Este
// módulo torna esse padrão reutilizável para TODAS as abas/superfícies, para
// eliminar as transições ad-hoc divergentes (ex.: y:20/0.4s no SejaNossoParceiro,
// ou páginas sem qualquer entrada como Programação/Meus Ativos/Configurações).
//
// Acessibilidade: em prefers-reduced-motion, o consumidor deve passar `reduce`
// (via useReducedMotion) e usar GUT_ENTRANCE_STATIC / desativar o stagger — a
// entrada fica instantânea, sem deslocamento (WCAG 2.3.3 / respeito ao utilizador).

// Entrada padrão (fade + slide-up curto). Spread direto num <motion.*>.
export const GUT_ENTRANCE = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

// Variante estática (reduced-motion): renderiza já no estado final, sem animar.
export const GUT_ENTRANCE_STATIC = {
  initial: false,
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0 },
};

// Ajuda o consumidor a escolher entre animado e estático conforme reduced-motion.
export const gutEntrance = (reduce) => (reduce ? GUT_ENTRANCE_STATIC : GUT_ENTRANCE);

// Cascata para listas (ex.: itens internos do menu "Mais"): o contentor orquestra
// o atraso escalonado; cada item usa GUT_STAGGER_ITEM. staggerChildren = 50ms.
export const GUT_STAGGER_CONTAINER = {
  initial: "hidden",
  animate: "show",
  variants: {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
  },
};

export const GUT_STAGGER_ITEM = {
  variants: {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  },
};
