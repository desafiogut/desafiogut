// Testes do palpite de encaminhamento do ADM (MC89.31).
//
// `lib/dicaSessao.js` é lógica pura e recebe o storage por injeção, portanto
// corre em node:test sem React e sem DOM. Não há runner de React neste frontend
// (dívida conhecida do projeto), por isso os PORTÕES do AdminLayout validam-se
// no aparelho — mas a decisão de encaminhar, que é onde mora o risco, valida-se
// aqui.
//
// correr: node --test --experimental-test-module-mocks "src/lib/*.test.mjs"

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  enderecoSessaoSincrono, gravarDicaAdmin, limparDicaAdmin, adminProvavel,
  pausarPainelAdmin, retomarPainelAdmin, painelAdminPausado,
} from "./dicaSessao.js";
// `useAdmin.js` importa React, mas não tem JSX e a parte reconciliada é pura,
// portanto importa-se em node sem runner de DOM.
import { reconciliar } from "../hooks/useAdmin.js";

const ADMIN  = "0x1e1bae7f0f6e87e15f430b620eca42b146d198cb";
const OUTRO  = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
const DIA_MS = 24 * 60 * 60 * 1000;

/** localStorage falso. `privy:connections` guarda-se com a forma real (JSON). */
function storageFalso(inicial = {}) {
  const m = new Map(Object.entries(inicial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _bruto: m,
  };
}

/** Forma realista do `privy:connections` — o endereço vem embrulhado em JSON. */
function sessaoDe(endereco) {
  return JSON.stringify([{ chainType: "ethereum", address: endereco, walletClientType: "privy" }]);
}

function comDica({ endereco = ADMIN, isAdmin = true, idadeMs = 0, sessao = ADMIN } = {}) {
  const s = storageFalso(sessao ? { "privy:connections": sessaoDe(sessao) } : {});
  s.setItem("gut_admin_hint", JSON.stringify({ endereco, isAdmin, em: Date.now() - idadeMs }));
  return s;
}

// ── enderecoSessaoSincrono ──────────────────────────────────────────────────

test("enderecoSessaoSincrono extrai o endereço do privy:connections", () => {
  const s = storageFalso({ "privy:connections": sessaoDe(ADMIN) });
  assert.equal(enderecoSessaoSincrono(s), ADMIN);
});

test("enderecoSessaoSincrono normaliza para minúsculas", () => {
  const s = storageFalso({ "privy:connections": sessaoDe("0x1E1BAE7F0F6E87E15F430B620ECA42B146D198CB") });
  assert.equal(enderecoSessaoSincrono(s), ADMIN);
});

test("enderecoSessaoSincrono devolve null sem sessão", () => {
  assert.equal(enderecoSessaoSincrono(storageFalso()), null);
});

test("enderecoSessaoSincrono devolve null se não houver endereço no meio do JSON", () => {
  const s = storageFalso({ "privy:connections": JSON.stringify([{ chainType: "ethereum" }]) });
  assert.equal(enderecoSessaoSincrono(s), null);
});

// ── adminProvavel: o caminho feliz ──────────────────────────────────────────

test("dica válida do MESMO endereço da sessão → encaminha", () => {
  assert.equal(adminProvavel(comDica()), true);
});

test("dica gravada em maiúsculas continua a bater certo com a sessão", () => {
  const s = storageFalso({ "privy:connections": sessaoDe(ADMIN) });
  gravarDicaAdmin("0x1E1BAE7F0F6E87E15F430B620ECA42B146D198CB", true, s);
  assert.equal(adminProvavel(s), true);
});

test("dica com 23 h ainda vale; com 25 h já não", () => {
  assert.equal(adminProvavel(comDica({ idadeMs: 23 * 60 * 60 * 1000 })), true);
  assert.equal(adminProvavel(comDica({ idadeMs: 25 * 60 * 60 * 1000 })), false);
});

// ── adminProvavel: as recusas que são o ponto todo ──────────────────────────

test("sem dica nenhuma → NÃO encaminha", () => {
  const s = storageFalso({ "privy:connections": sessaoDe(ADMIN) });
  assert.equal(adminProvavel(s), false);
});

test("⚠️ SEGURANÇA: dica de OUTRO endereço → NÃO encaminha", () => {
  // O ataque óbvio: escrever à mão uma dica dizendo que o admin é admin,
  // estando eu autenticado com a MINHA conta. A guarda compara com
  // `privy:connections`, que é a sessão real.
  assert.equal(adminProvavel(comDica({ endereco: ADMIN, sessao: OUTRO })), false);
});

test("⚠️ SEGURANÇA: dica forjada com o MEU endereço encaminha, mas isso não concede nada", () => {
  // Documenta a fronteira: o palpite SÓ encaminha. Quem forja isto aterra em
  // "Acesso restrito" — o mesmo que já obtinha escrevendo /admin na barra de
  // endereço. Não há ganho de superfície. Se algum dia isto passar a conceder,
  // este teste tem de falhar na revisão.
  assert.equal(adminProvavel(comDica({ endereco: OUTRO, sessao: OUTRO })), true);
});

test("sem sessão Privy em disco → NÃO encaminha, mesmo com dica", () => {
  assert.equal(adminProvavel(comDica({ sessao: null })), false);
});

test("dica com isAdmin false → NÃO encaminha", () => {
  assert.equal(adminProvavel(comDica({ isAdmin: false })), false);
});

test("dica com isAdmin truthy mas não booleano true → NÃO encaminha", () => {
  const s = storageFalso({ "privy:connections": sessaoDe(ADMIN) });
  s.setItem("gut_admin_hint", JSON.stringify({ endereco: ADMIN, isAdmin: "sim", em: Date.now() }));
  assert.equal(adminProvavel(s), false);
});

test("dica sem carimbo de tempo → NÃO encaminha (não se assume fresca)", () => {
  const s = storageFalso({ "privy:connections": sessaoDe(ADMIN) });
  s.setItem("gut_admin_hint", JSON.stringify({ endereco: ADMIN, isAdmin: true }));
  assert.equal(adminProvavel(s), false);
});

test("dica corrompida (JSON inválido) → false, sem lançar", () => {
  const s = storageFalso({ "privy:connections": sessaoDe(ADMIN) });
  s.setItem("gut_admin_hint", "{isto não é json");
  assert.equal(adminProvavel(s), false);
});

test("storage que rebenta ao ler → false, sem lançar", () => {
  const s = { getItem() { throw new Error("SecurityError"); }, setItem() {}, removeItem() {} };
  assert.equal(adminProvavel(s), false);
  assert.equal(enderecoSessaoSincrono(s), null);
});

test("sem storage nenhum (SSR) → false, sem lançar", () => {
  assert.equal(adminProvavel(null), false);
  assert.equal(enderecoSessaoSincrono(null), null);
});

// ── gravarDicaAdmin / limparDicaAdmin ───────────────────────────────────────

test("gravar com isAdmin false APAGA a dica — o ex-admin corrige-se na 1.ª resposta", () => {
  const s = comDica();
  assert.equal(adminProvavel(s), true);
  gravarDicaAdmin(ADMIN, false, s);
  assert.equal(s.getItem("gut_admin_hint"), null);
  assert.equal(adminProvavel(s), false);
});

test("gravar sem endereço não escreve nada", () => {
  const s = storageFalso({ "privy:connections": sessaoDe(ADMIN) });
  gravarDicaAdmin(null, true, s);
  assert.equal(s.getItem("gut_admin_hint"), null);
});

test("limparDicaAdmin remove a dica", () => {
  const s = comDica();
  limparDicaAdmin(s);
  assert.equal(adminProvavel(s), false);
});

test("storage que rebenta ao escrever não propaga o erro", () => {
  const s = { getItem: () => null, setItem() { throw new Error("QuotaExceeded"); }, removeItem() {} };
  assert.doesNotThrow(() => gravarDicaAdmin(ADMIN, true, s));
  assert.doesNotThrow(() => limparDicaAdmin(s));
});

test("a dica NÃO guarda nada além de endereço, isAdmin e carimbo (R4)", () => {
  const s = storageFalso({ "privy:connections": sessaoDe(ADMIN) });
  gravarDicaAdmin(ADMIN, true, s);
  const chaves = Object.keys(JSON.parse(s.getItem("gut_admin_hint"))).sort();
  assert.deepEqual(chaves, ["em", "endereco", "isAdmin"]);
});

// ── Guardas sobre o código que consome o palpite ─────────────────────────────
// Mesmo espírito de adminNav.test.mjs: sem runner de React, o que se pode
// proteger é a FORMA da decisão no código-fonte. Estes testes existem para que
// uma reescrita distraída não desfaça a ordem que torna o palpite seguro.

test("App.jsx: o confirmado ganha sempre que houver address; o palpite só sem ele", () => {
  const app = readFileSync(new URL("../App.jsx", import.meta.url), "utf8");
  assert.match(
    app,
    /\(address \? \(isAdmin && !adminLoading\) : adminProvavel\)/,
    "a decisão do ADM tem de ser ternária em `address` — com address vale o backend, sem ele o palpite. " +
    "Um `||` aqui deixaria o palpite sobreviver a uma negativa confirmada.",
  );
});

test("App.jsx: a pausa é testada ANTES do encaminhamento, e nega-o", () => {
  const app = readFileSync(new URL("../App.jsx", import.meta.url), "utf8");
  assert.match(
    app,
    /if \(!painelAdminPausado\(\) && \(address \?/,
    "sem a pausa em primeiro lugar e negada, o botão 'Sair do painel' volta a ser " +
    "anulado por esta guarda — foi esse o defeito medido no MC89.33.",
  );
});

// ── Pausa do encaminhamento (MC89.34) ───────────────────────────────────────

/** sessionStorage falso — a pausa NÃO pode viver no mesmo storage da dica. */
function sessaoFalsa(inicial = {}) {
  const m = new Map(Object.entries(inicial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _bruto: m,
  };
}

test("sem ninguém pedir, não há pausa", () => {
  assert.equal(painelAdminPausado(sessaoFalsa()), false);
});

test("pausar → pausado; retomar → deixa de estar", () => {
  const s = sessaoFalsa();
  pausarPainelAdmin(s);
  assert.equal(painelAdminPausado(s), true);
  retomarPainelAdmin(s);
  assert.equal(painelAdminPausado(s), false);
});

test("retomar sem ter pausado não rebenta", () => {
  const s = sessaoFalsa();
  assert.doesNotThrow(() => retomarPainelAdmin(s));
  assert.equal(painelAdminPausado(s), false);
});

test("⚠️ a pausa NÃO é a dica: são chaves e storages diferentes", () => {
  // Se algum dia partilharem chave, sair do painel apagaria o palpite e o
  // MC89.31 deixaria de funcionar no arranque seguinte.
  const sessao = sessaoFalsa();
  pausarPainelAdmin(sessao);
  const local = storageFalso({ "privy:connections": sessaoDe(ADMIN) });
  gravarDicaAdmin(ADMIN, true, local);
  assert.equal(adminProvavel(local), true, "a pausa não pode invalidar a dica");
  assert.equal(local.getItem("gut_admin_pausa"), null, "a pausa não pode ir para o localStorage");
  assert.equal(sessao.getItem("gut_admin_hint"), null, "a dica não pode ir para o sessionStorage");
});

test("⚠️ a pausa usa sessionStorage por omissão — e isso NÃO é um detalhe", () => {
  // Os testes acima injetam o storage, portanto não veem qual é o PADRÃO. Se
  // alguém trocar o default para localStorage, a pausa sobrevive ao fecho da
  // app e um único "Sair do painel" desfaz o MC89.31 para sempre — em silêncio,
  // e só se dá por isso no aparelho, no dia seguinte. Por isso a escolha é
  // afirmada aqui, na fonte.
  const src = readFileSync(new URL("./dicaSessao.js", import.meta.url), "utf8");
  assert.match(
    src,
    /function storagePausaPadrao\(\) \{\s*try \{ return globalThis\.sessionStorage/,
    "a pausa tem de vir do sessionStorage: morrer com o processo da WebView é a propriedade que preserva o MC89.31",
  );
});

test("valor estranho na chave da pausa não conta como pausa", () => {
  const s = sessaoFalsa({ "gut_admin_pausa": "talvez" });
  assert.equal(painelAdminPausado(s), false);
});

test("storage que rebenta → sem pausa, sem lançar", () => {
  const s = { getItem() { throw new Error("SecurityError"); },
              setItem() { throw new Error("QuotaExceeded"); },
              removeItem() { throw new Error("x"); } };
  assert.equal(painelAdminPausado(s), false);
  assert.doesNotThrow(() => pausarPainelAdmin(s));
  assert.doesNotThrow(() => retomarPainelAdmin(s));
});

test("AdminLayout: sair grava a pausa ANTES de navegar", () => {
  const layout = readFileSync(new URL("../components/admin/AdminLayout.jsx", import.meta.url), "utf8");
  assert.match(
    layout,
    /pausarPainelAdmin\(\);\s*\n\s*navigate\("\/"\);/,
    "a ordem importa: navegar primeiro deixa a guarda de '/' correr sem a pausa e devolver o admin ao painel.",
  );
});

test("AdminLayout: entrar no painel retoma o encaminhamento", () => {
  const layout = readFileSync(new URL("../components/admin/AdminLayout.jsx", import.meta.url), "utf8");
  assert.match(
    layout,
    /useEffect\(\(\) => \{ retomarPainelAdmin\(\); \}, \[\]\)/,
    "sem isto, quem saísse uma vez ficava com a pausa a valer até fechar a app.",
  );
});

test("AdminLayout: sair da conta revoga a sessão admin ANTES do logout do Privy", () => {
  const layout = readFileSync(new URL("../components/admin/AdminLayout.jsx", import.meta.url), "utf8");
  const iLogoutAdmin = layout.indexOf("await logout()");
  const iDesconectar = layout.indexOf("desconectar()");
  assert.ok(iLogoutAdmin > 0 && iDesconectar > 0, "faltam as duas metades do sair da conta");
  assert.ok(
    iLogoutAdmin < iDesconectar,
    "a revogação do refresh admin precisa da sessão Privy viva para o pedido sair; " +
    "pela ordem inversa o refresh ficaria válido no servidor até expirar.",
  );
});

test("AdminLayout: o estado 'a restaurar' é testado ANTES do ecrã de login", () => {
  const layout = readFileSync(new URL("../components/admin/AdminLayout.jsx", import.meta.url), "utf8");
  const iRestauro = layout.indexOf("Restaurando sessão");
  const iLogin    = layout.indexOf("Faça login para verificar");
  assert.ok(iRestauro > 0, "falta o estado de restauro no AdminLayout");
  assert.ok(iLogin > 0, "falta o ecrã de login no AdminLayout");
  assert.ok(
    iRestauro < iLogin,
    "o ramo `restaurandoSessao` tem de vir primeiro — senão o ADM com sessão a restaurar " +
    "cai no ecrã a pedir-lhe login, que é o defeito que o MC89.31 corrige.",
  );
  // ⚠️ A ordem sozinha era um FALSO VERDE. Validado por mutação: trocar a
  // condição por `if (false && restaurandoSessao)` mantém a ordem intacta e o
  // teste passava, com o ramo morto e o ADM outra vez no ecrã de login. Por
  // isso a CONDIÇÃO também é afirmada, e não só a posição do texto.
  assert.match(
    layout,
    /if \(!isConnected\) \{\s*if \(restaurandoSessao\) \{/,
    "o ramo de restauro tem de ser a PRIMEIRA coisa dentro de `if (!isConnected)` e " +
    "a sua condição tem de ser exatamente `restaurandoSessao` — nada que o torne inalcançável.",
  );
  // O sinal NÃO pode voltar a ser `pareceAutenticado`: esse ancora no
  // gut_saldo_cache e deixa de fora o ADM que não tem esse cache (737 ms de
  // "Faça login" medidos no aparelho antes desta correção).
  assert.doesNotMatch(
    layout,
    /if \(pareceAutenticado\)/,
    "o portão de restauro do painel não pode depender do cache de saldo",
  );
});

// ── Reconciliação do useAdmin ───────────────────────────────────────────────
// O defeito que isto cobre foi visto no APARELHO antes de existir: a marca
// `portao_acesso_restrito` aos 1582 ms, "Acesso restrito" a um admin legítimo.
// Sem estes testes a correção só estava protegida por uma medição manual.

test("reconciliar: estado do arranque (sem endereço) não responde por um endereço real", () => {
  const doArranque = { isAdmin: false, role: "user", loading: false, error: null, admins: [], coordenacao: null, endereco: "" };
  const r = reconciliar(doArranque, ADMIN);
  assert.equal(r.loading, true, "tem de ficar 'a carregar', não 'não é admin'");
  assert.equal(r.isAdmin, false);
  assert.notEqual(r, doArranque, "não pode devolver o estado do outro endereço");
});

test("reconciliar: estado do MESMO endereço passa intacto", () => {
  const meu = { isAdmin: true, role: "admin", loading: false, error: null, admins: [], coordenacao: null, endereco: ADMIN };
  assert.equal(reconciliar(meu, ADMIN), meu);
});

test("reconciliar: compara sem distinguir maiúsculas", () => {
  const meu = { isAdmin: true, role: "admin", loading: false, error: null, admins: [], coordenacao: null, endereco: ADMIN };
  assert.equal(reconciliar(meu, "0x1E1BAE7F0F6E87E15F430B620ECA42B146D198CB"), meu);
});

test("reconciliar: um isAdmin true de OUTRA conta nunca transita", () => {
  const doOutro = { isAdmin: true, role: "admin", loading: false, error: null, admins: [], coordenacao: null, endereco: OUTRO };
  const r = reconciliar(doOutro, ADMIN);
  assert.equal(r.isAdmin, false, "o isAdmin de outra conta não pode passar para esta");
  assert.equal(r.loading, true);
});

test("reconciliar: sem endereço nenhum não fica 'a carregar' para sempre", () => {
  const doArranque = { isAdmin: false, role: "user", loading: false, error: null, admins: [], coordenacao: null, endereco: "" };
  assert.equal(reconciliar(doArranque, null).loading, false);
});

test("AdminAuthContext: a sessão admin continua a exigir isConnected ESTRITO", () => {
  const ctx = readFileSync(new URL("../context/AdminAuthContext.jsx", import.meta.url), "utf8");
  assert.match(
    ctx,
    /if \(!isConnected \|\| !isAdmin\) \{ setAuthState\(ESTADOS\.SEM_LOGIN\); return; \}/,
    "o arranque da sessão admin não pode passar a aceitar `pareceAutenticado` — " +
    "o otimismo é só de UI e tem de parar na casca.",
  );
});
