import { useState } from "react";

/**
 * TermosConsentimento — Compliance Iubenda
 *
 * Exibe os termos do DESAFIOGUT e bloqueia participação até aceitação.
 * Integra com Iubenda Privacy Policy e Cookie Policy.
 * LGPD / GDPR compliant.
 */
export default function TermosConsentimento({ onAceitar }) {
  const [lido, setLido] = useState(false);
  const [maiores, setMaiores] = useState(false);
  const [termos, setTermos] = useState(false);
  const [privacidade, setPrivacidade] = useState(false);

  const tudoAceito = lido && maiores && termos && privacidade;

  function handleAceitar() {
    if (!tudoAceito) return;
    // Persiste consentimento com timestamp para auditoria
    const consentimento = {
      aceito: true,
      timestamp: new Date().toISOString(),
      versao: "1.0",
    };
    sessionStorage.setItem("gut_consentimento", JSON.stringify(consentimento));
    onAceitar();
  }

  return (
    <div style={estilos.overlay}>
      <div style={estilos.modal}>
        <div style={estilos.header}>
          <h2 style={estilos.titulo}>⚖️ DESAFIOGUT — Termos & Compliance</h2>
          <p style={estilos.subtitulo}>
            Antes de participar, leia e aceite os termos abaixo.
          </p>
        </div>

        {/* Regulamento resumido */}
        <div style={estilos.scrollBox}>
          <h3>Regulamento Resumido</h3>
          <p>
            <strong>Art. VIII:</strong> Vence o participante que der o menor lance único — valor
            mais baixo que não tenha sido repetido por nenhum outro participante.
          </p>
          <p>
            <strong>Art. XVII:</strong> Cada senha custa R$ 2,00 e é liberada pela coordenação
            após confirmação de pagamento via PIX ou Bônus.
          </p>
          <p>
            <strong>Art. XXIII:</strong> O lance mínimo é de R$ 0,01 (1 centavo).
          </p>
          <p>
            <strong>Art. XXII:</strong> A apuração do vencedor é realizada exclusivamente pela
            coordenação ao término do prazo da edição.
          </p>
          <p>
            <strong>Blockchain:</strong> Todos os lances são registrados imutavelmente na rede
            Ethereum Sepolia. A transparência é garantida pelo smart contract público.
          </p>
          <p>
            <strong>Limite de lances:</strong> Máximo de 5 lances por minuto por carteira,
            com intervalo mínimo de 3 segundos entre lances consecutivos.
          </p>

          {/* Iubenda Privacy Policy embed */}
          <div style={estilos.iubendaBox}>
            <a
              href="https://www.iubenda.com/privacy-policy/DESAFIOGUT"
              target="_blank"
              rel="noopener noreferrer"
              style={estilos.iubendaLink}
              className="iubenda-white iubenda-noiframe iubenda-embed"
            >
              🔒 Política de Privacidade (LGPD/GDPR)
            </a>
            <span style={estilos.separador}>·</span>
            <a
              href="https://www.iubenda.com/privacy-policy/DESAFIOGUT/cookie-policy"
              target="_blank"
              rel="noopener noreferrer"
              style={estilos.iubendaLink}
            >
              🍪 Política de Cookies
            </a>
          </div>
        </div>

        {/* Checkboxes de consentimento */}
        <div style={estilos.checkboxes}>
          <label style={estilos.label}>
            <input type="checkbox" checked={lido} onChange={(e) => setLido(e.target.checked)} />
            &nbsp;Li e compreendi o regulamento completo do DESAFIOGUT.
          </label>

          <label style={estilos.label}>
            <input type="checkbox" checked={maiores} onChange={(e) => setMaiores(e.target.checked)} />
            &nbsp;Declaro ter 18 anos ou mais e capacidade civil plena.
          </label>

          <label style={estilos.label}>
            <input type="checkbox" checked={termos} onChange={(e) => setTermos(e.target.checked)} />
            &nbsp;Aceito os Termos de Participação e estou ciente das regras de lance.
          </label>

          <label style={estilos.label}>
            <input type="checkbox" checked={privacidade} onChange={(e) => setPrivacidade(e.target.checked)} />
            &nbsp;Concordo com a{" "}
            <a
              href="https://www.iubenda.com/privacy-policy/DESAFIOGUT"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#6ee7b7" }}
            >
              Política de Privacidade
            </a>{" "}
            e o tratamento dos meus dados conforme a LGPD.
          </label>
        </div>

        <button
          style={{ ...estilos.botao, opacity: tudoAceito ? 1 : 0.4, cursor: tudoAceito ? "pointer" : "not-allowed" }}
          onClick={handleAceitar}
          disabled={!tudoAceito}
        >
          ✅ Aceitar e Participar
        </button>
      </div>
    </div>
  );
}

const estilos = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: "1rem",
  },
  modal: {
    background: "#1e293b", borderRadius: "12px", padding: "2rem",
    maxWidth: "600px", width: "100%", color: "#e2e8f0",
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)", maxHeight: "90vh",
    display: "flex", flexDirection: "column", gap: "1rem",
  },
  header: { borderBottom: "1px solid #334155", paddingBottom: "1rem" },
  titulo: { margin: 0, fontSize: "1.4rem", color: "#6ee7b7" },
  subtitulo: { margin: "0.5rem 0 0", color: "#94a3b8", fontSize: "0.9rem" },
  scrollBox: {
    overflowY: "auto", maxHeight: "220px", padding: "1rem",
    background: "#0f172a", borderRadius: "8px", fontSize: "0.85rem",
    lineHeight: "1.6", color: "#cbd5e1",
  },
  iubendaBox: { marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  iubendaLink: { color: "#6ee7b7", textDecoration: "none", fontSize: "0.85rem" },
  separador: { color: "#475569" },
  checkboxes: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  label: { display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.88rem", cursor: "pointer", lineHeight: "1.4" },
  botao: {
    padding: "0.85rem", background: "#10b981", color: "#fff",
    border: "none", borderRadius: "8px", fontSize: "1rem",
    fontWeight: "600", transition: "opacity 0.2s",
  },
};
