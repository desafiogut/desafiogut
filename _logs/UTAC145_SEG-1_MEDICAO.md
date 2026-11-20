# UTAC145 · SEG-1 — MEDIÇÃO

Executor: Claude Code (Opus 5.5) · 2026-11-20 · HEAD `ce5b366` (local), origin/main `4fef228`, produção `6affdd88` (`b6365e7`).

## Decisões do operador (R18-145)
- **R18-145-A** a migração é aplicada pelo executor (MCP do Supabase), depois de o operador dizer «aplica», e verificada com SELECT antes do deploy.
- **R18-145-B** Frente B: leitura do Supabase/Blob autorizada; o lance real pode esperar (sem pedir lance).
- `ce5b366` está **local** (fui eu que o criei e não foi enviado).

## Passo 1 — auditoria
- O inventário de Passes está no **Supabase**: RPC atómica `passes_consumir(p_endereco, p_tipo, p_qtd)`, `UPDATE … where passes_relampago >= p_qtd`.
- A contagem «1 a cada N» está no **Blob** `especial-lances-passe`: `_lib/passe-a-cada-lances.mjs`, CAS `getWithMetadata` + `set(onlyIfMatch|onlyIfNew)`.
- A idempotência do lance existe (`idempotencyKey` → ref dos pontos → 409 no retry). Mas a contagem não tem chave por lance: um
  `set` que grava e responde 503 → retry interno da lib → 412 → o CAS volta a somar (sonda S1c do validador).
- Não há teste de dupla contagem por 503.
- Nota sobre o enunciado: o Blobs tem escrita condicional (ETag), mas não tem transação nem chave de idempotência por operação. Daí o defeito.

## Frente B — o 1.º lance real (só leitura, 2026-11-20)
- `ranking_especial`, depois da migração das 04:20:21Z: **2 linhas** (posições 7 e 8, 06:07:26Z e 06:08:38Z), conta `0x5baf…32b8`.
  `nome_exibicao` = **«Novo P.»** nas duas (forma reduzida); `valor_oculto` NULL.
- `pontos.historico_lance` depois das 05:00Z: `lance −12` (06:07:13Z) · `missao +10` · `lance −13` (06:07:53Z). Só pontos: nenhum Passe exigido.
- Blob `especial-lances-passe` `ESPECIAL-RELAMPAGO1:0x5baf…32b8` = `{"lances":2,"passesConsumidos":0}`. É a única chave.
  `passes_inventario.passes_relampago` = **1**. O 1.º e o 2.º lance não gastam Passe (só o 3.º): **correcto, sem duplicados**.
- ⇒ A regra está activa em produção para os 2 primeiros lances. O consumo do 3.º ainda não foi observado (pendente).

## Consequência para a Frente A
Ao mudar a contagem para o Postgres, o contador do Blob (2 lances deste endereço) tem de ser semeado na tabela nova. Senão, o
próximo lance contaria como 1.º. A semente é relida do Blob no momento de aplicar, e o deploy vem logo a seguir.

## Veredicto
SEGUIR (R18-145-A/B).

## Passo 6 — migração (R18-145-A: «aplica», 2026-11-20)
1. **Ensaio em Postgres de produção** com DO + RAISE (tudo desfeito), em `_logs/UTAC145_ENSAIO-POSTGRES.txt`. **Apanhou um defeito:** o
   `SELECT … INTO` sem linha punha `v_cons` a NULL (viola NOT NULL). Corrigido (`v_cons := false;`), com guarda no teste I5. A 2.ª
   tentativa deu ENSAIO_OK: Passe no 3.º; o 3.º repetido devolve o gravado sem gastar outro; sem Passe no 6.º o lance passa.
   Sem rasto (tabela/função/inventário de ensaio = NULL/0/0).
2. **Aplicada** a `utac145_lances_passe` (apply_migration, success). Verificado: tabela + RLS; `registar_lance_passe(p_lance_id,
   p_edicao_id, p_endereco, p_a_cada)`; só service_role executa; anon não lê nem executa (HTTP: SELECT 401, RPC 42501); 2 chaves (PK + UNIQUE).
3. **Semente da transição**: o Blob foi relido imediatamente antes = `{"lances":2,"passesConsumidos":0}` (única chave). Inseridas 2
   linhas com os ids REAIS dos lances (`ranking_especial.id`): `6e578aed…` posição 1 e `39d2bb9f…` posição 2, `passe_consumido=false`.
   Inventário da conta = 1 Passe (inalterado). Depois do deploy volta-se a comparar o Blob, porque pode entrar um lance no intervalo.
- A produção continua a correr o código do Blob até ao deploy; a tabela nova fica sem uso até lá (sem efeito nos lances).
