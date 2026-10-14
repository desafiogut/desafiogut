// SEG3 / UTAC110g.1 — SONDA PRÓPRIA da Nota Técnica (instrumento do validador).
// Imprime o documento real e mede a fronteira do fuso (o que a guarda NÃO distingue).
// Uso: node _logs/_tmp-seg3/sonda-nota.mjs
import { gerarNotaTecnica, formatarData, formatarCep, REMETENTE } from "../../desafio-gut/frontend/netlify/functions/_lib/nota-tecnica.mjs";

const PEDIDO = {
  id: 4242,
  criadoEm: "2026-10-14T02:30:00.000Z",
  descricaoProduto: "Cartão colecionável Família Quildo",
  nome: "Maria Quildo de Souza",
  morada: {
    nome: "Maria Quildo de Souza", cpf: "11144477735", cep: "69027010",
    logradouro: "Rua das Flores", numero: "42", complemento: "Bloco B, apto 7",
    bairro: "Centro", cidade: "Manaus", uf: "AM", telefone: "92999999999",
  },
};

const doc = gerarNotaTecnica(PEDIDO);
console.log("=== DOCUMENTO (gerarNotaTecnica, dados reais) ===");
console.log(doc);
console.log("=== FIM ===");

// Os 5 campos, à mão
console.log("\ncampo1 produto .......", /Cartão colecionável Família Quildo/.test(doc));
console.log("campo2 destinatario .", /Maria Quildo de Souza/.test(doc) && /Rua das Flores, 42/.test(doc) && /Manaus\/AM/.test(doc));
console.log("campo3 remetente ....", doc.includes(REMETENTE.nome) && doc.includes(REMETENTE.cnpj));
console.log("campo4 n Pedido .....", /Pedido: #4242/.test(doc));
console.log("campo5 data .........", /Data: \d{2}\/\d{2}\/\d{4}/.test(doc));

console.log("\n=== FRONTEIRA DO FUSO (o que o teste do autor pina e o que não) ===");
for (const iso of ["2026-10-14T02:30:00.000Z", "2026-10-14T13:30:00.000Z", "2026-10-14T03:30:00.000Z", "2026-10-14T04:30:00.000Z"]) {
  const manaus = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Manaus", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
  const sp = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
  console.log(`${iso}  Manaus(UTC-4)=${manaus}  SaoPaulo(UTC-3)=${sp}  ${manaus === sp ? "← INDISTINGUÍVEL" : "← distingue"}  | formatarData=${formatarData(iso)}`);
}
console.log("\nCEP:", formatarCep("69027010"), "|", formatarCep("69027-010"), "|", formatarCep(""), "|", formatarCep(null));
const vazio = gerarNotaTecnica();
console.log("doc vazio sem undefined/Invalid Date:", !/undefined|null|NaN|Invalid Date/.test(vazio));
