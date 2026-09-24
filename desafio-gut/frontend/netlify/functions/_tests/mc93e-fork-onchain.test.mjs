// _tests/mc93e-fork-onchain.test.mjs — MC93-E.
//
// O QUE ISTO FECHA
// O MC93-D deixou duas pendências. Esta é a segunda: o cenário on-chain, que eu
// tinha declarado IMPOSSÍVEL no SEG-1 do MC93-D. Era falso. O operador decidiu
// não instalar o Foundry com base nessa informação errada minha. Isto é a
// reparação, e corre em ~2 s sem rede, sem credencial e sem CLI.
//
// ⚠️ NÃO É UM FORK DE MAINNET, E A DIFERENÇA ESTÁ DECLARADA.
// O enunciado pedia fork via `ALCHEMY_URL`. Medido no SEG-1 do MC93-E:
// `ALCHEMY_URL` é uma credencial — a R5 proíbe tocar-lhe — e os três endpoints
// públicos que testei recusaram. (⚠️ TRÊS é uma amostra estreita: a validação
// independente notou, com razão, que há outros RPC públicos por testar. A
// afirmação honesta é "os três que testei recusaram", não "não existe nenhum".)
// O que se faz é deployar o bytecode COMPILADO A PARTIR DE `contracts/Leilao.sol`
// numa EVM local. Isto exerce a LÓGICA do contrato, não o bytecode realmente
// deployado em mainnet. Essa deriva continua POR MEDIR, e está em L-4.
//
// HARD GATE 5: nada aqui toca a mainnet. chainId 31337, chaves descartáveis.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ContractFactory, Interface, id as keccakId } from "ethers";

import {
  levantarEvm, criarProvedor, lerFixture, caminhoFonteContrato, evmDisponivel,
} from "./_evm-local.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const fixture = lerFixture();

// ───────────────────────────────────────────────────────────────────────────
// 1. A FIXTURE NÃO PODE MENTIR SOBRE A FONTE
// ───────────────────────────────────────────────────────────────────────────
describe("MC93-E · fixture do contrato", () => {
  test("o sha256 da fixture corresponde ao Leilao.sol actual", () => {
    const fonte = readFileSync(caminhoFonteContrato());
    const sha = createHash("sha256").update(fonte).digest("hex");
    assert.equal(
      sha, fixture.fonteSha256,
      "contracts/Leilao.sol mudou e a fixture não foi regenerada. " +
      "Corre: node scripts/gerar-fixture-evm.cjs (precisa de solc em desafio-gut/).",
    );
  });

  test("a fixture traz bytecode deployável e ABI não vazia", () => {
    assert.match(fixture.bytecode, /^0x[0-9a-f]{100,}$/i);
    assert.ok(fixture.abi.length > 0);
    assert.equal(fixture.contrato, "LeilaoGUT");
  });

  test("o ABI da fixture está mesmo dentro do bytecode da fixture", () => {
    // ⚠️ Achado A-3 da validação independente: o ÚNICO laço entre o ABI da
    // fixture e a sua fonte era a recompilação com `solc` — que SALTA em CI,
    // porque o `solc` não vem no package-lock.json. Logo, em CI, editar o ABI
    // da fixture à mão passava sem ninguém ver.
    // Isto amarra ABI e bytecode SEM solc: o despachante que o Solidity gera
    // compara `msg.sig` com cada selector, logo os 4 bytes de cada função
    // pública têm de aparecer literalmente no bytecode.
    const bytecode = fixture.bytecode.toLowerCase();
    const iface = new Interface(fixture.abi);
    const funcoes = iface.fragments.filter((f) => f.type === "function");
    assert.ok(funcoes.length >= 8, `só ${funcoes.length} funções no ABI da fixture`);
    for (const f of funcoes) {
      const sel = keccakId(f.format("sighash")).slice(2, 10);
      assert.ok(bytecode.includes(sel),
        `o selector ${sel} (${f.format("sighash")}) não existe no bytecode — ` +
        "o ABI da fixture não corresponde ao bytecode da fixture");
    }
  });

  test("a fixture é o que o solc produz a partir desta fonte", async (t) => {
    // Guarda contra fixture EDITADA À MÃO, na parte que o teste acima não cobre
    // (os `settings`, e a correspondência exacta do bytecode).
    // ⚠️ SALTA POR FALTA DE DEPENDÊNCIA, NÃO POR IMPOSSIBILIDADE: `solc` não
    // está no package-lock.json (medido) — só existe em árvores onde o hardhat
    // 2.x foi instalado.
    let solc;
    try {
      const { createRequire } = await import("node:module");
      solc = createRequire(import.meta.url)("solc");
    } catch {
      t.skip("solc não instalado (não vem no package-lock.json); " +
             "para correr: npm i -D solc@0.8.26 em desafio-gut/");
      return;
    }
    // Achado A-3: um bump de solc produziria um falso vermelho com a mensagem
    // errada ("foi editada à mão?"). Melhor dizer a verdade.
    assert.equal(solc.version(), fixture.solcVersion,
      `a fixture foi gerada com ${fixture.solcVersion} e o solc instalado é ` +
      `${solc.version()} — regenera a fixture ou fixa a versão do solc`);

    const fonte = readFileSync(caminhoFonteContrato(), "utf8");
    const saida = JSON.parse(solc.compile(JSON.stringify({
      language: "Solidity",
      sources: { "Leilao.sol": { content: fonte } },
      settings: fixture.settings,
    })));
    const erros = (saida.errors ?? []).filter((e) => e.severity === "error");
    assert.equal(erros.length, 0, erros.map((e) => e.formattedMessage).join(" | "));

    const compilado = saida.contracts["Leilao.sol"].LeilaoGUT;
    assert.equal("0x" + compilado.evm.bytecode.object, fixture.bytecode,
      "o bytecode da fixture não corresponde à recompilação — foi editada à mão?");
    assert.deepEqual(compilado.abi, fixture.abi, "ABI da fixture diverge da recompilação");
  });

  test("o bytecode de CRIAÇÃO cabe no limite EIP-3860 (49152 bytes)", () => {
    // ⚠️ Achado A-7: isto mede o *initcode*, não o código de runtime. O EIP-170
    // (24576) limita o RUNTIME, e esse é medido depois do deploy, no cenário.
    // O nome anterior prometia o que a asserção não fazia.
    const bytes = (fixture.bytecode.length - 2) / 2;
    assert.ok(bytes < 49152, `bytecode de criação com ${bytes} bytes`);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 2. DERIVA DE ASSINATURAS ENTRE O BACKEND E O CONTRATO
// ───────────────────────────────────────────────────────────────────────────
describe("MC93-E · o ABI do backend bate com o contrato compilado", () => {
  const fonteBackend = readFileSync(join(AQUI, "..", "_lib", "contract.mjs"), "utf8");

  const fragmentos = (() => {
    const inicio = fonteBackend.indexOf("const ABI = [");
    const bloco = fonteBackend.slice(inicio, fonteBackend.indexOf("];", inicio));
    return [...bloco.matchAll(/"((?:function|event)\s[^"]+)"/g)].map((m) => m[1]);
  })();

  const doContrato = new Interface(fixture.abi);

  test("o extractor encontrou TODOS os fragmentos", () => {
    // ⚠️ Achado A-6: o piso anterior era `>= 8` e havia 11 — apagar três
    // fragmentos do ABI deixava a suíte verde, só com menos testes. A guarda
    // apanhava o colapso total, não a erosão.
    assert.equal(fragmentos.length, 11,
      `esperava 11 fragmentos no ABI de contract.mjs e encontrei ${fragmentos.length}. ` +
      "Se acrescentaste ou removeste um de propósito, actualiza este número.");
  });

  /** Assinatura canónica: tipos e ordem. É o que entra no selector/topic0. */
  const perfil = (frag) => frag.inputs.map((i) => ({
    type: i.type, indexed: Boolean(i.indexed), name: i.name || "",
  }));

  for (const frag of fragmentos) {
    const doBackend = new Interface([frag]);
    const ehEvento = frag.startsWith("event");
    const [meu] = doBackend.fragments;
    const hash = keccakId(meu.format("sighash"));

    test(`${ehEvento ? "evento" : "função"}: ${frag.slice(0, 55)}`, () => {
      const candidatos = doContrato.fragments.filter(
        (f) => f.type === meu.type && keccakId(f.format("sighash")) === hash,
      );
      assert.equal(candidatos.length, 1,
        `${ehEvento ? "topic0" : "selector"} ${hash.slice(0, 10)} ` +
        `(${meu.format("sighash")}) não existe no contrato compilado`);
      const [dele] = candidatos;

      // ⚠️ ACHADO A-2 DA VALIDAÇÃO INDEPENDENTE, e é o que faltava mesmo.
      // O selector/topic0 é `keccak(sighash)`, e o SIGHASH NÃO INCLUI `indexed`,
      // nem os nomes, nem a mutabilidade. Foi MEDIDO que tirar `indexed` de
      // `LanceDado.lancador` mantém o MESMO topic0 — e `getLanceDadoEvents` lê
      // `args[0..4]` POR POSIÇÃO, logo passaria a devolver lixo SEM lançar
      // excepção nenhuma: lançador errado, valor 0, repetido true.
      // Corrupção silenciosa, não falha. É por isso que o selector sozinho não
      // chega, apesar de fechar a cegueira a aridade e tipos do MC93-D.
      const meuPerfil = perfil(meu);
      const delePerfil = perfil(dele);
      for (let i = 0; i < meuPerfil.length; i++) {
        assert.equal(meuPerfil[i].indexed, delePerfil[i].indexed,
          `o parâmetro ${i} (${meuPerfil[i].type}) diverge em \`indexed\` — ` +
          "o topic0 não muda, mas a descodificação posicional passa a ler lixo");
        if (meuPerfil[i].name && delePerfil[i].name) {
          assert.equal(meuPerfil[i].name, delePerfil[i].name,
            `o parâmetro ${i} chama-se \`${meuPerfil[i].name}\` no backend e ` +
            `\`${delePerfil[i].name}\` no contrato — dois \`${meuPerfil[i].type}\` ` +
            "trocados de ordem dão o mesmo selector e leitura trocada");
        }
      }
      if (!ehEvento) {
        assert.equal(meu.stateMutability, dele.stateMutability,
          `mutabilidade divergente (${meu.stateMutability} vs ${dele.stateMutability}): ` +
          "uma função declarada `view` no backend não envia transacção nenhuma");
      }
    });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 3. HARD GATE 4 — O CENÁRIO, NUMA EVM A SÉRIO
// ───────────────────────────────────────────────────────────────────────────
const { disponivel, motivo } = await evmDisponivel();

describe("MC93-E · cenário on-chain numa EVM local", { skip: disponivel ? false : motivo }, () => {
  // ⚠️ SE ESTE BLOCO SALTAR, O `node --test` NÃO O CONTA EM `# skipped` E OS
  // FILHOS NEM APARECEM. Foi medido: com o describe saltado, o gate do ci.yml
  // via `skipped 0` e dava verde. O gate passou a exigir, pelo nome, o teste
  // "saldo on-chain DECREMENTA" — que só aparece se este bloco correr mesmo.

  async function cenario() {
    const { eip1193, enderecos } = await levantarEvm();
    const provedor = await criarProvedor(eip1193);
    const coord = await provedor.getSigner(enderecos.coordenacao);
    const contrato = await new ContractFactory(fixture.abi, fixture.bytecode, coord).deploy();
    await contrato.waitForDeployment();
    return { provedor, enderecos, contrato, coord };
  }

  test("o deploy põe bytecode no endereço, dentro do limite EIP-170", async () => {
    const { provedor, enderecos, contrato } = await cenario();
    const addr = await contrato.getAddress();
    const runtime = (((await provedor.getCode(addr)).length) - 2) / 2;
    assert.ok(runtime > 1000, "endereço sem bytecode");
    // Achado A-7: ESTE é o limite que a mainnet aplica, e é ao runtime.
    assert.ok(runtime < 24576, `runtime com ${runtime} bytes — a mainnet recusaria`);
    assert.equal(
      (await contrato.coordenacao()).toLowerCase(),
      enderecos.coordenacao.toLowerCase(),
    );
  });

  test("adicionarSenhas → darLance → o saldo on-chain DECREMENTA", async () => {
    const { enderecos, contrato, provedor } = await cenario();
    const alvo = enderecos.participante;

    assert.equal(await contrato.saldoSenhas(alvo), 0n, "saldo inicial devia ser 0");

    await (await contrato.adicionarSenhas(alvo, 20)).wait();
    assert.equal(await contrato.saldoSenhas(alvo), 20n,
      "é isto que `creditarSenhas` faz em produção — 20 senhas = R$ 40,00");

    await (await contrato.abrirEdicao("R-MC93E", "Torneio", 3600)).wait();

    const participante = await provedor.getSigner(alvo);
    await (await contrato.connect(participante).darLance("R-MC93E", 1234)).wait();

    // O 19 está em LITERAL de propósito: `20 - 1` passaria se a regra mudasse.
    assert.equal(await contrato.saldoSenhas(alvo), 19n,
      "darLance tem de consumir exactamente uma senha");
  });

  test("CONTROLO NEGATIVO: sem senhas, darLance reverte — e reverte POR ESSE motivo", async () => {
    const { enderecos, contrato, provedor } = await cenario();
    await (await contrato.abrirEdicao("R-MC93E", "Torneio", 3600)).wait();
    const semNada = await provedor.getSigner(enderecos.semSenhas);

    await assert.rejects(
      () => contrato.connect(semNada).darLance.staticCall("R-MC93E", 999),
      (err) => {
        // A razão em LITERAL. A validação independente tentou fazer este teste
        // passar por outro motivo (edição inexistente, valor zero, chamador
        // errado) e não conseguiu: cada um dá a sua própria mensagem.
        assert.equal(err.reason, "Voce nao possui senhas disponiveis");
        return true;
      },
    );

    assert.equal(await contrato.saldoSenhas(enderecos.semSenhas), 0n);
  });

  test("CONTROLO POSITIVO: com uma senha, a MESMA chamada passa", async () => {
    const { enderecos, contrato, provedor } = await cenario();
    await (await contrato.abrirEdicao("R-MC93E", "Torneio", 3600)).wait();
    const conta = await provedor.getSigner(enderecos.semSenhas);

    await (await contrato.adicionarSenhas(enderecos.semSenhas, 1)).wait();
    await (await contrato.connect(conta).darLance("R-MC93E", 999)).wait();

    assert.equal(await contrato.saldoSenhas(enderecos.semSenhas), 0n);
  });

  test("creditar LOGO A SEGUIR a uma tentativa falhada funciona", async () => {
    // ⚠️ ESTE TESTE EXISTE POR CAUSA DE UM DEFEITO DO ARNÊS, não do contrato,
    // e a minha primeira versão dele não prendia nada.
    // Eu escrevi que o defeito era "dependente de temporização e não prendível".
    // ERA FALSO, e a validação independente mostrou porquê: a cache do ethers é
    // indexada pelos ARGUMENTOS (`getTag(method, req)`). Eu usava 111 e depois
    // 222 — duas chaves diferentes, nunca havia acerto na cache. Com o MESMO
    // argumento, a promessa REJEITADA é reservida e o defeito reproduz 5 em 5.
    // Não era o relógio; era eu a olhar para o sítio errado.
    const { enderecos, contrato, provedor } = await cenario();
    await (await contrato.abrirEdicao("R-MC93E", "Torneio", 3600)).wait();
    const conta = await provedor.getSigner(enderecos.semSenhas);

    await assert.rejects(async () => {
      const tx = await contrato.connect(conta).darLance("R-MC93E", 111);
      await tx.wait();
    });

    await (await contrato.adicionarSenhas(enderecos.semSenhas, 1)).wait();
    // MESMO argumento (111) de propósito — é o que expõe a cache.
    await (await contrato.connect(conta).darLance("R-MC93E", 111)).wait();

    assert.equal(await contrato.saldoSenhas(enderecos.semSenhas), 0n);
  });

  test("só a coordenação credita senhas — e a recusa diz porquê", async () => {
    const { enderecos, contrato, provedor } = await cenario();
    const intruso = await provedor.getSigner(enderecos.participante);
    await assert.rejects(
      () => contrato.connect(intruso).adicionarSenhas.staticCall(enderecos.semSenhas, 20),
      (err) => {
        // ⚠️ Achado A-5: isto só exigia "uma string não vazia". A validação
        // independente trocou a mensagem do modificador por "Voce nao possui
        // senhas disponiveis" — activamente enganadora — e o teste passou.
        assert.equal(err.reason, "Acesso restrito a coordenacao");
        return true;
      },
    );
    assert.equal(await contrato.saldoSenhas(enderecos.semSenhas), 0n);
  });

  test("⚠️ chamar adicionarSenhas num endereço SEM bytecode NÃO reverte", async () => {
    const { enderecos, provedor } = await cenario();
    // `CONTRATO_ADDRESS` tem fallback para 0x273Ef9…445e, que não tem código em
    // mainnet. Aqui reproduz-se: um endereço qualquer sem bytecode.
    const semCodigo = "0x" + "de".repeat(20);
    assert.equal(await provedor.getCode(semCodigo), "0x", "o alvo devia estar vazio");

    const falso = new ContractFactory(fixture.abi, fixture.bytecode,
      await provedor.getSigner(enderecos.coordenacao)).attach(semCodigo);

    const recibo = await (await falso.adicionarSenhas(enderecos.participante, 20)).wait();

    // ⚠️ status 1. A transacção SUCEDE. Ninguém recebe senhas nenhumas.
    // É por isto que `verificarCoordenacao()` não é opcional em `contract.mjs`.
    assert.equal(recibo.status, 1,
      "se isto passar a 0 um dia, a guarda de contract.mjs deixou de ser a única defesa");
    assert.equal(recibo.logs.length, 0, "não houve evento nenhum — nada aconteceu");
  });
});
