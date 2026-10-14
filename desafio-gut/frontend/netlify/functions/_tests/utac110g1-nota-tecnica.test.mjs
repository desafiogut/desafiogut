// UTAC110g.1 (FRENTE A, R18-110g.1-1) — NOTA TÉCNICA DE ENVIO: template fixo + integração no e-mail.
//
// O que se MEDE (execução real do handler, não proxy de texto):
//   · `gerarNotaTecnica` devolve os 5 campos exigidos pela decisão (produto, destinatário,
//     remetente, nº do pedido, data);
//   · a data sai em `DD/MM/AAAA` no fuso de Manaus e NUNCA «Invalid Date»/«undefined»;
//   · o e-mail de confirmação do resgate REAL (handler a correr) carrega a Nota Técnica
//     PREENCHIDA com os dados do pedido — morada validada, produto, CNPJ do remetente, data;
//   · BIDIRECIONAL: a guarda morde — o e-mail ANTERIOR ao 110g.1 (só com a prosa que mencionava a
//     Nota Técnica) FALHA as mesmas asserções;
//   · o destino do e-mail vem SÓ do campo validado (`email`); nenhum outro campo do corpo o define
//     (injecção pela morada ou pelo nome não muda o destinatário) — quer dizer a limitação medida no
//     SEG-1 §8: o e-mail do Privy viaja neste campo, é o único canal possível (a sessão EIP-191 não
//     carrega e-mail).
//
// Duplo só nas fronteiras: Supabase inline (pontos+resgates) + `adicionarNotificacao` + `enviarEmail`.
// `resgatar-cartao.mjs`, `_lib/nota-tecnica.mjs`, `_lib/resgates.mjs`, `_lib/pedidos.mjs`,
// `_lib/passe-pontos.mjs` e `_lib/validate.mjs` são os REAIS.
//
// node --test --experimental-test-module-mocks _tests/utac110g1-nota-tecnica.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";

const A = "0xbbb0000000000000000000000000000000000002";
process.env.JWT_SECRET = "segredo-de-teste-110g1-com-comprimento-suficiente";

let DB;
function criarDuplo(seed = {}) {
  const db = {
    pontos: (seed.pontos ?? []).map((p) => ({ historico: [], historico_lance: [], ...p })),
    palpites: (seed.palpites ?? []).map((p) => ({ ...p })),
    resgates: (seed.resgates ?? []).map((r) => ({ ...r })),
  };
  let seq = 0;
  const erro = (code, message) => ({ data: null, error: { code, message } });
  function from(tabela) {
    if (!(tabela in db)) throw new Error(`duplo: tabela ${tabela} não modelada`);
    const st = { op: null, dados: null, filtros: [], terminal: null };
    const api = {
      select() { if (st.op === null) st.op = "select"; return api; },
      insert(d) { st.op = "insert"; st.dados = d; return api; },
      update(d) { st.op = "update"; st.dados = d; return api; },
      eq(c, v) { st.filtros.push([c, v]); return api; },
      order() { return api; },
      maybeSingle() { st.terminal = "maybe"; return api; },
      single() { st.terminal = "single"; return api; },
      then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
    };
    for (const m of ["neq", "gt", "lt", "gte", "lte", "in", "is", "or", "not", "filter", "limit", "range", "delete", "upsert", "ilike"]) {
      api[m] = () => { throw new Error(`duplo: .${m}() não modelado`); };
    }
    const casa = (l) => st.filtros.every(([c, v]) => l[c] === v);
    function exec() {
      const t = db[tabela];
      if (st.op === "insert") {
        const l = { ...st.dados };
        if (tabela === "resgates") {
          if (t.some((r) => r.idempotency_key === l.idempotency_key)) return erro("23505", "duplicate key");
          l.id = ++seq;
        }
        if (tabela === "pontos" && t.some((p) => p.endereco === l.endereco)) return erro("23505", "dup");
        t.push(l);
        return { data: l, error: null };
      }
      if (st.op === "update") { const a = t.filter(casa); for (const l of a) Object.assign(l, st.dados); return { data: a.map((l) => ({ endereco: l.endereco })), error: null }; }
      const linhas = t.filter(casa).slice();
      if (st.terminal === "maybe") return { data: linhas[0] ?? null, error: null };
      if (st.terminal === "single") return linhas.length === 1 ? { data: linhas[0], error: null } : erro("PGRST116", "não single");
      return { data: linhas, error: null };
    }
    return api;
  }
  return { db, from };
}

// ── Capturas das fronteiras ─────────────────────────────────────────────────────────────────────
let emails = [];

mock.module("../_lib/supabase-client.mjs", {
  namedExports: {
    getSupabase: () => ({ from: (t) => DB.from(t) }),
    getSupabaseReadOnly: () => ({ from: (t) => DB.from(t) }),
    supabaseConfigurado: () => true,
  },
});
mock.module("../_lib/jwt.mjs", { namedExports: { verificarUserSession: async () => ({ endereco: A, tipo: "user-session" }) } });
mock.module("../_lib/system-state.mjs", {
  namedExports: { sistemaPausado: () => false, lerEstadoSistema: async () => ({ status: "ativo" }), escreverEstadoSistema: async () => {} },
});
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/notificacoes-usuario.mjs", {
  namedExports: {
    adicionarNotificacao: async () => true,
    gerarResumosPosEdicao: async () => [],
    lerNotificacoes: async () => [],
    marcarLidas: async () => true,
    MAX_NOTIF: 50,
  },
});
mock.module("../_lib/email.mjs", {
  namedExports: {
    enviarEmail: async (opts) => { emails.push(opts); return { ok: true, id: "sg-teste" }; },
  },
});

const mod = await import("../resgatar-cartao.mjs");
const resgatarCartao = mod.default;
const nota = await import("../_lib/nota-tecnica.mjs");

const MORADA_OK = {
  nome: "Maria Quildo", cpf: "11144477735", cep: "69027010", logradouro: "Rua das Flores",
  numero: "42", complemento: "", bairro: "Centro", cidade: "Manaus", uf: "AM", telefone: "92999999999",
};
const compra = (n) => ({ tipo: "compra", pontos: n, ref: `c${n}`, data: "2026-10-01T00:00:00.000Z" });
const corpo = (extra = {}) => ({ cartaoId: "cartao-familia-quildo", morada: MORADA_OK, idempotencyKey: "k-110g1-0001", ...extra });

function semear() {
  DB = criarDuplo({ pontos: [{ endereco: A, pontos: 50, historico: [compra(50)], atualizado_em: "2026-10-13T00:00:00.000Z" }] });
  emails = [];
}
const post = (corpoJson) => resgatarCartao(new Request("https://ex.test/x", {
  method: "POST", headers: { authorization: "Bearer x" }, body: JSON.stringify(corpoJson),
}));

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 1. O TEMPLATE (função pura, sem rede nem relógio)
// ═════════════════════════════════════════════════════════════════════════════════════════════════

test("A1 `gerarNotaTecnica` traz os 5 campos da R18-110g.1-1: produto, destinatário, remetente, pedido, data", () => {
  const doc = nota.gerarNotaTecnica({
    id: 1234, criadoEm: "2026-10-14T13:30:00.000Z",
    descricaoProduto: "Cartão colecionável Família Quildo", nome: "Maria Quildo", morada: MORADA_OK,
  });
  // 1. produto
  assert.match(doc, /^═+\nNOTA TÉCNICA DE ENVIO\n═+$/m, "o documento é a Nota Técnica de Envio");
  assert.match(doc, /Cartão colecionável Família Quildo/, "1. nome do produto");
  // 4. nº do pedido
  assert.match(doc, /Pedido: #1234/, "4. nº do pedido");
  // 5. data
  assert.match(doc, /Data: \d{2}\/\d{2}\/\d{4}/, "5. data");
  // 2. destinatário (nome + morada)
  const destino = doc.split("DESTINATÁRIO:")[1].split("REMETENTE:")[0];
  assert.match(destino, /Maria Quildo/, "2a. nome do destinatário");
  assert.match(destino, /Rua das Flores, 42/, "2b. logradouro + número");
  assert.match(destino, /Centro/, "2c. bairro");
  assert.match(destino, /Manaus\/AM/, "2d. cidade/UF");
  assert.match(destino, /CEP: 69027-010/, "2e. CEP formatado");
  // 3. remetente
  const rem = doc.split("REMETENTE:")[1];
  assert.match(rem, /Associação Recreativa dos Nordestinos no Amazonas/, "3a. Associação");
  assert.match(rem, /CNPJ 23\.040\.066\/0001-00/, "3b. CNPJ");
  assert.match(rem, /Manaus\/AM/, "3c. praça do remetente");
  // o PAGADOR declarado na R18-110g-2 é o mesmo remetente (uma só verdade)
  assert.equal(nota.REMETENTE.nome, "Associação Recreativa dos Nordestinos no Amazonas");
  assert.equal(nota.REMETENTE.cnpj, "23.040.066/0001-00");
});

test("A1 a data sai `DD/MM/AAAA` no fuso de Manaus (UTC-4), não em UTC", () => {
  // 14/10/2026 02:30 UTC = 13/10/2026 22:30 em Manaus (UTC-4). O documento é do REMETENTE (Manaus).
  assert.equal(nota.formatarData("2026-10-14T02:30:00.000Z"), "13/10/2026");
  assert.equal(nota.formatarData("2026-10-14T13:30:00.000Z"), "14/10/2026");
});

test("A1 ⚠️ achado F1 do validador SEG3 — o INSTANTE DE FRONTEIRA discrimina o fuso (UTC-4 vs UTC-3)", () => {
  // O validador adversarial refutou (com razão) a guarda anterior: os dois instantes do teste acima
  // caem no MESMO dia em UTC-4 (Manaus) e em UTC-3 (São Paulo), logo um mutante Manaus→São Paulo
  // sobrevivia. A fronteira do dia de Manaus é 04:00 UTC; 03:30 UTC ainda é o dia ANTERIOR em
  // Manaus e já é o dia seguinte em São Paulo. Com este instante, o fuso — que é a DECISÃO — passa
  // a ser medido, e não só o formato.
  const fronteira = "2026-10-14T03:30:00.000Z";
  assert.equal(nota.formatarData(fronteira), "13/10/2026", "03:30Z é 23:30 do dia 13 em Manaus (UTC-4)");
  // CONTROLOS: o mesmo instante noutros fusos dá OUTRO dia — prova que a asserção acima não é
  // satisfeita «por acaso» por qualquer formatação.
  const dataEm = (tz) => new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(fronteira));
  assert.equal(dataEm("America/Sao_Paulo"), "14/10/2026", "em UTC-3 (São Paulo) este instante já é dia 14");
  assert.equal(dataEm("UTC"), "14/10/2026");
  assert.notEqual(dataEm("America/Sao_Paulo"), dataEm("America/Manaus"), "a fronteira TEM de separar os dois fusos");
});

test("A1 o documento NUNCA escreve «undefined», «null» nem «Invalid Date» (defensiva)", () => {
  const vazio = nota.gerarNotaTecnica();
  assert.doesNotMatch(vazio, /undefined|null|NaN|Invalid Date/);
  assert.match(vazio, /Pedido: #—/);
  assert.match(vazio, /Data: —/, "data ilegível degrada para — e não rebenta o e-mail");
  assert.equal(nota.formatarData("nem-isto-e-data"), "—");
  assert.equal(nota.formatarData(undefined), "—");
  // campos ausentes na morada não colapsam o documento
  const parcial = nota.gerarNotaTecnica({ id: 9, morada: { nome: "Ana" } });
  assert.doesNotMatch(parcial, /undefined/, "campos ausentes viram —");
  assert.match(parcial, /CEP: —/);
});

test("A1 o CEP de 8 dígitos é formatado e o que não é CEP fica como veio", () => {
  assert.equal(nota.formatarCep("69027010"), "69027-010");
  assert.equal(nota.formatarCep("69027-010"), "69027-010");
  assert.equal(nota.formatarCep(""), "—");
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 2. A INTEGRAÇÃO (o e-mail do handler REAL, com os dados do pedido)
// ═════════════════════════════════════════════════════════════════════════════════════════════════

test("A2 o e-mail do resgate REAL carrega a Nota Técnica PREENCHIDA com os dados do pedido", async () => {
  semear();
  const res = await post(corpo({ email: "maria.quildo@example.com" }));
  assert.equal(res.status, 201);
  assert.equal(emails.length, 1, "exactamente um e-mail");

  const msg = emails[0].mensagem;
  assert.match(msg, /NOTA TÉCNICA DE ENVIO/, "o documento estruturado vai no e-mail (texto, sem PDF)");
  assert.match(msg, /PRODUTO:/, "bloco do produto");
  assert.match(msg, /Cartão colecionável Família Quildo/, "1. nome do produto");
  assert.match(msg, /Maria Quildo/, "destinatário do pedido");
  assert.match(msg, /Rua das Flores, 42/, "morada VALIDADA (o contrato de `_lib/pedidos.mjs`)");
  assert.match(msg, /Manaus\/AM/);
  assert.match(msg, /CEP: 69027-010/);
  assert.match(msg, /Associação Recreativa dos Nordestinos no Amazonas/);
  assert.match(msg, /CNPJ 23\.040\.066\/0001-00/);
  assert.match(msg, new RegExp(`Pedido: #${DB.db.resgates[0].id}`), "nº do pedido = o id gravado");
  assert.match(msg, /Data: \d{2}\/\d{2}\/\d{4}/);

  // a data vem do `criado_em` da LINHA gravada (a do pedido), não do relógio do teste
  const dataLinha = nota.formatarData(DB.db.resgates[0].criado_em);
  assert.ok(msg.includes(`Data: ${dataLinha}`), `a data é a do pedido (${dataLinha})`);
});

test("A2 o que já estava decidido NÃO se perdeu (prazo, pagador, comprovante, aviso fiscal)", async () => {
  semear();
  await post(corpo({ email: "maria@example.com" }));
  const m = emails[0].mensagem;
  assert.match(m, /até 30 dias corridos/, "R18-110g-3 (prazo)");
  assert.match(m, /Fam[íi]lia Quildo/, "R18-110g-2 (pagador) + produto");
  assert.match(m, /comprovante do seu pedido/, "correcção B-110g-1");
  assert.doesNotMatch(m, /Carteira/, "B-110g-1: não pode prometer a C3, que não existe");
  assert.match(m, /não emite documento fiscal deste resgate/, "aviso fiscal intacto");
});

test("A2 sem morada não rebenta (a função é pura) e o e-mail continua coerente", () => {
  const vazio = mod.montarEmailResgate();
  assert.equal(vazio.assunto, "Cartão colecionável resgatado — chega em 30 dias");
  assert.match(vazio.mensagem, /^Olá!/);
  assert.match(vazio.mensagem, /pedido nº —/);
  assert.match(vazio.mensagem, /Segue a Nota Técnica de envio:/);
  assert.match(vazio.mensagem, /NOTA TÉCNICA DE ENVIO/);
  assert.doesNotMatch(vazio.mensagem, /undefined/);
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 3. BIDIRECIONAL — a guarda MORDE (o e-mail antigo tem de falhar as MESMAS asserções)
// ═════════════════════════════════════════════════════════════════════════════════════════════════

/** A guarda usada no A2, isolada — devolve a lista do que falta (vazia = nota completa). */
function faltasDaNota(msg) {
  const exigidos = [
    [/NOTA TÉCNICA DE ENVIO/, "cabeçalho do documento"],
    [/Pedido: #\d+/, "nº do pedido"],
    [/Data: \d{2}\/\d{2}\/\d{4}/, "data"],
    [/DESTINATÁRIO:/, "bloco do destinatário"],
    [/REMETENTE:/, "bloco do remetente"],
    [/CNPJ 23\.040\.066\/0001-00/, "CNPJ do remetente"],
    [/Rua das Flores, 42/, "morada do destinatário"],
  ];
  return exigidos.filter(([re]) => !re.test(msg)).map(([, rotulo]) => rotulo);
}

test("A3 BIDIRECIONAL a guarda morde: passa no e-mail NOVO e FALHA no e-mail anterior ao 110g.1", () => {
  const novo = mod.montarEmailResgate({
    nome: "Maria Quildo", resgateId: 7, morada: MORADA_OK, criadoEm: "2026-10-14T13:00:00.000Z",
  }).mensagem;
  assert.deepEqual(faltasDaNota(novo), [], "o e-mail novo passa a guarda");

  // Reconstrução FIEL do texto anterior ao 110g.1 (as duas linhas de prosa que só MENCIONAVAM a
  // Nota Técnica). Se a guarda não a apanhasse, não estaria a medir nada.
  const anterior = [
    "Olá, Maria!", "",
    "O seu resgate do cartão colecionável DESAFIOGUT foi registado (pedido nº 7).",
    "Trocou 50 pontos de fidelidade pelo cartão.", "",
    "· Prazo de entrega: até 30 dias corridos.",
    "· O envio é pago por Associação Recreativa dos Nordestinos no Amazonas (Família Quildo).",
    "· Guarde este e-mail: é o comprovante do seu pedido.", "",
    "Nota Técnica do resgate nº 7",
    "Associação Recreativa dos Nordestinos no Amazonas (Família Quildo) é a patrocinadora do cartão e emite a Nota Técnica da entrega.",
  ].join("\n");
  const faltas = faltasDaNota(anterior);
  assert.ok(faltas.length >= 5, `o texto antigo tem de falhar a guarda (faltas: ${faltas.join(", ")})`);
  assert.ok(faltas.includes("cabeçalho do documento"), "o texto antigo NÃO tinha o documento");
  assert.ok(faltas.includes("CNPJ do remetente"), "nem o CNPJ do remetente");
  assert.ok(faltas.includes("morada do destinatário"), "nem a morada do destinatário");
});

test("A3 BIDIRECIONAL mutação: sem a Nota Técnica o e-mail do HANDLER falha a guarda", async () => {
  // Mutante: a mesma montagem de e-mail, mas SEM o documento (o que o código faria se a linha
  // `notaTecnica` fosse retirada). Não se toca no ficheiro real — monta-se o mutante ao lado.
  // ⚠️ NOTA DO AUTOR (achado do validador SEG3): este mutante é de TEXTO (`.replace()` sobre a
  // string capturada), não uma mutação do código de produção — é um controlo de leitura, mais
  // fraco por natureza. A mutação de CÓDIGO que guarda esta mesma regra é o **M5** de
  // `scripts/mc110g1-prova-mutacao.mjs` (tira o `notaTecnica` do array do e-mail), e essa é
  // executada de verdade, com md5 confirmado.
  semear();
  await post(corpo({ email: "maria@example.com" }));
  const real = emails[0].mensagem;
  const mutante = real.replace(/NOTA TÉCNICA DE ENVIO/, "Nota tecnica").replace(/CNPJ 23\.040\.066\/0001-00/, "");
  assert.deepEqual(faltasDaNota(real), []);
  assert.ok(faltasDaNota(mutante).length >= 2, "o mutante cai na guarda — a asserção tem dentes");
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// 4. O DESTINO DO E-MAIL — só o campo validado; nenhum outro define `para`
// ═════════════════════════════════════════════════════════════════════════════════════════════════

test("A4 o destinatário vem SÓ do campo `email`; um e-mail escondido na morada NÃO o desvia", async () => {
  semear();
  await post(corpo({
    email: "maria@example.com",
    nome: "atacante@evil.test",
    morada: { ...MORADA_OK, nome: "atacante@evil.test", complemento: "outro@evil.test" },
  }));
  assert.equal(emails.length, 1);
  assert.equal(emails[0].para, "maria@example.com", "o destino é o campo validado, não a morada");
  assert.ok(!emails[0].para.includes("evil.test"));
  // ⚠️ e a Nota Técnica mostra o NOME do destinatário (não o e-mail): o destinatário do documento é
  // a pessoa da morada validada, e o e-mail que a morada tentou esconder não aparece como destino.
  assert.match(emails[0].mensagem, /atacante@evil\.test/, "o nome da morada é o que vai no documento (é um nome, não um destino)");
});

test("A4 sem `email` não se envia nada — o servidor não inventa um destino", async () => {
  semear();
  const res = await post(corpo());
  assert.equal(res.status, 201);
  assert.equal(emails.length, 0, "sem e-mail de sessão, não há envio");
});

test("A4 `email` inválido → 400 e a Nota Técnica não sai (nada é debitado)", async () => {
  semear();
  const res = await post(corpo({ email: "sem-arroba" }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, "email_invalido");
  assert.equal(emails.length, 0);
  assert.equal(DB.db.resgates.length, 0);
});

test("A4 o e-mail (nem a Nota Técnica) é persistido em `public.resgates` — minimização", async () => {
  semear();
  await post(corpo({ email: "maria@example.com" }));
  const linha = JSON.stringify(DB.db.resgates[0]);
  assert.equal(linha.includes("maria@example.com"), false, "destino não é guardado");
  assert.equal(linha.includes("NOTA TÉCNICA"), false, "o documento é derivado, não é guardado");
  assert.equal(linha.includes("23.040.066"), false);
});
