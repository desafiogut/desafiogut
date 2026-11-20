// _formAcaoEdicao.jsx — PADRÃO CANÓNICO da ACÇÃO de uma edição (SKILL: utac-edicoes).
//
// PORQUE EXISTE: a edição especial apareceu em produção com um «sub-cartão» próprio dentro do cartão
// da edição (`CardLance` inteiro: cabeçalho «🎯 Dar Lance», barra de carteira, rodapé) e com o botão
// a ocupar a largura toda (texto centrado), ao lado do formulário de «Dar palpite» da Oferta
// Programada, que é o padrão aprovado. O operador: «o layout é idêntico ao Dar Palpite».
//
// A regra passa a ser CÓDIGO, não comentário: a acção de qualquer edição (lance ou palpite) é
//   rótulo  →  LINHA [ input (flex) · botão (auto) ]  →  nota opcional
// dentro do `CartaoEdicao`, sem segundo cartão, sem botão de largura toda. Quem precisar de um
// formulário novo numa edição usa ESTE componente — não desenha um próprio.
//
// ⚠️ NÃO é um cartão: não tem fundo, borda própria nem padding. O invólucro é sempre o `CartaoEdicao`.
import { useId } from "react";

export const COR_ACAO = Object.freeze({ gold: "#f5a623", text: "#e8f0fe", muted: "#6b7db8" });

/** Os estilos canónicos. Um só objecto congelado: os dois ecrãs partilham a MESMA referência. */
export const ESTILO_ACAO = Object.freeze({
  envolvito: Object.freeze({ paddingTop: "0.6rem", borderTop: "1px solid rgba(255,255,255,0.08)" }),
  label: Object.freeze({
    display: "block", color: COR_ACAO.text, fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem",
  }),
  // `flex-wrap` + `flex: 1 1 120px` no input: a 375 px o botão desce de linha em vez de espremer o campo.
  linha: Object.freeze({ display: "flex", gap: "0.5rem", flexWrap: "wrap" }),
  input: Object.freeze({
    flex: "1 1 120px", minHeight: "48px", padding: "0.6rem 0.75rem", borderRadius: "10px",
    border: "1px solid rgba(107,125,184,0.45)", background: "rgba(12,16,24,0.55)",
    color: COR_ACAO.text, fontSize: "0.9rem", boxSizing: "border-box",
  }),
  botao: Object.freeze({
    minHeight: "48px", padding: "0.6rem 1.1rem", borderRadius: "10px", border: "none",
    background: COR_ACAO.gold, color: "#12161f", fontWeight: 800, fontSize: "0.86rem", cursor: "pointer",
  }),
  botaoDesabilitado: Object.freeze({ background: "rgba(107,125,184,0.35)", cursor: "wait" }),
});

/**
 * A acção de UMA edição — o único formulário oficial (lance e palpite).
 *
 * @param {object} props
 * @param {string} props.id id do `<input>` (ligado ao `<label>` por `htmlFor`)
 * @param {string} props.rotulo texto do rótulo («Seu lance (em pontos)» · «Seu palpite (nº de lances)»)
 * @param {string|number} props.valor valor controlado
 * @param {(e: Event) => void} props.onChange
 * @param {string} [props.placeholder]
 * @param {string} props.botao texto do botão («Dar lance» · «Dar palpite»)
 * @param {boolean} [props.enviando] mostra «Enviando…» e desliga o botão
 * @param {boolean} [props.desabilitado] desliga campo e botão
 * @param {() => void} props.onEnviar
 * @param {"text"|"number"} [props.tipo]
 * @param {number|string} [props.min]
 * @param {number|string} [props.max]
 * @param {number|string} [props.step]
 * @param {import("react").ReactNode} [props.extra] nota por baixo (custo, saldo, avisos)
 */
/**
 * `desabilitadoCampo` — desliga só o CAMPO (ex.: enquanto o lance está a ser enviado). Sem ele, o campo
 * segue o botão. Existe porque um lance precisa de campo ESCREVÍVEL enquanto o botão está desligado por
 * o valor estar vazio — desligar os dois punha o formulário a recusar a própria escrita.
 */
export default function FormularioAcao({
  id, rotulo, valor, onChange, placeholder, botao, enviando = false, desabilitado = false,
  desabilitadoCampo, onEnviar, tipo = "text", min, max, step, inputMode = "numeric", extra = null,
  idGerado, moldura = true,
}) {
  const gerado = useId();
  const campoId = id ?? idGerado ?? gerado;
  const bloqueado = desabilitado || enviando;
  const campoBloqueado = desabilitadoCampo ?? bloqueado;
  return (
    <div data-form-acao="edicao" style={moldura ? ESTILO_ACAO.envolvito : undefined}>
      <label htmlFor={campoId} style={ESTILO_ACAO.label}>{rotulo}</label>
      <div style={ESTILO_ACAO.linha}>
        <input
          id={campoId}
          type={tipo}
          inputMode={inputMode}
          min={min}
          max={max}
          step={step}
          value={valor}
          onChange={onChange}
          placeholder={placeholder}
          disabled={campoBloqueado}
          style={ESTILO_ACAO.input}
        />
        <button
          type="button"
          onClick={onEnviar}
          disabled={bloqueado}
          style={{ ...ESTILO_ACAO.botao, ...(bloqueado ? ESTILO_ACAO.botaoDesabilitado : null) }}
        >
          {enviando ? "Enviando…" : botao}
        </button>
      </div>
      {extra}
    </div>
  );
}
