// MC89.41 (S0) — marca UMA cota como paga, para validar o caminho positivo.
//
// ⚠️ ISTO NÃO É UMA MIGRAÇÃO. É uma operação pontual, de UMA linha, na conta do
// próprio operador, para que exista no sistema uma cota ativa contra a qual
// validar os gates do MC89.40. Não há aqui nenhuma tentativa de "regularizar"
// as outras 6 cotas — o MC89.39 provou que são todas registos de teste.
//
// ── PORQUE É QUE O SQL DO ENUNCIADO NÃO CHEGAVA ─────────────────────────────
// O enunciado propunha:
//     UPDATE cotas SET vendida = true, categoria = 'bronze', endereco = '0x…'
// Isso NÃO FUNCIONA, e falharia em silêncio. `getCota` (_lib/cotas-store.mjs:40)
// devolve `data.payload` — o jsonb — e NÃO as colunas:
//     .select("payload") … return data?.payload ?? null;
// As colunas `vendida`/`categoria`/`endereco` são DERIVADAS, escritas por
// `upsertCota` a partir do registo, e servem para indexar e consultar. Quem lê a
// aplicação é o payload.
// ⇒ Um UPDATE só nas colunas deixaria a cota "paga" para o SQL e "por pagar"
//   para a app — e o sintoma seria o gate a bloquear um lojista marcado como
//   pago, que é precisamente o modo de falha que o MC89.37 isolou como o mais
//   provável de todo este trabalho.
// Por isso escreve-se nos DOIS sítios, de uma vez, e mantêm-se coerentes.
//
// ── PORQUE É QUE NÃO ESCREVI EM `cotas_pagas` ───────────────────────────────
// O enunciado pedia "inserir registo em cotas_pagas para idempotência".
// NÃO O FIZ, de propósito. Essa tabela é o registo de PAGAMENTOS REAIS: é
// escrita por `ativarCotaPaga` com o `pedidoId` do Mercado Pago, e serve de
// prova de que um pagamento ocorreu. Inserir ali uma linha sintética seria pôr
// um pagamento que nunca existiu dentro do rasto de auditoria financeira.
// A proveniência fica registada no próprio payload (`origemAtivacao`), onde é
// visível e não se confunde com dinheiro que entrou.
//
// EXECUÇÃO: o write foi aplicado via MCP Supabase (sessão já autenticada), não
// por este ficheiro — o agente não manuseia credenciais (R5). Este script existe
// para RASTREABILIDADE (R3): é o SQL exato que foi aplicado, e pode ser corrido
// pelo operador com as suas próprias credenciais se for preciso repetir.

const CLIENTE_ID = "0x6ac980dc94b2f4841e1bc5a703a989447637674d";
const CATEGORIA  = "bronze";

export const SQL_APLICADO = `
UPDATE cotas
   SET payload = payload || jsonb_build_object(
         'vendida',      true,
         'categoria',    '${CATEGORIA}',
         'endereco',     '${CLIENTE_ID}',
         'ativadaEm',    to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
         'atualizadoEm', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
         'origemAtivacao', 'manual-mc89.41'
       ),
       vendida       = true,
       categoria     = '${CATEGORIA}',
       endereco      = '${CLIENTE_ID}',
       atualizado_em = now()
 WHERE cliente_id = '${CLIENTE_ID}';
`;

// Reverter (se for preciso): repor o estado anterior — não pago, sem categoria.
export const SQL_REVERSAO = `
UPDATE cotas
   SET payload = (payload - 'ativadaEm' - 'origemAtivacao')
                 || jsonb_build_object('vendida', false, 'categoria', null, 'endereco', null),
       vendida = false, categoria = NULL, endereco = NULL, atualizado_em = now()
 WHERE cliente_id = '${CLIENTE_ID}';
`;

console.log("MC89.41 — SQL aplicado à cota", CLIENTE_ID.slice(0, 6) + "…" + CLIENTE_ID.slice(-4));
console.log(SQL_APLICADO);
