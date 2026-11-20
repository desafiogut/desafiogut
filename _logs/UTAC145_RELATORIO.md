# UTAC145 — RELATÓRIO: IDEMPOTÊNCIA DO PASSE, PRIMEIRO LANCE REAL, PUSH

- **Executor:** Claude Code (Opus 5.5) · **Data:** 2026-11-20
- **Commits:** `eb2e946` (contagem no Postgres), `8f221a9` (correcção do ensaio + migração + semente), mais o `ce5b366` do UTAC144, que
  foi no mesmo push.
- **Push:** `4fef228..8f221a9` (AUTORIZO do operador). **Produção:** deploy `6afff4cb33249cbb50d99cfe` (commit `8f221a9`), `ready`.
- **Decisões:**
  - R18-145-A: a migração é aplicada pelo executor depois de «aplica».
  - R18-145-B: Supabase só em leitura; o lance real pode esperar.
  - A regra «1 a cada 3» (R18-142.1-A) não mudou.

## Frente A — dupla contagem (ℹ️3 do SEG4 do UTAC142)
- **Antes:** `_tests/utac145-passe-idempotencia.test.mjs` I1, contra o código do Blob → **FALHA**: «o Passe saiu no(s) lance(s) [2] —
  o 1.º lance foi contado duas vezes» (`_logs/UTAC145_SEG2_TESTE-ANTES.txt`).
- **Depois:** **8/8** (I1–I8). O ficheiro I1–I3 passou com o código novo (`_logs/UTAC145_SEG2_TESTE-DEPOIS.txt`).
- **Onde vive a contagem agora:**
  - tabela Postgres `public.especial_lances_passe`: `lance_id` **PRIMARY KEY**, `UNIQUE (edicao_id, endereco, posicao)`, RLS, só
    `service_role`;
  - RPC `registar_lance_passe`: advisory lock por carteira; repetir o mesmo lance devolve o gravado; o `passes_consumir` corre
    **na mesma transacção**;
  - o Blob `especial-lances-passe` deixou de ser escrito.
- **Ensaio em Postgres** (DO + RAISE, desfeito; `_logs/UTAC145_ENSAIO-POSTGRES.txt`). **Apanhou um defeito** que os testes JS não
  viam: o `SELECT … INTO` sem linha punha `v_cons` a NULL. Corrigido e vigiado (I5). Na 2.ª tentativa: Passe no 3.º; 3.º repetido
  → `novo:false`, sem 2.º consumo; sem Passe no 6.º o lance passa.
- **Migração `utac145_lances_passe` aplicada a 2026-11-20.** Verificado: tabela + RLS; função com 4 argumentos; anon sem acesso
  (HTTP SELECT **401**, RPC **42501**); 2 chaves.
- **Semente da transição:** 2 linhas com os ids reais dos lances da conta `0x5baf…32b8`, iguais ao Blob relido antes
  (`lances:2, passesConsumidos:0`). Depois do deploy: Blob inalterado, tabela 2, inventário 1 ⇒ consistente.
- **Suíte dirigida (RAM 1670 MB):**
  - `utac145` 8/8
  - `utac142-especial-passe` 10/10 (arnês adaptado ao duplo da RPC)
  - `utac120-inventario` 8/8
  - `utac142-lider-especial` 14/14
  - `utac129-lance-sem-passe` 6/6
  - `utac140-especial-aberta` 20/20
- **Mutação:** 8/8 RED (2.ª ronda; Q1/Q3/Q8 sobreviviam e ganharam os testes I6/I7/I8).
- **Fora da lista do enunciado (declarado):** `scheduled-lider-especial.mjs` (o «portador» lia o Blob, agora lê a tabela; continua
  indeterminado em falha) e `docs/EDICAO-ESPECIAL-CONFIG.md` (a frase «onde vive» falava do Blob).

## Frente B — primeiro lance real (só leitura)
- **2 lances reais** da conta `0x5baf…32b8`, às 06:07 e às 06:08 UTC.
- `ranking_especial` posições 7 e 8, `nome_exibicao` = **«Novo P.»** (reduzido), `valor_oculto` NULL.
- Débitos só de pontos: −12 e −13 (mais a missão +10). Nenhum Passe exigido.
- Contagem: 2 lances, 0 Passes gastos. Correcto: no 1.º e no 2.º lance não se gasta Passe. Sem linhas duplicadas.
- **O consumo no 3.º lance ainda não foi observado em produção** (não houve 3.º lance). Fica **pendente**.

## Desvios do enunciado (declarados)
- **«Tudo com [skip netlify]» / «sem build novo»:** impossível, porque o UTAC145 muda o backend. O `8f221a9` foi sem skip, de
  propósito, para publicar a correcção (explicado e autorizado no AUTORIZO).
- **Passo 8 (amend do `ce5b366`):** não feito. Já não era o HEAD, e o `rebase -i` não é suportado neste ambiente. A mensagem já tinha
  «[skip netlify]» e foi enviada tal como estava.
- **Passo 6** previa a migração aplicada pelo humano: foi o executor, por decisão do operador (R18-145-A).

## Checklist (11 itens)
1) Teste de dupla contagem escrito e reproduzido: **sim** (I1 vermelho com o Blob)
2) Correcção da Frente A implementada (DB, não Blob): **sim**
3) Suíte dirigida da Frente A verde: **sim**
4) Migração da Frente A aplicada: **sim** (ensaiada antes; defeito do NULL corrigido)
5) Primeiro lance real observado: **sim** (2 lances; o consumo no 3.º está **pendente**)
6) `nome_exibicao` gravado no lance real: **sim** («Novo P.»)
7) Passe contado correctamente (sem duplicado): **sim** nos 2 lances observados; o 3.º lance (consumo) está **pendente**
8) `ce5b366` resolvido: **sim** (enviado no push; sem amend, ver desvios)
9) Push final autorizado e executado: **sim** (`4fef228..8f221a9`)
10) Netlify sem build novo desnecessário: **sim**. Houve **um** build e era necessário: publicou o backend novo (`6afff4cb`).
    Não houve builds extra.
11) Relatório escrito e copiado para o Desktop: **sim**

## Próximo passo sugerido
Observar o 3.º lance da conta `0x5baf…32b8` (ou de qualquer conta) na especial. Deve ficar `passe_consumido=true` na tabela e o
inventário deve descer 1 (só leitura). Depois, as 4 ressalvas que faltam do SEG4 do UTAC142: nome não verificado no servidor, o
app não mostra o consumo do Passe, CLS não medido, mutantes sem teste.
