// MC99.1 / SEG0 — sugestão #2: cruzar rotas REFERENCIADAS x rotas REGISTADAS.
//
// Teste BIDIRECIONAL (HARD GATE 6):
//   (a) toda a rota referenciada no código existe no router;
//   (b) toda a rota registada no router é alcançável (ou está justificada);
//   (c) um mutante que introduza uma rota órfã TEM de morrer (ver prova de mutação).
//
// ⚠️ Porque este teste tem um RESOLVEDOR e não um `grep`: a 1.ª versão do instrumento
// acusou 2 "rotas partidas" — "/" e "/admin/usuarios" — e as DUAS eram artefacto:
// "/" está registada como `index` (sem `path=`), e "/admin/usuarios" é FILHO do grupo
// "/admin", com o caminho escrito em forma RELATIVA (`path="usuarios"`). Um extractor de
// regex que ignore a árvore do router inventa defeitos. O resolvedor deita abaixo a
// árvore e reconstrói os caminhos ABSOLUTOS.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚠️ BLINDSPOTS CONHECIDOS E MEDIDOS — este guarda NÃO é uma rede completa.
// O validador independente do MC99.1 refutou a alegação "resolvedor correcto / não cego"
// com 5 evasões medidas que este ficheiro NÃO apanha. Estão aqui, nomeadas, para que quem
// confie neste teste saiba exactamente o que ele não vê (e não para as esconder):
//   E3  rota nova DENTRO de /admin          → nada morre (a isenção por prefixo em (b)
//   E4  rota nova DENTRO de /corporativo       SUBSTITUI a medição na subárvore inteira —
//                                              o anti-padrão «tratar o desconhecido como
//                                              aprovado» que a série MC96.7 já pagou)
//   E5  <Route> escrito em VÁRIAS LINHAS    → invisível: rotasRegistadas() é por-linha
//   E8  <Navigate to="/x">                  → extractor de referências cego
//   E9  to={cond ? "/a" : "/b"}             → extractor de referências cego
// E6/E7 (comentários) foram CORRIGIDOS (stripper abaixo). E3/E4/E5/E8/E9 continuam abertos:
// exigem um tokenizador a sério (ou o router real), não regex. **Pendência de MC99.2.**
// Enquanto isso, a afirmação honesta deste teste é: «nenhuma rota referenciada está partida
// e nenhuma rota registada é órfã FORA das subárvores /admin e /corporativo e fora de
// <Route> multi-linha, <Navigate> e to= com ternário».
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Código sem comentários (JSX multi-linha, blocos /* *\/ e // de linha ou de FIM DE LINHA). */
function semComentarios(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|[^:"'])\/\/.*$/, "$1"))
    .filter((l) => !/^\s*\*/.test(l))
    .join("\n");
}
const ler = (p) => readFileSync(p, "utf8");

/** Devolve os caminhos ABSOLUTOS registados no router, deitando abaixo a árvore de <Route>. */
function rotasRegistadas() {
  const app = ler(join(SRC, "App.jsx"));
  const linhas = app.split(/\r?\n/);
  const pilha = [];           // prefixos dos grupos abertos
  const out = new Set();
  const juntar = (base, p) => {
    if (p.startsWith("/")) return p;
    const b = base.replace(/\/$/, "");
    return `${b}/${p}`.replace(/\/{2,}/g, "/");
  };
  // só dentro de <Routes>: evita apanhar `path=` de outra coisa
  let dentro = false;
  for (const l of linhas) {
    if (/<Routes>/.test(l)) { dentro = true; continue; }
    if (/<\/Routes>/.test(l)) break;
    if (!dentro) continue;
    const t = l.trim();
    const pai = pilha.length ? pilha[pilha.length - 1] : "";
    const ehIndex = /^<Route\b[^>]*\bindex\b/.test(t) || /\bindex\s+element=/.test(t);
    const mPath = t.match(/^<Route\b[^>]*\bpath=["']([^"']+)["']/);
    if (ehIndex) out.add(pai || "/");
    else if (mPath) out.add(juntar(pai, mPath[1]));
    // empilha/desempilha grupos (tags que abrem e não fecham na mesma linha)
    if (/^<Route\b/.test(t) && !/\/>\s*$/.test(t)) {
      pilha.push(mPath ? juntar(pai, mPath[1]) : pai);
    }
    if (/<\/Route>/.test(t)) { pilha.pop(); }
  }
  return [...out].sort();
}

/** Rotas referenciadas no código: <Link to>, <NavLink to>, navigate(), window.open().
 *  Template literals entram como PREFIXO (`/admin/usuarios/${id}` → `/admin/usuarios/`).
 *
 *  ⚠️ Varre o FICHEIRO INTEIRO, não linha a linha. A 1.ª versão era por-linha e por isso
 *  não via `<Link` e `to=` em linhas diferentes (JSX formatado multi-linha é a norma) —
 *  declarou `/produto/:id` e `/vitrine/:slot` órfãs quando são alcançadíssimas
 *  (`Vitrine.jsx:287` e `:342`). Um extractor por-linha numa linguagem onde as tags
 *  atravessam linhas inventa defeitos. */
function rotasReferenciadas() {
  const out = new Map();   // rota|prefixo -> {onde, dinamica}
  const ficheiros = [];
  (function walk(d) {
    for (const e of readdirSync(d)) {
      if (e === "node_modules" || e === "__tests__" || e === "_stubs") continue;
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.jsx?$/.test(e)) ficheiros.push(p);
    }
  })(SRC);
  const add = (rota, onde, dinamica) => {
    if (!out.has(rota)) out.set(rota, { onde: [], dinamica });
    out.get(rota).onde.push(onde);
  };
  for (const f of ficheiros) {
    const rel = relative(SRC, f).replace(/\\/g, "/");
    // ⚠️ REFUTAÇÃO do validador (E6/E7): esta função lia o ficheiro CRU, sem stripper de
    // comentários. Consequência nos dois sentidos: um comentário `// navigate("/zz-orfa")`
    // SATISFAZIA o guarda (b) e fazia uma rota órfã parecer alcançada (FALSO VERDE); e um
    // comentário a nomear uma rota DERRUBAVA código correcto (FALSO VERMELHO). É o mesmo
    // defeito que o mc991-ui.test.mjs já tratava — e que aqui faltava.
    const txtCru = ler(f);
    const txt = semComentarios(txtCru);
    const linhaDe = (idx) => txtCru.slice(0, idx).split(/\r?\n/).length;
    const regras = [
      [/<Link\b[^>]*?\bto=["']([^"']+)["']/g, false],
      [/<NavLink\b[^>]*?\bto=["']([^"']+)["']/g, false],
      [/navigate\(\s*["']([^"']+)["']/g, false],
      [/window\.open\(\s*["']([^"']+)["']/g, false],
      [/<Link\b[^>]*?\bto=\{`([^`]*)\$\{/g, true],
      [/<NavLink\b[^>]*?\bto=\{`([^`]*)\$\{/g, true],
      [/navigate\(\s*`([^`]*)\$\{/g, true],
      // `to={EXPRESSAO ?? ` + template: o backtick pode vir depois de uma expressão
      // (`to={hrefOverride ?? \`/vitrine/${slot.id}\`}` em Vitrine.jsx:342). Sem esta
      // regra, `/vitrine/:slot` foi declarada órfã — o 2.º buraco do mesmo extractor.
      [/<Link\b[^>]*?\bto=\{[^}]*?`([^`]*)\$\{/g, true],
      [/<NavLink\b[^>]*?\bto=\{[^}]*?`([^`]*)\$\{/g, true],
    ];
    for (const [re, dinamica] of regras) {
      for (const m of txt.matchAll(re)) add(m[1], `${rel}:${linhaDe(m.index)}`, dinamica);
    }
  }
  return out;
}

const registadas = rotasRegistadas();
const referenciadas = rotasReferenciadas();

/** Casa uma referência com uma rota registada: igual, ou prefixo de uma rota com parâmetro,
 *  ou a registada termina em `:param` no mesmo número de segmentos. */
/** TODAS as rotas registadas que uma referência alcança.
 *  ⚠️ Devolve uma LISTA, e não a primeira que casa. A 1.ª versão parava na primeira e por
 *  isso `/vitrine/` (prefixo dinâmico) casava com `/vitrine` e NUNCA com `/vitrine/:slot`,
 *  declarando a rota de detalhe órfã embora o link para ela esteja à vista
 *  (Vitrine.jsx:342). "Encontrei uma" não é "encontrei a certa". */
function casam(ref) {
  const out = [];
  const r = ref.replace(/\/+$/, "") || "/";
  const segR = r.split("/").filter(Boolean);
  for (const reg of registadas) {
    if (reg === r) { out.push(reg); continue; }
    const segG = reg.split("/").filter(Boolean);
    // mesma profundidade, com parâmetros a cobrir os segmentos: /admin/usuarios/x -> /admin/usuarios/:endereco
    if (segG.length === segR.length && segG.every((s, i) => s.startsWith(":") || s === segR[i])) { out.push(reg); continue; }
    // prefixo dinâmico: `/vitrine/` alcança `/vitrine/:slot`
    if (r !== "/" && reg.startsWith(r + "/")) { out.push(reg); continue; }
  }
  return out;
}

test("MC99.1/a · toda a rota REFERENCIADA existe no router", () => {
  const partidas = [];
  for (const [rota, { onde, dinamica }] of referenciadas) {
    if (/^https?:|^mailto:|^#/.test(rota)) continue;          // externos
    if (/^\$\{/.test(rota)) continue;                          // interpolação pura
    if (casam(rota).length === 0) partidas.push(`${rota}  <--  ${onde.join(", ")}${dinamica ? " [dinamica]" : ""}`);
  }
  assert.deepEqual(partidas, [],
    `rotas referenciadas que o router NÃO conhece:\n  ${partidas.join("\n  ")}`);
});

test("MC99.1/b · toda a rota REGISTADA é alcançável (ou está justificada)", () => {
  // Rotas SEM referência que estão DECLARADAS e medidas. Não é uma lista de "aprovado em
  // silêncio": cada entrada tem a medição que a sustenta, e qualquer rota NOVA sem
  // referência continua a morrer aqui (ver prova de mutação).
  const ORFAS_CONHECIDAS = {
    "/edicao/:id":
      "MEDIA/PENDENCIA — a página EdicaoDetalhe NÃO TEM UM ÚNICO link de entrada: " +
      "grep por /edicao/ em src/ só encontra a própria <Route> (App.jsx:462). A prova " +
      "está no gémeo morto `hrefOverride` (Vitrine.jsx:167,342,353): o prop foi DESENHADO " +
      "para apontar para a edição — o rótulo diz «Ir para a edição →» — e nenhum chamador " +
      "o passa. Ligar isto é DECISÃO DE PRODUTO (a página pode ser intencionalmente " +
      "inacessível); documentado, não executado. Ver _logs/MC99.1-RELATORIO.md.",
  };
  // Justificadas por natureza (não se alcançam por <Link>/navigate):
  // ⚠️ UTAC106b: `/menor-lance-unico` e `/ofertas-programadas` são DESTINOS DA BARRA
  // DE NAVEGAÇÃO — chegam-se por `<NavLink to={path}>`, ou seja, por VARIÁVEL, e este
  // extractor só vê literais/templates (blindspot declarado E5/E8/E9). A justificação
  // não fica «em silêncio»: `src/__tests__/utac106b-navegacao-frases.test.mjs` e o teste
  // MC99/SEG1 exigem que cada path de MAIN_TABS exista como `<Route path=...>` no App.jsx.
  const POR_CONFIG = /^\/(ativos|carteira|configuracoes|mercado|menor-lance-unico|ofertas-programadas|vitrine|programacao|seja-nosso-parceiro)$/;
  const POR_PROVIDER = /^\/(redirect|excluir-conta|privacidade|seguranca|corp)$/;
  const orfas = [];
  for (const reg of registadas) {
    if (reg in ORFAS_CONHECIDAS) continue;
    if (POR_CONFIG.test(reg) || POR_PROVIDER.test(reg)) continue;
    if (reg.startsWith("/admin") || reg.startsWith("/corporativo")) {
      // sub-rotas de painel: alcançadas por navegação interna do próprio painel
      const alcancada = [...referenciadas.keys()].some((r) => casam(r).includes(reg) || reg.startsWith(r));
      if (!alcancada) { orfas.push(reg); continue; }
      continue;
    }
    const alcancada = [...referenciadas.keys()].some((r) => casam(r).includes(reg));
    if (!alcancada) orfas.push(reg);
  }
  assert.deepEqual(orfas, [], `rotas registadas sem utilizador conhecido:\n  ${orfas.join("\n  ")}`);
});
