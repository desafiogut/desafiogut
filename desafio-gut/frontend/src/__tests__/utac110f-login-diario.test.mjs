// UTAC110f (Frente A3) — o AppContext chama POST /login-diario uma vez por sessão e por endereço, com o
// user-session (`authToken`). O AppContext não renderiza com sessão (Privy), por isso o bloco do efeito é
// EXTRAÍDO do fonte e EXECUTADO com duplos (padrão do `utac0017bc-handlers-visto.test.mjs`) — mede o
// comportamento, não o texto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../context/AppContext.jsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const INICIO = "const loginDiarioFeitoRef = useRef(new Set());";
const FIM = "}, [address, authToken]);";
const i = SRC.indexOf(INICIO);
const j = SRC.indexOf(FIM, i);
const BLOCO = SRC.slice(i, j + FIM.length);

function montar() {
  const ref = { current: null };
  const chamadas = [];
  let resposta = { ok: true };
  const apiPost = (...args) => { chamadas.push(args); return typeof resposta === "function" ? resposta() : Promise.resolve(resposta); };
  const deps = [];
  const useRef = (v) => { if (ref.current === null) ref.current = v; return ref; };
  const useEffect = (fn, d) => { deps.push(d); fn(); };
  const correr = new Function("useRef", "useEffect", "apiPost", "address", "authToken", BLOCO);
  return {
    chamadas, deps,
    responder: (r) => { resposta = r; },
    efeito: (address, authToken) => correr(useRef, useEffect, apiPost, address, authToken),
  };
}
const flush = () => new Promise((r) => setTimeout(r, 0));
const ADDR = "0xAbCdEf0000000000000000000000000000000001";

test("F0 o bloco existe e o efeito depende de [address, authToken]", () => {
  assert.ok(i > 0 && j > i, "bloco do login diário encontrado no AppContext");
  const m = montar(); m.efeito(null, null);
  assert.deepEqual(m.deps[0], [null, null]);
});

test("F1 sem endereço ou sem token → NÃO chama (o token user-session chega depois do address)", () => {
  const m = montar();
  m.efeito(null, "tk"); m.efeito(ADDR, null); m.efeito(ADDR, "");
  assert.equal(m.chamadas.length, 0);
});

test("F2 com sessão → 1 POST login-diario, corpo vazio, com o authToken", () => {
  const m = montar();
  m.efeito(ADDR, "tk-user-session");
  assert.deepEqual(m.chamadas, [["login-diario", {}, { token: "tk-user-session" }]]);
});

test("F3 1× por sessão e por endereço (caixas diferentes = mesmo endereço); outro endereço chama", async () => {
  const m = montar();
  m.efeito(ADDR, "tk"); await flush();
  m.efeito(ADDR.toLowerCase(), "tk2"); await flush();
  assert.equal(m.chamadas.length, 1);
  m.efeito("0x0000000000000000000000000000000000000002", "tk3");
  assert.equal(m.chamadas.length, 2);
});

test("F4 resposta não-ok ou erro de rede → volta a tentar na próxima vez (não fica marcado)", async () => {
  const m = montar();
  m.responder({ ok: false, status: 502 });
  m.efeito(ADDR, "tk"); await flush();
  m.responder(() => Promise.reject(new Error("rede")));
  m.efeito(ADDR, "tk"); await flush();
  m.responder({ ok: true });
  m.efeito(ADDR, "tk"); await flush();
  m.efeito(ADDR, "tk"); await flush();
  assert.equal(m.chamadas.length, 3, "2 falhas re-tentam; depois do ok, não volta a chamar");
});
