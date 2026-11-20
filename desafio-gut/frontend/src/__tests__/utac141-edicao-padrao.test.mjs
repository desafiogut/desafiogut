// utac141-edicao-padrao.test.mjs — UTAC141 · O PADRÃO DE UI/UX DAS EDIÇÕES (skill `utac-edicoes`).
//
// O que se prova aqui, e porquê:
//   A — o SELO de estado da especial tem UMA tabela (`SELO_ESPECIAL`) e ela diz «🟢 Aberta» com a edição
//       aberta. Era a divergência cartão («🟢 Aberta») vs tabela («🕒 Em breve») que o operador viu.
//   B — a `TabelaLances` aceita esse selo e mostra-o; SEM selo continua a dizer o que dizia (bidireccional:
//       a correcção não pode ser um texto cravado).
//   C — `FormularioAcao`: rótulo + LINHA [campo · botão]. O campo NÃO fica desligado só porque o botão está
//       (senão o utilizador não conseguia escrever o valor que liga o botão).
//   D — `CardLance` variante «embutida» (a da especial): sem segundo cartão, sem «🎯 Dar Lance», campo e
//       botão na MESMA linha, rótulo «Seu lance (em pontos)», sem «R$ 0,05».
//   E — `CardLance` variante «cartao» (o Relâmpago do MLC) NÃO regrediu: continua com o cabeçalho próprio,
//       e o rótulo passou a pontos (o lance é pago em pontos — UTAC110n/Art. 18º).
//   F — o débito já existe no servidor; o que faltava era o ecrã. Depois de um lance, o CardLance chama
//       `refetchPontosAgora` (o nonce do AppContext) — sem isso só a cópia local do hook relia.
//   G — `useRankingEspecial` relê com o `nonce` (o lance do próprio utilizador aparece sem esperar Realtime).
//
// LIMITE DECLARADO: sem DOM (renderToStaticMarkup + `_hook-runner`), como o resto da suíte. Não se prova a
// posição em píxeis: prova-se a ESTRUTURA (o campo e o botão dentro do mesmo `data-form-acao`) e a fonte
// única (ambos os ecrãs importam o mesmo módulo de estilos).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(AQUI, "..");
const RAIZ_PROJ = resolve(SRC, "..");
const STUBS_106C = resolve(AQUI, "_stubs-106c");
const STUBS_110D = resolve(AQUI, "_stubs-110d");
const STUBS_PAG = resolve(SRC, "pages", "__tests__", "_stubs");
const STUBS_COMP = resolve(SRC, "components", "__tests__", "_stubs");

const ALIASES = [
  { find: /^\.\.\/context\/AppContext\.jsx$/, replacement: `${STUBS_PAG}/AppContext.jsx` },
  { find: /^\.\.\/\.\.\/context\/AppContext\.jsx$/, replacement: `${STUBS_PAG}/AppContext.jsx` },
  { find: /^\.\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_110D}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/hooks\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_110D}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/hooks\/useRecursosApp\.js$/, replacement: `${STUBS_PAG}/useRecursosApp.js` },
  { find: /^@privy-io\/react-auth$/, replacement: `${STUBS_110D}/privy.js` },
  { find: /^\.\.\/utils\/web3\.js$/, replacement: `${STUBS_110D}/web3.js` },
  { find: /^\.\.\/components\/ComprarFichasModal\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^react-router-dom$/, replacement: `${STUBS_106C}/rr.jsx` },
  // Instrumentos do repo já usados pelo utac140-tabela-especial: DOMPurify e o resultado oficial.
  { find: /^dompurify$/, replacement: `${STUBS_COMP}/dompurify.js` },
  { find: /^\.\.\/hooks\/useResultadoOficial\.js$/, replacement: `${STUBS_COMP}/useResultadoOficial.js` },
];

let vite, React, renderToStaticMarkup, montar, duploDeFetch, definirContexto;
let CardLance, TabelaLances, FormularioAcao, ESTILO_ACAO, estiloEspecial, useRankingEspecial;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(RAIZ_PROJ, "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  CardLance = (await vite.ssrLoadModule("/src/components/CardLance.jsx")).default;
  TabelaLances = (await vite.ssrLoadModule("/src/components/TabelaLances.jsx")).default;
  ({ default: FormularioAcao, ESTILO_ACAO } = await vite.ssrLoadModule("/src/components/_formAcaoEdicao.jsx"));
  estiloEspecial = await vite.ssrLoadModule("/src/components/edicao-especial/_estilo-especial.js");
  ({ useRankingEspecial } = await vite.ssrLoadModule("/src/hooks/useRankingEspecial.js"));
});
after(async () => { if (vite) await vite.close(); });

const semTags = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const ficheiro = (rel) => readFileSync(resolve(SRC, rel), "utf8");

// ═══ A — o selo ═════════════════════════════════════════════════════════════════════
test("A · SELO_ESPECIAL: uma só tabela, quatro estados, a ABERTA diz «🟢 Aberta»", () => {
  const { SELO_ESPECIAL, ESTADO_ESPECIAL, estadoEspecial } = estiloEspecial;
  assert.ok(Object.isFrozen(SELO_ESPECIAL));
  assert.deepEqual(Object.keys(SELO_ESPECIAL).sort(), Object.values(ESTADO_ESPECIAL).sort());
  assert.equal(SELO_ESPECIAL[ESTADO_ESPECIAL.ACTIVA].texto, "🟢 Aberta");
  assert.notEqual(SELO_ESPECIAL[ESTADO_ESPECIAL.ACTIVA].texto, SELO_ESPECIAL[ESTADO_ESPECIAL.AGENDADA].texto);

  const aberta = { id: "ESPECIAL-X", inicio_em: "2026-11-20T00:00:00Z", termino_em: "2026-11-30T23:00:00Z" };
  const agora = Date.parse("2026-11-21T00:00:00Z");
  assert.equal(estadoEspecial(aberta, agora), ESTADO_ESPECIAL.ACTIVA);
  // O cartão e a tabela leem a MESMA tabela — é isto que impede a divergência de voltar.
  const cartao = ficheiro("components/edicao-especial/CardEdicaoEspecial.jsx");
  assert.match(cartao, /SELO_ESPECIAL/);
  assert.match(cartao, /const BADGE = SELO_ESPECIAL;/);
  assert.equal(/texto: "🕒 Em breve"/.test(cartao), false, "o selo voltou a ser cravado no cartão");
  const pagina = ficheiro("pages/MercadoLances.jsx");
  assert.match(pagina, /SELO_ESPECIAL\[estadoDaEspecial\]/, "a tabela não lê o selo da edição");
  // O selo tem de CHEGAR à tabela (não basta ser calculado).
  assert.match(pagina, /selo=\{edicaoEspecial \? seloEspecial : undefined\}/, "o selo da edição não é passado à tabela");
  // Achado ⚠️1 do validador: o estado tem de vir do RELÓGIO DO CARTÃO (tick de 1 s), não de uma fotografia
  // na página — senão no instante do fecho o cartão dizia «Encerrada» e a tabela continuava «Aberta».
  assert.match(pagina, /onEstado=\{setEstadoDaEspecial\}/, "a página não lê o estado do cartão");
  assert.match(cartao, /useEffect\(\(\) => \{ onEstado\?\.\(estado\); \}, \[estado, onEstado\]\)/, "o cartão não publica o estado");
});

// ═══ B — a tabela aceita o selo ══════════════════════════════════════════════════════
test("B · BIDIRECCIONAL — com `selo` a tabela diz «🟢 Aberta»; sem `selo` mantém «Em breve»", () => {
  const lances = [{ enderecoCurto: "0x1111…aaaa", valor: null, oculto: true, repetido: null }];
  const props = { lances, idEdicao: "ESPECIAL-X", prazoTimestamp: 0, encerrado: false };
  const comSelo = semTags(renderToStaticMarkup(React.createElement(TabelaLances,
    { ...props, selo: { texto: "🟢 Aberta", cor: "#10b981" } })));
  assert.match(comSelo, /🟢 Aberta/);
  assert.equal(comSelo.includes("Em breve"), false, "o selo global ainda aparece com a edição aberta");

  const semSelo = semTags(renderToStaticMarkup(React.createElement(TabelaLances, props)));
  assert.match(semSelo, /Em breve/, "sem selo próprio a tabela tem de continuar como era (controlo positivo)");
  assert.equal(semSelo.includes("🟢 Aberta"), false);
});

// ═══ C — o formulário canónico ═══════════════════════════════════════════════════════
test("C · FormularioAcao: rótulo + LINHA [campo · botão]; botão desligado NÃO desliga o campo", () => {
  const h = renderToStaticMarkup(React.createElement(FormularioAcao, {
    id: "campo-x", rotulo: "Seu lance (em pontos)", valor: "", onChange: () => {},
    placeholder: "Ex.: 40", botao: "Dar lance", onEnviar: () => {}, desabilitado: true, desabilitadoCampo: false,
  }));
  assert.match(h, /<label[^>]*for="campo-x"[^>]*>Seu lance \(em pontos\)<\/label>/);
  assert.match(h, /data-form-acao="edicao"/);
  const linha = h.slice(h.indexOf("data-form-acao"), h.indexOf("</div>", h.indexOf("</button>")));
  assert.match(linha, /<input/, "o campo não está na linha do botão");
  assert.match(linha, /<button/, "o botão não está na linha do campo");
  assert.match(h, /<input(?![^>]*disabled)[^>]*id="campo-x"/, "o campo ficou desligado e não se pode escrever");
  assert.match(h, /<button[^>]*disabled/, "o botão devia estar desligado");
  // O estado de envio é do formulário (a OP passa `enviando={aPalpitar}`).
  const enviando = renderToStaticMarkup(React.createElement(FormularioAcao, {
    id: "campo-y", rotulo: "Seu palpite (nº de lances)", valor: "3", onChange: () => {},
    botao: "Dar palpite", enviando: true, onEnviar: () => {},
  }));
  assert.match(semTags(enviando), /Enviando…/);
  assert.match(enviando, /<button[^>]*disabled/);

  // Os estilos canónicos são partilhados, não copiados.
  assert.equal(ESTILO_ACAO.input.minHeight, "48px");
  assert.equal(ESTILO_ACAO.linha.display, "flex");
  const op = ficheiro("pages/OfertasProgramadas.jsx");
  assert.match(op, /import FormularioAcao from "\.\.\/components\/_formAcaoEdicao\.jsx"/, "a Programada deixou de usar o padrão");
  assert.equal(/flex: "1 1 120px"/.test(op), false, "a Programada voltou a desenhar o seu próprio formulário");
});

// ═══ D/E — CardLance: as duas variantes ═════════════════════════════════════════════
let nEndereco = 0;
const novoEndereco = () => `0x${String(++nEndereco).padStart(40, "b")}`;
const contexto = (address, extra = {}) => ({
  isConnected: true, abrirModal: () => {}, address, user: { email: { address: "a@b.c" } },
  refetchSaldo: () => {}, saldoRsCentavos: 1234, saldoRsStatus: "ok", refetchSaldoRs: () => {},
  saldoSenhas: 0, saldoSenhasStatus: "ok", userLabel: "Teste", authToken: "AUTH-141",
  ...extra,
});

/** Monta o CardLance REAL com o mesmo duplo de servidor do utac110d-front. */
async function montarLance({ pontos = 40, variante = "cartao", ctx = {} } = {}) {
  const address = novoEndereco();
  definirContexto(contexto(address, ctx));
  const estado = { pontos, lances: 0 };
  const dup = duploDeFetch((url, opts) => {
    if (/ler-pontos$/.test(url)) {
      return { status: 200, json: { ok: true, pontos: 0, pontosCartao: 0, lance: { creditos: 0, pontos: estado.pontos, historico: [] } } };
    }
    if (/auth-lance$/.test(url)) return { status: 200, json: { token: "LANCE-AUTH", ttl: 600 } };
    if (/lance-relampago$/.test(url)) {
      const v = JSON.parse(opts.body).valorCentavos;
      estado.pontos -= v; estado.lances += 1;
      return { status: 201, json: { ok: true, lanceId: `L-${estado.lances}`, pontosLanceConsumidos: v, pontosLanceRestantes: estado.pontos } };
    }
    return { status: 404, json: {} };
  });
  const fetchAntes = globalThis.fetch;
  globalThis.fetch = async (...a) => {
    const r = await fetchAntes(...a);
    if (typeof r.json !== "function") r.json = async () => JSON.parse(await r.text());
    return r;
  };
  const props = {
    idEdicao: "ESPECIAL-RELAMPAGO1", address, isConnected: true, encerrado: false,
    modalidade: "flash", variante, onConnect: () => {}, onDisconnect: () => {},
  };
  const c = montar(CardLance, [props]);
  await c.assentar();
  const html = () => renderToStaticMarkup(React.createElement(React.Fragment, null, c.resultado()));
  const nos = () => {
    const fora = [];
    (function walk(n) {
      if (n == null || typeof n === "boolean" || typeof n === "string") return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (typeof n !== "object") return;
      fora.push(n);
      if (n.props) walk(n.props.children);
    })(c.resultado());
    return fora;
  };
  const texto = (n) => n == null || typeof n === "boolean" ? ""
    : (typeof n === "string" || typeof n === "number") ? String(n)
    : Array.isArray(n) ? n.map(texto).join("") : n.props ? texto(n.props.children) : "";
  // A variante embutida delega no `FormularioAcao`: o campo/botão vivem dentro DELE, e um varrimento de
  // elementos React não desce para dentro de componentes-função. Usa-se o elemento e os props dele.
  const formulario = () => nos().find((n) => n.type === FormularioAcao);
  const escrever = async (v) => {
    const input = nos().find((n) => n.type === "input");
    if (input) input.props.onChange({ target: { value: v } });
    else formulario().props.onChange({ target: { value: v } });
    await c.assentar();
  };
  const enviar = async () => {
    const b = nos().find((n) => n.props?.onClick && /Dar lance/.test(texto(n)));
    if (b) b.props.onClick(); else formulario().props.onEnviar();
    await c.assentar();
  };
  const desabilitado = () => {
    const b = nos().find((n) => n.props?.onClick && /Dar lance/.test(texto(n)));
    return b ? b.props.disabled : formulario().props.desabilitado;
  };
  const fim = () => { globalThis.fetch = fetchAntes; dup.restaurar(); };
  return { c, estado, html, escrever, enviar, desabilitado, fim };
}

test("D · variante EMBUTIDA: sem segundo cartão, sem «🎯 Dar Lance», campo+botão na mesma linha, «em pontos»", async () => {
  const s = await montarLance({ variante: "embutida" });
  try {
    await s.escrever("37");
    const h = s.html();
    const t = semTags(h);
    assert.match(h, /data-variante-lance="embutida"/, "não é a variante embutida");
    assert.equal(t.includes("🎯 Dar Lance"), false, "o sub-card «Dar Lance» continua lá");
    assert.equal(h.includes("Edição: ESPECIAL-RELAMPAGO1"), false, "a barra de carteira do sub-card continua lá");
    assert.equal(t.includes("Lance protegido e sanitizado"), false, "o rodapé do sub-card continua lá");
    assert.match(t, /Seu lance \(em pontos\)/);
    assert.equal(/\(em centavos\)/.test(t), false, "o campo ainda fala em centavos");
    assert.equal(/R\$ 0,05/.test(t), false, "o placeholder ainda fala em R$");
    assert.match(h, /Ex\.: 40/, "placeholder novo (pontos) ausente");
    // campo e botão dentro do MESMO formulário (uma linha) — o padrão do «Dar palpite»
    const bloco = h.slice(h.indexOf("data-form-acao"), h.indexOf("</button>"));
    assert.match(bloco, /<input/, "campo fora do formulário");
    assert.match(bloco, /<button/, "botão fora da linha do campo");
    assert.equal(s.desabilitado(), false, "com 40 pontos um lance de 37 devia estar activo");
  } finally { s.fim(); }
});

test("D2 · a fonte: a Edição Especial monta o CardLance com variante=\"embutida\"", () => {
  // Sem esta asserção, tirar a variante da página deixava a especial a mostrar o sub-cartão outra vez e
  // nenhum teste ficava vermelho (o teste D monta o CardLance directamente, não passa pela página).
  const pagina = ficheiro("pages/MercadoLances.jsx");
  const trecho = pagina.slice(pagina.indexOf("renderLance="), pagina.indexOf("renderLance=") + 900);
  assert.match(trecho, /<CardLance[\s\S]{0,180}?variante="embutida"/, "a especial perdeu a variante embutida");
  // CONTROLOS POSITIVOS: só UM formulário embutido na página (o da especial), e o Relâmpago normal não está
  // dentro do `renderLance` da especial.
  assert.equal((pagina.match(/variante="embutida"/g) || []).length, 1, "há mais do que um formulário embutido na página");
  const foraDoEspecial = pagina.slice(0, pagina.indexOf("renderLance=")) + pagina.slice(pagina.indexOf("renderLance=") + 900);
  assert.equal(/variante="embutida"/.test(foraDoEspecial), false, "o Relâmpago normal passou a embutido");
});

test("E · variante CARTÃO (Relâmpago do MLC) não regrediu: cabeçalho próprio mantido, rótulo em pontos", async () => {
  const s = await montarLance({ variante: "cartao" });
  try {
    await s.escrever("37");
    const h = s.html();
    const t = semTags(h);
    assert.equal(h.includes("data-variante-lance=\"embutida\""), false);
    assert.match(t, /🎯 Dar Lance/, "o cabeçalho do Relâmpago desapareceu");
    assert.match(t, /Seu lance \(em pontos\)/);
    assert.equal(/\(em centavos\)/.test(t), false);
    assert.match(t, /37 pontos/, "a pré-visualização do valor não está em pontos");
  } finally { s.fim(); }
});

// ═══ F — o saldo do ecrã desce ═══════════════════════════════════════════════════════
test("F · depois do lance o CardLance manda reler TODOS os `usePontos` (refetchPontosAgora)", async () => {
  let pedidos = 0;
  const s = await montarLance({ pontos: 40, variante: "embutida", ctx: { refetchPontosAgora: () => { pedidos += 1; } } });
  try {
    await s.escrever("5");
    await s.enviar();
    assert.equal(s.estado.lances, 1, "o lance não chegou ao servidor");
    assert.ok(pedidos >= 1, "o saldo global não foi relido (o número do ecrã ficaria parado)");
  } finally { s.fim(); }
});

test("F · a fonte: o AppContext expõe `refetchPontosAgora` e o CardLance usa-o", () => {
  const ctx = ficheiro("context/AppContext.jsx");
  assert.match(ctx, /const refetchPontosAgora = useCallback/);
  assert.match(ctx, /^\s+refetchPontosAgora,$/m, "o nonce não está no value do contexto");
  const card = ficheiro("components/CardLance.jsx");
  assert.match(card, /refetchPontosAgora/);
  assert.match(card, /try \{ refetchPontosAgora\?\.\(\); \} catch \{\}/);
});

// ═══ G — a tabela relê com o nonce ═══════════════════════════════════════════════════
test("G · useRankingEspecial: o `nonce` força uma releitura (o lance do próprio utilizador aparece já)", async () => {
  let leituras = 0;
  const cliente = {
    rpc: async () => { leituras += 1; return { data: [{ posicao: 1, endereco: "0x1111…aaaa", valor_oculto: null }], error: null }; },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
  };
  const opcoes = {
    obterCliente: async () => cliente, configurado: () => true, intervaloMs: 0,
  };
  const c = montar(useRankingEspecial, ["ESPECIAL-X", { ...opcoes, nonce: 0 }]);
  await c.assentar();
  const primeira = leituras;
  assert.equal(primeira, 1, "a leitura inicial não aconteceu");
  assert.equal(c.resultado().length, 1);

  await c.actualizar(["ESPECIAL-X", { ...opcoes, nonce: 1 }]);
  await c.assentar();
  assert.ok(leituras > primeira, "o nonce mudou e a tabela não releu");

  // CONTROLOS POSITIVOS: sem mudança de nonce não há leitura nova (o efeito não corre a cada render).
  const antesIgual = leituras;
  await c.actualizar(["ESPECIAL-X", { ...opcoes, nonce: 1 }]);
  await c.assentar();
  assert.equal(leituras, antesIgual, "o efeito relê sem nada ter mudado");
  await c.desmontar();
  assert.equal(typeof cliente.removeChannel, "function");
});

// ═══ H — os achados do validador adversarial (2.ª ronda) ═════════════════════════════
test("H1 · a tabela NÃO se esvazia quando só o `nonce` muda (sem flash «Nenhum lance»)", async () => {
  // ⚠️1 do validador: `setLances([])` na 1.ª linha do efeito + efeito dependente do `nonce` = o utilizador
  // dava um lance e via «📭 Nenhum lance registrado ainda» no instante em que o lance dele entrava.
  let leituras = 0;
  const cliente = {
    rpc: async () => { leituras += 1; return { data: [{ posicao: 1, endereco: "0x1111…aaaa", valor_oculto: null }], error: null }; },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
  };
  const opcoes = { obterCliente: async () => cliente, configurado: () => true, intervaloMs: 0, nonce: 0 };
  const c = montar(useRankingEspecial, ["ESPECIAL-X", opcoes]);
  await c.assentar();
  assert.equal(c.resultado().length, 1);

  // Releitura por nonce: entre o pedido e a resposta a tabela TEM de continuar com a linha antiga.
  c.actualizar(["ESPECIAL-X", { ...opcoes, nonce: 1 }]);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(c.resultado().length, 1, "a tabela esvaziou-se no instante da releitura (flash do ticket)");
  await c.assentar();
  assert.equal(c.resultado().length, 1);
  assert.ok(leituras >= 2, "não releu");
  await c.desmontar();
});

test("H2 · variante embutida DESCONECTADA: nenhum botão de largura toda (a skill proíbe)", () => {
  // ⚠️2 do validador: o CTA «⚡ Aceito o DesafioGUT» tinha width:100% dentro do cartão da edição.
  const card = ficheiro("components/CardLance.jsx");
  // O bloco real da variante (não o esqueleto): do marcador com `data-edicao` até 4 000 caracteres.
  const inicio = card.indexOf('data-variante-lance="embutida" data-edicao');
  assert.ok(inicio > 0, "a variante embutida desapareceu");
  const trecho = card.slice(inicio, inicio + 4000);
  assert.equal(/width:\s*"100%"/.test(trecho), false, "o CTA da embutida voltou a ocupar a largura toda");
  // e o aviso do limite continua visível (perdeu-se na 1.ª versão da embutida)
  assert.match(trecho, /Mín 1 ponto · Máx 5 lances\/min · Cooldown 3s/, "o limite de lances desapareceu do ecrã");
});

test("H3 · OP: o campo do palpite NÃO fecha enquanto envia (como antes do padrão único)", () => {
  const op = ficheiro("pages/OfertasProgramadas.jsx");
  const form = op.slice(op.indexOf("<FormularioAcao"), op.indexOf("<FormularioAcao") + 600);
  assert.match(form, /desabilitadoCampo=\{false\}/, "o campo do palpite passou a fechar durante o envio");
});

test("H4 · sem estado legível da especial, a tabela NÃO anuncia «Em breve»", () => {
  const pagina = ficheiro("pages/MercadoLances.jsx");
  assert.match(pagina, /const seloEspecial = edicaoEspecial/, "o selo deixou de distinguir «sem especial» de «especial sem estado»");
  assert.match(pagina, /\{ texto: "—", cor: "#6b7db8" \}/, "o selo volta a cair no estado global quando as datas são ilegíveis");
});

test("H5 · BIDIRECCIONAL — especial encerrada NÃO muda o cabeçalho para «Valor (R$)» (nunca há valores nesta tabela)", () => {
  // ⚠️2 do 2.º validador: o `encerrado` da R-1 significa «os valores já são públicos»; o da especial não.
  const lances = [{ enderecoCurto: "0x1111…aaaa", valor: null, oculto: true, repetido: null }];
  const base = { lances, idEdicao: "ESPECIAL-X", prazoTimestamp: 0, encerrado: true };
  const especial = semTags(renderToStaticMarkup(React.createElement(TabelaLances,
    { ...base, ocultosPermanentes: true, selo: { texto: "🔴 Encerrada", cor: "#ef4444" } })));
  assert.match(especial, /Valor 🔒/, "o cabeçalho passou a prometer valores que esta tabela nunca tem");
  assert.equal(/Valor \(R\$\)/.test(especial), false);
  assert.match(especial, /valores revelados no resultado da edição/, "a legenda deixou o utilizador sem explicação do cadeado");
  // CONTROLOS POSITIVOS: a R-1 (sem a bandeira) continua a revelar como sempre.
  const r1 = semTags(renderToStaticMarkup(React.createElement(TabelaLances, { ...base, idEdicao: "R-1" })));
  assert.match(r1, /Valor \(R\$\)/);
});

test("H6 · o wiring do `desabilitadoCampo` na embutida (não fechar o campo com a carteira ligada)", async () => {
  // ⚠️6-A2 do validador: nenhum teste olhava para o valor que o CardLance passa ao FormularioAcao.
  const s = await montarLance({ variante: "embutida" });
  try {
    const form = (/* procura o elemento FormularioAcao na árvore */() => {
      const fora = [];
      (function walk(n) {
        if (n == null || typeof n === "boolean" || typeof n === "string") return;
        if (Array.isArray(n)) { n.forEach(walk); return; }
        if (typeof n !== "object") return;
        fora.push(n);
        if (n.props) walk(n.props.children);
      })(s.c.resultado());
      return fora.find((n) => n.type === FormularioAcao);
    })();
    assert.ok(form, "a embutida não monta o FormularioAcao");
    assert.equal(form.props.desabilitadoCampo, false, "o campo fecha com a carteira ligada (antes do padrão único não fechava)");
  } finally { s.fim(); }
});

test("H7 · a recarga periódica lê enquanto montado e pára no unmount", async () => {
  // ⚠️6-A3 do validador: nenhum teste exercia o intervalo (todos passavam `intervaloMs: 0`).
  let leituras = 0;
  const cliente = {
    rpc: async () => { leituras += 1; return { data: [], error: null }; },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
  };
  const c = montar(useRankingEspecial, ["ESPECIAL-X", { obterCliente: async () => cliente, configurado: () => true, intervaloMs: 20 }]);
  await c.assentar();
  await new Promise((r) => setTimeout(r, 120));
  const comIntervalo = leituras;
  assert.ok(comIntervalo >= 2, `o intervalo não releu (${comIntervalo})`);
  await c.desmontar();
  await new Promise((r) => setTimeout(r, 90));
  assert.equal(leituras, comIntervalo, "o intervalo continuou a ler depois do unmount");
});

test("H8 · a fonte: a leitura tem guarda de sequência (resposta velha não sobrepõe a nova)", () => {
  // ⚠️4 do 2.º validador. A prova de comportamento está nas sondas do validador; aqui fica a guarda no fonte.
  const hook = ficheiro("hooks/useRankingEspecial.js");
  assert.match(hook, /let seqLeitura = 0;/);
  assert.match(hook, /const meu = \+\+seqLeitura;/);
  assert.match(hook, /meu !== seqLeitura/);
});
