// _tests/mc93e-ci-config.test.mjs — MC93-E.
//
// PORQUÊ ESTE FICHEIRO EXISTE
// A pendência nº 1 do MC93-D era que o `ci.yml` não definia
// SUPABASE_CONTRATO_URL/KEY, logo os únicos testes que exercem a migração
// `20260923_mc93b_pontuacoes.sql` eram SALTADOS em todos os PRs. Um verde
// silencioso durante um MC inteiro.
//
// Corrigir isso uma vez não chega: a configuração desaparece num merge SEM
// avisar — o job continua verde, só que a testar menos. Este ficheiro é a
// guarda. Não testa código; testa que o CI continua a ser o que dizemos que é.
//
// ⚠️ A PRIMEIRA VERSÃO DESTA GUARDA ERA MÁ, E FOI A VALIDAÇÃO INDEPENDENTE QUE
// O MOSTROU: deixou passar 19 de 25 mutações (24 %). Três delas porque a
// asserção casava com um COMENTÁRIO do YAML em vez da configuração real, e uma
// porque procurava a variável no JOB inteiro quando bastava tirá-la do PASSO.
// Esta versão lê tudo com `semComentarios()` e ancora no passo exacto.
//
// ⚠️ PORQUE NÃO USA `js-yaml`, que seria o instrumento óbvio: `js-yaml` NÃO está
// no `package-lock.json` das functions (medido). Usá-lo criaria exactamente o
// defeito A-1 que este MC acabou de corrigir — um teste que resolve na máquina
// e rebenta em CI. O parsing é textual de propósito.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..", "..", "..", "..", "..");

const CI = join(RAIZ, ".github", "workflows", "ci.yml");
const SCRIPT_LOCAL = join(RAIZ, "desafio-gut", "scripts", "ci-postgrest-local.sh");

const ciBruto = readFileSync(CI, "utf8");
const scriptBruto = readFileSync(SCRIPT_LOCAL, "utf8");

/**
 * Tira as linhas de comentário (YAML `#` e SQL `--`).
 *
 * ⚠️ NÃO É COSMÉTICA. Sem isto, comentar o bloco `services:` inteiro ou o `env:`
 * do passo deixava TODAS as asserções verdes — a configuração desaparecia e a
 * guarda não dava por nada. Medido pela validação independente (M03, M04, M23).
 * É a terceira vez neste projeto que um comentário corrompe uma prova.
 */
const semComentarios = (txt) =>
  txt.split("\n").filter((l) => !/^\s*(#|--\s)/.test(l)).join("\n");

const ci = semComentarios(ciBruto);
const script = semComentarios(scriptBruto);

/** Bloco de um job, pelo recuo: os jobs vivem a dois espaços. */
function bloco(texto, nomeJob) {
  const i = texto.indexOf(`\n  ${nomeJob}:\n`);
  assert.notEqual(i, -1, `job \`${nomeJob}\` não existe no ci.yml`);
  const resto = texto.slice(i + 1);
  const fim = resto.slice(1).search(/\n {2}[a-z][a-z0-9-]*:\n/);
  return fim === -1 ? resto : resto.slice(0, fim + 1);
}

/** Um passo, pelo nome, até ao `- name:`/`- uses:` seguinte. */
function passo(job, nome) {
  const i = job.indexOf(`- name: ${nome}`);
  assert.notEqual(i, -1, `passo \`${nome}\` não existe`);
  const resto = job.slice(i + 1);
  const fim = resto.search(/\n {6}- (name|uses):/);
  return fim === -1 ? resto : resto.slice(0, fim);
}

const jobTeste = bloco(ci, "test-functions");
const jobOnchain = bloco(ci, "test-onchain");

// ───────────────────────────────────────────────────────────────────────────
describe("MC93-E · o ci.yml é sintacticamente utilizável", () => {
  test("sem caracteres de controlo", () => {
    // Ao escrever este MC injectei dois bytes 0x01 por uma retro-referência de
    // `sed` mal escapada. O GitHub teria recusado o workflow INTEIRO.
    // MC94.4.1: o byte CRU saiu daqui (era invisível ao grep, que passava a tratar
    // este ficheiro como binário e a saltá-lo — incluindo este próprio teste, que
    // verifica caracteres de controlo). A lição fica; o byte não.
    const maus = [...ciBruto].filter((c) => {
      const n = c.codePointAt(0);
      return n < 9 || n === 11 || n === 12 || (n >= 14 && n < 32);
    });
    assert.equal(maus.length, 0, `${maus.length} caracteres de controlo no ci.yml`);
  });

  test("sem TABs na indentação — YAML com TAB é inválido", () => {
    // Achado M21 da validação independente: indentar com TAB parte o workflow
    // todo, e a guarda anterior não via porque as strings ficavam intactas.
    const comTab = ciBruto.split("\n")
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => /^[ ]*\t/.test(l));
    assert.equal(comTab.length, 0,
      `TAB na indentação nas linhas ${comTab.map(([n]) => n).join(", ")}`);
  });

  test("nenhum passo tem duas chaves `run:`", () => {
    // Achado M22: chave duplicada é YAML inválido e o workflow inteiro cai.
    for (const nomeJob of ["test-functions", "test-onchain"]) {
      const j = bloco(ciBruto, nomeJob);
      for (const parte of j.split(/\n {6}- (?=name:|uses:)/).slice(1)) {
        const runs = (parte.match(/^ {8}run:/gm) ?? []).length;
        assert.ok(runs <= 1, `um passo de \`${nomeJob}\` tem ${runs} chaves \`run:\``);
      }
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("MC93-E · o ci.yml corre mesmo os testes de contrato", () => {
  test("o job test-functions levanta um Postgres com health-check", () => {
    assert.match(jobTeste, /services:/, "sem bloco `services:`");
    assert.match(jobTeste, /image:\s*postgres:/, "sem imagem de Postgres");
    assert.match(jobTeste, /--health-cmd/, "serviço sem health-check: corrida garantida");
  });

  test("o passo que corre a SUÍTE tem o working-directory certo", () => {
    // Achado A-4: um glob que não casa faz o `node --test` sair 0 com ZERO
    // testes. Apontar o passo ao directório errado deixava tudo VERDE a não
    // testar nada — o mesmo verde silencioso, noutra variável.
    const dosTestes = passo(jobTeste, "Testes (node --test)");
    assert.match(dosTestes, /working-directory:\s*desafio-gut\/frontend\/netlify\/functions/,
      "o passo `Testes` mudou de directório — o glob deixa de casar e sai 0");
    assert.match(dosTestes, /_tests\/\*\.test\.mjs/,
      "o passo `Testes` deixou de correr a suíte toda");
  });

  test("a suíte recebe SUPABASE_CONTRATO_URL (no passo ou no job)", () => {
    // Achado A-13: exigir a variável SÓ no passo bloqueava uma refactorização
    // válida (pô-la no `env:` do job). As duas formas servem; o que não serve
    // é não haver nenhuma.
    const dosTestes = passo(jobTeste, "Testes (node --test)");
    const noJob = /\n {4}env:\n(?: {6}.*\n)*? {6}SUPABASE_CONTRATO_URL:/.test(jobTeste);
    assert.ok(/SUPABASE_CONTRATO_URL:/.test(dosTestes) || noJob,
      "SUPABASE_CONTRATO_URL não está nem no passo nem no env do job — o nível 2 volta a saltar");
  });

  test("as dependências que a suíte precisa são instaladas", () => {
    // ⚠️ Achado A-1 da validação independente, e é o mais caro: dois testes do
    // MC30.2.1 fazem `mock.module("@aws-sdk/client-kms")`, que EXIGE que o
    // especificador resolva. Esse pacote não está no lockfile das functions —
    // resolve a partir de `frontend/node_modules`. Sem instalar o frontend, o
    // passo saía VERMELHO em CI e a correcção deste MC nunca seria vista verde.
    assert.match(jobTeste, /working-directory:\s*desafio-gut\/frontend\s*\n\s*run:\s*npm ci/,
      "sem `npm ci` no frontend, @aws-sdk/client-kms não resolve e a suíte rebenta em CI");
    assert.match(jobTeste, /working-directory:\s*desafio-gut\/frontend\/netlify\/functions\s*\n\s*run:\s*npm ci/,
      "sem `npm ci` nas functions não há suíte nenhuma");
  });

  test("a chave de service_role é gerada, mascarada, e o segredo existe", () => {
    assert.match(jobTeste, /SUPABASE_CONTRATO_KEY=/, "a chave não é exportada");
    assert.match(jobTeste, /::add-mask::/, "o token vai para o log sem máscara — R4");
    // Achado M12: sem o segredo, o PostgREST arranca sem JWT e tudo dá 401.
    assert.match(jobTeste, /PGRST_JWT_SECRET:/, "o job não define PGRST_JWT_SECRET");
    assert.match(jobTeste, /PGRST_JWT_SECRET=/, "o PostgREST não recebe o segredo");
  });

  test("o PostgREST é alcançável a partir do runner", () => {
    // Achado M14: sem `--network host` o contentor não responde em localhost.
    const prst = passo(jobTeste, "PostgREST");
    assert.match(prst, /--network host/, "o PostgREST não partilha a rede do runner");
    assert.match(prst, /postgrest\/postgrest:/, "não corre PostgREST nenhum");
  });

  test("a migração falha alto, e não é tolerada", () => {
    const mig = passo(jobTeste, "Papeis + migracao no Postgres");
    // Achado M07: sem ON_ERROR_STOP o psql sai 0 mesmo com a migração partida.
    assert.match(mig, /ON_ERROR_STOP=1/,
      "psql sem ON_ERROR_STOP: a migração pode falhar a meio e sair 0");
    // Achado M15: `continue-on-error` deixaria o job seguir com a base vazia.
    assert.doesNotMatch(mig, /continue-on-error:\s*true/,
      "a migração está marcada como tolerável a erro");
    // Achado A-5: a versão anterior lia o nome do COMENTÁRIO, não do comando.
    const m = mig.match(/-f \/mig\/([0-9]{8}_[a-z0-9_]+\.sql)/);
    assert.ok(m, "o ci.yml não aplica migração nenhuma por `-f /mig/...`");
    const caminho = join(RAIZ, "desafio-gut", "frontend", "supabase", "migrations", m[1]);
    assert.ok(existsSync(caminho),
      `o ci.yml aplica \`${m[1]}\`, que não existe em supabase/migrations/`);
  });

  test("a guarda anti-salto mede o ficheiro certo e distingue 'não correu' de 'saltou'", () => {
    const guarda = passo(jobTeste, "Prova de que o NIVEL 2 nao saltou");
    // Achado A-7: sem fixar o nome, a guarda pode ser apontada a um ficheiro
    // que nunca salta — fica verde para sempre a provar nada.
    assert.match(guarda, /mc93d-contrato-postgrest\.test\.mjs/,
      "a guarda deixou de medir o ficheiro dos testes de contrato");
    assert.match(guarda, /--test-reporter=tap/,
      "sem repórter fixado, o parse de `# skipped` devolve vazio e a guarda mente");
    assert.match(guarda, /# skipped/, "sem leitura do número de saltados");
    // Achado A-4: um glob vazio sai 0 e fica verde.
    assert.match(guarda, /# pass/, "a guarda não verifica que algum teste chegou a correr");
    assert.match(guarda, /::error::/, "a guarda não sinaliza erro");
    // Achado M17: sem isto, se o passo dos testes falhar a prova nem corre.
    assert.match(guarda, /if:\s*always\(\)/, "a guarda não corre quando os testes falham");
  });

  test("o cenário on-chain tem job próprio e instala as deps da raiz", () => {
    assert.match(jobOnchain, /working-directory:\s*desafio-gut\s*\n\s*run:\s*npm ci/,
      "sem `npm ci` em desafio-gut/, o @nomicfoundation/edr não existe e a EVM salta");
    assert.match(jobOnchain, /mc93e-fork-onchain\.test\.mjs/);
    assert.match(jobOnchain, /--test-reporter=tap/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("MC93-E · tudo o que a suíte importa tem de existir em CI", () => {
  // ⚠️ ESTA É A GUARDA GERAL DO ACHADO A-1, e é a mais importante deste ficheiro.
  // Um teste pode importar um pacote que resolve na máquina do programador (por
  // subir a árvore de directórios) e não existe em CI. Foi assim que dois
  // ficheiros do MC30.2.1 ficaram a rebentar o job inteiro sem ninguém dar por
  // isso. Aqui o critério é: o pacote tem de vir de um lockfile que ALGUM job
  // do CI instala — e, se vier só do de `desafio-gut/`, tem de estar declarado.

  const lockfiles = {
    functions: join(AQUI, "..", "package-lock.json"),
    frontend: join(RAIZ, "desafio-gut", "frontend", "package-lock.json"),
    "desafio-gut": join(RAIZ, "desafio-gut", "package-lock.json"),
  };

  const declarados = new Map();
  for (const [nome, caminho] of Object.entries(lockfiles)) {
    if (!existsSync(caminho)) continue;
    const pacotes = JSON.parse(readFileSync(caminho, "utf8")).packages ?? {};
    for (const chave of Object.keys(pacotes)) {
      const i = chave.lastIndexOf("node_modules/");
      if (i === -1) continue;
      const nomePacote = chave.slice(i + "node_modules/".length);
      if (!declarados.has(nomePacote)) declarados.set(nomePacote, nome);
    }
  }

  /** Só o job `test-onchain` instala `desafio-gut/`; o `test-functions` não. */
  const SO_NO_JOB_ONCHAIN = new Set(["@nomicfoundation/edr"]);

  const semComentariosJS = (src) =>
    src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

  const especificadores = new Map();
  for (const f of readdirSync(AQUI).filter((n) => n.endsWith(".mjs"))) {
    const txt = semComentariosJS(readFileSync(join(AQUI, f), "utf8"));
    const padroes = [
      /\bfrom\s+"([^"]+)"/g,
      /\bimport\s*\(\s*"([^"]+)"/g,
      /\bmock\.module\(\s*"([^"]+)"/g,  // exige resolução real!
      /\brequire\(\s*"([^"]+)"/g,
    ];
    for (const p of padroes) {
      for (const m of txt.matchAll(p)) {
        const spec = m[1];
        if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("node:")) continue;
        const pacote = spec.startsWith("@")
          ? spec.split("/").slice(0, 2).join("/")
          : spec.split("/")[0];
        if (!especificadores.has(pacote)) especificadores.set(pacote, f);
      }
    }
  }

  test("o extractor encontrou importações (senão isto não testa nada)", () => {
    assert.ok(especificadores.size >= 3,
      `só ${especificadores.size} pacotes extraídos — o extractor partiu-se`);
    assert.ok(especificadores.has("ethers"), "o extractor não vê sequer o ethers");
  });

  for (const [pacote, ficheiro] of [...especificadores].sort()) {
    test(`\`${pacote}\` vem de um lockfile que o CI instala`, () => {
      const origem = declarados.get(pacote);
      assert.ok(origem,
        `${ficheiro} importa \`${pacote}\`, que não está em lockfile nenhum. ` +
        "Resolve aqui por subir a árvore de directórios; em CI não existe.");
      if (origem === "desafio-gut") {
        assert.ok(SO_NO_JOB_ONCHAIN.has(pacote),
          `${ficheiro} importa \`${pacote}\`, que só está no lockfile de ` +
          "desafio-gut/ — instalado apenas pelo job `test-onchain`. No job " +
          "`test-functions` isto rebenta. Se for de propósito, junta-o a " +
          "SO_NO_JOB_ONCHAIN e garante que o salto é honesto.");
      }
    });
  }
});

// ───────────────────────────────────────────────────────────────────────────
describe("MC93-E · o equivalente local não pode divergir do CI", () => {
  // O `act` não existe nesta máquina, por isso o HARD GATE 3 cumpre-se com o
  // script local. Isso só vale enquanto os dois usarem as MESMAS imagens.

  /** TODAS as ocorrências, não só a primeira (achado M06). */
  const versoes = (texto, nome) =>
    [...texto.matchAll(new RegExp(`${nome}:(v?[0-9][A-Za-z0-9._-]*)`, "g"))].map((m) => m[1]);
  const unico = (lista) => [...new Set(lista)];

  test("a imagem de Postgres é UMA só, e a mesma nos dois", () => {
    // Achado M06: comparar só a primeira ocorrência deixava passar um `ci.yml`
    // com o `services:` a 17 e os `docker run` a 13.
    const a = unico(versoes(ci, "postgres"));
    const b = unico(versoes(script, "postgres"));
    assert.equal(a.length, 1, `o ci.yml usa versões diferentes de Postgres: ${a.join(", ")}`);
    assert.equal(b.length, 1, `o script usa versões diferentes de Postgres: ${b.join(", ")}`);
    assert.equal(a[0], b[0], "ci.yml e ci-postgrest-local.sh usam Postgres diferentes");
  });

  test("a imagem de PostgREST é UMA só, e a mesma nos dois", () => {
    const a = unico(versoes(ci, "postgrest/postgrest"));
    const b = unico(versoes(script, "postgrest/postgrest"));
    assert.equal(a.length, 1, `o ci.yml usa versões diferentes de PostgREST: ${a.join(", ")}`);
    assert.equal(b.length, 1, `o script usa versões diferentes de PostgREST: ${b.join(", ")}`);
    assert.equal(a[0], b[0], "ci.yml e ci-postgrest-local.sh usam PostgREST diferentes");
  });

  test("os dois criam os mesmos papéis — senão a migração não aplica igual", () => {
    for (const papel of ["anon", "authenticated", "service_role", "authenticator"]) {
      assert.match(ci, new RegExp(`CREATE ROLE ${papel}\\b`), `ci.yml não cria ${papel}`);
      assert.match(script, new RegExp(`CREATE ROLE ${papel}\\b`), `o script não cria ${papel}`);
    }
  });

  test("o script corre mesmo os testes de contrato e verifica os saltos", () => {
    // Achado M24: o script podia deixar de correr o ficheiro e o teste de
    // divergência não notava, porque só comparava imagens e papéis.
    assert.match(script, /mc93d-contrato-postgrest\.test\.mjs/,
      "o script local deixou de correr os testes de contrato");
    assert.match(script, /--test-reporter=tap/, "o script não fixa o repórter");
    assert.match(script, /# skipped/, "o script não verifica o número de saltados");
  });

  test("o script aplica a MESMA migração que o CI", () => {
    const noCi = ci.match(/-f \/mig\/([0-9]{8}_[a-z0-9_]+\.sql)/);
    const noScript = scriptBruto.match(/([0-9]{8}_[a-z0-9_]+\.sql)/);
    assert.ok(noCi && noScript, "um dos dois não nomeia migração");
    assert.equal(noCi[1], noScript[1], "o CI e o script aplicam migrações diferentes");
  });
});
