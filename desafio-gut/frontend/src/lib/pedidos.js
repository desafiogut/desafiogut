// Lógica pura dos pedidos de entrega (MC-ECOMMERCE-01a) — sem React, testável com node:test.
//
// A validação AUTORITATIVA é a do servidor (`netlify/functions/_lib/pedidos.mjs`). Esta só
// evita uma ida ao servidor com um formulário obviamente incompleto e dá a mensagem certa.

export const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export const ENDERECO_VAZIO = {
  nome: "", cpf: "", cep: "", logradouro: "", numero: "", complemento: "",
  bairro: "", cidade: "", uf: "", telefone: "",
};

const digitos = (v) => String(v ?? "").replace(/\D/g, "");

/** "69027010" → "69027-010" (aceita parcial, para a máscara do campo). */
export function formatarCep(v) {
  const d = digitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Primeira mensagem de erro do formulário, ou null se pode seguir para o servidor. */
export function erroDoEndereco(f) {
  if (String(f.nome ?? "").trim().length < 3) return "Informe o nome de quem vai receber.";
  if (digitos(f.cpf).length !== 11) return "O CPF tem 11 dígitos.";
  if (digitos(f.cep).length !== 8) return "O CEP tem 8 dígitos.";
  if (!String(f.logradouro ?? "").trim()) return "Informe a rua ou avenida.";
  if (!String(f.numero ?? "").trim()) return "Informe o número (use S/N se não houver).";
  if (!String(f.bairro ?? "").trim()) return "Informe o bairro.";
  if (!String(f.cidade ?? "").trim()) return "Informe a cidade.";
  if (!UFS.includes(String(f.uf ?? "").toUpperCase())) return "Escolha o estado (UF).";
  const tel = digitos(f.telefone);
  if (tel && (tel.length < 10 || tel.length > 11)) return "Telefone com DDD: 10 ou 11 dígitos.";
  return null;
}

/**
 * Em que passo está o pedido, do ponto de vista do comprador.
 * sem_endereco → aguarda_envio → enviado
 */
export function estadoDoPedido(p) {
  if (!p?.morada) return "sem_endereco";
  if (!p.rastreio) return "aguarda_envio";
  return "enviado";
}

export const ROTULO_ESTADO = {
  sem_endereco:  "Falta o endereço de entrega",
  aguarda_envio: "Endereço recebido — aguardando envio",
  enviado:       "Enviado",
};

/** Texto do prazo de entrega de um produto/pedido; null se não informado. */
export function textoPrazo(dias) {
  if (!Number.isInteger(dias) || dias < 1) return null;
  return dias === 1 ? "Entrega em até 1 dia após o envio" : `Entrega em até ${dias} dias após o envio`;
}

/** Uma linha legível do endereço (para o resumo e para o operador). */
export function resumoEndereco(m) {
  if (!m) return "";
  const comp = m.complemento ? `, ${m.complemento}` : "";
  return `${m.logradouro}, ${m.numero}${comp} — ${m.bairro}, ${m.cidade}/${m.uf} — CEP ${formatarCep(m.cep)}`;
}
