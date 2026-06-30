// Modelo de navegação partilhado (MC39.22.1 — P0-3).
//
// Antes do MC39.22.1 os ícones SVG da navegação eram definidos DUAS vezes,
// verbatim, em Sidebar.jsx (rail desktop) e BottomNav.jsx (dock mobile) — mudar
// um traço exigia editar dois ficheiros. Este módulo é a ÚNICA fonte de verdade
// dos paths SVG, exposta via <NavIcon name size strokeWidth/>.
//
// O QUE NÃO está aqui (de propósito): as LISTAS de navegação e o agrupamento.
// Sidebar é um rail plano; o mobile usa 3 tabs principais + overflow "Mais", com
// rótulos curtos ("Início"/"Lances"/"Carteira") diferentes do desktop. Essa
// divergência é de superfície (apresentação), não duplicação — fica em cada
// componente. Aqui mora só o que era byte-a-byte igual: os desenhos dos ícones.
//
// NavIcon emite o MESMO <svg> que os componentes antigos (viewBox 24, fill none,
// stroke currentColor, linecap/linejoin round). Acresce `aria-hidden` (já usado
// no mobile; melhoria de a11y no desktop — ícone decorativo ao lado de label).

const PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </>
  ),
  wallet: (
    <>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </>
  ),
  trending: (
    <>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
  settings: (
    <>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </>
  ),
  chevronLeft: <polyline points="15 18 9 12 15 6"/>,
  chevronRight: <polyline points="9 18 15 12 9 6"/>,
  more: (
    <>
      <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
    </>
  ),
  close: (
    <>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </>
  ),
};

/**
 * Ícone de navegação. Renderiza o <svg> partilhado com o path nomeado.
 * @param {{ name: keyof typeof PATHS, size?: number, strokeWidth?: number }} props
 */
export function NavIcon({ name, size = 20, strokeWidth = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
