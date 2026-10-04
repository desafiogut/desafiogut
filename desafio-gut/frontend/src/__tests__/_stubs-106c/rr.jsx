// _stubs-106c/rr.jsx — duplo de `react-router-dom` para o teste de RENDER+CLIQUE do UTAC106c.
//
// PORQUE EXISTE: o teste corre o componente REAL (MinhaCarteira) pelo condutor de hooks do repo,
// FORA de um <Router>. O `useNavigate` real rebenta («useNavigate() may be used only in the context
// of a <Router>»). Aqui ele passa a RECORDER — e é isso que permite PROVAR que clicar «Menor Lance
// Único» navega para /mercado e que «Confirmar» navega para /ofertas-programadas.
// Duplo SÓ na fronteira do router; nenhum ficheiro de produção muda.
import React from "react";

globalThis.__NAVEGADAS = globalThis.__NAVEGADAS || [];

export function useNavigate() {
  return (to) => {
    globalThis.__NAVEGADAS.push(typeof to === "string" ? to : String(to && to.pathname ? to.pathname : to));
  };
}
export function useLocation() { return { pathname: "/carteira", search: "", hash: "", state: null, key: "k" }; }
export function MemoryRouter({ children }) { return React.createElement(React.Fragment, null, children); }
export const BrowserRouter = MemoryRouter;
export function Routes({ children }) { return React.createElement(React.Fragment, null, children); }
export function Route() { return null; }
export function Navigate() { return null; }
export function Outlet() { return null; }
// ⚠️ ARMADILHA MEDIDA: BottomNav/Sidebar usam <NavLink> com FILHO-FUNÇÃO (`{({isActive}) => …}`).
// Renderizar `children` cru passa uma função como filho do React e o rótulo NUNCA aparece no HTML
// (os checks de ordem davam [-1,…] — falso FAIL em 5 verificações). Filho-função tem de ser CHAMADO.
function miudos(children, ctx) {
  const c = typeof children === "function" ? children(ctx) : children;
  return React.createElement(React.Fragment, null, c);
}
export function Link({ to, children }) { return React.createElement("a", { href: to }, miudos(children, { isActive: false })); }
export function NavLink({ to, children }) { return React.createElement("a", { href: to }, miudos(children, { isActive: false })); }
export function useParams() { return {}; }
export function useSearchParams() { return [new URLSearchParams(), () => {}]; }
export default { useNavigate, useLocation, MemoryRouter, BrowserRouter, Routes, Route, Navigate, Outlet, Link, NavLink, useParams, useSearchParams };
