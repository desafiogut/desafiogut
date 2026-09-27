// mc992-conexao.test.mjs — MC99.2: CSP + singleton Supabase + ciclo de vida do realtime.
//
// ⚠️ Mede sobre CÓDIGO (comentários fora). Este MC documenta cada correcção num comentário
// que NOMEIA o que mudou (`_client`, `removeChannel`, `*.supabase.co`) — um guarda que leia
// o ficheiro cru dá RED no ficheiro correcto. Foi o defeito mais repetido da série (9×).
//
// ⚠️ ÂMBITO HONESTO: é um teste ESTÁTICO. Não instancia o cliente Supabase (importar o
// módulo exige o `import.meta.env` do Vite, indisponível no `node --test`). O que ele prova
// é a FORMA do código que garante o singleton — não a identidade de referência em runtime.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const ler = (p) => readFileSync(resolve(RAIZ, p), "utf8");
const conta = (s, sub) => s.split(sub).length - 1;

function codigo(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1"))
    .filter((l) => !/^\s*\*/.test(l))
    .join("\n");
}

test("controlo positivo: o stripper apaga comentários e poupa código", () => {
  const amostra = [
    'const a = 1; // menciona _client e removeChannel',
    "{/* bloco JSX",
    "   com _client lá dentro */}",
    "await sb.removeChannel(c);",
  ].join("\n");
  const c = codigo(amostra);
  assert.ok(!c.includes("_client"), "não apagou o comentário");
  assert.ok(c.includes("removeChannel"), "apagou código");
});

// ─────────────────────────── SEG0 — CSP ───────────────────────────
const cspDoToml = () => {
  const m = ler("netlify.toml").match(/Content-Security-Policy = "([^"]+)"/);
  assert.ok(m, "não encontrei o Content-Security-Policy no netlify.toml");
  return m[1];
};
const diretiva = (csp, nome) => {
  const d = csp.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${nome} `));
  return d ? d.slice(nome.length).trim() : "";
};

test("MC99.2/SEG0 · o CSP deixa o browser falar com o Supabase (REST e WebSocket)", () => {
  const connectSrc = diretiva(cspDoToml(), "connect-src");
  assert.ok(connectSrc, "o CSP não tem connect-src");
  assert.ok(connectSrc.split(/\s+/).includes("https://*.supabase.co"),
    "falta https://*.supabase.co no connect-src (REST bloqueado)");
  assert.ok(connectSrc.split(/\s+/).includes("wss://*.supabase.co"),
    "falta wss://*.supabase.co no connect-src (realtime bloqueado)");
});

test("MC99.2/SEG0 · HARD GATE 4 — nunca um wildcard CSP genérico", () => {
  // Esta guarda é o travão da decisão anterior: abrir o CSP é aceitável; abri-lo TODO não é.
  // Aceita só wildcards de SUBDOMÍNIO COM ESQUEMA (`https://*.dominio.tld`); recusa `*`,
  // `https://*`, `*.com`, `*.*`.
  const csp = cspDoToml();
  const suspeitos = [];
  for (const nome of ["connect-src", "script-src", "default-src", "frame-src", "img-src"]) {
    for (const tok of diretiva(csp, nome).split(/\s+/)) {
      if (!tok || !tok.includes("*")) continue;
      if (/^\w+:\/\/\*\.\S+\.\S+$/.test(tok)) continue;   // https://*.dominio.tld — ok
      suspeitos.push(`${nome} → ${tok}`);
    }
  }
  assert.deepEqual(suspeitos, [],
    `wildcard largo no CSP (proibido pelo HARD GATE 4):\n  ${suspeitos.join("\n  ")}`);
});

// ──────────────────── SEG1 — singleton verdadeiro ────────────────────
test("MC99.2/SEG1 · só existe UM sítio a criar cliente Supabase no frontend", () => {
  const f = codigo(ler("desafio-gut/frontend/src/lib/supabaseClient.js"));
  // (a) existe 1 instância: um só `createClient(`
  assert.equal(conta(f, "createClient("), 1,
    `há ${conta(f, "createClient(")} chamadas a createClient no módulo singleton`);
  // (b) o cache é a PROMESSA, não o valor: é isso que impede dois clientes quando dois
  //     chamadores concorrentes passam o mesmo teste antes de qualquer escrita.
  assert.ok(f.includes("let _promessa = null"), "o cache deixou de ser uma promessa memorizada");
  assert.equal(conta(f, "_client"), 0, "voltou o cache do VALOR (_client) — a janela reabriu");
  // (c) a promessa é criada uma só vez e devolvida em ambas as chamadas
  assert.match(f, /if \(!_promessa\)/, "desapareceu a guarda de memoização");
  assert.match(f, /return _promessa;/, "a função não devolve a promessa memorizada");
});

test("MC99.2/SEG1 · nenhum hook/componente cria cliente por conta própria", () => {
  for (const h of ["src/hooks/useRecursosApp.js", "src/hooks/useRealtimeConfig.js"]) {
    const c = codigo(ler(`desafio-gut/frontend/${h}`));
    assert.equal(conta(c, "createClient"), 0, `${h} passou a criar o seu próprio cliente`);
    assert.match(c, /getSupabaseBrowser/, `${h} deixou de usar o singleton`);
  }
});

// ──────────────────── SEG2 — ciclo de vida do realtime ────────────────────
test("MC99.2/SEG2 · `.on()` vem ANTES de `.subscribe()`", () => {
  const c = codigo(ler("desafio-gut/frontend/src/hooks/useRealtimeConfig.js"));
  const iOn = c.indexOf(".on(");
  const iSub = c.indexOf(".subscribe(");
  assert.ok(iOn > -1 && iSub > -1, "não encontrei a cadeia .on()/.subscribe()");
  assert.ok(iOn < iSub, "a ordem inverteu-se: .subscribe() antes de .on() — é o erro de produção");
});

test("MC99.2/SEG2 · a remoção do canal é AGUARDADA (a causa do subscribe-after-subscribe)", () => {
  const c = codigo(ler("desafio-gut/frontend/src/hooks/useRealtimeConfig.js"));
  // O supabase-js deduplica canais por topic: pedir o mesmo topic antes de a remoção
  // terminar devolve o canal JÁ subscrito, e o `.on()` seguinte rebenta. Sem `await`
  // no removeChannel, o reconnect reabre exactamente esse caminho.
  assert.match(c, /await\s+sb\?\.removeChannel\(c\)/,
    "o removeChannel deixou de ser aguardado — o reconnect volta a pedir o mesmo topic cedo demais");
  // guarda de reentrada: o canal é marcado como inexistente ANTES do await
  const iMarca = c.indexOf("canal = null");
  const iAwait = c.indexOf("await sb?.removeChannel");
  assert.ok(iMarca > -1 && iAwait > -1 && iMarca < iAwait,
    "`canal = null` tem de vir ANTES do await, senão duas limpezas removem o mesmo canal");
});

test("MC99.2/SEG2 · o cleanup do useEffect remove o canal", () => {
  const c = codigo(ler("desafio-gut/frontend/src/hooks/useRealtimeConfig.js"));
  assert.match(c, /return \(\) => \{[\s\S]*?limparCanal\(\)/, "o cleanup deixou de chamar limparCanal()");
  assert.match(c, /if \(timer\) clearTimeout\(timer\)/, "o cleanup deixou de cancelar o backoff");
});
