import { useState } from "react";
import { Modal } from "@/components/ui";

/**
 * TermosConsentimento — Gate de compliance LGPD · DesafioGUT
 *
 * Exibe o resumo do Regulamento Oficial e bloqueia participação até aceitação total.
 * MC23.3 — overlay migrado para <Modal> (spring entry + backdrop bg-black/60).
 * UTAC110h.1 — o resumo passou do Regulamento v4 para o **Regulamento Oficial v5.0**
 * (`docs/REGULAMENTO-v5.md`): só frases e números do v5, com o artigo citado. O texto integral
 * vive em /regras-oficiais (rota pública, Boot.jsx), ligada daqui.
 */
// MC88.31 — partilhados com Boot.jsx, que decide se o gate é mostrado.
// Subir VERSAO_CONSENTIMENTO invalida os aceites anteriores de propósito.
// UTAC110h.1 (R18-110h.1-B) — "2.0" (v4) -> "3.0" (v5): quem aceitou o v4 volta a ver o gate.
// Tem de ser igual a VERSAO_GATE de netlify/functions/_lib/consentimento.mjs (há teste).
export const CHAVE_CONSENTIMENTO  = "gut_consentimento";
export const VERSAO_CONSENTIMENTO = "3.0";

export default function TermosConsentimento({ onAceitar }) {
  const [lido,       setLido]       = useState(false);
  const [maiores,    setMaiores]    = useState(false);
  const [termos,     setTermos]     = useState(false);
  const [privacidade,setPrivacidade]= useState(false);

  const tudoAceito = lido && maiores && termos && privacidade;

  function handleAceitar() {
    if (!tudoAceito) return;
    const consentimento = {
      aceito: true,
      timestamp: new Date().toISOString(),
      versao: VERSAO_CONSENTIMENTO,
      // MC104 — as 4 declarações seguem para o servidor depois do login (prova do aceite, LGPD art. 8º §2º).
      aceitos: { lido, maiores, termos, privacidade },
    };
    // MC88.31 (Achado 7 do MC88.30) — era sessionStorage, que morre com o
    // processo da WebView: no APK o gate reaparecia a CADA arranque (~2,5 s até
    // o Dashboard ficar útil). Passa a localStorage, mas continua ligado à
    // VERSAO_CONSENTIMENTO: se o regulamento mudar de versão, o utilizador é
    // novamente questionado em vez de herdar um aceite de termos antigos.
    localStorage.setItem(CHAVE_CONSENTIMENTO, JSON.stringify(consentimento));
    onAceitar();
  }

  return (
    <Modal
      open
      className="!max-w-[620px] w-full !rounded-2xl p-8 flex flex-col gap-5 overflow-y-auto !max-h-[92vh] !bg-[#0d2145] !border !border-[rgba(245,166,35,0.3)]"
      style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(245,166,35,0.15)" }}
    >

        {/* Cabeçalho */}
        <div style={estilos.header}>
          <div style={estilos.logoArea}>
            <div style={estilos.gutoWrapper}>
              <img
                src="/assets/guto/custom/guto-bemvindo.png"
                alt="GUTO mascote - pensativo"
                width={96}
                height={96}
                style={{ imageRendering: "auto" }}
              />
            </div>
            <div>
              <h2 style={estilos.titulo}>DesafioGUT</h2>
              <p style={estilos.grupoNome}>Grupo União e Trabalho · CNPJ 23.040.066/0001-00</p>
            </div>
          </div>
          <p style={estilos.subtitulo}>
            Leia e aceite o regulamento antes de participar. Vigência: a partir de{" "}
            <strong style={{ color: "#f5a623" }}>2 de novembro de 2026</strong>.
          </p>
        </div>

        {/* MC99.5.2 — DECISÃO DO OPERADOR (R18): no gate, sem resumo — SÓ um botão para expandir.
            Usa-se <details>/<summary> NATIVO (Ponytail, degrau 4): botão acessível por teclado e
            leitor de ecrã, sem useState e sem re-render. Fechado por omissão; ao abrir, o texto
            é 100% visível (herança da correcção do MC99.5.1). Os 4 aceites ficam FORA daqui —
            continuam sempre visíveis e clicáveis, aberto ou fechado. */}
        <details style={estilos.regulamento}>
          <summary style={estilos.botaoExpandir}>📖 Ler o resumo do regulamento</summary>
          <div style={estilos.scrollBox}>
          <h3 style={estilos.secaoTitulo}>Regulamento Oficial v5.0 — Resumo</h3>

          {/* UTAC110h.1 — cada parágrafo é TEXTO do Regulamento Oficial v5.0 (docs/REGULAMENTO-v5.md),
              com o artigo citado. Nada aqui é redacção nova: o teste citacoesRegulamento compara
              cada bloco com o artigo do v5, palavra a palavra. */}
          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 1º</strong> — O DesafioGUT é um programa de fidelidade
            gamificado operado pela Associação Recreativa dos Nordestinos no Amazonas, nome fantasia Grupo
            União e Trabalho (GUT), CNPJ nº 23.040.066/0001-00, com sede em Manaus/AM.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 2º</strong> — O DesafioGUT funciona como plataforma de comércio
            eletrónico por dropshipping, com duas modalidades distintas: I — Oferta Relâmpago: modalidade de
            menor lance único, com duração entre minutos e horas; II — Oferta Programada: modalidade de
            palpite, com duração entre dias e semanas.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 5º</strong> — Poderão participar do DesafioGUT pessoas
            físicas e jurídicas, maiores de 18 (dezoito) anos, regularmente cadastradas no aplicativo.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 6º</strong> — O Passe Desafio é o produto digital adquirido
            pelo utilizador, com preço fixo de{" "}
            <strong style={{ color: "#f5a623" }}>R$ 2,00 (dois reais)</strong>, nas modalidades Passe
            Relâmpago e Passe Programado.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 8º</strong> — Cada Passe Desafio adquirido concede ao
            utilizador 10 (dez) pontos de fidelidade.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 9º</strong> — A cada 50 (cinquenta) pontos de fidelidade
            acumulados, o utilizador poderá adquirir 1 (um) cartão colecionável físico da Família Quildo.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 14º</strong> — A Oferta Relâmpago é uma competição de
            habilidade: vence o participante que apresentar o menor valor em pontos de lance que ninguém
            mais escolheu{" "}
            <strong style={{ color: "#f5a623" }}>(menor lance único)</strong>.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 27º</strong> — O participante regista o seu palpite (ex: "a
            edição terá 148 lances"). Vence o palpite que ficar mais próximo do número real de lances apurado
            pela Associação.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 47º</strong> — O ECOQUILDO é uma moeda social interna do
            Grupo União e Trabalho, com lastro em reais à razão de 1 ECOQUILDO = R$ 1,00 (um real).
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 49º</strong> — O ECOQUILDO não é convertível em dinheiro e
            não é transferível a terceiros.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 65º</strong> — É vedada a participação de funcionários,
            colaboradores, prestadores de serviços e familiares de qualquer empresa envolvida na operação do
            DesafioGUT.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 66º</strong> — Os participantes cedem à coordenação do
            DesafioGUT, de forma gratuita, os direitos de utilização do seu nome, imagem e som de voz para
            divulgação em qualquer mídia, exclusivamente referente ao evento em epígrafe.
          </p>

          <p style={estilos.artigo}>
            Regras completas (12 capítulos, 72 artigos) em{" "}
            <a href="/regras-oficiais" style={estilos.link}>Regras Oficiais</a>.
          </p>

          {/* UTAC110h.2 (D3) — Art. 69º do Regulamento v5.0: «Dúvidas, informações e sugestões deverão ser
              encaminhadas EXCLUSIVAMENTE através do e-mail desafiogut01@gmail.com». Saíram o telefone
              (92) 98428-5774 e o site www.grupouniaoetrabalho.com.br — deixaram de figurar aqui. O texto
              começa por «Dúvidas:» de propósito: é a forma que a guarda `dadosPagamento.test.mjs` fixa. */}
          <div style={estilos.contatoBox}>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b7db8" }}>
              📧 Dúvidas: desafiogut01@gmail.com
            </p>
          </div>
        </div>
        </details>

        {/* Checkboxes de consentimento */}
        <div style={estilos.checkboxes}>
          <label style={estilos.label}>
            <input type="checkbox" checked={lido} onChange={(e) => setLido(e.target.checked)} style={estilos.checkbox} />
            <span>
              Li e compreendi o regulamento completo do DesafioGUT (Regulamento Oficial v5.0), disponível em{" "}
              <a href="/regras-oficiais" style={estilos.link}>Regras Oficiais</a>.
            </span>
          </label>

          <label style={estilos.label}>
            <input type="checkbox" checked={maiores} onChange={(e) => setMaiores(e.target.checked)} style={estilos.checkbox} />
            <span>Declaro ter 18 anos ou mais (Art. 5º), capacidade civil plena e não ser funcionário, colaborador, prestador de serviços nem familiar de empresa envolvida na operação do DesafioGUT (Art. 65º).</span>
          </label>

          <label style={estilos.label}>
            <input type="checkbox" checked={termos} onChange={(e) => setTermos(e.target.checked)} style={estilos.checkbox} />
            <span>Aceito os Termos de Participação: cada Passe Desafio de R$ 2,00 concede 10 pontos de fidelidade (Art. 8º) e a Oferta Relâmpago é uma competição de habilidade — vence o menor lance único (Art. 14º).</span>
          </label>

          <label style={estilos.label}>
            <input type="checkbox" checked={privacidade} onChange={(e) => setPrivacidade(e.target.checked)} style={estilos.checkbox} />
            <span>
              Concordo com o tratamento dos meus dados conforme a{" "}
              {/* MC90.3 — GAP 1 (MC90.2): link iubenda 404 -> rota pública /privacidade */}
              <a href="/privacidade" style={estilos.link}>
                Política de Privacidade
              </a>{" "}
              (LGPD/GDPR) e cedo minha imagem conforme Art. 66º.
            </span>
          </label>
        </div>

        <button
          style={{ ...estilos.botao, opacity: tudoAceito ? 1 : 0.4, cursor: tudoAceito ? "pointer" : "not-allowed" }}
          onClick={handleAceitar}
          disabled={!tudoAceito}
        >
          ⚡ Aceito o DesafioGUT
        </button>

        <p style={estilos.rodapeLegal}>
          Grupo União e Trabalho · CNPJ 23.040.066/0001-00 · Manaus/AM, Brasil
        </p>
    </Modal>
  );
}

// ─── Estilos — paleta Azul Marinho GUT ───────────────────────────────────────
const estilos = {
  logoArea: {
    display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem",
    flexDirection: "column",
  },
  gutoWrapper: {
    marginBottom: "0.75rem",
  },
  titulo:   { margin: 0, fontSize: "1.5rem", fontWeight: "900", color: "#e8f0fe", letterSpacing: "0.04em" },
  grupoNome: { margin: 0, fontSize: "0.72rem", color: "#6b7db8" },
  subtitulo: { margin: 0, color: "#fbbf24", fontSize: "0.88rem", lineHeight: "1.5" },
  secaoTitulo: {
    margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: "800",
    color: "#fbbf24", letterSpacing: "0.05em", textTransform: "uppercase",
  },
  // MC99.5.2 — o <details> que esconde o regulamento (só o botão, sem resumo; decisão do operador).
  regulamento: { margin: "0" },
  botaoExpandir: {
    cursor: "pointer", padding: "0.85rem 1.1rem", borderRadius: "12px",
    background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.35)",
    color: "#f5a623", fontWeight: 700, fontSize: "0.9rem", textAlign: "center",
    listStyle: "none", userSelect: "none",
  },
  scrollBox: {
    // MC99.5.1 — o texto legal era ilegível: clientHeight 40 para scrollHeight 1654 (2,4%).
    // ⚠️ ATENÇÃO À CAUSA (corrigida após o validador independente, A7): NÃO é o flexShrink.
    // Ele mediu que `flexShrink: 1` SOZINHO não encolhe a caixa (variantes V1/V7 = 100%).
    // O que corrige é a ELIMINAÇÃO do maxHeight + overflowY: sem contentor de scroll, a caixa
    // deixa de poder encolher. O `flexShrink: 0` abaixo é defensivo, NÃO é a propriedade que
    // faz o trabalho — tirá-lo sozinho não reintroduz o defeito. Medido em produção: 1654/1654,
    // 100%, 0 oculto. O aninhamento de scroll sai: quem rola é o DIÁLOGO (overflow-y em :43).
    flexShrink: 0,
    padding: "1.25rem",
    background: "rgba(3,15,36,0.6)", borderRadius: "12px", fontSize: "0.84rem",
    lineHeight: "1.65", color: "#cbd5e1",
    border: "1px solid rgba(245,166,35,0.15)",
  },
  artigo: { margin: "0 0 0.9rem" },
  link: { color: "#fbbf24" },
  artLabel: { color: "#fbbf24", fontWeight: "800" },
  contatoBox: {
    marginTop: "1rem", padding: "0.75rem",
    background: "rgba(245,166,35,0.08)",
    borderRadius: "8px", textAlign: "center",
    border: "1px solid rgba(245,166,35,0.15)",
  },
  checkboxes: { display: "flex", flexDirection: "column", gap: "0.8rem" },
  checkbox:   { accentColor: "#f5a623", width: "16px", height: "16px", flexShrink: 0, marginTop: "1px" },
  // UTAC110h.1 — a linha inteira é o alvo de toque da caixa: ≥ 44 px (mobile-ux).
  label: {
    display: "flex", alignItems: "flex-start", gap: "0.6rem", minHeight: "44px",
    fontSize: "0.86rem", cursor: "pointer", lineHeight: "1.5",
    color: "#e8f0fe",
  },
  botao: {
    padding: "0.9rem",
    background: "linear-gradient(135deg,#f5a623,#f97316)",
    color: "#0a0f1a",
    border: "none", borderRadius: "28px",
    fontSize: "1rem", fontWeight: "900",
    transition: "opacity 0.2s",
    letterSpacing: "0.04em",
    boxShadow: "0 4px 20px rgba(245,166,35,0.4)",
  },
  rodapeLegal: {
    margin: 0, fontSize: "0.68rem", color: "#6b7db8",
    textAlign: "center", letterSpacing: "0.03em",
  },
};
