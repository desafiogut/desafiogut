// UTAC149 — o GUTO anuncia só a especial RELÂMPAGO; a especial Programada (palpite) fica fora do anúncio.
import { test } from "node:test";
import assert from "node:assert/strict";
import { escolherEspecialAtual } from "../_lib/especial-config.mjs";

const RELAMPAGO = { id: "ESPECIAL-RELAMPAGO1", tipo: "relampago", status: "aberto",
  inicio_em: "2026-11-20T00:22:40.304Z", termino_em: "2026-11-30T23:00:00.000Z" };
const PALPITE = { id: "ESPECIAL-PALPITE1", tipo: "programado", status: "aberto",
  inicio_em: "2026-11-25T03:00:00.000Z", termino_em: "2026-12-10T02:59:00.000Z" };

test("UTAC149 · antes do fecho da Relâmpago o anúncio é dela", () => {
  assert.equal(escolherEspecialAtual([PALPITE, RELAMPAGO], Date.parse("2026-11-26T12:00:00Z"))?.id, "ESPECIAL-RELAMPAGO1");
});
test("UTAC149 · depois do fecho da Relâmpago o GUTO NÃO anuncia a palpite como especial de lances", () => {
  assert.equal(escolherEspecialAtual([PALPITE, RELAMPAGO], Date.parse("2026-12-02T12:00:00Z")), null);
});
