// Primitivas partilhadas pelas telas de /admin.
//
// MC89.6 (Fase 0) — extraídas verbatim de `pages/AdminPanel.jsx` (linhas 24-49 e
// 88-158 da versão anterior). Com as telas em ficheiros separados, ou isto vive
// num sítio só ou cada tela redefine as suas cores — e a paleta do painel deixa
// de ser uma decisão para passar a ser um acidente.
//
// As regras de cor fixadas no MC89.4 valem para todas as telas:
//   · o laranja (COR.primary) está RESERVADO a ação irreversível;
//   · a seleção marca-se por CONTRASTE, não pela cor de marca;
//   · sem emojis nos rótulos.

export const COR = {
  primary: "#f5a623",
  primaryDim: "rgba(245,166,35,0.16)",
  border: "rgba(245,166,35,0.30)",
  text: "#e8f0fe",
  muted: "#94a3b8",
  success: "#10b981",
  warn: "#fbbf24",
  danger: "#ef4444",
  diamond: "#00d4ff",
};

export const TIERS = [
  { id: "diamante", label: "Diamante", cor: COR.diamond },
  { id: "ouro",     label: "Ouro",     cor: COR.primary },
  { id: "prata",    label: "Prata",    cor: "#cbd5e1" },
  { id: "bronze",   label: "Bronze",   cor: "#cd7f32" },
];

// Classes Tailwind estáticas por tier (JIT-safe — o Tailwind não vê nomes
// construídos em tempo de execução).
export const TIER_ACTIVE_CLASS = {
  diamante: "!border-[#00d4ff]/55 !bg-[#00d4ff]/[0.12] !text-[#00d4ff] rounded-full",
  ouro:     "!border-[#f5a623]/55 !bg-[#f5a623]/[0.12] !text-[#f5a623] rounded-full",
  prata:    "!border-[#cbd5e1]/55 !bg-[#cbd5e1]/[0.12] !text-[#cbd5e1] rounded-full",
  bronze:   "!border-[#cd7f32]/55 !bg-[#cd7f32]/[0.12] !text-[#cd7f32] rounded-full",
};

/**
 * Formata um valor que pode legitimamente não existir.
 *
 * ⚠️ REGRA R-UI-1 (MC89.1): número indisponível mostra-se como "—", NUNCA como 0.
 * Um zero é uma afirmação sobre o mundo, e o painel serve para decidir. O backend
 * já distingue os dois casos (campo `parciais`); aqui é só não estragar.
 */
export function ouTraco(valor, formatar = (v) => String(v)) {
  return valor === null || valor === undefined ? "—" : formatar(valor);
}

export const brl = (centavos) => `R$ ${(centavos / 100).toFixed(2)}`;

export function Metrica({ rotulo, valor, nota, cor }) {
  return (
    <div style={{
      padding: "0.85rem 1rem",
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${COR.border}`,
      borderRadius: "10px",
      minWidth: 0,
    }}>
      <div style={{
        fontSize: "0.6rem", color: COR.muted, textTransform: "uppercase",
        letterSpacing: "0.07em", fontWeight: 700, marginBottom: "0.3rem",
      }}>{rotulo}</div>
      <div style={{
        fontSize: "1.35rem", fontWeight: 900, lineHeight: 1.1,
        color: cor || COR.text, overflowWrap: "anywhere",
      }}>{valor}</div>
      {nota && (
        <div style={{ fontSize: "0.66rem", color: COR.muted, marginTop: "0.25rem", lineHeight: 1.3 }}>
          {nota}
        </div>
      )}
    </div>
  );
}

/**
 * Título de secção do painel.
 *
 * MC89.28 — o VALOR já era o mesmo em todo o lado (0.78rem / COR.primary /
 * letterSpacing 0.05em). O que não era igual: três ficheiros definiam um `const
 * sh` local e outros três repetiam o literal inline, dez vezes. O de
 * ConfiguracoesAdmins acrescentava `fontWeight: 800` que os outros não tinham —
 * a única divergência visível, e ninguém a tinha decidido.
 *
 * `fontWeight: 800` e `textTransform: uppercase` ficam aqui para todos: as
 * telas já escreviam os títulos em maiúsculas à mão, o que só funcionava
 * enquanto ninguém se esquecesse.
 */
export function TituloSeccao({ children, semMargem = false, style }) {
  return (
    <h3 style={{
      fontSize: "0.78rem",
      color: COR.primary,
      margin: semMargem ? 0 : "0 0 0.5rem",
      letterSpacing: "0.05em",
      fontWeight: 800,
      textTransform: "uppercase",
      ...style,
    }}>{children}</h3>
  );
}

export function Grelha({ isMobile, children }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "0.65rem",
    }}>{children}</div>
  );
}

export function StatusBadge({ status }) {
  const mapa = {
    pendente:   { texto: "Pendente",  cor: COR.warn },
    aprovado:   { texto: "Aprovado",  cor: COR.success },
    rejeitado:  { texto: "Rejeitado", cor: COR.danger },
  };
  const m = mapa[status] || { texto: status, cor: COR.muted };
  return (
    <span style={{
      fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.06em",
      padding: "0.16rem 0.5rem", borderRadius: "999px",
      color: m.cor, background: `${m.cor}1f`, border: `1px solid ${m.cor}55`,
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{m.texto}</span>
  );
}

/**
 * Placeholder das telas ainda por construir (Fases 1 a 7 do MC89.5).
 *
 * Diz o que vai viver ali, em que fase, e as decisões já tomadas — para que a
 * decisão não se perca entre o plano e a execução. Uma tela vazia sem isto é um
 * convite a alguém inventar o conteúdo.
 */
export function EmConstrucao({ titulo, fase, descricao, decisoes = [] }) {
  return (
    <div style={{
      padding: "1.25rem",
      background: "rgba(255,255,255,0.02)",
      border: "1px dashed rgba(255,255,255,0.12)",
      borderRadius: "10px",
      display: "flex", flexDirection: "column", gap: "0.6rem",
    }}>
      <div>
        {/* MC89.9 — aviso explícito para varreduras textuais não confundirem
            texto de planeamento com dados reais. */}
        <p style={{ margin: 0, fontSize: "0.65rem", color: COR.warn, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          [EM BREVE — planeamento]
        </p>
        <h2 style={{ margin: "0.15rem 0 0", fontSize: "1rem", fontWeight: 700, color: COR.text }}>{titulo}</h2>
        <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: COR.muted, letterSpacing: "0.04em" }}>
          {fase}
        </p>
      </div>
      <p style={{ margin: 0, fontSize: "0.84rem", color: COR.muted, lineHeight: 1.5 }}>{descricao}</p>
      {decisoes.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {decisoes.map((d) => (
            <li key={d} style={{ fontSize: "0.76rem", color: COR.muted, lineHeight: 1.45 }}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
