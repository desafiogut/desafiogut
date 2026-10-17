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
          {/* UTAC110j.1 (FRENTE D) — a política «Exclusão de conta e dados» do Google Play exige que a
              página pública nomeie a APP e o DESENVOLVEDOR, para quem chega aqui sem a app instalada
              saber que está no sítio certo. */}
          <p style={{ margin: "0.5rem 0 0", color: COR.muted, fontSize: "0.78rem", lineHeight: 1.5 }}>
            App: <strong style={{ color: COR.text }}>DesafioGUT</strong>
            <br />
            Desenvolvedor: <strong style={{ color: COR.text }}>Associação Recreativa dos Nordestinos no Amazonas</strong>
            {" "}(Grupo União e Trabalho) — CNPJ 23.040.066/0001-00
          </p>
          {/* MC90.3 — aviso de irreversibilidade (User Data policy 2026: o pedido
              de eliminação é efetivo e definitivo; congelamento não é substituto). */}
          <p style={{
            margin: "0.75rem auto 0", maxWidth: "480px",
            color: COR.danger, fontSize: "0.84rem", lineHeight: 1.5,
            border: "1px solid rgba(239,68,68,0.35)", borderRadius: "10px",
            padding: "0.6rem 0.9rem", background: "rgba(239,68,68,0.08)",
          }}>
            ⚠️ Esta ação é <strong>irreversível</strong>. Ao confirmar, a conta é encerrada e os
            dados pessoais são <strong>eliminados ou pseudonimizados</strong> logo após a confirmação
            (ver as listas abaixo: o que sai e o que a lei obriga a reter). <strong>Pseudonimizado não é
            anónimo</strong>: o registro que fica ainda é dado pessoal, e você mantém sobre ele os
            direitos da LGPD — incluindo falar com o Encarregado (dpo@grupouniaoetrabalho.com.br).
          </p>
        </header>

        {/* O que é apagado / retido */}
        <GlassCard className="p-5 mb-5">
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 800, color: COR.blue300, letterSpacing: "0.03em" }}>
            O QUE ACONTECE AO EXCLUIR
          </h3>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.86rem", color: COR.text, fontWeight: 700 }}>
            🗑️ Eliminado ou anonimizado:
          </p>
          <ul style={{ margin: "0 0 1rem", paddingLeft: "1.2rem", color: COR.muted, fontSize: "0.84rem", lineHeight: 1.55 }}>
            {/* UTAC110j (R18-110j-1-D) — alinhado ao que `_lib/conta-delete.mjs` APAGA de facto:
                `saldo_rs`, `troco_senhas` (registro off-chain) e `wallet`. As senhas on-chain NÃO são
                apagadas (ficam na lista «Retido», abaixo) — «senhas disponíveis» aqui era falso.
                UTAC110j.1 — entram `pontos`, `palpites`, `resgates` (com a morada) e as indicações. */}
            <li>Saldo em R$ e registro off-chain de senhas (legado)</li>
            <li>Perfil, preferências, código e vínculos de indicação (bónus e histórico mensal)</li>
            <li>Pontos de fidelidade e palpites do Passe Desafio</li>
            <li>Nome, CPF, endereço de entrega e telefone — anonimizados nos pedidos.</li>
            <li>Notificações e lances Relâmpago — sua carteira é substituída por um identificador pseudônimo.</li>
          </ul>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.86rem", color: COR.gold, fontWeight: 700 }}>
            🔒 Retido para cumprimento legal:
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.2rem", color: COR.muted, fontSize: "0.84rem", lineHeight: 1.55 }}>
            <li>NF-e (número, série e chave de acesso) — 5 anos (obrigação fiscal, CTN arts. 173 e 174).</li>
            <li>Histórico de pedidos — em forma anonimizada.</li>
            <li>Registros de pagamento (PIX) — mantidos pelo prazo fiscal exigido por lei, com um identificador pseudônimo derivado da carteira no lugar dos seus dados.</li>
            <li>Compras feitas na Google Play — registo contabilístico com um identificador pseudônimo derivado da carteira.</li>
            <li>Resgates do cartão colecionável — o registo da entrega fica; a morada passa a «[Conta Deletada]».</li>
            <li>Registo do Passe Desafio e saldo de ECOQUILDO — o valor contabilístico fica com um identificador pseudônimo no lugar da carteira.</li>
            <li>Logs de auditoria, incluindo os registos de indicação — 13 meses (Marco Civil da Internet, Lei 12.965/2014), sem o seu endereço.</li>
            <li>Dados de auditoria on-chain (txHash, commitmentHash), saldo de senhas on-chain (legado) e lances gravados na blockchain — públicos e imutáveis por natureza, identificados apenas pela carteira.</li>
          </ul>
          <p style={{ margin: "1rem 0 0.4rem", fontSize: "0.86rem", color: COR.blue300, fontWeight: 700 }}>
            Passos para pedir a exclusão
          </p>
          {/* UTAC110j.1 (FRENTE D) — a Google exige os PASSOS na página pública. */}
          <ol style={{ margin: 0, paddingLeft: "1.2rem", color: COR.muted, fontSize: "0.84rem", lineHeight: 1.55 }}>
            <li>Entre nesta página com a mesma conta (Google ou e-mail) que usa no app.</li>
            <li>Toque em «Excluir minha conta» e marque a confirmação.</li>
            <li>A conta e os dados pessoais são eliminados ou pseudonimizados logo após a confirmação; o que a lei obriga a guardar fica retido (lista acima) com um identificador pseudónimo, não anónimo.</li>
            <li>Se não conseguir entrar, peça por e-mail para desafiogut01@gmail.com — atendido em até 15 dias.</li>
          </ol>
        </GlassCard>
        <GlassCard className="p-5 mb-5">
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 800, color: COR.blue300, letterSpacing: "0.03em" }}>
            SOLICITAR EXCLUSÃO
          </h3>

          {concluido ? (
            <p style={{ margin: 0, color: COR.success, fontSize: "0.92rem", lineHeight: 1.5 }}>
              {typeof concluido === "number"
                ? `✅ Conta encerrada. ${concluido} lance(s) de uma edição ainda em curso ficaram com a sua carteira associada — não podem ser anonimizados sem quebrar a apuração dessa edição. Os restantes dados pessoais foram eliminados ou anonimizados.`
                : "✅ Conta encerrada. Os dados pessoais foram eliminados ou anonimizados; o que a lei obriga a guardar está na lista acima."}
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
        {/* MC90.3 — prazo de processamento (LGPD art. 15 e 18: atendimento em até
            15 dias, prorrogável por mais 15) + link para a política de privacidade
            (User Data policy: retenção e eliminação divulgadas na política). */}
        <p style={{ textAlign: "center", color: COR.muted, fontSize: "0.8rem", lineHeight: 1.5 }}>
          Prazo de processamento: o pedido é atendido em até <strong style={{ color: COR.text }}>15 dias</strong>,
          prorrogável por mais 15 dias (LGPD).
        </p>
        <p style={{ textAlign: "center", color: COR.muted, fontSize: "0.8rem", lineHeight: 1.5 }}>
          <a href="/privacidade" style={{ color: COR.blue300 }}>Política de Privacidade</a>
          {" · "}
          <a href="mailto:desafiogut01@gmail.com" style={{ color: COR.blue300 }}>Dúvidas: desafiogut01@gmail.com</a>
          <br />
          <span style={{ fontSize: "0.78rem", color: COR.muted }}>
            Encarregado de Proteção de Dados (DPO): Francisco Canindé Marinho —{" "}
            <a href="mailto:dpo@grupouniaoetrabalho.com.br" style={{ color: COR.blue300 }}>dpo@grupouniaoetrabalho.com.br</a>
          </span>
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
        onExcluido={(pend) => { setModal(false); setConcluido(pend > 0 ? pend : true); desconectar(); }}
      />
    </div>
  );
}
