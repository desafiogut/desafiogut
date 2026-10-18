// RegrasOficiais.jsx — UTAC106h → UTAC110h. Página pública `/regras-oficiais` do app.
//
// Requisito da Google Play (política **Real-Money Gambling / Gamified Loyalty**): as **Regras
// Oficiais** do programa de fidelidade têm de estar **publicadas dentro do aplicativo**.
//
// UTAC110h (R18-110h-A): a página publica o **Regulamento Oficial v5.0 INTEGRAL** (12 capítulos,
// 72 artigos). FONTE ÚNICA: `docs/REGULAMENTO-v5.md` — importado em bruto (`?raw`) e desenhado
// aqui. Nenhum texto jurídico é escrito à mão neste ficheiro: o que o utilizador lê é o texto do
// documento. O GUTO lê o MESMO corpo (`docs/GUTO-REGULAMENTO.md`, igualdade byte-a-byte guardada
// por `utac106h-regras.test.mjs`).
//
// A única transformação é de ESPAÇO BRANCO: o PDF partiu 4 frases em dois parágrafos (quebra de
// página — Arts. 20º, 42º, 53º e o rodapé); um parágrafo que não começa por Capítulo/Secção/Art./
// item continua o anterior e é unido com um espaço. Nenhuma palavra muda.
//
// ⚠️ Histórico: até ao UTAC110h esta página espelhava em JSX as «Regras Oficiais v1.0»
// (`docs/regras-oficiais.md`, 1 Passe = 1 ponto). Esse texto continua no git; o `.md` ficou
// marcado como SUBSTITUÍDO.

import { Link } from "react-router-dom";
import { GlassCard } from "@/components/ui";
import { useIsMobile } from "../hooks/useIsMobile.js";
import REGULAMENTO_MD from "../../../../docs/REGULAMENTO-v5.md?raw";
// UTAC110j.5 (Frente C) — as PROPORÇÕES FIXAS de pontos de lance (Google Play, Política de Programas de
// Fidelidade Gamificados: «visíveis no app e nos termos oficiais»). O Regulamento v5.1 fixa 200 (Art. 17º)
// e 1 ponto = R$ 0,01 (Art. 18º), mas NÃO os valores de cada fonte (Art. 16º só as enumera). O resumo vem
// de `lib/pontosLance.js` (amarrado às constantes do backend por teste) e NÃO é escrito à mão aqui —
// regra do UTAC110h. Fica ANTES do 1.º capítulo: o texto integral do Regulamento continua igual, palavra
// a palavra (guarda `utac106h-regras`), e é ele que vincula.
import { PROPORCOES_TEXTO } from "../lib/pontosLance.js";

const COR = { text: "#e8f0fe", corpo: "#c9d3ee", muted: "#8f9cc8", gold: "#f5a623" };

const RE_CAPITULO = /^CAPÍTULO ([IVXL]+) — (.+)$/;
const RE_SECCAO = /^Secção ([IVXL]+) — (.+)$/;
const RE_ARTIGO = /^(Art\. \d+º) — ([\s\S]*)$/;
const RE_ITEM = /^- ([\s\S]*)$/;
const RE_RODAPE = /^Documento oficial/;

/**
 * Lê o Markdown do Regulamento e devolve a estrutura que a página desenha. Função PURA.
 * O corpo começa depois da 1.ª linha `---` (o que vem antes é o cabeçalho do ficheiro do repo).
 */
export function lerRegulamento(md) {
  const texto = String(md).replace(/\r\n/g, "\n");
  const corte = texto.indexOf("\n---\n");
  const corpo = corte >= 0 ? texto.slice(corte + 5) : texto;
  const paragrafos = corpo.split(/\n\s*\n/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);

  const abertura = [];
  const capitulos = [];
  let rodape = null;
  let cap = null;
  let art = null; // artigo corrente (recebe os itens «- …»)
  let ultimo = null; // { alvo, campo } — onde se cola uma continuação

  for (const par of paragrafos) {
    let m;
    if ((m = par.match(RE_CAPITULO))) {
      cap = { numero: m[1], titulo: m[2], blocos: [] };
      capitulos.push(cap);
      art = null;
      ultimo = null;
    } else if (!cap) {
      abertura.push(par);
    } else if ((m = par.match(RE_SECCAO))) {
      cap.blocos.push({ tipo: "seccao", numero: m[1], titulo: m[2] });
      art = null;
      ultimo = null;
    } else if ((m = par.match(RE_ARTIGO))) {
      art = { tipo: "artigo", rotulo: m[1], texto: m[2], itens: [] };
      cap.blocos.push(art);
      ultimo = { alvo: art, campo: "texto" };
    } else if ((m = par.match(RE_ITEM)) && art) {
      art.itens.push(m[1]);
      ultimo = { alvo: art.itens, campo: art.itens.length - 1 };
    } else if (RE_RODAPE.test(par)) {
      rodape = { texto: par };
      art = null;
      ultimo = { alvo: rodape, campo: "texto" };
    } else if (ultimo) {
      ultimo.alvo[ultimo.campo] = `${ultimo.alvo[ultimo.campo]} ${par}`;
    } else {
      cap.blocos.push({ tipo: "paragrafo", texto: par });
    }
  }
  return { abertura, capitulos, rodape: rodape?.texto ?? null };
}

export const REGULAMENTO = lerRegulamento(REGULAMENTO_MD);
export const VERSAO_REGULAMENTO = (REGULAMENTO.abertura.join(" ").match(/Versão (\d+\.\d+)/) || [])[1] ?? null;

const ancora = (numero) => `cap-${numero.toLowerCase()}`;

const h2 = { margin: "0 0 0.9rem", fontSize: "1rem", fontWeight: 800, color: COR.gold, letterSpacing: "0.02em", lineHeight: 1.4 };
const h3 = { margin: "1rem 0 0.6rem", fontSize: "0.82rem", fontWeight: 800, color: COR.text, letterSpacing: "0.06em", textTransform: "uppercase" };
const pArt = { margin: "0 0 0.8rem", fontSize: "0.9rem", color: COR.corpo, lineHeight: 1.7 };
const rotulo = { color: COR.gold, fontWeight: 800 };
const ul = { margin: "-0.35rem 0 0.9rem", paddingLeft: "1.15rem" };
const li = { margin: "0 0 0.35rem", fontSize: "0.88rem", color: COR.corpo, lineHeight: 1.65 };
const linkSumario = {
  display: "flex", alignItems: "center", minHeight: "48px", padding: "0 0.25rem",
  color: COR.text, fontSize: "0.86rem", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.06)",
};

export default function RegrasOficiais() {
  const isMobile = useIsMobile();
  const cardCls = `gut-glass--solid ${isMobile ? "p-4 mb-4" : "p-5 mb-5"}`;
  const [titulo, ...resto] = REGULAMENTO.abertura;

  return (
    <div style={{ padding: isMobile ? "1rem" : "2rem", maxWidth: "760px", margin: "0 auto", boxSizing: "border-box" }}>
      <GlassCard className={cardCls}>
        <h1 style={{ margin: "0 0 0.4rem", fontSize: isMobile ? "1.25rem" : "1.55rem", fontWeight: 900, color: COR.text, lineHeight: 1.3 }}>
          {titulo}
        </h1>
        {resto.map((linha) => (
          <p key={linha} style={{ margin: "0 0 0.25rem", fontSize: "0.9rem", color: COR.gold, fontWeight: 700 }}>{linha}</p>
        ))}
      </GlassCard>

      <GlassCard className={cardCls}>
        <h2 style={h2}>Sumário</h2>
        <nav aria-label="Capítulos do Regulamento">
          {REGULAMENTO.capitulos.map((c) => (
            <a key={c.numero} href={`#${ancora(c.numero)}`} style={linkSumario}>
              <span style={{ color: COR.gold, fontWeight: 800, minWidth: "3.2rem" }}>{c.numero}</span>
              <span>{c.titulo}</span>
            </a>
          ))}
        </nav>
      </GlassCard>

      {/* UTAC110j.5 — sem <section> de propósito: a guarda de cobertura do 110h começa no 1.º <section>. */}
      <GlassCard className={cardCls}>
        <div data-proporcoes="">
          <h2 style={h2}>Proporções fixas dos pontos de lance</h2>
          <p style={{ ...pArt, color: COR.muted, fontSize: "0.82rem" }}>
            Resumo informativo dos valores do programa. O texto que vale é o Regulamento abaixo.
          </p>
          {PROPORCOES_TEXTO.map((bloco) => (
            <div key={bloco.id} data-proporcao={bloco.id}>
              <h3 style={h3}>{bloco.titulo}</h3>
              <ul style={{ ...ul, margin: "0 0 0.9rem" }}>
                {bloco.linhas.map((l) => <li key={l} style={li}>{l}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </GlassCard>

      {REGULAMENTO.capitulos.map((c) => (
        <GlassCard key={c.numero} className={cardCls}>
          <section id={ancora(c.numero)} style={{ scrollMarginTop: "1rem" }}>
            <h2 style={h2}>CAPÍTULO {c.numero} — {c.titulo}</h2>
            {c.blocos.map((b, i) => {
              if (b.tipo === "seccao") return <h3 key={i} style={h3}>Secção {b.numero} — {b.titulo}</h3>;
              if (b.tipo === "paragrafo") return <p key={i} style={pArt}>{b.texto}</p>;
              return (
                <div key={i}>
                  <p style={pArt}>
                    <strong style={rotulo}>{b.rotulo}</strong> — {b.texto}
                  </p>
                  {b.itens.length > 0 && (
                    <ul style={ul}>
                      {b.itens.map((it) => <li key={it} style={li}>{it}</li>)}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        </GlassCard>
      ))}

      {/* Rodapé dentro do vidro (achado do validador SEG5: fora dele o contraste dependia da imagem de fundo). */}
      <GlassCard className={cardCls}>
        {REGULAMENTO.rodape && (
          <p data-rodape style={{ textAlign: "center", margin: "0 0 0.5rem", fontSize: "0.8rem", color: COR.muted, lineHeight: 1.6 }}>
            {REGULAMENTO.rodape}
          </p>
        )}
        <p data-fim-regulamento style={{ textAlign: "center", margin: 0 }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", minHeight: "48px", color: COR.text, fontSize: "0.88rem" }}>
            ← Voltar ao app
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
