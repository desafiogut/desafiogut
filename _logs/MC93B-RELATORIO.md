# MC93-B — Persistência, endpoints e integração do torneio de habilidade

**Projeto:** DesafioGUT · **Data:** 2026-09-23/24 · **Commit base:** `11894bd`
**Modo:** COMPLETO (SEG-1 → SEG5) · **Veredito do SEG-1:** **AJUSTAR** · **R19:** não ativada
**Validação independente:** **REPROVADO** → seis defeitos corrigidos
**Veredito final:** CONCLUÍDO **com ressalva material**

---

## Veredito em cinco linhas

1. **O bónus não podia ser um crédito em Supabase.** `saldo_senhas` nessa base é de `lojistas`, não do participante, e `darLance` só aceita `saldoSenhas` **on-chain**. Ficou como **direito por liquidar**.
2. **A validação independente reprovou-me, e tinha razão.** Três P0 num código com 466 verdes e zero falhas.
3. **O pior:** a integração nunca passava o histórico → o bónus de sequência era **código morto no único caminho de produção**. Eu não dei por ela em segmento nenhum.
4. **477/477 verdes**, 30 mutantes mortos, 2 ficheiros modificados — ambos autorizados.
5. **Não é utilizável hoje:** a migração não foi aplicada e não há handler para liquidar o bónus.

---

## 1. EXECUTOR — o que foi construído

### 1.1 O SEG-1 refutou três premissas, uma delas fatal ao SEG3.2

| Premissa | Realidade verificada |
|---|---|
| "creditar em `saldo_senhas` (Supabase)" | `saldo_senhas` é coluna de **`lojistas`** (0 linhas) — `20260620_schema_definitivo.sql:22-29`. Não existe saldo de senhas de participante em Supabase |
| implícita: uma senha off-chain serve para jogar | `Leilao.sol:88` exige `saldoSenhas[msg.sender] > 0` **on-chain** e `:107` decrementa-o. Uma senha off-chain **não habilita lance nenhum** |
| implícita: dá para somar ao saldo | `saldo-senhas.mjs:2-4` → `saldoEfetivo = saldoOnChain − senhasConsumidas`. O ledger é **subtractivo**; somar-lhe quebra `saldoEfetivo ≤ saldoOnChain` |
| `ciclo_id UUID` | "ciclo = 1 edição", e as edições são `"R-1"`; `lances.edicao_id` é `VARCHAR(66)` → **TEXT** |

Apresentei três opções ao operador, que escolheu **direito por liquidar**: grava-se `senhas_a_creditar` com `liquidado_em = NULL` e enfileira-se `creditar-senhas-bonus` — o caminho que o projeto já usa para creditar senhas depois do PIX. Zero gas, um só livro-razão.

### 1.2 Um conflito que não tinha solução limpa

O operador fixou **desempate por mais acertos**; o motor do MC93-A desempata por endereço e este MC **proíbe alterá-lo**. Não há truque: o comparador de endereço decide primeiro, e pré-ordenar não ajuda.

A ordenação do ciclo passou para o store, com um teste que exige que as duas regras **coincidam quando os acertos são iguais** — o caso em que devem concordar. Quando o MC95 ratificar a regra, leva-se ao motor e o store delega.

---

## 2. VALIDADOR — REPROVADO, e com razão

**10 mutações próprias — as 10 sobreviveram.** Verifiquei cada alegação grave por execução antes de aceitar; todas se confirmaram.

| | Defeito | Como se manifestava |
|---|---|---|
| **P0** | `/feedback` passava o **`Request`** onde `verificarUserSession` quer a **string do token** (`_lib/jwt.mjs:78`, como nos outros 18 chamadores) | `JWSInvalid` → 500 **fora do `jsonResponse`** → sem CORS → "Failed to fetch" no APK. **Avariado a 100%** |
| **P0** | A integração nunca passava `historicos` | `detectarConsecutivos([])` → `bonus: 0` sempre. **O bónus era inalcançável em produção** |
| **P0** | Read-then-write no bónus | Duas consolidações paralelas: livro-razão a dizer 20, fila a mandar creditar **40** |
| P1 | `error` do Supabase ignorado em **todas** as chamadas | Escrita recusada → 200 OK. E tornava **decorativo** o fail-soft da integração |
| P1 | Refechar a rodada apagava os pontos do bónus | 9 → 4, com `bonus_emitido` a true |
| P2 | SQL sem `GRANT … TO service_role`; CHECK a bloquear a liquidação óbvia | 42501 **em silêncio** (por causa do P1 acima); 23514 na liquidação |

**Um achado sobre mim, não sobre o código:** o meu mock de `verificarUserSession` **ignorava o argumento** e devolvia `null` — um contrato que a função real não tem. Um duplo que aceita mais do que o original esconde exactamente o defeito que devia apanhar.

**Refutei uma alegação**, e a culpa era minha: eu disse-lhe no mandato que os ficheiros estavam em CRLF. Estão em LF — `fs.readFileSync` mostrava `\r\n` porque o git faz checkout com `core.autocrlf=true`. Ele apanhou o meu erro e recusou normalizar. Também validou a meu favor que `recalcularPosicoes` com colunas parciais não perde dados, indo ver a fonte do `postgrest-js`.

---

## 3. DOCUMENTADOR — estado, registo e pendências

### 3.1 Números finais (executados, não recordados)

| | |
|---|---|
| Suíte completa | **477/477, zero falhas** (baseline 436 + 41) |
| MC93-B | 23 (store) + 18 (endpoints/integração) |
| Modificados | **2**, ambos autorizados: `consolidar-lances.mjs`, `docs/TORNEIO-HABILIDADE.md` |
| `_lib/pontuacao-utils.mjs` | **intacto** — byte-idêntico a `11894bd`, confirmado pelo Validador |
| Mutação | **31 aplicados e assertados · 30 mortos · 1 equivalente** |

### 3.2 ⛔ Duas pendências bloqueiam o uso

1. **A migração não foi aplicada.** `pontuacoes` e `rankings_ciclo` não existem em produção; o código que as usa falha hoje. Execução é do operador (R12/R5).
2. **Não há handler de fila para `creditar-senhas-bonus`.** O mapa tem `confirmar-credito-senhas`, não este. Uma tarefa enfileirada esgota 5 tentativas e cai na DLQ. Criar o handler é emissão on-chain — precisa de **R2 reativada**.

### 3.3 Consequência assumida da integração

O gancho é fail-soft depois do recibo. Como o `catch` engole, `marcarConsolidado` **corre na mesma**: se a pontuação falhar, a edição fica consolidada **sem pontos** e a 2.ª chamada sai no `estaConsolidado` — o estado parcial é **permanente**. Recuperação manual: `POST /pontuacao` repontua (idempotente, preserva bónus e liquidação). A resposta devolve `pontuacao: null` para a coordenação ver.

*Um comentário meu afirmava que a edição ficava por marcar e a repetição resolvia. Era falso, e eu já o tinha propagado para a spec. Corrigido nos dois sítios.*

### 3.4 Registo operacional (R13)

| Regra | Estado |
|---|---|
| **R1** | ✅ 2 modificados, ambos nomeados na autorização |
| **R2** | ✅ custo zero real: nada emitido on-chain. ⚠️ Reativar antes do handler de liquidação |
| **R3** | ✅ 9 ficheiros em `_logs/` |
| **R4/R5** | ✅ nenhum dado pessoal, nenhuma credencial |
| **R6** | ⚠️ `mutation-test` ausente (o próprio enunciado o reconhece) → mutação à mão |
| **R14** | ✅ CLAUDE.md atualizado antes do commit (504 → 596) |
| **R16** | ✅ 31 mutantes; duas rondas com falsos sobreviventes por falha do instrumento, corrigida |

### 3.5 R15 / R18 / R19

**R15** — exercida duas vezes: a correcção anti-IDOR do `/feedback` (iniciativa própria, durante o SEG3) e os seis defeitos pós-validação. Sempre dentro dos ficheiros autorizados; a correcção estendeu-se à spec e aos comentários que o MC tornou falsos.

**R18** — cinco decisões de 2026-09-23 materializadas, mais uma tomada durante o MC: **bónus como direito por liquidar**, escolhida entre três opções com as consequências de cada uma.

**R19** — não ativada, declarado antes de executar.

### 3.6 O que NÃO foi medido (L-4)

- **Nada correu contra o Supabase real** — a migração está por aplicar; tudo foi exercido num duplo in-memory.
- **Nenhuma rodada real foi pontuada** — o leilão está travado (`EM_BREVE_MODE = true`) e `consolidar-lances.mjs:51` só corre em mainnet.
- **⚠️ As correcções aos seis defeitos não passaram por uma segunda validação independente.** Foram verificadas por execução e cobertas por testes e mutação — mas quem as reviu foi quem as escreveu. Dado o que a primeira validação encontrou num código que eu dava por bom, **isto é uma ressalva material, não formal**.
- O 500 do P0-1 foi provado ao nível da função, não observado em rede.
- Cobertura não medida; suíte de segurança não isolável; env de produção não lida.

---

## 4. A lição

Pela terceira vez neste projeto, a validação independente encontrou o que eu não encontrei — desta vez três P0, incluindo um endpoint avariado para toda a gente e a funcionalidade central do MC reduzida a código morto. E encontrou-o num código com **466 testes verdes e zero falhas**.

O padrão comum aos três casos não é falta de testes. É **testes que partilham a suposição do código**: um mock que aceita o que a função real recusa, um controlo positivo que se tornou equivalente, e asserções que leem um estado que ninguém escreveu pelo fluxo real. Verde mede concordância entre o que escrevi e o que escrevi — não entre o que escrevi e o que é preciso.
