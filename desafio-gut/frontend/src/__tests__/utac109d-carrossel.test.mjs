// UTAC109d — remover o fundo branco dos 8 vídeos novos → WebM VP9 com alpha_mode=1.
//
// node --test "src/__tests__/utac109d-carrossel.test.mjs"
//
// Contexto: o UTAC109c mediu 8 MP4 h264 960² SEM alfa e com fundo BRANCO OPACO (borda 80–99% branca).
// Este UTAC aplicou a receita DOCUMENTADA do MC58 (cloud.md §MC58.1/§MC58.3, notas_mc58.1/58.3,
// MC58.2-PLANO-MIGRACAO.md §3.1): flood-fill de bordas → downscale premultiplicado 960→512 → erode 2px
// → `libvpx-vp9 -pix_fmt yuva420p -crf 30` (ALPHA_MODE=1) + poster = 1.º frame com alfa.
// DESVIO DECLARADO: white_thr 232 (default documentado) → 185, calibrado para o material novo (o chão
// claro dos vídeos v2 não é apanhado a 232; a 185 o aço escuro dos eletrodomésticos fica idêntico).
//
// O que este guarda protege (e o que morde se for revertido):
//   V = "mc60"     — (era mc59 no UTAC109d; subiu no UTAC109d.1) os assets são servidos `immutable, max-age=1 ano`; sem subir a constante o
//                    browser continuaria a servir os vídeos ANTIGOS (cache-bust vencido).
//   8 webm + 8 png — os dois formatos existem, não vazios, e os posters continuam RGBA (colour type 6).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url)); // desafio-gut/frontend
const lerTexto = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const CAR = "public/assets/guto/carrossel";
const COMP = "src/components/CarrosselGUTO.jsx";

// ── controlo de vitalidade: nada abaixo prova coisa nenhuma se os alvos não forem lidos ──
test("controlo positivo: componente e pasta de assets existem e lêem-se", () => {
  assert.ok(existsSync(join(RAIZ, COMP)), `${COMP} desapareceu`);
  const src = lerTexto(COMP);
  assert.ok(src.length > 1000, "o componente leu quase vazio — a régua ficou cega");
  assert.equal(src.includes("const N = 8"), true, "o irmão (N = 8) desapareceu: o teste de slides seria aritmética");
  assert.ok(existsSync(join(RAIZ, CAR)), `${CAR} desapareceu`);
});

test("cache-bust: a constante V foi subida para mc60 (UTAC109d.1) (senão o browser serve os vídeos antigos)", () => {
  const src = lerTexto(COMP);
  const m = src.match(/const V = "([^"]+)"/);
  assert.ok(m, "não encontrei a constante V no componente");
  assert.equal(m[1], "mc60", `V = "${m[1]}" — os assets têm cache immutable de 1 ano; tem de ser mc60`);
  assert.equal(src.includes("?v=${V}"), true, "os URLs deixaram de usar a constante V");
  // o componente continua a montar os 8 slides a partir dos assets (a troca não cortou nada)
  assert.match(src, /guto-\$\{i \+ 1\}\.webm\?v=\$\{V\}/);
  assert.match(src, /guto-\$\{i \+ 1\}\.png\?v=\$\{V\}/);
});

test("os 16 assets existem e não estão vazios (8 webm + 8 png)", () => {
  for (let i = 1; i <= 8; i += 1) {
    for (const [ext, min] of [["webm", 50 * 1024], ["png", 20 * 1024]]) {
      const rel = `${CAR}/guto-${i}.${ext}`;
      const p = join(RAIZ, rel);
      assert.ok(existsSync(p), `${rel} desapareceu`);
      const sz = statSync(p).size;
      assert.ok(sz >= min, `${rel} tem ${sz} B (< ${min}) — o asset ficou truncado/vazio`);
    }
  }
});

test("posters: os 8 PNG continuam RGBA (colour type 6) — é o defeito do quadrado branco a não voltar", () => {
  for (let i = 1; i <= 8; i += 1) {
    const buf = readFileSync(join(RAIZ, `${CAR}/guto-${i}.png`));
    assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `guto-${i}.png não é PNG`);
    // IHDR: bytes 16..24 = width/height/depth/colourtype → o colour type é o byte 25
    const colourType = buf[25];
    assert.equal(colourType, 6, `guto-${i}.png colour type ${colourType} ≠ 6 (sem canal alfa = fundo sólido)`);
  }
});
