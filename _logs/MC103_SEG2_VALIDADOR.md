# MC103 — SEG2 · VALIDADOR ADVERSARIAL

Subagente independente, worktree próprio, commit validado `96a6654` (pai `fd68c8a`). Instrução: TENTAR REFUTAR.
**Veredicto: APROVADO COM RESSALVAS — 0 bloqueantes.**

| Foco | Resultado | Evidência (medida pelo validador) |
|---|---|---|
| F1 flags não mudam comportamento | CONFIRMADO | 2 consumidores de `resolverRecursos` (endpoint + `chatbot.mjs:1427`, só `.isLeilaoAtivo`); `useRecursosApp.js` copia campo a campo; nenhum `deepEqual` existente; suíte pai 788/794 vs commit 797/803, 0 falhas; resposta 72→211 B, `no-store` |
| F2 A/B | CONFIRMADO | 252 casos (21 configs adversariais × 12 plataformas, incl. `Object.create(null)`, `__proto__`, `Map`, plataforma `"constructor"`): 0 diferenças nas chaves antigas, 0 excepções novas. Nuance: getter que lança — inatingível (config vem de `JSON.parse`) |
| F3 testes/mutantes | PARCIAL | 10 mutantes próprios: 3 mortos, 7 sobreviventes (3 reais, 4 equivalentes) |
| F4 só leitura | PARCIAL | Texto das queries não estava nos logs → não auditável |
| F5 números | CONFIRMADO | RPC cego reproduzido (USDC 100 blocos: flashbots 0, mevblocker 8736). **Por logs completos desde o deploy (~25491209): 12 logs, todos `SenhasCreditadas`, 1 conta, 12 senhas = saldo actual** → fecha o L-4 |
| F6 dados pessoais | CONFIRMADO limpo | 0 endereços de 40 hex; `@` só em «@ bloco» |
| F7 escopo | CONFIRMADO | só os 2 ficheiros autorizados |
| F8 R20 / escalares | CONFIRMADO razoável | declarado (D5), reversível, sem feature nova |

## Ressalvas e o que foi feito (R15 — corrigir o que a medição provou)
| # | Ressalva | Acção |
|---|---|---|
| 1 | R$ 34,25 consumidos, só R$ 24,00 explicados pelas 12 senhas → **R$ 10,25 sem destino** | Registado no SEG1 e no relatório. **Investigação = MC111** (não é leitura agregada, exige livro-razão) |
| 2 | Espelho do frontend (`useRecursosApp.js`) não vê as flags novas pelo caminho Supabase directo | Já declarado; **obrigatório no MC111** (ficheiro não autorizado aqui) |
| 3 | Flag nova gravada como mapa `{ios,android,pwa}` cai no default em silêncio | **Teste novo** que fixa o comportamento (mutante «lê mapa» → RED). Log/aviso = comportamento novo → candidato MC111 |
| 4 | `cfg[chave]` lê pela cadeia de protótipos (regra MC93-D: flags lêem-se com `Object.hasOwn`) | **Corrigido nas 5 flags novas** + teste com `Object.prototype` poluído. As 2 antigas têm a mesma exposição e **não foram tocadas** (HARD GATE 4) → candidato a MC futuro |
| 5 | `limitePassesIndicacao` aceita `2**60`/`1e300` | **`Number.isSafeInteger`** + teste. Tecto de negócio (ex.: ≤ 100) = decisão de produto, não inventado |
| 6a | Cabeçalho de `recursos-app.mjs` documenta só 3 chaves | Não alterado (autorização «só se necessário»); registado |
| 6b | Queries SQL não registadas | **Texto integral acrescentado ao SEG1** |

Pós-correcção: 12 testes · mutação **18/18 RED** (15 + 3 do validador), restauro byte-idêntico · A/B **0/30** ·
suíte **508/508 · 800/806** (0 falhas).
