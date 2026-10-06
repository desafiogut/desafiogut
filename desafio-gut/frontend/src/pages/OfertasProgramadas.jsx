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
//   5. botão «Resgatar cartão»: VISÍVEL e ACTIVO a ≥50 pontos de CARTÃO — abre o balão de morada
//      (`ResgatarCartaoModal`) que chama `POST /resgatar-cartao` (UTAC106g: debita os 50 pontos e
//      cria o pedido em `public.resgates`).
//
// ⚠️ O palpite é BÓNUS — NÃO decide o cartão (requisito crítico da Google Play: jogo de habilidade).
//    O cartão é só por PONTOS DE COMPRA. Nenhuma linha deste ecrã faz depender o cartão do palpite.
import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { GlassCard, THead, TH, TD } from "@/components/ui";
// UTAC107e.1 — a etiqueta de estado de cada cartão vem da MESMA fonte única das outras abas.
import { getEstadoEdicao } from "../utils/edicao.js";
import Toast from "../widgets/toast/Toast.jsx";
import { useAppContext } from "../context/AppContext.jsx";
import { usePontos } from "../hooks/usePontos.js";
import { usePalpite, usePalpitesDaEdicao } from "../hooks/usePalpite.js";
import { useResgatarCartao } from "../hooks/useResgatarCartao.js";
import ResgatarCartaoModal, { CARTAO_ID } from "../components/ResgatarCartaoModal.jsx";

// UTAC107e.2 — endereço curto na tabela de palpites (0x1234…abcd); nunca rebenta com lixo.
const curto = (e) => (typeof e === "string" && e.length > 12 ? `${e.slice(0, 6)}…${e.slice(-4)}` : "—");

const COR = {
  gold: "#f5a623", primary: "#ff6b35", text: "#e8f0fe", muted: "#6b7db8",
  blue300: "#7aa2ff", danger: "#ff5a5f", ok: "#3ddc84",
};

const CARTAO_NOME = "Cartão da Família Quildo";
const CARTAO_DESCRICAO =
  "Cartão colecionável físico, com a arte da Família Quildo. Acumula 50 pontos para trocar por ele. "
  + "O palpite dá pontos EXTRA, mas o cartão conquista-se só com os pontos das tuas compras.";

/** Edição Programada ainda a aceitar palpites (o backend exige `status === "aberto"`). */
const estaAberta = (e) => e?.status === "aberto";

/**
 * UTAC107e.1 — TODAS as edições Programadas, abertas primeiro (era só a 1.ª aberta: o palpite
 * ficava longe do produto e só servia uma edição — achado do mockup `ofertas-programadas.html`).
 */
function edicoesProgramadasDe(edicoes) {
  const lista = Object.values(edicoes ?? {}).filter((e) => e?.tipo === "programado" && e?.id);
  return lista.sort((a, b) => Number(estaAberta(b)) - Number(estaAberta(a)));
}

/**
 * UTAC107e.1 — os 5 estados do palpite, cartão a cartão (mockup, variante A). A copy segue o
 * mockup e não o enunciado: o backend premeia o palpite MAIS PRÓXIMO, não o exacto (`apurar-palpite`,
 * `mais_proximo`/`perdeu`) — «Acertou!» seria falso (achado E-2 do validador do 107a-front).
 */
export function estadoPalpite(edicao, palpite) {
  if (palpite?.apurado === true) return palpite.resultado === "mais_proximo" ? "mais_proximo" : "perdeu";
  if (palpite) return "com_palpite";
  if (estaAberta(edicao)) return "sem_palpite";
  // Achado do validador: `agendado` ainda não abriu — dizer «encerrada» seria falso.
  return edicao?.status === "agendado" ? "abre_em_breve" : "encerrada";
}
const PILULA = {
  sem_palpite:  { texto: "SEM PALPITE",       cor: "#e8f0fe" },
  com_palpite:  { texto: "COM PALPITE",       cor: "#f5a623" },
  mais_proximo: { texto: "MAIS PRÓXIMO",      cor: "#3ddc84" },
  perdeu:       { texto: "NÃO FOI DESSA VEZ", cor: "#ff8a8d" },
  encerrada:    { texto: "ENCERRADA",         cor: "#6b7db8" },
  abre_em_breve: { texto: "ABRE EM BREVE",    cor: "#f5a623" },
};

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
  const { pontos, pontosCartao, bonusPalpite, historico, palpites, pontosParaCartao, podeResgatarCartao, loading, erro, refetch: refetchPontos } = usePontos();

  const programadas = useMemo(() => edicoesProgramadasDe(edicoes), [edicoes]);
  // A tabela do fim é da 1.ª edição da lista (a aberta, quando há).
  const edicaoTabela = programadas[0] ?? null;
  // UTAC107e.2 (Frente C) — dados da tabela: `ler-palpites`; o valor só chega depois do fecho.
  const tabelaPalpites = usePalpitesDaEdicao(edicaoTabela?.id ?? null);
  // Um só hook para todos os cartões: o `registar` recebe a edição do cartão tocado (UTAC107e.1).
  const { registar, loading: aPalpitar, erro: erroPalpite } = usePalpite(null);
  // Palpites registados nesta sessão (antes de o `ler-pontos` os devolver) e o rascunho de cada cartão.
  const [registados, setRegistados] = useState({});
  const [valores, setValores] = useState({});
  const [cartaoEmErro, setCartaoEmErro] = useState(null);
  const palpiteDe = (id) => registados[id]
    ?? (Array.isArray(palpites) ? palpites.find((p) => p?.edicaoId === id) ?? null : null);
  // UTAC106g — resgate do cartão colecionável.
  const { resgatar, loading: aResgatar, erro: erroResgate } = useResgatarCartao();

  const [toast, setToast] = useState(null);
  // UTAC106g — estado do balão de resgate.
  const [resgateAberto, setResgateAberto] = useState(false);

  /** Confirma o resgate no servidor; em sucesso fecha o balão, avisa e relê os pontos. */
  async function confirmarResgate(morada) {
    const r = await resgatar({ cartaoId: CARTAO_ID, morada });
    if (r?.ok) {
      setResgateAberto(false);
      setToast({ variant: "success", message: r.idempotent ? "Pedido de resgate já registado" : "Pedido de resgate criado" });
      try { await refetchPontos?.(); } catch { /* refetch é best-effort */ }
    }
  }

  const progresso = Math.min(100, Math.round((pontosCartao / Math.max(1, pontosParaCartao)) * 100));
  const semPontos = !loading && !erro && pontos === 0;

  async function palpitar(edicaoId) {
    const n = Number(String(valores[edicaoId] ?? "").trim());
    const r = await registar(Number.isInteger(n) ? n : NaN, edicaoId);
    if (r?.ok) {
      setRegistados((m) => ({ ...m, [edicaoId]: r.palpite }));
      setValores((m) => ({ ...m, [edicaoId]: "" }));
      setCartaoEmErro(null);
      setToast({ variant: "success", message: r.idempotent ? "Você já tinha palpitado nesta edição" : "Palpite registrado!" });
    } else {
      setCartaoEmErro(edicaoId);
      setToast({ variant: "error", message: r?.message || "Não foi possível registrar o palpite" });
    }
  }

  /** UM cartão de edição Programada (função, não componente: o palpite vive no estado da página). */
  function cartaoEdicao(ed) {
    const palpite = palpiteDe(ed.id);
    const estado = estadoPalpite(ed, palpite);
    const est = getEstadoEdicao(ed);
    const pil = PILULA[estado];
    const idCampo = `palpite-${ed.id}`;
    return (
      <div key={ed.id} data-testid="op-edicao-item" style={{ flex: "0 0 100%", minWidth: 0, scrollSnapAlign: "start" }}>
        <GlassCard as="article" data-estado-palpite={estado} aria-label={`Edição ${ed.id}`} style={{ padding: isMobile ? "1rem" : "1.25rem", height: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: COR.gold, border: "1px solid rgba(245,166,35,0.35)", borderRadius: "999px", padding: "0.2rem 0.6rem" }}>{ed.id}</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: pil.cor, letterSpacing: "0.04em" }}>{pil.texto}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", margin: "0.75rem 0", padding: "0.6rem 0.75rem", background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.22)", borderRadius: "10px" }}>
            <span aria-hidden="true" style={{ fontSize: "1.6rem" }}>🎁</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "0.7rem", color: COR.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Prêmio</div>
              <div style={{ color: COR.gold, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ed.produto || "Prêmio a anunciar"}</div>
              <div style={{ color: COR.muted, fontSize: "0.78rem" }}>{est.timer ?? est.rotuloLongo}</div>
            </div>
          </div>

          {estado === "sem_palpite" && (
            <div>
              <label htmlFor={idCampo} style={{ display: "block", color: COR.text, fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.35rem" }}>Seu palpite (nº de lances)</label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input
                  id={idCampo} type="number" inputMode="numeric" min="0" step="1"
                  value={valores[ed.id] ?? ""}
                  onChange={(e) => setValores((m) => ({ ...m, [ed.id]: e.target.value }))}
                  placeholder="Ex.: 120"
                  style={{ flex: "1 1 120px", minHeight: "48px", padding: "0.6rem 0.75rem", borderRadius: "10px", border: "1px solid rgba(107,125,184,0.45)", background: "rgba(12,16,24,0.55)", color: COR.text, fontSize: "0.9rem" }}
                />
                <button
                  type="button" onClick={() => palpitar(ed.id)} disabled={aPalpitar}
                  style={{ minHeight: "48px", padding: "0.6rem 1.1rem", borderRadius: "10px", cursor: aPalpitar ? "wait" : "pointer", border: "none", background: aPalpitar ? "rgba(107,125,184,0.35)" : COR.gold, color: "#12161f", fontWeight: 800, fontSize: "0.86rem" }}
                >
                  {aPalpitar ? "Enviando…" : "Palpitar"}
                </button>
              </div>
            </div>
          )}
          {estado === "com_palpite" && (
            <div>
              <p style={{ margin: 0, color: COR.ok, fontWeight: 700, fontSize: "0.86rem" }}>Seu palpite: {palpite.valor} lances</p>
              <p style={{ margin: "0.3rem 0 0", color: COR.muted, fontSize: "0.78rem" }}>Resultado no fim da edição.</p>
            </div>
          )}
          {estado === "mais_proximo" && (
            <p style={{ margin: 0, color: COR.ok, fontWeight: 800, fontSize: "0.88rem" }}>
              🎯 +2 pontos! Seu palpite de {palpite.valor} lances foi o mais próximo.
            </p>
          )}
          {estado === "perdeu" && (
            <div>
              <p style={{ margin: 0, color: COR.text, fontWeight: 700, fontSize: "0.86rem" }}>Outro palpite ficou mais perto.</p>
              <p style={{ margin: "0.3rem 0 0", color: COR.muted, fontSize: "0.78rem" }}>Seu palpite: {palpite.valor} lances.</p>
            </div>
          )}
          {estado === "abre_em_breve" && (
            <p style={{ margin: 0, color: COR.muted, fontSize: "0.84rem" }}>Os palpites abrem quando a edição abrir.</p>
          )}
          {estado === "encerrada" && (
            <p style={{ margin: 0, color: COR.muted, fontSize: "0.84rem" }}>Edição encerrada · sem palpite nesta edição.</p>
          )}
          {cartaoEmErro === ed.id && erroPalpite && (
            <p role="alert" style={{ margin: "0.5rem 0 0", color: COR.danger, fontSize: "0.78rem", fontWeight: 700 }}>{erroPalpite}</p>
          )}
        </GlassCard>
      </div>
    );
  }

  const cartao = {
    background: "linear-gradient(135deg, rgba(245,166,35,0.18), rgba(255,107,53,0.10))",
    border: "1px solid rgba(245,166,35,0.45)", borderRadius: "16px",
    padding: isMobile ? "1rem" : "1.25rem", textAlign: "center",
  };

  return (
    <div style={{ padding: isMobile ? "1rem" : "2rem", flex: 1, display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: "640px", width: "100%", display: "grid", gap: "1rem" }}>

        {/* 1 — CABEÇALHO (UTAC107e.1: dentro de vidro — Regra 1; era um <header> solto) */}
        <GlassCard as="header" style={{ padding: isMobile ? "1rem" : "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? "1.35rem" : "1.6rem", fontWeight: 800, color: COR.primary, letterSpacing: "0.04em" }}>
            Ofertas Programadas
          </h2>
          <p style={{ margin: "0.4rem 0 0", color: COR.muted, fontSize: "0.9rem", lineHeight: 1.5 }}>
            Junte 50 pontos e troque pelo cartão da Família Quildo
          </p>
        </GlassCard>

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

            {/* 5 — BOTÃO DE RESGATE (UTAC106g: ACTIVO a ≥50 pontos; abre o balão de morada) */}
            {podeResgatarCartao ? (
              <>
                <button
                  type="button" onClick={() => setResgateAberto(true)} aria-label="Resgatar cartão"
                  style={{ marginTop: "0.9rem", width: "100%", padding: "0.75rem 1rem", borderRadius: "12px", cursor: "pointer", border: `1px solid ${COR.gold}`, background: "linear-gradient(135deg,#f5a623,#e89400)", color: "#12161f", fontWeight: 800, fontSize: "0.9rem" }}
                >
                  🎁 Resgatar cartão
                </button>
                <p style={{ margin: "0.4rem 0 0", color: COR.muted, fontSize: "0.74rem", textAlign: "center" }}>
                  Vais trocar {pontosParaCartao} pontos pelo cartão da Família Quildo.
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

        {/* 4 — EDIÇÕES PROGRAMADAS (UTAC107e.1): a secção «Palpite» separada SAIU; o palpite vive
            DENTRO do cartão de cada edição. Mesma estrutura das «Outras Edições» do Início (MC99):
            título em vidro + rolagem lateral com UMA edição visível e `scroll-snap` ao início. */}
        {!loading && !erro && (
          <section aria-label="Edições programadas" style={{ display: "grid", gap: "0.75rem" }}>
            <GlassCard style={{ padding: isMobile ? "1rem" : "1.25rem" }}>
              <h3 style={{ margin: 0, color: COR.text, fontWeight: 800, fontSize: "0.95rem" }}>🎫 Edições programadas</h3>
              <p style={{ margin: "0.35rem 0 0", color: COR.muted, fontSize: "0.8rem", lineHeight: 1.5 }}>
                Palpite quantos lances a edição vai ter. O palpite mais próximo ganha +2 pontos — é bônus, não muda o cartão.
              </p>
              {programadas.length === 0 && (
                <p style={{ margin: "0.6rem 0 0", color: COR.muted, fontSize: "0.85rem" }}>Sem edições programadas no momento. Volte quando houver.</p>
              )}
            </GlassCard>
            {programadas.length > 0 && (
              <div
                data-testid="op-edicoes-scroll"
                style={{
                  display: "flex", gap: isMobile ? "0.75rem" : "1rem",
                  overflowX: "auto", overflowY: "hidden",
                  scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", paddingBottom: "0.25rem",
                }}
              >
                {programadas.map(cartaoEdicao)}
              </div>
            )}
          </section>
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

        {/* UTAC106h — as Regras Oficiais do programa de fidelidade ficam a um toque do ecrã onde
            os pontos se acumulam (requisito Google Play: regras publicadas no app). Só acrescenta
            o link — nenhuma outra alteração a este ecrã. */}
        {/* UTAC107e.1 — Regra 1 + toque: o link passa a botão de 48 px DENTRO de vidro (tinha ≈ 13 px). */}
        <GlassCard style={{ padding: "0.5rem" }}>
          <Link to="/regras-oficiais" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "48px", color: COR.text, fontSize: "0.86rem", fontWeight: 700, textDecoration: "none" }}>
            📜 Regras Oficiais do programa
          </Link>
        </GlassCard>

        {/* 6 — TABELA «Palpites — Edição <id>» (UTAC107e.1, R18-C: estrutura). Último vidro, padrão
            da Regra 2 (o mesmo vidro e as 3 colunas da tabela do Menor Lance Único).
            UTAC107e.2 (Frente C): os dados vêm do `ler-palpites`. Durante a edição o servidor NÃO manda
            o valor — a coluna mostra 🔒; depois do fecho mostra o palpite. */}
        {!loading && !erro && edicaoTabela && (
          <section data-testid="op-tabela-fim" aria-label={`Palpites — Edição ${edicaoTabela.id}`}
            className="gut-glass-standard" style={{ color: COR.text, padding: isMobile ? "1rem" : "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.75rem", color: COR.gold, fontWeight: 800, fontSize: isMobile ? "0.95rem" : "1.05rem", letterSpacing: "0.04em" }}>
              Palpites — Edição {edicaoTabela.id}
            </h3>
            <div className="w-full overflow-x-auto rounded-2xl">
              <table className="w-full border-collapse text-sm">
                <THead>
                  <tr>
                    <TH>#</TH>
                    <TH>Participante</TH>
                    <TH>Palpite</TH>
                  </tr>
                </THead>
                <tbody>
                  {tabelaPalpites.palpites.map((p, i) => (
                    <tr key={`${p.endereco}-${i}`} data-palpite-linha>
                      <TD>{i + 1}</TD>
                      <TD style={{ fontFamily: "monospace" }}>{curto(p.endereco)}</TD>
                      <TD>{tabelaPalpites.revelado && Number.isInteger(p.valor) ? `${p.valor} lances` : "🔒"}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tabelaPalpites.palpites.length === 0 && (
              <p style={{ margin: "0.9rem 0 0", textAlign: "center", color: COR.muted, fontSize: "0.85rem" }}>Ainda não há palpites.</p>
            )}
          </section>
        )}
      </div>

      {/* UTAC106g — BALÃO de resgate do cartão (componente próprio; a lógica de rede vive no
          `useResgatarCartao`). «Confirmar resgate» debita os 50 pontos e cria o pedido no servidor. */}
      <ResgatarCartaoModal
        aberto={resgateAberto}
        loading={aResgatar}
        erro={erroResgate}
        onCancelar={() => setResgateAberto(false)}
        onConfirmar={confirmarResgate}
      />

      {toast && (
        <Toast id={1} variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
