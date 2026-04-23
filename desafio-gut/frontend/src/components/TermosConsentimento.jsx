import { useState } from "react";

/**
 * TermosConsentimento — Gate de compliance LGPD · Desafio Gut
 *
 * Exibe o regulamento oficial e bloqueia participação até aceitação total.
 * Artigos numerados em arábico conforme regulamento RTD Manaus/AM (1º mai/2026).
 */
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
      versao: "2.0",
    };
    sessionStorage.setItem("gut_consentimento", JSON.stringify(consentimento));
    onAceitar();
  }

  return (
    <div style={estilos.overlay}>
      <div style={estilos.modal}>

        {/* Cabeçalho */}
        <div style={estilos.header}>
          <div style={estilos.logoArea}>
            <span style={estilos.logoEmoji}>⚡</span>
            <div>
              <h2 style={estilos.titulo}>Desafio Gut</h2>
              <p style={estilos.grupoNome}>Grupo União e Trabalho · CNPJ 23.040.066/0001-00</p>
            </div>
          </div>
          <p style={estilos.subtitulo}>
            Leia e aceite o regulamento antes de participar. Vigência: a partir de{" "}
            <strong style={{ color: "#f5a623" }}>1º de junho de 2026</strong>.
          </p>
        </div>

        {/* Regulamento resumido */}
        <div style={estilos.scrollBox}>
          <h3 style={estilos.secaoTitulo}>Regulamento Oficial — Resumo dos Artigos Principais</h3>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 1</strong> — O Desafio Gut é uma atividade
            comercial em formato de E-commerce através de Dropshipping, operada pelo Grupo União e
            Trabalho (GUT), CNPJ 23.040.066/0001-00, contato (92) 98428-5774,
            e-mail: grupouniaoetrabalhoam@gmail.com.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 4</strong> — O aplicativo Desafio Gut será
            implantado a partir do dia <strong>1º (primeiro) de junho de 2026</strong> por tempo
            indeterminado, sob coordenação da diretoria do Grupo União e Trabalho.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 6</strong> — O interessado deverá se cadastrar
            gratuitamente e receberá um código único, intransferível e exclusivo de acesso para
            comprar senhas e realizar lances.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 8</strong> — O Desafio Gut funciona sempre
            através da pergunta: <em>"QUANTO VOCÊ PAGA POR ESSE BEM OU PRODUTO?"</em> —{" "}
            <strong style={{ color: "#f5a623" }}>O MENOR LANCE ÚNICO GANHA.</strong>
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 9</strong> — O participante poderá ofertar
            lances indeterminados através de senhas, escolhendo a versão Relâmpago (Flash) ou
            Programado, com data e tempo estipulado conforme descrito em cada edição.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 14</strong> — O contemplado poderá optar por
            receber o prêmio em dinheiro (moeda Real Brasileira). Para bens com valor acima de
            R$ 10.000,00, receberá no prazo máximo de 24 horas{" "}
            <strong>somente 80% (oitenta por cento) do valor descrito na edição</strong>, exceto
            se o ofertado seja em dinheiro, que pagará integralmente (residentes em Manaus/AM).
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 16</strong> — Bens ou produtos com valor acima
            de R$ 10.000,00: as despesas com transferência de propriedade são de total
            responsabilidade do participante contemplado, com prazo máximo de 15 (quinze) dias.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 20</strong> — Cada senha custa o valor único
            de <strong style={{ color: "#f5a623" }}>R$ 2,00 (dois reais)</strong> para todas as
            edições, seja Relâmpago ou Programado.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 21</strong> — Formas de pagamento: PIX
            desafiogut01@gmail.com, cartão de débito nacional/internacional ou TED — Banco do
            Brasil, Agência 181627, Conta Corrente 847534.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 24</strong> — Mensagens de comunicação
            recorrente:
          </p>
          <ul style={estilos.lista}>
            <li>a) <em>"Seu lance é o menor e único até agora, parabéns"</em></li>
            <li>b) <em>"Seu lance não é o menor mas é único, tente novamente"</em></li>
            <li>c) <em>"Já recebemos um lance igual ao seu, tente novamente"</em></li>
            <li>d) <em>"A senha digitada não é válida, tente novamente"</em></li>
            <li>e) <em>"Lance inválido — envie apenas o valor, ex: 0,01"</em></li>
            <li>f) <em>"Fique de olho no relógio para o final da edição"</em></li>
          </ul>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 26</strong> — A apuração dos lances é
            automática através do painel interno de controle restrito.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 27</strong> — O participante poderá ofertar
            qualquer valor de lance a partir de{" "}
            <strong style={{ color: "#f5a623" }}>R$ 0,01 (um centavo)</strong>, sempre com no
            máximo 2 (duas) casas decimais. Valores fora deste formato não serão aceitos.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 30</strong> — É proibida a participação de
            funcionários, colaboradores, prestadores de serviços e familiares de qualquer empresa
            envolvida no Desafio Gut.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 33</strong> — Os participantes cedem,
            gratuitamente, os direitos de utilização de seu nome, imagem e som de voz para
            divulgação em qualquer mídia, exclusivamente referente ao evento.
          </p>

          <p style={estilos.artigo}>
            <strong style={estilos.artLabel}>Art. 35</strong> — Este regulamento está registrado
            no RTD — Cartório de Títulos e Documentos da comarca de Manaus/AM, Brasil, em 1º
            (primeiro) de maio de 2026.
          </p>

          <div style={estilos.contatoBox}>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#4a6490" }}>
              📧 Dúvidas: desafiogut01@gmail.com &nbsp;·&nbsp;
              📞 (92) 98428-5774 &nbsp;·&nbsp;
              🌐 www.grupouniaoetrabalho.com.br
            </p>
          </div>
        </div>

        {/* Checkboxes de consentimento */}
        <div style={estilos.checkboxes}>
          <label style={estilos.label}>
            <input type="checkbox" checked={lido} onChange={(e) => setLido(e.target.checked)} style={estilos.checkbox} />
            <span>Li e compreendi o regulamento completo do Desafio Gut registrado em cartório.</span>
          </label>

          <label style={estilos.label}>
            <input type="checkbox" checked={maiores} onChange={(e) => setMaiores(e.target.checked)} style={estilos.checkbox} />
            <span>Declaro ter 18 anos ou mais, capacidade civil plena e não ser funcionário do GUT.</span>
          </label>

          <label style={estilos.label}>
            <input type="checkbox" checked={termos} onChange={(e) => setTermos(e.target.checked)} style={estilos.checkbox} />
            <span>Aceito os Termos de Participação, o mecanismo "Menor Lance Único Ganha" (Art. 8) e as regras de lance (Art. 27).</span>
          </label>

          <label style={estilos.label}>
            <input type="checkbox" checked={privacidade} onChange={(e) => setPrivacidade(e.target.checked)} style={estilos.checkbox} />
            <span>
              Concordo com o tratamento dos meus dados conforme a{" "}
              <a href="https://www.iubenda.com/privacy-policy/DESAFIOGUT" target="_blank" rel="noopener noreferrer" style={{ color: "#93c5fd" }}>
                Política de Privacidade
              </a>{" "}
              (LGPD/GDPR) e cedo minha imagem conforme Art. 33.
            </span>
          </label>
        </div>

        <button
          style={{ ...estilos.botao, opacity: tudoAceito ? 1 : 0.4, cursor: tudoAceito ? "pointer" : "not-allowed" }}
          onClick={handleAceitar}
          disabled={!tudoAceito}
        >
          ⚡ Aceito o Desafio Gut
        </button>

        <p style={estilos.rodapeLegal}>
          Grupo União e Trabalho · CNPJ 23.040.066/0001-00 · Manaus/AM, Brasil
        </p>
      </div>
    </div>
  );
}

// ─── Estilos — paleta Azul Marinho GUT ───────────────────────────────────────
const estilos = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(3,15,36,0.92)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: "1rem",
  },
  modal: {
    background: "#0d2145",
    border: "1px solid rgba(37,99,235,0.3)",
    borderRadius: "16px", padding: "2rem",
    maxWidth: "620px", width: "100%", color: "#e8f0fe",
    boxShadow: "0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(37,99,235,0.15)",
    maxHeight: "92vh", display: "flex", flexDirection: "column", gap: "1.25rem",
    overflowY: "auto",
  },
  header: {
    borderBottom: "1px solid rgba(37,99,235,0.2)",
    paddingBottom: "1rem",
  },
  logoArea: {
    display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem",
  },
  logoEmoji: {
    fontSize: "2rem",
    filter: "drop-shadow(0 0 8px rgba(245,166,35,0.6))",
  },
  titulo:   { margin: 0, fontSize: "1.5rem", fontWeight: "900", color: "#e8f0fe", letterSpacing: "0.04em" },
  grupoNome: { margin: 0, fontSize: "0.72rem", color: "#4a6490" },
  subtitulo: { margin: 0, color: "#93c5fd", fontSize: "0.88rem", lineHeight: "1.5" },
  secaoTitulo: {
    margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: "800",
    color: "#93c5fd", letterSpacing: "0.05em", textTransform: "uppercase",
  },
  scrollBox: {
    overflowY: "auto", maxHeight: "260px", padding: "1.25rem",
    background: "rgba(3,15,36,0.6)", borderRadius: "12px", fontSize: "0.84rem",
    lineHeight: "1.65", color: "#cbd5e1",
    border: "1px solid rgba(37,99,235,0.15)",
  },
  artigo: { margin: "0 0 0.9rem" },
  artLabel: { color: "#93c5fd", fontWeight: "800" },
  lista: {
    margin: "0.25rem 0 0.9rem 1.2rem",
    padding: 0,
    display: "flex", flexDirection: "column", gap: "0.3rem",
    fontSize: "0.81rem", color: "#94a3b8",
  },
  contatoBox: {
    marginTop: "1rem", padding: "0.75rem",
    background: "rgba(37,99,235,0.08)",
    borderRadius: "8px", textAlign: "center",
    border: "1px solid rgba(37,99,235,0.15)",
  },
  checkboxes: { display: "flex", flexDirection: "column", gap: "0.8rem" },
  checkbox:   { accentColor: "#2563eb", width: "16px", height: "16px", flexShrink: 0, marginTop: "1px" },
  label: {
    display: "flex", alignItems: "flex-start", gap: "0.6rem",
    fontSize: "0.86rem", cursor: "pointer", lineHeight: "1.5",
    color: "#e8f0fe",
  },
  botao: {
    padding: "0.9rem",
    background: "linear-gradient(135deg,#f5a623,#f97316)",
    color: "#030f24",
    border: "none", borderRadius: "28px",
    fontSize: "1rem", fontWeight: "900",
    transition: "opacity 0.2s",
    letterSpacing: "0.04em",
    boxShadow: "0 4px 20px rgba(245,166,35,0.4)",
  },
  rodapeLegal: {
    margin: 0, fontSize: "0.68rem", color: "#4a6490",
    textAlign: "center", letterSpacing: "0.03em",
  },
};
