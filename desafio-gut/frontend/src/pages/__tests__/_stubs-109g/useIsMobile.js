// _stubs-109g/useIsMobile.js — UTAC109g. Duplo do `useIsMobile` para provar os dois ramos (telemóvel /
// desktop) da tabela «Palpites» em SSR (o real lê `window.matchMedia`, que não existe no runner).
export const MOBILE_BREAKPOINT_PX = 768;
let MOBILE = false;
export function definirMobile(v) { MOBILE = v; }
export function useIsMobile() { return MOBILE; }
