// Configurações e Admins — Tela 7 do plano do MC89.5.
// MC89.20 (Fase 7). Três secções: administradores (com níveis),
// sessões ativas (com revogação) e configurações do painel.
// T7: tema claro/escuro fora do escopo.

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { Button, Input } from "../../components/ui";
import { COR, ouTraco } from "./_ui.jsx";
import EstadoVazio from "../../components/admin/EstadoVazio.jsx";

const NIVEL_COR = { "super-admin": "#ef4444", admin: "#f5a623", operador: "#10b981" };
const NIVEL_LABEL = { "super-admin": "Super-Admin", admin: "Admin", operador: "Operador" };
function quando(iso) { return iso ? new Date(iso).toLocaleString("pt-BR") : "—"; }

export default function ConfiguracoesAdmins() {
  const { chamarAdmin } = useAdminAuth();

  // ── Admins ────────────────────────────────────────────────────────
  const [admins, setAdmins] = useState([]);
  const [coord, setCoord] = useState(null);
  const [novo, setNovo] = useState("");
  const [novoNivel, setNovoNivel] = useState("admin");
  const [admMsg, setAdmMsg] = useState("");

  async function carregarAdmins() {
    if (!chamarAdmin) return;
    try {
      const r = await chamarAdmin("/.netlify/functions/admin-list");
      const d = await r.json().catch(() => null);
      setAdmins(d?.admins || []);
      setCoord(d?.coordenacao || null);
    } catch {}
  }
  useEffect(() => { carregarAdmins(); }, [chamarAdmin]);

  async function executar(acao, endereco) {
    if (!chamarAdmin) return;
    setAdmMsg("");
    try {
      const r = await chamarAdmin("/.netlify/functions/admin-list", { method: "POST", body: JSON.stringify({ acao, endereco }) });
      const d = await r.json().catch(() => null);
      if (r.ok) { setAdmMsg(`OK ${acao}`); setNovo(""); carregarAdmins(); }
      else setAdmMsg(`Erro: ${d?.error?.message || r.status}`);
    } catch (err) { setAdmMsg(err?.message || "falha"); }
  }

  // ── Sessões ───────────────────────────────────────────────────────
  const [sessoes, setSessoes] = useState([]);
  const [sessMsg, setSessMsg] = useState("");

  const carregarSessoes = useCallback(async () => {
    if (!chamarAdmin) return;
    try {
      const r = await chamarAdmin("/.netlify/functions/admin-sessions");
      const d = await r.json().catch(() => null);
      setSessoes(d?.sessoes || []);
    } catch {}
  }, [chamarAdmin]);
  useEffect(() => { carregarSessoes(); }, [carregarSessoes]);

  async function revogar(jti, endereco) {
    setSessMsg("");
    try {
      const r = await chamarAdmin("/.netlify/functions/admin-sessions-revoke", { method: "POST", body: JSON.stringify({ jti, endereco }) });
      const d = await r.json().catch(() => null);
      if (r.ok) { setSessMsg(`Revogada: ${d?.revogadas || 1}`); carregarSessoes(); }
      else setSessMsg(`Erro: ${d?.error?.message || r.status}`);
    } catch (err) { setSessMsg(err?.message || "falha"); }
  }

  // ── Configurações ─────────────────────────────────────────────────
  const [cfg, setCfg] = useState({ pollingInterval: 30, alertasAtivos: ["*"], limiarEoaEth: 0.005 });
  const [cfgJust, setCfgJust] = useState("");
  const [cfgMsg, setCfgMsg] = useState("");

  useEffect(() => {
    if (!chamarAdmin) return;
    chamarAdmin("/.netlify/functions/admin-config").then((r) => r.json().catch(() => null)).then((d) => {
      if (d?.config) setCfg(d.config);
    }).catch(() => {});
  }, [chamarAdmin]);

  async function salvarCfg() {
    if (!cfgJust.trim() || cfgJust.trim().length < 6) return;
    setCfgMsg("");
    try {
      const r = await chamarAdmin("/.netlify/functions/admin-config", { method: "POST", body: JSON.stringify({ ...cfg, justificativa: cfgJust.trim() }) });
      const d = await r.json().catch(() => null);
      if (r.ok) setCfgMsg("Configuração salva ✓");
      else setCfgMsg(`Erro: ${d?.error?.message || r.status}`);
    } catch (err) { setCfgMsg(err?.message || "falha"); }
  }

  if (!chamarAdmin) return <p style={{ color: COR.muted }}>Autentique-se para gerir as configurações.</p>;

  const ALERTAS = [
    { id: "eoa_baixa", label: "EOA abaixo do limiar" },
    { id: "fila_travada", label: "Fila travada" },
    { id: "webhook_inativo", label: "Webhook MP inativo" },
    { id: "blobs_cego", label: "Blobs sem token" },
    { id: "cache_sem_redis", label: "Cache Redis ausente" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

      {/* ── ADMINISTRADORES ────────────────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <h3 style={sh}>ADMINISTRADORES ({admins.length})</h3>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {admins.map((a) => {
            const addr = typeof a === "string" ? a : a.endereco;
            const nv = typeof a === "string" ? "admin" : (a.nivel || "admin");
            return (
              <li key={addr} style={liStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  <code style={{ fontSize: "0.74rem", color: COR.text, fontFamily: "'JetBrains Mono', monospace" }}>{addr.slice(0, 6)}…{addr.slice(-4)}</code>
                  {addr === coord && <span style={{ fontSize: "0.6rem", color: COR.warn }}>(coordenação)</span>}
                  <span style={{ fontSize: "0.58rem", padding: "0.1rem 0.4rem", borderRadius: "999px", background: `${NIVEL_COR[nv] || COR.muted}1a`, color: NIVEL_COR[nv] || COR.muted, border: `1px solid ${NIVEL_COR[nv] || COR.muted}44`, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>{NIVEL_LABEL[nv] || nv}</span>
                </div>
                {addr !== coord && (
                  <Button variant="ghost" size="sm" onClick={() => executar("remover", addr)}
                    className="!border-[#ef4444]/55 !text-[#ef4444] !bg-[#ef4444]/[0.13] hover:!bg-[#ef4444]/[0.20] !rounded-lg !text-xs shrink-0">
                    Remover
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); executar("adicionar", novo); }}
          style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem", alignItems: "center" }}>
          <Input type="text" placeholder="0x... (novo admin)" value={novo} onChange={(e) => setNovo(e.target.value)} className="flex-1" />
          <select value={novoNivel} onChange={(e) => setNovoNivel(e.target.value)} style={sel}>
            <option value="super-admin">Super-Admin</option>
            <option value="admin">Admin</option>
            <option value="operador">Operador</option>
          </select>
          <Button type="submit" variant="primary" size="sm" disabled={!novo}>+</Button>
        </form>
        {admMsg && <p style={{ margin: 0, fontSize: "0.7rem", color: admMsg.startsWith("Erro") ? COR.danger : COR.success }}>{admMsg}</p>}
      </section>

      {/* ── SESSÕES ATIVAS ─────────────────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
          <h3 style={{ ...sh, margin: 0 }}>SESSÕES ATIVAS ({sessoes.length})</h3>
          <Button variant="ghost" size="sm" onClick={carregarSessoes} className="!border-white/15 !text-[#94a3b8]">↻</Button>
        </div>
        {sessoes.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma sessão ativa"
            descricao="Nenhum administrador tem sessão aberta neste momento — incluindo esta, se ainda não foi registada."
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.68rem" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <th style={th}>Endereço</th><th style={th}>Criada</th><th style={th}>Expira</th><th style={th}></th>
            </tr></thead>
            <tbody>{sessoes.map((s) => (
              <tr key={s.jti || s.createdAt} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{...td,fontFamily:"'JetBrains Mono',monospace",fontSize:"0.66rem"}}>{s.endereco?.slice(0,8)}…</td>
                <td style={td}>{quando(s.createdAt)}</td>
                <td style={td}>{quando(s.expiresAt)}</td>
                <td style={td}><Button variant="ghost" size="sm" onClick={() => revogar(s.jti, s.endereco)}
                  className="!border-[#ef4444]/55 !text-[#ef4444] !text-xs !py-px !px-2 !rounded">Revogar</Button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {sessMsg && <p style={{ margin: 0, fontSize: "0.7rem", color: sessMsg.startsWith("Erro") ? COR.danger : COR.success }}>{sessMsg}</p>}
      </section>

      {/* ── CONFIGURAÇÕES ──────────────────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <h3 style={sh}>CONFIGURAÇÕES DO PAINEL</h3>
        <div style={cfgRow}>
          <span style={{ fontSize: "0.74rem", color: COR.text }}>Atualização automática</span>
          <select value={cfg.pollingInterval} onChange={(e) => setCfg({ ...cfg, pollingInterval: Number(e.target.value) })} style={sel}>
            {[15,30,60,120,0].map((v) => <option key={v} value={v}>{v === 0 ? "Manual" : `${v}s`}</option>)}
          </select>
        </div>
        <div style={cfgRow}>
          <span style={{ fontSize: "0.74rem", color: COR.text }}>Limiar EOA (ETH)</span>
          <input type="number" step="0.001" value={cfg.limiarEoaEth} onChange={(e) => setCfg({ ...cfg, limiarEoaEth: Number(e.target.value) })}
            style={{ ...inp, width: "80px" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          <span style={{ fontSize: "0.74rem", color: COR.text, marginBottom: "0.1rem" }}>Alertas ativos</span>
          {ALERTAS.map((a) => (
            <label key={a.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.7rem", color: COR.muted }}>
              <input type="checkbox" checked={cfg.alertasAtivos.includes("*") || cfg.alertasAtivos.includes(a.id)}
                onChange={(e) => {
                  const nova = e.target.checked
                    ? [...cfg.alertasAtivos.filter((x) => x !== "*"), a.id]
                    : cfg.alertasAtivos.filter((x) => x !== a.id);
                  setCfg({ ...cfg, alertasAtivos: nova.length === ALERTAS.length ? ["*"] : nova });
                }} />
              {a.label}
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: "0.3rem" }}>
          <Input type="text" placeholder="Justificativa (mín. 6 caracteres)" value={cfgJust} onChange={(e) => setCfgJust(e.target.value)} className="flex-1" />
          <Button variant="primary" size="sm" onClick={salvarCfg} disabled={cfgJust.trim().length < 6}>Salvar</Button>
        </div>
        {cfgMsg && <p style={{ margin: 0, fontSize: "0.7rem", color: cfgMsg.startsWith("Erro") ? COR.danger : COR.success }}>{cfgMsg}</p>}
      </section>
    </div>
  );
}

const sh = { fontSize: "0.78rem", color: COR.primary, margin: "0 0 0.5rem", letterSpacing: "0.05em", fontWeight: 800, textTransform: "uppercase" };
const th = { textAlign: "left", padding: "0.3rem 0.4rem", color: COR.muted, fontWeight: 600, whiteSpace: "nowrap" };
const td = { padding: "0.3rem 0.4rem", verticalAlign: "top", color: COR.text };
const liStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", padding: "0.45rem 0.7rem", background: "rgba(13,18,53,0.25)", border: "1px solid rgba(245,166,35,0.12)", borderRadius: "8px" };
const cfgRow = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", padding: "0.4rem 0.6rem", background: "rgba(13,18,53,0.25)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" };
const sel = { background: "rgba(13,18,53,0.5)", color: COR.text, border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "0.2rem 0.4rem", fontSize: "0.7rem" };
const inp = { ...sel, textAlign: "right" };
