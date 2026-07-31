// PerfilUsuario — subtela da Tela 2 (Gestão de Usuários).
// MC89.14 (Fase 4). Rota: /admin/usuarios/:endereco

import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { Button, Input } from "../../components/ui";
import { COR, ouTraco, brl } from "./_ui.jsx";

function quando(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

const COR_FONTE = { cota: "#00d4ff", saldo_rs: "#10b981", credito: "#f5a623" };

export default function PerfilUsuario() {
  const { endereco } = useParams();
  const { chamarAdmin } = useAdminAuth();

  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  // ── Bloqueio ───────────────────────────────────────────────────────
  const [bloqueioAberto, setBloqueioAberto] = useState(false);
  const [bloqJust, setBloqJust] = useState("");
  const [bloqExec, setBloqExec] = useState(false);
  const [bloqMsg, setBloqMsg] = useState("");

  // ── Ajuste de saldo ────────────────────────────────────────────────
  const [ajusteAberto, setAjusteAberto] = useState(false);
  const [ajusteValor, setAjusteValor] = useState("");
  const [ajusteJust, setAjusteJust] = useState("");
  const [ajusteExec, setAjusteExec] = useState(false);
  const [ajusteMsg, setAjusteMsg] = useState("");

  const carregar = useCallback(async () => {
    if (!chamarAdmin || !endereco) return;
    setCarregando(true);
    setErro("");
    try {
      const resp = await chamarAdmin(`/.netlify/functions/admin-user?endereco=${encodeURIComponent(endereco)}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);
      setPerfil(data);
    } catch (err) {
      setErro(err?.message || "falha");
    } finally {
      setCarregando(false);
    }
  }, [chamarAdmin, endereco]);

  useEffect(() => { carregar(); }, [carregar]);

  async function bloquearOuDesbloquear(bloquear) {
    if (!bloqJust.trim() || bloqJust.trim().length < 6) return;
    setBloqExec(true);
    setBloqMsg("");
    try {
      const resp = await chamarAdmin("/.netlify/functions/admin-user-bloqueio", {
        method: "POST",
        body: JSON.stringify({ cliente_id: endereco, bloquear, justificativa: bloqJust.trim() }),
      });
      const data = await resp.json();
      setBloqMsg(data?.mensagem || (data?.ok ? "OK" : `Erro: ${resp.status}`));
      if (data?.ok) carregar();
    } catch (err) {
      setBloqMsg(err?.message || "falha");
    } finally {
      setBloqExec(false);
    }
  }

  async function ajustar() {
    const v = parseInt(ajusteValor, 10);
    if (!Number.isFinite(v) || v === 0) return;
    if (!ajusteJust.trim() || ajusteJust.trim().length < 6) return;
    setAjusteExec(true);
    setAjusteMsg("");
    try {
      const resp = await chamarAdmin("/.netlify/functions/admin-user-ajuste", {
        method: "POST",
        body: JSON.stringify({ cliente_id: endereco, valorCentavos: v, justificativa: ajusteJust.trim() }),
      });
      const data = await resp.json();
      setAjusteMsg(data?.mensagem || (data?.ok ? "OK" : `Erro: ${resp.status}`));
      if (data?.ok) { carregar(); setAjusteValor(""); setAjusteJust(""); }
    } catch (err) {
      setAjusteMsg(err?.message || "falha");
    } finally {
      setAjusteExec(false);
    }
  }

  if (!chamarAdmin) return <p style={{ color: COR.muted }}>Autentique-se para ver perfis.</p>;
  if (carregando) return <p style={{ color: COR.muted }}>A carregar…</p>;
  if (erro) return <p style={{ color: COR.danger }}>{erro}</p>;

  const p = perfil?.perfil || {};
  const saldo = perfil?.saldoRs;
  const bloqueado = perfil?.bloqueado;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <Link to="/admin/usuarios" style={{ fontSize: "0.76rem", color: COR.muted, textDecoration: "none" }}>
          ← Utilizadores
        </Link>
      </div>

      {/* IDENTIFICAÇÃO */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <h3 style={{ fontSize: "0.78rem", color: COR.primary, margin: 0, letterSpacing: "0.05em" }}>IDENTIFICAÇÃO</h3>
        <div style={{
          padding: "0.7rem 0.85rem", background: "rgba(13,18,53,0.25)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px",
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.4rem",
          fontSize: "0.76rem",
        }}>
          <div><span style={{ color: COR.muted }}>Endereço</span><br /><code style={{ color: COR.text, fontFamily: "'JetBrains Mono', monospace" }}>{endereco}</code></div>
          <div><span style={{ color: COR.muted }}>Nome</span><br /><span style={{ color: p.nome ? COR.text : COR.muted }}>{p.nome || "—"}</span></div>
          <div><span style={{ color: COR.muted }}>E-mail</span><br /><span style={{ color: p.email ? COR.text : COR.muted }}>{p.email || "—"}</span></div>
          <div><span style={{ color: COR.muted }}>Categoria</span><br /><span style={{ color: COR.text }}>{p.categoria || "—"}</span></div>
          <div><span style={{ color: COR.muted }}>Primeira atividade</span><br /><span style={{ color: COR.text }}>{quando(p.primeira_atividade)}</span></div>
          <div><span style={{ color: COR.muted }}>Última atividade</span><br /><span style={{ color: COR.text }}>{quando(p.ultima_atividade)}</span></div>
          <div><span style={{ color: COR.muted }}>Fontes</span><br />
            <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap", marginTop: "0.15rem" }}>
              {(p.fontes || []).map((f) => (
                <span key={f} style={{
                  fontSize: "0.6rem", padding: "0.1rem 0.35rem", borderRadius: "999px",
                  background: `${COR_FONTE[f] || COR.muted}1a`, color: COR_FONTE[f] || COR.muted,
                  border: `1px solid ${COR_FONTE[f] || COR.muted}44`,
                  textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700,
                }}>{f}</span>
              ))}
            </div>
          </div>
          <div>
            <span style={{ color: COR.muted }}>Estado</span><br />
            <span style={{ color: bloqueado ? COR.danger : COR.success, fontWeight: 700 }}>
              {bloqueado ? "Bloqueado" : "Ativo"}
            </span>
            {bloqueado && perfil?.bloqueioDetalhe && (
              <div style={{ fontSize: "0.64rem", color: COR.muted, marginTop: "0.1rem" }}>
                {perfil.bloqueioDetalhe.justificativa}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SALDO */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <h3 style={{ fontSize: "0.78rem", color: COR.primary, margin: 0, letterSpacing: "0.05em" }}>SALDO</h3>
        <div style={{
          padding: "0.6rem 0.85rem", background: "rgba(13,18,53,0.25)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px",
          display: "flex", gap: "1.5rem", flexWrap: "wrap",
        }}>
          <div>
            <span style={{ fontSize: "0.66rem", color: COR.muted, textTransform: "uppercase" }}>Saldo R$</span><br />
            <strong style={{ fontSize: "1.1rem", color: COR.success }}>
              {saldo ? brl(saldo.centavos) : "—"}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: "0.66rem", color: COR.muted, textTransform: "uppercase" }}>Senhas on-chain</span><br />
            <span style={{ fontSize: "0.8rem", color: COR.muted }}>Carregar no futuro (D2)</span>
          </div>
        </div>
      </section>

      {/* CRÉDITOS */}
      <section>
        <h3 style={{ fontSize: "0.78rem", color: COR.primary, margin: "0 0 0.35rem", letterSpacing: "0.05em" }}>CRÉDITOS</h3>
        {perfil?.creditos?.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th style={th}>Data</th><th style={th}>Valor</th><th style={th}>Fonte</th>
              </tr>
            </thead>
            <tbody>
              {perfil.creditos.map((c) => (
                <tr key={c.pedido_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={td}>{quando(c.criado_em)}</td>
                  <td style={{ ...td, color: COR.success }}>{brl(c.payload?.valorCentavos)}</td>
                  <td style={{ ...td, color: COR.muted }}>{c.payload?.fonte || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={{ color: COR.muted, fontSize: "0.74rem", fontStyle: "italic" }}>Sem créditos.</p>}
      </section>

      {/* AÇÕES */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <h3 style={{ fontSize: "0.78rem", color: COR.primary, margin: 0, letterSpacing: "0.05em" }}>AÇÕES</h3>

        {/* Bloqueio */}
        <div style={{ padding: "0.6rem 0.8rem", background: "rgba(13,18,53,0.25)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <div>
              <span style={{ fontSize: "0.76rem", fontWeight: 700, color: COR.text }}>{bloqueado ? "Desbloquear" : "Bloquear"} utilizador</span>
              <div style={{ fontSize: "0.64rem", color: COR.muted }}>(!)️ O bloqueio regista mas ainda não impede sessões nem pagamentos.</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setBloqueioAberto(!bloqueioAberto)}
              className="!border-white/20 !text-[#e8f0fe] !rounded-md shrink-0">
              {bloqueioAberto ? "Cancelar" : bloqueado ? "Desbloquear" : "Bloquear"}
            </Button>
          </div>
          {bloqueioAberto && (
            <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <Input type="text" placeholder="Justificativa (mín. 6 caracteres)" value={bloqJust}
                onChange={(e) => setBloqJust(e.target.value)} autoFocus />
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <Button variant="primary" size="sm" onClick={() => bloquearOuDesbloquear(!bloqueado)}
                  disabled={bloqExec || bloqJust.trim().length < 6}>
                  {bloqExec ? "…" : `Confirmar ${bloqueado ? "desbloqueio" : "bloqueio"}`}
                </Button>
              </div>
              {bloqMsg && <p style={{ margin: 0, fontSize: "0.7rem", color: bloqMsg.startsWith("Erro") ? COR.danger : COR.success }}>{bloqMsg}</p>}
            </div>
          )}
        </div>

        {/* Ajuste de saldo */}
        <div style={{ padding: "0.6rem 0.8rem", background: "rgba(13,18,53,0.25)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <div>
              <span style={{ fontSize: "0.76rem", fontWeight: 700, color: COR.text }}>Ajuste manual de saldo</span>
              <div style={{ fontSize: "0.64rem", color: COR.muted }}>Super-admin apenas. Débito ou crédito auditável.</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setAjusteAberto(!ajusteAberto)}
              className="!border-white/20 !text-[#e8f0fe] !rounded-md shrink-0">
              {ajusteAberto ? "Cancelar" : "Ajustar"}
            </Button>
          </div>
          {ajusteAberto && (
            <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <Input type="number" placeholder="Valor em centavos (ex: 200 para +R$2, -100 para -R$1)"
                value={ajusteValor} onChange={(e) => setAjusteValor(e.target.value)} autoFocus />
              <Input type="text" placeholder="Justificativa (mín. 6 caracteres)" value={ajusteJust}
                onChange={(e) => setAjusteJust(e.target.value)} />
              <Button variant="primary" size="sm" onClick={ajustar}
                disabled={ajusteExec || !ajusteValor || ajusteJust.trim().length < 6}>
                {ajusteExec ? "…" : "Confirmar ajuste"}
              </Button>
              {ajusteMsg && <p style={{ margin: 0, fontSize: "0.7rem", color: ajusteMsg.startsWith("Erro") ? COR.danger : COR.success }}>{ajusteMsg}</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const th = { textAlign: "left", padding: "0.3rem 0.4rem", color: COR.muted, fontWeight: 600 };
const td = { padding: "0.3rem 0.4rem", verticalAlign: "top", color: COR.text };
