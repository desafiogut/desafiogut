// Cotas — gestão das cotas comerciais por tier.
//
// MC89.6 moveu-a de `AdminPanel.jsx` (TabCotas) sem alterar comportamento.
//
// ⚠️ DECISÃO PENDENTE DO OPERADOR (T-2 do MC89.6): tal como "Aprovações", esta é
// uma funcionalidade VIVA sem lugar na estrutura aprovada de 7 telas. Fica como
// rota autónoma para não haver regressão. Ver docs/MC89.6-DECISOES.txt.

import { useEffect, useState } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { Button, Input } from "../../components/ui";
import { COR, TIERS, TIER_ACTIVE_CLASS } from "./_ui.jsx";

function truncarEndereco(addr) {
  if (!addr || typeof addr !== "string" || addr.length < 12) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

export default function Cotas() {
  const { chamarAdmin } = useAdminAuth();
  const isMobile = useIsMobile();

  const [resumo, setResumo] = useState({});
  const [catSel, setCatSel] = useState("diamante");
  const [cotas, setCotas]   = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ cliente_id: "", cliente_nome: "", produto_nome: "", valor: "", vendida: false });
  const [salvando, setSalvando] = useState(false);
  const [msgForm, setMsgForm] = useState("");

  // MC87 (P0-1) — /cotas GET projeta os dados por papel: sem credencial admin,
  // `cotas` vem sem cnpj/email e o resumo sem cliente_ids. O painel precisa da
  // visão completa, por isso usa chamarAdmin (Bearer + refresh em 401).
  async function carregarResumo() {
    if (!chamarAdmin) return;
    try {
      const resp = await chamarAdmin("/.netlify/functions/cotas");
      const data = await resp.json().catch(() => null);
      setResumo(data?.resumo || {});
    } catch {}
  }
  async function carregarCategoria() {
    if (!chamarAdmin) return;
    setCarregando(true); setErro("");
    try {
      const resp = await chamarAdmin(`/.netlify/functions/cotas?categoria=${catSel}`);
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);
      setCotas(data.cotas || []);
    } catch (err) {
      setErro(err?.message || "falha");
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => { carregarResumo(); /* eslint-disable-next-line */ }, [chamarAdmin]);
  useEffect(() => { carregarCategoria(); /* eslint-disable-next-line */ }, [catSel, chamarAdmin]);

  async function salvar(e) {
    e.preventDefault();
    if (!chamarAdmin) return;
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
            background: "rgba(13,18,53,0.25)",
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
          <Button key={t.id} variant="ghost" size="sm" onClick={() => setCatSel(t.id)} aria-pressed={catSel === t.id}
            className={catSel === t.id ? TIER_ACTIVE_CLASS[t.id] : "rounded-full text-[#94a3b8]"}>
            {t.label}
          </Button>
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
            background: "rgba(13,18,53,0.25)",
            border: "1px solid rgba(245,166,35,0.12)",
            borderRadius: "10px",
            fontSize: "0.78rem", color: COR.text,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr auto auto",
            gap: "0.4rem",
          }}>
            <div>
              {/* MC89.9 — endereço truncado por omissão. O nome real do cliente
                  só aparece no formulário de edição, que está atrás de uma ação
                  deliberada do admin. */}
              <strong>{c.cliente_nome || `Cliente ${catSel}`}</strong>{" — "}
              <span style={{ color: COR.muted }}>{c.produto_nome || "(sem produto)"}</span>
              <div><code style={{ fontSize: "0.7rem", color: COR.muted, fontFamily: "'JetBrains Mono', monospace" }}>{truncarEndereco(c.cliente_id)}</code></div>
            </div>
            <span style={{
              alignSelf: "center", padding: "0.16rem 0.5rem", borderRadius: "999px",
              fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.06em",
              color: c.vendida ? COR.warn : COR.success,
              background: c.vendida ? `${COR.warn}1f` : `${COR.success}1f`,
              border: `1px solid ${c.vendida ? COR.warn : COR.success}55`,
              textTransform: "uppercase",
            }}>{c.vendida ? "Vendida" : "Disponível"}</span>
            {c.valor && <span style={{ alignSelf: "center", color: COR.primary, fontWeight: 700 }}>R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
          </li>
        ))}
      </ul>

      {/* Formulário de criação/atualização */}
      <form onSubmit={salvar} style={{
        marginTop: "0.5rem", padding: "0.85rem",
        background: "rgba(13,18,53,0.25)",
        border: "1px dashed rgba(255,255,255,0.12)",
        borderRadius: "10px",
        display: "flex", flexDirection: "column", gap: "0.5rem",
      }}>
        <h4 style={{ margin: 0, fontSize: "0.78rem", color: COR.primary, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Nova/atualizar cota ({catSel})
        </h4>
        <Input type="text" placeholder="cliente_id (0x...)" value={form.cliente_id}
               onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} required />
        <Input type="text" placeholder="nome do cliente" value={form.cliente_nome}
               onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} />
        <Input type="text" placeholder="produto" value={form.produto_nome}
               onChange={(e) => setForm({ ...form, produto_nome: e.target.value })} />
        <Input type="number" placeholder="valor (BRL)" step="0.01" value={form.valor}
               onChange={(e) => setForm({ ...form, valor: e.target.value })} />
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.78rem", color: COR.text }}>
          <input type="checkbox" checked={form.vendida}
                 onChange={(e) => setForm({ ...form, vendida: e.target.checked })} />
          Marcar como vendida (não disponível)
        </label>
        <Button type="submit" variant="primary" size="md" disabled={salvando || !form.cliente_id}
          className="w-full">
          {salvando ? "Salvando…" : "Salvar cota"}
        </Button>
        {msgForm && <p style={{ margin: 0, fontSize: "0.74rem", color: msgForm.startsWith("✓") ? COR.success : COR.danger }}>{msgForm}</p>}
      </form>
    </div>
  );
}
