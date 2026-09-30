// MC104.3 — Duplo de @netlify/blobs em memória com a semântica REAL de escrita condicional
// (copiada do duplo do MC102.0, medido contra o dist/ do @netlify/blobs 10.0.0):
//  - `set` aplica `onlyIfMatch` (etag diferente ou chave ausente → { modified:false });
//  - `setJSON` IGNORA as condições (o real espalha-as e o If-Match não sai);
//  - um Map POR store (um Map partilhado faz um hard-delete de um store actuar noutro — MC104.2).
// `g.antesDeGravar(nome, map, chave)` corre UMA vez antes da próxima escrita em (store, chave): simula
// um escritor concorrente entre a leitura e a escrita de quem está a ser testado.
import { createHash } from "node:crypto";

export const etagDe = (v) => `"${createHash("sha1").update(v).digest("hex")}"`;

export function criarBlobs() {
  const blobs = new Map();
  const g = { antesDeGravar: null, escritasSemCondicao: [] };
  const disparar = (name, m, k) => {
    if (!g.antesDeGravar) return;
    const f = g.antesDeGravar; if (f(name, m, k) === true) g.antesDeGravar = null;
  };
  const getStore = ({ name }) => {
    if (!blobs.has(name)) blobs.set(name, new Map());
    const m = blobs.get(name);
    return {
      async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
      async getWithMetadata(k, { type } = {}) {
        const v = m.get(k);
        if (v === undefined) return null;
        return { data: type === "json" ? JSON.parse(v) : v, etag: etagDe(v), metadata: {} };
      },
      async setJSON(k, o) {
        disparar(name, m, k);
        g.escritasSemCondicao.push(`${name}:${k}`);
        const v = JSON.stringify(o); m.set(k, v); return { modified: true, etag: etagDe(v) };
      },
      async set(k, v, opt = {}) {
        disparar(name, m, k);
        if (opt.onlyIfMatch && (!m.has(k) || etagDe(m.get(k)) !== opt.onlyIfMatch)) return { modified: false };
        if (!opt.onlyIfMatch) g.escritasSemCondicao.push(`${name}:${k}`);
        m.set(k, String(v)); return { modified: true, etag: etagDe(String(v)) };
      },
      async list({ prefix = "" } = {}) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
      async delete(k) { m.delete(k); },
    };
  };
  const ler = (name, k) => { const v = blobs.get(name)?.get(k); return v === undefined ? undefined : JSON.parse(v); };
  const gravar = (name, k, o) => { if (!blobs.has(name)) blobs.set(name, new Map()); blobs.get(name).set(k, JSON.stringify(o)); };
  return { blobs, g, getStore, ler, gravar };
}
