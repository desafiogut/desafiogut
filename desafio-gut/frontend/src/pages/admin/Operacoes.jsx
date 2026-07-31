// Operações e Infraestrutura — Tela 4 do plano do MC89.5.
//
// MC89.12 (Fase 3). Três secções: status do sistema, fila de tarefas, e
// comandos operacionais. Cada comando com confirmação, justificativa e
// registo de auditoria fail-CLOSED (MC89.11).

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { Button, Input } from "../../components/ui";
import StatusCard from "../../components/admin/StatusCard.jsx";
import ComandoButton from "../../components/admin/ComandoButton.jsx";
import { COR, ouTraco } from "./_ui.jsx";

// ── Formatação ──────────────────────────────────────────────────────────────

function msOuNada(ms) { return ms !== undefined && ms !== null ? `${ms} ms` : ""; }

function rotuloBloco(n) { return n ? n.toLocaleString("pt-BR") : "—"; }

function quando(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

// ── Comandos disponíveis ────────────────────────────────────────────────────
// Cada entrada: o que mostra, que nível mínimo exige, e que ação envia para o
// endpoint admin-commands.

const COMANDOS = [
  {
    acao: "forcar_fila", label: "Forçar processamento da fila",
    descricao: "Dispara o processador de tarefas imediatamente. As tarefas pendentes são consumidas por ordem de chegada.",
    nivelMinimo: "admin",
  },
  {
    acao: "executar_monitor", label: "Executar monitor on-chain",
    descricao: "Dispara uma execução do monitor de eventos on-chain agora. Normalmente corre a cada 30 min.",
    nivelMinimo: "admin",
  },
  {
    acao: "limpar_cache", label: "Limpar cache do painel",
    descricao: "Invalida o cache de admin-stats, admin-series e admin-alerts. Sem Redis configurado, é no-op.",
    nivelMinimo: "admin",
  },
];

const COMANDOS_CRITICOS = [
  {
    acao: "panic", label: "Pausar sistema (kill switch)",
    descricao: "Desativa o processamento de novas operações. O sistema continua a responder a leituras.",
    nivelMinimo: "super-admin",
  },
  {
    acao: "unpause", label: "Reativar sistema",
    descricao: "Reativa o sistema após uma pausa. Todas as operações voltam ao normal.",
    nivelMinimo: "super-admin",
  },
];

export default function Operacoes() {
  const { chamarAdmin } = useAdminAuth();
  const isMobile = useIsMobile();

  const [sondas, setSondas] = useState(null);
  const [fila, setFila] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    if (!chamarAdmin) return;
    setCarregando(true);
    setErro("");
    try {
      const [rStatus, rFila] = await Promise.all([
        chamarAdmin("/.netlify/functions/admin-status"),
        chamarAdmin("/.netlify/functions/admin-queue"),
      ]);
      const [dStatus, dFila] = await Promise.all([
        rStatus.json().catch(() => null),
        rFila.json().catch(() => null),
      ]);
      if (!rStatus.ok) throw new Error(dStatus?.error?.message || `HTTP ${rStatus.status}`);
      setSondas(dStatus.sondas || null);
      setFila(dFila);
    } catch (err) {
      setErro(err?.message || "falha");
    } finally {
      setCarregando(false);
    }
  }, [chamarAdmin]);

  useEffect(() => { carregar(); }, [carregar]);

  async function executarComando(acao, justificativa) {
    const resp = await chamarAdmin("/.netlify/functions/admin-commands", {
      method: "POST",
      body: JSON.stringify({ acao, justificativa }),
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);
    // Recarrega a fila depois de um comando (pode ter mudado)
    setCarregando(true);
    try {
      const rFila = await chamarAdmin("/.netlify/functions/admin-queue");
      const dFila = await rFila.json().catch(() => null);
      setFila(dFila);
    } catch { /* fila pode estar indisponível após o comando */ }
    setCarregando(false);
    return data;
  }

  if (!chamarAdmin) {
    return <p style={{ color: COR.muted, fontSize: "0.85rem" }}>Autentique-se para ver as operações.</p>;
  }

  // Nível do admin para os botões de super-admin
  const nivelAdmin = "admin"; // TODO: ler do JWT via AdminAuthContext (MC89.11)
  // Por agora: a UI mostra aviso mas o backend recusa se nível insuficiente.

  const s = sondas || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.72rem", color: COR.muted }}>
          {sondas?.geradoEm ? `Sondado às ${new Date(sondas.geradoEm).toLocaleTimeString("pt-BR")}` : ""}
        </span>
        <Button variant="ghost" size="sm" onClick={carregar} disabled={carregando}>
          {carregando ? "A sondar…" : "↻ Atualizar"}
        </Button>
      </div>

      {erro && (
        <div style={{ padding: "0.6rem 0.8rem", borderRadius: "8px", background: "rgba(239,68,68,0.06)", border: `1px solid ${COR.danger}44`, color: COR.danger, fontSize: "0.78rem" }}>{erro}</div>
      )}

      {/* ── STATUS DO SISTEMA ────────────────────────────────────────────── */}
      <section>
        <h3 style={{ fontSize: "0.78rem", color: COR.primary, margin: "0 0 0.5rem", letterSpacing: "0.05em" }}>ESTADO DO SISTEMA</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(210px, 1fr))",
          gap: "0.5rem",
        }}>
          <StatusCard
            rotulo="Backend"
            ok={s.backend?.ok ?? null}
            detalhe="Função admin-status respondeu"
          />
          <StatusCard
            rotulo="Supabase"
            ok={s.supabase?.ok ?? null}
            detalhe={s.supabase ? `${msOuNada(s.supabase.ms)}${s.supabase.erro ? ` · ${s.supabase.erro}` : ""}` : "—"}
          />
          <StatusCard
            rotulo="RPC (Alchemy)"
            ok={s.rpc?.ok ?? null}
            detalhe={s.rpc ? `Bloco ${rotuloBloco(s.rpc.bloco)} · ${msOuNada(s.rpc.ms)}` : "—"}
            nota={s.rpc?.erro || undefined}
          />
          <StatusCard
            rotulo="Webhook MP"
            ok={s.webhook?.ok === true ? "warning" : s.webhook?.ok === false ? "error" : "unknown"}
            detalhe={s.webhook?.ultimoEm ? `Último: ${quando(s.webhook.ultimoEm)}` : "Nenhum registo"}
            nota={!s.webhook?.ultimoEm ? "Zero créditos com fonte=webhook em toda a história" : undefined}
          />
          <StatusCard
            rotulo="Netlify Blobs"
            ok={s.blobs?.configurado ? true : "warning"}
            detalhe={s.blobs?.configurado ? "BLOBS_TOKEN definido" : "BLOBS_TOKEN ausente"}
            nota={!s.blobs?.configurado ? "Leituras de Blob são no-op silenciosas — monitor e IA preditiva podem não atualizar" : undefined}
          />
          <StatusCard
            rotulo="Cache Redis"
            ok={s.cache?.configurado ? true : "warning"}
            detalhe={s.cache?.configurado ? "REDIS_URL definido" : "REDIS_URL ausente"}
            nota={!s.cache?.configurado ? "Cache é no-op — consultas vão sempre à fonte" : undefined}
          />
        </div>
      </section>

      {/* ── FILA DE TAREFAS ──────────────────────────────────────────────── */}
      <section>
        <h3 style={{ fontSize: "0.78rem", color: COR.primary, margin: "0 0 0.5rem", letterSpacing: "0.05em" }}>FILA DE TAREFAS</h3>
        {fila?.erro ? (
          <p style={{ color: COR.danger, fontSize: "0.78rem" }}>{fila.erro}</p>
        ) : (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
              gap: "0.4rem", marginBottom: "0.65rem",
            }}>
              {[
                { r: "Pendentes", v: fila?.pendentes, c: fila?.pendentes > 0 ? COR.warn : COR.success },
                { r: "Concluídas", v: fila?.concluidas, c: COR.success },
                { r: "Falhas", v: fila?.falhas, c: fila?.falhas > 0 ? COR.danger : COR.muted },
                { r: "Total", v: fila?.total, c: COR.text },
              ].map((m) => (
                <div key={m.r} style={{
                  padding: "0.5rem 0.65rem", background: "rgba(255,255,255,0.02)",
                  border: `1px solid rgba(255,255,255,0.08)`, borderRadius: "8px",
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                }}>
                  <span style={{ fontSize: "0.7rem", color: COR.muted }}>{m.r}</span>
                  <strong style={{ fontSize: "1.05rem", color: m.c, fontWeight: 800 }}>
                    {ouTraco(m.v)}
                  </strong>
                </div>
              ))}
            </div>
            {fila?.linhas?.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
                    <th style={{ textAlign: "left", padding: "0.3rem 0.4rem", color: COR.muted, fontWeight: 600 }}>Tipo</th>
                    <th style={{ textAlign: "left", padding: "0.3rem 0.4rem", color: COR.muted, fontWeight: 600 }}>Estado</th>
                    <th style={{ textAlign: "left", padding: "0.3rem 0.4rem", color: COR.muted, fontWeight: 600 }}>Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {fila.linhas.map((t) => (
                    <tr key={t.id || t.criado_em} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                      <td style={{ padding: "0.3rem 0.4rem", color: COR.text }}>{t.tipo || "—"}</td>
                      <td style={{ padding: "0.3rem 0.4rem", color: t.status === "done" ? COR.success : t.status === "failed" ? COR.danger : COR.warn }}>
                        {t.status || "—"}
                      </td>
                      <td style={{ padding: "0.3rem 0.4rem", color: COR.muted }}>{quando(t.atualizado_em)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!fila?.linhas?.length && (
              <p style={{ color: COR.muted, fontSize: "0.78rem", fontStyle: "italic" }}>Fila vazia.</p>
            )}
          </>
        )}
      </section>

      {/* ── COMANDOS ─────────────────────────────────────────────────────── */}
      <section>
        <h3 style={{ fontSize: "0.78rem", color: COR.primary, margin: "0 0 0.5rem", letterSpacing: "0.05em" }}>COMANDOS</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {COMANDOS.map((c) => (
            <ComandoButton
              key={c.acao}
              {...c}
              nivelAdmin={nivelAdmin}
              onExecutar={executarComando}
            />
          ))}
        </div>
      </section>

      {/* ── COMANDOS CRÍTICOS ────────────────────────────────────────────── */}
      {nivelAdmin === "super-admin" && (
        <section>
          <h3 style={{
            fontSize: "0.78rem", color: COR.danger, margin: "0 0 0.5rem",
            letterSpacing: "0.05em",
          }}>
            COMANDOS CRÍTICOS (super-admin)
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {COMANDOS_CRITICOS.map((c) => (
              <ComandoButton
                key={c.acao}
                {...c}
                nivelAdmin={nivelAdmin}
                onExecutar={executarComando}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
