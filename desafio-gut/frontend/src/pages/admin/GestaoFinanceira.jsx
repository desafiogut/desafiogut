// Gestão Financeira — Tela 3 do plano do MC89.5.
// MC89.16 (Fase 5). Resumo, transações, gráfico e exportação CSV.
// D11: sem botão "abastecer EOA". D-SALDO: sem "resetar saldo".

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { Button } from "../../components/ui";
import GraficoLinha from "../../components/admin/GraficoLinha.jsx";
import { COR, ouTraco, brl } from "./_ui.jsx";
import EstadoVazio from "../../components/admin/EstadoVazio.jsx";

function truncar(a) { return a && a.length > 12 ? `${a.slice(0,6)}…${a.slice(-4)}` : a || "—"; }
function quando(iso) { return iso ? new Date(iso).toLocaleString("pt-BR") : "—"; }
const SINAL = { credito: COR.success, debito: COR.danger };

export default function GestaoFinanceira() {
  const { chamarAdmin } = useAdminAuth();
  const isMobile = useIsMobile();

  const [resumo, setResumo] = useState(null);
  const [trans, setTrans] = useState([]);
  const [series, setSeries] = useState(null);
  const [onchain, setOnchain] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [periodo, setPeriodo] = useState(30);
  const [tipo, setTipo] = useState("todos");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [csvMsg, setCsvMsg] = useState("");

  const carregar = useCallback(async () => {
    if (!chamarAdmin) return;
    setCarregando(true); setErro("");
    try {
      const params = (k, v) => v ? `&${k}=${encodeURIComponent(v)}` : "";
      const [rR, rT, rS, rC] = await Promise.all([
        chamarAdmin(`/.netlify/functions/admin-financeiro-resumo?periodo=${periodo}`),
        chamarAdmin(`/.netlify/functions/admin-financeiro-transacoes?limite=20&tipo=${tipo}${params("antes", cursor)}`),
        chamarAdmin("/.netlify/functions/admin-series"),
        chamarAdmin("/.netlify/functions/admin-onchain"),
      ]);
      const [dR, dT, dS, dC] = await Promise.all([
        rR.json().catch(() => null), rT.json().catch(() => null),
        rS.json().catch(() => null), rC.json().catch(() => null),
      ]);
      if (!rR.ok) throw new Error(dR?.error?.message || `HTTP ${rR.status}`);
      setResumo(dR);
      setTrans(dT?.transacoes || []);
      setCursor(dT?.proximoCursor || null);
      setSeries(dS);
      setOnchain(dC);
    } catch (err) { setErro(err?.message || "falha"); }
    finally { setCarregando(false); }
  }, [chamarAdmin, periodo, tipo]);

  useEffect(() => { carregar(); }, [carregar]);

  async function exportarCsv() {
    setCsvMsg("A gerar…");
    try {
      const r = await chamarAdmin(`/.netlify/functions/admin-financeiro-relatorio?periodo=${periodo}`);
      if (!r.ok) { const d = await r.json().catch(() => null); throw new Error(d?.error?.message || `HTTP ${r.status}`); }
      const blob = await r.blob();
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `desafiogut-financeiro-${new Date().toISOString().slice(0,10)}.csv`; a.click();
      setCsvMsg("Descarregado ✓");
    } catch (err) { setCsvMsg(`Erro: ${err.message}`); }
  }

  if (!chamarAdmin) return <p style={{ color: COR.muted }}>Autentique-se para ver o financeiro.</p>;

  const r = resumo || {};
  const rotularDia = (iso) => iso ? iso.split("-").slice(1).join("/") : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.72rem", color: COR.muted }}>
          {r.geradoEm ? `Gerado às ${new Date(r.geradoEm).toLocaleTimeString("pt-BR")}` : ""}
        </span>
        <Button variant="ghost" size="sm" onClick={carregar} disabled={carregando}>↻ Atualizar</Button>
      </div>
      {erro && <p style={{ color: COR.danger, fontSize: "0.78rem" }}>{erro}</p>}

      {/* RESUMO */}
      <section>
        <h3 style={sh}>RESUMO ({r.periodoDias || 30}d)</h3>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: "0.5rem" }}>
          <Card r="Total recebido" v={ouTraco(r.totalRecebidoCentavos, brl)} c={COR.success} />
          <Card r="Em circulação" v={ouTraco(r.totalEmCirculacaoCentavos, brl)} c={COR.primary}
            n={`${ouTraco(r.totalCreditos)} créditos`} />
          <Card r="Débitos" v={ouTraco(r.totalDebitadoCentavos, brl)} c={r.totalDebitos > 0 ? COR.danger : COR.muted}
            n={`${ouTraco(r.totalDebitos)} débitos`} />
          <Card r="Saldo EOA" v={onchain?.saldoEth ? `${onchain.saldoEth} ETH` : "—"} c={COR.diamond}
            n={onchain?.saldoEth && parseFloat(onchain.saldoEth) < 0.005 ? "Abaixo do limiar" : ""} />
        </div>
      </section>

      {/* GRÁFICO */}
      {series?.dias?.length > 0 && (
        <section>
          <h3 style={sh}>RECEITA PIX</h3>
          <div style={{ padding: "0.7rem", background: "rgba(13,18,53,0.25)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px" }}>
            <GraficoLinha label="" valores={series.receitaCentavos} rotulos={series.dias.map(rotularDia)}
              cor={COR.success} formato={(v) => brl(v)} />
          </div>
        </section>
      )}

      {/* TRANSAÇÕES */}
      <section>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.5rem" }}>
          <h3 style={{ ...sh, margin: 0 }}>TRANSAÇÕES</h3>
          <select value={periodo} onChange={(e) => setPeriodo(Number(e.target.value))}
            style={sel}>{[7,30,90].map(d=><option key={d} value={d}>{d}d</option>)}</select>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}
            style={sel}>{["todos","credito","debito"].map(t=><option key={t} value={t}>{t}</option>)}</select>
          <Button variant="ghost" size="sm" onClick={exportarCsv}
            className="!border-white/20 !text-[#e8f0fe] !rounded-md ml-auto">Exportar CSV</Button>
        </div>
        {csvMsg && <p style={{ fontSize: "0.68rem", color: csvMsg.startsWith("Erro") ? COR.danger : COR.success, margin: "0 0 0.4rem" }}>{csvMsg}</p>}
        {trans.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma transação"
            descricao="Não há movimentação financeira no período e tipo selecionados."
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <th style={th}>Data</th><th style={th}>Endereço</th><th style={th}>Tipo</th><th style={th}>Valor</th><th style={th}>Fonte</th>
            </tr></thead>
            <tbody>{trans.map((t,i) => (
              <tr key={t.id || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={td}>{quando(t.quando)}</td>
                <td style={{...td,fontFamily:"'JetBrains Mono',monospace"}}>{truncar(t.endereco)}</td>
                <td style={{...td,color:SINAL[t.tipo]||COR.text,fontWeight:700,textTransform:"uppercase",fontSize:"0.64rem"}}>{t.tipo}</td>
                <td style={{...td,color:SINAL[t.tipo]||COR.text,fontWeight:600}}>{brl(t.valorCentavos)}</td>
                <td style={{...td,color:COR.muted,fontSize:"0.64rem"}}>{t.fonte||"—"}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {cursor && <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <Button variant="ghost" size="sm" onClick={carregar} className="!border-white/15 !text-[#94a3b8]">Mais →</Button>
        </div>}
      </section>
    </div>
  );
}

function Card({ r: rotulo, v: valor, c: cor, n: nota }) {
  return <div style={{ padding: "0.6rem 0.75rem", background: "rgba(255,255,255,0.02)", border: `1px solid ${COR.border}`, borderRadius: "8px" }}>
    <div style={{ fontSize: "0.62rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>{rotulo}</div>
    <div style={{ fontSize: "1.15rem", fontWeight: 900, color: cor }}>{valor}</div>
    {nota && <div style={{ fontSize: "0.62rem", color: COR.muted, marginTop: "0.15rem" }}>{nota}</div>}
  </div>;
}

const sh = { fontSize: "0.78rem", color: COR.primary, margin: "0 0 0.5rem", letterSpacing: "0.05em" };
const th = { textAlign: "left", padding: "0.3rem 0.4rem", color: COR.muted, fontWeight: 600, whiteSpace: "nowrap" };
const td = { padding: "0.3rem 0.4rem", verticalAlign: "top", color: COR.text };
const sel = { background: "rgba(13,18,53,0.5)", color: COR.text, border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "0.2rem 0.4rem", fontSize: "0.68rem" };
