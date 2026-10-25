// src/components/ComprarPasseModal.jsx — UTAC106e. Balão da compra do Passe Desafio.
//
// Reutiliza o `Modal` do design system (`@/components/ui`): dá o overlay, o `role="dialog"` +
// `aria-modal="true"`, o spring de entrada e o FECHO POR ESC (Modal.jsx:19).
//
// UTAC110d-front — o balão deixou de confirmar UM Passe genérico (1 ponto, `comprar-passe-pontos`)
// e passa a ESCOLHER entre os DOIS Passes do UTAC110d (fonte: `src/lib/passes.js`):
//   · ⚡ Passe Relâmpago — R$ 2,00 → 10 pontos + 1 lance no Menor Lance Único;
//   · 🎫 Passe Programado — R$ 2,00 → 10 pontos + 1 palpite nas Ofertas Programadas.
// Cada cartão tem o SEU botão de compra (`onComprar(tipo)`); quem chama o endpoint é a Carteira
// (via `useComprarPasse`). Em erro, a mensagem aparece DENTRO do balão (`role="alert"`) e o balão
// fica aberto para nova tentativa — nunca em silêncio.
//
// Props: { aberto, onComprar, onCancelar, emCurso, erro, pontosCartao }
//   · emCurso: o tipo a ser comprado (ou null) → esse botão mostra o spinner e TODOS os botões
//     ficam desactivados; o ESC/backdrop NÃO fecham durante a compra.
//   · pontosCartao: os pontos que CONTAM para o cartão (`usePontos().pontosCartao`, só compras —
//     R1 do UTAC106f). ⚠️ Fecha a escalada do UTAC106f-R1t: antes este balão só tinha o TOTAL
//     (vindo de `comprar-passe-pontos`) e tinha de o declarar «(total)»; a Carteira passa a ler o
//     `usePontos`, logo o número aqui é o MESMO da barra «X / 50» das Ofertas Programadas.
import { Modal } from "@/components/ui";
import { TIPOS_PASSE, PRECO_PASSE, QUANTIDADES_PASSE, precoTotal, rotuloCompra } from "../lib/passes.js";

const COR = { gold: "#f5a623", muted: "#6b7db8", text: "#e8f0fe", danger: "#ef4444" };
const PONTOS_PARA_CARTAO = 50;
const ORDEM = [TIPOS_PASSE.relampago, TIPOS_PASSE.programado];

export default function ComprarPasseModal({
  aberto, onComprar, onCancelar, emCurso = null, erro = "", pontosCartao = null,
  quantidade = 1, onQuantidade, quantidadeNaLoja = false,
}) {
  const ocupado = emCurso != null;
  // UTAC112 — pacote escolhido (1, 3, 5, 10), CONTROLADO por quem abre o balão. No APK (`quantidadeNaLoja`)
  // a Google não aceita quantidade imposta pela app: o seletor some e explica-se que a quantidade se escolhe
  // no ecrã da Google (R18-112-A). Valor fora dos pacotes → 1 (sem coerção).
  const q = quantidadeNaLoja || !QUANTIDADES_PASSE.includes(quantidade) ? 1 : quantidade;
  // Durante a compra não se fecha: nem por ESC/backdrop, nem pelo botão Cancelar.
  const fechar = ocupado ? () => {} : onCancelar;

  return (
    <Modal open={aberto} onClose={fechar} labelledBy="utac110d-passe-titulo">
      <h2
        id="utac110d-passe-titulo"
        style={{ margin: "0 0 0.35rem", fontSize: "1.05rem", fontWeight: 800, color: COR.gold }}
      >
        Escolha o seu Passe Desafio
      </h2>
      <p style={{ margin: "0 0 0.9rem", color: COR.muted, fontSize: "0.85rem", lineHeight: 1.5 }}>
        Cada Passe custa <strong style={{ color: COR.gold }}>{PRECO_PASSE}</strong>
        {quantidadeNaLoja ? "." : ", debitados do seu saldo."}
        {!quantidadeNaLoja && q > 1 && (
          <> Total: <strong data-total-passes="" style={{ color: COR.gold }}>{q} × {PRECO_PASSE} = {precoTotal(q)}</strong>.</>
        )}
      </p>

      {quantidadeNaLoja ? (
        <p data-quantidade-na-loja="" style={{ margin: "0 0 0.9rem", color: COR.muted, fontSize: "0.82rem", lineHeight: 1.5 }}>
          Quer mais de um? Se a Google Play oferecer a opção, escolha a quantidade na tela de pagamento dela.
        </p>
      ) : (
        <div role="radiogroup" aria-label="Quantidade de passes" data-quantidade-passes=""
          style={{ display: "flex", gap: "0.5rem", margin: "0 0 0.9rem", flexWrap: "wrap" }}>
          {QUANTIDADES_PASSE.map((n) => {
            const ativo = n === q;
            return (
              <button key={n} type="button" role="radio" aria-checked={ativo ? "true" : "false"} data-quantidade={n}
                disabled={ocupado} onClick={() => onQuantidade?.(n)}
                style={{
                  minWidth: "56px", minHeight: "48px", padding: "0.5rem 0.9rem", borderRadius: "12px", fontWeight: 800,
                  fontSize: "0.9rem", cursor: ocupado ? "not-allowed" : "pointer",
                  background: ativo ? "rgba(245,166,35,0.22)" : "transparent",
                  border: `1px solid ${ativo ? COR.gold : "rgba(245,166,35,0.35)"}`, color: ativo ? COR.gold : COR.text,
                }}>
                {n}
              </button>
            );
          })}
        </div>
      )}

      {Number.isSafeInteger(pontosCartao) && pontosCartao >= 0 && (
        <p data-pontos-cartao="" style={{ margin: "0 0 0.9rem", color: COR.muted, fontSize: "0.82rem" }}>
          Seus pontos de cartão: <strong style={{ color: COR.gold }}>{pontosCartao} / {PONTOS_PARA_CARTAO}</strong>
        </p>
      )}

      <div style={{ display: "grid", gap: "0.7rem", marginBottom: "0.9rem" }}>
        {ORDEM.map((p) => {
          const esteEmCurso = emCurso === p.tipo;
          return (
            <section
              key={p.tipo}
              data-passe={p.tipo}
              aria-label={p.nome}
              style={{
                padding: "0.85rem 0.95rem", borderRadius: "14px",
                background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.25)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: COR.text }}>
                  {p.icone} {p.nome}
                </h3>
                <strong style={{ color: COR.gold, fontSize: "0.95rem", whiteSpace: "nowrap" }}>{precoTotal(q)}</strong>
              </div>
              <p style={{ margin: "0.3rem 0 0.7rem", color: COR.text, opacity: 0.85, fontSize: "0.82rem", lineHeight: 1.45 }}>
                {p.beneficio}
              </p>
              <button
                type="button"
                onClick={() => onComprar?.(p.tipo, q)}
                disabled={ocupado}
                aria-busy={esteEmCurso ? "true" : undefined}
                style={{
                  width: "100%", minHeight: "48px", padding: "0.6rem 1rem", borderRadius: "12px",
                  background: "rgba(245,166,35,0.14)", border: "1px solid rgba(245,166,35,0.4)",
                  color: COR.gold, fontWeight: 800, fontSize: "0.85rem",
                  cursor: ocupado ? (esteEmCurso ? "wait" : "not-allowed") : "pointer",
                  opacity: ocupado && !esteEmCurso ? 0.5 : 1,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
                }}
              >
                {esteEmCurso && (
                  <span
                    data-spinner="true"
                    aria-hidden="true"
                    style={{ display: "inline-block", animation: "gut-spin 0.9s linear infinite" }}
                  >
                    ⏳
                  </span>
                )}
                {esteEmCurso ? "Processando…" : rotuloCompra(p.nome, q)}
              </button>
            </section>
          );
        })}
      </div>

      {erro && (
        <p role="alert" style={{
          margin: "0 0 0.9rem", padding: "0.6rem 0.8rem", borderRadius: "10px",
          background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.3)",
          color: COR.danger, fontSize: "0.82rem", fontWeight: 700, lineHeight: 1.4,
        }}>
          ⚠️ {erro}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onCancelar}
          disabled={ocupado}
          style={{
            minHeight: "48px", padding: "0.6rem 1.1rem", borderRadius: "10px",
            cursor: ocupado ? "not-allowed" : "pointer",
            background: "transparent", border: "1px solid rgba(107,125,184,0.45)",
            color: COR.muted, fontWeight: 700, fontSize: "0.82rem",
            opacity: ocupado ? 0.5 : 1,
          }}
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
