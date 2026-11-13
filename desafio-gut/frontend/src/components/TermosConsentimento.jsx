import { useState } from "react";
import { Modal } from "@/components/ui";
import CarrosselGUTO, { SLIDES } from "./CarrosselGUTO.jsx";

// UTAC110j.3 — o GUTO do gate passa a ser o GUTO ANIMADO 7, o mesmo das edições Relâmpago e Programada
// (`CartaoEdicao.jsx`, `GUTO_ANIMADO_7`). O `CarrosselGUTO` já traz loop + muted + playsInline e cai no
// poster do próprio vídeo (`guto-7.png`) quando o vídeo falha, antes da 1.ª pintura e com reduced-motion.
// Array de módulo: referência estável para o `memo` do carrossel. Não se importa o `CartaoEdicao` aqui
// (puxaria o cartão inteiro para o chunk do arranque).
export const GUTO_GATE = Object.freeze([SLIDES[6]]);
export const TAMANHO_GUTO_GATE = 96;

/**
 * TermosConsentimento — Gate de compliance LGPD · DesafioGUT
 *
 * Exibe o resumo do Regulamento Oficial e bloqueia participação até aceitação total.
 * MC23.3 — overlay migrado para <Modal> (spring entry + backdrop bg-black/60).
 * UTAC137 — o resumo passou ao **Regulamento v6.0** (`docs/REGULAMENTO-v6.md`); versão do aceite 3.4.
 * UTAC110h.1 — o resumo passou do Regulamento v4 para o **Regulamento Oficial v5.0**
 * (`docs/REGULAMENTO-v5.md`): só frases e números do v5, com o artigo citado. O texto integral
 * vive em /regras-oficiais (rota pública, Boot.jsx), ligada daqui.
 */
// MC88.31 — partilhados com Boot.jsx, que decide se o gate é mostrado.
// Subir VERSAO_CONSENTIMENTO invalida os aceites anteriores de propósito.
// UTAC110h.1 (R18-110h.1-B) — "2.0" (v4) -> "3.0" (v5): quem aceitou o v4 volta a ver o gate.
// Tem de ser igual a VERSAO_GATE de netlify/functions/_lib/consentimento.mjs (há teste).
export const CHAVE_CONSENTIMENTO  = "gut_consentimento";
export const VERSAO_CONSENTIMENTO = "3.4"; // 2026-11-13 (UTAC137, R18-137-1): gate no Regulamento v6.0, igual ao VERSAO_GATE do backend — todos reaceitam. Anterior, «3.3»: 2026-10-18 (UTAC110m.2): acompanha o VERSAO_GATE do backend — o Regulamento mudou de texto e a frente C reduziu uma promessa (ECOQUILDO fora do app); Art. 39º exige aviso prévio (DEBT-066).

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
            {/* UTAC110j.3 — o carrossel é aria-hidden; o invólucro guarda o nome acessível que o <img> tinha. */}
            <div style={estilos.gutoWrapper} role="img" aria-label="GUTO mascote" data-testid="guto-gate">
              <CarrosselGUTO size={TAMANHO_GUTO_GATE} slides={GUTO_GATE} />
            </div>
            <div>
              <h2 style={estilos.titulo}>DesafioGUT</h2>
              <p style={estilos.grupoNome}>Grupo União e Trabalho · CNPJ 23.040.066/0001-00</p>
            </div>
          </div>
          <p style={estilos.subtitulo}>
            Leia e aceite o regulamento antes de participar. Vigência: a partir do{" "}
            <strong style={{ color: "#f5a623" }}>registo no Cartório de Títulos e Documentos</strong> (Art. 30).
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
          <h3 style={estilos.secaoTitulo}>Regulamento Oficial v6.0 — Resumo</h3>

          {/* UTAC137 — cada parágrafo é TEXTO LITERAL do Regulamento v6.0 (docs/REGULAMENTO-v6.md, o texto registado
              no RTD), com o rótulo do documento («Art. 1º» … «Art. 10.» em diante). Gerado a partir do ficheiro;
              o teste citacoesRegulamento compara cada bloco com o artigo do v6. O resumo do v5.0 (Arts. 1/2/5/6/8/9/
              14/27/47/49/65/66) fica no git (`b740046`). */}
          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 1º</strong> — O presente Regulamento estabelece os termos e condições gerais de uso do aplicativo de e-commerce por dropshipping com programa de fidelidade denominado DesafioGUT, operado pela Associação Recreativa dos Nordestinos no Amazonas, nome fantasia Grupo União e Trabalho (GUT), inscrita no CNPJ sob o nº 23.040.066/0001-00, com sede na cidade de Manaus, Estado do Amazonas.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 2º</strong> — O uso do aplicativo é destinado exclusivamente a pessoas maiores de 18 (dezoito) anos, exigindo-se cadastro prévio com fornecimento de dados verídicos, em estrita conformidade com a Lei Geral de Proteção de Dados (LGPD).
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 3º</strong> — A aquisição do Passe Desafio é estritamente opcional, não constituindo requisito obrigatório para a navegação básica, cadastro ou obtenção gratuita de pontos de engajamento na plataforma.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 5º</strong> — O Passe Desafio é um produto digital comercializado pelo valor fixo de R$ 2,00 (dois reais), concedendo acesso a recursos avançados de suporte e engajamento.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 6º</strong> — Em estrita conformidade com as diretrizes da Google Play para programas de fidelidade (Gamified Loyalty), o Passe não concede pontos de lance. Os pontos utilizados para realizar os lances são 100% gratuitos, obtidos exclusivamente por meio de engajamento diário, login contínuo e cumprimento de missões no aplicativo.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 7º</strong> — O Passe Desafio confere ao usuário o acesso ao assistente virtual de inteligência estratégica GUTO, dados analíticos de mercado e 1 (um) ponto de fidelidade ao sistema.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 8º</strong> — O Cartão Colecionável do ecossistema é estritamente digital. A proporção de conversão é fixa e inalterável: a cada 50 pontos de fidelidade acumulados, o sistema credita automaticamente 1 Cartão Digital ao perfil do usuário.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 11.</strong> — A Oferta Relâmpago configura modalidade de e-commerce baseada em habilidade, estratégia e menor valor único de lance, não configurando sorte, loteria ou jogo de azar.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 17.</strong> — Vence a Oferta Programada apenas 1 (um) palpite: aquele que registrar o número exato ou ficar mais próximo do número real apurado. Em caso de empate na proximidade, o critério de desempate será a ordem cronológica de registro do palpite no sistema.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 21.</strong> — O ECOQUILDO é a unidade de valor interno de bonificação da plataforma, possuindo o valor de paridade fixo de 1 ECOQUILDO equivalente a R$ 0,50 (cinquenta centavos), com lastro financeiro garantido pela Associação.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 23.</strong> — A cada 50 (cinquenta) ECOQUILDOs acumulados pelo usuário na plataforma, o sistema efetuará a conversão automática e imediata desse montante em 1 (um) Passe Desafio digital.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 25.</strong> — A aquisição do Passe Desafio (produto estritamente digital) será processada exclusivamente por meio do sistema oficial de pagamentos da Google Play (Google Billing).
          </p>

          <p style={estilos.artigo}>
            Regras completas (6 capítulos, 30 artigos) em{" "}
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
              Li e compreendi o regulamento completo do DesafioGUT (Regulamento Oficial v6.0), disponível em{" "}
              <a href="/regras-oficiais" style={estilos.link}>Regras Oficiais</a>.
            </span>
          </label>

          <label style={estilos.label}>
            <input type="checkbox" checked={maiores} onChange={(e) => setMaiores(e.target.checked)} style={estilos.checkbox} />
            {/* UTAC137 — o v6 não tem o artigo dos funcionários (era o Art. 65º do v5): a declaração cita só o que existe. */}
            <span>Declaro ter 18 anos ou mais (Art. 2º) e capacidade civil plena.</span>
          </label>

          <label style={estilos.label}>
            <input type="checkbox" checked={termos} onChange={(e) => setTermos(e.target.checked)} style={estilos.checkbox} />
            <span>Aceito os Termos de Participação: o Passe Desafio de R$ 2,00 é opcional e concede 1 ponto de fidelidade, sem pontos de lance (Arts. 3º, 5º, 6º e 7º), e a Oferta Relâmpago é baseada em habilidade — vence o menor valor único de lance (Art. 11.).</span>
          </label>

          <label style={estilos.label}>
            <input type="checkbox" checked={privacidade} onChange={(e) => setPrivacidade(e.target.checked)} style={estilos.checkbox} />
            <span>
              Concordo com o tratamento dos meus dados conforme a{" "}
              {/* MC90.3 — GAP 1 (MC90.2): link iubenda 404 -> rota pública /privacidade */}
              <a href="/privacidade" style={estilos.link}>
                Política de Privacidade
              </a>{" "}
              (LGPD/GDPR — Art. 27.).
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
