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
  // ⚠️ REFUTAÇÃO A7/M13: ler o TOML cru deixava um `# Content-Security-Policy = "…"`
  // (linha COMENTADA) satisfazer a guarda no lugar do CSP real. Removem-se os comentários
  // antes de extrair o valor — sem isto, bastava comentar o CSP para a guarda ler outro.
  const toml = ler("netlify.toml")
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");
  const m = toml.match(/Content-Security-Policy = "([^"]+)"/);
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
  // ⚠️ REFUTAÇÃO do validador (A7): 3 evasões medidas, agora fechadas.
  //   M9  `https://*.*.com` passava (o \S+ antigo aceitava o `*` no meio do domínio);
  //   M10 `*` em `font-src` passava (directiva fora da lista vigiada);
  //   M11 `*` em `style-src` idem.
  // Agora vigia TODAS as directivas presentes e exige host a sério: `*.rotulo.tld`.
  const csp = cspDoToml();
  const suspeitos = [];
  const nomes = csp.split(";").map((x) => x.trim().split(/\s+/)[0]).filter((n) => /^[a-z-]+$/.test(n));
  for (const nome of nomes) {
    for (const tok of diretiva(csp, nome).split(/\s+/)) {
      if (!tok || !tok.includes("*")) continue;
      // aceita só esquema + UM rótulo curinga + domínio com TLD (>= 2 rótulos reais)
      if (/^[a-z]+:\/\/\*\.([a-z0-9-]+\.)+[a-z]{2,}$/.test(tok)) continue;
      suspeitos.push(nome + " -> " + tok);
    }
  }
  assert.deepEqual(suspeitos, [],
    "wildcard largo no CSP (proibido pelo HARD GATE 4): " + suspeitos.join(", "));
});

// ──────────────────── SEG1 — singleton verdadeiro ────────────────────
test("MC99.2/SEG1 · só existe UM sítio a criar cliente Supabase no frontend", () => {
  // ⚠️ LIMITAÇÃO MEDIDA (refutação A6 do validador): esta guarda é de FORMA, não de
  // IDENTIDADE. O mutante M6 do validador — repor `async` + um `await` a reabrir a janela,
  // MANTENDO todos os tokens que aqui se procuram — sobrevive a esta guarda **e mede 2
  // clientes**. Ou seja: ela detecta a regressão "voltou o cache do valor", não a família
  // inteira de regressões que produzem dois clientes. Provar identidade exige runtime (o
  // módulo depende do `import.meta.env` do Vite, indisponível no `node --test`), e essa
  // prova NÃO existe aqui. Declarado em vez de escondido.
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

test("MC99.2/SEG2 · UM canal por topic — dois hooks com a mesma chave NÃO criam dois canais", () => {
  // ⚠️ ESTA é a guarda que faltava, e sem ela o defeito real ficou vivo.
  // Reproduzido pelo validador: a rota /mercado monta MercadoLances E CardLance, ambos via
  // useRecursosApp → useRealtimeConfig(MESMA chave). Dois canais para o mesmo topic no mesmo
  // cliente global → o supabase-js deduplica, devolve o canal JÁ SUBSCRITO, e o .on() do 2.º
  // rebenta com o erro de produção. A ordem .on()/.subscribe() estar certa não salvava nada.
  const c = codigo(ler("desafio-gut/frontend/src/hooks/useRealtimeConfig.js"));
  assert.match(c, /const REGISTO = new Map\(\)/, "desapareceu o registo de canais partilhados");
  assert.match(c, /if \(entrada\) \{[\s\S]*?entrada\.assinantes\.add\(entrega\)/,
    "um 2.º hook para o mesmo topic deixou de se juntar como assinante (volta a criar canal)");
  // UM só ponto no módulo onde um canal nasce de um topic
  assert.equal(conta(c, ".channel(topic)"), 1,
    "há mais do que um sítio a criar canal — é por aqui que voltam os dois canais por topic");
});

test("MC99.2/SEG2 · o cleanup fecha o canal quando sai o ÚLTIMO assinante", () => {
  const c = codigo(ler("desafio-gut/frontend/src/hooks/useRealtimeConfig.js"));
  assert.match(c, /return \(\) => \{[\s\S]*?largar\(e\)/, "o cleanup deixou de largar o canal");
  assert.match(c, /clearTimeout\(e\.timer\)/, "o cleanup deixou de cancelar o backoff");
  assert.match(c, /if \(e\.assinantes\.size > 0\) return/,
    "o canal passa a ser fechado mesmo havendo outros consumidores — quebra o reuso");
});
