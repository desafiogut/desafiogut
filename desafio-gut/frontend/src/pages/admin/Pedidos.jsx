// Pedidos — MC-ECOMMERCE-01a. O operador despacha as vendas do catálogo:
// vê o endereço de entrega, regista o envio (rastreio) e a nota fiscal (emitida fora do app).
//
// O pedido NÃO se cria aqui: nasce da consolidação da edição (ponte apuração → catálogo).
// «Reprocessar venda» existe para o caso de a ponte ter falhado depois do recibo on-chain —
// relê o marcador de consolidação; o vencedor nunca vem deste ecrã.
//
// PII (MC89.9): endereço e CPF ficam ocultos por omissão, com toggle por pedido.

import { useEffect, useState } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { Button } from "../../components/ui";
import { COR, brl } from "./_ui.jsx";
import EstadoVazio from "../../components/admin/EstadoVazio.jsx";
import EnderecoTruncado from "../../components/admin/EnderecoTruncado.jsx";
import { estadoDoPedido, resumoEndereco, ROTULO_ESTADO } from "../../lib/pedidos.js";

const ROTULO_OPERADOR = { ...ROTULO_ESTADO, sem_endereco: "Aguarda endereço do comprador", aguarda_envio: "Pronto para enviar" };

async function chamar(chamarAdmin, url, opts) {
  const resp = await chamarAdmin(url, opts);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);
  return data;
}

export default function Pedidos() {
  const { chamarAdmin } = useAdminAuth();
  const isMobile = useIsMobile();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [edicao, setEdicao] = useState("");
  const [msgReproc, setMsgReproc] = useState("");

  async function carregar() {
    if (!chamarAdmin) { setLista([]); return; }
    setCarregando(true); setErro("");
    try { setLista((await chamar(chamarAdmin, "/.netlify/functions/pedidos", { method: "GET" })).pedidos || []); }
    catch (err) { setErro(err?.message || "falha"); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, [chamarAdmin]);

  async function reprocessar() {
    const id = edicao.trim().toUpperCase();
    if (!id || !window.confirm(`Reprocessar a venda da edição ${id}? O vencedor vem do registo de consolidação.`)) return;
    setMsgReproc("Enviando…");
    try {
      await chamar(chamarAdmin, `/.netlify/functions/pedidos?acao=reprocessar-venda&edicaoId=${encodeURIComponent(id)}`, { method: "POST" });
      setMsgReproc(`✓ Venda da edição ${id} registrada`); carregar();
    } catch (err) { setMsgReproc(`✗ ${err.message}`); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.78rem", color: COR.muted }}>
          {lista.length} pedido(s) · {lista.filter((p) => estadoDoPedido(p) === "aguarda_envio").length} por enviar
        </span>
        <Button variant="ghost" size="sm" onClick={carregar} disabled={carregando} aria-label="Recarregar"
          className="ml-auto rounded-full !border-[#f5a623]/30 !text-[#f5a623]">
          {carregando ? "…" : "Atualizar"}
        </Button>
      </div>
      {erro && <p role="alert" style={{ color: COR.danger, fontSize: "0.78rem" }}>{erro}</p>}
      {lista.length === 0 && !carregando && !erro && (
        <EstadoVazio titulo="Nenhum pedido"
          descricao="Os pedidos aparecem quando uma edição ligada a um produto do catálogo é consolidada." />
      )}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {lista.map((p) => <ItemPedido key={p.produtoId} p={p} chamarAdmin={chamarAdmin} isMobile={isMobile} aoGravar={carregar} />)}
      </ul>

      <details style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: COR.muted }}>
        <summary style={{ cursor: "pointer" }}>Reprocessar a venda de uma edição consolidada</summary>
        <p style={{ margin: "0.4rem 0" }}>
          Só é preciso quando a consolidação respondeu com <code>venda.ok: false</code>. Exige nível admin.
        </p>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <input value={edicao} onChange={(e) => setEdicao(e.target.value)} placeholder="RELAMP-12" aria-label="Id da edição"
            style={campo} />
          <Button variant="ghost" size="sm" onClick={reprocessar}>Reprocessar</Button>
          {msgReproc && <span>{msgReproc}</span>}
        </div>
      </details>
    </div>
  );
}

const campo = {
  padding: "0.4rem 0.6rem", borderRadius: "8px", fontSize: "0.8rem", background: "rgba(5,8,24,0.6)",
  color: COR.text, border: "1px solid rgba(245,166,35,0.25)",
};

function ItemPedido({ p, chamarAdmin, isMobile, aoGravar }) {
  const passo = estadoDoPedido(p);
  const [pii, setPii] = useState(false);
  const [rastreio, setRastreio] = useState({ codigo: "", transportadora: "" });
  const [nfe, setNfe] = useState({ numero: "", serie: "1", chave: "" });
  const [msg, setMsg] = useState("");

  async function enviar(acao, corpo) {
    setMsg("Enviando…");
    try {
      await chamar(chamarAdmin, `/.netlify/functions/pedidos?acao=${acao}&produtoId=${encodeURIComponent(p.produtoId)}`,
        { method: "PUT", body: JSON.stringify(corpo) });
      setMsg("✓ Registrado e comprador notificado"); aoGravar();
    } catch (err) { setMsg(`✗ ${err.message}`); }
  }

  return (
    <li style={{ padding: "0.75rem 0.85rem", background: "rgba(13,18,53,0.25)", border: "1px solid rgba(245,166,35,0.15)",
      borderRadius: "10px", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <strong style={{ color: COR.text, fontSize: "0.86rem" }}>{p.produtoNome || p.produtoId}</strong>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: passo === "enviado" ? COR.success : COR.warn }}>
          {ROTULO_OPERADOR[passo]}
        </span>
        <span style={{ fontSize: "0.72rem", color: COR.muted, marginLeft: isMobile ? 0 : "auto" }}>
          {p.edicaoId} · {typeof p.valorPagoCentavos === "number" ? brl(p.valorPagoCentavos) : "—"} ·{" "}
          <EnderecoTruncado endereco={p.comprador} />
        </span>
      </div>

      {p.morada && (
        <div>
          <button type="button" onClick={() => setPii((v) => !v)}
            style={{ fontSize: "0.66rem", color: COR.muted, background: "none", border: `1px solid ${COR.muted}44`,
              borderRadius: "6px", padding: "0.15rem 0.45rem", cursor: "pointer" }}>
            {pii ? "Ocultar endereço" : "Mostrar endereço"}
          </button>
          {pii && (
            <div style={{ marginTop: "0.35rem", fontSize: "0.78rem", color: COR.text, lineHeight: 1.5 }}>
              {p.morada.nome} · CPF {p.morada.cpf}{p.morada.telefone ? ` · tel. ${p.morada.telefone}` : ""}<br />
              {resumoEndereco(p.morada)}
            </div>
          )}
        </div>
      )}

      {p.rastreio
        ? <div style={{ fontSize: "0.78rem", color: COR.text }}>🚚 {p.rastreio.transportadora}: <code>{p.rastreio.codigo}</code></div>
        : p.morada && (
          <form onSubmit={(e) => { e.preventDefault(); enviar("rastreio", rastreio); }}
            style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <input style={campo} placeholder="Código de rastreio" aria-label="Código de rastreio" value={rastreio.codigo}
              onChange={(e) => setRastreio((r) => ({ ...r, codigo: e.target.value }))} />
            <input style={campo} placeholder="Transportadora (vazio = Correios)" aria-label="Transportadora" value={rastreio.transportadora}
              onChange={(e) => setRastreio((r) => ({ ...r, transportadora: e.target.value }))} />
            <Button type="submit" variant="ghost" size="sm">Registrar envio</Button>
          </form>
        )}

      {p.nfe
        ? <div style={{ fontSize: "0.78rem", color: COR.text }}>🧾 NF-e {p.nfe.numero} / série {p.nfe.serie}{p.nfe.chave ? ` · ${p.nfe.chave}` : ""}</div>
        : (
          <form onSubmit={(e) => { e.preventDefault(); enviar("nfe", nfe); }}
            style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <input style={{ ...campo, width: "8rem" }} placeholder="Nº NF-e" aria-label="Número da NF-e" inputMode="numeric"
              value={nfe.numero} onChange={(e) => setNfe((n) => ({ ...n, numero: e.target.value }))} />
            <input style={{ ...campo, width: "4.5rem" }} placeholder="Série" aria-label="Série" inputMode="numeric"
              value={nfe.serie} onChange={(e) => setNfe((n) => ({ ...n, serie: e.target.value }))} />
            <input style={{ ...campo, flex: "1 1 16rem" }} placeholder="Chave de acesso (44 dígitos, opcional)" aria-label="Chave de acesso"
              inputMode="numeric" value={nfe.chave} onChange={(e) => setNfe((n) => ({ ...n, chave: e.target.value }))} />
            <Button type="submit" variant="ghost" size="sm">Registrar NF-e</Button>
          </form>
        )}
      {msg && <span style={{ fontSize: "0.74rem", color: msg.startsWith("✗") ? COR.danger : COR.muted }}>{msg}</span>}
    </li>
  );
}
