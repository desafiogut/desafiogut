// src/components/ResgatarCartaoModal.jsx — UTAC106g. Balão de resgate do cartão colecionável.
//
// Reutiliza o `Modal` do design system (`@/components/ui`) — o MESMO primitivo do `ComprarPasseModal`
// (dá o overlay, o `role="dialog"` + `aria-modal="true"`, o spring de entrada e o fecho por ESC).
// Aqui vive o conteúdo, o FORMULÁRIO DE MORADA e as duas saídas (Confirmar/Cancelar).
//
// ⚠️ A regra da morada NÃO se duplica: usa `ENDERECO_VAZIO` / `UFS` / `erroDoEndereco` /
// `formatarCep` de `src/lib/pedidos.js` — a validação AUTORITATIVA continua a ser a do servidor
// (`_lib/pedidos.mjs` → `validarMorada`), chamada pelo endpoint `resgatar-cartao`.
//
// Props: { aberto, onConfirmar, onCancelar, loading, erro }
//   · loading → o botão «Confirmar resgate» mostra o spinner e ambos os botões ficam desactivados;
//     o ESC/backdrop NÃO fecham durante o loading (não se abandona um resgate a meio).

import { useState } from "react";
import { Modal } from "@/components/ui";
import { ENDERECO_VAZIO, UFS, erroDoEndereco, formatarCep } from "../lib/pedidos.js";

const COR = { gold: "#f5a623", muted: "#6b7db8", text: "#e8f0fe", danger: "#ff6b6b" };
export const CARTAO_ID = "cartao-familia-quildo";
const PONTOS_DO_CARTAO = 50;

const CAMPO = {
  width: "100%", padding: "0.5rem 0.6rem", borderRadius: "8px", boxSizing: "border-box",
  border: "1px solid rgba(107,125,184,0.45)", background: "rgba(12,18,38,0.55)",
  color: COR.text, fontSize: "0.85rem",
};
const ROTULO = { display: "block", margin: "0 0 0.2rem", color: COR.muted, fontSize: "0.74rem" };
const LINHA = { margin: "0 0 0.6rem" };

export default function ResgatarCartaoModal({ aberto, onConfirmar, onCancelar, loading = false, erro = "" }) {
  const [form, setForm] = useState(ENDERECO_VAZIO);
  const [erroLocal, setErroLocal] = useState("");
  // Durante o loading não se fecha: nem por ESC/backdrop, nem pelo botão Cancelar.
  const fechar = loading ? () => {} : onCancelar;

  const mudar = (campo) => (e) => {
    const v = campo === "cep" ? formatarCep(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [campo]: v }));
  };

  const confirmar = async () => {
    const problema = erroDoEndereco(form);
    setErroLocal(problema || "");
    if (problema) return;
    await onConfirmar(form);
  };

  const mensagem = erroLocal || erro;

  return (
    <Modal open={aberto} onClose={fechar} labelledBy="utac106g-resgate-titulo">
      <h2 id="utac106g-resgate-titulo" style={{ margin: "0 0 0.5rem", fontSize: "1.05rem", fontWeight: 800, color: COR.gold }}>
        Resgatar cartão colecionável
      </h2>

      <p style={{ margin: "0 0 0.9rem", color: COR.muted, fontSize: "0.9rem", lineHeight: 1.5 }}>
        Você vai trocar <strong style={{ color: COR.text }}>{PONTOS_DO_CARTAO} pontos</strong> pelo cartão da
        Família Quildo. Confirme os dados de entrega.
      </p>

      {mensagem && (
        <p role="alert" style={{ margin: "0 0 0.7rem", color: COR.danger, fontSize: "0.8rem", fontWeight: 700 }}>
          {mensagem}
        </p>
      )}

      <div style={LINHA}>
        <label style={ROTULO} htmlFor="rg-nome">Nome de quem recebe</label>
        <input id="rg-nome" style={CAMPO} value={form.nome} onChange={mudar("nome")} disabled={loading} />
      </div>
      <div style={LINHA}>
        <label style={ROTULO} htmlFor="rg-cpf">CPF</label>
        <input id="rg-cpf" style={CAMPO} value={form.cpf} onChange={mudar("cpf")} disabled={loading} />
      </div>
      <div style={{ display: "flex", gap: "0.6rem", ...LINHA }}>
        <div style={{ flex: "0 0 40%" }}>
          <label style={ROTULO} htmlFor="rg-cep">CEP</label>
          <input id="rg-cep" style={CAMPO} value={form.cep} onChange={mudar("cep")} disabled={loading} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={ROTULO} htmlFor="rg-cidade">Cidade</label>
          <input id="rg-cidade" style={CAMPO} value={form.cidade} onChange={mudar("cidade")} disabled={loading} />
        </div>
        <div style={{ flex: "0 0 22%" }}>
          <label style={ROTULO} htmlFor="rg-uf">UF</label>
          <select id="rg-uf" style={CAMPO} value={form.uf} onChange={mudar("uf")} disabled={loading}>
            <option value="">—</option>
            {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div style={LINHA}>
        <label style={ROTULO} htmlFor="rg-logradouro">Rua / avenida</label>
        <input id="rg-logradouro" style={CAMPO} value={form.logradouro} onChange={mudar("logradouro")} disabled={loading} />
      </div>
      <div style={{ display: "flex", gap: "0.6rem", ...LINHA }}>
        <div style={{ flex: "0 0 30%" }}>
          <label style={ROTULO} htmlFor="rg-numero">Número</label>
          <input id="rg-numero" style={CAMPO} value={form.numero} onChange={mudar("numero")} disabled={loading} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={ROTULO} htmlFor="rg-complemento">Complemento (opcional)</label>
          <input id="rg-complemento" style={CAMPO} value={form.complemento} onChange={mudar("complemento")} disabled={loading} />
        </div>
      </div>
      <div style={LINHA}>
        <label style={ROTULO} htmlFor="rg-bairro">Bairro</label>
        <input id="rg-bairro" style={CAMPO} value={form.bairro} onChange={mudar("bairro")} disabled={loading} />
      </div>
      <div style={LINHA}>
        <label style={ROTULO} htmlFor="rg-telefone">Telefone com DDD (opcional)</label>
        <input id="rg-telefone" style={CAMPO} value={form.telefone} onChange={mudar("telefone")} disabled={loading} />
      </div>

      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end", flexWrap: "wrap", marginTop: "0.4rem" }}>
        <button
          type="button" onClick={onCancelar} disabled={loading}
          style={{
            padding: "0.6rem 1rem", borderRadius: "10px", cursor: loading ? "not-allowed" : "pointer",
            background: "transparent", border: "1px solid rgba(107,125,184,0.45)",
            color: COR.muted, fontWeight: 700, fontSize: "0.82rem", opacity: loading ? 0.5 : 1,
          }}
        >
          Cancelar
        </button>
        <button
          type="button" onClick={confirmar} disabled={loading} aria-busy={loading ? "true" : undefined}
          style={{
            padding: "0.6rem 1.2rem", border: "none", borderRadius: "12px",
            background: "linear-gradient(135deg,#f5a623,#e89400)", color: "#fff",
            fontWeight: 800, fontSize: "0.85rem", cursor: loading ? "wait" : "pointer",
            boxShadow: "0 4px 14px rgba(245,166,35,0.35)",
            display: "inline-flex", alignItems: "center", gap: "0.45rem", opacity: loading ? 0.85 : 1,
          }}
        >
          {loading && (
            <span data-spinner="true" aria-hidden="true"
              style={{ display: "inline-block", animation: "gut-spin 0.9s linear infinite" }}>
              ⏳
            </span>
          )}
          {loading ? "Processando…" : "Confirmar resgate"}
        </button>
      </div>
    </Modal>
  );
}
