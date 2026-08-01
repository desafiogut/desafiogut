// AdminLayout — casca do painel de administração.
//
// MC89.6 (Fase 0). É o que sobra de `pages/AdminPanel.jsx` depois de as abas
// saírem para `pages/admin/*.jsx`: o gate de acesso, a barra de estado da sessão,
// o caminho de volta e o <Outlet /> onde cada tela entra.
//
// A NAVEGAÇÃO não está aqui: vive em cartões no índice (AtalhosAdmin), porque
// nenhuma barra com nove destinos cabe num telemóvel — ver o comentário desse
// ficheiro para o que foi medido no aparelho.
//
// A autenticação já não vive aqui — vive em `AdminAuthContext`, porque as sete
// telas partilham a mesma sessão. Este ficheiro só a LÊ.
//
// Regras visuais preservadas do MC89.4:
//   · superfície opaca `.admin-panel` a preencher a altura (o fundo estático é
//     moldura, não protagonista);
//   · sem emojis; sem Orbitron; peso em vez de cor no título;
//   · "Login Admin" é um botão NEUTRO — o laranja fica reservado a ação
//     irreversível (os comandos da Fase 3);
//   · saída explícita, porque a barra inferior de consumo não existe nesta rota.

import { useState, createContext, useContext } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAppContext } from "../../context/AppContext.jsx";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { Button, Input } from "../ui";
import { ESTADOS } from "../../lib/adminAuth.js";
import { telaAtiva } from "../../lib/adminNav.js";
import NavAdminPersistente from "./NavAdminPersistente.jsx";
import AdminToastContainer from "./AdminToastContainer.jsx";
import EnderecoTruncado from "./EnderecoTruncado.jsx";
import { useAdminToast } from "../../hooks/useAdminToast.js";

// Contexto mínimo para que as telas filhas disparem toasts
export const ToastContext = createContext(null);
export function useToast() { return useContext(ToastContext); }

const COR = { text: "#e8f0fe", muted: "#94a3b8" };
// Hover + scroll globais para tabelas do painel (MC89.26)
const ESTILOS_TABELA = `
  .admin-panel table tr:hover { background: rgba(255,255,255,0.04) !important; }
  .admin-panel .tabela-scroll { position: relative; }
  .admin-panel .tabela-scroll::after {
    content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 24px;
    background: linear-gradient(to right, transparent, rgba(13,18,53,0.9));
    pointer-events: none;
  }
`;

export default function AdminLayout() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { abrirModal } = useAppContext();
  const {
    authState, authError, autenticado, login, logout,
    endereco, isAdmin, aVerificarAdmin, isConnected, pareceAutenticado,
  } = useAdminAuth();

  const { toasts, dismiss: dismissToast, success, error, info } = useAdminToast();
  const [pedindoLogin, setPedindoLogin] = useState(false);
  const [adminTokenInput, setAdminTokenInput] = useState("");

  async function submitLogin(e) {
    e.preventDefault();
    if (!adminTokenInput) return;
    const tokenLegado = adminTokenInput;
    setAdminTokenInput("");            // descarta da UI imediatamente
    setPedindoLogin(false);
    const ok = await login(tokenLegado);
    if (!ok) setPedindoLogin(true);    // re-abre se falhou
  }

  // ── Gate de UI ────────────────────────────────────────────────────────────
  //
  // MC89.31 — este portão passou a distinguir TRÊS estados em vez de dois.
  //
  // `isConnected` significa "o Privy já confirmou". Não significa "não está
  // autenticado": durante o restauro da sessão (~1,3 s medidos no aparelho) é
  // false para quem TEM sessão válida em disco. Com o encaminhamento otimista
  // do MC89.31, o ADM chega aqui DENTRO dessa janela — e o ecrã que o recebia
  // pedia-lhe para entrar. É a mesma armadilha que o MC88.38 corrigiu no
  // cabeçalho e o MC88.42 na guarda do lojista, agora no painel admin.
  //
  // ⚠️ E não era só este portão. Com `address` ainda a null, `useAdmin(null)`
  // devolve `{ isAdmin:false, loading:false }` — logo `aVerificarAdmin` é false
  // e o TERCEIRO portão dispararia "Acesso restrito" a um admin legítimo. Como
  // este portão é testado primeiro, tratá-lo aqui tapa os dois. Quem reordenar
  // estes ifs reabre esse defeito.
  //
  // SEGURANÇA: isto escolhe um TEXTO, não concede nada. Os portões `!isAdmin`
  // (backend) e a sessão admin por assinatura EIP-191 continuam intactos.
  if (!isConnected) {
    if (pareceAutenticado) {
      // Mesma forma visual do portão "Verificando privilégios…" abaixo — os
      // dois são estados de espera consecutivos e trocar de um para o outro
      // não deve deslocar nada.
      return <div style={{ padding: "2rem", color: COR.muted }}>Restaurando sessão…</div>;
    }
    return (
      <div style={{ padding: "2rem", color: COR.text, textAlign: "center" }}>
        <h1 style={{ fontSize: "1.4rem", color: COR.text, fontWeight: 700 }}>Painel Admin</h1>
        <p style={{ color: COR.muted, marginBottom: "1rem" }}>Faça login para verificar privilégios.</p>
        <Button variant="secondary" size="lg" onClick={abrirModal}>Entrar</Button>
      </div>
    );
  }
  if (aVerificarAdmin) {
    return <div style={{ padding: "2rem", color: COR.muted }}>Verificando privilégios…</div>;
  }
  if (!isAdmin) {
    return (
      <div style={{ padding: "2rem", color: COR.text, textAlign: "center" }}>
        <h1 style={{ fontSize: "1.4rem", color: COR.text, fontWeight: 700 }}>Painel Admin</h1>
        <p style={{ color: COR.muted, marginTop: "0.5rem" }}>
          Acesso restrito. Seu endereço <code style={{ color: COR.muted }}>{endereco}</code> não está na lista de admins.
        </p>
      </div>
    );
  }

  const tela = telaAtiva(pathname);
  const statusOk    = authState === ESTADOS.AUTENTICADO;
  const statusBg    = statusOk ? "rgba(16,185,129,0.06)" : (authState === ESTADOS.ERRO ? "rgba(239,68,68,0.06)" : "rgba(251,191,36,0.06)");
  const statusBd    = statusOk ? "rgba(16,185,129,0.3)"  : (authState === ESTADOS.ERRO ? "rgba(239,68,68,0.3)"  : "rgba(251,191,36,0.3)");
  const statusTexto =
      authState === ESTADOS.AUTENTICADO ? "Sessão admin ativa (Bearer JWT)"
    : authState === ESTADOS.A_RENOVAR   ? "⟳ Renovando token…"
    : authState === ESTADOS.A_ENTRAR    ? "Autenticando…"
    : authState === ESTADOS.ERRO        ? `✗ ${authError || "Falha na autenticação"}`
    :                                     "Login admin necessário para mutações";

  return (
    <div
      className="admin-panel"
      style={{
        margin: isMobile ? "0.75rem" : "1rem 1.5rem",
        padding: isMobile ? "1rem" : "1.5rem 2rem",
        color: COR.text, display: "flex", flexDirection: "column", gap: "1rem",
        minHeight: isMobile ? "calc(100vh - 1.5rem)" : "calc(100vh - 2rem)",
      }}
    >
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
        <div style={{ minWidth: 0 }}>
          {/* Fora do índice, o título passa a ser o da SECÇÃO e o caminho de volta
              fica por cima dele. Repetir "Painel Admin" em todas as telas gastava
              a única linha que diz onde se está. */}
          {tela && !tela.index && (
            <Link to="/admin" style={{
              display: "inline-block", marginBottom: "0.2rem",
              fontSize: "0.74rem", color: COR.muted, textDecoration: "none",
            }}>← Painel</Link>
          )}
          <h1 style={{ margin: 0, fontSize: isMobile ? "1.2rem" : "1.45rem", fontWeight: 700, color: COR.text, letterSpacing: 0 }}>
            {tela && !tela.index ? tela.label : "Painel Admin"}
          </h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: COR.muted }}>
            Logado como admin: <code style={{ color: COR.text }}><EnderecoTruncado endereco={endereco} /></code>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}
          className="!border-white/15 !text-[#94a3b8] !rounded-md shrink-0">
          ← Sair do painel
        </Button>
      </header>

      {/* Estado da sessão admin (JWT) */}
      <div style={{
        padding: "0.6rem 0.85rem",
        background: statusBg,
        border: `1px solid ${statusBd}`,
        borderRadius: "10px",
        fontSize: "0.78rem", color: COR.text,
        display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center", justifyContent: "space-between",
      }}>
        <span>{statusTexto}</span>
        {statusOk ? (
          <Button variant="ghost" size="sm" onClick={logout}
            className="!border-white/15 !text-[#94a3b8] !rounded-md">
            Logout admin
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setPedindoLogin(true)} disabled={authState === ESTADOS.A_ENTRAR}
            className="!border-white/20 !text-[#e8f0fe] !shadow-none !rounded-md">
            Login Admin
          </Button>
        )}
      </div>

      {pedindoLogin && !statusOk && (
        <form onSubmit={submitLogin} style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.72rem", color: COR.muted, width: "100%" }}>
            Cole o <strong>ADMIN_TOKEN</strong> legado (último uso). Depois sua wallet Privy vai assinar a mensagem para emitir o JWT.
          </span>
          <Input type="password" placeholder="ADMIN_TOKEN legado" value={adminTokenInput}
                 onChange={(e) => setAdminTokenInput(e.target.value)} className="flex-1 min-w-[200px]" autoFocus />
          <Button type="submit" variant="primary" size="sm" disabled={!adminTokenInput || authState === ESTADOS.A_ENTRAR}>
            {authState === ESTADOS.A_ENTRAR ? "Assinando…" : "Login"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setPedindoLogin(false); setAdminTokenInput(""); }}
            className="!border-white/15 !text-[#94a3b8]">
            Cancelar
          </Button>
        </form>
      )}

      {/* MC89.24 — navegação persistente em TODAS as telas. Substitui os
          cartões-atalho do índice. */}
      <NavAdminPersistente />

      <AdminToastContainer toasts={toasts} onDismiss={dismissToast} />
      <style>{ESTILOS_TABELA}</style>

      <section>
        <ToastContext.Provider value={{ success, error, info }}>
          <Outlet />
        </ToastContext.Provider>
      </section>
    </div>
  );
}
