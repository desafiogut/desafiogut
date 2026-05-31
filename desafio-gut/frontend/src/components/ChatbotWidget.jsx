// ChatbotWidget — IA Cognitiva 24/7 RAG (Mega Comando 9 / Item 3).
//
// Botão flutuante no canto inferior direito (com pulse sutil). Ao clicar,
// abre um painel com histórico de chat persistido em `localStorage.gut_chat_history`.
// Envia POST /chatbot com { pergunta } e exibe a resposta.
//
// O chatbot consome o endpoint /.netlify/functions/chatbot que faz RAG sobre
// o regulamento (top-3 chunks via cosine similarity → DeepSeek V4 Flash).
// O ChatbotWidget é montado uma única vez em App.jsx, fica disponível em
// todas as rotas e preserva o histórico em gut_chat_history (localStorage).
//
// Aderente ao design system do projeto (inline-style + Framer Motion).
// Mobile-friendly: vira fullscreen quando largura ≤ 540px.
//
// MC14.2 — Estados visuais interativos do GUTO:
//   idle = acolhedor | listening = curioso | thinking = pensativo
//   responding = feliz | celebrating = orgulhoso

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useIsMobile } from "../hooks/useIsMobile.js";
import GutoAvatar from "./GutoAvatar.jsx";
import { useAppContext } from "../context/AppContext.jsx";
import { useAdmin } from "../hooks/useAdmin.js";

const LS_KEY      = "gut_chat_history";
const LS_MAX_MSGS = 40;            // histórico bounded — evita estourar localStorage
const PERGUNTA_MAX = 500;

const COR = {
  primary:    "#00d4aa",
  primaryDim: "rgba(0,212,170,0.15)",
  bg:         "#0a102a",
  bgLight:    "rgba(10,16,42,0.92)",
  border:     "rgba(0,212,170,0.32)",
  text:       "#e8f0fe",
  muted:      "#94a3b8",
  bubbleUser: "linear-gradient(135deg,#00d4aa,#0aa37e)",
  bubbleBot:  "rgba(255,255,255,0.05)",
  danger:     "#ef4444",
};

// MC15.6 ITEM 4/11 — paleta dos cards por tipo:
// wizard=azul, notificação=amarelo, pulso=verde, panic=vermelho.
const CARD_CORES = {
  wizard:      { titulo: "Assistente de Edição", bg: "rgba(59,130,246,0.12)", borda: "rgba(59,130,246,0.45)", barra: "#60a5fa" },
  notificacao: { titulo: "Notificação",          bg: "rgba(245,166,35,0.12)", borda: "rgba(245,166,35,0.45)", barra: "#f5a623" },
  pulso:       { titulo: "Pulso da Edição",      bg: "rgba(0,200,83,0.12)",   borda: "rgba(0,200,83,0.45)",  barra: "#00c853" },
  panic:       { titulo: "Alerta do Sistema",    bg: "rgba(239,68,68,0.14)",  borda: "rgba(239,68,68,0.5)",  barra: "#ef4444" },
  // MC15.7 — cards do PARTICIPANTE.
  lance_unico:          { titulo: "🎯 Lance único!",         bg: "rgba(0,200,83,0.12)",   borda: "rgba(0,200,83,0.45)",  barra: "#00c853" },
  perdeu_exclusividade: { titulo: "⚠️ Perdeste exclusividade", bg: "rgba(249,115,22,0.12)", borda: "rgba(249,115,22,0.45)", barra: "#f97316" },
  voce_venceu:          { titulo: "🏆 Ganhaste!",            bg: "rgba(0,200,83,0.14)",   borda: "rgba(0,200,83,0.5)",   barra: "#00c853" },
  resumo_edicao:        { titulo: "🏁 Edição encerrada",     bg: "rgba(59,130,246,0.12)", borda: "rgba(59,130,246,0.45)", barra: "#60a5fa" },
  default:     { titulo: "GUTO",                 bg: "rgba(0,212,170,0.10)",  borda: "rgba(0,212,170,0.4)",  barra: "#00d4aa" },
};

// MC15.6 ITEM 11 / MC15.7 — mapeia o tipo de evento de /notificacoes para a cor.
const NOTIF_CARD_KIND = {
  // Sistema (admin) — MC15.6.
  sistema_pausado:  "panic",
  tempo_limite_5min: "notificacao",
  edicao_encerrada:  "resumo_edicao",
  lance_invalido:    "notificacao",
  // Participante — MC15.7.
  lance_unico:          "lance_unico",
  perdeu_exclusividade: "perdeu_exclusividade",
  voce_venceu:          "voce_venceu",
};

const GUTO_STATE_MAP = {
  idle:        "sorrindo",
  listening:   "curioso",
  thinking:    "pensativo",
  responding:  "feliz",
  celebrating: "orgulhoso",
};

function carregarHistorico() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(-LS_MAX_MSGS) : [];
  } catch { return []; }
}

function salvarHistorico(hist) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(hist.slice(-LS_MAX_MSGS))); }
  catch (err) { console.warn("[ChatbotWidget] salvar localStorage falhou:", err?.message); }
}

export default function ChatbotWidget() {
  const isMobile = useIsMobile();
  // MC15.4.2 — token de user-session p/ o GUTO autenticar comandos de admin
  // (criar/listar/encerrar edição). Para visitantes deslogados é null → o
  // backend recusa intents de admin (comportamento correto).
  const {
    authToken, tipoUsuario, address, systemPausado,
    notificacoes, notificacoesNaoLidas, marcarNotificacoesLidas,
  } = useAppContext();
  const { isAdmin } = useAdmin(address);
  // MC15.5 — badge de perfil no cabeçalho (cosmético; o backend é a fonte de
  // verdade do perfil — R4). visitante: sem badge; comum: ●; lojista/admin: rótulo.
  const perfilBadge =
    isAdmin ? { txt: "⚡ Admin", cor: "#f5a623" }
    : tipoUsuario === "corporativo" ? { txt: "◈ Lojista", cor: "#00d4aa" }
    : (authToken || address) ? { txt: "●", cor: "#00c853" }
    : null;
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState(() => carregarHistorico());
  const [pergunta, setPergunta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [gutoState, setGutoState] = useState("idle");
  const scrollRef = useRef(null);
  const idleTimerRef = useRef(null);
  // MC15.6 ITEM 11 — assinaturas de notificações já injetadas como card (evita
  // duplicar a cada poll). seedRef: na 1ª leitura, marca o backlog como visto
  // SEM despejar cards — só eventos que surgem DURANTE a sessão viram card.
  const notifInjetadasRef = useRef(new Set());
  const notifSeedRef = useRef(false);

  useEffect(() => { salvarHistorico(mensagens); }, [mensagens]);

  // MC15.6 ITEM 11 / MC15.7 ITEM 5 — injeta notificações como cards no chat, sem
  // mexer no campo de texto (não interrompe a digitação — `pergunta` fica intacto).
  // Dedupe por id (participante) ou tipo:timestamp (eventos de sistema/admin).
  // Seed: na 1ª leitura suprime o backlog de EVENTOS DE SISTEMA (admin, sem
  // campo `lida`) e de participante JÁ LIDAS; mas o backlog NÃO-LIDO do
  // participante (lida===false) é injetado como card (MC15.7: abrir → ver cards).
  useEffect(() => {
    const lista = Array.isArray(notificacoes) ? notificacoes : [];
    const sigOf = (n) => (n.id ? `id:${n.id}` : `${n.tipo}:${n.timestamp}`);
    if (!notifSeedRef.current) {
      notifSeedRef.current = true;
      for (const n of lista) {
        const participanteNaoLida = typeof n.lida === "boolean" && n.lida === false;
        if (!participanteNaoLida) notifInjetadasRef.current.add(sigOf(n));
      }
      // NÃO retorna: deixa cair para injetar o backlog não-lido do participante.
    }
    const novas = lista.filter((n) => !notifInjetadasRef.current.has(sigOf(n)));
    if (novas.length === 0) return;
    for (const n of novas) notifInjetadasRef.current.add(sigOf(n));
    setMensagens((prev) => [
      ...prev,
      ...novas.map((n) => ({
        role: "bot",
        type: "card",
        cardKind: NOTIF_CARD_KIND[n.tipo] || "notificacao",
        texto: n.mensagem || "Notificação do sistema.",
        em: Date.now(),
      })),
    ]);
  }, [notificacoes]);

  // MC15.6 ITEM 11 — ao abrir o chat, zera o badge de não lidas.
  useEffect(() => {
    if (aberto) marcarNotificacoesLidas?.();
  }, [aberto, marcarNotificacoesLidas]);

  // Auto-scroll para a última mensagem sempre que algo entra.
  useEffect(() => {
    if (!aberto) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [aberto, mensagens, carregando]);

  // Reset GUTO to idle when chat is closed.
  useEffect(() => {
    if (!aberto) setGutoState("idle");
  }, [aberto]);

  // Cleanup idle timer on unmount.
  useEffect(() => {
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, []);

  const resetToIdle = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setGutoState("idle"), 4000);
  }, []);

  // MC15.6 ITEM 4 — enviarMensagem(texto) é o core (reutilizado pelos botões de
  // resposta rápida do wizard). enviar() envia o conteúdo da caixa de texto.
  const enviarMensagem = useCallback(async (textoArg) => {
    const texto = String(textoArg ?? "").trim();
    if (!texto || carregando) return;
    if (texto.length > PERGUNTA_MAX) {
      setErro(`Máximo ${PERGUNTA_MAX} caracteres.`);
      return;
    }
    setErro("");
    setMensagens((prev) => [...prev, { role: "user", texto, em: Date.now() }]);
    setPergunta("");
    setCarregando(true);

    // GUTO state transitions: listening → thinking → responding → idle
    setGutoState("listening");
    setTimeout(() => setGutoState("thinking"), 600);

    try {
      const resp = await fetch("/.netlify/functions/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ pergunta: texto }),
      });
      if (resp.status === 503) {
        setGutoState("responding");
        resetToIdle();
        setMensagens((prev) => [...prev, {
          role: "bot",
          texto: "O assistente está temporariamente indisponível. Tente novamente em alguns minutos.",
          em: Date.now(),
        }]);
        return;
      }
      if (resp.status === 429) {
        setGutoState("responding");
        resetToIdle();
        setMensagens((prev) => [...prev, {
          role: "bot",
          texto: "Muitas perguntas em pouco tempo. Aguarde 1 minuto e tente novamente.",
          em: Date.now(),
        }]);
        return;
      }
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error?.message || `HTTP ${resp.status}`);
      }
      setGutoState("responding");
      resetToIdle();
      // MC15.6 ITEM 4 — se a resposta traz estado de wizard, renderiza um CARD
      // (passo, resumo e botões de resposta rápida). Caso contrário, texto normal.
      const wiz = data.wizard || null;
      setMensagens((prev) => [...prev, {
        role: "bot",
        texto: data.resposta || "(resposta vazia)",
        fontes: data.fontes || [],
        ...(wiz ? {
          type: "card",
          cardKind: "wizard",
          passo: wiz.passo || null,
          resumo: wiz.resumo || null,
          buttons: Array.isArray(wiz.opcoes) ? wiz.opcoes : null,
          concluido: !!wiz.concluido,
        } : {}),
        em: Date.now(),
      }]);
    } catch (err) {
      console.warn("[ChatbotWidget] falha ao consultar /chatbot:", err?.message);
      setGutoState("responding");
      resetToIdle();
      setMensagens((prev) => [...prev, {
        role: "bot",
        texto: "Desculpe, não foi possível responder agora. Tente novamente em instantes.",
        em: Date.now(),
      }]);
    } finally {
      setCarregando(false);
    }
  }, [carregando, resetToIdle, authToken]);

  const enviar = useCallback(() => enviarMensagem(pergunta), [enviarMensagem, pergunta]);

  const limparHistorico = useCallback(() => {
    setMensagens([]);
    try { localStorage.removeItem(LS_KEY); } catch {}
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  const gutoExpression = GUTO_STATE_MAP[gutoState] || GUTO_STATE_MAP.idle;

  // Dimensões do modal — fullscreen em mobile.
  const tamanhoModal = useMemo(() => isMobile
    ? { width: "100vw", height: "100dvh", right: 0, bottom: 0, borderRadius: 0 }
    : { width: "400px", height: "500px", right: "1.5rem", bottom: "5rem", borderRadius: "16px" },
    [isMobile]
  );

  return (
    <>
      {/* MC15.6 ITEM 8 — banner global de modo pânico (kill switch ativo). */}
      {systemPausado && (
        <div role="alert" style={{
          position: "fixed", top: 0, left: 0, right: 0,
          zIndex: 10000,
          background: "#ef4444", color: "#fff",
          padding: "0.5rem 1rem", textAlign: "center",
          fontSize: "0.85rem", fontWeight: 800,
          letterSpacing: "0.02em",
          boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
        }}>
          SISTEMA PAUSADO — novos lances estão temporariamente bloqueados.
        </div>
      )}

      {/* Botão flutuante */}
      <motion.button
        aria-label={aberto ? "Fechar assistente" : "Abrir assistente DESAFIOGUT"}
        onClick={() => setAberto((v) => !v)}
        animate={aberto ? { scale: 1 } : { scale: [1, 1.06, 1] }}
        transition={aberto ? { duration: 0.15 } : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "fixed",
          right: "1.25rem",
          bottom: isMobile ? "5rem" : "1.25rem",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: aberto && gutoState !== "thinking" ? COR.bubbleUser : "transparent",
          color: "#04080f",
          fontSize: "1.4rem",
          fontWeight: 900,
          boxShadow: aberto && gutoState !== "thinking" ? "0 6px 20px rgba(0,212,170,0.45)" : "none",
          zIndex: 9998,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {aberto
          ? (gutoState === "thinking"
            ? <img src="/assets/guto/custom/guto-chat.png" alt="GUTO pensando" width={28} height={28} style={{ borderRadius: "50%" }} />
            : "✕")
          : <img src="/assets/guto/custom/guto-chat.png" alt="GUTO confiante" width={56} height={56} style={{ borderRadius: "50%" }} />}
      </motion.button>

      {/* MC15.6 ITEM 11 — badge de notificações não lidas (chat fechado). */}
      {!aberto && notificacoesNaoLidas > 0 && (
        <span aria-label={`${notificacoesNaoLidas} notificações`} style={{
          position: "fixed",
          right: "1rem",
          bottom: isMobile ? "7.6rem" : "3.85rem",
          minWidth: "20px", height: "20px",
          padding: "0 5px",
          borderRadius: "10px",
          background: "#ef4444", color: "#fff",
          fontSize: "0.7rem", fontWeight: 900,
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, pointerEvents: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}>
          🔔 {notificacoesNaoLidas}
        </span>
      )}

      {/* Modal de chat */}
      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-label="Assistente DESAFIOGUT"
            style={{
              position: "fixed",
              ...tamanhoModal,
              background: COR.bgLight,
              border: `1px solid ${COR.border}`,
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              color: COR.text,
              boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "0.75rem 1rem",
              borderBottom: `1px solid ${COR.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              gap: "0.5rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <GutoAvatar
                  variant="expressao"
                  expression={gutoExpression}
                  size={36}
                  animate={gutoState !== "idle"}
                />
                <div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: COR.primary }}>
                    GUTO — Assistente DESAFIOGUT
                    {perfilBadge && (
                      <span style={{
                        marginLeft: "0.45rem",
                        fontSize: "0.62rem",
                        fontWeight: 900,
                        color: perfilBadge.cor,
                        border: `1px solid ${perfilBadge.cor}`,
                        borderRadius: "4px",
                        padding: "0.05rem 0.3rem",
                        verticalAlign: "middle",
                        whiteSpace: "nowrap",
                      }}>{perfilBadge.txt}</span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: COR.muted }}>
                    {gutoState === "thinking" && "A pensar…"}
                    {gutoState === "listening" && "A ouvir…"}
                    {gutoState === "responding" && "A responder…"}
                    {gutoState === "celebrating" && "A celebrar!"}
                    {gutoState === "idle" && "Responde com base no regulamento oficial."}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button onClick={limparHistorico} title="Limpar conversa"
                  style={{
                    background: "transparent", color: COR.muted, border: "none",
                    cursor: "pointer", fontSize: "0.75rem", padding: "0.25rem 0.5rem",
                  }}>
                  Limpar
                </button>
                <button onClick={() => setAberto(false)} aria-label="Fechar"
                  style={{
                    background: "transparent", color: COR.text, border: "none",
                    cursor: "pointer", fontSize: "1.1rem", padding: "0.25rem 0.5rem",
                  }}>
                  ✕
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div ref={scrollRef} style={{
              flex: 1, overflowY: "auto", padding: "1rem",
              display: "flex", flexDirection: "column", gap: "0.6rem",
            }}>
              {mensagens.length === 0 && (
                <div style={{ color: COR.muted, fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>
                  Pergunte sobre regras, cotas, pagamentos, vouchers ou o sistema "Indique e Ganhe".
                </div>
              )}
              {mensagens.map((m, i) => {
                const ehUltima = i === mensagens.length - 1;
                // MC15.6 ITEM 4 — mensagem tipo "card" (wizard). Botões de
                // resposta rápida só na ÚLTIMA mensagem (passos antigos ficam
                // estáticos, evitando reenvio acidental).
                if (m.type === "card") {
                  const cor = CARD_CORES[m.cardKind] || CARD_CORES.default;
                  return (
                    <div key={i} style={{ alignSelf: "flex-start", maxWidth: "92%", width: "92%" }}>
                      <div style={{
                        borderRadius: "14px",
                        background: cor.bg,
                        border: `1px solid ${cor.borda}`,
                        overflow: "hidden",
                      }}>
                        <div style={{
                          padding: "0.4rem 0.7rem",
                          background: cor.barra,
                          color: "#04080f",
                          fontSize: "0.68rem",
                          fontWeight: 900,
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                          <span>{cor.titulo}</span>
                          {m.passo && <span>Passo {m.passo}</span>}
                        </div>
                        <div style={{
                          padding: "0.6rem 0.8rem",
                          color: COR.text,
                          fontSize: "0.84rem",
                          lineHeight: 1.45,
                          whiteSpace: "pre-wrap", wordBreak: "break-word",
                        }}>
                          {m.texto}
                          {m.resumo && (
                            <div style={{
                              marginTop: "0.5rem", padding: "0.5rem 0.6rem",
                              background: "rgba(0,0,0,0.25)", borderRadius: "8px",
                              fontSize: "0.78rem", lineHeight: 1.5,
                            }}>
                              <div><b>Produto:</b> {m.resumo.produto}</div>
                              <div><b>Tipo:</b> {m.resumo.tipo} · <b>Duração:</b> {m.resumo.duracaoMin} min</div>
                              <div><b>Base:</b> {m.resumo.valorBase} · <b>Incremento:</b> {m.resumo.incremento}</div>
                            </div>
                          )}
                        </div>
                        {ehUltima && !carregando && Array.isArray(m.buttons) && m.buttons.length > 0 && (
                          <div style={{
                            display: "flex", flexWrap: "wrap", gap: "0.4rem",
                            padding: "0 0.8rem 0.7rem",
                          }}>
                            {m.buttons.map((label, bi) => {
                              const principal = /publicar/i.test(label);
                              const cancelar = /cancelar/i.test(label);
                              return (
                                <button key={bi}
                                  onClick={() => enviarMensagem(label)}
                                  style={{
                                    padding: "0.45rem 0.75rem",
                                    borderRadius: "9px",
                                    border: cancelar ? `1px solid ${COR.muted}` : "none",
                                    background: principal ? COR.primary : cancelar ? "transparent" : cor.barra,
                                    color: cancelar ? COR.muted : "#04080f",
                                    fontSize: "0.78rem", fontWeight: 800, cursor: "pointer",
                                  }}>
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={i} style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                  }}>
                    <div style={{
                      padding: "0.55rem 0.85rem",
                      borderRadius: "14px",
                      background: m.role === "user" ? COR.bubbleUser : COR.bubbleBot,
                      color: m.role === "user" ? "#04080f" : COR.text,
                      fontSize: "0.86rem",
                      lineHeight: 1.45,
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                      border: m.role === "bot" ? `1px solid ${COR.border}` : "none",
                      fontWeight: m.role === "user" ? 700 : 400,
                    }}>
                      {m.texto}
                    </div>
                    {m.fontes && m.fontes.length > 0 && (
                      <div style={{ fontSize: "0.62rem", color: COR.muted, marginTop: "0.2rem", paddingLeft: "0.5rem" }}>
                        fontes: {m.fontes.map((f) => f.id).join(", ")}
                      </div>
                    )}
                  </div>
                );
              })}
              {carregando && (
                <div style={{ alignSelf: "flex-start", maxWidth: "85%" }}>
                  <div style={{
                    padding: "0.55rem 0.85rem",
                    borderRadius: "14px",
                    background: COR.bubbleBot,
                    border: `1px solid ${COR.border}`,
                    display: "inline-flex", gap: "0.3rem", alignItems: "center",
                  }}>
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                        style={{
                          width: "6px", height: "6px", borderRadius: "50%",
                          background: COR.primary, display: "inline-block",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{
              padding: "0.6rem 0.75rem",
              borderTop: `1px solid ${COR.border}`,
              display: "flex", gap: "0.4rem", alignItems: "flex-end",
            }}>
              <textarea
                value={pergunta}
                onChange={(e) => { setPergunta(e.target.value); setErro(""); }}
                onKeyDown={onKeyDown}
                placeholder="Sua pergunta… (Enter envia, Shift+Enter quebra linha)"
                rows={1}
                maxLength={PERGUNTA_MAX + 50}
                style={{
                  flex: 1,
                  padding: "0.55rem 0.7rem",
                  background: "rgba(3,15,36,0.6)",
                  color: COR.text,
                  border: `1px solid ${COR.border}`,
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  resize: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.4,
                  maxHeight: "100px",
                  outline: "none",
                }}
              />
              <button
                onClick={enviar}
                disabled={carregando || !pergunta.trim()}
                aria-label="Enviar pergunta"
                style={{
                  padding: "0.55rem 0.85rem",
                  borderRadius: "10px",
                  background: (carregando || !pergunta.trim()) ? "rgba(0,212,170,0.25)" : COR.bubbleUser,
                  color: "#04080f",
                  border: "none",
                  fontSize: "1rem",
                  fontWeight: 900,
                  cursor: (carregando || !pergunta.trim()) ? "not-allowed" : "pointer",
                }}
              >
                ➤
              </button>
            </div>
            {erro && (
              <div style={{ padding: "0 0.75rem 0.6rem", fontSize: "0.7rem", color: COR.danger }}>
                {erro}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
