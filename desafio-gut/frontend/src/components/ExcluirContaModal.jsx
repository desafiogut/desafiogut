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

// MC104.3 (DEC-104.3-2): NF-e + histórico anonimizado + auditoria on-chain. O consent-log NÃO entra: o
// conta-delete apaga-o na exclusão (decisão do operador: omitir a linha que o daria como retido).
// UTAC110j.1 (R18-110j.1-3): o texto é o espelho de `POLITICA_EXCLUSAO`/`DADOS_RETIDOS` em
// `netlify/functions/_lib/conta-delete.mjs`. O teste `utac110j1-texto-exclusao.test.mjs` compara os
// dois lados e falha se o ecrã prometer algo que o backend não faz (ou esconder algo que faz).
export const APAGADOS = [
  "Saldo em R$, registro off-chain de senhas e carteira.",
  "Perfil, atividade registada e pontos de fidelidade.",
  "Palpites do Passe Desafio.",
  "Código de indicação, vínculos de indicação, bónus e histórico mensal de indicações.",
];

export const RETIDOS = [
  "NF-e (número, série e chave de acesso) — mantida por 5 anos (obrigação fiscal, CTN arts. 173 e 174).",
  "Histórico de pedidos — mantido em forma anonimizada (sem nome, CPF, morada ou telefone).",
  "Registros de pagamento PIX e de compras na Google Play — mantidos pelo prazo fiscal exigido por lei com um identificador pseudônimo no lugar da sua carteira.",
  "Resgates do cartão colecionável — o registo da entrega (data e produto) fica e a morada passa a «[Conta Deletada]» (obrigação contabilística).",
  "Registo do Passe Desafio e do saldo de ECOQUILDO — o registo contabilístico fica, o seu endereço passa a um identificador pseudônimo.",
  "Dados de auditoria on-chain (txHash, commitmentHash), saldo de senhas on-chain (legado) e lances já registrados na blockchain são públicos e imutáveis e não podem ser apagados (identificados apenas pela carteira).",
  "Logs de auditoria, incluindo o registo de indicações — 13 meses (Marco Civil da Internet, Lei 12.965/2014), sem o seu endereço.",
];

export default function ExcluirContaModal({ aberto, onFechar, address, authToken, onExcluido }) {
  const [confirmado, setConfirmado] = useState(false);
  const [etapa, setEtapa] = useState("confirmar"); // confirmar | processando | sucesso | erro
  const [erro, setErro] = useState("");
  // UTAC110j.1 (achado do validador adversarial) — o backend pode devolver ok:true com PENDENTE:
  // lances de uma edição AINDA ABERTA não podem ser anonimizados sem quebrar a apuração, e o
  // manifesto conta-os em `blobs.pendente`. Nesse caso «Seus dados pessoais foram removidos» era
  // FALSO. O ecrã passa a dizê-lo: o que ficou, quanto, e porquê.
  const [pendente, setPendente] = useState(null);

  useEffect(() => {
    if (!aberto) return;
    setConfirmado(false);
    setEtapa("confirmar");
    setErro("");
    setPendente(null);
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
      const p = resp.data?.manifesto?.blobs?.pendente;
      const total = p && typeof p === "object"
        ? Object.values(p).reduce((s, v) => s + (Number(v) || 0), 0)
        : 0;
      setPendente(total > 0 ? total : null);
      setEtapa("sucesso");
      // Dá ao usuário tempo para ler a confirmação antes do logout+redirect (mais, se houver pendência).
      setTimeout(() => { onExcluido?.(total > 0 ? total : 0); }, total > 0 ? 6000 : 2200);
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
            {pendente
              ? "Sua conta foi encerrada. Veja abaixo o que ficou pendente."
              : "Conta encerrada. Os seus dados pessoais foram eliminados ou anonimizados — o que a lei obriga a guardar está na lista acima. Você será desconectado…"}
          </p>
          {/* UTAC110j.1 — PENDÊNCIA DECLARADA (achado do validador): lances de uma edição ainda aberta
              não podem ser anonimizados sem quebrar a apuração; o backend conta-os em `pendente`. */}
          {pendente ? (
            <p role="status" style={{
              margin: "0.75rem 0 0", padding: "0.6rem 0.8rem", borderRadius: "8px", textAlign: "left",
              background: "rgba(245,166,35,0.10)", border: "1px solid rgba(245,166,35,0.35)",
              color: COR.gold, fontSize: "0.8rem", lineHeight: 1.45,
            }}>
              {pendente} lance(s) de uma edição ainda em curso ficaram com a sua carteira associada:
              não podem ser anonimizados sem quebrar a apuração dessa edição. Os restantes dados
              pessoais foram removidos.
            </p>
          ) : null}
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
            Ao excluir sua conta, os seus dados pessoais são <strong>eliminados</strong> ou
            <strong> anonimizados</strong> (deixam de identificar você). O que a lei obriga a guardar
            fica retido nos termos abaixo. Esta ação <strong>não pode ser desfeita</strong>.
          </p>

          {/* UTAC110j.1 — o que sai, item a item (antes era «todos os dados pessoais», absoluto e falso) */}
          <div style={{
            background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "10px", padding: "0.75rem 0.9rem", marginBottom: "0.75rem",
          }}>
            <p style={{ margin: "0 0 0.4rem", fontSize: "0.74rem", fontWeight: 800, color: COR.danger, letterSpacing: "0.03em" }}>
              O QUE É ELIMINADO
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", color: COR.muted, fontSize: "0.8rem", lineHeight: 1.5 }}>
              {APAGADOS.map((r) => <li key={r} style={{ marginBottom: "0.3rem" }}>{r}</li>)}
            </ul>
          </div>

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
