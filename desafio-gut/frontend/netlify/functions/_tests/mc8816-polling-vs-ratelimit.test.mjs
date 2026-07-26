// MC88.16 (P0b) — o limite de rate do servidor tem de acomodar a cadência com que
// o cliente sonda. Se não acomodar, o polling estrangula-se a si próprio.
//
// PORQUÊ ESTE TESTE EXISTE: no MC88.15, com um pagamento REAL, mediu-se que o
// cliente sondava `confirmar-pagamento` a cada 3 s (20 req/min) contra um limite de
// 5/min em janela FIXA de 60 s. Resultado: as ~5 primeiras chamadas de cada minuto
// verificavam o Mercado Pago e as outras ~15 levavam 429 — havia até ~45 s de cada
// minuto sem QUALQUER verificação, e o pagamento só era descoberto quando a janela
// seguinte abria (~21 s de atraso evitável).
//
// Nada nos dois ficheiros indicava a dependência: uma constante vive no frontend
// (.jsx) e a outra no backend (.mjs). Este teste torna a relação explícita, para que
// baixar o limite ou acelerar o polling falhe aqui em vez de em produção.
//
// node --test _tests/mc8816-polling-vs-ratelimit.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const ler = (rel) => readFileSync(resolve(AQUI, rel), "utf8");

/** Extrai um inteiro por regex, falhando com mensagem útil se o código mudou de forma. */
function extrairInteiro(texto, regex, rotulo) {
  const m = texto.match(regex);
  assert.ok(m, `não encontrei ${rotulo} — o código mudou de forma? actualizar este teste`);
  return Number(m[1].replace(/_/g, ""));
}

test("o limite de confirmar-pagamento acomoda o polling do cliente", () => {
  const modal = ler("../../../src/components/ComprarFichasModal.jsx");
  const fn    = ler("../confirmar-pagamento.mjs");

  const intervaloMs = extrairInteiro(
    modal, /POLL_INTERVALO_MS\s*=\s*(\d[\d_]*)/, "POLL_INTERVALO_MS (frontend)",
  );
  const limitePorMin = extrairInteiro(
    fn, /aplicarRateLimit\(\s*req\s*,\s*"confirmar-pagamento"\s*,\s*(\d+)\s*\)/,
    'aplicarRateLimit(req, "confirmar-pagamento", N)',
  );

  const pedidosPorMinuto = Math.ceil(60_000 / intervaloMs);

  assert.ok(
    limitePorMin >= pedidosPorMinuto,
    `o cliente sonda ${pedidosPorMinuto}x/min (a cada ${intervaloMs} ms) mas o limite é ` +
    `${limitePorMin}/min. A janela é fixa de 60 s, logo o excedente leva 429 e fica-se ` +
    `sem verificação durante o resto do minuto — é o defeito medido no MC88.15.`,
  );
});

test("a assinatura de aplicarRateLimit em confirmar-pagamento tem os 3 argumentos", () => {
  // Guarda-corpo contra um erro real que quase entrou: `aplicarRateLimit(req, 25)`
  // omite o slug do endpoint, `limite` fica undefined, o guard de validação devolve
  // null e o rate-limit DESLIGA-SE em silêncio — uma regressão de segurança que
  // nenhum teste funcional apanharia, porque tudo continua a responder 200.
  const fn = ler("../confirmar-pagamento.mjs");
  assert.match(
    fn, /aplicarRateLimit\(\s*req\s*,\s*"confirmar-pagamento"\s*,\s*\d+\s*\)/,
    "aplicarRateLimit tem de ser chamado com (req, endpoint, limite) — sem o slug o " +
    "limite fica undefined e o rate-limit passa a no-op",
  );
});

test("limite inválido é no-op — comprova o risco do teste acima", async () => {
  const { aplicarRateLimit } = await import("../_lib/rate-limiter.mjs");
  const req = new Request("https://x/y", {
    method: "POST", headers: { "x-nf-client-connection-ip": "203.0.113.9" },
  });
  // É isto que aconteceria com `aplicarRateLimit(req, 25)`: o 2.º argumento vira o
  // endpoint e `limite` fica undefined → null → pedido passa SEM qualquer limite.
  assert.equal(await aplicarRateLimit(req, "endpoint-qualquer", undefined), null);
  assert.equal(await aplicarRateLimit(req, "endpoint-qualquer", 0), null);
});
