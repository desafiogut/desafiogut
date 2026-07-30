// adminAuth — máquina de estados da sessão admin, SEM React e SEM import.meta.
//
// MC89.6 (Fase 0 do plano do MC89.5). Esta lógica vivia dentro de
// `pages/AdminPanel.jsx` (linhas 51-86 e 659-811 da versão anterior). Sai daí por
// duas razões:
//
//   1. Com rotas aninhadas (D-NAV), as sete telas partilham a mesma sessão. Um
//      `useRef` dentro de um componente não é partilhável sem contexto.
//   2. É a única parte deste domínio que pode partir em silêncio — rotação de
//      refresh, retry em 401, revogação. Isolada e pura, testa-se com `node:test`
//      sem instalar runner nenhum, seguindo o precedente de
//      `src/lib/creditoPolling.test.mjs` (MC59.6).
//
// ⚠️ MODELO DE SEGURANÇA — PRESERVADO TAL E QUAL DO MC1, NÃO REINVENTADO:
//   · o ACCESS token vive apenas nesta closure. Não é devolvido por nenhum
//     método, não vai para storage, não é registado em log. `temToken()` diz se
//     existe; não diz qual é.
//   · o REFRESH token vai para sessionStorage (não localStorage): morre com a
//     aba. Há teste a afirmar as duas coisas.
//   · nada aqui escreve `console.log` do que quer que seja com token dentro.
//
// Tudo o que toca o mundo é injetado (`fetch`, `storage`, `agora`), para que o
// teste não precise de browser, de rede nem de esperar 12 minutos.

export const CHAVE_REFRESH       = "gut_admin_refresh";
export const CHAVE_TOKEN_LEGADO  = "gut_admin_token"; // limpo na migração MC1
export const ENDPOINT_AUTH       = "/.netlify/functions/auth-admin";

export const TTL_REFRESH_MS         = 7 * 24 * 60 * 60 * 1000; // 7 dias
export const INTERVALO_REFRESH_MS   = 12 * 60 * 1000;          // 12 min
// A margem sob o TTL de 15 min do access token é deliberada: 3 minutos para uma
// rede lenta falhar e voltar a tentar antes de o token morrer de facto.

export const PREFIXO_MENSAGEM = "DESAFIOGUT-ADMIN:";

/** Estados possíveis da sessão. Mesmos nomes da versão anterior (sem tradução). */
export const ESTADOS = Object.freeze({
  SEM_LOGIN:   "needs-login",
  A_ENTRAR:    "logging-in",
  AUTENTICADO: "authenticated",
  A_RENOVAR:   "refreshing",
  ERRO:        "error",
});

// ── Persistência do refresh ─────────────────────────────────────────────────
// `storage` é qualquer coisa com getItem/setItem/removeItem. Em produção é o
// sessionStorage; no teste é um Map. Nunca se assume `window`.

/** Lê o registo de refresh, ou null se ausente, corrompido ou expirado. */
export function lerRefresh(storage, agora = Date.now) {
  if (!storage) return null;
  try {
    const bruto = storage.getItem(CHAVE_REFRESH);
    if (!bruto) return null;
    const reg = JSON.parse(bruto);
    if (!reg?.refreshToken || !reg?.endereco) return null;
    if (typeof reg.expiresAt === "number" && agora() >= reg.expiresAt) return null;
    return reg;
  } catch {
    // JSON partido é indistinguível de "não há sessão" para quem chama, e a
    // recuperação é a mesma: pedir login. Não vale a pena propagar.
    return null;
  }
}

export function gravarRefresh(storage, refreshToken, endereco, agora = Date.now) {
  if (!storage) return;
  try {
    storage.setItem(CHAVE_REFRESH, JSON.stringify({
      refreshToken,
      endereco: String(endereco).toLowerCase(),
      expiresAt: agora() + TTL_REFRESH_MS,
    }));
  } catch { /* storage cheio ou bloqueado: a sessão degrada para "só memória" */ }
}

export function limparRefresh(storage) {
  if (!storage) return;
  try { storage.removeItem(CHAVE_REFRESH); } catch {}
}

export function limparTokenLegado(storage) {
  if (!storage) return;
  try { storage.removeItem(CHAVE_TOKEN_LEGADO); } catch {}
}

/**
 * Há uma sessão guardada utilizável para ESTE endereço?
 *
 * O endereço importa: se o ADM trocar de carteira sem fechar a aba, o refresh da
 * carteira anterior continua no storage e seria enviado em nome do endereço
 * errado. O backend recusaria — mas o pedido não deve sequer sair.
 */
export function sessaoValidaPara(storage, endereco, agora = Date.now) {
  const reg = lerRefresh(storage, agora);
  if (!reg) return false;
  return reg.endereco === String(endereco || "").toLowerCase();
}

/** Mensagem EIP-191 assinada no login. Formato fixado pelo backend (auth-admin.mjs:79-89). */
export function montarMensagemLogin(endereco, agora = Date.now) {
  return `${PREFIXO_MENSAGEM}${agora()}:${String(endereco).toLowerCase()}`;
}

// ── Sessão ──────────────────────────────────────────────────────────────────

/**
 * Cria a máquina de estados da sessão admin.
 *
 * @param {object} deps
 * @param {typeof globalThis.fetch} deps.fetch
 * @param {{getItem,setItem,removeItem}} deps.storage
 * @param {() => number} [deps.agora]
 * @param {(estado: string, erro: string) => void} [deps.aoMudarEstado]
 *        Chamado a cada transição. É por aqui que o React re-renderiza — este
 *        módulo não sabe que o React existe.
 */
export function criarSessaoAdmin({ fetch, storage, agora = Date.now, aoMudarEstado = () => {} }) {
  if (typeof fetch !== "function") throw new Error("adminAuth: `fetch` é obrigatório");

  // ⚠️ SÓ AQUI. Não sai desta closure por método nenhum.
  let accessToken   = null;
  let enderecoAdmin = null;
  let estado        = ESTADOS.SEM_LOGIN;
  let erro          = "";

  function definirEstado(novoEstado, novoErro = "") {
    estado = novoEstado;
    erro   = novoErro;
    aoMudarEstado(estado, erro);
  }

  function esquecer() {
    accessToken   = null;
    enderecoAdmin = null;
    limparRefresh(storage);
  }

  async function pedirAuth(corpo) {
    const resp = await fetch(ENDPOINT_AUTH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dados = await resp.json().catch(() => null);
    return { resp, dados };
  }

  /**
   * Troca o refresh guardado por um par novo (rotação).
   * @returns {Promise<boolean>} sucesso
   */
  async function renovar() {
    const reg = lerRefresh(storage, agora);
    if (!reg) return false;

    // Só sinaliza "a renovar" se já estava autenticado: durante o arranque a
    // renovação é invisível e não deve piscar um estado intermédio no ecrã.
    if (estado === ESTADOS.AUTENTICADO) definirEstado(ESTADOS.A_RENOVAR);

    try {
      const { resp, dados } = await pedirAuth({
        acao: "refresh", endereco: reg.endereco, refreshToken: reg.refreshToken,
      });
      if (!resp.ok || !dados?.accessToken) {
        // O refresh foi recusado: ou expirou, ou foi revogado, ou o endereço
        // deixou de ser admin. Em qualquer dos casos a sessão acabou — apagar é
        // o correto, e não voltar a tentar com o mesmo token morto.
        esquecer();
        definirEstado(ESTADOS.SEM_LOGIN);
        return false;
      }
      accessToken   = dados.accessToken;
      enderecoAdmin = reg.endereco;
      gravarRefresh(storage, dados.refreshToken, reg.endereco, agora);
      definirEstado(ESTADOS.AUTENTICADO);
      return true;
    } catch {
      // Falha de REDE não é sessão inválida: o refresh guardado continua a valer
      // e a próxima tentativa (timer ou 401) pode ter sucesso. Por isso NÃO se
      // chama esquecer() aqui — apagar a sessão por causa de um túnel seria
      // obrigar a reautenticar por nada.
      definirEstado(ESTADOS.SEM_LOGIN);
      return false;
    }
  }

  /**
   * Login inicial: assinatura EIP-191 + ADMIN_TOKEN legado (uma única vez).
   *
   * @param {object} args
   * @param {string} args.endereco
   * @param {(mensagem: string) => Promise<string>} args.assinar
   *        Injetado: em produção é a wallet Privy; no teste é uma função.
   *        É este parâmetro que mantém o módulo livre de ethers e de Privy.
   * @param {string} args.adminToken  descartado após o pedido
   */
  async function entrar({ endereco, assinar, adminToken }) {
    if (!endereco || typeof assinar !== "function") {
      definirEstado(ESTADOS.ERRO, "Carteira Privy ausente — reconecte e tente novamente.");
      return false;
    }
    definirEstado(ESTADOS.A_ENTRAR);
    const enderecoLower = String(endereco).toLowerCase();
    try {
      const mensagem  = montarMensagemLogin(enderecoLower, agora);
      const assinatura = await assinar(mensagem);
      const { resp, dados } = await pedirAuth({
        acao: "login",
        endereco: enderecoLower,
        signature: assinatura,
        message: mensagem,
        adminToken,
      });
      if (!resp.ok || !dados?.accessToken) {
        definirEstado(ESTADOS.ERRO, dados?.error?.message || `HTTP ${resp.status}`);
        return false;
      }
      accessToken   = dados.accessToken;
      enderecoAdmin = enderecoLower;
      gravarRefresh(storage, dados.refreshToken, enderecoLower, agora);
      definirEstado(ESTADOS.AUTENTICADO);
      return true;
    } catch (err) {
      definirEstado(ESTADOS.ERRO, err?.message || "falha ao autenticar");
      return false;
    }
  }

  /** Revoga no backend e limpa localmente. O local limpa-se SEMPRE, mesmo se a rede falhar. */
  async function sair() {
    const reg = lerRefresh(storage, agora);
    esquecer();
    definirEstado(ESTADOS.SEM_LOGIN);
    if (!reg?.endereco) return;
    try {
      await pedirAuth({ acao: "logout", endereco: reg.endereco });
    } catch {
      // Já não há credencial no cliente. Se a revogação no servidor falhou, o
      // refresh continua válido lá até expirar — é o mesmo risco de sempre e
      // não há nada a fazer daqui. Não reverter o logout local por causa disso.
    }
  }

  /**
   * `fetch` autenticado. Junta o Bearer e, num único 401, tenta renovar e repete.
   *
   * UMA tentativa, não um ciclo: se a renovação devolve um token que também dá
   * 401, o problema não é o token — é a autorização — e insistir só multiplica
   * pedidos contra um backend que já disse não.
   */
  async function chamarAdmin(url, init = {}) {
    if (!accessToken) throw new Error("sem token admin — faça login");
    const cabecalhos = {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    };
    let resp = await fetch(url, { ...init, headers: cabecalhos });
    if (resp.status === 401) {
      const ok = await renovar();
      if (ok) {
        cabecalhos.Authorization = `Bearer ${accessToken}`;
        resp = await fetch(url, { ...init, headers: cabecalhos });
      }
    }
    return resp;
  }

  return {
    entrar,
    renovar,
    sair,
    chamarAdmin,
    /** @returns {string} um dos ESTADOS */
    obterEstado:   () => estado,
    obterErro:     () => erro,
    obterEndereco: () => enderecoAdmin,
    /** Existe access token? Deliberadamente NÃO devolve o token. */
    temToken:      () => accessToken !== null,
    /** Descarta o estado em memória sem falar com o servidor (desmontagem). */
    descartar:     () => { accessToken = null; enderecoAdmin = null; },
  };
}
