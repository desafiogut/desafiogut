// UTAC106f — Ofertas Programadas (rota /ofertas-programadas): ECRÃ REAL do programa de fidelidade.
//
// HISTÓRIA DESTE FICHEIRO: o UTAC106b criou-o como PLACEHOLDER travado por `EM_BREVE_MODE`
// («EM BREVE»). O UTAC106f substitui o placeholder pelo ecrã real — a página DEIXA de estar
// travada. ⚠️ `EM_BREVE_MODE` continua LIGADO em `src/lib/leilaoLock.js`: ele trava os
// CRONÓMETROS do app inteiro (é outra coisa), e o UTAC106f NÃO lhe toca.
//
// O QUE O ECRÃ MOSTRA (fonte: `usePontos` → `GET /ler-pontos`, com o Bearer do titular):
//   1. pontos actuais «X / 50» + barra de progresso;
//   2. o cartão colecionável da Família Quildo (nome + descrição; sem ficheiro de imagem no repo
//      — medido: `public/artes` só tem airfryer/email-banner — por isso o cartão é desenhado em
//      CSS, para não haver <img> quebrada);
//   3. histórico de movimentos (compras de Passe, bónus de palpite);
//   4. PALPITE (bónus +2 pontos) — só quando há edição Programada a decorrer;
//   5. botão «Resgatar cartão»: VISÍVEL a ≥50 pontos, DESACTIVADO (a lógica é do UTAC106g).
//
// ⚠️ O palpite é BÓNUS — NÃO decide o cartão (requisito crítico da Google Play: jogo de habilidade).
//    O cartão é só por PONTOS DE COMPRA. Nenhuma linha deste ecrã faz depender o cartão do palpite.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { GlassCard } from "@/components/ui";
import Toast from "../widgets/toast/Toast.jsx";
import { useAppContext } from "../context/AppContext.jsx";
import { usePontos } from "../hooks/usePontos.js";
import { usePalpite } from "../hooks/usePalpite.js";

const COR = {
  gold: "#f5a623", primary: "#ff6b35", text: "#e8f0fe", muted: "#6b7db8",
  blue300: "#7aa2ff", danger: "#ff5a5f", ok: "#3ddc84",
};

const CARTAO_NOME = "Cartão da Família Quildo";
const CARTAO_DESCRICAO =
  "Cartão colecionável físico, com a arte da Família Quildo. Acumula 50 pontos para trocar por ele. "
  + "O palpite dá pontos EXTRA, mas o cartão conquista-se só com os pontos das tuas compras.";

/** Primeira edição PROGRAMADA aberta (o palpite é sobre o nº de lances dela). */
function edicaoProgramadaDe(edicoes) {
  const lista = Object.values(edicoes ?? {});
  return lista.find((e) => e?.tipo === "programado" && e?.status !== "encerrado") ?? null;
}

const dataCurta = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};
const TIPO_LABEL = { compra: "Compra de Passe", palpite: "Bónus de palpite", resgate: "Resgate" };

export default function OfertasProgramadas() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { edicoes } = useAppContext();
  // ⚠️ R1 (UTAC106f, decisão do operador = opção A): o CARTÃO conta SÓ pontos de COMPRA
  // (`pontosCartao`); `pontos` é o TOTAL e `bonusPalpite` é a parte que NÃO conta (prestígio).
  const { pontos, pontosCartao, bonusPalpite, historico, palpites, pontosParaCartao, podeResgatarCartao, loading, erro } = usePontos();

  const edicao = useMemo(() => edicaoProgramadaDe(edicoes), [edicoes]);
  const palpiteDesta = useMemo(
    () => (Array.isArray(palpites) ? palpites.find((p) => p?.edicaoId === edicao?.id) ?? null : null),
    [palpites, edicao],
  );
  const { palpite, registar, loading: aPalpitar, erro: erroPalpite } = usePalpite(edicao?.id, palpiteDesta);

  const [valorPalpite, setValorPalpite] = useState("");
  const [toast, setToast] = useState(null);

  const progresso = Math.min(100, Math.round((pontosCartao / Math.max(1, pontosParaCartao)) * 100));
  const semPontos = !loading && !erro && pontos === 0;

  async function palpitar() {
    const n = Number(String(valorPalpite).trim());
    const r = await registar(Number.isInteger(n) ? n : NaN);
    if (r?.ok) {
      setValorPalpite("");
      setToast({ variant: "success", message: r.idempotent ? "Já tinhas palpitado nesta edição" : "Palpite registado!" });
    } else {
      setToast({ variant: "error", message: r?.message || "Não foi possível registar o palpite" });
    }
  }

  const cartao = {
    background: "linear-gradient(135deg, rgba(245,166,35,0.18), rgba(255,107,53,0.10))",
    border: "1px solid rgba(245,166,35,0.45)", borderRadius: "16px",
    padding: isMobile ? "1rem" : "1.25rem", textAlign: "center",
  };

  return (
    <div style={{ padding: isMobile ? "1rem" : "2rem", flex: 1, display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: "640px", width: "100%", display: "grid", gap: "1rem" }}>

        {/* 1 — CABEÇALHO */}
        <header>
          <h2 style={{ margin: 0, fontSize: isMobile ? "1.35rem" : "1.6rem", fontWeight: 800, color: COR.primary, letterSpacing: "0.04em" }}>
            Ofertas Programadas
          </h2>
          <p style={{ margin: "0.4rem 0 0", color: COR.muted, fontSize: "0.9rem", lineHeight: 1.5 }}>
            Programa de fidelidade — acumula pontos e troca pelo cartão da Família Quildo
          </p>
        </header>

        {loading && (
          <GlassCard as="section" aria-label="A carregar" style={{ padding: "1.25rem" }}>
            <p style={{ margin: 0, color: COR.muted, fontSize: "0.9rem" }}>A carregar os teus pontos…</p>
          </GlassCard>
        )}

        {!loading && erro && (
          <GlassCard as="section" aria-label="Erro" style={{ padding: "1.25rem" }}>
            <p role="alert" style={{ margin: 0, color: COR.danger, fontSize: "0.9rem", fontWeight: 700 }}>{erro}</p>
          </GlassCard>
        )}

        {/* 2 — PROGRESSO */}
        {!loading && !erro && (
          <GlassCard as="section" aria-label="Progresso de pontos" style={{ padding: isMobile ? "1rem" : "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
              <span style={{ color: COR.text, fontWeight: 800, fontSize: "1.05rem" }}>
                {pontosCartao} / {pontosParaCartao} pontos
              </span>
              <span style={{ color: COR.muted, fontSize: "0.78rem" }}>{progresso}%</span>
            </div>
            <div
              role="progressbar" aria-valuenow={pontosCartao} aria-valuemin={0} aria-valuemax={pontosParaCartao}
              style={{ marginTop: "0.6rem", height: "10px", borderRadius: "999px", background: "rgba(107,125,184,0.22)", overflow: "hidden" }}
            >
              <div style={{ width: `${progresso}%`, height: "100%", borderRadius: "999px", background: `linear-gradient(90deg, ${COR.gold}, ${COR.primary})` }} />
            </div>

            {/* ⚠️ R1 — o bónus do palpite NÃO conta para o cartão (decisão do operador: opção A).
                Mostra-se à parte para o utilizador saber exactamente o que falta. */}
            {bonusPalpite > 0 && (
              <p style={{ margin: "0.5rem 0 0", color: COR.muted, fontSize: "0.76rem" }}>
                🎯 Bónus de palpite: <strong style={{ color: COR.gold }}>+{bonusPalpite}</strong> — não conta para o cartão.
              </p>
            )}

            {/* 5 — BOTÃO DE RESGATE (visível a ≥50; a lógica é do UTAC106g) */}
            {podeResgatarCartao ? (
              <>
                <button
                  type="button" disabled aria-label="Resgatar cartão"
                  style={{ marginTop: "0.9rem", width: "100%", padding: "0.75rem 1rem", borderRadius: "12px", cursor: "not-allowed", border: `1px solid ${COR.gold}`, background: "rgba(245,166,35,0.14)", color: COR.gold, fontWeight: 800, fontSize: "0.9rem" }}
                >
                  🎁 Resgatar cartão
                </button>
                <p style={{ margin: "0.4rem 0 0", color: COR.muted, fontSize: "0.74rem", textAlign: "center" }}>
                  O resgate abre em breve (UTAC106g).
                </p>
              </>
            ) : (
              <button
                type="button" disabled aria-label="Resgatar cartão indisponível"
                style={{ marginTop: "0.9rem", width: "100%", padding: "0.75rem 1rem", borderRadius: "12px", cursor: "not-allowed", border: "1px solid rgba(107,125,184,0.35)", background: "transparent", color: COR.muted, fontWeight: 700, fontSize: "0.88rem" }}
              >
                Chega a {pontosParaCartao} pontos para resgatar
              </button>
            )}
          </GlassCard>
        )}

        {/* 3 — CARTÃO (colecionável) */}
        {!loading && !erro && (
          <GlassCard as="section" aria-label="Cartão" style={{ padding: isMobile ? "1rem" : "1.25rem" }}>
            <div style={cartao}>
              <div style={{ fontSize: "2.25rem", lineHeight: 1 }} aria-hidden="true">🃏</div>
              <h3 style={{ margin: "0.5rem 0 0.25rem", color: COR.gold, fontWeight: 800, fontSize: "1rem" }}>{CARTAO_NOME}</h3>
              <p style={{ margin: 0, color: COR.muted, fontSize: "0.82rem", lineHeight: 1.55 }}>{CARTAO_DESCRICAO}</p>
            </div>
          </GlassCard>
        )}

        {/* ESTADO VAZIO */}
        {semPontos && (
          <GlassCard as="section" aria-label="Sem pontos" style={{ padding: "1.25rem", textAlign: "center" }}>
            <p style={{ margin: 0, color: COR.text, fontSize: "0.9rem" }}>
              Ainda não tens pontos. Compra o teu primeiro Passe na Carteira.
            </p>
            <button
              type="button" onClick={() => navigate("/carteira")}
              style={{ marginTop: "0.75rem", padding: "0.65rem 1.1rem", borderRadius: "10px", cursor: "pointer", border: "none", background: COR.primary, color: "#12161f", fontWeight: 800, fontSize: "0.85rem" }}
            >
              Ir para a Carteira
            </button>
          </GlassCard>
        )}

        {/* 4 — PALPITE (bónus) */}
        {!loading && !erro && (
          <GlassCard as="section" aria-label="Palpite" style={{ padding: isMobile ? "1rem" : "1.25rem" }}>
            <h3 style={{ margin: 0, color: COR.text, fontWeight: 800, fontSize: "0.95rem" }}>Palpite — bónus de +2 pontos</h3>
            <p style={{ margin: "0.35rem 0 0.7rem", color: COR.muted, fontSize: "0.8rem", lineHeight: 1.5 }}>
              Quantos lances achas que a edição vai ter? O mais próximo leva +2 pontos. É bónus: não
              muda o cartão.
            </p>

            {!edicao ? (
              <p style={{ margin: 0, color: COR.muted, fontSize: "0.85rem" }}>Sem edição a decorrer. Volta quando houver.</p>
            ) : palpite ? (
              <div>
                <p style={{ margin: 0, color: COR.ok, fontWeight: 700, fontSize: "0.86rem" }}>
                  Já palpitou: {palpite.valor} lances
                </p>
                <p style={{ margin: "0.3rem 0 0", color: COR.muted, fontSize: "0.78rem" }}>
                  {palpite.apurado === true
                    ? (palpite.resultado === "mais_proximo" ? "Acertou! +2 pontos" : "Não acertou")
                    : "À espera do fecho da edição."}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input
                  type="number" inputMode="numeric" min="0" step="1" aria-label="Número de lances previstos"
                  value={valorPalpite}
                  onChange={(e) => setValorPalpite(e.target.value)}
                  placeholder="Ex.: 120"
                  style={{ flex: "1 1 120px", padding: "0.6rem 0.75rem", borderRadius: "10px", border: "1px solid rgba(107,125,184,0.45)", background: "rgba(12,16,24,0.55)", color: COR.text, fontSize: "0.9rem" }}
                />
                <button
                  type="button" onClick={palpitar} disabled={aPalpitar}
                  style={{ padding: "0.6rem 1.1rem", borderRadius: "10px", cursor: aPalpitar ? "wait" : "pointer", border: "none", background: aPalpitar ? "rgba(107,125,184,0.35)" : COR.gold, color: "#12161f", fontWeight: 800, fontSize: "0.86rem" }}
                >
                  {aPalpitar ? "A enviar…" : "Palpitar"}
                </button>
              </div>
            )}

            {erroPalpite && (
              <p role="alert" style={{ margin: "0.5rem 0 0", color: COR.danger, fontSize: "0.78rem", fontWeight: 700 }}>{erroPalpite}</p>
            )}
          </GlassCard>
        )}

        {/* 4b — HISTÓRICO */}
        {!loading && !erro && (
          <GlassCard as="section" aria-label="Histórico" style={{ padding: isMobile ? "1rem" : "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.5rem", color: COR.text, fontWeight: 800, fontSize: "0.95rem" }}>Histórico</h3>
            {historico.length === 0 ? (
              <p style={{ margin: 0, color: COR.muted, fontSize: "0.82rem" }}>Sem movimentos ainda.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.4rem" }}>
                {historico.slice().reverse().map((h, i) => (
                  <li key={`${h?.ref ?? "m"}-${i}`} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", color: COR.muted, fontSize: "0.82rem" }}>
                    <span>{dataCurta(h?.data)} · {TIPO_LABEL[h?.tipo] ?? h?.tipo ?? "Movimento"}</span>
                    <span style={{ color: Number(h?.pontos) >= 0 ? COR.ok : COR.danger, fontWeight: 700 }}>
                      {Number(h?.pontos) >= 0 ? "+" : ""}{Number(h?.pontos ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        )}
      </div>

      {toast && (
        <Toast id={1} variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
