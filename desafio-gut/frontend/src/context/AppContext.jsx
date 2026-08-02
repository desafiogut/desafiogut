import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  subscribeLanceDado,
  getSaldoSenhasOnChain,
  subscribeSaldoSenhas,
  getEdicaoPrazo,
  getSignerFromProvider,
} from "../utils/web3.js";
import {
  checkJwtFailures,
  checkRateLimit,
  checkBurstCompras,
  checkGeoAnomaly,
} from "../lib/sentry-alerts.js";
import { getVisitorId, getCachedVisitorId } from "../lib/fingerprint.js";
import { useEdicoes } from "../hooks/useEdicoes.js";
import {
  trackPageview,
  trackClickComprar,
  trackTempoSessao,
  trackScroll,
} from "../lib/analytics.js";
import {
  LS_PRAZO_FLASH,
  LS_PRAZO_PROG,
  lerPrazoStorage,
  gravarPrazoStorage,
} from "../lib/leilaoTimer.js";
import { apiGet, apiPost } from "../lib/api.js";
import {
  enderecoSessaoSincrono,
  adminProvavel as lerAdminProvavel,
  // MC89.36 — o palpite do lojista mudou-se para aqui, para ficar ao lado do do
  // ADM e com o mesmo ciclo de vida. Ver o cabeçalho de `CHAVE_LOJISTA`.
  lojistaProvavel as lerLojistaProvavel,
  gravarDicaLojista,
} from "../lib/dicaSessao.js";

// Persistência do prazoTimestamp (Onda 5 FASE 0): o timer é IMUNE a refresh
// porque cada tipo de leilão guarda seu próprio prazo no localStorage. Cálculo
// é sempre absoluto (`prazo - now`) — o setInterval só re-renderiza.
// MC39.22.1 (EX-7): helpers puros extraídos para ../lib/leilaoTimer.js (sem
// alteração de comportamento). A máquina de estado do timer permanece aqui.

// ─── Constantes ──────────────────────────────────────────────────────────────
export const EDICAO_ATIVA = "R-1";

// Duração das rodadas — aderente à Especificação Refatorada (Junho/2026):
// - Relâmpago (Bronze/Prata): 30 min a 1 h (1800-3600s), configurável via
//   VITE_DURACAO_FLASH_SECONDS. Valores fora do intervalo caem no fallback 1800.
// - Programado (Ouro/Diamante): 86400s = 24 h, reset diário às 00:00.
const FLASH_MIN = 1800;
const FLASH_MAX = 3600;
function lerDuracaoFlash() {
  const raw = Number(import.meta.env?.VITE_DURACAO_FLASH_SECONDS);
  if (!Number.isFinite(raw) || raw < FLASH_MIN || raw > FLASH_MAX) return FLASH_MIN;
  return Math.floor(raw);
}
export const DURACAO = {
  flash:      lerDuracaoFlash(),
  programado: 86400,
};

// Chaves legadas em localStorage criadas por versões anteriores com MOCK_MODE.
// Removidas uma única vez via reset versionado para não vazar dados fake.
const LS_RESET_KEY        = "gut_reset_v";
const LS_RESET_VERSION    = "2026-05-11-v2";
const LS_KEYS_LEGADO_MOCK = [
  "gut_lances_r1",
  "lances",
  "LS_LANCES",
  "gut_carteira_flash",
  "gut_fichas_programadas",
  "carteiraFlash",
  "fichasProgramadas",
];

// MC88.34 (P0) — cache do último saldo conhecido, para pintar o Dashboard sem
// esperar pela cadeia serial de autenticação (ver bloco "SALDO OTIMISTA").
// Guarda SEMPRE o endereço a que os valores pertencem, para que a guarda de
// coerência possa descartá-los se a sessão for outra.
// MC89.40 (F2) — os quatro níveis de cota. O backend tem a fonte única em
// `_lib/cota-ativacao.mjs`, que não é importável daqui (vive nas funções
// Netlify). Duplicar uma lista é sempre um risco de divergência, por isso há um
// teste a comparar as duas e a rebentar se alguém mexer numa e esquecer a outra.
const CATEGORIAS_COTA = new Set(["bronze", "prata", "ouro", "diamante"]);

const LS_SALDO_CACHE     = "gut_saldo_cache";
const SALDO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h — além disso, mostrar é pior que não mostrar

// MC89.31 — `enderecoSessaoSincrono` mudou-se para `lib/dicaSessao.js`, onde
// passa a ser partilhada com o palpite do admin. Continua a ser exatamente a
// mesma função e a mesma guarda; o que se evita é uma SEGUNDA cópia da regra
// que valida um cache contra a sessão em disco — duas cópias divergem, e é
// precisamente essa guarda que o MC88.34 teve de acrescentar depois de um teste
// por mutação. O comentário que justifica ler `privy:connections` vive agora
// no cabeçalho desse módulo.

function lerSaldoCache() {
  try {
    const raw = localStorage.getItem(LS_SALDO_CACHE);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c?.endereco) return null;
    if (!Number.isFinite(c?.em) || Date.now() - c.em > SALDO_CACHE_TTL_MS) return null;
    // MC88.34 — a guarda de coerência por si só NÃO bastava: um teste por
    // mutação mostrou que um cache de outro endereço chegava a ser PINTADO aos
    // 704 ms e só desaparecia quando o `address` resolvia (~3,4 s) — uma
    // janela de ~2,7 s a mostrar o saldo alheio. Validar aqui, de forma
    // síncrona, elimina a janela: se a sessão em disco não for do mesmo
    // endereço, o cache nem chega a entrar no estado inicial.
    const sessao = enderecoSessaoSincrono();
    if (!sessao || String(c.endereco).toLowerCase() !== sessao) return null;
    return c;
  } catch { return null; }
}

function gravarSaldoCache(endereco, patch) {
  if (!endereco) return;
  try {
    const atual = lerSaldoCache();
    const base  = atual && atual.endereco === endereco ? atual : { endereco };
    localStorage.setItem(LS_SALDO_CACHE, JSON.stringify({ ...base, ...patch, endereco, em: Date.now() }));
  } catch { /* storage cheio ou indisponível — o cache é best-effort */ }
}

function limparSaldoCache() {
  try { localStorage.removeItem(LS_SALDO_CACHE); } catch { /* idem */ }
}

// ─── Context ─────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext deve ser usado dentro de <AppProvider>");
  return ctx;
}

// MC44 P0 — contexto SEPARADO para o estado de timer de alta frequência
// (tempoRestante a 250ms, edicoesTick a 1s). Antes estes campos viviam no value
// do AppContext → cada tick recriava o value e re-renderizava TODOS os
// consumidores de useAppContext (~1–2×/s, contínuo → "app pesado/engasgado").
// Isolando-os aqui, só os componentes de timer (que usam useAppTimer) re-render
// por tick; o resto do app fica estável.
const AppTimerContext = createContext(null);

export function useAppTimer() {
  const ctx = useContext(AppTimerContext);
  if (!ctx) throw new Error("useAppTimer deve ser usado dentro de <AppProvider>");
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────
// MC15.4 — deriva timeLeft (segundos) de uma edição a partir do termino_em
// ISO-8601 server-authoritative (D2/D4/R4). Cálculo ABSOLUTO, igual ao padrão
// do timer R-1: nunca um contador mutável → imune a F5/login.
export function timeLeftEdicaoSegundos(edicao) {
  if (!edicao || !edicao.termino_em) return 0;
  const fim = Date.parse(edicao.termino_em);
  if (Number.isNaN(fim)) return 0;
  return Math.max(0, Math.floor((fim - Date.now()) / 1000));
}

export function AppProvider({ children }) {
  // Tipo de leilão (Art. 8)
  const [tipoLeilao, setTipoLeilao] = useState("flash");

  // MC15.4 ITEM 5/6 — múltiplas edições (mapa keyed por id). Sempre tem ao
  // menos R-1 (real ou fallback sintetizado). Aditivo: o fluxo R-1 abaixo
  // (prazoFlash/prazoProgramado/tempoRestante) permanece intacto.
  const { edicoes, edicoesStatus } = useEdicoes();

  // lances on-chain (programado). lancesFlash off-chain (polling do blob).
  const [lances,       setLances]       = useState([]);
  const [lancesFlash,  setLancesFlash]  = useState([]);

  // Timer (Onda 5 FASE 0) — 2 prazos persistidos, prazoTimestamp deriva do tipo.
  // Inicializa do localStorage; se ausente, computa default. Programado é
  // hidratado on-chain via polling (getEdicaoPrazo) logo após o mount.
  const [prazoFlash, setPrazoFlash] = useState(() =>
    lerPrazoStorage(LS_PRAZO_FLASH) ?? (Math.floor(Date.now() / 1000) + DURACAO.flash)
  );
  const [prazoProgramado, setPrazoProgramado] = useState(() =>
    lerPrazoStorage(LS_PRAZO_PROG) ?? (Math.floor(Date.now() / 1000) + DURACAO.programado)
  );
  const prazoTimestamp = tipoLeilao === "flash" ? prazoFlash : prazoProgramado;

  // MC15.6 ITEM 2 — ref do prazo corrente para o polling de notificações decidir
  // a cadência (2s nos 5 min finais) SEM re-criar o timer a cada segundo.
  const prazoNotifRef = useRef(prazoTimestamp);
  useEffect(() => { prazoNotifRef.current = prazoTimestamp; }, [prazoTimestamp]);

  const [encerrado,       setEncerrado]       = useState(false);
  const [showOverlay,     setShowOverlay]     = useState(false);
  // MC44 P0 — tempoRestante (display, 250ms) migrado para o TimerProvider; aqui
  // ficou só a máquina de estado de fim de leilão (encerrado/overlay/lightning).
  const [lightningActive, setLightningActive] = useState(false);
  const [showCountdown,   setShowCountdown]   = useState(false);

  // Persiste prazos no localStorage sempre que mudam — garante que o valor
  // inicial (inclusive fallback Date.now()+dur) seja escrito. Sem isso, F5
  // lê localStorage null e gera novo deadline, zerando o cronómetro.
  useEffect(() => { gravarPrazoStorage(LS_PRAZO_FLASH, prazoFlash); }, [prazoFlash]);
  useEffect(() => { gravarPrazoStorage(LS_PRAZO_PROG, prazoProgramado); }, [prazoProgramado]);

  // Setter que troca o prazo do tipo CORRENTE e persiste.
  const setPrazoTimestamp = useCallback((novo) => {
    if (tipoLeilao === "flash") {
      setPrazoFlash(novo);
      gravarPrazoStorage(LS_PRAZO_FLASH, novo);
    } else {
      setPrazoProgramado(novo);
      gravarPrazoStorage(LS_PRAZO_PROG, novo);
    }
  }, [tipoLeilao]);

  // MC88.34 (P0) — SALDO OTIMISTA.
  // O MC88.33 mediu: o ecrã pinta aos 536 ms mas o saldo real só aparece aos
  // 5375 ms, porque a cadeia é serial (Privy → /wallets → auth-user →
  // saldo-rs). São ~4 s a olhar para um saldo vazio. Aqui pintamos o último
  // valor conhecido de imediato e reconciliamos quando a cadeia responder.
  //
  // O status entra como "stale" (e NÃO "ok"): a máquina de estados já previa
  // esse valor, portanto a UI que distingue fresco de obsoleto continua a
  // funcionar sem alterações.
  //
  // SEGURANÇA (R4): o valor em cache é de um endereço concreto, mas no arranque
  // o `address` só existe aos ~3,4 s. Para nunca mostrar o saldo de A a B:
  //   1. gravamos sempre o endereço junto do valor;
  //   2. assim que o `address` real chega, um efeito compara e descarta se
  //      diferir (ver "guarda de coerência" mais abaixo);
  //   3. o cache é apagado no logout, portanto um cache existente implica que
  //      a sessão Privy nunca foi trocada neste aparelho.
  const [saldoCacheInicial] = useState(lerSaldoCache);

  // MC89.31 — ADMIN PROVÁVEL (abrir o ADM direto no painel dele).
  //
  // Irmão do `tipoProvavel` do MC88.42, e pela mesma razão: durante o restauro
  // da sessão Privy o ADM via o Dashboard COMUM durante ~1,3 s (medido no
  // aparelho, MC89.31-S0) antes de ser encaminhado para /admin. A informação
  // para decidir já estava em disco no instante zero — faltava a chave para a
  // validar, porque `address` só chega depois do Privy.
  //
  // Lido UMA vez, no primeiro render, com `useState`: é uma fotografia do
  // arranque, não um valor que deva mudar a meio. Assim que `address` existir,
  // quem manda é a resposta CONFIRMADA (ver App.jsx:DashboardOuCorporativo) e
  // este palpite deixa de ser consultado.
  //
  // ⚠️ Só ENCAMINHA. Não concede nada — ver o cabeçalho de lib/dicaSessao.js
  // para as três defesas que continuam de pé.
  const [adminProvavel] = useState(lerAdminProvavel);

  // MC89.36 — LOJISTA PROVÁVEL, agora lido da chave própria.
  //
  // Mesma natureza do `adminProvavel` logo acima: fotografia do arranque, lida
  // UMA vez, de forma síncrona, antes do primeiro paint. A partir do momento em
  // que /cotas responde, quem manda é a resposta CONFIRMADA e este palpite deixa
  // de ser consultado (ver `tipoOtimista`).
  //
  // O que muda face ao MC88.42 não é a lógica — é o RECIPIENTE. Antes lia-se
  // `saldoCacheInicial?.tipoConfirmado`, e esse registo era apagado no logout
  // pela guarda de coerência do saldo. Agora tem chave própria e sobrevive,
  // exatamente como a do ADM.
  const [lojistaProvavel] = useState(lerLojistaProvavel);

  // MC89.36.1 — "HÁ UM LOGIN A DECORRER NESTE INSTANTE".
  //
  // MEDIDO no aparelho, no primeiro login do lojista após logout: entre o
  // retorno do OAuth e o painel passaram 9 996 ms, e 1 889 desses foram de
  // DASHBOARD COMUM — apesar do estado neutro já existir. Sequência medida:
  //     179 563 ms  (em branco)        ← window.location.assign do retorno OAuth
  //     180 644 ms  DASHBOARD COMUM    ← 1 889 ms a dizer "Bem-vindo" a quem
  //                                      acabou de entrar  ⚠️
  //     182 533 ms  ESTADO NEUTRO      ← só quando o Privy termina
  //     189 559 ms  CORPORATIVO
  //
  // PORQUÊ: a porta do estado neutro é `pareceAutenticado`, que depende de
  // `sessaoOtimista` → `saldoCacheInicial` → `gut_saldo_cache`. Num login
  // FRESCO esse registo não existe: foi apagado no logout e só volta a ser
  // escrito depois de a autenticação terminar. Durante a janela, a app não tem
  // como saber que alguém está a entrar — e trata-o como visitante.
  //
  // É a MESMA armadilha do MC89.31, onde `sessaoEmDisco` teve de nascer porque
  // `sessaoOtimista` (ancorado no saldo) dizia "visitante" a um ADM com sessão
  // válida. Aqui nem `privy:connections` serve: no instante do retorno o SDK
  // ainda não o escreveu — está precisamente a trocar o código pelo token.
  //
  // O que EXISTE nesse instante são os parâmetros do OAuth no URL. Não é um
  // palpite: é o próprio App.jsx que os reinjeta na origem local
  // (`window.location.assign(\`/${search}\`)`) para o SDK os poder ler. Se eles
  // lá estão, há um login a meio — não é um visitante.
  //
  // Lido UMA vez, no primeiro render: o SDK limpa o URL a seguir, e o que
  // interessa é a fotografia do arranque.
  //
  // ⚠️ Só ENCAMINHA — e nem sequer escolhe destino: escolhe entre ESPERAR e
  // mostrar o Dashboard. Um visitante nunca tem estes parâmetros no URL.
  const [loginEmCurso] = useState(() => {
    try { return /[?&]privy_oauth_/.test(window.location.search); } catch { return false; }
  });

  // MC89.31 — "há uma sessão Privy em disco", lido a t=0.
  //
  // Distinto do `sessaoOtimista` do MC88.38, que ancora no `gut_saldo_cache`:
  // ali o cache é a fonte do RÓTULO ("Olá, Fulano"), logo sem cache não há nada
  // para mostrar e o otimismo não faz sentido. Aqui a pergunta é outra — "vale
  // a pena esperar antes de pedir login?" — e para essa, quem manda é a
  // presença da sessão, não a de um saldo em cache.
  //
  // MEDIDO no aparelho: um ADM com sessão válida mas SEM `gut_saldo_cache` via
  // "Faça login para verificar privilégios" durante 737 ms dentro do painel.
  // Raro, mas é exatamente o defeito que este MC existe para eliminar, e ficar
  // dependente de um cache de saldo para o evitar era um acoplamento errado.
  const [sessaoEmDisco] = useState(() => enderecoSessaoSincrono() !== null);

  // Saldo on-chain — saldoSenhas[address] no contrato.
  // null = "ainda não consultado" (distinto de 0, que é estado on-chain válido).
  const [saldoSenhas,       setSaldoSenhas]       = useState(saldoCacheInicial?.senhas ?? null);
  const [saldoSenhasStatus, setSaldoSenhasStatus] = useState(
    saldoCacheInicial?.senhas != null ? "stale" : "idle"); // idle | loading | ok | stale | error

  // Saldo R$ off-chain — blob `saldo-rs:${address}` (Frente B.9).
  // PIX aprovado = +R$. /comprar-senhas = -R$ +senhas. /lance-relampago = -R$.
  const [saldoRsCentavos, setSaldoRsCentavos] = useState(saldoCacheInicial?.centavos ?? null);
  const [saldoRsStatus,   setSaldoRsStatus]   = useState(
    saldoCacheInicial?.centavos != null ? "stale" : "idle");

  // MC15.6 ITEM 2 — Notificações proativas do GUTO (polling adaptativo).
  // notificacoes: array de eventos vindos de GET /notificacoes (admin-only).
  // notificacoesNaoLidas: badge "🔔 N"; zera quando o admin abre o chat.
  // notifSigVistaRef: assinatura do último conjunto marcado como lido.
  const [notificacoes, setNotificacoes] = useState([]);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const notifSigVistaRef = useRef("");

  // MC12.2 — cotaCorporativa buscada uma vez após login para TODOS os usuários
  // autenticados. tipoUsuario é derivado do campo tipo no blob (não de customMetadata,
  // que exige Admin API no Privy v3.22.1). tipoCarregando evita redirect prematuro.
  const [cotaCorporativa, setCotaCorporativa] = useState(null);
  const [tipoCarregando,  setTipoCarregando]  = useState(false);

  // MC89.36 — "a pergunta /cotas JÁ FOI RESPONDIDA" (com sucesso ou com erro).
  //
  // ⚠️ NÃO É O MESMO QUE `!tipoCarregando`, e a diferença é a razão de ser deste
  // estado. `tipoCarregando` só passa a true na linha 377, imediatamente ANTES do
  // fetch — mas o `return` da linha 376 (sem `authToken`) acontece antes disso, e
  // a linha 366 (sem `address`) põe-no explicitamente a false. Medido no aparelho
  // (MC89.36-S0): o Dashboard está pintado desde os 568 ms e /cotas só dispara
  // aos 4 422 ms. Nesses 3,9 s — 76% da janela — `tipoCarregando` é FALSE e
  // `cotaCorporativa` é null, o que fazia `tipoUsuario` cair para "comum".
  //
  // É a ambiguidade que App.jsx:120-123 já descrevia sem ter como a resolver:
  // "`cotaCorporativa == null` é ambíguo — significa 'ainda não encontrei' E
  //  'não é lojista'". Este booleano separa as duas.
  //
  // Só ENCAMINHA (escolhe entre esperar e mostrar o Dashboard). Não autoriza nada.
  const [tipoResolvido, setTipoResolvido] = useState(false);

  // ── FingerprintJS visitorId (anti-Sybil — Mega Comando 3 / Item 3) ──────
  // Carregado uma vez no mount, cacheado em localStorage. Enviado em
  // X-Visitor-ID nos fetches sensíveis.
  const [visitorId, setVisitorId] = useState(() => getCachedVisitorId());
  useEffect(() => {
    let cancelado = false;
    getVisitorId().then((id) => { if (!cancelado && id) setVisitorId(id); });
    return () => { cancelado = true; };
  }, []);

  // ── Analytics (MC8 / Item 1) — coleta de eventos para motor IA preditiva ──
  // Fire-and-forget: nunca bloqueia render nem propaga erro. visitorId é lido
  // do localStorage dentro de analytics.js para sobreviver a mudanças de estado.
  const location = useLocation();
  useEffect(() => {
    trackPageview(location.pathname);
  }, [location.pathname]);

  // Tempo de sessão: marca início no mount e envia ao unload via Page Lifecycle.
  // pagehide é mais confiável que beforeunload no Mobile/iOS Safari.
  const sessaoInicioRef = useRef(Date.now());
  useEffect(() => {
    const onPageHide = () => {
      const segundos = Math.floor((Date.now() - sessaoInicioRef.current) / 1000);
      trackTempoSessao(segundos, location?.pathname);
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [location?.pathname]);

  // Profundidade de scroll: rastreia o MÁXIMO atingido por rota.
  // Reseta o teto ao trocar de rota e dispara no unload da rota corrente.
  useEffect(() => {
    let maxProf = 0;
    let rafId   = null;
    const computar = () => {
      const el = document.documentElement;
      const total = (el.scrollHeight - el.clientHeight) || 1;
      const prof  = Math.floor(((window.scrollY || 0) / total) * 100);
      if (prof > maxProf) maxProf = prof;
      rafId = null;
    };
    const onScroll = () => {
      if (rafId == null) rafId = window.requestAnimationFrame(computar);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
      if (maxProf > 0) trackScroll(maxProf, location?.pathname);
    };
  }, [location?.pathname]);

  // ── User-session JWT (Anti-IDOR — Mega Comando 1 / Item 3) ───────────────
  // Obtido após login Privy via assinatura EIP-191. TTL 24h. Cache em
  // sessionStorage para sobreviver a refresh de página dentro da sessão.
  // Injetado em Authorization: Bearer nos GETs sensíveis (saldo-rs, wallet,
  // renovacao-adesao, voucher).
  const [authToken, setAuthToken] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem("gut_auth_user");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.token) return null;
      if (typeof parsed.expiresAt === "number" && Date.now() >= parsed.expiresAt) return null;
      return parsed.token;
    } catch { return null; }
  });

  // Privy auth — MC12: customMetadata como fonte de verdade do tipoUsuario.
  // ATENÇÃO: useWallets/address ANTES de qualquer hook que os use em deps (TDZ mc11.16-t2).
  const { ready, authenticated, user, login, logout } = usePrivy();
  const navigate = useNavigate();
  const { wallets } = useWallets();
  const privyWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const address     = privyWallet?.address ?? null;

  // MC12.2 — cota corporativa: buscada uma vez para QUALQUER usuário logado.
  // tipoUsuario é derivado do campo tipo no blob (não de user.customMetadata).
  // Privy v3.22.1 removeu setCustomMetadata client-side; a persistência agora
  // fica em Netlify Blobs via cotas.mjs (POST action=register-corporativo).
  useEffect(() => {
    // MC89.36 — sem `address` a pergunta volta a estar POR RESPONDER. Isto é o
    // que faz uma troca de conta (ou um logout) reabrir o estado neutro em vez
    // de herdar o "já sei" da sessão anterior.
    if (!address) { setCotaCorporativa(null); setTipoCarregando(false); setTipoResolvido(false); return; }
    // MC88.34 (P1) — espera pelo authToken antes de perguntar.
    // O MC88.33 mediu 6 chamadas a /cotas no arranque, quase todas 401/404: o
    // efeito corria uma vez SEM token (as 3 tentativas respondiam 401 por
    // desenho, ver MC87 P0-1) e voltava a correr quando o token chegava. A
    // primeira ronda nunca podia ter sucesso, portanto era trabalho garantido
    // a perder — 3 pedidos no pior momento do arranque.
    // NÃO colapsamos as 3 tentativas numa só: cobrem identidades diferentes
    // (MC15.2 Google/Apple, MC15.3 cadastro recente) e uni-las perderia a
    // deteção de perfil corporativo nesses casos.
    if (!authToken) return;   // `tipoCarregando` fica true; re-corre com o token
    setTipoCarregando(true);
    let cancel = false;
    const buscarCota = async () => {
      try {
        // MC87 (P0-1) — /cotas GET deixou de ser anónimo nos ramos que devolvem
        // PII. Passamos o user-session JWT; enquanto ele não existe as consultas
        // respondem 401, o perfil fica nulo e este efeito RE-CORRE assim que
        // `authToken` chega (está nas deps) — transitório, nunca um bloqueio.
        const respAddr = await apiGet(`cotas?cliente_id=${encodeURIComponent(address)}`, { token: authToken });
        let data = respAddr.ok ? respAddr.data : null;
        // MC15.2 — fallback por email cobre QUALQUER método de login.
        // O email do utilizador pode vir de email-OTP, Google ou Apple; antes
        // (MC14.10.1) só user.email.address disparava o fetch, deixando logins
        // Google/Apple sem reconhecer o perfil corporativo.
        const emailLogin =
          user?.email?.address || user?.google?.email || user?.apple?.email || null;
        if (!data && emailLogin) {
          const respEmail = await apiGet(`cotas?email=${encodeURIComponent(emailLogin)}`, { token: authToken });
          if (respEmail.ok) data = respEmail.data;
        }
        // MC15.3 — fallback final: email do cadastro recém-feito em
        // SejaNossoParceiro, guardado no sessionStorage antes do login. Cobre
        // o caso de o email do cadastro diferir da identidade Privy do login.
        if (!data) {
          let emailCadastro = null;
          try { emailCadastro = sessionStorage.getItem("gut_corp_recem_cadastrado"); } catch {}
          if (emailCadastro && emailCadastro !== emailLogin) {
            const respCad = await apiGet(`cotas?email=${encodeURIComponent(emailCadastro)}`, { token: authToken });
            if (respCad.ok) data = respCad.data;
          }
        }
        // Consome a flag de cadastro recente assim que o perfil é reconhecido.
        if (data?.tipo === "corporativo") {
          try { sessionStorage.removeItem("gut_corp_recem_cadastrado"); } catch {}
        }
        if (!cancel) {
          setCotaCorporativa(data || null);
          setTipoCarregando(false);
          setTipoResolvido(true);   // MC89.36 — houve resposta
        }
      } catch {
        // MC89.36 — um erro TAMBÉM é uma resposta, para efeitos de encaminhamento.
        // Sem isto, uma falha de rede prendia o utilizador no estado neutro até
        // ao prazo (R-C) em vez de o deixar seguir para o Dashboard de imediato.
        if (!cancel) { setCotaCorporativa(null); setTipoCarregando(false); setTipoResolvido(true); }
      }
    };
    buscarCota();
    return () => { cancel = true; };
  }, [address, authToken, user?.email?.address, user?.google?.email, user?.apple?.email]);

  // MC12.2 — tipoUsuario derivado do blob cotas (não de customMetadata).
  const tipoUsuario = cotaCorporativa?.tipo === "corporativo" ? "corporativo" : "comum";

  // MC88.42 — TIPO PROVÁVEL (abrir o lojista direto no painel dele).
  //
  // PROBLEMA MEDIDO no aparelho, com a sessão corporativa real: o lojista via o
  // Dashboard COMUM durante 9012 / 3994 / 3873 ms (mediana 3994) antes de ser
  // redirecionado para /corporativo. Não é um piscar de estilo — o corporativo
  // é um lojista anunciante que pagou entre R$ 2.640 e R$ 18.000 por uma cota,
  // e o que lhe aparecia era o dashboard de leilão: KPIs de lances, saldo de
  // senhas, "Ir para o Mercado". Outro produto.
  //
  // CAUSA: a linha acima colapsa TRÊS situações em DUAS — "sei que é
  // corporativo", "sei que é comum" e "AINDA NÃO SEI" (cotaCorporativa é null
  // no arranque). A terceira devolvia "comum", que é uma afirmação falsa.
  //
  // ⚠️ PORQUE É QUE ISTO NÃO É COMO O `pareceAutenticado` DO MC88.38.
  // Ali o palpite escolhia TEXTO; aqui influencia uma GUARDA DE ROTA, que é
  // autorização. Por decisão do operador seguiu-se a variante mais conservadora
  // das três em cima da mesa: o palpite SÓ é usado se a última sessão
  // CONFIRMADA neste MESMO endereço tiver sido corporativa. Um utilizador comum
  // nunca terá a dica gravada, portanto NUNCA vê o painel do lojista, nem por um
  // instante — nem sequer com a dica manipulada, porque `lojistaProvavel()`
  // valida o endereço contra `privy:connections` de forma síncrona antes do
  // primeiro paint (a mesma guarda que nasceu no MC88.34).
  //
  // MC89.36 — o primeiro login de sempre de um lojista JÁ NÃO passa pelo
  // Dashboard comum: passa pelo estado neutro, que não afirma nada. Continua a
  // não haver palpite nesse caso — adivinhar seria inventar —, mas deixou de ser
  // preciso adivinhar para não mostrar o produto errado.
  //
  // MC89.36 — A FONTE DO PALPITE MUDOU DE SÍTIO, A REGRA NÃO.
  // Lia-se `saldoCacheInicial?.tipoConfirmado`; passa a ler-se a chave própria
  // (`lojistaProvavel`), pelas razões do cabeçalho de `CHAVE_LOJISTA` em
  // lib/dicaSessao.js. As três guardas continuam de pé — incluindo a que valida
  // o endereço contra `privy:connections` de forma síncrona antes do primeiro
  // paint, que é a que impede que o palpite de A se aplique a B.
  const tipoOtimista = cotaCorporativa == null && lojistaProvavel
    ? "corporativo"
    : null;
  const tipoProvavel = tipoUsuario === "corporativo" ? "corporativo" : (tipoOtimista ?? tipoUsuario);

  // MC89.40 (F2) — "a cota está PAGA?", que é uma pergunta DIFERENTE de "é
  // lojista?".
  //
  // `tipoUsuario` responde à primeira e é escrito no REGISTO (cotas.mjs:427, com
  // `vendida:false` e `categoria:null`). Durante muito tempo foi usado também
  // como resposta à segunda — e por isso quem preenchia o formulário "Seja Nosso
  // Parceiro" entrava no painel sem ter pago (MC89.37).
  //
  // As duas perguntas passam a ter cada uma o seu sinal, e não devem voltar a
  // ser colapsadas:
  //     tipoUsuario / tipoProvavel → ENCAMINHA  (para onde vai)
  //     cotaAtiva                  → AUTORIZA   (o que pode fazer lá dentro)
  //
  // ⚠️ ISTO É CONFORTO, NÃO É A CORREÇÃO. Quem impede de facto é o servidor
  // (`_lib/cota-utils.mjs`, MC89.40-S0): um gate só de frontend não fecha nada,
  // porque o endpoint continua a poder ser chamado à mão. Aqui só se evita que
  // o lojista tente e leve com um erro seco.
  //
  // `null` significa AINDA NÃO SEI — e é deliberadamente distinto de `false`.
  // Quem consome tem de tratar os três estados; dizer "inativa" a quem ainda não
  // foi verificado é a mesma família de erro que o MC89.36 veio corrigir.
  const cotaAtiva = cotaCorporativa == null
    ? null
    : (cotaCorporativa.vendida === true
       && typeof cotaCorporativa.categoria === "string"
       && CATEGORIAS_COTA.has(cotaCorporativa.categoria.toLowerCase()));

  // Grava o tipo assim que ele é CONFIRMADO (e apaga o palpite quando deixa de
  // ser corporativo, para um ex-lojista não ficar preso ao painel antigo).
  //
  // MC89.36 — passa a escrever na chave própria em vez de dentro do
  // `gut_saldo_cache`. Era ali que o palpite morria: a guarda de coerência do
  // saldo (mais abaixo, AppContext:659-670) apaga esse registo inteiro no
  // logout, e levava o palpite à frente sem saber que ele lá estava.
  useEffect(() => {
    if (!address || cotaCorporativa == null) return;
    gravarDicaLojista(address, tipoUsuario === "corporativo");
  }, [address, cotaCorporativa, tipoUsuario]);

  // Atualiza cotaCorporativa em memória após auto-cadastro (SejaNossoParceiro)
  // sem aguardar novo fetch do servidor.
  // MC89.36 — o auto-cadastro é uma resposta definitiva tal como a do servidor.
  const atualizarTipoCorporativo = (data) => { setCotaCorporativa(data); setTipoCarregando(false); setTipoResolvido(true); };

  // MC12.3 Item 4 — Isolamento do mundo lojista. Se um corporativo cair em
  // rota de usuário comum (Dashboard, carteira, mercado, vitrine, ativos…),
  // redireciona automaticamente para /corporativo. Replace para não
  // poluir o histórico do navegador.
  useEffect(() => {
    if (tipoCarregando) return;
    if (tipoUsuario !== "corporativo") return;
    // MC39.4.2 (#segurança): "/seguranca" REMOVIDO das rotas proibidas. Desde o MC39.3.1
    // (#7) a página de segurança é EXCLUSIVA do corporativo (gated por CorporativoRoute).
    // O isolamento bouncava o lojista de volta para /corporativo ao aceder a /seguranca
    // (o acesso "não funcionava"). MC39.6: o acesso a Segurança passou a viver na navegação
    // (sheet "Mais" no BottomNav / cauda da Sidebar). Mantém-se o isolamento das demais
    // rotas comuns.
    const rotasProibidas = new Set([
      "/", "/carteira", "/mercado", "/vitrine", "/programacao",
      "/ativos", "/seja-nosso-parceiro",
    ]);
    if (rotasProibidas.has(location.pathname)) {
      navigate("/corporativo", { replace: true });
    }
  }, [tipoUsuario, tipoCarregando, location.pathname, navigate]);

  // MC12 — carteira corporativa: wallets[1] criado após cadastro corporativo.
  // Fallback para wallets[0] se wallets[1] ainda não existe (transição).
  const corporativoWallet = tipoUsuario === "corporativo"
    ? (wallets[1] ?? wallets[0] ?? null)
    : null;
  const addressCorporativo = corporativoWallet?.address ?? null;

  const isConnected = authenticated && Boolean(address);
  const userLabelReal = user?.google?.name || user?.google?.email || user?.email?.address || user?.apple?.email || (tipoUsuario === "corporativo" ? cotaCorporativa?.empresa : null) || null;

  // MC88.37 — SESSÃO OTIMISTA (abrir direto no ecrã autenticado).
  //
  // PROBLEMA MEDIDO: durante o restauro do Privy (~1,6 s no APK) `ready` e
  // `authenticated` são ambos false, logo `isConnected` é false e o Dashboard
  // cai no ramo "Faça login para participar" — a um utilizador JÁ autenticado,
  // e com o saldo dele próprio pintado ao lado pelo saldo otimista do MC88.34.
  // O ecrã contradizia-se a si mesmo durante 1,6 s.
  //
  // `isConnected` significa "confirmado". Falta o terceiro estado: "ainda a
  // restaurar, mas há sessão em disco". É o que `pareceAutenticado` exprime.
  //
  // ⚠️ NÃO substitui `isConnected` em lado nenhum. `isConnected` continua a ser
  // a única fonte para HABILITAR ações (lance, compra, assinatura).
  // `pareceAutenticado` serve APENAS para escolher o texto que se mostra.
  //
  // SEGURANÇA (R4): o rótulo é dado pessoal. Vem do MESMO cache que o saldo
  // otimista, que `lerSaldoCache()` valida de forma SÍNCRONA contra o endereço
  // em `privy:connections` antes do primeiro paint — a guarda que o MC88.34
  // teve de acrescentar depois de um teste por mutação mostrar um saldo alheio
  // pintado durante 2,7 s. Se a sessão em disco for de outra conta, o cache não
  // entra no estado inicial e não há rótulo nem sessão otimista.
  // ⚠️ A condição NÃO pode ser `!ready`. Medido no aparelho: `ready` fica true
  // ANTES de `address` resolver, e nessa fresta (4718 → 5601 ms) `sessaoOtimista`
  // desligava-se sem que `isConnected` já tivesse ligado — o cabeçalho VOLTAVA
  // ATRÁS para "Bem-vindo ao DesafioGUT!" depois de já ter dito "Olá". Trocava
  // uma contradição por um piscar, que é pior.
  //
  // O otimismo só deve cair quando a resposta for DEFINITIVA e negativa, isto é,
  // quando o Privy já respondeu (`ready`) E disse que não há sessão
  // (`!authenticated`). Enquanto isso não acontecer, o cache manda.
  const sessaoOtimista =
    Boolean(saldoCacheInicial?.endereco) && !(ready && !authenticated);
  const pareceAutenticado = isConnected || sessaoOtimista;

  // MC89.31 — "o Privy ainda está a restaurar uma sessão que existe em disco".
  // Mesma regra de queda do `sessaoOtimista`: o otimismo só cai quando a
  // resposta for DEFINITIVA e negativa (`ready && !authenticated`), nunca com
  // `!ready` — ver o comentário acima, medido no MC88.37. Assim, um logout
  // dentro do painel faz isto passar a false e o ecrã de login volta, como deve.
  const restaurandoSessao = sessaoEmDisco && !(ready && !authenticated);
  const userLabel = userLabelReal || (sessaoOtimista ? (saldoCacheInicial?.label ?? null) : null);

  // Persiste o rótulo no mesmo registo do saldo (mesma chave, mesma guarda).
  useEffect(() => {
    if (address && userLabelReal) gravarSaldoCache(address, { label: userLabelReal });
  }, [address, userLabelReal]);

  const lancesExibidos = tipoLeilao === "flash" ? lancesFlash : lances;

  // Vencedor — Menor Lance Único (Art. 8)
  const vencedor = [...lancesExibidos]
    .filter((l) => !l.repetido)
    .sort((a, b) => a.valor - b.valor)[0] ?? null;

  // ── Reset versionado ─────────────────────────────────────────────────────
  // Limpa localStorage legado e desloga a sessão Privy UMA ÚNICA VEZ por
  // dispositivo, quando a versão do reset muda. Evita arrastar dados de
  // teste antigos (MOCK_MODE removido em 2026-05-11) sem afetar usuários
  // que já passaram pelo reset ou que fazem login após a virada.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let aplicado;
    try {
      aplicado = localStorage.getItem(LS_RESET_KEY);
    } catch { return; }
    if (aplicado === LS_RESET_VERSION) return;
    try {
      for (const k of LS_KEYS_LEGADO_MOCK) localStorage.removeItem(k);
      localStorage.setItem(LS_RESET_KEY, LS_RESET_VERSION);
    } catch {}
    // Purga Blob server-side de lances residuais da Edição R-1 (one-shot,
    // disparado quando a versão do reset muda neste dispositivo).
    fetch("/.netlify/functions/purge-lances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edicaoId: EDICAO_ATIVA }),
    }).then((resp) => {
      if (!resp.ok) console.warn("[GUT-DEBUG] purge-lances HTTP", resp.status);
    }).catch((err) => {
      console.warn("[GUT-DEBUG] purge-lances falhou", err?.message);
    });
    // Sessão Privy antiga é descartada apenas na primeira execução do reset.
    // Usuário re-loga em seguida — UX aceitável porque é one-shot.
    if (authenticated) {
      try { logout(); } catch (err) {
        console.warn("[GUT-DEBUG] reset versionado: logout falhou", err?.message);
      }
    }
  }, [authenticated, logout]);

  // ── Efeitos ──────────────────────────────────────────────────────────────

  useEffect(() => {
    setShowOverlay(false);
    setLightningActive(false);
  }, [tipoLeilao]);

  // Polling de lances flash do blob (cross-user em tempo real).
  //
  // MC88.31 (Achado 5 do MC88.30) — era 3s fixos, ou seja 20 pedidos/min mesmo
  // com a edição fechada ("EM BREVE / Aguardando abertura"), que foi o estado
  // medido. Agora a cadência é derivada do prazo: 3s enquanto a edição corre
  // (comportamento inalterado no momento que importa) e 15s quando não há
  // nada a acontecer → 20/min cai para 4/min em repouso.
  //
  // Usa setTimeout recursivo em vez de setInterval de propósito: o atraso é
  // recalculado a cada ciclo, portanto a cadência acelera sozinha quando a
  // edição abre e abranda quando o prazo passa, sem pôr `prazoFlash` nas
  // dependências (o que reiniciaria o polling a cada actualização do prazo).
  useEffect(() => {
    if (tipoLeilao !== "flash") return;
    let cancelado = false;
    let id = null;
    // Reaproveita prazoNotifRef (já mantém o prazo do tipo CORRENTE, atualizado
    // sem re-criar timers) — a mesma razão pela qual foi criado no MC15.6.
    const emCurso = () =>
      Number(prazoNotifRef.current) > Math.floor(Date.now() / 1000);
    const poll = async () => {
      if (cancelado) return;
      try {
        const { ok, data } = await apiGet(`lances-flash?edicaoId=${EDICAO_ATIVA}`);
        if (!ok || cancelado) return;
        if (!cancelado) setLancesFlash(data.lances || []);
      } catch {}
      if (!cancelado) id = setTimeout(poll, emCurso() ? 3000 : 15000);
    };
    poll();
    return () => { cancelado = true; if (id) clearTimeout(id); };
  }, [tipoLeilao]);

  // Listener on-chain do evento LanceDado — atualiza tabela em tempo real.
  useEffect(() => {
    const unsubscribe = subscribeLanceDado(EDICAO_ATIVA, (lance) => {
      setLances((prev) => {
        if (prev.some((l) => l.txHash === lance.txHash)) return prev; // dedup
        const valor = lance.valor;
        return [
          ...prev.map((l) => l.valor === valor ? { ...l, repetido: true } : l),
          {
            endereco: lance.endereco,
            valor,
            repetido: lance.repetido || prev.some((l) => l.valor === valor),
            txHash:   lance.txHash,
          },
        ];
      });
    });
    return unsubscribe;
  }, []);

  // MC88.34 (P0) — GUARDA DE COERÊNCIA do saldo otimista.
  // O valor em cache foi pintado antes de sabermos quem é o utilizador (o
  // `address` só chega aos ~3,4 s). Aqui, no instante em que ele chega:
  //   • se pertence a outra conta → descarta já o que está no ecrã;
  //   • no logout (address volta a null DEPOIS de ter existido) → apaga o
  //     cache, para que a próxima sessão nunca herde o saldo desta.
  // O ref distingue "ainda não carregou" de "fez logout" — sem ele, o null do
  // arranque apagaria o cache em todos os arranques, anulando a otimização.
  const jaTeveEnderecoRef = useRef(false);
  useEffect(() => {
    if (address) {
      jaTeveEnderecoRef.current = true;
      if (saldoCacheInicial && saldoCacheInicial.endereco !== address) {
        limparSaldoCache();
        setSaldoSenhas(null);    setSaldoSenhasStatus("idle");
        setSaldoRsCentavos(null); setSaldoRsStatus("idle");
      }
      return;
    }
    if (jaTeveEnderecoRef.current) limparSaldoCache();
  }, [address, saldoCacheInicial]);

  // ── Saldo on-chain: refetch + listener + polling guardião ───────────────
  const refetchSaldo = useCallback(async () => {
    if (!address) {
      // MC88.34 (P0) — no ARRANQUE o address ainda não existe. Limpar aqui
      // apagaria o saldo otimista no primeiro render e anularia a otimização.
      // Só se limpa quando já houve endereço, isto é, num logout real.
      if (jaTeveEnderecoRef.current) {
        setSaldoSenhas(null);
        setSaldoSenhasStatus("idle");
      }
      return;
    }
    setSaldoSenhasStatus((prev) => (prev === "ok" || prev === "stale" ? prev : "loading"));
    try {
      const valor = await getSaldoSenhasOnChain(address);
      setSaldoSenhas(valor);
      setSaldoSenhasStatus("ok");
      gravarSaldoCache(address, { senhas: valor });   // MC88.34 (P0)
    } catch (err) {
      console.warn("[GUT-DEBUG] refetchSaldo falhou", {
        address, message: err?.message, name: err?.name,
      });
      setSaldoSenhasStatus((prev) => (prev === "ok" ? "stale" : "error"));
    }
  }, [address]);

  useEffect(() => {
    refetchSaldo();
  }, [address, refetchSaldo]);

  useEffect(() => {
    if (!address) return;
    const unsubscribe = subscribeSaldoSenhas(address, (event) => {
      console.info("[GUT-DEBUG] saldoSenhas event", event);
      refetchSaldo();
    });
    const intervalId = setInterval(refetchSaldo, 30000);
    return () => {
      try { unsubscribe(); } catch (e) {
        console.warn("[GUT-DEBUG] unsubscribe falhou", e?.message);
      }
      clearInterval(intervalId);
    };
  }, [address, refetchSaldo]);

  // ── User-session JWT: obter via assinatura EIP-191 após login Privy ─────
  const obterAuthToken = useCallback(async () => {
    if (!address || !privyWallet) return null;
    try {
      const ts = Date.now();
      const enderecoLower = address.toLowerCase();
      const message = `DESAFIOGUT-AUTH:${ts}:${enderecoLower}`;
      const provider  = await privyWallet.getEthereumProvider();
      const { signer } = await getSignerFromProvider(provider);
      const signature = await signer.signMessage(message);
      const resp = await fetch("/.netlify/functions/auth-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(visitorId ? { "X-Visitor-ID": visitorId } : {}),
        },
        body: JSON.stringify({ endereco: enderecoLower, signature, message }),
      });
      if (!resp.ok) {
        console.warn("[GUT-DEBUG] auth-user HTTP", resp.status);
        return null;
      }
      const data = await resp.json();
      if (!data?.token) return null;
      const expiresAt = Date.now() + (Number(data.ttl) || 86400) * 1000;
      try { sessionStorage.setItem("gut_auth_user", JSON.stringify({ token: data.token, expiresAt })); } catch {}
      setAuthToken(data.token);
      return data.token;
    } catch (err) {
      console.warn("[GUT-DEBUG] obterAuthToken falhou", err?.message);
      return null;
    }
  }, [address, privyWallet, visitorId]);

  useEffect(() => {
    if (!address) {
      setAuthToken(null);
      try { sessionStorage.removeItem("gut_auth_user"); } catch {}
      return;
    }
    if (!authToken) obterAuthToken();
  }, [address, authToken, obterAuthToken]);

  // ── Saldo R$ off-chain: polling 5s (gated em authToken para anti-IDOR) ──
  const refetchSaldoRs = useCallback(async () => {
    if (!address || !authToken) {
      // MC88.39 — o `jaTeveEnderecoRef` sozinho NÃO chega aqui, e é por isso
      // que o saldo em R$ piscava enquanto o das senhas não.
      //
      // O ref (MC88.34) distingue duas situações — "ainda não carregou" e "fez
      // logout" — mas neste ramo existem TRÊS:
      //   (a) arranque, sem endereço            → não limpar
      //   (b) arranque, com endereço sem token  → NÃO limpar   ← faltava
      //   (c) logout real, endereço desapareceu → limpar
      //
      // O ref é ligado no instante em que o `address` chega, e no arranque o
      // `address` chega ANTES do `authToken` (obtido num pedido próprio, umas
      // centenas de ms depois). Nessa janela a condição acima era verdadeira
      // POR CAUSA DO TOKEN, mas o ref já estava true POR CAUSA DO ENDEREÇO —
      // e o caso (b) era lido como (c). Medido: o valor correto era pintado
      // aos ~2,0 s, apagado aos ~3,3–4,4 s, e repintado igual aos ~5,2–6,6 s.
      //
      // `refetchSaldo` (senhas) nunca sofreu disto porque só depende do
      // `address`: assim que ele existe, o seu ramo de limpeza é inalcançável.
      //
      // Passa a limpar-se APENAS quando o ENDEREÇO desaparece depois de ter
      // existido, que é a definição de logout.
      if (!address && jaTeveEnderecoRef.current) {
        setSaldoRsCentavos(null);
        setSaldoRsStatus("idle");
      }
      return;
    }
    setSaldoRsStatus((prev) => (prev === "ok" || prev === "stale" ? prev : "loading"));
    try {
      const resp = await apiGet(`saldo-rs?endereco=${encodeURIComponent(address)}`, {
        token: authToken,
        headers: visitorId ? { "X-Visitor-ID": visitorId } : undefined,
      });
      if (resp.status === 401) {
        // Token expirado/inválido — limpa e re-obtém.
        checkJwtFailures("saldo-rs");
        setAuthToken(null);
        try { sessionStorage.removeItem("gut_auth_user"); } catch {}
        throw new Error("token expirado");
      }
      if (resp.status === 429) {
        // Servidor pode anexar X-RateLimit-Limit; usamos como count se vier.
        const count = Number(resp.headers.get("x-ratelimit-limit")) || NaN;
        checkRateLimit("saldo-rs", count, null);
        throw new Error("HTTP 429 rate limited");
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = resp.data;
      const centavos = Number(data?.saldoCentavos ?? 0);
      setSaldoRsCentavos(centavos);
      setSaldoRsStatus("ok");
      gravarSaldoCache(address, { centavos });   // MC88.34 (P0)
    } catch (err) {
      console.warn("[GUT-DEBUG] refetchSaldoRs falhou", { address, message: err?.message });
      setSaldoRsStatus((prev) => (prev === "ok" ? "stale" : "error"));
    }
  }, [address, authToken, visitorId]);

  useEffect(() => {
    refetchSaldoRs();
    if (!address || !authToken) return;
    const id = setInterval(refetchSaldoRs, 5000);
    return () => clearInterval(id);
  }, [address, authToken, refetchSaldoRs]);

  // ── MC15.6 ITEM 2 / MC15.7 ITEM 4 — Notificações proativas: polling ADAPTATIVO
  // 10s em operação normal; 2s nos 5 min finais (tempoRestante <= 300s) da
  // edição corrente. Self-rescheduling setTimeout: cada tick relê a cadência
  // de prazoNotifRef — sem timers duplicados, sem recriar o efeito a cada
  // segundo. Pausa quando a aba não está visível (visibilitychange). Gated em
  // authToken: serve admin (eventos de sistema) E participante (Blob próprio).
  const refetchNotificacoes = useCallback(async () => {
    if (!address || !authToken) { setNotificacoes([]); setNotificacoesNaoLidas(0); return; }
    try {
      const resp = await apiGet("notificacoes", {
        token: authToken,
        headers: visitorId ? { "X-Visitor-ID": visitorId } : undefined,
      });
      if (!resp.ok) return;
      const data = resp.data;
      const lista = Array.isArray(data?.notificacoes) ? data.notificacoes : [];
      setNotificacoes(lista);
      // MC15.7 ITEM 4 — contagem de não-lidas:
      // - PARTICIPANTE: notificações têm campo `lida` (persistido no Blob) →
      //   badge = nº com lida === false. Some de forma estável após marcar_lidas.
      // - ADMIN: eventos de sistema NÃO têm `lida` → mantém o comportamento
      //   MC15.6 (assinatura; zera localmente ao abrir o chat).
      const temFlagLida = lista.some((n) => typeof n.lida === "boolean");
      if (temFlagLida) {
        setNotificacoesNaoLidas(lista.filter((n) => n.lida === false).length);
      } else {
        const sig = lista.map((n) => `${n.tipo}:${n.timestamp}`).join("|");
        setNotificacoesNaoLidas(sig && sig !== notifSigVistaRef.current ? lista.length : 0);
      }
    } catch (err) {
      // fail-soft: notificações nunca quebram a app
      console.warn("[GUT-DEBUG] refetchNotificacoes falhou", err?.message);
    }
  }, [address, authToken, visitorId]);

  // MC15.6 ITEM 8 — estado de pânico refletido no cliente. Derivado do polling
  // de notificações (admin recebe o evento sistema_pausado). A proteção REAL de
  // lances é server-side (gate 503 nas Functions — R10); aqui é só UX/congelamento.
  const systemPausado = notificacoes.some((n) => n.tipo === "sistema_pausado");

  // MC15.6 ITEM 11 / MC15.7 ITEM 6 — marca notificações como lidas.
  // PARTICIPANTE (notificações com campo `lida`): PERSISTE via POST
  // /notificacoes {acao:"marcar_lidas"} (R10/D5 — sem isto o badge reaparecia no
  // poll seguinte). Só zera o badge após resposta 200; falha de rede MANTÉM o
  // badge (fail-safe, não perde notificações). ADMIN (eventos de sistema, sem
  // `lida`): mantém o comportamento MC15.6 (assinatura local).
  const marcarNotificacoesLidas = useCallback(async () => {
    const temFlagLida = notificacoes.some((n) => typeof n.lida === "boolean");
    if (temFlagLida && address && authToken) {
      try {
        const resp = await apiPost("notificacoes", { acao: "marcar_lidas" }, {
          token: authToken,
          headers: visitorId ? { "X-Visitor-ID": visitorId } : undefined,
        });
        if (!resp.ok) return; // fail-safe: mantém o badge
      } catch (err) {
        console.warn("[GUT-DEBUG] marcar_lidas falhou", err?.message);
        return; // fail-safe: mantém o badge
      }
    }
    notifSigVistaRef.current = notificacoes.map((n) => `${n.tipo}:${n.timestamp}`).join("|");
    setNotificacoesNaoLidas(0);
  }, [notificacoes, address, authToken, visitorId]);

  useEffect(() => {
    if (!address || !authToken) return;
    let cancelado = false;
    let timerId = null;
    const calcularIntervalo = () => {
      const restante = Math.max(0, (prazoNotifRef.current || 0) - Math.floor(Date.now() / 1000));
      return restante > 0 && restante <= 300 ? 2000 : 10000;
    };
    const tick = async () => {
      if (cancelado) return;
      if (document.visibilityState === "visible") await refetchNotificacoes();
      if (cancelado) return;
      timerId = setTimeout(tick, calcularIntervalo());
    };
    refetchNotificacoes();
    timerId = setTimeout(tick, calcularIntervalo());
    const vis = () => { if (document.visibilityState === "visible") refetchNotificacoes(); };
    document.addEventListener("visibilitychange", vis);
    return () => {
      cancelado = true;
      if (timerId) clearTimeout(timerId);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [address, authToken, refetchNotificacoes]);

  // MC12: detectarTipoCorporativo e polling removidos. tipoUsuario vem de
  // user.customMetadata (ver bloco Privy auth acima).

  // Polling on-chain do prazo do Programado (Onda 5 FASE 0).
  // Contrato é fonte da verdade do REQ-10. Polling a cada 60s; também escuta
  // visibilitychange para re-sincronizar quando a aba volta a foco.
  useEffect(() => {
    let cancelado = false;
    const fetchOnchain = async () => {
      try {
        const onchain = await getEdicaoPrazo(EDICAO_ATIVA);
        if (cancelado || !onchain || onchain <= 0) return;
        setPrazoProgramado((prev) => {
          if (prev === onchain) return prev;
          gravarPrazoStorage(LS_PRAZO_PROG, onchain);
          return onchain;
        });
      } catch (err) {
        console.warn("[GUT-DEBUG] getEdicaoPrazo falhou (timer offline-tolerante):", err?.message);
      }
    };
    fetchOnchain();
    const id  = setInterval(fetchOnchain, 60_000);
    const vis = () => { if (document.visibilityState === "visible") fetchOnchain(); };
    document.addEventListener("visibilitychange", vis);
    return () => {
      cancelado = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  // MC16 — refs anti-duplicação da animação de fim do cronómetro.
  const fimDisparadoRef = useRef(false);
  const timeoutAnimRef = useRef(null);

  // MC15.4 ITEM 6/13 — refs de "fim disparado" POR edição. Substitui o uso
  // global do fimDisparadoRef nas páginas multi-edição: a animação de fim só
  // dispara para a edição que terminou, sem vazar estado entre edições.
  // A edição R-1 / tipoLeilao corrente continua a usar fimDisparadoRef acima.
  const fimDisparadoMapRef = useRef(new Map());
  const getFimDisparadoRef = useCallback((edicaoId) => {
    const mapa = fimDisparadoMapRef.current;
    if (!mapa.has(edicaoId)) mapa.set(edicaoId, { current: false });
    return mapa.get(edicaoId);
  }, []);

  // MC44 P0 — edicoesTick (1s) migrado para o TimerProvider (era um gatilho de
  // re-render de alta frequência no value do AppContext).

  // Máquina de fim de leilão. Cálculo é ABSOLUTO: `prazo - now`. O setInterval
  // (250ms) NÃO seta mais tempoRestante (isso é do TimerProvider) — só dispara
  // encerrado/overlay/lightning quando o prazo chega a 0, pelo que o AppProvider
  // re-renderiza apenas no fim do leilão, não a cada tick.
  useEffect(() => {
    const tick = () => {
      const restante = Math.max(0, prazoTimestamp - Math.floor(Date.now() / 1000));
      if (restante === 0) {
        setEncerrado(true);
        // MC16 — flag impede múltiplos disparos quando encerrado
        // muda e o efeito re-executa com restante ainda === 0.
        if (!fimDisparadoRef.current) {
          fimDisparadoRef.current = true;
          setLightningActive(true);
          // Limpa timeout anterior (defesa em profundidade)
          if (timeoutAnimRef.current) clearTimeout(timeoutAnimRef.current);
          timeoutAnimRef.current = setTimeout(() => {
            setLightningActive(false);
            // MC63/64: animação de vencedor desabilitada no front-end (não dispara
            // automaticamente ao encerrar). Encerrado/lightning permanecem ativos.
            // setShowOverlay(true);
            timeoutAnimRef.current = null;
          }, 1200);
        }
      } else if (encerrado) {
        // Caso o prazo seja atualizado on-chain depois do encerrado, reabre.
        setEncerrado(false);
        setShowOverlay(false);
        fimDisparadoRef.current = false;
      }
    };
    tick();
    const id  = setInterval(tick, 250);
    const vis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(id);
      // MC16 — NÃO limpar timeoutAnimRef aqui. Quando encerrado
      // muda (restante===0), a cleanup mata o setTimeout que ia
      // disparar showOverlay. O timeout é auto-limpante (seta
      // timeoutAnimRef=null ao executar) e handleNovaRodada faz
      // cleanup explícito.
      document.removeEventListener("visibilitychange", vis);
    };
  }, [prazoTimestamp, encerrado]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function abrirModal(opts) {
    console.info("[GUT-DEBUG] abrirModal", { ready, authenticated, hasUser: !!user, hasAddress: !!address });
    // MC11.17: abrirModal restaurado ao comportamento pré-MC11.2.
    // createOnLogin: "all-users" no PrivyProvider cria a carteira automaticamente
    // após o login — não é necessário chamar createWallet() aqui.
    if (!ready) {
      console.warn("[GUT-DEBUG] abrirModal ignorado: Privy ready=false (UI deve mostrar skeleton).");
      return;
    }
    if (authenticated && address) {
      console.info("[GUT-DEBUG] abrirModal ignorado: já autenticado e com carteira.");
      return;
    }
    if (authenticated && !address) {
      console.info("[GUT-DEBUG] abrirModal: aguardando createOnLogin criar carteira automaticamente.");
      return;
    }
    try {
      // MC15.5 — repassa opções ao login() (ex.: prefill de email do cadastro
      // corporativo) só quando vier um objeto de configuração válido. Os vários
      // onClick={abrirModal} passam um MouseEvent → sem opções de config.
      // MC62 — modal PÚBLICO restrito a Google: quando o chamador não define
      // loginMethods, aplica ["google"] (login({loginMethods}) sobrescreve o
      // config global — Privy v3, verificado). Overrides explícitos (ex.: prefill
      // ou loginMethods do corporativo) são preservados. NÃO afeta o email-OTP
      // headless (SejaNossoParceiro usa sendCode direto, sem abrirModal).
      const base = opts && (opts.prefill || opts.loginMethods) ? { ...opts } : {};
      if (!base.loginMethods) base.loginMethods = ["google"];
      const result = login(base);
      if (result && typeof result.then === "function") {
        result
          .then(() => console.info("[GUT-DEBUG] login() resolveu"))
          .catch((err) => {
            console.error("[GUT-DEBUG] login() rejeitou", {
              name:    err?.name,
              message: err?.message,
              code:    err?.code,
              stack:   err?.stack,
              raw:     err,
            });
          });
      }
    } catch (err) {
      console.error("[GUT-DEBUG] login() jogou síncrono", {
        name: err?.name, message: err?.message, stack: err?.stack, raw: err,
      });
    }
  }

  function desconectar() {
    logout();
  }

  function handleLanceSucesso({ address: addr, valorCentavos, txHash, nomeExibicao }) {
    // Sentry security alert: detecta burst de lances por endereço (>10/min)
    // e checa anomalia geográfica (3+ timezones em 5 min). Captura passiva,
    // não bloqueia o fluxo.
    checkBurstCompras(addr);
    checkGeoAnomaly();
    const novoLance = {
      endereco: addr, valor: valorCentavos, txHash,
      nomeExibicao: nomeExibicao || null,
    };
    const setter = tipoLeilao === "flash" ? setLancesFlash : setLances;
    setter((prev) => {
      const jaRepetido = prev.some((l) => l.valor === valorCentavos);
      return [
        ...prev.map((l) => l.valor === valorCentavos ? { ...l, repetido: true } : l),
        { ...novoLance, repetido: jaRepetido },
      ];
    });
  }

  function handleNovaRodada() {
    setEncerrado(false);
    setShowOverlay(false);
    setLightningActive(false);
    setLances([]);
    setLancesFlash([]);
    setShowCountdown(true);
    // MC16 — reseta flag para animação disparar na nova edição
    fimDisparadoRef.current = false;
    if (timeoutAnimRef.current) { clearTimeout(timeoutAnimRef.current); timeoutAnimRef.current = null; }
    setTimeout(() => {
      const dur = DURACAO[tipoLeilao];
      // setPrazoTimestamp também persiste no localStorage (chave do tipo atual).
      // MC44 P0 — tempoRestante recalcula-se sozinho no TimerProvider (cálculo
      // absoluto a partir do novo prazoTimestamp); não há setter local a chamar.
      setPrazoTimestamp(Math.floor(Date.now() / 1000) + dur);
      setShowCountdown(false);
    }, 3500);
  }

  // ── Value ────────────────────────────────────────────────────────────────
  const value = {
    EDICAO_ATIVA, DURACAO,
    tipoLeilao, setTipoLeilao,
    // MC15.4 — múltiplas edições (aditivo). edicoes nunca é vazio (R-1 garantida).
    edicoes, edicoesStatus,
    getFimDisparadoRef,
    // MC44 P0 — timeLeftEdicaoSegundos/edicoesTick/tempoRestante movidos para
    // o AppTimerContext (useAppTimer); fora do value estável do AppContext.
    lances: lancesExibidos,
    prazoTimestamp, setPrazoTimestamp,
    prazoFlash, prazoProgramado,
    encerrado,
    showOverlay,
    showCountdown,
    lightningActive,
    saldoSenhas,
    saldoSenhasStatus,
    refetchSaldo,
    saldoRsCentavos,
    saldoRsStatus,
    refetchSaldoRs,
    // MC15.6 ITEM 2 — notificações proativas (polling adaptativo).
    notificacoes,
    notificacoesNaoLidas,
    refetchNotificacoes,
    marcarNotificacoesLidas,
    // MC15.6 ITEM 8 — kill switch refletido no cliente.
    systemPausado,
    // MC12.2 — tipo de usuário (cotas blob), cota e carteiras corporativas.
    tipoUsuario,
    tipoCarregando,
    atualizarTipoCorporativo,
    cotaCorporativa,
    corporativoWallet,
    addressCorporativo,
    authToken,
    obterAuthToken,
    address, privyWallet, isConnected, userLabel, ready, authenticated, user,
    // MC88.37 — só para escolher o TEXTO mostrado durante o restauro do Privy.
    // Nunca usar para habilitar ações: para isso continua a valer isConnected.
    pareceAutenticado,
    // MC88.42 — tipo com palpite otimista, só para lojista já confirmado antes
    // neste endereço. Serve para ENCAMINHAR cedo; `tipoUsuario` continua a ser
    // a verdade confirmada e é ele que decide expulsar de uma rota.
    tipoProvavel,
    // MC89.31 — mesma natureza do `tipoProvavel`, para o ADM. Fotografia do
    // arranque; só ENCAMINHA. Quem autoriza é o backend (AdminLayout/`isAdmin`).
    adminProvavel,
    // MC89.36 — "a pergunta /cotas já foi respondida". Distingue "ainda não sei"
    // de "sei que é comum", que era a ambiguidade que punha o lojista a olhar
    // para o Dashboard errado. Só ENCAMINHA.
    tipoResolvido,
    // MC89.40 (F2) — `true` | `false` | `null` (ainda não sei). AUTORIZA o que
    // se pode fazer dentro do painel; não confundir com `tipoUsuario`, que só
    // ENCAMINHA. Quem impede de facto é o servidor.
    cotaAtiva,
    // MC89.36.1 — "há um login a decorrer neste instante" (params do OAuth no
    // URL). Fecha os 1 889 ms de Dashboard comum medidos no login fresco, em que
    // nem `gut_saldo_cache` nem `privy:connections` existem ainda.
    loginEmCurso,
    // MC89.31 — "há sessão em disco e o Privy ainda não respondeu". Só para
    // escolher entre esperar e pedir login. Nunca para habilitar ações.
    restaurandoSessao,
    vencedor,
    abrirModal,
    desconectar,
    handleLanceSucesso,
    handleNovaRodada,
    // ── Analytics (MC8) ────────────────────────────────────────────────────
    trackPageview, trackClickComprar, trackTempoSessao, trackScroll,
  };

  return (
    <AppContext.Provider value={value}>
      <TimerProvider>{children}</TimerProvider>
    </AppContext.Provider>
  );
}

// MC44 P0 — Provider ANINHADO que possui o estado de timer de alta frequência.
// Fica abaixo do AppContext.Provider (lê prazo/tipo via useAppContext), pelo que
// o seu re-render a cada tick NÃO afeta o AppProvider nem os consumidores de
// useAppContext — só quem usa useAppTimer (os componentes de cronómetro).
function TimerProvider({ children }) {
  const { prazoTimestamp, tipoLeilao, prazoFlash, prazoProgramado } = useAppContext();

  // Cronómetro da edição ativa (display). Cálculo ABSOLUTO (prazo - now); o
  // setInterval só re-renderiza (250ms) e React ignora o setState quando o
  // inteiro de segundos não muda → re-render efetivo ~1×/s, só aqui.
  const [tempoRestante, setTempoRestante] = useState(() => Math.max(0,
    (tipoLeilao === "flash" ? prazoFlash : prazoProgramado) - Math.floor(Date.now() / 1000)
  ));
  useEffect(() => {
    const tick = () => setTempoRestante(Math.max(0, prazoTimestamp - Math.floor(Date.now() / 1000)));
    tick();
    const id = setInterval(tick, 250);
    const vis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, [prazoTimestamp]);

  // Tick global (1s) para re-render das grelhas que derivam timeLeft por edição
  // (Dashboard/Vitrine/MercadoLances). Cálculo permanece absoluto; só força o render.
  const [edicoesTick, setEdicoesTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setEdicoesTick((n) => (n + 1) % 1_000_000), 1000);
    const vis = () => { if (document.visibilityState === "visible") setEdicoesTick((n) => (n + 1) % 1_000_000); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, []);

  const timerValue = useMemo(
    () => ({ tempoRestante, edicoesTick, timeLeftEdicaoSegundos }),
    [tempoRestante, edicoesTick]
  );
  return <AppTimerContext.Provider value={timerValue}>{children}</AppTimerContext.Provider>;
}
