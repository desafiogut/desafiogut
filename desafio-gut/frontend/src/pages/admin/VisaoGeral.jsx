// Visão Geral — índice do painel ADM.
//
// MC89.1 criou-a; MC89.6 moveu-a para ficheiro próprio e acrescentou os
// cartões-atalho. MC89.7 (Fase 1) acrescenta gráficos de evolução e alertas.
//
// REGRAS QUE ESTE ECRÃ NÃO PODE QUEBRAR:
//   1. Número indisponível mostra-se como "—", NUNCA como 0 (ouTraco + parciais).
//   2. O bloco on-chain carrega SEPARADO — a sua lentidão não segura o resto.
//   3. Os gráficos mostram os dados COMO ESTÃO — sem preencher, sem interpolar.
//   4. As cores dos alertas são: critical=vermelho, warning=laranja, info=cinzento.

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { Button } from "../../components/ui";
import GraficoLinha from "../../components/admin/GraficoLinha.jsx";
import { COR, Metrica, Grelha, ouTraco, brl , TituloSeccao } from "./_ui.jsx";

// ── Alertas do frontend (R7: dependem de RPC, não do Postgres) ─────────────
// Estes são computados AQUI porque o admin-onchain já tem os dados, e a regra
// R7 diz para não agrupar Postgres com RPC no mesmo endpoint.

function alertasDoFrontend({ onchain }) {
  const a = [];
  if (!onchain) return a;

  // A1 — EOA baixa: menos de 0.005 ETH
  if (onchain.saldoEth !== null && onchain.saldoEth !== undefined) {
    const eth = parseFloat(onchain.saldoEth);
    if (eth < 0.005) {
      a.push({
        id: "eoa_baixa", nivel: "critical",
        mensagem: `Saldo da EOA coordenadora: ${eth.toFixed(6)} ETH — abaixo do limiar de 0.005 ETH. Sem gás, a compra de senhas deixa de ser creditada on-chain.`,
        fonte: "admin-onchain",
      });
    }
  }

  // A4 — Monitor on-chain: o backend não expõe o último bloco processado (vive
  // em Blob). Quando o fizer, este alerta compara blocoAtual vs processado.
  // Por agora: se houver parciais de "saldo" no onchain, a cadeia não respondeu.
  if (onchain.parciais && onchain.parciais.length > 0) {
    a.push({
      id: "cadeia_indisponivel", nivel: "warning",
      mensagem: `A cadeia não respondeu completamente: ${onchain.parciais.join(", ")}. Os números on-chain podem estar desatualizados.`,
      fonte: "admin-onchain",
    });
  }

  return a;
}

export default function VisaoGeral() {
  const { chamarAdmin } = useAdminAuth();
  const isMobile = useIsMobile();

  const [stats, setStats]       = useState(null);
  const [onchain, setOnchain]   = useState(null);
  const [series, setSeries]     = useState(null);
  const [alertas, setAlertas]   = useState(null);
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

  // MC89.7 — pedidos NOVOS, em paralelo com os existentes. Ambos NÃO bloqueiam
  // os cards (admin-stats) nem o bloco on-chain.
  const carregarSeries = useCallback(async () => {
    if (!chamarAdmin) return;
    try {
      const resp = await chamarAdmin("/.netlify/functions/admin-series");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);
      setSeries(data);
    } catch { /* série indisponível → gráfico mostra "Sem dados" */ }
  }, [chamarAdmin]);

  const carregarAlertas = useCallback(async () => {
    if (!chamarAdmin) return;
    try {
      const resp = await chamarAdmin("/.netlify/functions/admin-alerts");
      const data = await resp.json();
      if (resp.ok) setAlertas(data.alerts || []);
    } catch { /* alertas indisponíveis → secção vazia */ }
  }, [chamarAdmin]);

  useEffect(() => {
    if (!chamarAdmin) return;
    carregar();
    carregarOnchain();
    carregarSeries();
    carregarAlertas();
  }, [chamarAdmin, carregar, carregarOnchain, carregarSeries, carregarAlertas]);

  if (!chamarAdmin) {
    return (
      <p style={{ color: COR.muted, fontSize: "0.85rem", margin: 0 }}>
        Autentique-se para ver as métricas.
      </p>
    );
  }

  const u = stats?.utilizadores;
  const f = stats?.financeiro;
  const c = stats?.cotas;
  const fila = stats?.operacao?.fila;

  // Alertas do backend + do frontend (EOA), unidos.
  const todosAlertas = [
    ...(alertas || []),
    ...alertasDoFrontend({ onchain }),
  ];

  // Rótulos das datas: "2026-07-24" → "24/07"
  const rotularDia = (iso) => {
    if (!iso) return "";
    const partes = iso.split("-");
    return `${partes[2] || ""}/${partes[1] || ""}`;
  };

  const corAlerta = (nivel) =>
    nivel === "critical" ? COR.danger : nivel === "warning" ? COR.warn : COR.muted;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.72rem", color: COR.muted }}>
          {stats?.geradoEm ? `Lido às ${new Date(stats.geradoEm).toLocaleTimeString("pt-BR")}` : ""}
          {stats?.cache === "hit" ? " · em cache" : ""}
        </span>
        <Button variant="ghost" size="sm" onClick={() => { carregar(); carregarOnchain(); carregarSeries(); carregarAlertas(); }} disabled={carregando}>
          {carregando ? "A ler…" : "↻ Atualizar"}
        </Button>
      </div>

      {erro && (
        <div style={{ padding: "0.7rem 0.9rem", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: `1px solid ${COR.danger}55`, color: COR.danger, fontSize: "0.82rem" }}>
          {erro}
        </div>
      )}

      {stats?.parciais?.length > 0 && (
        <div style={{ padding: "0.7rem 0.9rem", borderRadius: "8px", background: "rgba(251,191,36,0.08)", border: `1px solid ${COR.warn}55`, color: COR.warn, fontSize: "0.8rem" }}>
          Fontes indisponíveis neste momento: <strong>{stats.parciais.join(", ")}</strong>.
          Os números dessas áreas aparecem como "—", não como zero.
        </div>
      )}

      {/* ── MC89.7: ALERTAS ────────────────────────────────────────────────── */}
      {todosAlertas.length > 0 && (
        <section>
          <TituloSeccao>
            ALERTAS ({todosAlertas.length})
          </TituloSeccao>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {todosAlertas.map((a) => (
              <div key={a.id} style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "8px",
                background: `${corAlerta(a.nivel)}0f`,
                border: `1px solid ${corAlerta(a.nivel)}33`,
                fontSize: "0.78rem", color: COR.text,
                display: "flex", alignItems: "flex-start", gap: "0.45rem",
                lineHeight: 1.4,
              }}>
                <span style={{
                  display: "inline-block", width: "6px", height: "6px",
                  borderRadius: "50%", background: corAlerta(a.nivel),
                  marginTop: "0.4rem", flexShrink: 0,
                }} />
                <span style={{ flex: 1 }}>
                  {a.mensagem}
                  <span style={{ display: "block", marginTop: "0.15rem", fontSize: "0.66rem", color: COR.muted }}>
                    Fonte: {a.fonte}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MC89.24 — métricas críticas (EOA + fila) sobem para DEPOIS dos alertas,
          ANTES dos gráficos. São os números que o admin precisa de ver primeiro. */}
      <section>
        <TituloSeccao>
          CADEIA <span style={{ color: COR.muted, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>· carrega à parte</span>
        </TituloSeccao>
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
          <Metrica
            rotulo="Em trânsito"
            valor="—"
            nota="Rastreabilidade on-chain ainda não disponível."
          />
          <Metrica rotulo="Bloco atual" valor={ouTraco(onchain?.bloco, (v) => v.toLocaleString("pt-BR"))} />
        </Grelha>
      </section>

      <section>
        <TituloSeccao>OPERAÇÃO</TituloSeccao>
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

      {/* ── MC89.7: GRÁFICOS ───────────────────────────────────────────────── */}
      {series && series.dias && series.dias.length > 0 && (
        <section>
          <TituloSeccao>EVOLUÇÃO</TituloSeccao>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "0.85rem",
          }}>
            <div style={{
              padding: "0.75rem 0.85rem",
              background: "rgba(13,18,53,0.25)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
            }}>
              <GraficoLinha
                label="Receita PIX"
                valores={series.receitaCentavos}
                rotulos={series.dias.map(rotularDia)}
                cor={COR.success}
                formato={(v) => brl(v)}
              />
              <div style={{ marginTop: "0.35rem", fontSize: "0.62rem", color: COR.muted, textAlign: "center" }}>
                {series.totalCreditos !== null ? `${series.totalCreditos} créditos em ${series.totalDias} dia(s)` : ""}
              </div>
            </div>
            <div style={{
              padding: "0.75rem 0.85rem",
              background: "rgba(13,18,53,0.25)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
            }}>
              <GraficoLinha
                label="Utilizadores com atividade"
                valores={series.usuarios}
                rotulos={series.dias.map(rotularDia)}
                cor={COR.diamond}
                formato={(v) => String(v)}
              />
              <div style={{ marginTop: "0.35rem", fontSize: "0.62rem", color: COR.muted, textAlign: "center" }}>
                Quem apareceu nos dados nesse dia — não é "novos registos"
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Secções de detalhe — UTILIZADORES e FINANCEIRO. As métricas críticas
          (CADEIA, OPERAÇÃO) já estão no topo. */}
      <section>
        <TituloSeccao>UTILIZADORES</TituloSeccao>
        <Grelha isMobile={isMobile}>
          <Metrica
            rotulo="Com atividade"
            valor={ouTraco(u?.comAtividade)}
            cor={COR.diamond}
            nota="Endereços vistos nos nossos dados. NÃO é o total de registados — a identidade vive no Privy."
          />
          <Metrica rotulo="Com cota" valor={ouTraco(c?.comCarteira)} nota={c ? `${c.total} cota(s) no total` : null} />
          <Metrica
            rotulo="Ativos em 24 h"
            valor={ouTraco(series?.usuarios?.length ? series.usuarios[series.usuarios.length - 1] : null)}
            nota="Endereços distintos com atividade no dia mais recente com dados."
          />
        </Grelha>
      </section>

      <section>
        <TituloSeccao>FINANCEIRO</TituloSeccao>
        <Grelha isMobile={isMobile}>
          <Metrica rotulo="Saldo em circulação" valor={ouTraco(f?.saldoTotalCentavos, brl)} cor={COR.success} />
          <Metrica rotulo="Já creditado" valor={ouTraco(f?.creditadoCentavos, brl)} nota={f ? `${f.creditos} crédito(s)` : null} />
          <Metrica
            rotulo={`Créditos (${stats?.janelaDias ?? 30} d)`}
            valor={ouTraco(f?.creditosJanela)}
          />
        </Grelha>
      </section>
    </div>
  );
}
