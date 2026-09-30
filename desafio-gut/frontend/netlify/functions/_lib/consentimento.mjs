// _lib/consentimento.mjs — MC104 (LGPD art. 8º §2º: o ónus da prova do consentimento é do controlador)
//
// Registo do aceite do GATE legal no servidor. Reutiliza o Blob `consent-log` (decisão do operador,
// R18 MC104) — o mesmo que `comprar-senhas.mjs` já escreve e que já é exportado (exportar-dados),
// apagado na exclusão (_lib/conta-delete), retido 5 anos (purge-logs) e salvaguardado (backup-blobs).
// Formato da chave INALTERADO: `${ts}:${endereco}` — é o que esses quatro leitores esperam.
//
// O gate aparece ANTES do login (Boot.jsx): no clique não há endereço. O aceite é guardado no cliente
// e enviado depois do login. Por isso cada registo leva DUAS horas: `aceiteEm` (relógio do servidor,
// quando o registo chegou) e `aceiteDeclaradoEm` (o que o cliente diz ter sido a hora do clique).
//
// Lógica PURA e INJETÁVEL: recebe `getStore` por parâmetro (testável sem Blobs reais).

export const STORE_CONSENTIMENTO = "consent-log";
export const CONTEXTO_GATE = "gate-legal";

// Tem de ser igual a VERSAO_CONSENTIMENTO de src/components/TermosConsentimento.jsx (há teste que o exige).
export const VERSAO_GATE = "2.0";

// As 4 declarações do gate, pela ordem do ecrã.
export const DECLARACOES_GATE = Object.freeze(["lido", "maiores", "termos", "privacidade"]);

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/**
 * Valida o corpo enviado pelo cliente. Estrito: nada de coerção.
 * @returns {{ ok:true, versao, aceitos, aceiteDeclaradoEm } | { ok:false, code, message }}
 */
export function validarAceite(corpo) {
  const c = corpo && typeof corpo === "object" ? corpo : {};
  if (c.versao !== VERSAO_GATE) {
    return { ok: false, code: "versao_invalida", message: `versão do termo tem de ser "${VERSAO_GATE}"` };
  }
  const a = c.aceitos;
  if (!a || typeof a !== "object" || Array.isArray(a)) {
    return { ok: false, code: "aceitos_invalidos", message: "aceitos tem de ser um objecto com as 4 declarações" };
  }
  const chaves = Object.keys(a).sort();
  if (chaves.join() !== [...DECLARACOES_GATE].sort().join() || !DECLARACOES_GATE.every((k) => a[k] === true)) {
    return { ok: false, code: "aceitos_invalidos", message: "as 4 declarações têm de ser exactamente true" };
  }
  // Ida e volta: o V8 aceita 2026-02-31 e passa-o a 3 de março; só uma data que volta igual é válida.
  const ms = typeof c.aceiteDeclaradoEm === "string" ? Date.parse(c.aceiteDeclaradoEm) : NaN;
  if (!ISO_RE.test(String(c.aceiteDeclaradoEm)) || Number.isNaN(ms)
      || new Date(ms).toISOString().slice(0, 19) !== c.aceiteDeclaradoEm.slice(0, 19)) {
    return { ok: false, code: "data_invalida", message: "aceiteDeclaradoEm tem de ser ISO 8601 UTC" };
  }
  const aceitos = Object.fromEntries(DECLARACOES_GATE.map((k) => [k, true]));
  return { ok: true, versao: c.versao, aceitos, aceiteDeclaradoEm: c.aceiteDeclaradoEm };
}

function abrir(getStore) {
  return getStore({ name: STORE_CONSENTIMENTO, consistency: "strong" });
}

/**
 * Histórico de consentimentos do endereço (gate E compra de senhas), do mais antigo ao mais recente.
 * @returns {Promise<Array<object>>}
 */
export async function lerConsentimento(getStore, endereco) {
  const ender = String(endereco).toLowerCase();
  const store = abrir(getStore);
  const { blobs } = await store.list();
  const out = [];
  for (const { key } of blobs ?? []) {
    if (!key.endsWith(":" + ender)) continue;
    const obj = await store.get(key, { type: "json" });
    if (obj) out.push({ key, ...obj });
  }
  return out.sort((x, y) => Number(x.key.split(":")[0]) - Number(y.key.split(":")[0]));
}

/**
 * Grava o aceite do gate. Idempotente por (versão, aceiteDeclaradoEm): o mesmo aceite reenviado
 * (outro login, outro separador) não cria um segundo registo. Um aceite NOVO (outra hora declarada)
 * cria um registo novo — o histórico cresce, nunca se reescreve.
 * @returns {Promise<{ criado: boolean, registo: object }>}
 */
export async function registrarConsentimento(getStore, { endereco, versao, aceitos, aceiteDeclaradoEm, ip, userAgent }, agora = Date.now()) {
  const ender = String(endereco).toLowerCase();
  const existentes = await lerConsentimento(getStore, ender);
  const igual = existentes.find((r) => r.contexto === CONTEXTO_GATE
    && r.termoVersao === versao && r.aceiteDeclaradoEm === aceiteDeclaradoEm);
  if (igual) return { criado: false, registo: igual };

  let ts = agora;
  const usadas = new Set(existentes.map((r) => r.key));
  while (usadas.has(`${ts}:${ender}`)) ts += 1; // nunca sobrescrever um registo do mesmo ms
  const key = `${ts}:${ender}`;
  const registo = {
    endereco: ender,
    aceiteEm: new Date(ts).toISOString(),
    aceiteDeclaradoEm,
    termoVersao: versao,
    aceitos,
    ip: ip || "unknown",
    userAgent: userAgent || "unknown",
    contexto: CONTEXTO_GATE,
  };
  await abrir(getStore).setJSON(key, registo);
  return { criado: true, registo: { key, ...registo } };
}
