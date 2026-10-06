// utac0010-vencedor-contexto.test.mjs — UTAC000.10 (DEBT-009).
//
// node --test --test-concurrency=1 src/context/__tests__/utac0010-vencedor-contexto.test.mjs
//
// PORQUE ESTE TESTE É DE CONTRATO (e não de renderização)
// O `AppContext.jsx` NÃO pode ser renderizado num teste: importa o SDK do Privy (`@privy-io/
// react-auth`, 2,68 MB) e o provider REAL faz I/O (Privy, Blobs, on-chain, notificações) — é
// exactamente o que a nota do `src/pages/__tests__/_stubs/AppContext.jsx` declara («renderizar a
// página com o provider verdadeiro seria testar a rede, não a tela»). O projecto verifica este
// ficheiro por EXTRACÇÃO DE SECÇÃO — é o que fazem `cotaAtiva`, `vocabularioUI`, `consentimento`
// e `dicaLojista` — e é o que se faz aqui: protege-se a REGRA que a DEBT-009 pedia.
// (Limite declarado: isto não prova comportamento em runtime; prova a forma do código. A
// travessia de runtime está no teste da página — `utac0010-mercado-vencedor.test.mjs`.)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = () => readFileSync(new URL("../AppContext.jsx", import.meta.url), "utf8");

const semComentarios = (src) => src
  .replace(/\r\n/g, "\n")            // ⚠️ o AppContext.jsx é CRLF: sem isto, `/vencedor,\n/` nunca casa
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n").filter((l) => !l.trimStart().startsWith("//")).join("\n");

// ── A REGRA (UTAC000.10 / DEBT-009) ─────────────────────────────────────────
// O vencedor EXPOSTO pelo Provider tem de ser o OFICIAL quando existe.
// ⚠️ UTAC107e.1 (V2, decisão do operador): SEM resultado oficial o vencedor é `null` — a reserva
// LOCAL («o menor único que este browser viu», UTAC000.10) SAIU. O 🏆 só existe com o oficial.
const REGRA_OFICIAL_PRIMEIRO =
  /const vencedor = resultadoOficial\s*\?\s*\{\s*endereco: resultadoOficial\.vencedor,\s*valor: resultadoOficial\.menorUnicoCentavos\s*\}\s*:\s*null\s*;/;
const REGRA_LOCAL_RESERVA = /const vencedorLocal\b/;

test("o Provider LÊ o resultado oficial da edição activa", () => {
  const s = semComentarios(ler());
  assert.match(s, /import \{ useResultadoOficial \} from "\.\.\/hooks\/useResultadoOficial\.js";/,
    "o hook do resultado oficial deixou de ser importado pelo AppContext");
  assert.match(s, /const resultadoOficial = useResultadoOficial\(EDICAO_ATIVA\);/,
    "o AppContext deixou de pedir o resultado OFICIAL da edição activa");
});

test("o vencedor exposto é o OFICIAL quando existe, com a forma { endereco, valor }", () => {
  const s = semComentarios(ler());
  assert.match(s, REGRA_OFICIAL_PRIMEIRO,
    "o `vencedor` exposto deixou de ter o resultado OFICIAL como fonte primária "
    + "(ou mudou de forma — o overlay do MercadoLances espera `{ endereco, valor }`)");
});

test("V2 (UTAC107e.1): sem resultado oficial NÃO há vencedor — a reserva local desapareceu", () => {
  const s = semComentarios(ler());
  assert.doesNotMatch(s, REGRA_LOCAL_RESERVA,
    "a derivação LOCAL do vencedor voltou — o 🏆 apareceria sem resultado oficial (V2)");
});

test("a API do contexto não mudou: expõe `vencedor`, e não um nome novo (HI9)", () => {
  const s = semComentarios(ler());
  assert.match(s, /\n\s+vencedor,\n/,
    "`vencedor` deixou de ser exposto pelo contexto — os consumidores partiriam");
  assert.doesNotMatch(s, /\n\s+vencedorOficial,/,
    "foi acrescentada uma chave NOVA ao contexto: a interface pública mudou (HI9)");
});

// ── ⚠️ CONTROLO NEGATIVO (o teste tem de MORDER) ─────────────────────────────
// Em vez de confiar no teste, emula-se aqui a reversão da correcção (é o que a mutação M10 faz
// ao ficheiro, mais abaixo no registo) e verifica-se que as asserções da REGRA falham nessa
// versão — e que a regra da RESERVA continua a passar (senão o teste seria «falha sempre»).
test("CONTROLO: com a correcção revertida (em memória), as regras FALHAM", () => {
  const revertido = semComentarios(ler()).replace(/resultadoOficial/g, "NADA");
  assert.doesNotMatch(revertido, REGRA_OFICIAL_PRIMEIRO,
    "o teste NÃO morde: a regra do oficial passaria mesmo sem a correcção");
  // e repor a reserva local (o estado antes do V2) tem de ser apanhado pela guarda do V2
  const comReserva = semComentarios(ler()).replace(/:\s*null\s*;/, ": vencedorLocal;")
    + "\nconst vencedorLocal = null;";
  assert.match(comReserva, REGRA_LOCAL_RESERVA, "o controlo do V2 está mal construído");
});
