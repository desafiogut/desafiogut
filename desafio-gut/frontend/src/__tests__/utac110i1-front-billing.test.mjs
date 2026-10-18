// utac110i1-front-billing.test.mjs — UTAC110i.1 · FRENTE D (SEG2). A bifurcação do `useComprarPasse`.
//
// O que se prova (GATE 8 — bidireccional, nas duas direcções E no caso que protege o PWA):
//   (a) flag LIGADA + loja disponível (Android nativo) ⇒ fluxo GOOGLE PLAY: a loja é encomendada,
//       o SERVIDOR valida o recibo (`validar-compra-google`) e SÓ DEPOIS se fecha na loja;
//   (b) flag LIGADA mas SEM loja (PWA/browser) ⇒ PIX (nenhuma peça do Billing corre) — é esta
//       linha que garante «PWA continua 100% funcional com PIX»;
//   (c) flag DESLIGADA (hoje, nas 3 plataformas) ⇒ PIX, mesmo em Android nativo;
//   (d) o servidor RECUSA ⇒ a compra NÃO é fechada na loja (fica para reprocessar) e o erro é visível;
//   (e) o utilizador CANCELA na loja ⇒ erro claro, SEM ida à rede;
//   (f) uma compra nativa bem sucedida NÃO relê o saldo R$ (não houve débito de saldo).
//
// Instrumentos do repo: `_servidor-teste.mjs` + `_hook-runner.mjs` (condutor de hooks + `duploDeFetch`,
// que substitui SÓ o `fetch` global e deixa correr o `apiPost` REAL); duplos do `AppContext`, do
// `useRecursosApp` (controlável), do `@capacitor/core` e do plugin `capacitor-plugin-cdv-purchase`.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";
import { reiniciarBillingDuplo, REGISTO, skusRegistados } from "../lib/__tests__/_duplo-cdv-purchase.mjs";
import { reiniciarDuploCapacitor, ARRANCAR_ANDROID } from "../lib/__tests__/_duplo-capacitor.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUB_CONTEXTO = resolve(AQUI, "..", "pages", "__tests__", "_stubs", "AppContext.jsx");
const STUB_RECURSOS = resolve(AQUI, "_stubs-110i1", "useRecursosApp.js");
const DUPLO_PLUGIN = resolve(AQUI, "..", "lib", "__tests__", "_duplo-cdv-purchase.mjs");
const DUPLO_CAPACITOR = resolve(AQUI, "..", "lib", "__tests__", "_duplo-capacitor.mjs");

let vite, montar, duploDeFetch, definirContexto, definirRecursos, useComprarPasse, billing;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(AQUI, "..", "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({
      alias: [
        { find: /^\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
        { find: /^\.\.\/\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
        { find: /^\.\/useRecursosApp\.js$/, replacement: STUB_RECURSOS },
        { find: /^\.\.\/hooks\/useRecursosApp\.js$/, replacement: STUB_RECURSOS },
        { find: /^@capacitor\/core$/, replacement: DUPLO_CAPACITOR },
        { find: /^capacitor-plugin-cdv-purchase$/, replacement: DUPLO_PLUGIN },
      ],
    }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  ({ definirRecursos } = await vite.ssrLoadModule("/src/__tests__/_stubs-110i1/useRecursosApp.js"));
  ({ useComprarPasse } = await vite.ssrLoadModule("/src/hooks/useComprarPasse.js"));
  // O módulo REAL do Billing: o MESMO que o hook importa (o grafo do Vite é partilhado), logo
  // `_reiniciarParaTeste()` repõe exactamente o estado que o alvo usa.
  billing = await vite.ssrLoadModule("/src/lib/google-play-billing.js");
});
after(async () => { if (vite) await vite.close(); });

const A = "0xAbC1230000000000000000000000000000004567";
const CONECTADO = {
  isConnected: true, abrirModal: () => {}, address: A, user: { email: { address: "a@b.c" } },
  refetchSaldo: () => {}, saldoRsCentavos: 500, saldoRsStatus: "ok",
  refetchSaldoRs: () => { refetchChamadas += 1; }, setModalidade: () => {}, privyWallet: null,
  saldoSenhas: 7, saldoSenhasStatus: "ok", userLabel: "Teste", desconectar: () => {},
  authToken: "AUTHCTX-110i1",
};
let refetchChamadas = 0;

const URL_PIX_RELAMPAGO = /\/\.netlify\/functions\/comprar-passe-relampago$/;
const URL_VALIDAR = /\/\.netlify\/functions\/validar-compra-google$/;
const COMPRA_OK = { sku: "passe_relampago_r2", purchaseToken: "TOKEN-PLAY-AAA", orderId: "GPA.3399-1" };
const RESPOSTA_SERVIDOR_OK = { ok: true, idempotent: false, tipo: "relampago", pontosFidelidade: 10, creditosLance: 1, ecoQuildo: 1 };

/** Corre `comprar(tipo)` com o `fetch` duplo e devolve o resultado + as chamadas + os corpos. */
async function comprar(responder, tipo = "relampago") {
  const corpos = [];
  const dup = duploDeFetch((url, opts) => {
    corpos.push({ url: String(url), body: opts?.body ? JSON.parse(opts.body) : null, headers: opts?.headers ?? {} });
    return responder(String(url), opts);
  });
  try {
    const c = montar(useComprarPasse, []);
    await c.assentar();
    const r = await c.resultado().comprar(tipo);
    return { r, corpos, dup };
  } finally { dup.restaurar(); }
}

beforeEach(() => {
  refetchChamadas = 0;
  // ⚠️ O estado de MÓDULO do Billing (SKUs registados, loja inicializada, listener) é por PROCESSO:
  // sem esta reposição, a partir do 2.º teste o `register` era saltado e a loja dupla (limpa a cada
  // teste) nunca devolvia o produto — os testes silenciosamente caíam no `produto_indisponivel`
  // (MEDIDO: 15 s de timeout e um verde vácuo numa asserção «nenhuma chamada PIX»).
  billing._reiniciarParaTeste();
  reiniciarBillingDuplo();
  reiniciarDuploCapacitor();
  definirContexto(CONECTADO);
  definirRecursos({ isPagamentoNativoAtivo: false, plataforma: "pwa" });
});

// ═══ (a) flag LIGADA + loja disponível ⇒ GOOGLE PLAY ════════════════════════════════════════════
test("(a) Android com a flag ligada ⇒ encomenda na loja, SERVIDOR valida e só depois se fecha", async () => {
  ARRANCAR_ANDROID();
  definirRecursos({ isPagamentoNativoAtivo: true, plataforma: "android" });
  reiniciarBillingDuplo({ transacaoAprovada: { ...COMPRA_OK } });

  const { r, corpos, dup } = await comprar(() => ({ status: 201, json: RESPOSTA_SERVIDOR_OK }));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.tipo, "relampago");
  assert.equal(r.pontos, 10);
  assert.equal(r.creditosLance, 1);

  assert.deepEqual(skusRegistados(), ["passe_relampago_r2"], "a loja foi encomendada com o SKU errado");
  assert.equal(REGISTO.order.length, 1, "não encomendou na loja");
  const chamadas = dup.chamadas.map((c) => c.url);
  assert.equal(chamadas.length, 1, `esperava 1 ida à rede (o servidor): ${JSON.stringify(chamadas)}`);
  assert.match(chamadas[0], URL_VALIDAR);
  assert.deepEqual(corpos[0].body, { tipo: "relampago", sku: "passe_relampago_r2", purchaseToken: "TOKEN-PLAY-AAA" });
  assert.equal(corpos[0].headers.Authorization, "Bearer AUTHCTX-110i1", "o endpoint nativo exige a sessão");
  // O fecho na loja acontece DEPOIS da resposta do servidor.
  assert.equal(REGISTO.finish.length, 1, "a compra não foi fechada na loja");
  assert.equal(REGISTO.finish[0].state, "finished");
  assert.equal(refetchChamadas, 0, "relê o saldo R$ numa compra que não mexeu no saldo");
});

test("(a) o fluxo nativo NUNCA chama os endpoints PIX", async () => {
  ARRANCAR_ANDROID();
  definirRecursos({ isPagamentoNativoAtivo: true, plataforma: "android" });
  reiniciarBillingDuplo({ transacaoAprovada: { ...COMPRA_OK } });
  const { dup } = await comprar(() => ({ status: 201, json: RESPOSTA_SERVIDOR_OK }));
  assert.equal(dup.chamadas.filter((c) => /comprar-passe/.test(c.url)).length, 0,
    "uma compra nativa foi parar ao endpoint PIX (double charge)");
});

// ═══ (b) flag LIGADA mas SEM loja ⇒ PIX (é isto que protege o PWA) ═══════════════════════════════
test("(b) PWA com a flag ligada no Blob ⇒ PIX (o browser nunca tem loja) e ZERO peças do Billing", async () => {
  reiniciarDuploCapacitor({ plataforma: "web", nativo: false, pluginDisponivel: false });
  definirRecursos({ isPagamentoNativoAtivo: true, plataforma: "pwa" });

  const { r, corpos, dup } = await comprar(() => ({ status: 201, json: { ok: true, pontosFidelidade: 10 } }));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(dup.chamadas.length, 1);
  assert.match(dup.chamadas[0].url, URL_PIX_RELAMPAGO, "o PWA não foi por PIX");
  assert.match(corpos[0].body.idempotencyKey, /^[A-Za-z0-9._:-]{8,180}$/);
  assert.equal(REGISTO.order.length, 0, "foi à loja num browser");
  assert.equal(REGISTO.register.length, 0);
  assert.equal(refetchChamadas, 1, "o PIX mexe no saldo R$ e o ecrã tem de o reler");
});

test("(b) iOS com a flag ligada ⇒ PIX (a loja do Google não existe em iOS)", async () => {
  reiniciarDuploCapacitor({ plataforma: "ios", nativo: true, pluginDisponivel: true });
  definirRecursos({ isPagamentoNativoAtivo: true, plataforma: "ios" });
  const { dup } = await comprar(() => ({ status: 201, json: { ok: true, pontosFidelidade: 10 } }));
  assert.equal(dup.chamadas.length, 1);
  assert.match(dup.chamadas[0].url, URL_PIX_RELAMPAGO);
  assert.equal(REGISTO.order.length, 0);
});

test("(b) Android nativo mas SEM o plugin nativo ⇒ SEM compra (o APK não vende por PIX) — UTAC110i.2/C", async () => {
  // ⚠️ CONTRATO ANTERIOR (UTAC110i.1) — REFUTADO por decisão de conformidade, mantido À VISTA:
  //   o teste chamava-se «(b) Android nativo mas SEM o plugin nativo ⇒ PIX (fail-closed)» e a
  //   asserção era `assert.match(dup.chamadas[0].url, URL_PIX_RELAMPAGO)` — ou seja, exigia que o
  //   APK fosse ao endpoint PIX. Deixou de ser verdade em 2026-10-18 (UTAC110i.2, FRENTE C, opção
  //   «c»): no APK o Passe é produto digital e a Play exige o Billing, logo o PIX não é fallback. A
  //   asserção está INVERTIDA abaixo, de propósito.
  reiniciarDuploCapacitor({ plataforma: "android", nativo: true, pluginDisponivel: false });
  definirRecursos({ isPagamentoNativoAtivo: true, plataforma: "android" });
  const { r, dup } = await comprar(() => ({ status: 201, json: { ok: true, pontosFidelidade: 10 } }));
  assert.equal(r.ok, false);
  assert.equal(r.code, "pix_indisponivel_no_apk");
  assert.match(r.message, /desafiogut\.com/, "a mensagem tem de remeter para o site");
  assert.equal(dup.chamadas.filter((c) => /comprar-passe/.test(c.url)).length, 0,
    "o APK foi ao endpoint PIX — é exactamente a violação da Play");
});

// ═══ (c) flag DESLIGADA no APK ⇒ SEM compra (a flag é o interruptor do BILLING, não do PIX) ══════
test("(c) Android nativo com a flag DESLIGADA ⇒ SEM compra (nem Billing nem PIX) — UTAC110i.2/C", async () => {
  // ⚠️ CONTRATO ANTERIOR (UTAC110i.1) — REFUTADO, mantido À VISTA: chamava-se «(c) Android nativo
  //   com a flag DESLIGADA ⇒ PIX (zero regressão no APK actual)» e exigia
  //   `assert.match(dup.chamadas[0].url, URL_PIX_RELAMPAGO)`. Deixou de ser o contrato em
  //   2026-10-18: a flag desliga a LOJA (kill-switch), não autoriza PIX no APK.
  ARRANCAR_ANDROID();
  definirRecursos({ isPagamentoNativoAtivo: false, plataforma: "android" });
  const { r, dup } = await comprar(() => ({ status: 201, json: { ok: true, pontosFidelidade: 10 } }));
  assert.equal(r.ok, false);
  assert.equal(r.code, "pix_indisponivel_no_apk");
  assert.equal(dup.chamadas.length, 0, "nenhuma ida à rede: nem PIX nem validação");
  assert.equal(REGISTO.order.length, 0, "não se abre a loja com a flag desligada");
});

// ═══ (d)(e) desfechos do fluxo nativo ════════════════════════════════════════════════════════════
test("(d) o servidor RECUSA (409) ⇒ erro visível e a compra NÃO é fechada na loja", async () => {
  ARRANCAR_ANDROID();
  definirRecursos({ isPagamentoNativoAtivo: true, plataforma: "android" });
  reiniciarBillingDuplo({ transacaoAprovada: { ...COMPRA_OK } });
  const { r, dup } = await comprar(() => ({ status: 409, json: { error: { code: "compra_cancelada" } } }));
  assert.equal(r.ok, false, JSON.stringify(r));
  assert.equal(r.status, 409);
  assert.equal(r.code, "compra_cancelada");
  assert.match(r.message, /confirmar a compra na loja/);
  assert.equal(dup.chamadas.length, 1);
  assert.equal(REGISTO.finish.length, 0, "fechou na loja uma compra que o servidor não confirmou");
});

test("(d) servidor indisponível (503) ⇒ erro claro, sem fechar na loja", async () => {
  ARRANCAR_ANDROID();
  definirRecursos({ isPagamentoNativoAtivo: true, plataforma: "android" });
  reiniciarBillingDuplo({ transacaoAprovada: { ...COMPRA_OK } });
  const { r } = await comprar(() => ({ status: 503, json: { error: { code: "google_play_nao_configurado" } } }));
  assert.equal(r.ok, false);
  assert.equal(r.message, "Sistema em manutenção. Tente de novo em instantes.");
  assert.equal(REGISTO.finish.length, 0);
});

test("(e) cancelamento na loja ⇒ erro claro e ZERO idas à rede", async () => {
  ARRANCAR_ANDROID();
  definirRecursos({ isPagamentoNativoAtivo: true, plataforma: "android" });
  reiniciarBillingDuplo({ resultadoOrder: "cancelada" });
  const { r, dup } = await comprar(() => ({ status: 201, json: RESPOSTA_SERVIDOR_OK }));
  assert.equal(r.ok, false, JSON.stringify(r));
  assert.equal(r.code, "cancelada");
  assert.equal(r.message, "Compra cancelada na loja.");
  assert.equal(dup.chamadas.length, 0, "foi ao servidor depois de o utilizador cancelar");
});

// ⚠️ NOTA DE COBERTURA AMPLIADA (UTAC110i.1b — achados do validador adversarial do SEG3, declarados):
//   · `produto_indisponivel` (loja que nunca carrega o produto): NÃO exercitado — obrigaria a esperar
//     os 15 s do `TIMEOUT_PRODUTO_MS` (declarado abaixo, na nota original);
//   · `timeout_compra`, `sem_token`, `sku_divergente` e `billing_indisponivel` (mensagens do
//     `MSG_BILLING`): também NÃO exercitados — o mutante que lhes troca a mensagem sobrevive
//     (medido: N1/N2/N5 do validador). São mensagens de caminhos raros, não de decisão de dinheiro;
//   · `isPagamentoNativoAtivo` **truthy mas não `true`** (mutante N3 do validador: gate sem o
//     `=== true`): SOBREVIVE — **mutante EQUIVALENTE**, e por construção: a fonte da flag normaliza
//     sempre para booleano (`useRecursosApp.js:93` `Boolean(DEFAULT_RECURSOS…[plat])`, `:131`
//     `Boolean(data.…)`, e o mesmo no duplo `_stubs-110i1/useRecursosApp.js:23`), logo nenhum valor
//     truthy não-booleano chega ao gate. O `=== true` é a defesa declarada para esse caso (config
//     malformada); NÃO se enfraquece o gate para agradar ao mutante.
// ⚠️ NOTA DE COBERTURA (declarada, medida): o desfecho `produto_indisponivel` da abstracção (loja
// que nunca carrega o produto) NÃO é exercitado aqui — obrigaria a esperar os 15 s do
// `TIMEOUT_PRODUTO_MS` e o instrumento de mutação (que corre este ficheiro por cada mutante) ficaria
// lento de mais. O CÓDIGO está provado em `utac110i1-google-play-billing.test.mjs`; o que falta
// provar aqui é só a MENSAGEM que o hook lhe dá. O que se exercita é o desfecho de falha da loja
// com o produto carregado (o 6777008 = «Adapter not found or not ready» do pacote real).
test("(e) a loja falha na encomenda (6777008) ⇒ erro claro, sem tocar no servidor nem nos PIX", async () => {
  ARRANCAR_ANDROID();
  definirRecursos({ isPagamentoNativoAtivo: true, plataforma: "android" });
  reiniciarBillingDuplo({ resultadoOrder: "sem_adaptador" });
  const { r, dup } = await comprar(() => ({ status: 201, json: RESPOSTA_SERVIDOR_OK }));
  assert.equal(r.ok, false);
  assert.equal(r.code, "compra_falhou");
  assert.match(r.message, /não foi possível concluir a compra na loja/i);
  assert.equal(dup.chamadas.length, 0, "foi ao servidor depois de a loja falhar");
  assert.equal(REGISTO.finish.length, 0);
});

// ═══ guardas do hook que se mantêm nos DOIS ramos ═══════════════════════════════════════════════
test("tipo inválido ⇒ erro LOCAL nos dois ramos, sem rede e sem loja", async () => {
  for (const ligado of [false, true]) {
    ARRANCAR_ANDROID();
    definirRecursos({ isPagamentoNativoAtivo: ligado, plataforma: "android" });
    const { r, dup } = await comprar(() => ({ status: 201, json: { ok: true } }), "pontos");
    assert.equal(r.ok, false, `ligado=${ligado}`);
    assert.equal(r.code, "tipo_invalido");
    assert.equal(dup.chamadas.length, 0);
    assert.equal(REGISTO.register.length, 0);
  }
});

test("sem `authToken` ⇒ `sem_sessao` nos dois ramos, sem rede", async () => {
  for (const ligado of [false, true]) {
    ARRANCAR_ANDROID();
    definirRecursos({ isPagamentoNativoAtivo: ligado, plataforma: "android" });
    definirContexto({ ...CONECTADO, authToken: null });
    const { r, dup } = await comprar(() => ({ status: 201, json: { ok: true } }));
    assert.equal(r.code, "sem_sessao", `ligado=${ligado}`);
    assert.equal(dup.chamadas.length, 0);
  }
});

test("corrida no MESMO tick ⇒ só uma compra, nos dois ramos que restam (PIX/web + Billing)", async () => {
  // ⚠️ UTAC110i.2/C — o ramo «android nativo + flag desligada ⇒ PIX» DEIXOU DE EXISTIR (ver o teste
  // (c) acima). Os dois ramos de compra que restam são: PIX no browser e Billing no APK. O ramo
  // bloqueado (APK sem loja) é coberto em separado, em baixo.
  for (const cenario of [
    { nome: "PIX (browser)", android: false, ligado: false, pix: true },
    { nome: "Billing (APK, flag ligada)", android: true, ligado: true, pix: false },
  ]) {
    const { android, ligado, pix, nome } = cenario;
    if (android) ARRANCAR_ANDROID(); else reiniciarDuploCapacitor();
    definirRecursos({ isPagamentoNativoAtivo: ligado, plataforma: android ? "android" : "pwa" });
    billing._reiniciarParaTeste();
    reiniciarBillingDuplo({ transacaoAprovada: { ...COMPRA_OK } });
    const corpos = [];
    const dup = duploDeFetch((url, opts) => {
      corpos.push(String(url));
      return { status: 201, json: RESPOSTA_SERVIDOR_OK };
    });
    try {
      const c = montar(useComprarPasse, []);
      await c.assentar();
      const [r1, r2] = await Promise.all([c.resultado().comprar("relampago"), c.resultado().comprar("programado")]);
      assert.equal(r1.ok, true, `${nome}: ${JSON.stringify(r1)}`);
      assert.equal(r2.ok, false, nome);
      assert.equal(r2.code, "em_curso", nome);
      assert.equal(corpos.length, 1, `${nome}: ${corpos.length} idas à rede`);
      assert.equal(REGISTO.order.length, pix ? 0 : 1,
        `${nome}: encomendas na loja (esperado ${pix ? 0 : 1} — no ramo PIX a loja não é tocada)`);
    } finally { dup.restaurar(); }
  }
});

test("corrida no MESMO tick no ramo BLOQUEADO (APK sem loja) ⇒ um erro, zero rede, zero loja", async () => {
  reiniciarDuploCapacitor({ plataforma: "android", nativo: true, pluginDisponivel: false });
  definirRecursos({ isPagamentoNativoAtivo: true, plataforma: "android" });
  billing._reiniciarParaTeste();
  reiniciarBillingDuplo();
  const corpos = [];
  const dup = duploDeFetch((url) => { corpos.push(String(url)); return { status: 201, json: RESPOSTA_SERVIDOR_OK }; });
  try {
    const c = montar(useComprarPasse, []);
    await c.assentar();
    const [r1, r2] = await Promise.all([c.resultado().comprar("relampago"), c.resultado().comprar("programado")]);
    for (const r of [r1, r2]) {
      assert.equal(r.ok, false);
      // o 2.º pode apanhar a guarda `em_curso`; o 1.º tem de ser o bloqueio da frente C
      assert.ok(["pix_indisponivel_no_apk", "em_curso"].includes(r.code), `code=${r.code}`);
    }
    assert.equal(corpos.length, 0, `o ramo bloqueado foi à rede: ${corpos}`);
    assert.equal(REGISTO.order.length, 0);
  } finally { dup.restaurar(); }
});

// ═══ UTAC110i.2/C — o erro do BLOQUEIO tem de chegar ao ESTADO do hook (o ecrã pinta-o) ═════════
// ⚠️ ACRESCENTADO depois do veredicto do validador adversarial: o mutante que remove o
// `setErro(MSG_PIX_NO_APK)` do bloco da frente C **sobrevivia** à bateria anterior (pass=58 fail=0),
// porque as asserções liam o objecto DEVOLVIDO por `comprar()` e nenhuma lia o `erro` do hook — que é
// o que o balão (`ComprarPasseModal`, `role="alert"`) e a Carteira (toast) apresentam. É o mesmo
// buraco que o UTAC110i.1b fechou para o ramo nativo (mutante D7).
test("(C/estado) o bloqueio da frente C põe a mensagem no ESTADO `erro` do hook", async () => {
  reiniciarDuploCapacitor({ plataforma: "android", nativo: true, pluginDisponivel: false });
  definirRecursos({ isPagamentoNativoAtivo: true, plataforma: "android" });
  const dup = duploDeFetch(() => ({ status: 201, json: { ok: true } }));
  try {
    const c = montar(useComprarPasse, []);
    await c.assentar();
    const r = await c.resultado().comprar("relampago");
    assert.equal(r.ok, false);
    assert.equal(r.code, "pix_indisponivel_no_apk");
    assert.match(c.resultado().erro, /desafiogut\.com/,
      "o erro do bloqueio não chegou ao estado que o balão pinta (utilizador veria um balão mudo)");
  } finally { dup.restaurar(); }
});

// ═══ o erro fica VISÍVEL no estado do hook (é o `erro` que o ecrã mostra) ═══════════════════════
// ⚠️ UTAC110i.1b — teste ACRESCENTADO para matar o mutante D7 do
// `scripts/mc110i1d-prova-mutacao.mjs` («o erro do Billing deixa de ser visível (silêncio)»:
// remove o `setErro(message)` do ramo `!compra.ok`). MEDIDO no 110i.1b: D7 **sobrevivia** — todas
// as asserções liam o objecto DEVOLVIDO por `comprar()` (`r.message`), nenhuma lia o **estado**
// `erro` do hook, que é o que o ecrã (`MinhaCarteira`/`ComprarPasseModal`) apresenta. Um erro que
// existe no objecto devolvido mas não no estado é uma compra falhada EM SILÊNCIO.
test("o erro fica no ESTADO `erro` do hook (loja e servidor) e um sucesso posterior limpa-o", async () => {
  const dup = duploDeFetch((url) => (URL_VALIDAR.test(String(url))
    ? { status: 409, json: { error: { code: "compra_cancelada" } } }
    : { status: 201, json: { ok: true, pontosFidelidade: 10 } }));
  try {
    const c = montar(useComprarPasse, []);
    await c.assentar();

    // (1) desfecho LOCAL da loja (6777008) ⇒ o erro tem de estar no ESTADO do hook.
    ARRANCAR_ANDROID();
    definirRecursos({ isPagamentoNativoAtivo: true, plataforma: "android" });
    reiniciarBillingDuplo({ resultadoOrder: "sem_adaptador" });
    await c.actualizar();   // ⚠️ a cena (duplos + flag) só vale na renderização SEGUINTE
    const r1 = await c.resultado().comprar("relampago");
    assert.equal(r1.ok, false);
    assert.equal(c.resultado().erro, "Não foi possível concluir a compra na loja. Tente de novo.",
      "a falha da loja não chegou ao estado `erro` (o utilizador não vê nada)");

    // (2) nova tentativa no BROWSER (PIX, que continua a existir fora do APK) e bem sucedida ⇒ o
    //     erro ANTIGO tem de LIMPAR.
    // ⚠️ UTAC110i.2/C — antes este passo era «Android nativo + flag desligada ⇒ PIX»; esse ramo
    //    deixou de existir (o APK não vende o Passe por PIX). O objectivo do teste — o erro antigo
    //    limpar num sucesso posterior — mantém-se, agora exercido no ramo PIX do browser.
    reiniciarDuploCapacitor(); // browser: é aqui que o PIX vive
    definirRecursos({ isPagamentoNativoAtivo: false, plataforma: "pwa" });
    billing._reiniciarParaTeste();
    reiniciarBillingDuplo();
    await c.actualizar();
    const r2 = await c.resultado().comprar("relampago");
    assert.equal(r2.ok, true, JSON.stringify(r2));
    assert.equal(c.resultado().erro, "", "o erro antigo ficou no ecrã depois de uma compra bem sucedida");

    // (3) recusa do SERVIDOR no ramo nativo ⇒ o erro do 409 também tem de estar no ESTADO.
    ARRANCAR_ANDROID(); // repõe a ponte nativa (o passo 2 passou-a a browser)
    definirRecursos({ isPagamentoNativoAtivo: true, plataforma: "android" });
    billing._reiniciarParaTeste();
    reiniciarBillingDuplo({ transacaoAprovada: { ...COMPRA_OK } });
    await c.actualizar();
    const r3 = await c.resultado().comprar("relampago");
    assert.equal(r3.ok, false);
    assert.equal(r3.status, 409);
    assert.equal(c.resultado().erro, "Não foi possível confirmar a compra na loja. Contacte o suporte.",
      "a recusa do servidor não chegou ao estado `erro`");
  } finally { dup.restaurar(); }
});
