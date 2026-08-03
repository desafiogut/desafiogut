// NavAdminPersistente — navegação do painel ADM, agrupada por PERGUNTA.
//
// MC89.24 criou-a como barra plana de 7 itens. MC89.44 (P1-A) reorganiza-a em
// três grupos — Quem · Dinheiro · Sistema — e corrige quatro defeitos que a
// versão plana tinha (ver docs/MC89.44-DIAGNOSTICO.txt):
//
//   D-1 ⚠️ «Aprovações» e «Cotas» NÃO APARECIAM. A barra filtrava `!t.nota`, e
//       essas duas telas — com rota, componente e backend a funcionar — só
//       eram alcançáveis escrevendo o URL. Num APK não há barra de endereços:
//       na prática, não existiam. Agora a lista vem de GRUPOS_ADMIN, que cobre
//       as nove por construção, e há um teste que o exige.
//   D-3 ⚠️ Os rótulos eram cortados a 4 caracteres no telemóvel
//       (`label.slice(0, 4)` → "Financeiro" virava "Fina"). Já não se corta
//       nada: agrupar deixa ≤4 destinos por linha, e aí os rótulos inteiros
//       cabem. Foi este o ponto do agrupamento — não a arrumação.
//   D-4 Alvos de toque de ~28 px passam a 44 px (ALVO_MIN_PX).
//   D-5 Saíram os glifos ◉◒◓◔◑◐. Não eram emoji, mas também não informavam
//       (◒ repetia-se em quatro destinos) e só existiam no DESKTOP — cromo
//       onde sobra largura, corte onde falta. Estava ao contrário.
//
// ⚠️ DESVIO CONSCIENTE AO ENUNCIADO (§1.2). O enunciado pede cabeçalhos de
// secção INERTES sobre uma lista — o que pressupõe uma sidebar, e o painel não
// tem sidebar: tem uma barra horizontal. Com rótulos inteiros a 44 px, as oito
// pastilhas mais três cabeçalhos dão ≈800 px num ecrã de ≈304 px úteis: TRÊS
// linhas fixas, um terço da altura. E isso já foi tentado neste repositório —
// `AtalhosAdmin.jsx` registava que a barra de nove «partiu-se em três linhas
// irregulares» no aparelho (MC89.6).
//   ⇒ No TELEMÓVEL os grupos COLAPSAM: os cabeçalhos são controlos com
//     `aria-expanded`, e vê-se um grupo de cada vez.
//   ⇒ No DESKTOP, onde a largura chega, tudo fica visível ao mesmo tempo e os
//     cabeçalhos são inertes, como o enunciado pede.

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { telaAtiva, telaIndice, GRUPOS_ADMIN, telasDoGrupo, grupoAtivo } from "../../lib/adminNav.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";

// Alvo de toque confortável. A WCAG 2.2 AA (SC 2.5.8) exige 24 px; 44 px é o
// que o enunciado pede e o que se acerta com o polegar sem olhar.
const ALVO_MIN_PX = 44;

const COR = {
  texto: "#e8f0fe",
  mudo: "#94a3b8",
  cabecalho: "#f5a623",   // mesmo tratamento de <TituloSeccao> (pages/admin/_ui.jsx)
};

/** Pastilha de destino. A seleção marca-se por CONTRASTE, não pela cor de marca. */
function Destino({ tela, sel, isMobile }) {
  return (
    <Link
      to={tela.href}
      aria-current={sel ? "page" : undefined}
      style={{
        display: "inline-flex", alignItems: "center",
        minHeight: isMobile ? ALVO_MIN_PX : 34,
        padding: isMobile ? "0 0.7rem" : "0 0.6rem",
        borderRadius: "8px",
        textDecoration: "none",
        fontSize: isMobile ? "0.78rem" : "0.76rem",
        fontWeight: sel ? 700 : 500,
        whiteSpace: "nowrap",
        color: sel ? COR.texto : COR.mudo,
        background: sel ? "rgba(255,255,255,0.10)" : "transparent",
        border: `1px solid ${sel ? "rgba(255,255,255,0.25)" : "transparent"}`,
        flexShrink: 0,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      {/* Rótulo INTEIRO. Cortar por omissão foi o defeito D-3. */}
      {tela.label}
    </Link>
  );
}

export default function NavAdminPersistente() {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const ativa = telaAtiva(pathname);
  const indice = telaIndice();

  // Qual o grupo aberto no telemóvel?
  //
  // Por omissão, o do ecrã atual (`grupoAtivo`), para que os irmãos da tela em
  // que se está fiquem sempre a UM toque. O ADM pode abrir outro à mão — e essa
  // escolha tem de morrer quando ele navega, senão fica a ver os destinos de um
  // grupo enquanto está noutro. Daí o ajuste durante o render em vez de um
  // efeito: um efeito só corrigiria DEPOIS de pintar o estado errado.
  const [manual, setManual] = useState(null);
  const [caminhoVisto, setCaminhoVisto] = useState(pathname);
  if (pathname !== caminhoVisto) {
    setCaminhoVisto(pathname);
    setManual(null);
  }
  const abertoId = manual || grupoAtivo(pathname)?.id || null;

  const estiloBarra = {
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
    overflowX: "auto",
    scrollbarWidth: "none",
    WebkitOverflowScrolling: "touch",
  };

  // ── DESKTOP: uma linha, tudo à vista, cabeçalhos inertes ──────────────────
  if (!isMobile) {
    return (
      <nav aria-label="Navegação do painel" style={{
        ...estiloBarra,
        paddingBottom: "0.3rem",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        marginBottom: "0.15rem",
      }}>
        <Destino tela={indice} sel={ativa?.id === indice.id} isMobile={false} />
        {GRUPOS_ADMIN.map((g) => (
          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
            <span
              aria-hidden="true"
              style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.10)", margin: "0 0.35rem" }}
            />
            {/* Cabeçalho INERTE — é um rótulo, não um destino. */}
            <span style={{
              fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.08em",
              textTransform: "uppercase", color: COR.cabecalho, whiteSpace: "nowrap",
            }}>{g.label}</span>
            {telasDoGrupo(g.id).map((t) => (
              <Destino key={t.id} tela={t} sel={ativa?.id === t.id} isMobile={false} />
            ))}
          </div>
        ))}
      </nav>
    );
  }

  // ── TELEMÓVEL: índice + três grupos colapsáveis ───────────────────────────
  const telasAbertas = abertoId ? telasDoGrupo(abertoId) : [];

  return (
    <nav aria-label="Navegação do painel" style={{
      display: "flex", flexDirection: "column", gap: "0.3rem",
      paddingBottom: "0.35rem",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      marginBottom: "0.15rem",
    }}>
      <div style={estiloBarra}>
        <Destino tela={indice} sel={ativa?.id === indice.id} isMobile />
        {GRUPOS_ADMIN.map((g) => {
          const aberto = abertoId === g.id;
          return (
            <button
              key={g.id}
              type="button"
              aria-expanded={aberto}
              aria-controls="nav-admin-destinos"
              onClick={() => setManual(aberto ? null : g.id)}
              style={{
                display: "inline-flex", alignItems: "center",
                minHeight: ALVO_MIN_PX, padding: "0 0.7rem",
                borderRadius: "8px",
                fontSize: "0.78rem",
                fontWeight: aberto ? 700 : 500,
                whiteSpace: "nowrap",
                cursor: "pointer",
                // Contraste, não cor de marca — o laranja fica para os títulos
                // e para a ação irreversível.
                color: aberto ? COR.texto : COR.mudo,
                background: aberto ? "rgba(255,255,255,0.10)" : "transparent",
                border: `1px solid ${aberto ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)"}`,
                flexShrink: 0,
              }}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {telasAbertas.length > 0 && (
        <div id="nav-admin-destinos" style={{ ...estiloBarra, paddingLeft: "0.15rem" }}>
          {telasAbertas.map((t) => (
            <Destino key={t.id} tela={t} sel={ativa?.id === t.id} isMobile />
          ))}
          {/* Afordância de scroll — só quando pode haver corte à direita. */}
          <span aria-hidden="true" style={{
            position: "sticky", right: 0,
            background: "linear-gradient(to right, transparent, rgba(13,18,53,1) 60%)",
            paddingLeft: "1.5rem", paddingRight: "0.2rem",
            display: "flex", alignItems: "center", pointerEvents: "none",
            color: "#64748b", fontSize: "0.7rem", flexShrink: 0,
          }}>→</span>
        </div>
      )}
    </nav>
  );
}
