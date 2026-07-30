// Configurações e Admins — Tela 7 do plano do MC89.5.
//
// MC89.6 moveu a parte de admins de `AdminPanel.jsx` (TabAdmins) sem alterar
// comportamento, e declarou o que falta. O que já funciona: listar, adicionar e
// remover endereços (a coordenação é permanente e não removível —
// admin-list.mjs:118 já o garante do lado do servidor).
//
// ⚠️ T7 (decisão do operador): tema claro/escuro fica FORA do âmbito — a app tem
// paleta única. Por isso não há secção de tema aqui.

import { useEffect, useState } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { Button, Input } from "../../components/ui";
import { COR, EmConstrucao } from "./_ui.jsx";

export default function ConfiguracoesAdmins() {
  const { chamarAdmin } = useAdminAuth();
  const [admins, setAdmins] = useState([]);
  const [coord, setCoord]   = useState(null);
  const [novo, setNovo]     = useState("");
  const [msg, setMsg]       = useState("");

  // MC87 (P2-4) — a lista completa é admin-only.
  async function carregar() {
    if (!chamarAdmin) return;
    try {
      const resp = await chamarAdmin("/.netlify/functions/admin-list");
      const data = await resp.json().catch(() => null);
      setAdmins(data?.admins || []);
      setCoord(data?.coordenacao || null);
    } catch {}
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [chamarAdmin]);

  async function executar(acao, endereco) {
    if (!chamarAdmin) return;
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

  if (!chamarAdmin) {
    return <p style={{ color: COR.muted, fontSize: "0.85rem" }}>Autentique-se para gerir os administradores.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <h4 style={{ margin: 0, fontSize: "0.78rem", color: COR.primary, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Admins atuais ({admins.length})
        </h4>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {admins.map((a) => (
            <li key={a} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem",
              padding: "0.45rem 0.7rem",
              background: "rgba(13,18,53,0.25)",
              border: "1px solid rgba(245,166,35,0.12)",
              borderRadius: "8px",
            }}>
              <code style={{ fontSize: "0.74rem", color: COR.text, fontFamily: "'JetBrains Mono', monospace", overflowWrap: "anywhere" }}>
                {a}{a === coord && <span style={{ marginLeft: "0.5rem", fontSize: "0.62rem", color: COR.warn }}>(coordenação)</span>}
              </code>
              {a !== coord && (
                <Button variant="ghost" size="sm" onClick={() => executar("remover", a)}
                  className="!border-[#ef4444]/55 !text-[#ef4444] !bg-[#ef4444]/[0.13] hover:!bg-[#ef4444]/[0.20] !rounded-lg !text-xs shrink-0">
                  Remover
                </Button>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); executar("adicionar", novo); }}
          style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
          <Input type="text" placeholder="0x... (novo admin)" value={novo}
                 onChange={(e) => setNovo(e.target.value)} className="flex-1" />
          <Button type="submit" variant="primary" size="sm" disabled={!novo}>
            + Adicionar
          </Button>
        </form>
        {msg && <p style={{ margin: 0, fontSize: "0.74rem", color: msg.startsWith("✓") ? COR.success : COR.danger }}>{msg}</p>}
      </section>

      <EmConstrucao
        titulo="Níveis de permissão e sessões"
        fase="Fase 2 do plano do MC89.5 (MC90.2)"
        descricao="Hoje a lista de admins é plana: quem está nela pode tudo. O JWT admin também não transporta papel nenhum — o que existe em rbac.mjs (admin/cliente/user) descreve o tipo de CLIENTE, não o grau de poder do administrador."
        decisoes={[
          "Três níveis: super-admin, admin, operador — aplicados NO SERVIDOR. Esconder um botão no React é uma sugestão, não uma permissão.",
          "Migração sem trancar ninguém: os endereços já existentes sobem a super-admin por omissão.",
          "As sessões já existem (Blob admin-refresh, com jti e revogação escrita). Falta IP, dispositivo, último acesso e revogar as de OUTRO admin — não uma tabela nova.",
          "RISCO MAIS ALTO DO PROGRAMA: em produção o Blob de admins está vazio e a coordenação é a única admin. Um erro na leitura do formato novo tranca o operador fora do painel.",
        ]}
      />
    </div>
  );
}
