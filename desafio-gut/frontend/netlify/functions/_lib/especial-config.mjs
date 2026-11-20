// _lib/especial-config.mjs — UTAC140b. Configuração DINÂMICA da edição especial, lida da PRÓPRIA edição no Blob
// `edicoes-metadata` (operador: «o objetivo é que possamos mudar essas coisas assim como as edições, de forma
// dinâmica no banco de dados»). Nada de ids nem regras fixas no código: cada edição ESPECIAL-* pode trazer
//
//   rankingAoVivo        boolean           regista os lances na tabela ao vivo (Supabase)       · omissão: true
//   top10.publico        boolean           o Top 10 público leva os valores (a v12 só os desenha
//                                          com valor — R18-140-G)                                · omissão: true
//   top10.janelaHoras    inteiro 1..720    quanto tempo depois do fim a tabela completa se serve · omissão: 24
//   top10.exigePasse     boolean           a tabela completa (Meus Ativos) exige Passe           · omissão: true
//   passeACadaLances     inteiro 0..100    quem tem Passe Relâmpago gasta 1 a cada N lances; o lance
//                                          gasta só pontos e passa sem Passe (UTAC142.1); 0 desliga · omissão: 3
//   avisosLider          boolean           GUTO avisa o líder do menor lance único, por janela
//                                          (UTAC142, R18-142-E)                                   · omissão: true
//   guto.boasVindas      texto ≤ 600       frase de boas-vindas do GUTO; aceita {produto} e
//                                          {apuracao}                                            · omissão: a do UTAC140
//
// Campos ausentes ou inválidos caem no valor por omissão (= as decisões do UTAC140). PURO: sem Blobs nem env.

import { EDICAO_ESPECIAL_RE, msDe } from "./edicao-janela.mjs";

export const CONFIG_ESPECIAL_PADRAO = Object.freeze({
  rankingAoVivo: true,
  passeACadaLances: 3, // UTAC142.1 (substitui o `passePorLance` da R18-142-C)
  avisosLider: true,   // UTAC142 (R18-142-E)
  top10: Object.freeze({ publico: true, janelaHoras: 24, exigePasse: true }),
  guto: Object.freeze({ boasVindas: null }),
});

const bool = (v, fb) => (typeof v === "boolean" ? v : fb);
const inteiroEntre = (v, min, max, fb) => (Number.isSafeInteger(v) && v >= min && v <= max ? v : fb);
const texto = (v, max) => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.length <= max ? t : null;
};

/** Configuração efectiva de uma edição (metadata crua do Blob). Nunca lança. */
export function configDaEspecial(meta) {
  const P = CONFIG_ESPECIAL_PADRAO;
  const t = meta && typeof meta.top10 === "object" && meta.top10 ? meta.top10 : {};
  const g = meta && typeof meta.guto === "object" && meta.guto ? meta.guto : {};
  return {
    rankingAoVivo: bool(meta?.rankingAoVivo, P.rankingAoVivo),
    passeACadaLances: inteiroEntre(meta?.passeACadaLances, 0, 100, P.passeACadaLances),
    avisosLider: bool(meta?.avisosLider, P.avisosLider),
    top10: {
      publico: bool(t.publico, P.top10.publico),
      janelaHoras: inteiroEntre(t.janelaHoras, 1, 720, P.top10.janelaHoras),
      exigePasse: bool(t.exigePasse, P.top10.exigePasse),
    },
    guto: { boasVindas: texto(g.boasVindas, 600) },
  };
}

/**
 * A especial EM CURSO ou por abrir a anunciar (a que termina primeiro), entre as edições gravadas.
 * Encerrada/apurada ou já terminada ⇒ fora.
 * @param {object[]} metas
 * @returns {object|null}
 */
export function escolherEspecialAtual(metas, agoraMs = Date.now()) {
  const candidatas = (Array.isArray(metas) ? metas : [])
    .filter((m) => m && typeof m.id === "string" && EDICAO_ESPECIAL_RE.test(m.id))
    .filter((m) => m.status !== "encerrado" && m.status !== "apurado")
    .filter((m) => { const f = msDe(m.termino_em); return f != null && agoraMs <= f; })
    .sort((a, b) => msDe(a.termino_em) - msDe(b.termino_em));
  return candidatas[0] ?? null;
}
