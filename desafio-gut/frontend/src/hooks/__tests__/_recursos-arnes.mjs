// _recursos-arnes.mjs — MC104.1. Carrega o `useRecursosApp.js` REAL pelo Vite (os imports dele não têm
// extensão, logo o node puro não o importa) e troca SÓ o `supabaseClient` por um duplo controlável.
// Serve os testes e o A/B pareado (mesmos cenários contra a versão antes e depois).
//
// Cenários exercem os TRÊS caminhos do hook: Supabase directo, função /recursos-app e fallback local.

import { createServer } from "vite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { opcoesServidorTeste, ALIASES } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DUPLO = join(AQUI, "_supabase-duplo.mjs");
// UTAC110i.2 — o `@capacitor/core` passa a duplo controlável neste arnês, para se poder exercitar
// o braço NATIVO do detetor (inexistente até este UTAC). O duplo é FIEL ao pacote real em Node
// (`web`/`false`/`false`, medido) ⇒ os testes que já usavam este arnês vêem exactamente o mesmo.
const DUPLO_CAPACITOR = join(AQUI, "..", "..", "lib", "__tests__", "_duplo-capacitor.mjs");

let servidor = null;
async function obterServidor() {
  if (servidor === null) {
    servidor = await createServer({
      ...opcoesServidorTeste(),
      root: join(AQUI, "..", "..", ".."),
      server: { middlewareMode: true },
      appType: "custom",
      logLevel: "error",
      optimizeDeps: { noDiscovery: true },
      envDir: mkdtempSync(join(tmpdir(), "mc1041-env-")), // sem VITE_* reais
      resolve: { alias: [...ALIASES,
        { find: /^\.\.\/lib\/supabaseClient(\.js)?$/, replacement: DUPLO },
        { find: /^@capacitor\/core$/, replacement: DUPLO_CAPACITOR },
      ] },
    });
  }
  return servidor;
}
export async function fecharArnes() { if (servidor) { await servidor.close(); servidor = null; } }

/** Carrega um módulo do projeto (ex.: "/src/hooks/useRecursosApp.js"). */
export async function carregarModulo(caminho) {
  return (await obterServidor()).ssrLoadModule(caminho);
}

/**
 * URL do último pedido de `correr` (UTAC110i.2). Serve para afirmar QUAL plataforma o cliente
 * envia ao endpoint — o APK usa o caminho da FUNÇÃO (o build não leva `VITE_SUPABASE_*`), e era
 * exactamente o `?plataforma=pwa` que fazia o servidor devolver a chave do PWA.
 */
export const ULTIMO_PEDIDO = { url: null };

/**
 * Corre `carregarRecursos()` num cenário:
 *   { via: "supabase", valor }            → Supabase configurado, config_remota.valor = valor
 *   { via: "supabase-erro" }              → Supabase configurado mas a query falha → cai para a função
 *   { via: "funcao", corpo, status=200 }  → sem Supabase; /recursos-app responde `corpo`
 *   { via: "local" }                      → sem Supabase e a função falha → fallback local
 * `plataforma` via window.__GUT_PLATAFORMA__ (undefined ⇒ deixa decidir o detector).
 */
export async function correr(mod, cenario, plataforma = "pwa") {
  ULTIMO_PEDIDO.url = null;
  const sb = globalThis.__duploSupabase;
  sb.configurado = cenario.via === "supabase" || cenario.via === "supabase-erro";
  sb.erro = cenario.via === "supabase-erro";
  sb.valor = cenario.valor;
  const fetchOrig = globalThis.fetch;
  const winOrig = globalThis.window;
  globalThis.window = { location: { search: "" }, __GUT_PLATAFORMA__: plataforma };
  globalThis.fetch = async (url) => {
    ULTIMO_PEDIDO.url = String(url);
    if (cenario.via === "local" || cenario.via === "supabase-erro" && !cenario.corpo) throw new Error("rede em baixo");
    if (!String(url).includes("recursos-app")) throw new Error(`fetch inesperado: ${url}`);
    return new Response(JSON.stringify(cenario.corpo ?? {}), {
      status: cenario.status ?? 200, headers: { "content-type": "application/json" },
    });
  };
  const logs = [];
  const warn = console.warn;
  console.warn = (...a) => logs.push(a.map(String).join(" "));
  try {
    return await mod.carregarRecursos();
  } finally {
    globalThis.fetch = fetchOrig;
    globalThis.window = winOrig;
    console.warn = warn;
  }
}
