// AdminPanel — painel de administração (REQ-20 + REQ-04..07).
//
// Acessível em /admin. Gate frontend: apenas endereços listados em admin-list
// ou a coordenação. Operações de mutação exigem Bearer JWT admin emitido
// por POST /auth-admin (login → access 15min + refresh 7d com rotação).
//
// Migração pós-MC1: x-admin-token + sessionStorage("gut_admin_token") foi
// substituído por:
//   - accessTokenRef (useRef, memória apenas, ~15 min TTL)
//   - sessionStorage("gut_admin_refresh") = { refreshToken, endereco, expiresAt }
//   - setInterval 12 min disparando /auth-admin {acao:"refresh"}
// O backend permanece dual-mode (cron externo via curl ainda usa x-admin-token).

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useAdmin } from "../hooks/useAdmin.js";
import { getSignerFromProvider } from "../utils/web3.js";

const COR = {
  primary: "#f5a623",
  primaryDim: "rgba(245,166,35,0.16)",
  border: "rgba(245,166,35,0.30)",
  text: "#e8f0fe",
  muted: "#94a3b8",
  success: "#10b981",
  warn: "#fbbf24",
  danger: "#ef4444",
  diamond: "#00d4ff",
};

const TIERS = [
  { id: "diamante", label: "Diamante", cor: COR.diamond },
  { id: "ouro",     label: "Ouro",     cor: COR.primary },
  { id: "prata",    label: "Prata",    cor: "#cbd5e1" },
  { id: "bronze",   label: "Bronze",   cor: "#cd7f32" },
];

// ── Persistência do refresh token (sessionStorage só) ────────────────────────
const REFRESH_SS_KEY     = "gut_admin_refresh";
const LEGACY_TOKEN_KEY   = "gut_admin_token"; // limpo na migração

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ACCESS_REFRESH_INTERVAL_MS = 12 * 60 * 1000; // refresh a cada 12 min (margin de 3 min sob TTL 15min do access)

function lerRefresh() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(REFRESH_SS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.refreshToken || !p?.endereco) return null;
    if (typeof p.expiresAt === "number" && Date.now() >= p.expiresAt) return null;
    return p;
  } catch { return null; }
}
function gravarRefresh(refreshToken, endereco) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(REFRESH_SS_KEY, JSON.stringify({
      refreshToken,
      endereco: String(endereco).toLowerCase(),
      expiresAt: Date.now() + REFRESH_TTL_MS,
    }));
  } catch {}
}
function limparRefresh() {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem(REFRESH_SS_KEY); } catch {}
}
function limparTokenLegado() {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem(LEGACY_TOKEN_KEY); } catch {}
}

function StatusBadge({ status }) {
  const mapa = {
    pendente:   { texto: "🟡 Pendente",  cor: COR.warn },
    aprovado:   { texto: "🟢 Aprovado",  cor: COR.success },
    rejeitado:  { texto: "🔴 Rejeitado", cor: COR.danger },
  };
  const m = mapa[status] || { texto: status, cor: COR.muted };
  return (
    <span style={{
      fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.06em",
      padding: "0.16rem 0.5rem", borderRadius: "999px",
      color: m.cor, background: `${m.cor}1f`, border: `1px solid ${m.cor}55`,
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{m.texto}</span>
  );
}

function TabAprovacoes({ chamarAdmin, isMobile, onLoginNeeded }) {
  const [lista, setLista] = useState([]);
  const [filtro, setFiltro] = useState("pendente");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [acao, setAcao] = useState({ id: null, msg: "" });

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      // GET é livre (sem auth) — fetch direto.
      const url = `/.netlify/functions/admin-aprovacao?status=${encodeURIComponent(filtro)}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);
      setLista(data.aprovacoes || []);
    } catch (err) {
      setErro(err?.message || "falha");
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [filtro]);

  async function decidir(cliente_id, novoStatus) {
    if (!chamarAdmin) { onLoginNeeded(); return; }
    if (!window.confirm(`Confirmar ${novoStatus} para ${cliente_id.slice(0, 10)}…?`)) return;
    setAcao({ id: cliente_id, msg: "Enviando…" });
    try {
      const resp = await chamarAdmin("/.netlify/functions/admin-aprovacao", {
        method: "POST",
        body: JSON.stringify({ acao: novoStatus === "aprovado" ? "aprovar" : "rejeitar", cliente_id }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setAcao({ id: cliente_id, msg: `✗ ${data?.error?.message || resp.status}` });
        return;
      }
      setAcao({ id: cliente_id, msg: `✓ ${novoStatus}` });
      carregar();
    } catch (err) {
      setAcao({ id: cliente_id, msg: err?.message || "falha" });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.72rem", color: COR.muted, fontWeight: 700 }}>Filtro:</span>
        {["pendente", "aprovado", "rejeitado"].map((s) => (
          <button key={s} type="button" onClick={() => setFiltro(s)} aria-pressed={filtro === s}
            style={{
              padding: "0.28rem 0.7rem", borderRadius: "20px",
              border: `1px solid ${filtro === s ? COR.primary : "rgba(255,255,255,0.1)"}`,
              background: filtro === s ? COR.primaryDim : "transparent",
              color: filtro === s ? COR.primary : COR.muted,
              fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
            }}>{s}</button>
        ))}
        <button onClick={carregar} disabled={carregando} aria-label="Recarregar"
          style={{
            marginLeft: "auto", padding: "0.28rem 0.7rem", borderRadius: "20px",
            background: "transparent", border: `1px solid ${COR.border}`,
            color: COR.primary, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
          }}>{carregando ? "⏳" : "↻"}</button>
      </div>
      {erro && <p role="alert" style={{ color: COR.danger, fontSize: "0.78rem" }}>{erro}</p>}
      {lista.length === 0 && !carregando && (
        <p style={{ color: COR.muted, fontSize: "0.82rem", fontStyle: "italic" }}>Nenhum pedido com status "{filtro}".</p>
      )}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {lista.map((p) => (
          <li key={p.cliente_id} style={{
            padding: "0.7rem 0.85rem",
            background: "rgba(5,15,40,0.55)",
            border: `1px solid rgba(245,166,35,0.15)`,
            borderRadius: "10px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
            gap: "0.5rem",
          }}>
            <div>
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                <StatusBadge status={p.status} />
                {p.nome && <strong style={{ fontSize: "0.86rem", color: COR.text }}>{p.nome}</strong>}
              </div>
              <code style={{ fontSize: "0.7rem", color: COR.muted, fontFamily: "'JetBrains Mono', monospace" }}>{p.cliente_id}</code>
              {p.email && <div style={{ fontSize: "0.74rem", color: COR.muted }}>{p.email}</div>}
              {p.observacao && <div style={{ fontSize: "0.72rem", color: COR.muted, marginTop: "0.2rem" }}>“{p.observacao}”</div>}
              {p.motivo && <div style={{ fontSize: "0.72rem", color: COR.warn, marginTop: "0.2rem" }}>Motivo: {p.motivo}</div>}
            </div>
            {p.status === "pendente" && (
              <div style={{ display: "flex", gap: "0.4rem", alignSelf: "center" }}>
                <button onClick={() => decidir(p.cliente_id, "aprovado")}
                  style={{ padding: "0.4rem 0.8rem", background: COR.success, color: "#0a0f1a", border: "none", borderRadius: "8px", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>
                  ✓ Aprovar
                </button>
                <button onClick={() => decidir(p.cliente_id, "rejeitado")}
                  style={{ padding: "0.4rem 0.8rem", background: `${COR.danger}22`, color: COR.danger, border: `1px solid ${COR.danger}55`, borderRadius: "8px", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>
                  ✗ Rejeitar
                </button>
              </div>
            )}
            {acao.id === p.cliente_id && (
              <div style={{ gridColumn: "1 / -1", fontSize: "0.72rem", color: COR.muted }}>{acao.msg}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TabCotas({ chamarAdmin, isMobile, onLoginNeeded }) {
  const [resumo, setResumo] = useState({});
  const [catSel, setCatSel] = useState("diamante");
  const [cotas, setCotas]   = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ cliente_id: "", cliente_nome: "", produto_nome: "", valor: "", vendida: false });
  const [salvando, setSalvando] = useState(false);
  const [msgForm, setMsgForm] = useState("");

  async function carregarResumo() {
    try {
      const resp = await fetch("/.netlify/functions/cotas");
      const data = await resp.json();
      setResumo(data?.resumo || {});
    } catch {}
  }
  async function carregarCategoria() {
    setCarregando(true); setErro("");
    try {
      const resp = await fetch(`/.netlify/functions/cotas?categoria=${catSel}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);
      setCotas(data.cotas || []);
    } catch (err) {
      setErro(err?.message || "falha");
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => { carregarResumo(); }, []);
  useEffect(() => { carregarCategoria(); /* eslint-disable-next-line */ }, [catSel]);

  async function salvar(e) {
    e.preventDefault();
    if (!chamarAdmin) { onLoginNeeded(); return; }
    setSalvando(true); setMsgForm("");
    try {
      const resp = await chamarAdmin("/.netlify/functions/cotas", {
        method: "POST",
        body: JSON.stringify({
          cliente_id: form.cliente_id, categoria: catSel,
          cliente_nome: form.cliente_nome || null,
          produto_nome: form.produto_nome || null,
          valor: form.valor ? Number(form.valor) : null,
          vendida: !!form.vendida,
          disponivel: !form.vendida,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) { setMsgForm(`✗ ${data?.error?.message || resp.status}`); return; }
      setMsgForm("✓ Cota salva");
      setForm({ cliente_id: "", cliente_nome: "", produto_nome: "", valor: "", vendida: false });
      carregarCategoria(); carregarResumo();
    } catch (err) {
      setMsgForm(err?.message || "falha");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      {/* Resumo */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: "0.5rem" }}>
        {TIERS.map((t) => (
          <div key={t.id} style={{
            padding: "0.6rem 0.75rem",
            background: "rgba(5,15,40,0.55)",
            border: `1px solid ${t.cor}55`,
            borderRadius: "10px",
            display: "flex", flexDirection: "column", gap: "0.2rem",
          }}>
            <span style={{ fontSize: "0.66rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.label}</span>
            <strong style={{ fontSize: "1.1rem", color: t.cor, fontWeight: 900 }}>
              {resumo?.[t.id]?.total_atribuidas ?? 0}
            </strong>
            <span style={{ fontSize: "0.62rem", color: COR.muted }}>atribuídas</span>
          </div>
        ))}
      </div>

      {/* Seletor de categoria */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {TIERS.map((t) => (
          <button key={t.id} type="button" onClick={() => setCatSel(t.id)} aria-pressed={catSel === t.id}
            style={{
              padding: "0.32rem 0.85rem", borderRadius: "20px",
              border: `1px solid ${catSel === t.id ? t.cor : "rgba(255,255,255,0.1)"}`,
              background: catSel === t.id ? `${t.cor}1f` : "transparent",
              color: catSel === t.id ? t.cor : COR.muted,
              fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
            }}>{t.label}</button>
        ))}
      </div>

      {/* Lista */}
      {erro && <p role="alert" style={{ color: COR.danger, fontSize: "0.78rem" }}>{erro}</p>}
      {cotas.length === 0 && !carregando && (
        <p style={{ color: COR.muted, fontSize: "0.82rem", fontStyle: "italic" }}>Nenhuma cota nesta categoria.</p>
      )}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {cotas.map((c) => (
          <li key={c.cliente_id} style={{
            padding: "0.6rem 0.75rem",
            background: "rgba(5,15,40,0.5)",
            border: "1px solid rgba(245,166,35,0.12)",
            borderRadius: "10px",
            fontSize: "0.78rem", color: COR.text,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr auto auto",
            gap: "0.4rem",
          }}>
            <div>
              <strong>{c.cliente_nome || "(sem nome)"}</strong>{" — "}
              <span style={{ color: COR.muted }}>{c.produto_nome || "(sem produto)"}</span>
              <div><code style={{ fontSize: "0.7rem", color: COR.muted }}>{c.cliente_id}</code></div>
            </div>
            <span style={{
              alignSelf: "center", padding: "0.16rem 0.5rem", borderRadius: "999px",
              fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.06em",
              color: c.vendida ? COR.warn : COR.success,
              background: c.vendida ? `${COR.warn}1f` : `${COR.success}1f`,
              border: `1px solid ${c.vendida ? COR.warn : COR.success}55`,
              textTransform: "uppercase",
            }}>{c.vendida ? "🟡 Vendida" : "🟢 Disponível"}</span>
            {c.valor && <span style={{ alignSelf: "center", color: COR.primary, fontWeight: 700 }}>R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
          </li>
        ))}
      </ul>

      {/* Formulário de criação/atualização */}
      <form onSubmit={salvar} style={{
        marginTop: "0.5rem", padding: "0.85rem",
        background: "rgba(5,15,40,0.6)",
        border: "1px dashed rgba(255,255,255,0.12)",
        borderRadius: "10px",
        display: "flex", flexDirection: "column", gap: "0.5rem",
      }}>
        <h4 style={{ margin: 0, fontSize: "0.78rem", color: COR.primary, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Nova/atualizar cota ({catSel})
        </h4>
        <input type="text" placeholder="cliente_id (0x...)" value={form.cliente_id}
               onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
               style={inputStyle} required />
        <input type="text" placeholder="nome do cliente" value={form.cliente_nome}
               onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })}
               style={inputStyle} />
        <input type="text" placeholder="produto" value={form.produto_nome}
               onChange={(e) => setForm({ ...form, produto_nome: e.target.value })}
               style={inputStyle} />
        <input type="number" placeholder="valor (BRL)" step="0.01" value={form.valor}
               onChange={(e) => setForm({ ...form, valor: e.target.value })}
               style={inputStyle} />
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.78rem", color: COR.text }}>
          <input type="checkbox" checked={form.vendida}
                 onChange={(e) => setForm({ ...form, vendida: e.target.checked })} />
          Marcar como vendida (não disponível)
        </label>
        <button type="submit" disabled={salvando || !form.cliente_id}
          style={{
            padding: "0.5rem", background: form.cliente_id ? `linear-gradient(135deg,${COR.primary},#f97316)` : "rgba(255,255,255,0.05)",
            border: "none", borderRadius: "10px",
            color: form.cliente_id ? "#0a0f1a" : COR.muted,
            fontWeight: 800, fontSize: "0.82rem",
            cursor: form.cliente_id && !salvando ? "pointer" : "not-allowed",
          }}>{salvando ? "⏳ Salvando…" : "💾 Salvar cota"}</button>
        {msgForm && <p style={{ margin: 0, fontSize: "0.74rem", color: msgForm.startsWith("✓") ? COR.success : COR.danger }}>{msgForm}</p>}
      </form>
    </div>
  );
}

function TabAdmins({ chamarAdmin, onLoginNeeded }) {
  const [admins, setAdmins] = useState([]);
  const [coord, setCoord]   = useState(null);
  const [novo, setNovo]     = useState("");
  const [msg, setMsg]       = useState("");

  async function carregar() {
    try {
      const resp = await fetch("/.netlify/functions/admin-list");
      const data = await resp.json();
      setAdmins(data?.admins || []);
      setCoord(data?.coordenacao || null);
    } catch {}
  }
  useEffect(() => { carregar(); }, []);

  async function executar(acao, endereco) {
    if (!chamarAdmin) { onLoginNeeded(); return; }
    setMsg("");
    try {
      const resp = await chamarAdmin("/.netlify/functions/admin-list", {
        method: "POST",
        body: JSON.stringify({ acao, endereco }),
      });
      const data = await resp.json();
      if (!resp.ok) { setMsg(`✗ ${data?.error?.message || resp.status}`); return; }
      setMsg(`✓ ${acao} OK`);
      setNovo(""); carregar();
    } catch (err) { setMsg(err?.message || "falha"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <h4 style={{ margin: 0, fontSize: "0.78rem", color: COR.primary, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        Admins atuais ({admins.length})
      </h4>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        {admins.map((a) => (
          <li key={a} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem",
            padding: "0.45rem 0.7rem",
            background: "rgba(5,15,40,0.55)",
            border: "1px solid rgba(245,166,35,0.12)",
            borderRadius: "8px",
          }}>
            <code style={{ fontSize: "0.74rem", color: COR.text, fontFamily: "'JetBrains Mono', monospace" }}>
              {a}{a === coord && <span style={{ marginLeft: "0.5rem", fontSize: "0.62rem", color: COR.warn }}>(coordenação)</span>}
            </code>
            {a !== coord && (
              <button onClick={() => executar("remover", a)}
                style={{ padding: "0.28rem 0.6rem", background: `${COR.danger}22`, color: COR.danger, border: `1px solid ${COR.danger}55`, borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                Remover
              </button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); executar("adicionar", novo); }}
        style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
        <input type="text" placeholder="0x... (novo admin)" value={novo}
               onChange={(e) => setNovo(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <button type="submit" disabled={!novo}
          style={{
            padding: "0.45rem 0.85rem",
            background: novo ? COR.primary : "rgba(255,255,255,0.05)",
            border: "none", borderRadius: "8px",
            color: novo ? "#0a0f1a" : COR.muted,
            fontWeight: 800, fontSize: "0.78rem",
            cursor: novo ? "pointer" : "not-allowed",
          }}>+ Adicionar</button>
      </form>
      {msg && <p style={{ margin: 0, fontSize: "0.74rem", color: msg.startsWith("✓") ? COR.success : COR.danger }}>{msg}</p>}
    </div>
  );
}

const inputStyle = {
  padding: "0.45rem 0.7rem",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  color: "#e8f0fe",
  fontSize: "0.82rem",
  fontFamily: "'Inter', sans-serif",
  outline: "none",
};

export default function AdminPanel() {
  const isMobile = useIsMobile();
  const { address, privyWallet, abrirModal, isConnected } = useAppContext();
  const { isAdmin, loading } = useAdmin(address);
  const [aba, setAba] = useState("aprovacoes");

  // ── JWT admin state ────────────────────────────────────────────────────────
  // accessToken vive APENAS em memória (useRef). refreshToken + endereco em
  // sessionStorage (gut_admin_refresh) — sobrevive a reload da aba.
  const accessTokenRef    = useRef(null);
  const enderecoAdminRef  = useRef(null);
  // authState: "needs-login" | "logging-in" | "authenticated" | "refreshing" | "error"
  const [authState, setAuthState]   = useState("needs-login");
  const [authError, setAuthError]   = useState("");
  const [pedindoLogin, setPedindoLogin] = useState(false);
  const [adminTokenInput, setAdminTokenInput] = useState("");

  // Limpa a chave legada na primeira montagem (one-shot — migração MC1 follow-up).
  useEffect(() => { limparTokenLegado(); }, []);

  // ── refreshAdminToken: troca refreshToken por novo par ─────────────────────
  const refreshAdminToken = useCallback(async () => {
    const reg = lerRefresh();
    if (!reg) return false;
    try {
      setAuthState((s) => (s === "authenticated" ? "refreshing" : s));
      const resp = await fetch("/.netlify/functions/auth-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "refresh", endereco: reg.endereco, refreshToken: reg.refreshToken }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.accessToken) {
        console.warn("[AdminPanel] refresh falhou", resp.status, data?.error);
        accessTokenRef.current   = null;
        enderecoAdminRef.current = null;
        limparRefresh();
        setAuthState("needs-login");
        return false;
      }
      accessTokenRef.current   = data.accessToken;
      enderecoAdminRef.current = reg.endereco;
      gravarRefresh(data.refreshToken, reg.endereco);
      setAuthState("authenticated");
      return true;
    } catch (err) {
      console.warn("[AdminPanel] refresh excecao", err?.message);
      setAuthState("needs-login");
      return false;
    }
  }, []);

  // ── Bootstrap: tenta refresh ao montar (se já tem refresh válido) ─────────
  useEffect(() => {
    if (!isConnected || !isAdmin) {
      setAuthState("needs-login");
      return;
    }
    const reg = lerRefresh();
    if (!reg) { setAuthState("needs-login"); return; }
    // Se o endereço atual difere do que está no refresh, descarta.
    if (reg.endereco !== String(address || "").toLowerCase()) {
      limparRefresh();
      setAuthState("needs-login");
      return;
    }
    refreshAdminToken();
  }, [address, isConnected, isAdmin, refreshAdminToken]);

  // ── Timer 12 min de auto-refresh ───────────────────────────────────────────
  useEffect(() => {
    if (authState !== "authenticated") return;
    const id = setInterval(() => { refreshAdminToken(); }, ACCESS_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [authState, refreshAdminToken]);

  // ── Login admin: Privy signMessage + ADMIN_TOKEN legado UMA vez ──────────
  const loginAdmin = useCallback(async (adminTokenLegado) => {
    if (!privyWallet || !address) {
      setAuthError("Carteira Privy ausente — reconecte e tente novamente.");
      setAuthState("error");
      return false;
    }
    setAuthState("logging-in"); setAuthError("");
    try {
      const enderecoLower = address.toLowerCase();
      const ts      = Date.now();
      const message = `DESAFIOGUT-ADMIN:${ts}:${enderecoLower}`;
      const provider  = await privyWallet.getEthereumProvider();
      const { signer } = await getSignerFromProvider(provider);
      const signature = await signer.signMessage(message);
      const resp = await fetch("/.netlify/functions/auth-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao:       "login",
          endereco:   enderecoLower,
          signature, message,
          adminToken: adminTokenLegado,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.accessToken) {
        setAuthError(data?.error?.message || `HTTP ${resp.status}`);
        setAuthState("error");
        return false;
      }
      accessTokenRef.current   = data.accessToken;
      enderecoAdminRef.current = enderecoLower;
      gravarRefresh(data.refreshToken, enderecoLower);
      setAuthState("authenticated");
      return true;
    } catch (err) {
      setAuthError(err?.message || "falha ao autenticar");
      setAuthState("error");
      return false;
    }
  }, [privyWallet, address]);

  // ── Logout admin: revoga refresh no backend + limpa local ─────────────────
  const logoutAdmin = useCallback(async () => {
    const reg = lerRefresh();
    accessTokenRef.current   = null;
    enderecoAdminRef.current = null;
    limparRefresh();
    setAuthState("needs-login");
    if (reg?.endereco) {
      try {
        await fetch("/.netlify/functions/auth-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao: "logout", endereco: reg.endereco }),
        });
      } catch {}
    }
  }, []);

  // ── chamarAdmin: helper para fetches admin (Bearer + auto-refresh em 401) ─
  const chamarAdmin = useCallback(async (url, init = {}) => {
    if (!accessTokenRef.current) {
      // Forçar login: caller deve verificar onLoginNeeded.
      throw new Error("sem token admin — faça login");
    }
    const baseHeaders = {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      Authorization: `Bearer ${accessTokenRef.current}`,
    };
    let resp = await fetch(url, { ...init, headers: baseHeaders });
    if (resp.status === 401) {
      // Tenta refresh transparente UMA vez.
      const ok = await refreshAdminToken();
      if (ok) {
        baseHeaders.Authorization = `Bearer ${accessTokenRef.current}`;
        resp = await fetch(url, { ...init, headers: baseHeaders });
      }
    }
    return resp;
  }, [refreshAdminToken]);

  function onLoginNeeded() { setPedindoLogin(true); }
  async function submitLogin(e) {
    e.preventDefault();
    if (!adminTokenInput) return;
    const tokenLegado = adminTokenInput;
    setAdminTokenInput("");                          // descarta da UI imediatamente
    setPedindoLogin(false);
    const ok = await loginAdmin(tokenLegado);
    if (!ok) setPedindoLogin(true);                  // re-abre se falhou
  }

  // ── Gate de UI ────────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div style={{ padding: "2rem", color: COR.text, textAlign: "center" }}>
        <h1 style={{ fontSize: "1.4rem", color: COR.primary }}>⚙️ Painel Admin</h1>
        <p style={{ color: COR.muted, marginBottom: "1rem" }}>Faça login para verificar privilégios.</p>
        <button onClick={abrirModal}
          style={{ padding: "0.7rem 1.4rem", background: `linear-gradient(135deg,${COR.primary},#f97316)`, border: "none", borderRadius: "12px", color: "#0a0f1a", fontWeight: 800, cursor: "pointer" }}>
          ⚡ Entrar
        </button>
      </div>
    );
  }
  if (loading) {
    return <div style={{ padding: "2rem", color: COR.muted }}>⏳ Verificando privilégios…</div>;
  }
  if (!isAdmin) {
    return (
      <div style={{ padding: "2rem", color: COR.text, textAlign: "center" }}>
        <h1 style={{ fontSize: "1.4rem", color: COR.primary }}>⚙️ Painel Admin</h1>
        <p style={{ color: COR.muted, marginTop: "0.5rem" }}>
          Acesso restrito. Seu endereço <code style={{ color: COR.muted }}>{address}</code> não está na lista de admins.
        </p>
      </div>
    );
  }

  const ABAS = [
    { id: "aprovacoes", label: "🟡 Aprovações" },
    { id: "cotas",      label: "📊 Cotas" },
    { id: "admins",     label: "👥 Admins" },
  ];

  const authedChamar = authState === "authenticated" || authState === "refreshing" ? chamarAdmin : null;
  const statusOk     = authState === "authenticated";
  const statusBg     = statusOk ? "rgba(16,185,129,0.06)" : (authState === "error" ? "rgba(239,68,68,0.06)" : "rgba(251,191,36,0.06)");
  const statusBd     = statusOk ? "rgba(16,185,129,0.3)"  : (authState === "error" ? "rgba(239,68,68,0.3)"  : "rgba(251,191,36,0.3)");
  const statusTexto  =
      authState === "authenticated" ? "✓ Sessão admin ativa (Bearer JWT)"
    : authState === "refreshing"    ? "⟳ Renovando token…"
    : authState === "logging-in"    ? "⏳ Autenticando…"
    : authState === "error"         ? `✗ ${authError || "Falha na autenticação"}`
    :                                 "⚠ Login admin necessário para mutações";

  return (
    <div style={{ padding: isMobile ? "1rem" : "1.5rem 2rem", color: COR.text, display: "flex", flexDirection: "column", gap: "1rem" }}>
      <header>
        <h1 style={{
          margin: 0,
          fontSize: isMobile ? "1.35rem" : "1.65rem",
          fontWeight: 900, color: COR.primary,
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: "0.05em",
        }}>⚙️ Painel Admin</h1>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: COR.muted }}>
          Logado como admin: <code style={{ color: COR.text }}>{address?.slice(0,10)}…{address?.slice(-6)}</code>
        </p>
      </header>

      {/* Status da sessão admin (JWT) */}
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
          <button onClick={logoutAdmin}
            style={{ padding: "0.28rem 0.7rem", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: COR.muted, fontSize: "0.72rem", cursor: "pointer" }}>
            Logout admin
          </button>
        ) : (
          <button onClick={() => setPedindoLogin(true)} disabled={authState === "logging-in"}
            style={{ padding: "0.28rem 0.7rem", background: COR.warn, color: "#0a0f1a", border: "none", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 800, cursor: authState === "logging-in" ? "wait" : "pointer" }}>
            Login Admin
          </button>
        )}
      </div>

      {pedindoLogin && !statusOk && (
        <form onSubmit={submitLogin} style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.72rem", color: COR.muted, width: "100%" }}>
            Cole o <strong>ADMIN_TOKEN</strong> legado (último uso). Depois sua wallet Privy vai assinar a mensagem para emitir o JWT.
          </span>
          <input type="password" placeholder="ADMIN_TOKEN legado" value={adminTokenInput}
                 onChange={(e) => setAdminTokenInput(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 200 }} autoFocus />
          <button type="submit" disabled={!adminTokenInput || authState === "logging-in"}
            style={{ padding: "0.45rem 0.85rem", background: adminTokenInput ? COR.primary : "rgba(255,255,255,0.05)", border: "none", borderRadius: "8px", color: adminTokenInput ? "#0a0f1a" : COR.muted, fontWeight: 800, cursor: adminTokenInput ? "pointer" : "not-allowed" }}>
            {authState === "logging-in" ? "⏳ Assinando…" : "Login"}
          </button>
          <button type="button" onClick={() => { setPedindoLogin(false); setAdminTokenInput(""); }}
            style={{ padding: "0.45rem 0.85rem", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: COR.muted, cursor: "pointer" }}>Cancelar</button>
        </form>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {ABAS.map((a) => (
          <button key={a.id} onClick={() => setAba(a.id)} aria-pressed={aba === a.id}
            style={{
              padding: "0.4rem 0.85rem", borderRadius: "10px",
              border: `1px solid ${aba === a.id ? COR.primary : "rgba(255,255,255,0.1)"}`,
              background: aba === a.id ? COR.primaryDim : "transparent",
              color: aba === a.id ? COR.primary : COR.muted,
              fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
            }}>{a.label}</button>
        ))}
      </div>

      {/* Conteúdo */}
      <section>
        {aba === "aprovacoes" && <TabAprovacoes chamarAdmin={authedChamar} isMobile={isMobile} onLoginNeeded={onLoginNeeded} />}
        {aba === "cotas"      && <TabCotas      chamarAdmin={authedChamar} isMobile={isMobile} onLoginNeeded={onLoginNeeded} />}
        {aba === "admins"     && <TabAdmins     chamarAdmin={authedChamar}                     onLoginNeeded={onLoginNeeded} />}
      </section>
    </div>
  );
}
