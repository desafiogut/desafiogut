// EnderecoTruncado — endereço encurtado, com o endereço completo ao alcance.
//
// MC89.28 (Fase 3 da reforma). Substitui 8 truncagens espalhadas por 6
// implementações e 4 comprimentos diferentes (6+6, 6+4, 8+0, 10+6): o MESMO
// endereço aparecia cortado de maneira diferente conforme a tela — e, em
// ConfiguracoesAdmins, de duas maneiras diferentes dentro da mesma tela.
//
// PORQUÊ IMPORTA MAIS DO QUE PARECE: um endereço truncado não é decorativo. É
// a identidade de quem pagou, de quem foi bloqueado, de quem executou uma ação
// no log de auditoria. Antes deste componente, o painel inteiro tinha ZERO
// tooltips: quem quisesse ler o endereço completo tinha de ir à base de dados.
// Num painel que serve para decidir, isso é uma decisão tomada às cegas.
//
// `title` nativo em vez de tooltip próprio: funciona sem JS, é lido pelas
// tecnologias de apoio, e não há um único caso aqui que justifique o custo de
// um componente flutuante. No telemóvel o `title` não abre — por isso o
// endereço completo vai TAMBÉM para o texto acessível, e há `onClick` para
// copiar, que é o gesto que um dedo consegue fazer.

const MONO = "'JetBrains Mono', ui-monospace, monospace";

/** Corte único do painel. 6 à cabeça, 4 à cauda — chega para distinguir. */
export function truncarEndereco(addr, prefixo = 6, sufixo = 4) {
  if (!addr || typeof addr !== "string") return "—";
  if (addr.length <= prefixo + sufixo + 1) return addr;
  return `${addr.slice(0, prefixo)}…${addr.slice(-sufixo)}`;
}

/**
 * @param {object} props
 * @param {string} props.endereco            Endereço completo. Vazio/nulo → "—".
 * @param {number} [props.prefixo=6]
 * @param {number} [props.sufixo=4]
 * @param {string} [props.cor]               Cor do texto (por omissão, herda).
 * @param {boolean} [props.copiavel=true]    Clicar copia o endereço completo.
 * @param {function} [props.aoCopiar]        Chamado com o endereço após copiar.
 */
export default function EnderecoTruncado({
  endereco,
  prefixo = 6,
  sufixo = 4,
  cor,
  copiavel = true,
  aoCopiar,
}) {
  if (!endereco || typeof endereco !== "string") {
    return <span style={{ color: "#94a3b8" }}>—</span>;
  }

  const curto = truncarEndereco(endereco, prefixo, sufixo);
  const podeCopiar = copiavel && typeof navigator !== "undefined" && navigator.clipboard;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(endereco);
      aoCopiar?.(endereco);
    } catch {
      /* clipboard negado (contexto inseguro, permissão) — o `title` continua lá */
    }
  }

  return (
    <span
      // O endereço completo em `title`: é o que resolve o problema no desktop.
      title={endereco}
      onClick={podeCopiar ? copiar : undefined}
      role={podeCopiar ? "button" : undefined}
      tabIndex={podeCopiar ? 0 : undefined}
      onKeyDown={podeCopiar ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); copiar(); } } : undefined}
      style={{
        fontFamily: MONO,
        color: cor || "inherit",
        whiteSpace: "nowrap",
        cursor: podeCopiar ? "pointer" : "default",
      }}
    >
      {/* Visível: a forma curta. Para o leitor de ecrã: o endereço inteiro —
          `title` sozinho não é anunciado de forma fiável em todos os leitores. */}
      <span aria-hidden="true">{curto}</span>
      <span className="sr-only">{endereco}</span>
    </span>
  );
}
