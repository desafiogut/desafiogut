// mc993-preload.test.mjs — MC99.3, guarda da otimização 1 (preload dos recursos críticos).
//
// BIDIRECIONAL (HARD GATE 8):
//   (a) os recursos acima da dobra SÃO pré-carregados;
//   (b) os que NÃO devem ser (o vídeo decorativo de 345 KB) continuam fora;
//   (c) cada preload aponta para um ficheiro que EXISTE — um preload para um caminho
//       errado é um pedido gasto a 404, pior que não ter preload nenhum;
//   (d) mutação: tirar um preload → RED; acrescentar o do vídeo → RED.
//
// ⚠️ Mede sobre o HTML estruturado, não por `includes` de texto solto: um comentário que
// nomeie um preload (este ficheiro documenta-os!) passaria um guarda ingénuo. É a mesma
// família de defeito que apareceu 13× na série — aqui fecha-se à nascença.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FRONT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const html = readFileSync(resolve(FRONT, "index.html"), "utf8");

/** Só as tags <link rel="preload" …> REAIS: os comentários HTML são removidos primeiro. */
function preloads(src) {
  const semComentario = src.replace(/<!--[\s\S]*?-->/g, "");
  return [...semComentario.matchAll(/<link\b[^>]*\brel="preload"[^>]*>/g)].map((m) => {
    const t = m[0];
    return {
      tag: t,
      href: (t.match(/href="([^"]+)"/) || [])[1] || "",
      as: (t.match(/\bas="([^"]+)"/) || [])[1] || "",
      media: (t.match(/media="([^"]+)"/) || [])[1] || "",
      crossorigin: /\bcrossorigin\b/.test(t),
    };
  });
}
const P = preloads(html);

test("controlo positivo: as tags lidas são reais, não comentários", () => {
  assert.ok(P.length > 0, "não li nenhum preload");
  // a prova de que os comentários são mesmo removidos: injeta um preload num comentário
  const comFalso = preloads(
    html + '\n<!-- <link rel="preload" href="/isto-nao-existe.woff2" as="font"> -->'
  );
  assert.equal(comFalso.length, P.length, "um preload dentro de comentário foi contado como real");
});

test("MC99.3/SEG2 · os recursos acima da dobra SÃO pré-carregados", () => {
  const porHref = new Map(P.map((p) => [p.href, p]));
  for (const href of ["/fonts/inter-400-latin.woff2", "/fonts/inter-900-latin.woff2"]) {
    const p = porHref.get(href);
    assert.ok(p, `falta o preload da fonte ${href} — o texto volta a esperar por ela`);
    assert.equal(p.as, "font", `${href}: as tem de ser "font"`);
    assert.ok(p.crossorigin, `${href}: uma fonte SEM crossorigin é descarregada DUAS vezes`);
  }
  assert.ok(porHref.has("/assets/guto/custom/guto-bemvindo.png"),
    "falta o preload do mascote do gate (está acima da dobra)");
  // a imagem de fundo tem de vir na variante certa por ecrã, não sempre a mesma
  const fundos = P.filter((p) => p.href.includes("backgrounds/background-"));
  assert.equal(fundos.length, 2, "esperava uma variante de fundo para cada faixa de ecrã");
  for (const f of fundos) assert.ok(f.media, `o fundo ${f.href} não tem media — seria pedido em ambos os ecrãs`);
  assert.ok(fundos.some((f) => f.media.includes("768")), "o fundo de desktop não tem breakpoint");
  assert.ok(fundos.some((f) => /767/.test(f.media)), "o fundo de mobile não tem breakpoint");
});

test("MC99.3/SEG2 · o vídeo decorativo NÃO é pré-carregado (decisão deliberada)", () => {
  const videos = P.filter((p) => /\.webm/.test(p.href));
  assert.deepEqual(videos.map((v) => v.href), [],
    "o vídeo de fundo (345 KB, decorativo) entrou no preload — competiria com o que pinta primeiro");
});

test("MC99.3/SEG2 · (c) cada preload aponta para um ficheiro que EXISTE", () => {
  // um preload para um caminho errado gasta um pedido a 404 e atrasa o que interessa.
  const faltam = P.map((p) => p.href)
    .filter((h) => h.startsWith("/"))
    .filter((h) => !existsSync(resolve(FRONT, "public", h.replace(/^\//, ""))));
  assert.deepEqual(faltam, [], `preloads apontam para ficheiros inexistentes: ${faltam.join(", ")}`);
});

test("MC99.3/SEG2 · o preload não substitui o poster/vídeo (nada foi removido do fundo)", () => {
  const bg = readFileSync(resolve(FRONT, "src/widgets/layout/BackgroundCanvas.jsx"), "utf8");
  assert.ok(bg.includes("fundo-loop-v3-desktop.webm"), "o vídeo de fundo do desktop desapareceu");
  assert.ok(bg.includes("fundo-loop-v3-mobile.webm"), "o vídeo de fundo do mobile desapareceu");
  assert.ok(bg.includes("poster="), "o poster do vídeo desapareceu (o preload do fundo não o substitui)");
});
