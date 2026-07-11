// ExcluirConta — MC72 (página pública de solicitação de exclusão de conta).
//
// URL pública (/excluir-conta) exigida pela política "Exclusão de conta e dados"
// da Google Play Store: permite ao usuário solicitar a exclusão FORA do app, sem
// reinstalar. Renderiza STANDALONE (fora do gate LGPD e da navegação — ver App.jsx),
// mas dentro dos providers (Privy/AppContext), então reutiliza o mesmo login e o
// mesmo user-session JWT do fluxo in-app.
//
// Verificação de identidade: só o dono da conta (logado via Privy) consegue
// executar a exclusão — o backend (delete-account) valida owner-only (anti-IDOR).
// Quem não conseguir logar tem o canal de suporte por e-mail como alternativa.

import { useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { GlassCard, Button } from "@/components/ui";
import BotaoLoginPrincipal from "../components/BotaoLoginPrincipal.jsx";
import ExcluirContaModal from "../components/ExcluirContaModal.jsx";

const COR = {
  bg: "#050818", text: "#e8f0fe", muted: "#6b7db8",
  gold: "#f5a623", danger: "#ef4444", success: "#10b981", blue300: "#fbbf24",
};

export default function ExcluirConta() {
  const { isConnected, address, userLabel, authToken, abrirModal, desconectar } = useAppContext();
  const [modal, setModal] = useState(false);
  const [concluido, setConcluido] = useState(false);

  return (
    <div style={{
      minHeight: "100vh", background: COR.bg, color: COR.text,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "2rem 1rem", boxSizing: "border-box",
    }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <header style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.6rem", fontWeight: 900 }}>
            Excluir conta — DesafioGUT
          </h1>
          <p style={{ margin: 0, color: COR.muted, fontSize: "0.92rem", lineHeight: 1.5 }}>
            Solicite a remoção permanente da sua conta e dos seus dados pessoais.
          </p>
        </header>

        {/* O que é apagado / retido */}
        <GlassCard className="p-5 mb-5">
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 800, color: COR.blue300, letterSpacing: "0.03em" }}>
            O QUE ACONTECE AO EXCLUIR
          </h3>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.86rem", color: COR.text, fontWeight: 700 }}>
            🗑️ Apagado permanentemente:
          </p>
          <ul style={{ margin: "0 0 1rem", paddingLeft: "1.2rem", color: COR.muted, fontSize: "0.84rem", lineHeight: 1.55 }}>
            <li>Saldo em R$ e senhas disponíveis</li>
            <li>Histórico de lances e perfil</li>
            <li>Preferências e vínculos de indicação</li>
          </ul>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.86rem", color: COR.gold, fontWeight: 700 }}>
            🔒 Retido por imposição legal/técnica (anonimizado):
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.2rem", color: COR.muted, fontSize: "0.84rem", lineHeight: 1.55 }}>
            <li>Registros de pagamento (PIX) — mantidos pelo prazo fiscal exigido por lei, sem vínculo com sua identidade.</li>
            <li>Saldo de senhas e lances já gravados na blockchain — imutáveis por natureza, identificados apenas pela carteira.</li>
          </ul>
        </GlassCard>

        {/* Ação */}
        <GlassCard className="p-5 mb-5">
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 800, color: COR.blue300, letterSpacing: "0.03em" }}>
            SOLICITAR EXCLUSÃO
          </h3>

          {concluido ? (
            <p style={{ margin: 0, color: COR.success, fontSize: "0.92rem", lineHeight: 1.5 }}>
              ✅ Sua conta foi excluída. Os dados pessoais foram removidos.
            </p>
          ) : isConnected ? (
            <div>
              <p style={{ margin: "0 0 0.9rem", color: COR.muted, fontSize: "0.86rem", lineHeight: 1.5 }}>
                Conectado como <strong style={{ color: COR.text }}>{userLabel || "—"}</strong>
                <br />
                <span style={{ fontFamily: "monospace", fontSize: "0.76rem", wordBreak: "break-all" }}>{address}</span>
              </p>
              <Button
                variant="primary" size="lg"
                onClick={() => setModal(true)}
                className="w-full !bg-[#ef4444] hover:!bg-[#dc2626] !text-white"
              >
                🗑️ Excluir minha conta
              </Button>
            </div>
          ) : (
            <div>
              <p style={{ margin: "0 0 1rem", color: COR.muted, fontSize: "0.86rem", lineHeight: 1.5 }}>
                Para confirmar que a conta é sua, entre com o mesmo método de login
                (Google ou e-mail) que você usa no app.
              </p>
              <BotaoLoginPrincipal onClick={abrirModal} size="lg" fullWidth />
            </div>
          )}
        </GlassCard>

        {/* Alternativa por suporte */}
        <p style={{ textAlign: "center", color: COR.muted, fontSize: "0.8rem", lineHeight: 1.5 }}>
          Não consegue entrar? Solicite a exclusão pelo suporte:{" "}
          <a href="mailto:desafiogut01@gmail.com?subject=Solicita%C3%A7%C3%A3o%20de%20exclus%C3%A3o%20de%20conta"
            style={{ color: COR.blue300 }}>desafiogut01@gmail.com</a>
        </p>
        <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <a href="/" style={{ color: COR.muted, fontSize: "0.82rem" }}>← Voltar ao app</a>
        </p>
      </div>

      <ExcluirContaModal
        aberto={modal}
        onFechar={() => setModal(false)}
        address={address}
        authToken={authToken}
        onExcluido={() => { setModal(false); setConcluido(true); desconectar(); }}
      />
    </div>
  );
}
