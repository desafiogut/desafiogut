// _tests/_evm-local.mjs — MC93-E. EVM em-processo para exercer o contrato a sério.
//
// PORQUÊ ESTE FICHEIRO EXISTE
// O SEG-1 do MC93-D declarou, por escrito e com confiança, que não havia forma de
// levantar uma EVM local. Era falso, e o operador tomou uma decisão sobre essa
// informação errada. Isto é a reparação: um arnês que levanta uma EVM real,
// deploya o bytecode real do LeilaoGUT e exerce o caminho de que o worker do
// bónus depende — `adicionarSenhas` -> `darLance` -> saldo decrementado.
//
// ⚠️ NÃO USA O CLI DO HARDHAT. O binário NÃO ARRANCA nesta árvore: `--help`
// falha mesmo com `--config` explícito (medido no SEG-1 do MC93-E). Não precisa
// — uma EVM em-processo dispensa binário, ficheiro de configuração e tarefas.
//
// ⚠️ NÃO USA O CAMINHO INTERNO DO HARDHAT, E A RAZÃO É O CERNE DESTE MC.
// Medido por execução: esta árvore tem hardhat 2.28.0 + edr next.17, mas
// `npm ci` a partir do package-lock.json instala hardhat 3.4.2 + edr next.29 e
// NENHUM `solc`. São TRÊS verdades diferentes — node_modules, package.json e
// package-lock.json — e é a terceira que o CI executa. Escrever contra
// `hardhat/internal/...` daria verde aqui e partia lá, que é exactamente a
// classe de erro que este MC existe para não repetir.
// Por isso só se fala com a API PÚBLICA do @nomicfoundation/edr, cuja assinatura
// de `createProvider` foi verificada IDÊNTICA em next.17 e next.29.
//
// ⚠️ NADA AQUI TOCA A MAINNET (HARD GATE 5). chainId 31337, chaves descartáveis
// escritas neste ficheiro, contrato deployado no momento. Sem fork, sem RPC, sem
// rede. O fork de mainnet exigiria um RPC com credencial — a R5 proíbe, e os três
// endpoints públicos sem credencial recusam (medido no SEG-1).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));

/** Chaves privadas DESCARTÁVEIS, literais, sem valor em rede nenhuma. */
export const CHAVES = Object.freeze({
  coordenacao:  "0x" + "11".repeat(32),
  participante: "0x" + "22".repeat(32),
  semSenhas:    "0x" + "33".repeat(32),
});

const SALDO_INICIAL = 10n ** 21n; // 1000 ETH de brincar

/** O EdrContext é global ao processo; construí-lo duas vezes emite um aviso. */
let _ctx = null;
async function contextoPartilhado(EdrContext, chainType, criarFactory) {
  if (_ctx === null) {
    _ctx = new EdrContext();
    await _ctx.registerProviderFactory(chainType, criarFactory());
  }
  return _ctx;
}

/**
 * Diz se a EVM local pode ser levantada nesta máquina, e PORQUÊ não, se não.
 *
 * A lição do MC93-D: um `skip` tem de dizer a verdade sobre o motivo.
 * "Impossível" dispensa quem lê de voltar lá; "falta instalar" não dispensa.
 * Nunca devolver a primeira quando a verdadeira é a segunda.
 *
 * @returns {Promise<{disponivel: boolean, motivo: string}>}
 */
export async function evmDisponivel() {
  try {
    await import("@nomicfoundation/edr");
    return { disponivel: true, motivo: "" };
  } catch (err) {
    return {
      disponivel: false,
      motivo:
        "POR INSTALAR, não impossível: @nomicfoundation/edr não resolve a partir " +
        "daqui. Corre `npm ci` em desafio-gut/ (o pacote vem com o hardhat), ou " +
        "`bash scripts/run-fork-onchain.sh`. Detalhe: " +
        String(err?.message || err).slice(0, 140),
    };
  }
}

/**
 * Levanta uma EVM em-processo e devolve um provider EIP-1193 pronto para o ethers.
 *
 * @returns {Promise<{
 *   eip1193: { request(a: {method: string, params?: unknown[]}): Promise<unknown> },
 *   enderecos: { coordenacao: string, participante: string, semSenhas: string },
 * }>}
 */
export async function levantarEvm() {
  const {
    EdrContext, L1_CHAIN_TYPE, l1ProviderFactory,
    l1GenesisState, l1HardforkLatest, l1HardforkToString, ContractDecoder,
  } = await import("@nomicfoundation/edr");
  const { computeAddress, getBytes } = await import("ethers");

  const hardfork = l1HardforkLatest();
  const genesisState = l1GenesisState(hardfork);
  const ownedAccounts = [];

  for (const chave of Object.values(CHAVES)) {
    genesisState.push({
      address: getBytes(computeAddress(chave)),
      balance: SALDO_INICIAL,
      code: new Uint8Array(),
    });
    ownedAccounts.push(chave);
  }

  // ⚠️ UM EdrContext POR PROCESSO. O EDR instala um subscritor de tracing global
  // e avisa (ruidosamente) se for construído duas vezes. Cada teste continua a
  // ter a SUA EVM — o que se partilha é o contexto, não o estado da cadeia.
  const ctx = await contextoPartilhado(EdrContext, L1_CHAIN_TYPE, l1ProviderFactory);

  const provider = await ctx.createProvider(
    L1_CHAIN_TYPE,
    {
      allowBlocksWithSameTimestamp: false,
      // `false` de propósito: o contrato real tem de caber no limite real.
      // ⚠️ RESSALVA MEDIDA: ligar isto NÃO parte a suíte (mutante M13, vivo).
      // Quem apanha o excesso de tamanho é a asserção explícita de EIP-170 na
      // fixture, não esta bandeira. Fica `false` por coerência com a mainnet,
      // mas não é ela a rede de segurança — e dizer o contrário seria inventar
      // uma protecção que não foi provada.
      allowUnlimitedContractSize: false,
      // ⚠️ `true` nos dois, e a razão foi MEDIDA, não suposta. Com `false` o EDR
      // devolve os bytes do revert como RESULTADO bem-sucedido, e o ethers falha
      // com "invalid length for result data" — um controlo negativo que não
      // distingue "sem senhas" de "ABI errada" ou "sem gas" não é controlo.
      // Com `true` a razão chega decodificada e pode ser afirmada em literal.
      bailOnCallFailure: true,
      bailOnTransactionFailure: true,
      blockGasLimit: 30_000_000n,
      chainId: 31337n,
      coinbase: new Uint8Array(20),
      genesisState,
      hardfork: l1HardforkToString(hardfork),
      initialBaseFeePerGas: 0n,
      minGasPrice: 0n,
      mining: { autoMine: true, memPool: { order: "Priority" } },
      networkId: 31337n,
      observability: {},
      ownedAccounts,
      precompileOverrides: [],
    },
    { enable: false, decodeConsoleLogInputsCallback: () => [], printLineCallback: () => {} },
    { subscriptionCallback: () => {} },
    new ContractDecoder(),
  );

  // ⚠️ O EDR não entrega o revert no formato que o ethers espera, e a diferença
  // decide se o controlo negativo vale alguma coisa. MEDIDO:
  //   EDR lança  -> err.data = { reason: { Revert: "0x08c379a0…" } }
  //   ethers quer -> err.data = "0x08c379a0…"
  // Sem esta normalização, `e.reason` vem `null` e o teste só consegue afirmar
  // "falhou de alguma maneira" — que é compatível com ABI errada ou falta de gas.
  // Com ela, afirma-se a razão EM LITERAL, e o controlo distingue o que deve.
  const bytesDoRevert = (data) => {
    if (typeof data === "string") return data;
    const r = data?.reason?.Revert ?? data?.Revert ?? data?.reason;
    return typeof r === "string" ? r : undefined;
  };

  const eip1193 = {
    async request({ method, params }) {
      let resposta;
      try {
        const bruto = await provider.handleRequest(
          JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params ?? [] }),
        );
        resposta = bruto.data;
        if (typeof resposta === "string") resposta = JSON.parse(resposta);
      } catch (err) {
        const erro = new Error(err?.message ?? String(err));
        erro.code = err?.code ?? -32000;
        erro.data = bytesDoRevert(err?.data);
        throw erro;
      }
      if (resposta.error) {
        const erro = new Error(resposta.error.message);
        erro.code = resposta.error.code;
        erro.data = bytesDoRevert(resposta.error.data);
        throw erro;
      }
      return resposta.result;
    },
  };

  const enderecos = {
    coordenacao:  computeAddress(CHAVES.coordenacao),
    participante: computeAddress(CHAVES.participante),
    semSenhas:    computeAddress(CHAVES.semSenhas),
  };

  return { eip1193, enderecos };
}

/**
 * Constrói o BrowserProvider do ethers com a configuração que esta EVM exige.
 *
 * ⚠️ `cacheTimeout: -1` NÃO é afinação — é correcção, e foi MEDIDA.
 * Com a cache ligada, o ethers serve estado antigo ao `eth_estimateGas`: a mesma
 * sequência passava quando havia leituras intermédias e FALHAVA quando não havia
 * — um controlo positivo a dar reverted depois de o saldo já ter sido creditado.
 * Testes dependentes da ordem das chamadas são pior do que testes em falta,
 * porque parecem verdes até ao dia em que não parecem.
 * `batchMaxCount: 1` mantém-se porque o provider do EDR responde a um pedido de
 * cada vez, e agrupar não traz nada num arnês em-processo.
 *
 * @param {{request: Function}} eip1193
 */
export async function criarProvedor(eip1193) {
  const { BrowserProvider, Network } = await import("ethers");
  return new BrowserProvider(eip1193, Network.from(31337), {
    cacheTimeout: -1,
    batchMaxCount: 1,
    staticNetwork: Network.from(31337),
  });
}

/**
 * Lê a fixture do contrato — ABI + bytecode, VERSIONADA.
 *
 * ⚠️ Porque é uma fixture e não o artefacto do hardhat: `artifacts/` está em
 * `.gitignore`, logo o CI nunca o tem. Um teste que dependesse dele saltaria
 * sempre em CI — precisamente o defeito que este MC vem corrigir.
 * A fixture guarda o sha256 da fonte, e há um teste que o confronta: se alguém
 * mexer no `Leilao.sol` sem regenerar, a suíte falha.
 */
export function lerFixture() {
  return JSON.parse(readFileSync(join(AQUI, "fixtures", "leilao-gut.evm.json"), "utf8"));
}

/** Caminho do ficheiro-fonte do contrato, a partir daqui. */
export function caminhoFonteContrato() {
  return join(AQUI, "..", "..", "..", "..", "contracts", "Leilao.sol");
}
