// MC104.2 — SEG3 verificação ad-hoc (corre UMA vez). Verifica, sobre o ficheiro commitado e a produção:
// procura por comprador · pedidos no conjunto de anonimização · NF-e preservada · terceiros intactos ·
// deploy com o commit · endpoint vivo (JSON, sem autenticação → 401; NUNCA se chama com sessão).
// Controlo positivo: as mesmas verificações contra (a) o código do HEAD anterior e (b) uma cópia
// adulterada (NF-e apagada) TÊM de falhar. Uso: node scripts/mc1042-verificacao-adhoc.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const REL = "desafio-gut/frontend/netlify/functions/_lib/conta-delete.mjs";
const git = (...a) => execFileSync("git", ["-C", RAIZ, ...a], { encoding: "utf8" });
const TMP = mkdtempSync(join(tmpdir(), "mc1042-"));

const ALVO = "0xabc0000000000000000000000000000000000abc", OUTRO = "0xdef0000000000000000000000000000000000def";
const NFE = { numero: "123", serie: "1", chave: "3".repeat(44) };
const ped = (c) => ({ produtoId: "P", comprador: c, valorPagoCentavos: 1, nfe: { ...NFE },
  morada: { nome: "Nome Teste", cpf: "52998224725", cep: "69027010" } });
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

async function verificar(codigo, rotulo) {
  const f = join(TMP, `${rotulo}.mjs`);
  writeFileSync(f, codigo);
  const mod = await import(pathToFileURL(f).href);
  const m = new Map([["pedido:A", ped(ALVO)], ["pedido:B", ped(OUTRO)], ["pedido:C", { ...ped(undefined) }]]);
  const antes = structuredClone(m);
  // Um Map POR store (o duplo partilhado fazia o hard-delete de lance-idem actuar nos pedidos — erro do instrumento).
  const stores = { pedidos: m };
  const gs = ({ name }) => { const s = stores[name] ?? (stores[name] = new Map());
    return { get: async (k) => structuredClone(s.get(k) ?? null), setJSON: async (k, v) => s.set(k, structuredClone(v)),
      delete: async (k) => s.delete(k), list: async () => ({ blobs: [...s.keys()].map((key) => ({ key })) }) }; };
  await mod.excluirBlobs(gs, ALVO, { dryRun: false });
  const a = m.get("pedido:A"), src = semComentarios(codigo);
  return {
    "procura por comprador": /obj\?\.comprador\)/.test(src),
    "pedidos em BLOBS_ANON": /BLOBS_ANON\s*=\s*\[[^\]]*"pedidos"/.test(src),
    "pedido do titular anonimizado": a?.comprador === mod.ENDERECO_ANONIMO && a?.morada?.cpf === "***",
    "NF-e preservada": isDeepStrictEqual(a?.nfe, NFE),
    "nada apagado": m.size === antes.size,
    "terceiro intacto": isDeepStrictEqual(m.get("pedido:B"), antes.get("pedido:B")),
    "sem comprador intacto": isDeepStrictEqual(m.get("pedido:C"), antes.get("pedido:C")),
  };
}

const imprimir = (t, r) => { const ok = Object.values(r).every(Boolean); console.log(`${t}: ${ok ? "VERDE" : "VERMELHO"}`);
  for (const [k, v] of Object.entries(r)) console.log(`  ${v ? "OK  " : "FALHA"} ${k}`); return ok; };

const atual = git("show", `HEAD:${REL}`);
const okAtual = imprimir("commitado (HEAD)", await verificar(atual, "atual"));

// Controlo positivo: tem de detectar.
const okAntigo = imprimir("CONTROLO b2a0414 (tem de FALHAR)", await verificar(git("show", `b2a0414:${REL}`), "antigo"));
const adulterado = atual.replace('if ("comprador" in obj) obj.comprador = ENDERECO_ANONIMO;',
  'if ("comprador" in obj) obj.comprador = ENDERECO_ANONIMO; obj.nfe = null;');
if (adulterado === atual) throw new Error("adulteração não entrou");
const okAdult = imprimir("CONTROLO adulterado NF-e (tem de FALHAR)", await verificar(adulterado, "adulterado"));

// Produção.
const site = "https://silly-stardust-ca71bc.netlify.app";
// O CLI do netlify é .cmd no Windows (execFileSync não o lança sem shell, e o shell parte o JSON):
// o deploy vem de fora, em DEPLOY_JSON = saída de `netlify api listSiteDeploys` (per_page 1).
const deploy = JSON.parse(process.env.DEPLOY_JSON || "[{}]")[0];
const head = git("rev-parse", "HEAD").trim();
const r = await fetch(`${site}/.netlify/functions/delete-account`, { method: "POST" });
const ct = r.headers.get("content-type") || "";
const corpo = await r.text();
const prod = {
  "deploy ready": deploy.state === "ready",
  [`deploy commit_ref = HEAD (${head.slice(0, 7)})`]: deploy.commit_ref === head,
  // Medido: sem corpo a função responde 400 JSON body_obrigatorio (valida o corpo antes do token);
  // uma função inexistente dá text/plain — o content-type JSON com o código da função é a prova.
  "delete-account vivo: 4xx JSON da própria função": [400, 401].includes(r.status) && ct.includes("application/json")
    && /body_obrigatorio|token_ausente/.test(corpo),
};
console.log(`evidência delete-account: ${r.status} · ${ct} · ${corpo.slice(0, 90)}`);
const okProd = imprimir("produção", prod);

const veredito = okAtual && okProd && !okAntigo && !okAdult;
console.log(`VEREDITO SEG3: ${veredito ? "VERDE" : "VERMELHO"} (controlos positivos ${!okAntigo && !okAdult ? "2/2 detectados" : "FALHARAM"})`);
process.exit(veredito ? 0 : 1);
