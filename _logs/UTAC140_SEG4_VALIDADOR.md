# UTAC140 — SEG4 · Validador adversarial independente · Opus 5.5 · 2026-11-19

**Objecto:** commit `10a36ac` (baseline `27724ed`), worktree próprio `C:/Users/Moltbot/tmp-utac140-val/wt` (destacado).
**Não se tocou:** produção (Supabase, Netlify, Blobs), push, deploy, árvore principal. Só corri testes dirigidos.
**Correcção do validador:** commit **`1b589e7`** no worktree (destacado). Patch em `C:/Users/Moltbot/tmp-utac140-val/UTAC140_SEG4_fix-1b589e7.patch`.

## VEREDICTO: **APROVADO COM RESSALVAS**

Não encontrei no diff do UTAC140 nenhum caminho que exponha um valor de lance antes da apuração. A tabela não recebe o valor, o `anon` não tem privilégio de coluna, a RPC devolve null, o Realtime chega vazio (medido pelo executor) e o frontend nunca desenha o valor. Achei **dois defeitos funcionais** (⚠️2 e ⚠️3), corrigidos por mim em `1b589e7`.

O ⚠️1 é **anterior ao UTAC140** e está fora do diff, mas viola directamente a proibição dura «nunca expor valores antes da apuração». Tem de ir ao operador.

---

## ⚠️ Graves

### ⚠️1 — (ANTERIOR ao UTAC140, fora do diff) O compromisso on-chain de cada lance revela o valor por força bruta, em tempo real
- `lance-relampago.mjs:306-310` (ramo mainnet, todas as edições, incluindo ESPECIAL-*):
  `hashLance = keccak256(abi.encode(valorCentavos, endereco))`, **sem sal**. Em seguida, `comprometerLanceOnchain(edicaoId, endereco, hashLance)`.
- `contracts/Leilao.sol:148-153`: o contrato emite `LanceComprometido(idEdicao, lancador, hashLance)`, um evento público com o **endereço inteiro**.
- O espaço de valores é `1..999 999` (`LANCE_MAX_CENTAVOS`). Medi com o próprio ethers do repo (`C:/Users/Moltbot/tmp-utac140-val/bf.mjs`):
  `valor recuperado 4217 em 417 ms`, com JS de uma só thread. O espaço inteiro sai em cerca de 100 s, e muito menos com keccak nativo.
- **Consequência:** qualquer pessoa a ler os eventos do contrato sabe, durante a edição, o valor e o dono de cada lance da ESPECIAL-RELAMPAGO1. A partir daí sabe quem lidera e que valores são únicos. Isto anula o sigilo do UTAC140 e o anti-bot MC28.1 por outro canal. O ranking ao vivo não piora nada: a cadeia já tem mais (o endereço inteiro).
- **Não corrigi.** Muda a semântica do compromisso: com sal, a verificação pública do vencedor depois da apuração exige publicar o sal. É uma decisão de produto e de contrato, e pede UTAC próprio. Pista: sal aleatório por lance, guardado no registo Key-Per-Bid e publicado na apuração (o `consolidarResultado` não verifica o hash on-chain, logo o contrato não muda).

### ⚠️2 — O GUTO anunciava uma especial POR ABRIR como «ABERTA» e convidava a dar lance — **CORRIGIDO em `1b589e7`**
- `especial-config.mjs#escolherEspecialAtual` inclui as edições agendadas («em curso ou por abrir»), e `chatbot.mjs#especialParaGuto` passa-as ao prompt.
- `guto-perfis.mjs#blocoEdicaoEspecial` (versão `10a36ac`) não lia `inicio_em`. Escrevia sempre «EDIÇÃO ESPECIAL ABERTA» e «Estamos na Edição Especial Relâmpago! Dê o seu menor lance…». O lance, porém, dá 409 fora da janela (`verificarJanelaLance`).
- Acontece em dois casos: quando a próxima especial já está gravada e a actual acaba, ou se a abertura do Blob (`utac140-abrir-especial.mjs`) não correr depois do deploy.
- **Correcção:**
  - `blocoEdicaoEspecial(especial, agoraMs = Date.now())`: antes de `inicio_em` gera o bloco «EDIÇÃO ESPECIAL ANUNCIADA», com a hora de abertura em Brasília, a proibição de dizer que está aberta ou de convidar a dar lance, e o SIGILO.
  - `especialParaGuto` passa a devolver `inicio_em`.
- **Endurecimento no mesmo commit:** `fraseBoasVindas` colapsa espaços e quebras de linha do texto vindo do Blob (`guto.boasVindas`). Antes, um `\n` abria linhas novas no system prompt, por exemplo «SIGILO: …». O Blob só é escrito pelo operador, por isso é endurecimento e não falha explorável.
- **Testes:**
  - novo C4 (backend); C3 actualizado com `inicio_em`.
  - Mutantes: bloco agendado desligado → **C4 RED**; colapso de espaços removido → **C4 RED**. md5 restaurado `91deb6e0…`.

### ⚠️3 — Meus Ativos perdia o Top 10 da especial que acabou assim que a seguinte estivesse gravada — **CORRIGIDO em `1b589e7`**
- `MeusAtivos.jsx` (`10a36ac`) usava `escolherEspecial` (`_estilo-especial.js:151-162`), que prefere a especial que **ainda não acabou**.
- Com a ESPECIAL-RELAMPAGO1 encerrada e uma ESPECIAL-RELAMPAGO2 já agendada, a escolha era a RELAMPAGO2. O endpoint respondia `pronto:false` e a tabela de 24 h da RELAMPAGO1 desaparecia dentro da janela prometida.
- **Correcção:** `escolherEspecialTop10` (puro, em `_top10-passe.js`) devolve a **última ENCERRADA** dentro da retenção. Durante a edição não devolve nada, porque ainda não há Top 10.
- **Testes:**
  - teste novo no ficheiro do frontend do UTAC140, incluindo um controlo que mostra que `escolherEspecial` escolhe a seguinte;
  - teste de fonte que obriga `MeusAtivos` a usar a função nova.
  - Mutante (aceitar qualquer estado) → **RED**; md5 restaurado `b359ad64…`.

---

## ℹ️ Notas (sem correcção)

1. **A guarda `especialAindaSecreta` está morta. Não há fuga, mas o teste é vácuo quanto à integração.** `chatbot.mjs:280-283` `extrairEdicaoId` só casa `PROG-\d+|RELAMP-\d+`. Uma ESPECIAL-* nunca chega ao `simular_vencedor` nem ao `pulso_edicao`: o omisso é `R-1`. O C3 testa a função isolada. O GUTO não tem nenhum caminho de dados para os valores da especial: o prompt só leva metadata.
2. **`top10.publico:false` não esconde o valor do vencedor.** `resultado-edicao.mjs`: `comum.vencedor` (= `top10[0]`, com `valorCentavos`) sai sempre. O executor declarou-o («o valor vencedor já é público on-chain depois da consolidação»), mas o K2 não o verifica e o doc da config não o diz.
3. **A configuração dinâmica só está ligada em parte.**
   - O FAQ do GUTO (`guto-perfis.mjs`, «24 horas para quem tem Passe»), a legenda de `Top10EspecialPasse.jsx` («durante 24 h») e a retenção do frontend (`RETENCAO_APOS_FIM_MS` 24 h) estão fixos.
   - Consequência: com `top10.janelaHoras` > 24, o servidor serve e Meus Ativos já não pede. Com `exigePasse:false`, o texto continua a dizer «exclusiva para portadores de Passe».
4. **`get_ranking_especial` tem `order by posicao limit 1000`.** Depois de 1000 lances, os mais recentes nunca aparecem e o contador fica em «1000 lances». Além disso, cada evento Realtime faz cada cliente reler a lista toda (até 1000 linhas), com 400 ms de debounce. É carga a vigiar numa edição popular.
5. **A revelação (`revelar_ranking_especial`) não tem consumidor.** Grava `valor_oculto`, mas nada no código o lê: a RPC só o devolve ao service_role e nenhum backend chama a RPC. Só corre na primeira apuração (`criado: true`), sem repetição. Não há risco: o `anon` recebe `{}` (sonda do executor).
6. **O registo no ranking é fail-soft e não tem reconciliação.** Uma falha do Supabase deixa o lance fora da tabela ao vivo para sempre. Um retry idempotente (hit de `lance-idem`) responde sem `posicaoRanking`, porque o campo não fica guardado no registo de idempotência.
7. **O gate do Passe herda um caminho fail-OPEN** de `_lib/passes-inventario.mjs:34-45`. Se `getSupabase()` lançar, `temRpc()` dá false e `semRpc` devolve 99 Passes. É anterior ao UTAC140 e o comentário do ficheiro diz fail-closed. Pesa pouco, porque com R18-140-G o `?acao=completo` não guarda segredo (o público já tem os valores).
8. **`Top10EspecialPasse` faz um único pedido por `edicaoId`.** Se for montado durante os 65 s de `a_apurar`, fica `null` até ser remontado.
9. **Testes de fonte (regex sobre o código):** B5, B6, K3, K4. Provam a forma e não o comportamento. São aceitáveis como guarda, mas não como prova de runtime do `rankingAoVivo`.
10. **O produto vai para o prompt sem saneamento** («Produto em disputa: ${produto}», sem limite de tamanho). Vem do Blob do operador, por isso o risco é baixo.
11. **Informação estratégica no ranking ao vivo**, aceite pela R18-140-B: o endereço encurtado, o `criado_em` e o **número de lances por carteira** são públicos. Dá para ver quem está a «cobrir» muitos valores, mas não os valores.
12. **Custo:** `especialParaGuto` chama `listarEdicoes` (list + 1 GET por edição no Blob) e `buscarEdicao` em **cada** mensagem do GUTO.
13. **Âmbito:** não encontrei scope creep. O `utac140-abrir-especial.mjs` só muda `status` e `inicio_em` (mais `aberturaAntecipada`) e tem `--reverter`. «leilão» só aparece nas regex dos testes (medido no diff, linhas `+`). Não há id de edição fixo no código de produção. Os regex de JS e de SQL coincidem (`^ESPECIAL-[A-Z0-9]+$`).
14. **Não corri** `scripts/utac140-prova-mutacao.mjs` (RAM e tempo). Corri 3 mutantes meus, todos RED, com md5 restaurado.

## O que aguentou a refutação (medido no código)
- **Tabela e permissões:** `ranking_especial` não tem coluna onde o valor entre durante a edição (`registar_lance_especial` não recebe valor). `grant select (edicao_id, endereco, posicao, criado_em)` para anon. `registar` e `revelar` só para service_role. A RPC devolve `valor_oculto` só com `auth.role()='service_role'`.
- **Idempotência e concorrência:** `pg_advisory_xact_lock` por edição, depois SELECT pelo PK, depois `max+1`, tudo na transacção da RPC. Retries do mesmo `lanceId` devolvem a mesma posição. `unique(edicao_id,posicao)` funciona como rede.
- **`lance-relampago`:** `meta` está em âmbito (l.183). O registo acontece **depois** do Key-Per-Bid e é fail-soft. `posicaoRanking` só vai ao próprio. Endereço encurtado com o formato do CHECK.
- **Apuração e endpoints:** a revelação só ocorre depois de `fim + 65 s` com o resultado gravado. `lances-flash` em mainnet mantém a blindagem (`valor:null`). `?acao=completo` exige o token antes de qualquer leitura, tira o endereço SÓ do token e aplica a janela e o Passe a partir da edição.
- **Frontend:** `linhasDoRanking` remove o valor, por isso o `RankingEspecialOculto` desenha sempre «****».

## Testes corridos (só dirigidos)
| Ficheiro | `10a36ac` | com `1b589e7` |
|---|---|---|
| backend `_tests/utac140-especial-aberta.test.mjs` | 17/17 | **18/18** |
| frontend `edicao-especial/__tests__/utac140-especial-aberta.test.mjs` | — | **12/12** |
| frontend `pages/__tests__/MeusAtivos.test.mjs` + `utac105c-meus-ativos.test.mjs` | — | **52/52** |

## Limpeza
- As junctions do worktree foram removidas com `cmd /c rmdir`.
- O `node_modules` real está intacto: 499 entradas no frontend e 414 em functions.
- **Mantive** o worktree `C:/Users/Moltbot/tmp-utac140-val/wt` (HEAD `1b589e7`) para o commit continuar alcançável para cherry-pick. Removê-lo depois do cherry-pick com `git worktree remove` (já não tem junctions).
