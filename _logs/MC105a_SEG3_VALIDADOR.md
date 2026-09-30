# MC105a — SEG3 · Validador adversarial (2026-09-30)

Subagente independente, worktree próprio, commit `18e9fb9`, instruído a TENTAR REFUTAR. Não escreveu no Supabase.
**Veredito: APROVADO COM RESSALVAS** — 0 bloqueantes.

## Confirmado por execução (pelo validador)
- Suítes 23/23; mutação do executor 21/21 (md5 restaurado).
- A/B: `saldoRs`, `comprar-senhas`, `voucher`, `pedidos`, `conta-delete`, `exportar-dados` e `src/` sem diff.
  Testes de saldo/lance 27/27; `mc104-consentimento` 9/9.
- Em produção (SELECT): `passes` com 0 linhas, RLS, constraints certas. **O `service_role` tem DELETE/TRUNCATE**
  (confirmado, e já declarado no SEG0).
- Concorrência com `Promise.all` sobre o handler e o saldoRs reais:
  - **o saldo nunca ficou negativo** (saldo exacto, saldo só no Blob legado, 10 edições em paralelo);
  - há 1 passe por chave;
  - o dinheiro bate sempre (`saldo_inicial − saldo_final = 200 × passes`).
- `admin-access` compra só para o próprio admin (sem escalada); um endereço de terceiro no corpo é ignorado.
  Os logs vêm mascarados e a resposta só traz o passe do titular.
- Duplo do Supabase comparado com o `@supabase/postgrest-js` 2.108.2: fiel nos caminhos usados (o 23505 real chega
  como `error.code === "23505"`, e o PGRST116, o `data:null` sem select e o `->>` em texto batem).

## Achados e tratamento
| # | achado | tratamento |
|---|---|---|
| ⚠️1 | corrida 23505 + releitura que falha → `lerPasse` lança → o handler não reembolsa: **cobrado 2×, 1 passe, sem alerta** (medido; alcançável, porque o postgrest-js devolve `error{code:""}` em falha de rede) | **corrigido**: a releitura em `criarPasse` está em try (→ `ok:false`) **e** o `criarPasse` no handler está em try/catch → reembolso. Testes E16, A10; mutantes F1, F2 |
| ℹ️2 | uma excepção depois do débito não reembolsa | **corrigido** pelo mesmo try/catch (E17) |
| ⚠️3 | 402 falso em cliques concorrentes na mesma chave (8 de 10 recebiam 402 e acabavam com passe) | **corrigido**: num `saldo_insuficiente`, relê-se o passe; se existe, 200 idempotente (HG13). E18 (10 simultâneos → só 200/201). O 402 numa **outra** edição durante a janela de reembolso é inerente à compensação (R18-1) e fica registado |
| ℹ️4 | `conflito_concorrencia` com saldo suficiente (5 tentativas CAS do `saldoRs.mjs`, que não foi alterado) | registado; o duplo sem latência exagera a contenção |
| ⚠️7 | mutantes N1–N7 sobreviviam (ramos de erro sem teste) | **N1–N6 com testes** (E19–E22, A9) → RED. O N7 (`marcarPalpiteUsado` com >1 linha) é **equivalente**: o `id` é chave primária |
| ℹ️6 | `passes` (endereço = dado pessoal) **não** entra no `exportar-dados` nem no `conta-delete` | **pendente LGPD**: os dois ficheiros estavam proibidos neste MC |
| ℹ️9 | kill switch, 404/409, remoção da pré-verificação, «sem DELETE» não cumprido | já declarados no SEG1/SEG0 |

## Defeito meu apanhado pelo teste novo (E21)
`jsonError(502, "debito_falhou", …, { code: debito.code })`: os extras espalham-se **por cima** do `error.code`, e a
resposta dizia `gravar_saldo_falhou`. Corrigido: o extra passou a chamar-se `motivo`.

## Depois das correcções
Testes 32 (9 + 23) · mutação **30/30** (`scripts/mc105a-prova-mutacao.mjs`; o B3 foi re-apontado porque a linha mudou).
Suíte: frontend **530/530** · backend **874/880** VERDE.
As correcções não passaram por uma 2.ª validação independente: foram verificadas por quem as escreveu e pela mutação.
