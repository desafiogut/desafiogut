import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPut } from "../../lib/api.js";
import {
  ENDERECO_VAZIO, UFS, erroDoEndereco, estadoDoPedido, formatarCep, podeMarcarRecebido, resumoEndereco, ROTULO_ESTADO,
  textoPrazo,
} from "../../lib/pedidos.js";
import { COR, caixa, tituloSecao, legenda, reais } from "./_estilo.js";

/**
 * Meus pedidos — MC-ECOMMERCE-01a.
 *
 * O pedido nasce sozinho quando o comprador vence uma edição ligada a um produto do
 * catálogo (ponte apuração → catálogo, no servidor). Aqui o comprador dá o endereço de
 * entrega e acompanha o envio e a nota fiscal.
 *
 * Quatro estados, como as outras secções pessoais desta tela (lição do MC94): sem sessão,
 * a carregar, erro e vazio — nenhum deles afirma um facto sobre quem a app não identificou.
 */
export default function MeusPedidos({ temSessao = false, authToken = null, endereco = null, isMobile = false }) {
  const [estado, setEstado] = useState({ carregando: false, erro: null, pedidos: [] });

  const carregar = useCallback(async () => {
    if (!authToken) return;
    setEstado((s) => ({ ...s, carregando: true, erro: null }));
    const r = await apiGet("pedidos", { token: authToken }).catch(() => null);
    if (!r?.ok) {
      setEstado({ carregando: false, erro: "Não foi possível carregar seus pedidos.", pedidos: [] });
      return;
    }
    setEstado({ carregando: false, erro: null, pedidos: Array.isArray(r.data?.pedidos) ? r.data.pedidos : [] });
  }, [authToken]);

  useEffect(() => { carregar(); }, [carregar]);

  let corpo;
  if (!temSessao) corpo = <p style={legenda(isMobile)}>Entre na sua conta para ver seus pedidos.</p>;
  else if (!authToken || estado.carregando) corpo = <p style={legenda(isMobile)}>Carregando pedidos…</p>;
  else if (estado.erro) corpo = (
    <p style={legenda(isMobile)}>
      {estado.erro}{" "}
      <button type="button" onClick={carregar} style={{ color: COR.primary, background: "none", border: 0, cursor: "pointer", fontWeight: 700 }}>
        Tentar de novo
      </button>
    </p>
  );
  else if (estado.pedidos.length === 0) corpo = (
    <p style={legenda(isMobile)}>
      Você ainda não tem pedidos. Quando vencer uma edição de um produto da vitrine, o pedido aparece aqui.
    </p>
  );
  else corpo = (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {estado.pedidos.map((p) => (
        <CartaoPedido key={p.produtoId} pedido={p} authToken={authToken} endereco={endereco} isMobile={isMobile}
          aoGravar={carregar} />
      ))}
    </div>
  );

  return (
    <section style={caixa(isMobile)} aria-labelledby="titulo-meus-pedidos">
      <h2 id="titulo-meus-pedidos" style={tituloSecao(isMobile)}>📦 Meus pedidos</h2>
      {corpo}
    </section>
  );
}

// Exportado só para o teste de renderização do MC102 (o arnês carrega exports default).
export function CartaoPedido({ pedido, authToken, endereco, isMobile, aoGravar }) {
  const passo = estadoDoPedido(pedido);
  const [editando, setEditando] = useState(passo === "sem_endereco");
  const prazo = textoPrazo(pedido.prazo_entrega_dias);
  // MC102 — «Recebi»: um botão, uma chamada. O servidor valida o dono e a idempotência.
  const [recebendo, setRecebendo] = useState(false);
  const [erroRecebi, setErroRecebi] = useState(null);
  async function marcarRecebi() {
    setRecebendo(true); setErroRecebi(null);
    const r = await apiPut(`pedidos?acao=recebido&produtoId=${encodeURIComponent(pedido.produtoId)}`, {}, { token: authToken })
      .catch(() => null);
    setRecebendo(false);
    if (!r?.ok) { setErroRecebi(r?.data?.error?.message || "Não foi possível confirmar o recebimento. Tente de novo."); return; }
    aoGravar();
  }

  return (
    <article style={{ border: `1px solid ${COR.borda}`, borderRadius: "12px", padding: isMobile ? "0.75rem" : "0.9rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
        <strong style={{ color: COR.text }}>{pedido.produtoNome || "Produto"}</strong>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: passo === "sem_endereco" ? COR.primary : COR.success }}>
          {ROTULO_ESTADO[passo]}
        </span>
      </div>
      <p style={{ ...legenda(isMobile), margin: "0.3rem 0 0" }}>
        Edição {pedido.edicaoId} · valor pago {reais(pedido.valorPagoCentavos)}{prazo ? ` · ${prazo}` : ""}
      </p>

      {pedido.rastreio && (
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: COR.text }}>
          🚚 {pedido.rastreio.transportadora}: <code>{pedido.rastreio.codigo}</code>
        </p>
      )}
      {podeMarcarRecebido(pedido, endereco) && (
        <p style={{ margin: "0.5rem 0 0" }}>
          <button type="button" onClick={marcarRecebi} disabled={recebendo} data-acao="recebi"
            style={{ padding: "0.45rem 1rem", borderRadius: "10px", border: 0, fontWeight: 800, cursor: "pointer",
              background: COR.success, color: "#050818", opacity: recebendo ? 0.6 : 1 }}>
            {recebendo ? "Confirmando…" : "Recebi"}
          </button>
          {erroRecebi && <span role="alert" style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: COR.danger }}>{erroRecebi}</span>}
        </p>
      )}
      {pedido.nfe && (
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: COR.text }}>
          🧾 NF-e nº {pedido.nfe.numero}, série {pedido.nfe.serie}
          {pedido.nfe.chave && <><br /><small style={{ color: COR.muted, wordBreak: "break-all" }}>Chave de acesso: {pedido.nfe.chave}</small></>}
        </p>
      )}

      {pedido.morada && !editando && (
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: COR.muted }}>
          Entregar a {pedido.morada.nome}: {resumoEndereco(pedido.morada)}
          {!pedido.rastreio && (
            <>
              {" "}
              <button type="button" onClick={() => setEditando(true)}
                style={{ color: COR.primary, background: "none", border: 0, cursor: "pointer", fontWeight: 700 }}>
                Alterar
              </button>
            </>
          )}
        </p>
      )}
      {editando && !pedido.rastreio && (
        <FormEndereco
          inicial={pedido.morada}
          produtoId={pedido.produtoId}
          authToken={authToken}
          isMobile={isMobile}
          aoGravar={() => { setEditando(false); aoGravar(); }}
          aoCancelar={pedido.morada ? () => setEditando(false) : null}
        />
      )}
    </article>
  );
}

const CAMPOS = [
  ["nome", "Nome de quem recebe", "name"],
  ["cpf", "CPF (para a nota fiscal)", "off"],
  ["cep", "CEP", "postal-code"],
  ["logradouro", "Rua / avenida", "address-line1"],
  ["numero", "Número", "off"],
  ["complemento", "Complemento (opcional)", "address-line2"],
  ["bairro", "Bairro", "address-level3"],
  ["cidade", "Cidade", "address-level2"],
  ["telefone", "Telefone com DDD (opcional)", "tel"],
];

function FormEndereco({ inicial, produtoId, authToken, isMobile, aoGravar, aoCancelar }) {
  const [f, setF] = useState(() => ({ ...ENDERECO_VAZIO, ...(inicial || {}), cep: formatarCep(inicial?.cep || "") }));
  const [erro, setErro] = useState(null);
  const [gravando, setGravando] = useState(false);
  const mudar = (k) => (e) => setF((x) => ({ ...x, [k]: k === "cep" ? formatarCep(e.target.value) : e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    const local = erroDoEndereco(f);
    if (local) { setErro(local); return; }
    setGravando(true); setErro(null);
    const r = await apiPut(`pedidos?acao=endereco&produtoId=${encodeURIComponent(produtoId)}`, { endereco: f }, { token: authToken })
      .catch(() => null);
    setGravando(false);
    if (!r?.ok) { setErro(r?.data?.error?.message || "Não foi possível salvar o endereço. Tente de novo."); return; }
    aoGravar();
  }

  const estiloCampo = {
    width: "100%", padding: "0.55rem 0.7rem", borderRadius: "10px", fontSize: "0.85rem",
    background: "rgba(5,8,24,0.6)", color: COR.text, border: `1px solid ${COR.borda}`, boxSizing: "border-box",
  };
  return (
    <form onSubmit={enviar} style={{ marginTop: "0.75rem", display: "grid", gap: "0.55rem",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }} noValidate>
      {CAMPOS.map(([k, rotulo, auto]) => (
        <label key={k} style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.72rem", color: COR.muted }}>
          {rotulo}
          <input value={f[k] ?? ""} onChange={mudar(k)} autoComplete={auto} style={estiloCampo}
            inputMode={["cpf", "cep", "telefone"].includes(k) ? "numeric" : undefined} />
        </label>
      ))}
      <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.72rem", color: COR.muted }}>
        Estado (UF)
        <select value={f.uf} onChange={mudar("uf")} style={estiloCampo} autoComplete="address-level1">
          <option value="">—</option>
          {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </label>
      <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: "0.7rem", color: COR.muted }}>
        Estes dados são usados só para a entrega e a nota fiscal deste pedido (LGPD).
      </p>
      {erro && <p role="alert" style={{ gridColumn: "1 / -1", margin: 0, fontSize: "0.8rem", color: COR.danger }}>{erro}</p>}
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="submit" disabled={gravando}
          style={{ padding: "0.55rem 1.1rem", borderRadius: "10px", border: 0, fontWeight: 800, cursor: "pointer",
            background: COR.primary, color: "#050818", opacity: gravando ? 0.6 : 1 }}>
          {gravando ? "Salvando…" : "Salvar endereço"}
        </button>
        {aoCancelar && (
          <button type="button" onClick={aoCancelar}
            style={{ padding: "0.55rem 1.1rem", borderRadius: "10px", border: `1px solid ${COR.borda}`,
              background: "transparent", color: COR.muted, cursor: "pointer" }}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
