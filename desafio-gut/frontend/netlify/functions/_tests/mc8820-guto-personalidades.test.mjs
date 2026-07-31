// MC88.20 (P4) — as 4 personalidades do GUTO.
//
// PORQUÊ ESTE TESTE EXISTE: o MC88.19 encontrou que a personalidade CORPORATIVA
// nunca ativava. A arquitetura estava correta (4 prompts distintos, RBAC por
// intent, perfil derivado do JWT) — o que partiu foi a LIGAÇÃO AOS DADOS:
// `detectarPerfil` lia a cota do Blob "cotas" enquanto as cotas já viviam em
// Supabase (MC36/MC37). Não havia erro, não havia log: o lojista era servido como
// "comum" e ninguém dava por isso. Nenhum teste cobria personalidade.
//
// Cobre: (1) o perfil corporativo vem do MESMO store que cotas.mjs usa;
// (2) o fallback sem LLM respeita o tom de cada perfil; (3) o CTA do visitante
// não duplica; (4) chamarLLM sem systemPrompt falha alto.
//
// node --test --experimental-test-module-mocks _tests/mc8820-guto-personalidades.test.mjs

import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { obterResposta, obterPromptSystem } from "../_lib/guto-perfis.mjs";

// Um módulo não pode ser mockado duas vezes sem repor; cada teste que mocka
// importa o chatbot com uma query distinta para obter uma instância fresca.
afterEach(() => mock.reset());

const PERFIS = ["visitante", "comum", "corporativo", "admin"];
const SEM_EMOJI = ["corporativo", "admin"];
// Faixas de emoji (pictogramas, emoticons, símbolos, dingbats).
const RE_EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/u;

// ── P1: o fallback sem LLM respeita o perfil ────────────────────────────────
// Sem LLM não há system prompt, logo é ESTE texto que define a personalidade.

test("fallback sem LLM: corporativo e admin não levam emojis", () => {
  for (const perfil of SEM_EMOJI) {
    for (const params of [{ trecho: "" }, { trecho: "O lance vencedor e o menor valor unico." }]) {
      const r = obterResposta("fallback_sem_llm", perfil, params);
      assert.ok(r, `${perfil}: resposta vazia`);
      assert.ok(!RE_EMOJI.test(r),
        `${perfil} devolveu emoji (regra: ZERO emojis em corporativo/admin) → ${JSON.stringify(r)}`);
    }
  }
});

test("fallback sem LLM: nenhum perfil recebe pitch comercial não solicitado", () => {
  // O texto antigo empurrava "Bronze (R$ 2.640), Prata (R$ 5.600)…" a QUALQUER
  // pergunta sem resposta — inclusive ao admin em modo operacional.
  for (const perfil of PERFIS) {
    for (const params of [{ trecho: "" }, { trecho: "texto do regulamento" }]) {
      const r = obterResposta("fallback_sem_llm", perfil, params);
      assert.ok(!/bronze|prata|ouro|diamante|R\$\s?\d/i.test(r),
        `${perfil}: pitch comercial no fallback → ${JSON.stringify(r)}`);
    }
  }
});

test("fallback sem LLM: NUNCA expõe configuração interna ao utilizador", () => {
  for (const perfil of PERFIS) {
    for (const params of [{ trecho: "" }, { trecho: "abc" }]) {
      const r = obterResposta("fallback_sem_llm", perfil, params);
      assert.ok(!/LLM_API_KEY|Netlify|administrador configurar|env\b/i.test(r),
        `${perfil}: vaza detalhe de configuração → ${JSON.stringify(r)}`);
    }
  }
});

test("fallback sem LLM: os 4 perfis existem e usam o trecho quando há", () => {
  for (const perfil of PERFIS) {
    const semTrecho = obterResposta("fallback_sem_llm", perfil, { trecho: "" });
    const comTrecho = obterResposta("fallback_sem_llm", perfil, { trecho: "MARCADOR_UNICO_XYZ" });
    assert.ok(semTrecho.length > 0, `${perfil}: sem resposta para trecho vazio`);
    assert.ok(comTrecho.includes("MARCADOR_UNICO_XYZ"), `${perfil}: ignorou o trecho`);
    assert.notEqual(semTrecho, comTrecho, `${perfil}: mesma resposta com e sem trecho`);
  }
});

// ── P2: o CTA do visitante não duplica ──────────────────────────────────────

test("visitante: não duplica o convite quando o LLM já convidou", () => {
  const jaConvidou = "Funciona assim: vence o menor lance unico. Que tal criar uma conta e dar um lance?";
  const r = obterResposta("fallback_rag", "visitante", { respostaRAG: jaConvidou });
  const convites = (r.match(/\bconta\b/gi) || []).length;
  assert.equal(convites, 1,
    `esperava 1 menção a "conta", obtive ${convites} → ${JSON.stringify(r)}`);
});

test("visitante: acrescenta o convite quando a resposta não convida", () => {
  const semConvite = "O lance vencedor e o menor valor que aparece uma unica vez.";
  const r = obterResposta("fallback_rag", "visitante", { respostaRAG: semConvite });
  assert.match(r, /Cria uma conta/i, "visitante ficou sem convite nenhum");
});

test("comum/corporativo/admin: fallback_rag não injeta convite de registo", () => {
  for (const perfil of ["comum", "corporativo", "admin"]) {
    const r = obterResposta("fallback_rag", perfil, { respostaRAG: "Resposta." });
    assert.equal(r, "Resposta.", `${perfil} teve texto acrescentado: ${JSON.stringify(r)}`);
  }
});

// ── Tom: garante que os prompts continuam distintos por perfil ──────────────

test("os 4 system prompts são distintos e corporativo/admin proíbem emojis", () => {
  const prompts = PERFIS.map((p) => obterPromptSystem(p));
  assert.equal(new Set(prompts).size, 4, "há system prompts repetidos entre perfis");
  for (const perfil of SEM_EMOJI) {
    assert.match(obterPromptSystem(perfil), /emoji/i,
      `${perfil}: o prompt deixou de falar de emojis — a regra de tom desapareceu`);
  }
});

// ── P0: o perfil corporativo vem do store ATIVO (o defeito do MC88.19) ──────

test("detectarPerfil devolve 'corporativo' lendo o MESMO store que cotas.mjs usa", async () => {
  const ENDERECO = "0x00000000000000000000000000000000deadbeef";
  let pedidoA = null;

  // Só o cotas-store é a fonte de cotas. Se detectarPerfil voltar a ler Blobs,
  // este mock nunca é chamado e o teste falha — que é exatamente o defeito original.
  mock.module("../_lib/cotas-store.mjs", {
    namedExports: {
      getCota: async (clienteId) => { pedidoA = clienteId; return { tipo: "corporativo" }; },
    },
  });
  mock.module("../_lib/admin-auth.mjs", {
    namedExports: { autenticarAdmin: async () => ({ ok: false }) },
  });
  mock.module("../_lib/jwt.mjs", {
    namedExports: {
      verificarUserSession: async () => ({ endereco: ENDERECO }),
      verificarPedido: async () => ({}),
      assinarPedido: async () => "tok",
    },
  });
  mock.module("../_lib/admin-helpers.mjs", {
    namedExports: { getAdminAddresses: async () => [] },
  });

  const { detectarPerfil } = await import("../chatbot.mjs?mc8820a");
  const req = new Request("https://x/chatbot", {
    method: "POST", headers: { authorization: "Bearer token-de-teste" },
  });

  const r = await detectarPerfil(req);
  assert.equal(r.perfil, "corporativo",
    "o lojista não foi reconhecido — detectarPerfil está a ler o store errado");
  assert.equal(pedidoA, ENDERECO, "getCota foi chamado com um cliente_id inesperado");
});

test("detectarPerfil cai para 'comum' quando não há cota (fail-soft preservado)", async () => {
  mock.module("../_lib/cotas-store.mjs", { namedExports: { getCota: async () => null } });
  mock.module("../_lib/admin-auth.mjs", { namedExports: { autenticarAdmin: async () => ({ ok: false }) } });
  mock.module("../_lib/jwt.mjs", {
    namedExports: {
      verificarUserSession: async () => ({ endereco: "0x1111111111111111111111111111111111111111" }),
      verificarPedido: async () => ({}), assinarPedido: async () => "tok",
    },
  });
  mock.module("../_lib/admin-helpers.mjs", { namedExports: { getAdminAddresses: async () => [] } });

  const { detectarPerfil } = await import("../chatbot.mjs?mc8820b");
  const req = new Request("https://x/chatbot", {
    method: "POST", headers: { authorization: "Bearer token-de-teste" },
  });
  assert.equal((await detectarPerfil(req)).perfil, "comum");
});

test("detectarPerfil devolve 'visitante' sem Authorization", async () => {
  const { detectarPerfil } = await import("../chatbot.mjs?mc8820c");
  const req = new Request("https://x/chatbot", { method: "POST" });
  const r = await detectarPerfil(req);
  assert.equal(r.perfil, "visitante");
  assert.equal(r.endereco, null);
});

// ── P3: chamarLLM sem systemPrompt falha alto ──────────────────────────────

test("chamarLLM sem systemPrompt lança (não degrada em silêncio)", async () => {
  const { chamarLLM } = await import("../chatbot.mjs?mc8820d");
  // Valor de teste, não credencial (R5): serve só para passar o guard do apiKey,
  // que corre ANTES do guard do systemPrompt.
  const anterior = process.env.LLM_API_KEY;
  process.env.LLM_API_KEY = "chave-de-teste-nao-real";
  try {
    await assert.rejects(
      () => chamarLLM("pergunta", "contexto", {}),
      (err) => {
        assert.equal(err.code, "systemprompt_ausente",
          "o erro tem de ser distinguível de indisponibilidade do LLM");
        assert.match(err.message, /systemPrompt/i);
        return true;
      },
    );
    await assert.rejects(() => chamarLLM("p", "c", { systemPrompt: "   " }),
      (err) => err.code === "systemprompt_ausente");
  } finally {
    if (anterior === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = anterior;
  }
});
