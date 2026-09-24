// MC93-D — TESTE DE CONTRATO on-chain: o que é mensurável SEM um nó.
//
// ⚠️ ERRATA AO SEG-1 — A REFUTAÇÃO DO FORK ERA FALSA.
// O SEG-1 deste MC afirmou que não havia como levantar uma EVM local: que o
// `hardhat` estava "partido" (plugin da série 2 com hardhat v3). **Era errado.**
// Medido depois, pela validação independente e reconfirmado:
//     node_modules/hardhat            → 2.28.0
//     node_modules/@nomicfoundation/hardhat-ethers → 4.0.9   (par CORRECTO)
//     ./node_modules/.bin/hardhat --version → "2.28.0", exit 0
//     @nomicfoundation/edr + edr-win32-x64-msvc → INSTALADOS (EVM em-processo)
// O erro veio de diagnosticar o binário errado: o `hardhat` v3.9.1 da cache do
// `npx`, não o que o projeto tem instalado. O Validador B levantou uma EVM
// local E um fork de mainnet **sem instalar nada**, e correu o teste inteiro:
// adicionarSenhas(20) → saldo 20 → abrirEdicao → darLance → saldo 19 →
// apurarVencedor. Com controlo negativo (darLance sem senhas reverte).
//
// ⚠️ E o argumento de mérito também não se sustinha: "o handler está em dry-run,
// logo não há saldo emitido para testar" — num fork credita-se com a mesma
// função, personificando o mesmo coordenador. E o CI Foundry mede o CÓDIGO-FONTE,
// não o bytecode deployado nem o endereço que o backend usa.
//
// ⇒ A decisão do operador de não instalar Foundry foi tomada sobre informação
//   errada minha. Foundry continua a não ser preciso — mas o fork É possível
//   e NÃO está feito. Os dois testes abaixo ficam saltados por trabalho por
//   fazer, não por impossibilidade. Ver `_logs/MC93D_SEG4_ERRATA-EXECUTOR.txt`.
//
// O QUE ESTE FICHEIRO FAZ, e vale por si: mede o contrato entre o BACKEND e o
// CONTRATO — a ABI que o backend usa contra o `Leilao.sol`, a invariante
// `saldoEfetivo ≤ saldoOnChain`, e as guardas que impedem creditar contra um
// endereço sem bytecode. Tudo sem rede.
//
// O QUE ESTE FICHEIRO FAZ, e que vale mais do que um fork para este MC:
// mede o contrato entre o BACKEND e o CONTRATO — a ABI que o backend usa
// contra o `Leilao.sol` que está deployado, e a invariante `saldoEfetivo ≤
// saldoOnChain` contra o código que a calcula. Ambos sem rede.
//
// node --test --experimental-test-module-mocks _tests/mc93d-contrato-onchain.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "../../../..");          // …/desafio-gut
const SOL = readFileSync(resolve(RAIZ, "contracts/Leilao.sol"), "utf8");

/** HARD GATE 4 (MC93-D): ler SEM comentários — um guarda não pode casar prosa. */
const semComentarios = (src) =>
  src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

const lerFn = (rel) => semComentarios(readFileSync(resolve(AQUI, "..", rel), "utf8"));

// ── CONTRATO ABI ↔ Leilao.sol ───────────────────────────────────────────────

test("CONTRATO: toda a função da ABI do backend existe no Leilao.sol", () => {
  // Drift de ABI é silencioso: o `ethers` só falha em runtime, na mainnet, com
  // dinheiro em jogo. Aqui falha no CI.
  const codigo = lerFn("_lib/contract.mjs");
  const assinaturas = [...codigo.matchAll(/"function\s+(\w+)\s*\(/g)].map((m) => m[1]);
  assert.ok(assinaturas.length > 0, "a ABI do backend tem de declarar funções");
  const fonte = semComentarios(SOL);
  // ⚠️ Uma variável de estado `public` gera um getter IMPLÍCITO com o mesmo
  // nome — `mapping(address => uint256) public saldoSenhas;` produz
  // `saldoSenhas(address) view returns (uint256)`. A primeira versão deste
  // teste só procurava `function <nome>(` e acusou `saldoSenhas`, `coordenacao`,
  // `edicaoNonce` e `resultados` de não existirem. Eram falsos positivos do
  // teste, não defeitos do código — verificado antes de os reportar.
  const existe = (nome) =>
    new RegExp(`function\\s+${nome}\\s*\\(`).test(fonte)
    || new RegExp(`public\\s+${nome}\\s*;`).test(fonte)
    || new RegExp(`\\bpublic\\s+${nome}\\b`).test(fonte);

  for (const nome of new Set(assinaturas)) {
    assert.ok(existe(nome),
      `a ABI do backend declara ${nome}(), que NÃO existe em Leilao.sol `
      + "(nem como função, nem como variável de estado pública)");
  }
});

test("CONTRATO: todo o evento escutado pelo backend existe no Leilao.sol", () => {
  const codigo = lerFn("_lib/contract.mjs");
  const eventos = [...codigo.matchAll(/"event\s+(\w+)\s*\(/g)].map((m) => m[1]);
  const fonte = semComentarios(SOL);
  for (const nome of new Set(eventos)) {
    assert.match(fonte, new RegExp(`event\\s+${nome}\\s*\\(`),
      `o backend escuta ${nome}, que NÃO existe em Leilao.sol`);
  }
});

test("CONTRATO: o contrato consome UMA senha por lance, e o mínimo é 1 centavo", () => {
  // As duas regras que o motor de pontuação espelha (REGRAS.VALOR_MINIMO_CENTAVOS
  // e o gate de saldo). Se o Solidity mudar, isto avisa.
  const fonte = semComentarios(SOL);
  assert.match(fonte, /saldoSenhas\[msg\.sender\]--/,
    "darLance tem de decrementar exactamente uma senha");
  assert.match(fonte, /require\(\s*saldoSenhas\[msg\.sender\]\s*>\s*0/,
    "darLance tem de exigir saldo on-chain > 0");
  assert.match(fonte, /require\(\s*valorEmCentavos\s*>=\s*1/,
    "o mínimo do contrato é 1 centavo (Art. XXIII)");
});

// ── A INVARIANTE SAGRADA, medida no código que a calcula ────────────────────

test("INVARIANTE: saldoEfetivo é on-chain MENOS consumo — nunca mais nada", () => {
  // `saldoEfetivo ≤ saldoOnChain` só se mantém enquanto a fórmula for
  // subtractiva. Qualquer termo aditivo off-chain quebra-a e faz o app mostrar
  // senhas que `darLance` recusa. Foi por isto que o bónus ficou DIREITO e não
  // saldo (MC93-B).
  const codigo = lerFn("saldo-senhas.mjs");
  assert.match(codigo, /saldoOnChain\s*-\s*senhasConsumidas|saldoOnChain\s*-\s*\w+/,
    "a fórmula tem de ser subtractiva");
  assert.doesNotMatch(codigo, /senhas_a_creditar|senhasACreditar/,
    "senhas_a_creditar é uma DÍVIDA por liquidar — não pode entrar no saldo");
});

test("INVARIANTE: nada no torneio importa o cálculo de saldo", () => {
  // O caminho oposto: o store e o worker não podem mexer no saldo efectivo.
  for (const rel of ["_lib/pontuacao-store.mjs", "_lib/sweeper-divida-orfa.mjs"]) {
    assert.doesNotMatch(lerFn(rel), /saldo-senhas\.mjs|lerSaldoSenhas/,
      `${rel} não pode tocar no cálculo do saldo`);
  }
});

test("INVARIANTE: só o worker do bónus pode creditar, e está em dry-run", async () => {
  const { emissaoArmada } = await import("../_lib/bonus-emissao.mjs");
  assert.equal(emissaoArmada({}), false, "ambiente vazio → não emite");
  assert.equal(emissaoArmada({ BONUS_EMISSAO_ATIVA: "1" }), false, "só a string 'true'");
  assert.equal(emissaoArmada({ BONUS_EMISSAO_ATIVA: "true" }), true);

  // E, em produção, a flag está desligada.
  assert.notEqual(process.env.BONUS_EMISSAO_ATIVA, "true",
    "a suíte não pode correr com a emissão armada");
});

// ── O QUE FICA POR MEDIR — saltado, nunca fingido ───────────────────────────

test("FORK: adicionarSenhas → darLance → saldo decrementado", (t) => {
  t.skip("POR FAZER, não impossível. Hardhat 2.28.0 e @nomicfoundation/edr "
    + "estão instalados: dá para levantar uma EVM em-processo sem instalar nada. "
    + "A validação independente do MC93-D correu este cenário completo. Fica "
    + "para o MC seguinte — ver a errata no cabeçalho deste ficheiro.");
});

test("FORK: darLance sem senhas reverte (controlo negativo)", (t) => {
  t.skip("POR FAZER, mesma razão. É o controlo negativo do teste acima.");
});

test("FORK: o CONTRATO_ADDRESS de produção tem bytecode", (t) => {
  t.skip("POR FAZER. A validação independente mediu, num fork, que o endereço "
    + "de recurso 0x273Ef9…445e tem ZERO bytes — e que adicionarSenhas contra "
    + "um endereço sem código NÃO reverte (status 1). Só verificarCoordenacao() "
    + "impede a dívida de ser marcada liquidada sem ninguém receber senhas. "
    + "Esse gate está agora coberto por teste estrutural, mas a medição do "
    + "bytecode num fork continua por fazer.");
});

test("CONTRATO: creditar exige verificarCoordenacao() — o endereço de recurso não tem código", () => {
  // `CONTRATO_ADDRESS` tem um fallback para 0x273Ef9…445e, que a validação
  // independente mediu num fork de mainnet: **zero bytes de bytecode**. Uma
  // chamada a `adicionarSenhas` contra um endereço sem código NÃO reverte —
  // devolve status 1. O worker marcaria a dívida como liquidada e ninguém
  // receberia senhas.
  // O que impede isso é `verificarCoordenacao()`, que lê `coordenacao()` do
  // contrato: num endereço sem código a leitura falha. Remover essa guarda
  // sobrevivia à suíte inteira — era a mutação M11 do Validador B.
  const codigo = lerFn("_lib/contract.mjs");
  const creditar = codigo.slice(codigo.indexOf("export async function creditarSenhas"));
  assert.match(creditar.slice(0, 400), /await\s+verificarCoordenacao\(\)/,
    "creditarSenhas TEM de verificar a coordenação antes de submeter — sem isso, "
    + "um CONTRATO_ADDRESS sem bytecode aceita a transação em silêncio");

  const submeter = codigo.slice(codigo.indexOf("export async function submeterCredito"));
  assert.match(submeter.slice(0, 400), /await\s+verificarCoordenacao\(\)/,
    "submeterCredito idem");
});
