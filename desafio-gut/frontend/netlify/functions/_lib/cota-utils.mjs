// cota-utils — "esta cota está ATIVA?", numa fonte única.
//
// MC89.40 (F1). Até aqui o sistema tinha duas perguntas colapsadas numa:
//   "é lojista?"      → payload.tipo === "corporativo"   ← gravado NO REGISTO
//   "tem cota paga?"  → não era perguntada a lado nenhum
// O `tipo` é escrito por `cotas.mjs` no momento do cadastro, com `vendida:false`
// e `categoria:null` (MC89.37 §1). Quem preenchia o formulário "Seja Nosso
// Parceiro" ficava com acesso de lojista sem ter pago — e `POST /produtos` nem
// sequer lia a cota.
//
// ⚠️ A INFORMAÇÃO JÁ EXISTIA E JÁ ESTAVA CORRETA. `vendida` e `categoria` são
// escritos por `ativarCotaPaga`, e só depois de o pagamento estar confirmado.
// O defeito nunca foi falta de dados — foi ninguém os ler. Por isso este módulo
// não inventa estado novo: só faz a pergunta que faltava.

import { getCota } from "./cotas-store.mjs";
import { CATEGORIAS } from "./cota-ativacao.mjs";

/** Resposta para "não sei / não tem". Fail-closed, e é o valor por omissão. */
const INATIVA = Object.freeze({ ativa: false, categoria: null, vendida: false });

/**
 * Decide se uma cota JÁ CARREGADA está ativa. Pura — sem I/O, para ser testável
 * e para que o teste não precise de mockar a base de dados só para exercer a regra.
 *
 * ATIVA ⇔ vendida === true  E  categoria ∈ CATEGORIAS
 *
 * Os dois termos são necessários e nenhum é decorativo:
 *  · `=== true` estrito, e não truthy: um `"false"` vindo de uma migração ou de
 *    um upsert administrativo não pode abrir o painel por ser uma string não-vazia.
 *  · `categoria` válida protege contra o registo meio-escrito que o formulário do
 *    ADM consegue produzir — ele define `vendida` mas NÃO tem campo `categoria`
 *    (MC89.37 §4). Sem esta metade, uma cota `vendida:true, categoria:null`
 *    passaria o gate e depois rebentaria na regra de nível.
 *
 * ⚠️ `CATEGORIAS` é importado de `cota-ativacao.mjs`, que é quem ESCREVE a
 * categoria. Uma segunda lista aqui divergiria da primeira mais cedo ou mais
 * tarde — e foi exatamente uma divergência dessas (duas cópias da mesma regra em
 * sítios diferentes) que produziu o defeito do MC89.35.
 */
export function cotaEstaAtiva(cota) {
  if (!cota) return INATIVA;
  const vendida = cota.vendida === true;
  const categoria = typeof cota.categoria === "string" ? cota.categoria.toLowerCase() : null;
  const categoriaValida = !!categoria && CATEGORIAS.has(categoria);
  return {
    ativa: vendida && categoriaValida,
    categoria: categoriaValida ? categoria : null,
    vendida,
  };
}

/**
 * Lê a cota e responde se está ativa.
 *
 * ⚠️ A ARMADILHA DA CHAVE — é o modo de falha mais provável deste MC, e não é
 * "deixar passar quem não devia": é BLOQUEAR QUEM PAGOU.
 * `ativarCotaPaga` grava a cota na chave `String(endereco).toLowerCase()`; o
 * cadastro direto (MC12.3.1) grava em `cnpj:XXXXX`. Se se procurar pela chave
 * errada, o resultado é "sem cota" — indistinguível de "não pagou", e o lojista
 * levaria 403 sem nada no ecrã a explicar porquê.
 * Por isso tenta-se a chave como veio E em minúsculas, antes de desistir.
 *
 * ⚠️ FAIL-CLOSED: um erro de leitura devolve INATIVA. Uma falha de
 * infraestrutura não pode virar autorização — é a diferença entre um erro e uma
 * porta aberta.
 */
export async function validarCotaAtiva(clienteId) {
  if (!clienteId) return INATIVA;
  const id = String(clienteId);
  try {
    let cota = await getCota(id);
    if (!cota && id !== id.toLowerCase()) cota = await getCota(id.toLowerCase());
    return cotaEstaAtiva(cota);
  } catch (err) {
    console.warn("[cota-utils] leitura de cota falhou:", err?.message);
    return INATIVA;
  }
}

/** Mensagem única, para os endpoints não divergirem no texto. */
export const MSG_COTA_INATIVA =
  "A sua cota está inativa. Conclua o pagamento para publicar.";
