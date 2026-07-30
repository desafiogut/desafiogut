// MC89.6 — testes da máquina de estados da sessão admin.
// node --test src/lib/adminAuth.test.mjs
//
// Segue o precedente do MC59.6 (creditoPolling.test.mjs): a lógica é pura, com
// fetch/storage/relógio injetáveis, portanto testa-se sem browser, sem rede e
// sem esperar 12 minutos.
//
// Cada teste aqui foi validado por MUTAÇÃO — partir a linha correspondente em
// adminAuth.js e ver este teste ficar vermelho. Um teste que passa não prova
// nada até se ter visto falhar ([[testar-teste-novo-por-mutacao]]).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  criarSessaoAdmin, lerRefresh, gravarRefresh, limparRefresh, sessaoValidaPara,
  montarMensagemLogin, CHAVE_REFRESH, ESTADOS, TTL_REFRESH_MS, PREFIXO_MENSAGEM,
} from "./adminAuth.js";

// ── Duplos ───────────────────────────────────────────────────────────────────

/** sessionStorage de brincar. Expõe o mapa para se poder inspecionar o que lá ficou. */
function storageFalso(inicial = {}) {
  const mapa = new Map(Object.entries(inicial));
  return {
    getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
    setItem: (k, v) => mapa.set(k, String(v)),
    removeItem: (k) => mapa.delete(k),
    _mapa: mapa,
  };
}

/**
 * fetch que devolve respostas de uma fila e regista o que recebeu.
 *
 * ⚠️ Os cabeçalhos são copiados no momento da chamada, não guardados por
 * referência: `chamarAdmin` reutiliza e MUTA o seu objeto de cabeçalhos ao
 * repetir depois de um 401, e um duplo que guarde a referência mostra o valor
 * final em todas as chamadas — apagando exatamente a diferença que o teste do
 * retry existe para observar.
 */
function fetchFalso(respostas) {
  const chamadas = [];
  const fila = [...respostas];
  const fn = async (url, init = {}) => {
    chamadas.push({ url, init: { ...init, headers: { ...(init.headers || {}) } } });
    const r = fila.shift();
    if (!r) throw new Error(`fetchFalso: sem resposta preparada para ${url}`);
    if (r.lancar) throw new Error(r.lancar);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.corpo,
    };
  };
  fn.chamadas = chamadas;
  return fn;
}

const PAR_OK = {
  status: 200,
  corpo: { accessToken: "access-1", refreshToken: "refresh-1", tokenType: "Bearer" },
};
const ENDERECO = "0xda3a83a24b25aa71e1a9b5a74503ffa93487e84e";
const assinarOk = async (m) => `assinatura-de(${m})`;

function novaSessao({ respostas = [], storage = storageFalso(), agora = () => 1_000_000 } = {}) {
  const transicoes = [];
  const fetch = fetchFalso(respostas);
  const sessao = criarSessaoAdmin({
    fetch, storage, agora,
    aoMudarEstado: (estado, erro) => transicoes.push({ estado, erro }),
  });
  return { sessao, fetch, storage, transicoes };
}

// ── 1. Login ────────────────────────────────────────────────────────────────

test("login com credenciais válidas → estado autenticado e refresh guardado", async () => {
  const { sessao, storage, transicoes } = novaSessao({ respostas: [PAR_OK] });

  const ok = await sessao.entrar({ endereco: ENDERECO, assinar: assinarOk, adminToken: "legado" });

  assert.equal(ok, true);
  assert.equal(sessao.obterEstado(), ESTADOS.AUTENTICADO);
  assert.equal(sessao.temToken(), true);
  assert.equal(sessao.obterEndereco(), ENDERECO);
  assert.deepEqual(transicoes.map((t) => t.estado), [ESTADOS.A_ENTRAR, ESTADOS.AUTENTICADO]);

  const guardado = JSON.parse(storage.getItem(CHAVE_REFRESH));
  assert.equal(guardado.refreshToken, "refresh-1");
  assert.equal(guardado.endereco, ENDERECO);
  assert.equal(guardado.expiresAt, 1_000_000 + TTL_REFRESH_MS);
});

test("login recusado pelo backend → estado erro com a mensagem do servidor", async () => {
  const { sessao, storage } = novaSessao({
    respostas: [{ status: 401, corpo: { error: { message: "adminToken legado inválido" } } }],
  });

  const ok = await sessao.entrar({ endereco: ENDERECO, assinar: assinarOk, adminToken: "errado" });

  assert.equal(ok, false);
  assert.equal(sessao.obterEstado(), ESTADOS.ERRO);
  assert.equal(sessao.obterErro(), "adminToken legado inválido");
  assert.equal(sessao.temToken(), false);
  // Nada foi guardado: um login falhado não pode deixar rasto utilizável.
  assert.equal(storage.getItem(CHAVE_REFRESH), null);
});

test("login sem carteira (assinar ausente) → erro, e NENHUM pedido sai para a rede", async () => {
  const { sessao, fetch } = novaSessao({ respostas: [PAR_OK] });

  const ok = await sessao.entrar({ endereco: ENDERECO, assinar: undefined, adminToken: "legado" });

  assert.equal(ok, false);
  assert.equal(sessao.obterEstado(), ESTADOS.ERRO);
  assert.equal(fetch.chamadas.length, 0, "não deve chamar o backend sem ter o que assinar");
});

test("assinatura rejeitada pelo utilizador → erro, sem sessão", async () => {
  const { sessao, fetch } = novaSessao({ respostas: [PAR_OK] });

  const ok = await sessao.entrar({
    endereco: ENDERECO,
    assinar: async () => { throw new Error("User rejected the request"); },
    adminToken: "legado",
  });

  assert.equal(ok, false);
  assert.equal(sessao.obterEstado(), ESTADOS.ERRO);
  assert.equal(sessao.obterErro(), "User rejected the request");
  assert.equal(fetch.chamadas.length, 0, "recusa na carteira não chega a falar com o backend");
});

test("a mensagem assinada tem o formato que o backend exige", async () => {
  const msg = montarMensagemLogin("0xABCDEF", () => 1234);
  assert.equal(msg, `${PREFIXO_MENSAGEM}1234:0xabcdef`);
  // auth-admin.mjs:79-89 exige prefixo, timestamp em [1] e endereço lowercase em [2].
  const partes = msg.split(":");
  assert.equal(partes[0] + ":", PREFIXO_MENSAGEM);
  assert.equal(Number(partes[1]), 1234);
  assert.equal(partes[2], "0xabcdef");
});

// ── 2. Segurança do armazenamento ───────────────────────────────────────────

test("SEGURANÇA: o access token nunca chega ao storage nem é devolvido por método nenhum", async () => {
  const { sessao, storage } = novaSessao({ respostas: [PAR_OK] });
  await sessao.entrar({ endereco: ENDERECO, assinar: assinarOk, adminToken: "legado" });

  const tudoOQueFoiGuardado = JSON.stringify([...storage._mapa.entries()]);
  assert.equal(
    tudoOQueFoiGuardado.includes("access-1"), false,
    "o access token não pode ser persistido — vive só em memória (modelo do MC1)",
  );

  // E não há porta de saída: nenhum valor exposto pelo objeto é o token.
  for (const valor of Object.values(sessao)) {
    assert.notEqual(valor, "access-1");
  }
  assert.equal(sessao.accessToken, undefined);
  assert.equal(sessao.temToken(), true, "existe — mas quem pergunta só sabe isso");
});

test("SEGURANÇA: o adminToken legado não é persistido", async () => {
  const { sessao, storage } = novaSessao({ respostas: [PAR_OK] });
  await sessao.entrar({ endereco: ENDERECO, assinar: assinarOk, adminToken: "SEGREDO-LEGADO" });

  const tudo = JSON.stringify([...storage._mapa.entries()]);
  assert.equal(tudo.includes("SEGREDO-LEGADO"), false);
});

// ── 3. Renovação ────────────────────────────────────────────────────────────

test("renovar rotaciona o refresh guardado", async () => {
  const storage = storageFalso();
  gravarRefresh(storage, "refresh-antigo", ENDERECO, () => 1_000_000);
  const { sessao, fetch } = novaSessao({
    storage,
    respostas: [{ status: 200, corpo: { accessToken: "access-2", refreshToken: "refresh-novo" } }],
  });

  const ok = await sessao.renovar();

  assert.equal(ok, true);
  assert.equal(sessao.obterEstado(), ESTADOS.AUTENTICADO);
  assert.equal(JSON.parse(storage.getItem(CHAVE_REFRESH)).refreshToken, "refresh-novo");
  assert.equal(JSON.parse(fetch.chamadas[0].init.body).acao, "refresh");
});

test("renovar sem refresh guardado devolve false e não chama a rede", async () => {
  const { sessao, fetch } = novaSessao({ respostas: [PAR_OK] });
  assert.equal(await sessao.renovar(), false);
  assert.equal(fetch.chamadas.length, 0);
});

test("refresh recusado (401) apaga a sessão guardada", async () => {
  const storage = storageFalso();
  gravarRefresh(storage, "refresh-revogado", ENDERECO, () => 1_000_000);
  const { sessao } = novaSessao({
    storage,
    respostas: [{ status: 401, corpo: { error: { message: "refresh rejeitado" } } }],
  });

  assert.equal(await sessao.renovar(), false);
  assert.equal(sessao.obterEstado(), ESTADOS.SEM_LOGIN);
  assert.equal(storage.getItem(CHAVE_REFRESH), null, "token morto não pode ficar para trás");
});

test("falha de REDE no refresh NÃO apaga a sessão guardada", async () => {
  const storage = storageFalso();
  gravarRefresh(storage, "refresh-bom", ENDERECO, () => 1_000_000);
  const { sessao } = novaSessao({ storage, respostas: [{ lancar: "Failed to fetch" }] });

  assert.equal(await sessao.renovar(), false);
  assert.notEqual(
    storage.getItem(CHAVE_REFRESH), null,
    "um túnel não é uma revogação — perder a sessão aqui obrigaria a reautenticar por nada",
  );
});

test("renovar a partir de autenticado passa por 'refreshing'; no arranque não pisca", async () => {
  const storage = storageFalso();
  gravarRefresh(storage, "r0", ENDERECO, () => 1_000_000);

  // Arranque: sem estado prévio, a renovação é invisível.
  const arranque = novaSessao({ storage, respostas: [{ status: 200, corpo: { accessToken: "a", refreshToken: "r1" } }] });
  await arranque.sessao.renovar();
  assert.deepEqual(arranque.transicoes.map((t) => t.estado), [ESTADOS.AUTENTICADO]);

  // Já autenticado: a transição intermédia aparece (é o "⟳ Renovando" do ecrã).
  const depois = novaSessao({ storage, respostas: [
    PAR_OK,
    { status: 200, corpo: { accessToken: "a2", refreshToken: "r2" } },
  ] });
  await depois.sessao.entrar({ endereco: ENDERECO, assinar: assinarOk, adminToken: "l" });
  depois.transicoes.length = 0;
  await depois.sessao.renovar();
  assert.deepEqual(depois.transicoes.map((t) => t.estado), [ESTADOS.A_RENOVAR, ESTADOS.AUTENTICADO]);
});

// ── 4. chamarAdmin ──────────────────────────────────────────────────────────

test("chamarAdmin sem sessão lança em vez de fazer um pedido anónimo", async () => {
  const { sessao, fetch } = novaSessao();
  await assert.rejects(() => sessao.chamarAdmin("/x"), /sem token admin/);
  assert.equal(fetch.chamadas.length, 0);
});

test("chamarAdmin envia o Bearer e preserva os cabeçalhos de quem chama", async () => {
  const { sessao, fetch } = novaSessao({ respostas: [PAR_OK, { status: 200, corpo: { ok: true } }] });
  await sessao.entrar({ endereco: ENDERECO, assinar: assinarOk, adminToken: "l" });

  await sessao.chamarAdmin("/.netlify/functions/admin-stats", { headers: { "x-visitor-id": "v1" } });

  const pedido = fetch.chamadas[1];
  assert.equal(pedido.init.headers.Authorization, "Bearer access-1");
  assert.equal(pedido.init.headers["x-visitor-id"], "v1");
  assert.equal(pedido.init.headers["Content-Type"], "application/json");
});

test("401 → renova UMA vez e repete o pedido com o token novo", async () => {
  const { sessao, fetch } = novaSessao({ respostas: [
    PAR_OK,                                                              // login
    { status: 401, corpo: {} },                                          // 1ª tentativa
    { status: 200, corpo: { accessToken: "access-9", refreshToken: "r9" } }, // refresh
    { status: 200, corpo: { dados: 1 } },                                // repetição
  ] });
  await sessao.entrar({ endereco: ENDERECO, assinar: assinarOk, adminToken: "l" });

  const resp = await sessao.chamarAdmin("/.netlify/functions/admin-stats");

  assert.equal(resp.status, 200);
  assert.equal(fetch.chamadas.length, 4);
  assert.equal(fetch.chamadas[1].init.headers.Authorization, "Bearer access-1");
  assert.equal(fetch.chamadas[3].init.headers.Authorization, "Bearer access-9",
    "a repetição tem de usar o token NOVO, não o que já tinha sido recusado");
});

test("401 com refresh também recusado → devolve o 401 sem entrar em ciclo", async () => {
  const { sessao, fetch } = novaSessao({ respostas: [
    PAR_OK,
    { status: 401, corpo: {} },   // 1ª tentativa
    { status: 401, corpo: {} },   // refresh recusado
  ] });
  await sessao.entrar({ endereco: ENDERECO, assinar: assinarOk, adminToken: "l" });

  const resp = await sessao.chamarAdmin("/x");

  assert.equal(resp.status, 401);
  assert.equal(fetch.chamadas.length, 3, "uma tentativa de renovação, não um ciclo");
  assert.equal(sessao.obterEstado(), ESTADOS.SEM_LOGIN);
});

// ── 5. Logout ───────────────────────────────────────────────────────────────

test("logout revoga no backend e limpa tudo localmente", async () => {
  const { sessao, fetch, storage } = novaSessao({ respostas: [PAR_OK, { status: 200, corpo: { ok: true } }] });
  await sessao.entrar({ endereco: ENDERECO, assinar: assinarOk, adminToken: "l" });

  await sessao.sair();

  assert.equal(sessao.temToken(), false);
  assert.equal(sessao.obterEstado(), ESTADOS.SEM_LOGIN);
  assert.equal(storage.getItem(CHAVE_REFRESH), null);
  const corpo = JSON.parse(fetch.chamadas[1].init.body);
  assert.equal(corpo.acao, "logout");
  assert.equal(corpo.endereco, ENDERECO);
});

test("logout limpa localmente mesmo se a revogação no servidor falhar", async () => {
  const { sessao, storage } = novaSessao({ respostas: [PAR_OK, { lancar: "Failed to fetch" }] });
  await sessao.entrar({ endereco: ENDERECO, assinar: assinarOk, adminToken: "l" });

  await sessao.sair();

  assert.equal(sessao.temToken(), false, "a credencial local sai sempre — a rede não decide isso");
  assert.equal(storage.getItem(CHAVE_REFRESH), null);
});

// ── 6. Persistência ─────────────────────────────────────────────────────────

test("lerRefresh devolve null para expirado, corrompido, incompleto ou ausente", () => {
  const agoraFixo = () => 5_000;

  const expirado = storageFalso({
    [CHAVE_REFRESH]: JSON.stringify({ refreshToken: "r", endereco: ENDERECO, expiresAt: 4_999 }),
  });
  assert.equal(lerRefresh(expirado, agoraFixo), null);

  assert.equal(lerRefresh(storageFalso({ [CHAVE_REFRESH]: "{{{ isto não é json" }), agoraFixo), null);
  assert.equal(lerRefresh(storageFalso({ [CHAVE_REFRESH]: JSON.stringify({ endereco: ENDERECO }) }), agoraFixo), null);
  assert.equal(lerRefresh(storageFalso(), agoraFixo), null);
  assert.equal(lerRefresh(null, agoraFixo), null, "sem storage (SSR) não pode rebentar");
});

test("sessaoValidaPara rejeita a sessão de OUTRA carteira", () => {
  const storage = storageFalso();
  gravarRefresh(storage, "r", ENDERECO, () => 1_000);

  assert.equal(sessaoValidaPara(storage, ENDERECO.toUpperCase(), () => 1_000), true);
  assert.equal(sessaoValidaPara(storage, "0x0000000000000000000000000000000000000001", () => 1_000), false,
    "trocar de carteira sem fechar a aba não pode reutilizar o refresh anterior");

  limparRefresh(storage);
  assert.equal(sessaoValidaPara(storage, ENDERECO, () => 1_000), false);
});

test("storage bloqueado (modo privado) não rebenta a sessão", async () => {
  const storageQueRecusa = {
    getItem: () => null,
    setItem: () => { throw new Error("QuotaExceededError"); },
    removeItem: () => { throw new Error("bloqueado"); },
  };
  const { sessao } = novaSessao({ storage: storageQueRecusa, respostas: [PAR_OK] });

  const ok = await sessao.entrar({ endereco: ENDERECO, assinar: assinarOk, adminToken: "l" });

  assert.equal(ok, true, "o login vale para a aba atual mesmo sem conseguir persistir");
  assert.equal(sessao.temToken(), true);
});
