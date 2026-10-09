// utac109e-cartao-unico.test.mjs — UTAC109e. Padronizar as edições:
//   • o cartão da edição RELÂMPAGO é o padrão — UM só formato para as duas famílias (a variante compacta saiu);
//   • a ÚNICA diferença é a acção: «Dar lance» / «Seu lance (em centavos)» (MLC) vs «Dar palpite» /
//     «Seu palpite (nº de lances)» (OP);
//   • o GUTO ANIMADO 7 (vídeo 7 do carrossel, via `CarrosselGUTO`) substitui o GUTO estático, só no cartão VAZIO.
//
// Corre com:  node --test src/components/__tests__/utac109e-cartao-unico.test.mjs   (a partir de desafio-gut/frontend)
// O componente REAL renderizado (SSR) + leitura de fonte para a cablagem das páginas (MLC/OP/Início/CardLance).
// As páginas renderizadas vivem em `utac108e1-mlc-op` (MLC), `utac106f-ofertas` (OP) e `Dashboard.test` (Início).
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as caminho } from "node:path";
import { opcoesServidorTeste, ALIASES } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = caminho(AQUI, "..", "..");
const ler = (p) => readFileSync(caminho(SRC, p), "utf8");
// fonte sem comentários (JSX `{/* */}`, bloco e linha) — para que um comentário não satisfaça a asserção
const codigo = (src) => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/).map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

let React = null, renderToStaticMarkup = null, vite = null, Cartao = null, ACOES = null;

before(async () => {
  vite = await createServer({
    ...opcoesServidorTeste(),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    resolve: { alias: [...ALIASES] },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  const m = await vite.ssrLoadModule("/src/components/CartaoEdicao.jsx");
  Cartao = m.default; ACOES = m.ACOES;
});
after(async () => { if (vite) await vite.close(); });

const r = (props, filhos) => renderToStaticMarkup(React.createElement(Cartao, props, filhos));
const COM_EDICAO = { id: "E-1", estado: { texto: "ABERTA" }, produto: "Air Fryer", arteUrl: "/artes/x.jpg", tempo: "12:00" };
const VAZIO = { id: "SEM", estado: { texto: "SEM EDIÇÃO" }, vazio: true };
/** Tira o que é próprio de cada acção (textos e ids) — o que sobra é o FORMATO. */
const formato = (h) => h
  .replaceAll(ACOES.lance.botao, "§B").replaceAll(ACOES.palpite.botao, "§B")
  .replaceAll(ACOES.lance.rotulo, "§R").replaceAll(ACOES.palpite.rotulo, "§R")
  .replace(/\b(lance|palpite)(?=[-"])/g, "§A");

describe("UTAC109e · a acção é a única diferença", () => {
  test("os textos da acção são os decididos (pt-BR), um par por família", () => {
    assert.deepEqual(JSON.parse(JSON.stringify(ACOES)), {
      lance: { botao: "Dar lance", rotulo: "Seu lance (em centavos)" },
      palpite: { botao: "Dar palpite", rotulo: "Seu palpite (nº de lances)" },
    });
    assert.ok(Object.isFrozen(ACOES) && Object.isFrozen(ACOES.lance) && Object.isFrozen(ACOES.palpite), "a tabela de acções tem de ser imutável");
  });

  test("A · vazio: o lance mostra «Dar lance» + «(em centavos)»; nunca «Dar palpite»", () => {
    const h = r({ ...VAZIO, acao: "lance" });
    assert.match(h, /data-acao="lance"/);
    assert.match(h, /<label[^>]*for="lance-sem-edicao"[^>]*>Seu lance \(em centavos\)<\/label>/);
    assert.match(h, /<input[^>]*id="lance-sem-edicao"[^>]*type="number"[^>]*disabled=""/);
    assert.match(h, /<button[^>]*disabled=""[^>]*>Dar lance<\/button>/);
    assert.doesNotMatch(h, /Dar palpite|nº de lances/);
  });

  test("A · vazio: o palpite mostra «Dar palpite» + «(nº de lances)»; nunca «Dar lance» nem «(em centavos)»", () => {
    const h = r({ ...VAZIO, acao: "palpite" });
    assert.match(h, /data-acao="palpite"/);
    assert.match(h, /<label[^>]*for="palpite-sem-edicao"[^>]*>Seu palpite \(nº de lances\)<\/label>/);
    assert.match(h, /<input[^>]*id="palpite-sem-edicao"[^>]*type="number"[^>]*disabled=""/, "o campo do palpite tem de ser numérico");
    assert.match(h, /<button[^>]*disabled=""[^>]*>Dar palpite<\/button>/);
    assert.doesNotMatch(h, /Dar lance|em centavos/);
  });

  test("formato visual IDÊNTICO no vazio: tirando os textos da acção, o HTML é o mesmo", () => {
    assert.equal(formato(r({ ...VAZIO, acao: "lance" })), formato(r({ ...VAZIO, acao: "palpite" })));
  });

  test("formato visual IDÊNTICO com edição: arte no topo, nome + tempo, acção em baixo — igual nas duas famílias", () => {
    const filho = React.createElement("div", { "data-testid": "accao-real" }, "acção");
    const hl = r({ ...COM_EDICAO, acao: "lance" }, filho), hp = r({ ...COM_EDICAO, acao: "palpite" }, filho);
    assert.equal(formato(hl), formato(hp));
    // a ordem do casco: estado → arte (largura toda) → nome → tempo → acção
    const ordem = ["ABERTA", 'data-testid="cartao-arte"', "Air Fryer", 'data-testid="cartao-tempo"', 'data-testid="accao-real"'].map((s) => hl.indexOf(s));
    assert.ok(ordem.every((i, k) => i > 0 && (k === 0 || i > ordem[k - 1])), `ordem do cartão: ${ordem}`);
    assert.match(hl, /data-testid="cartao-arte"[^>]*style="[^"]*width:100%/, "a arte não ocupa a largura toda");
    // com edição o formulário desligado NÃO aparece (a acção real entra como filho)
    assert.doesNotMatch(hl + hp, /-desativado"/);
  });

  test("C · acção inválida ou ausente: nenhum formulário inventado e nenhum `data-acao`", () => {
    for (const acao of [undefined, "", "xpto", "constructor", "toString"]) {
      const h = r({ ...VAZIO, acao });
      assert.doesNotMatch(h, /data-acao=|-desativado"|Dar lance|Dar palpite/, `acao=${String(acao)} gerou acção`);
      assert.match(h, /Nenhuma edição em andamento/, "o vazio continua a dizer que não há edição");
    }
  });
});

describe("UTAC109e · o GUTO animado 7 só enquanto não há edição", () => {
  test("vazio → o GUTO animado 7 (poster do vídeo 7 até à 1.ª pintura) e nunca o PNG estático antigo", () => {
    for (const acao of ["lance", "palpite", undefined]) {
      const h = r({ ...VAZIO, acao });
      assert.match(h, /data-testid="guto-animado-7"[\s\S]*?<img[^>]*src="\/assets\/guto\/carrossel\/guto-7\.png\?v=mc\d+"/, `sem GUTO 7 (acao=${acao})`);
      assert.doesNotMatch(h, /guto-bemvindo\.png/);
      assert.equal((h.match(/guto-7\.png/g) || []).length, 1, "só UM GUTO no cartão vazio");
    }
  });

  test("com edição → nenhum GUTO no cartão (a arte da edição toma o lugar)", () => {
    for (const p of [COM_EDICAO, { ...COM_EDICAO, arteUrl: undefined }]) {
      const h = r({ ...p, acao: "palpite" });
      assert.doesNotMatch(h, /guto-animado-7|\/assets\/guto\//, "o GUTO apareceu com edição ativa");
    }
  });

  test("reutiliza o CarrosselGUTO (o vídeo 7 dos MESMOS slides), sem caminhos duplicados", () => {
    const c = codigo(ler("components/CartaoEdicao.jsx"));
    assert.match(c, /import CarrosselGUTO, \{ SLIDES \} from "\.\/CarrosselGUTO\.jsx";/);
    assert.match(c, /GUTO_ANIMADO_7 = Object\.freeze\(\[SLIDES\[6\]\]\)/, "não é o slide 7 do carrossel");
    assert.match(c, /<CarrosselGUTO size=\{[^}]+\} slides=\{GUTO_ANIMADO_7\} \/>/);
    assert.doesNotMatch(c, /\/assets\/guto\//, "o cartão voltou a ter um caminho de GUTO próprio");
    assert.match(codigo(ler("components/CarrosselGUTO.jsx")), /export const SLIDES = Array\.from\(/);
  });

  // Achados V1/V2/V8 do validador (SEG6): o código estava certo mas sem teste que o protegesse.
  test("V1/V2 · o GUTO 7 é decorativo (aria-hidden) e o vídeo único repete (loop) — sem crossfade não pararia", () => {
    const c = codigo(ler("components/CarrosselGUTO.jsx"));
    assert.match(c, /<video\b[^>]*\bloop\b/, "o <video> do carrossel perdeu o loop (o GUTO 7 tem UM slide e pararia)");
    assert.ok((c.match(/aria-hidden="true"/g) || []).length >= 4, "algum ramo do carrossel perdeu o aria-hidden");
    assert.match(r({ ...VAZIO, acao: "lance" }), /data-testid="guto-animado-7"><div aria-hidden="true"/);
  });

  test("V8 · o carrossel do topo do Início continua com os 8 vídeos (não foi reduzido ao 7)", () => {
    assert.match(codigo(ler("components/CarrosselGUTO.jsx")), /const N = 8;/);
    assert.match(codigo(ler("pages/Dashboard.jsx")), /<CarrosselGUTO size=\{isMobile \? 116 : 176\} \/>/, "o topo deixou de usar os slides por omissão");
  });
});

describe("UTAC109e · as páginas usam o cartão único com a acção certa (cablagem)", () => {
  const mlc = () => codigo(ler("pages/MercadoLances.jsx"));
  const op = () => codigo(ler("pages/OfertasProgramadas.jsx"));
  const inicio = () => codigo(ler("pages/Dashboard.jsx"));

  test("UM só formato: a prop `destaque` e a variante compacta saíram do cartão e de todos os consumidores", () => {
    const c = codigo(ler("components/CartaoEdicao.jsx"));
    assert.doesNotMatch(c, /\bdestaque\b|tempoRotulo|width: 64/, "a variante compacta voltou ao cartão");
    for (const [nome, f] of [["MLC", mlc()], ["OP", op()], ["Início", inicio()]]) {
      assert.doesNotMatch(f, /^\s*destaque\b|\sdestaque\s|tempoRotulo=/m, `${nome} ainda passa props da variante antiga`);
    }
  });

  test("MLC: os DOIS cartões (vazio e com edição) com acao=\"lance\"; sem formulário próprio", () => {
    const f = mlc();
    assert.equal((f.match(/<CartaoEdicao\b[^>]*\bacao="lance"/g) || []).length, 2);
    assert.doesNotMatch(f, /acao="palpite"|function LanceDesativado|Dar palpite/);
  });

  test("OP: os DOIS cartões (vazio e com edição) com acao=\"palpite\"; o botão real diz «Dar palpite»", () => {
    const f = op();
    assert.equal((f.match(/<CartaoEdicao\b[^>]*\bacao="palpite"/g) || []).length, 2);
    assert.match(f, /\{aPalpitar \? "Enviando…" : ACOES\.palpite\.botao\}/);
    assert.match(f, /\{ACOES\.palpite\.rotulo\}<\/label>/);
    assert.doesNotMatch(f, /acao="lance"|Palpitar<|"Palpitar"|Dar lance|em centavos/);
  });

  test("Início (R18-C): o botão do vidro Programada diz «Dar palpite»", () => {
    assert.match(inicio(), /\{aPalpitar \? "Enviando…" : "Dar palpite"\}/);
    assert.doesNotMatch(inicio(), /"Palpitar"/);
  });

  test("CardLance (R18-B): o lance Relâmpago real diz «Dar lance»; os outros estados do botão intactos", () => {
    const c = codigo(ler("components/CardLance.jsx"));
    assert.match(c, /: "Dar lance";/);
    assert.doesNotMatch(c, /⚡ Lance Relâmpago/);
    for (const s of ["⏳ Processando...", "🎫 Confirmar Lance (−1 senha)", "🔄 Converter R$ → senha e Lançar"]) {
      assert.ok(c.includes(s), `estado do botão perdido: ${s}`);
    }
  });
});
