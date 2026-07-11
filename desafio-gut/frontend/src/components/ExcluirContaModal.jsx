// ExcluirContaModal — MC72 (Exclusão de conta / conformidade Play Store).
//
// Modal de confirmação da exclusão de conta. Exige o gesto explícito de marcar
// "Entendo que esta ação é irreversível" antes de habilitar o botão. Ao confirmar,
// chama POST /delete-account com o user-session JWT (owner-only, anti-IDOR) e, em
// sucesso, dispara onExcluido() (o pai faz logout + redireciona para o login).
//
// Transparência (Play Store): declara os dados retidos por imposição
// técnica/legal (on-chain imutável + registros fiscais anonimizados).

import { useEffect, useState } from "react";
import { Modal, Button } from "@/components/ui";
import { apiPost } from "../lib/api.js";

const COR = {
  text: "#e8f0fe", muted: "#6b7db8",
  danger: "#ef4444", dangerDim: "rgba(239,68,68,0.12)",
  success: "#10b981", gold: "#f5a623",
};

const RETIDOS = [
  "Registros de pagamento (PIX) são anonimizados e mantidos pelo prazo fiscal exigido por lei.",
  "Saldo de senhas e lances já registrados na blockchain são imutáveis e não podem ser apagados (identificados apenas pela carteira).",
];

export default function ExcluirContaModal({ aberto, onFechar, address, authToken, onExcluido }) {
  const [confirmado, setConfirmado] = useState(false);
  const [etapa, setEtapa] = useState("confirmar"); // confirmar | processando | sucesso | erro
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!aberto) return;
    setConfirmado(false);
    setEtapa("confirmar");
    setErro("");
  }, [aberto]);

  async function handleExcluir() {
    if (!confirmado || !address) return;
    setEtapa("processando");
    setErro("");
    try {
      const resp = await apiPost("delete-account", { endereco: address }, { token: authToken });
      if (!resp.ok || !resp.data?.ok) {
        const msg = resp.data?.error?.message
          || (resp.status === 401 ? "Sessão expirada. Faça login novamente."
            : resp.status === 403 ? "Não autorizado a excluir esta conta."
              : `Falha na exclusão (HTTP ${resp.status}).`);
        setErro(msg);
        setEtapa("erro");
        return;
      }
      setEtapa("sucesso");
      // Dá ao usuário ~2s para ler a confirmação antes do logout+redirect.
      setTimeout(() => { onExcluido?.(); }, 2200);
    } catch (e) {
      setErro(e?.message || "Erro de rede ao excluir a conta.");
      setEtapa("erro");
    }
  }

  const processando = etapa === "processando";

  return (
    <Modal open={aberto} onClose={processando ? undefined : onFechar} labelledBy="excluir-conta-titulo">
      {etapa === "sucesso" ? (
        <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✅</div>
          <h2 id="excluir-conta-titulo" style={{ margin: "0 0 0.5rem", fontSize: "1.15rem", fontWeight: 900, color: COR.success }}>
            Conta excluída
          </h2>
          <p style={{ margin: 0, color: COR.muted, fontSize: "0.9rem", lineHeight: 1.5 }}>
            Seus dados pessoais foram removidos. Você será desconectado…
          </p>
        </div>
      ) : (
        <div>
          <h2 id="excluir-conta-titulo" style={{
            margin: "0 0 0.75rem", fontSize: "1.15rem", fontWeight: 900, color: COR.danger,
            display: "flex", alignItems: "center", gap: "0.5rem",
          }}>
            <span aria-hidden="true">⚠️</span> Excluir conta
          </h2>

          <p style={{ margin: "0 0 1rem", color: COR.text, fontSize: "0.92rem", lineHeight: 1.55 }}>
            Ao excluir sua conta, <strong>todos os dados pessoais serão permanentemente
            removidos</strong> (saldo em R$, senhas, histórico de lances e perfil).
            Esta ação <strong>não pode ser desfeita</strong>.
          </p>

          {/* Disclosure — dados retidos por imposição legal/técnica */}
          <div style={{
            background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.25)",
            borderRadius: "10px", padding: "0.75rem 0.9rem", marginBottom: "1rem",
          }}>
            <p style={{ margin: "0 0 0.4rem", fontSize: "0.74rem", fontWeight: 800, color: COR.gold, letterSpacing: "0.03em" }}>
              O QUE É RETIDO POR LEI
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", color: COR.muted, fontSize: "0.8rem", lineHeight: 1.5 }}>
              {RETIDOS.map((r) => <li key={r} style={{ marginBottom: "0.3rem" }}>{r}</li>)}
            </ul>
          </div>

          {etapa === "erro" && (
            <p role="alert" style={{
              margin: "0 0 0.9rem", padding: "0.6rem 0.8rem", borderRadius: "8px",
              background: COR.dangerDim, border: `1px solid ${COR.danger}55`,
              color: COR.danger, fontSize: "0.83rem",
            }}>{erro}</p>
          )}

          <label style={{
            display: "flex", alignItems: "flex-start", gap: "0.6rem", cursor: "pointer",
            marginBottom: "1.25rem", color: COR.text, fontSize: "0.88rem", lineHeight: 1.4,
          }}>
            <input
              type="checkbox"
              checked={confirmado}
              disabled={processando}
              onChange={(e) => setConfirmado(e.target.checked)}
              style={{ marginTop: "0.15rem", width: "18px", height: "18px", accentColor: COR.danger, flexShrink: 0 }}
            />
            <span>Entendo que esta ação é <strong>irreversível</strong> e desejo excluir minha conta.</span>
          </label>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Button variant="ghost" size="md" onClick={onFechar} disabled={processando}>
              Cancelar
            </Button>
            <Button
              variant="primary" size="md"
              onClick={handleExcluir}
              disabled={!confirmado || processando}
              className="!bg-[#ef4444] hover:!bg-[#dc2626] !text-white !shadow-[0_4px_24px_rgba(239,68,68,0.35)]"
            >
              {processando ? "Excluindo…" : "Confirmar exclusão"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
