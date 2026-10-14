// _lib/nota-tecnica.mjs — UTAC110g.1, FRENTE A (R18-110g.1-1, decisão D-110g-3).
//
// O QUE É: a **Nota Técnica de Envio** do resgate do cartão colecionável — o documento que vai no
// E-MAIL de confirmação (texto, sem PDF: o Regulamento não especifica formato, e a R18-110g.1-1
// decidiu «texto no e-mail»).
//
// TEMPLATE FIXO (pequeno, estruturado). Os 5 campos exigidos pela R18-110g.1-1:
//   1. Nome do produto (cartão colecionável)
//   2. Destinatário (nome + morada)
//   3. Remetente (Associação + CNPJ)
//   4. Nº do pedido
//   5. Data
//
// ⚠️ PURA e DEFENSIVA: nunca lança e nunca escreve «undefined»/«Invalid Date» no documento que um
// titular vai ler. Campo ausente ⇒ `—`. É testável sem rede nem relógio (a data aceita injecção).
//
// ⚠️ Os NOMES DOS CAMPOS da morada são os do contrato REAL de `_lib/pedidos.mjs` (`validarMorada`:
// `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `cep`, `nome`) — não se inventa
// um 2.º contrato.
//
// ⚠️ Remetente = o VENDEDOR legal do produto (fonte única já fixada no CLAUDE.md): Associação
// Recreativa dos Nordestinos no Amazonas, CNPJ 23.040.066/0001-00. NÃO é o MEI (superseded) nem o
// DESAFIOGUT (que não emite documento fiscal deste resgate — ver `montarEmailResgate`).

/** Remetente legal do envio (R18-110g.1-1). */
export const REMETENTE = Object.freeze({
  nome: "Associação Recreativa dos Nordestinos no Amazonas",
  cnpj: "23.040.066/0001-00",
  cidade: "Manaus/AM",
});

/** Produto do resgate (o cartão colecionável da Família Quildo). */
export const PRODUTO_CARTAO = "Cartão colecionável Família Quildo";

/** Recuo de cada lado da moldura do documento. */
const MOLDURA = "═".repeat(39);

/** `—` para vazio/ausente; nunca deixa passar `undefined` nem string em branco. */
const campo = (v) => {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return s === "" ? "—" : s;
};

/** CEP: 8 dígitos → `69027-010`; qualquer outra coisa (ou ausente) fica como veio. */
export function formatarCep(cep) {
  const d = String(cep ?? "").replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : campo(cep);
}

/**
 * Data do documento em pt-BR, `DD/MM/AAAA`, no fuso de Manaus/AM (o fuso do remetente).
 * @param {string|number|Date} valor  ISO, epoch ou Date.
 * @returns {string} `DD/MM/AAAA` — ou `—` se o valor não for uma data legível (nunca «Invalid Date»).
 */
export function formatarData(valor) {
  const d = valor instanceof Date ? valor : new Date(valor ?? NaN);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Manaus", day: "2-digit", month: "2-digit", year: "numeric",
    }).format(d);
  } catch {
    // Ambiente sem ICU/fuso: degrada para UTC em vez de rebentar o e-mail.
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  }
}

/**
 * Monta a **Nota Técnica de Envio** (texto plano, template fixo).
 * @param {{id?:string|number, criadoEm?:string|number|Date, descricaoProduto?:string,
 *          nome?:string, morada?:object}} [pedido]
 * @returns {string} o documento completo, pronto a ir como `mensagem` do e-mail.
 */
export function gerarNotaTecnica(pedido = {}) {
  const { id, criadoEm, descricaoProduto, morada } = pedido ?? {};
  const m = morada && typeof morada === "object" ? morada : {};
  // O destinatário pode vir do corpo do pedido OU da própria morada (o nome do titular é o mesmo).
  const nome = campo(pedido?.nome ?? m.nome);

  const linhaEndereco = [campo(m.logradouro), campo(m.numero)].join(", ");
  const linhaCidade = `${campo(m.cidade)}/${campo(m.uf)}`;
  const complemento = m.complemento ? `Complemento: ${campo(m.complemento)}` : null;

  const linhas = [
    MOLDURA,
    "NOTA TÉCNICA DE ENVIO",
    MOLDURA,
    `Pedido: #${campo(id)}`,
    `Data: ${formatarData(criadoEm)}`,
    "",
    "PRODUTO:",
    campo(descricaoProduto ?? PRODUTO_CARTAO),
    "",
    "DESTINATÁRIO:",
    nome,
    linhaEndereco,
    ...(m.bairro ? [campo(m.bairro)] : []),
    ...(complemento ? [complemento] : []),
    linhaCidade,
    `CEP: ${formatarCep(m.cep)}`,
    "",
    "REMETENTE:",
    REMETENTE.nome,
    `CNPJ ${REMETENTE.cnpj}`,
    REMETENTE.cidade,
    MOLDURA,
  ];
  return linhas.join("\n");
}

export default gerarNotaTecnica;
