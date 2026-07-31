// Aprovações — workflow de aprovação manual de cliente (REQ-20).
//
// MC89.6 moveu-a de `AdminPanel.jsx` (TabAprovacoes) sem alterar comportamento.
//
// ⚠️ DECISÃO PENDENTE DO OPERADOR (T-2 do MC89.6): esta tela é uma funcionalidade
// VIVA que a estrutura aprovada de 7 telas não acomoda. Fica como rota autónoma
// para não haver regressão. Onde pertence — dentro de "Usuários", ou autónoma —
// é decisão por tomar. Ver docs/MC89.6-DECISOES.txt.

import { useEffect, useState } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { Button } from "../../components/ui";
import { COR, StatusBadge } from "./_ui.jsx";
import EstadoVazio from "../../components/admin/EstadoVazio.jsx";
import EnderecoTruncado from "../../components/admin/EnderecoTruncado.jsx";

export default function Aprovacoes() {
  const { chamarAdmin } = useAdminAuth();
  const isMobile = useIsMobile();

  const [lista, setLista] = useState([]);
  const [filtro, setFiltro] = useState("pendente");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [acao, setAcao] = useState({ id: null, msg: "" });
  // MC89.9 — PII oculta por omissão. O admin pode revelar os dados de UM
  // cliente de cada vez (toggle individual), não a lista toda.
  const [piiVisivel, setPiiVisivel] = useState({});

  async function carregar() {
    // B-P1-2 (MC39.17.2): GET exige JWT admin (a lista expõe PII). Sem sessão
    // admin autenticada, não chama o backend (evita 401 ruidoso).
    if (!chamarAdmin) { setLista([]); setErro(""); return; }
    setCarregando(true);
    setErro("");
    try {
      const url = `/.netlify/functions/admin-aprovacao?status=${encodeURIComponent(filtro)}`;
      const resp = await chamarAdmin(url, { method: "GET" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);
      setLista(data.aprovacoes || []);
    } catch (err) {
      setErro(err?.message || "falha");
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [filtro, chamarAdmin]);

  async function decidir(cliente_id, novoStatus) {
    if (!chamarAdmin) return;
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
          <Button key={s} variant="ghost" size="sm" onClick={() => setFiltro(s)} aria-pressed={filtro === s}
            className={filtro === s ? "!border-[#f5a623] !bg-[#f5a623]/[0.16] !text-[#f5a623] rounded-full" : "rounded-full text-[#94a3b8]"}>
            {s}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={carregar} disabled={carregando} aria-label="Recarregar"
          className="ml-auto rounded-full !border-[#f5a623]/30 !text-[#f5a623]">
          {carregando ? "…" : "Atualizar"}
        </Button>
      </div>
      {erro && <p role="alert" style={{ color: COR.danger, fontSize: "0.78rem" }}>{erro}</p>}
      {lista.length === 0 && !carregando && (
        <EstadoVazio
          titulo={`Nenhum pedido ${filtro}`}
          descricao="Troque o filtro acima para ver pedidos com outro estado."
        />
      )}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {lista.map((p) => (
          <li key={p.cliente_id} style={{
            padding: "0.7rem 0.85rem",
            background: "rgba(13,18,53,0.25)",
            border: `1px solid rgba(245,166,35,0.15)`,
            borderRadius: "10px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
            gap: "0.5rem",
          }}>
            <div>
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                <StatusBadge status={p.status} />
                {/* MC89.9 — o endereço aparece SEMPRE truncado. O nome e o e-mail
                    ficam atrás de um toggle individual, porque o admin precisa de
                    os ver para aprovar, mas não deve tê-los expostos por omissão
                    em cada abertura do painel. */}
                <code style={{ fontSize: "0.76rem", color: COR.text }}>
                  <EnderecoTruncado endereco={p.cliente_id} />
                </code>
                {p.nome && (
                  <button
                    type="button"
                    onClick={() => setPiiVisivel((v) => ({ ...v, [p.cliente_id]: !v[p.cliente_id] }))}
                    style={{
                      fontSize: "0.66rem", color: COR.muted, background: "none", border: `1px solid ${COR.muted}44`,
                      borderRadius: "6px", padding: "0.15rem 0.45rem", cursor: "pointer",
                    }}
                  >
                    {piiVisivel[p.cliente_id] ? "Ocultar dados" : "Mostrar dados"}
                  </button>
                )}
              </div>
              {piiVisivel[p.cliente_id] && (
                <div style={{ marginTop: "0.35rem", padding: "0.4rem 0.55rem", background: "rgba(255,255,255,0.03)", borderRadius: "6px", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                  {p.nome && <div style={{ fontSize: "0.80rem", color: COR.text, fontWeight: 600 }}>{p.nome}</div>}
                  {p.email && <div style={{ fontSize: "0.74rem", color: COR.muted }}>{p.email}</div>}
                  {p.observacao && <div style={{ fontSize: "0.72rem", color: COR.muted, marginTop: "0.15rem" }}>"{p.observacao}"</div>}
                </div>
              )}
              {p.motivo && <div style={{ fontSize: "0.72rem", color: COR.warn, marginTop: "0.2rem" }}>Motivo: {p.motivo}</div>}
            </div>
            {p.status === "pendente" && (
              <div style={{ display: "flex", gap: "0.4rem", alignSelf: "center" }}>
                <Button variant="primary" size="sm" onClick={() => decidir(p.cliente_id, "aprovado")}
                  className="!bg-[#10b981] hover:!bg-[#059669] !shadow-none">
                  Aprovar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => decidir(p.cliente_id, "rejeitado")}
                  className="!border-[#ef4444]/55 !text-[#ef4444] !bg-[#ef4444]/[0.13] hover:!bg-[#ef4444]/[0.20]">
                  ✗ Rejeitar
                </Button>
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
