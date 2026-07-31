// Logs e Auditoria — Tela 5 do plano do MC89.5.
// MC89.22. Tabela paginada com filtros e exportação CSV.
// Consome o endpoint admin-logs.mjs (MC89.11).

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { Button, Input } from "../../components/ui";
import { COR, ouTraco } from "./_ui.jsx";

function truncar(a) { return a && a.length > 12 ? `${a.slice(0,6)}…${a.slice(-4)}` : a || "—"; }
function quando(iso) { return iso ? new Date(iso).toLocaleString("pt-BR") : "—"; }

const COR_SUCESSO = { true: COR.success, false: COR.danger, null: "#64748b" };
const ICONE = { true: "OK", false: "ERRO", null: "…" };

export default function LogsAuditoria() {
  const { chamarAdmin } = useAdminAuth();

  const [linhas, setLinhas] = useState([]);
  const [total, setTotal] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  // Filtros
  const [fAdmin, setFAdmin] = useState("");
  const [fAcao, setFAcao] = useState("");
  const [fSucesso, setFSucesso] = useState("");
  const [fPeriodo, setFPeriodo] = useState(30);
  const [fQ, setFQ] = useState("");

  const carregar = useCallback(async (reset = true) => {
    if (!chamarAdmin) return;
    setCarregando(true); setErro("");
    try {
      const p = new URLSearchParams(); p.set("limite", "25");
      if (!reset && cursor) p.set("antes", cursor);
      if (fAdmin) p.set("admin", fAdmin.trim().toLowerCase());
      if (fAcao) p.set("tipo_acao", fAcao);
      if (fSucesso) p.set("sucesso", fSucesso);
      if (fPeriodo > 0) { const d = new Date(Date.now() - fPeriodo * 86400000).toISOString(); p.set("desde", d); }
      if (fQ.trim()) p.set("q", fQ.trim());

      const r = await chamarAdmin(`/.netlify/functions/admin-logs?${p}`);
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);

      if (reset) { setLinhas(d.linhas || []); } else { setLinhas((prev) => [...prev, ...(d.linhas || [])]); }
      setTotal(d.total ?? null);
      setCursor(d.proximoCursor || null);
    } catch (err) { setErro(err?.message || "falha"); }
    finally { setCarregando(false); }
  }, [chamarAdmin, cursor, fAdmin, fAcao, fSucesso, fPeriodo, fQ]);

  useEffect(() => { carregar(true); }, [carregar]);

  async function exportarCsv() {
    try {
      const p = new URLSearchParams(); p.set("limite", "200");
      p.set("tipo_acao", fAcao);
      if (fPeriodo > 0) { p.set("desde", new Date(Date.now() - fPeriodo * 86400000).toISOString()); }
      if (fQ.trim()) p.set("q", fQ.trim());
      const r = await chamarAdmin(`/.netlify/functions/admin-logs?${p}`);
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
      if (!d.linhas?.length) { setErro("Sem dados para exportar."); return; }
      const cab = "id,criado_em,admin_endereco,tipo_acao,alvo,sucesso,justificativa,ip";
      const csv = [cab, ...d.linhas.map((l) =>
        `${l.id},${l.criado_em},${l.admin_endereco||""},${l.tipo_acao},${l.alvo||""},${l.sucesso===true?"sim":l.sucesso===false?"nao":"?"},${(l.justificativa||"").replace(/"/g,"'")},${l.ip||""}`)].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `desafiogut-logs-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    } catch (err) { setErro(err?.message || "falha"); }
  }

  if (!chamarAdmin) return <p style={{ color: COR.muted }}>Autentique-se para ver os logs de auditoria.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      {/* Filtros */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          <span style={{ fontSize: "0.6rem", color: COR.muted }}>Admin</span>
          <Input type="text" placeholder="0x…" value={fAdmin} onChange={(e) => setFAdmin(e.target.value)} className="w-28" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          <span style={{ fontSize: "0.6rem", color: COR.muted }}>Ação</span>
          <select value={fAcao} onChange={(e) => setFAcao(e.target.value)} style={sel}>
            <option value="">Todas</option>
            <option value="bloquear_usuario">Bloqueio</option>
            <option value="enviar_notificacao">Notificação</option>
            <option value="forcar_fila">Forçar fila</option>
            <option value="panic">Panic</option>
            <option value="unpause">Unpause</option>
            <option value="revogar_sessao">Revogar sessão</option>
            <option value="alterar_config">Alterar config</option>
            <option value="exportar_relatorio_financeiro">Exportar CSV</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          <span style={{ fontSize: "0.6rem", color: COR.muted }}>Período</span>
          <select value={fPeriodo} onChange={(e) => setFPeriodo(Number(e.target.value))} style={sel}>
            <option value={7}>7d</option><option value={30}>30d</option><option value={90}>90d</option><option value={365}>1 ano</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          <span style={{ fontSize: "0.6rem", color: COR.muted }}>Busca</span>
          <Input type="text" placeholder="texto…" value={fQ} onChange={(e) => setFQ(e.target.value)} className="w-24" />
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setCursor(null); carregar(true); }} disabled={carregando}
          className="!border-white/20 !text-[#e8f0fe] !rounded-md">Filtrar</Button>
        <Button variant="ghost" size="sm" onClick={exportarCsv}
          className="!border-white/15 !text-[#94a3b8] !rounded-md ml-auto">Exportar CSV</Button>
      </div>

      {erro && <p style={{ color: COR.danger, fontSize: "0.74rem", margin: 0 }}>{erro}</p>}

      <p style={{ margin: 0, fontSize: "0.68rem", color: COR.muted }}>
        {ouTraco(total)} registos. Mostrando {linhas.length}.
      </p>

      {/* Tabela */}
      {linhas.length === 0 && !carregando ? (
        <p style={{ color: COR.muted, fontStyle: "italic", fontSize: "0.78rem" }}>Nenhum registo de auditoria encontrado.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.66rem" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <th style={th}>Data</th><th style={th}>Admin</th><th style={th}>Ação</th><th style={th}>Alvo</th><th style={th}>OK</th><th style={th}>Justificativa</th>
            </tr></thead>
            <tbody>{linhas.map((l) => (
              <tr key={l.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={td}>{quando(l.criado_em)}</td>
                <td style={{...td,fontFamily:"'JetBrains Mono',monospace"}}>{truncar(l.admin_endereco)}</td>
                <td style={{...td,color:COR.primary,fontSize:"0.62rem",textTransform:"uppercase",letterSpacing:"0.03em"}}>{l.tipo_acao||"—"}</td>
                <td style={{...td,fontFamily:"'JetBrains Mono',monospace",fontSize:"0.62rem"}}>{truncar(l.alvo)}</td>
                <td style={{...td,color:COR_SUCESSO[l.sucesso]||COR.muted,fontWeight:700,textAlign:"center"}}>{ICONE[l.sucesso]}</td>
                <td style={{...td,color:COR.muted,maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.justificativa||"—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
        {cursor && (
          <Button variant="ghost" size="sm" onClick={() => carregar(false)} disabled={carregando}
            className="!border-white/15 !text-[#94a3b8]">{carregando ? "…" : "Mais →"}</Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => { setCursor(null); carregar(true); }} disabled={carregando}
          className="!border-white/15 !text-[#94a3b8]">↻ Recarregar</Button>
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: "0.3rem 0.35rem", color: COR.muted, fontWeight: 600, whiteSpace: "nowrap" };
const td = { padding: "0.3rem 0.35rem", verticalAlign: "top", color: COR.text };
const sel = { background: "rgba(13,18,53,0.5)", color: COR.text, border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "0.15rem 0.3rem", fontSize: "0.66rem" };
