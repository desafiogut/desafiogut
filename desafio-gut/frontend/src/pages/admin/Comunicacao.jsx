// Comunicação e Notificações — Tela 6 do plano do MC89.5.
// MC89.18 (Fase 6). Formulário de envio + histórico.
// WhatsApp e Push desabilitados com nota (T6: in-app → e-mail → push).

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { Button, Input } from "../../components/ui";
import { COR } from "./_ui.jsx";
import EstadoVazio from "../../components/admin/EstadoVazio.jsx";

function quando(iso) { return iso ? new Date(iso).toLocaleString("pt-BR") : "—"; }

export default function Comunicacao() {
  const { chamarAdmin } = useAdminAuth();

  // Form
  const [canal, setCanal] = useState("inapp");
  const [destino, setDestino] = useState("todos");
  const [ids, setIds] = useState("");
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [link, setLink] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");

  // Histórico
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const carregarHistorico = useCallback(async () => {
    if (!chamarAdmin) return;
    setCarregando(true);
    try {
      const r = await chamarAdmin("/.netlify/functions/admin-notifications?limite=15");
      const d = await r.json().catch(() => null);
      setHistorico(d?.notificacoes || []);
    } catch {} finally { setCarregando(false); }
  }, [chamarAdmin]);

  useEffect(() => { carregarHistorico(); }, [carregarHistorico]);

  async function enviar(e) {
    e.preventDefault();
    if (!mensagem.trim()) return;
    setEnviando(true); setMsg("");
    try {
      const body = { canal, destino, mensagem: mensagem.trim(), titulo: titulo.trim() || undefined, link: link.trim() || undefined };
      if (destino === "especifico") body.ids = ids.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      const r = await chamarAdmin("/.netlify/functions/admin-notify", { method: "POST", body: JSON.stringify(body) });
      const d = await r.json().catch(() => null);
      if (r.ok) { setMsg(`Enviado: ${d?.entregues || 0}/${d?.total || 0} entregues.`); setMensagem(""); carregarHistorico(); }
      else setMsg(`Erro: ${d?.error?.message || r.status}`);
    } catch (err) { setMsg(err?.message || "falha"); }
    finally { setEnviando(false); }
  }

  if (!chamarAdmin) return <p style={{ color: COR.muted }}>Autentique-se para usar as notificações.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* FORMULÁRIO */}
      <section>
        <h3 style={sh}>ENVIAR NOTIFICAÇÃO</h3>
        <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <select value={canal} onChange={(e) => setCanal(e.target.value)} style={sel}>
              <option value="inapp">In-app</option>
              <option value="email">E-mail</option>
              <option value="whatsapp" disabled>WhatsApp (em breve)</option>
              <option value="push" disabled>Push (em breve)</option>
            </select>
            <select value={destino} onChange={(e) => setDestino(e.target.value)} style={sel}>
              <option value="todos">Todos</option>
              <option value="admins">Admins</option>
              <option value="especifico">Específico</option>
            </select>
          </div>
          {destino === "especifico" && (
            <Input type="text" placeholder="Endereços (separados por vírgula ou linha)" value={ids}
              onChange={(e) => setIds(e.target.value)} />
          )}
          <Input type="text" placeholder="Título (opcional para in-app)" value={titulo}
            onChange={(e) => setTitulo(e.target.value)} />
          <textarea placeholder="Mensagem" value={mensagem} onChange={(e) => setMensagem(e.target.value)}
            rows={3} required
            style={{ ...ta, background: "rgba(13,18,53,0.4)", color: COR.text, border: `1px solid rgba(255,255,255,0.12)`, borderRadius: "6px", padding: "0.5rem", fontSize: "0.78rem", resize: "vertical" }} />
          <Input type="text" placeholder="Link (opcional)" value={link}
            onChange={(e) => setLink(e.target.value)} />
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Button type="submit" variant="primary" size="sm" disabled={enviando || !mensagem.trim()}>
              {enviando ? "A enviar…" : "Enviar"}
            </Button>
            {msg && <span style={{ fontSize: "0.72rem", color: msg.startsWith("Erro") ? COR.danger : COR.success }}>{msg}</span>}
          </div>
        </form>
        {(canal === "email") && <p style={{ fontSize: "0.64rem", color: COR.muted, marginTop: "0.3rem" }}>E-mail alcança apenas utilizadores com e-mail registado (cotas corporativas — 3 de 7).</p>}
        {(canal === "whatsapp" || canal === "push") && <p style={{ fontSize: "0.64rem", color: COR.warn, marginTop: "0.3rem" }}>Este canal ainda não está implementado. Será ativado num MC próprio.</p>}
      </section>

      {/* HISTÓRICO */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.4rem" }}>
          <h3 style={{ ...sh, margin: 0 }}>HISTÓRICO</h3>
          <Button variant="ghost" size="sm" onClick={carregarHistorico} disabled={carregando} className="!border-white/15 !text-[#94a3b8]">↻</Button>
        </div>
        {historico.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma notificação"
            descricao="As notificações enviadas por este painel aparecem aqui, com o estado de entrega."
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.68rem" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <th style={th}>Data</th><th style={th}>Canal</th><th style={th}>Destino</th><th style={th}>Mensagem</th><th style={th}>Entregues</th>
            </tr></thead>
            <tbody>{historico.map((n) => (
              <tr key={n.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={td}>{quando(n.criado_em)}</td>
                <td style={{...td,textTransform:"uppercase",fontSize:"0.6rem"}}>{n.canal}</td>
                <td style={td}>{n.destino}</td>
                <td style={{...td,maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.mensagem}</td>
                <td style={{...td,color:n.falhas>0?COR.warn:COR.success}}>{n.entregues}/{n.total}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const sh = { fontSize: "0.78rem", color: COR.primary, margin: "0 0 0.5rem", letterSpacing: "0.05em" };
const th = { textAlign: "left", padding: "0.3rem 0.4rem", color: COR.muted, fontWeight: 600, whiteSpace: "nowrap" };
const td = { padding: "0.3rem 0.4rem", verticalAlign: "top", color: COR.text };
const sel = { background: "rgba(13,18,53,0.5)", color: COR.text, border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "0.2rem 0.4rem", fontSize: "0.7rem" };
const ta = { fontFamily: "inherit" };
