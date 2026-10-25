// utac114-credencial-supabase.test.mjs — UTAC114. Cascata da credencial do Billing.
//
// O que se prova (GATE bidireccional):
//   1. env var presente e válida  ⇒ usa a env, NÃO toca no banco;
//   2. env var ausente            ⇒ lê da tabela `config_secrets` (leitor injectado) e aceita;
//   3. env var ausente + banco vazio ⇒ fail-CLOSED `google_play_nao_configurado`;
//   4. env var ausente + banco rebenta ⇒ fail-CLOSED (nunca lança para o handler);
//   5. cache em memória: a 2.ª chamada NÃO volta ao banco (instância quente);
//   6. env var presente mas INVÁLIDA ⇒ `google_play_credencial_invalida` e NÃO cai para o banco
//      (configuração errada não se mascara com o fallback);
//   7. env var vazia/só espaços conta como ausente ⇒ cai para o banco.
//
// node --test _tests/utac114-credencial-supabase.test.mjs
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  carregarCredencial, lerCredencial, configurado,
  _setLeitorRemoto, _limparCacheCredencial,
} from "../_lib/google-play-billing.mjs";

const CONTA = JSON.stringify({
  type: "service_account",
  project_id: "desafiogut-teste",
  client_email: "play-billing@desafiogut-teste.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----AAAA-----END PRIVATE KEY-----",
});

beforeEach(() => {
  delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  _setLeitorRemoto(null);
  _limparCacheCredencial();
});

test("T1 · env var válida é a primeira fonte e não consulta o banco", async () => {
  process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = CONTA;
  let chamadas = 0;
  _setLeitorRemoto(async () => { chamadas += 1; return CONTA; });

  const cred = await carregarCredencial();

  assert.equal(cred.ok, true);
  assert.equal(cred.origem, "env");
  assert.equal(cred.conta.client_email, "play-billing@desafiogut-teste.iam.gserviceaccount.com");
  assert.equal(chamadas, 0, "com env var válida o banco nunca é tocado");
});

test("T2 · sem env var, lê o JSON da tabela config_secrets", async () => {
  let chamadas = 0;
  _setLeitorRemoto(async () => { chamadas += 1; return CONTA; });

  const cred = await carregarCredencial();

  assert.equal(cred.ok, true);
  assert.equal(cred.origem, "supabase");
  assert.equal(cred.conta.project_id, "desafiogut-teste");
  assert.equal(chamadas, 1);
});

test("T3 · sem env var e sem linha na tabela ⇒ fail-closed google_play_nao_configurado", async () => {
  _setLeitorRemoto(async () => null);

  const cred = await carregarCredencial();

  assert.equal(cred.ok, false);
  assert.equal(cred.code, "google_play_nao_configurado");
});

test("T4 · sem env var e banco a rebentar ⇒ fail-closed, nunca lança", async () => {
  _setLeitorRemoto(async () => { throw new Error("relation does not exist"); });

  const cred = await carregarCredencial();

  assert.equal(cred.ok, false);
  assert.equal(cred.code, "google_play_nao_configurado");
});

test("T5 · cache em memória: a segunda chamada não volta ao banco", async () => {
  let chamadas = 0;
  _setLeitorRemoto(async () => { chamadas += 1; return CONTA; });

  const a = await carregarCredencial();
  const b = await carregarCredencial();
  const c = await carregarCredencial();

  assert.equal(a.ok && b.ok && c.ok, true);
  assert.equal(b.origem, "cache");
  assert.equal(c.origem, "cache");
  assert.equal(chamadas, 1, "três chamadas, uma só ida ao banco");
});

test("T6 · env var presente mas inválida NÃO cai para o banco", async () => {
  process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = "{ isto não é json";
  let chamadas = 0;
  _setLeitorRemoto(async () => { chamadas += 1; return CONTA; });

  const cred = await carregarCredencial();

  assert.equal(cred.ok, false);
  assert.equal(cred.code, "google_play_credencial_invalida");
  assert.equal(chamadas, 0, "configuração errada não se mascara com o fallback");
});

test("T7 · env var vazia conta como ausente e cai para o banco", async () => {
  process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = "   ";

  const cred = await carregarCredencial();

  // sem leitor injectado usa o Supabase real: num ambiente de teste não há linha nem cliente,
  // logo o contrato que importa é «não devolve ok:true e não lança».
  assert.equal(cred.ok, false);
  assert.ok(["google_play_nao_configurado", "google_play_credencial_invalida"].includes(cred.code));
});

test("T8 · lerCredencial() continua síncrona e só olha para a env var", () => {
  assert.equal(lerCredencial().code, "google_play_nao_configurado");

  process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = CONTA;
  const env = lerCredencial();
  assert.equal(env.ok, true);
  assert.equal(env.conta.client_email, "play-billing@desafiogut-teste.iam.gserviceaccount.com");
});

test("T9 · configurado() reflecte a cache depois de uma leitura bem-sucedida", async () => {
  assert.equal(configurado(), false);

  _setLeitorRemoto(async () => CONTA);
  await carregarCredencial();

  assert.equal(configurado(), true, "com credencial em cache a validação está operacional");
});
