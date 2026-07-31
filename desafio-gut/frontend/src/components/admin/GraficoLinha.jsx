// GraficoLinha — mini-gráfico de linha SVG para o painel ADM.
//
// MC89.7 (Fase 1). Sem dependências externas — SVG puro, ~120 linhas de
// código. O plano do MC89.5 decidiu isto em vez de Recharts porque o parse de
// JS é um custo medido (privy = 2,68 MB, MC88.36) e três linhas simples não
// justificam ~100 kB gzip de biblioteca.
//
// ⚠️ NÃO PREENCHE VALORES AUSENTES. Um `null` na série é um dia sem dados, e o
// gráfico mostra-o como uma quebra na linha — não como um zero. Zero é uma
// afirmação sobre o mundo, e "não tenho dados desse dia" não é zero (a mesma
// regra R-UI-1 do MC89.1, aplicada a gráficos).

const ALTURA = 100;
const MARGEM = { top: 8, right: 8, bottom: 18, left: 8 };
const COR_PADRAO = "#f5a623";
const COR_GRADE   = "rgba(255,255,255,0.06)";
const COR_TEXTO   = "#94a3b8";

/**
 * @param {object} props
 * @param {Array<number|null>} props.valores  valores Y; null = dia sem dado
 * @param {string[]} [props.rotulos]          rótulos do eixo X (datas curtas)
 * @param {string} [props.cor]                cor da linha (default laranja)
 * @param {string} [props.label]              rótulo do gráfico
 * @param {string} [props.formato]            função para formatar o tooltip
 * @param {number} [props.altura]             altura do SVG (default 100)
 */
export default function GraficoLinha({
  valores = [], rotulos = [], cor = COR_PADRAO, label = "",
  formato = (v) => String(v), altura = ALTURA,
}) {
  const wTotal = 100; // percentagem
  const h = altura;
  const plotW = wTotal - MARGEM.left - MARGEM.right;
  const plotH = h - MARGEM.top - MARGEM.bottom;

  // Só pontos com valor (não-null)
  const pontos = valores
    .map((v, i) => (v !== null && v !== undefined ? { i, v: Number(v) } : null))
    .filter(Boolean);

  if (pontos.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        {label && <span style={{ fontSize: "0.66rem", color: COR_TEXTO, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>}
        <svg viewBox={`0 0 ${wTotal} ${h}`} style={{ width: "100%", height: h, display: "block" }}
          role="img" aria-label={`${label}: sem dados`}>
          <text x={wTotal / 2} y={h / 2} textAnchor="middle" fill={COR_TEXTO} fontSize="4" fontFamily="system-ui">
            Sem dados
          </text>
        </svg>
      </div>
    );
  }

  const minV = Math.min(...pontos.map((p) => p.v));
  const maxV = Math.max(...pontos.map((p) => p.v));
  const alcance = maxV - minV || 1; // não dividir por zero se todos os valores forem iguais

  const paraX = (i) => MARGEM.left + (i / Math.max(valores.length - 1, 1)) * plotW;
  const paraY = (v) => MARGEM.top + plotH - ((v - minV) / alcance) * plotH;

  const linha = pontos.map((p) => `${paraX(p.i)},${paraY(p.v)}`).join(" ");
  const ultimo = pontos[pontos.length - 1];
  const primeiro = pontos[0];

  // Rótulos do eixo X: mostra o primeiro e o último dia, e um a meio se
  // houver espaço. Evita empilhar 30 datas num gráfico de 300 px.
  const ticksX = [];
  if (rotulos.length > 0) {
    ticksX.push({ i: 0, label: rotulos[0] });
    if (rotulos.length > 2) {
      const meio = Math.floor(rotulos.length / 2);
      ticksX.push({ i: meio, label: rotulos[meio] });
    }
    if (rotulos.length > 1) {
      ticksX.push({ i: rotulos.length - 1, label: rotulos[rotulos.length - 1] });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      {label && (
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.66rem", color: COR_TEXTO, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
          <span style={{ fontSize: "0.72rem", fontWeight: 800, color: cor }}>
            {formato(ultimo.v)}
          </span>
        </div>
      )}
      <svg viewBox={`0 0 ${wTotal} ${h}`} style={{ width: "100%", height: h, display: "block", overflow: "visible" }}
        role="img" aria-label={`${label}: ${formato(ultimo.v)}`}>
        {/* Grade horizontal (2 linhas) */}
        <line x1={MARGEM.left} y1={paraY(minV)} x2={MARGEM.left + plotW} y2={paraY(minV)}
          stroke={COR_GRADE} strokeWidth="0.5" />
        <line x1={MARGEM.left} y1={paraY(maxV)} x2={MARGEM.left + plotW} y2={paraY(maxV)}
          stroke={COR_GRADE} strokeWidth="0.5" />

        {/* Área sob a linha (transparência leve) */}
        <polygon
          points={`${paraX(primeiro.i)},${paraY(minV)} ${linha} ${paraX(ultimo.i)},${paraY(minV)}`}
          fill={cor} opacity="0.07" />

        {/* Linha */}
        <polyline points={linha} fill="none" stroke={cor} strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Pontos */}
        {pontos.map((p) => (
          <circle key={p.i} cx={paraX(p.i)} cy={paraY(p.v)} r="2"
            fill={cor} stroke="none" />
        ))}

        {/* Último ponto destacado */}
        <circle cx={paraX(ultimo.i)} cy={paraY(ultimo.v)} r="3"
          fill={cor} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

        {/* Rótulos do eixo X */}
        {ticksX.map((t) => (
          <text key={t.i} x={paraX(t.i)} y={h - 2} textAnchor="middle"
            fill={COR_TEXTO} fontSize="3" fontFamily="system-ui">
            {t.label}
          </text>
        ))}

        {/* Rótulos do eixo Y (min e max) */}
        <text x={MARGEM.left} y={paraY(maxV) - 1.5} fill={COR_TEXTO} fontSize="2.5" fontFamily="system-ui">
          {formato(maxV)}
        </text>
      </svg>
    </div>
  );
}
