// UTAC110g (P-2 / F8 do validador do 110f-front) — o ecrã aberto à meia-noite de Manaus.
//
// O DEFEITO MEDIDO (por leitura, no `2579b51`): `estadoMissoesHoje` calcula `diaManaus(new Date())` no
// MOMENTO DA CHAMADA (servidor) e o `usePontos` só relê em `[address, authToken]` — nada volta a ler os
// dados depois disso. Um ecrã aberto antes das 04:00 UTC (meia-noite de Manaus) mostrava o dia anterior
// indefinidamente, com as missões do dia velho.
//
// A CORRECÇÃO (recomendação do enunciado: refetch horário, simples e sem timer preciso): o AppContext
// agenda um `setInterval` de 1 hora que incrementa o `pontosNonce`; o `usePontos` tem o nonce nas
// dependências do `refetch`, logo vem buscar dados novos — e o SERVIDOR recalcula o `diaManaus()`.
//
// Este teste EXECUTA o bloco real extraído do `AppContext.jsx` com duplos (padrão do
// `utac110f-login-diario.test.mjs`), e verifica por LEITURA DE FONTE que o contador CHEGA ao hook
// (o agendamento sozinho não relê nada — é o par que resolve o defeito).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../context/AppContext.jsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const HOOK = readFileSync(new URL("../hooks/usePontos.js", import.meta.url), "utf8").replace(/\r\n/g, "\n");

const INICIO = "const [pontosNonce, setPontosNonce] = useState(0);";
const FIM = "}, [refetchPontosAgora]);";
const i = SRC.indexOf(INICIO);
const j = SRC.indexOf(FIM, i);
const BLOCO = SRC.slice(i, j + FIM.length);

const UMA_HORA_MS = 60 * 60 * 1000;

function montar() {
  const intervalos = [];
  const limpados = [];
  const deps = [];
  let nonce = 0;
  let cleanup = null;
  const useState = (v) => { nonce = v; return [nonce, (nv) => { nonce = typeof nv === "function" ? nv(nonce) : nv; }]; };
  const useCallback = (fn) => fn;
  const useEffect = (fn, d) => { deps.push(d); cleanup = fn() ?? cleanup; };
  const setInterval = (fn, ms) => { const id = { id: intervalos.length + 1, fn, ms }; intervalos.push(id); return id; };
  const clearInterval = (id) => { limpados.push(id); };
  const correr = new Function("useState", "useCallback", "useEffect", "setInterval", "clearInterval", BLOCO);
  return {
    intervalos, limpados, deps,
    get nonce() { return nonce; },
    get cleanup() { return cleanup; },
    efeito: () => correr(useState, useCallback, useEffect, setInterval, clearInterval),
  };
}

test("P-2(a) o bloco existe no AppContext e agenda UM intervalo de 1 hora", () => {
  assert.ok(i > 0 && j > i, "bloco do `pontosNonce` encontrado no AppContext");
  const m = montar();
  m.efeito();
  assert.equal(m.intervalos.length, 1, "um só agendamento (não um por render)");
  assert.equal(m.intervalos[0].ms, UMA_HORA_MS, "1 hora");
  assert.equal(m.deps[0].length, 1, "uma só dependência");
  assert.equal(typeof m.deps[0][0], "function", "o efeito depende do callback estável, não de estado");
});

test("P-2(b) ao fim da hora o contador incrementa (é o que manda o `usePontos` reler)", () => {
  const m = montar();
  m.efeito();
  assert.equal(m.nonce, 0);
  m.intervalos[0].fn();
  assert.equal(m.nonce, 1, "1.º tick → releitura");
  m.intervalos[0].fn();
  m.intervalos[0].fn();
  assert.equal(m.nonce, 3, "cada hora volta a ler (o dia de Manaus é recalculado no servidor)");
});

test("P-2(c) o efeito limpa o SEU intervalo (sem leak ao desmontar / mudar de sessão)", () => {
  const m = montar();
  m.efeito();
  assert.equal(typeof m.cleanup, "function", "o efeito devolve o cleanup");
  m.cleanup();
  assert.deepEqual(m.limpados, [m.intervalos[0]], "limpa exactamente o intervalo que criou");
});

// ═══ O contador TEM de CHEGAR ao hook — o agendamento sozinho não relê nada ═══════════════════════
test("P-2(d) BIDIRECIONAL — `usePontos` lê o `pontosNonce` e tem-no nas dependências do `refetch`", () => {
  assert.match(HOOK, /const\s*\{[^}]*pontosNonce[^}]*\}\s*=\s*useAppContext\(\)/,
    "o hook consome o contador do contexto");
  assert.match(HOOK, /\},\s*\[address,\s*authToken,\s*pontosNonce\]\)/,
    "o contador está nas deps do refetch — sem isto o tick não relê");
  // CONTROLO: as dependências antigas continuam lá (não se trocou a guarda, alargou-se).
  assert.match(HOOK, /\[address,\s*authToken,\s*pontosNonce\]/);
  assert.match(HOOK, /if \(!address \|\| !authToken\)/, "a guarda de sessão do hook mantém-se");
});

test("P-2(e) o AppContext EXPÕE o `pontosNonce` no `value` (senão o hook recebia `undefined`)", () => {
  assert.match(SRC, /\n\s*pontosNonce,\n/, "`pontosNonce` presente no objecto `value` do provider");
});

test("P-2(f) CONTROLO NEGATIVO — o tick de 1 h também cobre a viragem (o dia do servidor muda às 04:00 UTC)", () => {
  // O intervalo tem de ser <= o intervalo entre o ecrã abrir e a viragem: com 1 h, o atraso máximo a
  // mostrar o dia velho é de 1 hora depois das 04:00 UTC (contra «indefinidamente» antes da correcção).
  const m = montar();
  m.efeito();
  assert.ok(m.intervalos[0].ms <= 60 * 60 * 1000, "no máximo 1 h de desactualização após a viragem");
  assert.equal(m.nonce, 0, "e nada relê antes do 1.º tick (não se inventou um relógio a mais)");
});
