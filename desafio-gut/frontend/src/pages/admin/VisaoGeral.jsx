// Visão Geral — índice do painel ADM.
//
// MC89.1 criou-a; MC89.6 moveu-a de `AdminPanel.jsx` (TabVisaoGeral) para
// ficheiro próprio, sem alterar comportamento. As duas regras que este ecrã não
// pode quebrar continuam a valer:
//   1. Número indisponível mostra-se como "—", NUNCA como 0 (ouTraco + parciais).
//   2. O bloco on-chain carrega SEPARADO: depende de RPC e a sua lentidão não
//      pode segurar o resto do ecrã.
//
// MC89.6 acrescentou os cartões-atalho (AtalhosAdmin) que fazem desta tela o
// ÍNDICE de D-NAV: é daqui que se chega a todas as outras. Fase 1 (MC89.7)
// acrescenta gráficos e alertas.

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { Button } from "../../components/ui";
import AtalhosAdmin from "../../components/admin/AtalhosAdmin.jsx";
import { COR, Metrica, Grelha, ouTraco, brl } from "./_ui.jsx";

export default function VisaoGeral() {
  const { chamarAdmin } = useAdminAuth();
  const isMobile = useIsMobile();

  const [stats, setStats]       = useState(null);
  const [onchain, setOnchain]   = useState(null);
  const [erro, setErro]         = useState("");
  const [erroChain, setErroChain] = useState("");
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    if (!chamarAdmin) return;
    setCarregando(true);
    setErro("");
    try {
      const resp = await chamarAdmin("/.netlify/functions/admin-stats");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);
      setStats(data);
    } catch (err) {
      setErro(err?.message || "falha ao ler as métricas");
    } finally {
      setCarregando(false);
    }
  }, [chamarAdmin]);

  // Pedido SEPARADO e sem `await` no caminho do anterior: o saldo on-chain
  // depende de RPC e a sua lentidão (ou falha) não pode segurar as métricas.
  const carregarOnchain = useCallback(async () => {
    if (!chamarAdmin) return;
    setErroChain("");
    try {
      const resp = await chamarAdmin("/.netlify/functions/admin-onchain");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);
      setOnchain(data);
    } catch (err) {
      setErroChain(err?.message || "falha ao ler a cadeia");
    }
  }, [chamarAdmin]);

  useEffect(() => {
    if (!chamarAdmin) return;
    carregar();
    carregarOnchain();
  }, [chamarAdmin, carregar, carregarOnchain]);

  // Os atalhos NÃO dependem da sessão admin: são a navegação do painel, e um ADM
  // sem JWT ainda tem de conseguir circular. Só as métricas ficam por trás do gate.
  if (!chamarAdmin) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        <AtalhosAdmin />
        <p style={{ color: COR.muted, fontSize: "0.85rem", margin: 0 }}>
          Autentique-se para ver as métricas.
        </p>
      </div>
    );
  }

  const u = stats?.utilizadores;
  const f = stats?.financeiro;
  const c = stats?.cotas;
  const fila = stats?.operacao?.fila;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      <AtalhosAdmin />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.72rem", color: COR.muted }}>
          {stats?.geradoEm ? `Lido às ${new Date(stats.geradoEm).toLocaleTimeString("pt-BR")}` : ""}
          {stats?.cache === "hit" ? " · em cache" : ""}
        </span>
        <Button variant="ghost" size="sm" onClick={() => { carregar(); carregarOnchain(); }} disabled={carregando}>
          {carregando ? "A ler…" : "↻ Atualizar"}
        </Button>
      </div>

      {erro && (
        <div style={{ padding: "0.7rem 0.9rem", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: `1px solid ${COR.danger}55`, color: COR.danger, fontSize: "0.82rem" }}>
          {erro}
        </div>
      )}

      {/* O backend diz PELO NOME o que não conseguiu ler. Mostrar isso é o que
          impede alguém de tomar um "—" por um zero. */}
      {stats?.parciais?.length > 0 && (
        <div style={{ padding: "0.7rem 0.9rem", borderRadius: "8px", background: "rgba(251,191,36,0.08)", border: `1px solid ${COR.warn}55`, color: COR.warn, fontSize: "0.8rem" }}>
          Fontes indisponíveis neste momento: <strong>{stats.parciais.join(", ")}</strong>.
          Os números dessas áreas aparecem como “—”, não como zero.
        </div>
      )}

      <section>
        <h3 style={{ fontSize: "0.78rem", color: COR.primary, margin: "0 0 0.5rem", letterSpacing: "0.05em" }}>UTILIZADORES</h3>
        <Grelha isMobile={isMobile}>
          <Metrica
            rotulo="Com atividade"
            valor={ouTraco(u?.comAtividade)}
            cor={COR.diamond}
            nota="Endereços vistos nos nossos dados. NÃO é o total de registados — a identidade vive no Privy."
          />
          <Metrica rotulo="Com cota" valor={ouTraco(c?.comCarteira)} nota={c ? `${c.total} cota(s) no total` : null} />
        </Grelha>
      </section>

      <section>
        <h3 style={{ fontSize: "0.78rem", color: COR.primary, margin: "0 0 0.5rem", letterSpacing: "0.05em" }}>FINANCEIRO</h3>
        <Grelha isMobile={isMobile}>
          <Metrica rotulo="Saldo em circulação" valor={ouTraco(f?.saldoTotalCentavos, brl)} cor={COR.success} />
          <Metrica rotulo="Já creditado" valor={ouTraco(f?.creditadoCentavos, brl)} nota={f ? `${f.creditos} crédito(s)` : null} />
          <Metrica
            rotulo={`Créditos (${stats?.janelaDias ?? 30} d)`}
            valor={ouTraco(f?.creditosJanela)}
          />
        </Grelha>
      </section>

      <section>
        <h3 style={{ fontSize: "0.78rem", color: COR.primary, margin: "0 0 0.5rem", letterSpacing: "0.05em" }}>OPERAÇÃO</h3>
        <Grelha isMobile={isMobile}>
          <Metrica
            rotulo="Fila — pendentes"
            valor={ouTraco(fila?.pendentes)}
            cor={fila?.pendentes > 0 ? COR.warn : COR.success}
            nota={fila?.atualizadaEm ? `última: ${new Date(fila.atualizadaEm).toLocaleString("pt-BR")}` : null}
          />
          <Metrica rotulo="Fila — falhadas" valor={ouTraco(fila?.falhadas)} cor={fila?.falhadas > 0 ? COR.danger : undefined} />
          <Metrica rotulo="Fila — total" valor={ouTraco(fila?.total)} />
        </Grelha>
      </section>

      <section>
        <h3 style={{ fontSize: "0.78rem", color: COR.primary, margin: "0 0 0.5rem", letterSpacing: "0.05em" }}>
          CADEIA <span style={{ color: COR.muted, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>· carrega à parte</span>
        </h3>
        {erroChain && (
          <div style={{ padding: "0.6rem 0.8rem", borderRadius: "8px", background: "rgba(251,191,36,0.08)", border: `1px solid ${COR.warn}55`, color: COR.warn, fontSize: "0.78rem", marginBottom: "0.5rem" }}>
            Cadeia indisponível: {erroChain}
          </div>
        )}
        <Grelha isMobile={isMobile}>
          <Metrica
            rotulo="Saldo da coordenadora"
            valor={ouTraco(onchain?.saldoEth, (v) => `${v} ETH`)}
            cor={COR.primary}
            nota="É esta carteira que credita as senhas on-chain. Sem gás, a compra deixa de ser creditada."
          />
          <Metrica rotulo="Bloco atual" valor={ouTraco(onchain?.bloco, (v) => v.toLocaleString("pt-BR"))} />
        </Grelha>
      </section>
    </div>
  );
}
