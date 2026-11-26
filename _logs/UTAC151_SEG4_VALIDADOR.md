# UTAC151 — SEG4 — Validador adversarial (2026-11-26, Opus 5.5)

Alvo: `5251a5a` (código) + `8abdd5a` (docs). Worktree próprio `tmp-utac151-val/wt`, branch `utac151-val`.
Nada de produção, Supabase, Netlify, deploy ou push foi tocado.

## Veredicto: **APROVADO COM RESSALVAS**

Tentei refutar a entrega em seis frentes. A Relâmpago não regrediu: a omissão «lance» da `TabelaLances` produz o mesmo
HTML, byte a byte, em 1152 combinações. A segurança e a LGPD do nome aguentaram. Não encontrei fuga do valor do palpite.

Encontrei **1 regressão real (⚠️1)** na tabela da OP, que corrigi com teste e mutante. Ficam **ℹ️** só registados,
dois deles com recomendação de código (ℹ️1 e ℹ️2).

---

## ⚠️1 — A tabela da OP perdeu o «Prazo:» da especial e ganhou um selo falso sem edição — **CORRIGIDO**

**Causa.** A `TabelaPalpites` antiga tirava o selo **e** o «Prazo:» de `estadoEdicaoProgramada(edicao)` (UTAC149).
Para a especial, isso dá `timer: null`, de propósito: `lib/palpite.js:68`, «null ⇒ o cartão mostra o `rotuloLongo` e a
tabela mostra «Prazo:»». Sem edição, não desenhava selo nenhum.

A OP nova passa à `TabelaLances` só o `selo`. O «Prazo:» continua a sair de `getEstadoEdicao({ id })`
(`TabelaLances.jsx:82`/`:164` em `5251a5a`), que obedece à trava global `EM_BREVE_MODE`, hoje `true` em produção. Sem
edição, o selo de omissão também sai daí (`:170`).

**Medido** (mesmo arnês, render SSR da OP; o controlo positivo é o código de `85d1cd6` reposto temporariamente e depois
restaurado com md5 igual):

| Caso | `85d1cd6` (antes) | `5251a5a` (entrega) |
|---|---|---|
| ESPECIAL-PALPITE1 aberta, EM BREVE ligado | `📋 Palpites — Edição ESPECIAL-PALPITE1 Prazo: 09/12/2026, 16:22:27 🟢 Aberta` | `📋 Palpites — Edição ESPECIAL-PALPITE1 🟢 Aberta` (**sem prazo**) |
| sem edição, EM BREVE ligado (produção hoje) | `📋 Palpites` | `📋 Palpites 🕒 Em breve` (o cartão ao lado diz «SEM EDIÇÃO») |
| sem edição, EM BREVE desligado | `📋 Palpites` | `📋 Palpites Prazo: — 🟢 Ativo` (**«Ativo» sem edição nenhuma**) |

Em produção, a tabela da ESPECIAL-PALPITE1 deixou de dizer até quando se palpita. Nenhum teste guardava este prazo: o
SEG3 do `utac109g` só cobre uma PROG-N, e por isso a regressão passou.

**Correcção** (`TabelaLances.jsx` + `OfertasProgramadas.jsx`, +14/−1):
- duas props opcionais na `TabelaLances`: `mostrarPrazo` (boolean; substitui `est.timer == null`) e `semSelo`;
- a OP passa `mostrarPrazo={est ? est.timer == null : false}` e `semSelo={!est}`, com `est = estadoEdicaoProgramada`;
- **as omissões são exactamente o comportamento anterior**, e a Relâmpago não passa estas props. A sonda de
  equivalência foi re-corrida depois da correcção: as 1152 combinações continuam iguais.

**Testes novos** em `src/pages/__tests__/utac151-val-op-tabela.test.mjs`:
- **V1:** com a especial e o EM BREVE ligado, a tabela tem «Prazo: dd/mm/aaaa» e «🟢 Aberta».
- **V2:** controlo do MC88.43; uma PROG-N com EM BREVE continua sem prazo.
- **V3:** sem edição, nem prazo nem selo, com a trava ligada e desligada.

**Mutantes** (cópia de segurança fora do repo, md5 restaurado e igual em todos):

| Mutante | Resultado |
|---|---|
| MV1 — a OP sem as duas props (= a entrega original) | **RED** (3) |
| MV2 — a `TabelaLances` ignora `mostrarPrazo` | **RED** (2) |
| MV3 — a `TabelaLances` ignora `semSelo` | **RED** (2) |

Commit: ver «Commits» no fim.

---

## O que aguentou a refutação (com evidência)

### 1. Relâmpago (MLC, especial Relâmpago) — **sem regressão**
- **Sonda de equivalência**, não commitada. A `TabelaLances` de `85d1cd6` foi copiada para `src/components/` e as duas
  foram renderizadas com as mesmas props, na matriz:
  - mobile/desktop;
  - 3 listas: vazia; reveladas com repetidos, nome, e-mail e lixo; blindadas `oculto`/`enderecoCurto` válido e inválido;
  - `idEdicao` `R-1` e `ESPECIAL-X`;
  - `encerrado` indefinido/true/false;
  - 4 `prazoTimestamp`;
  - `ocultosPermanentes`;
  - `selo` presente ou ausente;
  - resultado oficial com 🏆 presente ou ausente.

  Resultado: **1152/1152 combinações com HTML idêntico**, e o `useResultadoOficial` recebeu o mesmo argumento. Também
  depois da correcção do ⚠️1.
- A única divergência é `idEdicao` vazio: o título passa de `📋 Lances — Edição ` para `📋 Lances`. Esse caso é
  inalcançável no MLC, porque `edicaoDoEcra = edicaoEspecial?.id ?? EDICAO_ATIVA` (`MercadoLances.jsx:287`) e
  `EDICAO_ATIVA = "R-1"` → ℹ️5.

### 2. Segurança/LGPD do nome
- **Forja pelo body:** o `nomeExibicao` do body é ignorado. Mutante BM3 (aceitar o body como reserva) → **RED**.
- **Nome completo ou e-mail:** só se grava `formatarNome(...)`; o e-mail dá `null`; a migração tem CHECK de 1..44
  caracteres e sem «@». O máximo que o `formatarNome` produz é 43. BM6 (gravar sem `formatarNome`) → **RED** (3).
- **Token de outra carteira:** o handler verifica contra `t.endereco`, a carteira do user-session. BM4 (verificar
  contra `body.endereco`) → **RED** (2). A recusa de uma carteira diferente na lib real está provada no
  `utac146-nome-origem` P2.
- **A falha da verificação não bloqueia o palpite.** Por desenho, o `.catch(() => null)` cobre isso, mas **nenhum
  teste o guardava**: o BM1 (remover o `.catch`) sobrevivia a todos os 9 ficheiros de teste que chamam o
  `registar-palpite` (medido). Pior, sem o `.catch` o Passe ficava consumido e o pedido rebentava. Fechado com
  `_tests/utac151-val-palpite-nome.test.mjs` **V1**: a verificação lança, o palpite dá 201 sem nome e o Passe passa de
  3 para 2. BM1 → **RED**.
- **Contabilidade do Passe:** **V2** cobre a repetição com token. Dá 200 idempotente, o Passe volta (líquido 1) e o
  palpite e o nome originais ficam. BM2 (não devolver na repetição) → **RED**.
- **Exclusão de conta:** `palpites` é apagada por endereço (`_lib/conta-delete.mjs:43-46`), logo o `nome_exibicao`
  sai com a linha. Não há lacuna LGPD nova.
- **Latência do JWKS** → ℹ️1.

### 3. Privacidade do valor
- O `ler-palpites` não mudou a regra de revelação (`revelado = apurada || status ∉ {aberto, agendado}`). BM5 (mandar o
  `valor` durante a edição) → **RED** (3).
- No ecrã, uma linha revelada com valor não inteiro continua 🔒 (`OfertasProgramadas.jsx:91-93`, teste C3 do
  `utac107e2`). O «Seu palpite: N» só mostra o palpite do próprio titular.
- Ao mudar de edição, o `usePalpitesDaEdicao` volta ao estado vazio antes de reler, por isso o `revelado` de outra
  edição não se arrasta.

### 4. OP
- A tabela fica logo abaixo do cartão. Continua presente sem edição. O selo da especial vem das datas e não do
  `EM_BREVE_MODE` (`utac149-val` OP-E1/E3 verdes).
- O «Seu palpite» fica fora do carrossel → **V4**: aparece uma só vez, a profundidade de `<div>` entre o carrossel e o
  `op-meu-palpite` é ≤ 0, e fica antes da tabela. MV4 (o «Seu palpite» volta para dentro do cartão, mantendo o novo)
  → **RED**.
- Os estados `mais_proximo`/`perdeu` continuam no cartão, com o próprio valor (R18-151-C não os mexe).
- Várias edições no carrossel → ℹ️4.

### 5. Testes do executor
- **N1–N4 e C2b mordem:** os mutantes M1–M4 do executor e os meus BM3–BM6 dão todos RED.
- **As 10 adaptações** acompanham contratos decididos (R18-151-B/C). Não as considerei enfraquecimento ilegítimo,
  com três observações:
  - **(a)** o `utac106f` «PALPITAR…» verifica `iMeu > início do carrossel`. Isso também é verdade com o «Seu palpite»
    DENTRO do cartão, porque o teste não prova «fora do cartão». A V4 prova.
  - **(b)** o `utac106f` «2.º cartão» deixou de verificar o valor e passou a contar a pílula. É consequência directa
    da R18-151-C.
  - **(c)** o `utac110a` A4 passou de comparação de cor a guarda de fonte. A paridade passa a ser por construção, o
    que é legítimo.
- **Lacunas fechadas por mim:**
  - o `usePalpite` enviar o `identityToken` não tinha teste nenhum (só existe um no `CardLance`, `utac146`) →
    **V6/V7**: o token vai no corpo; com `null`, ou com o SDK a lançar, o palpite segue sem o campo. MV6 (não enviar)
    → **RED**; MV7 (tirar o `catch` do `identityTokenPrivy`) → **RED**;
  - o Início não tinha guarda contra o regresso do «Seu palpite: N lances» → **V5**, por fonte. MV5 → **RED**.

### 6. Escopo
`git show 5251a5a --stat` mostra só:
- OP, Início, `TabelaLances`, `usePalpite`;
- backend mínimo: `registar-palpite`, `ler-palpites`, `_lib/passe-pontos.mjs` e a migração (R18-151-A);
- testes e logs.

Não encontrei nada fora do autorizado. A alteração da `TabelaLances`, partilhada com a Relâmpago, está coberta pela
R18-151-B e provada inerte pela sonda de equivalência.

---

## ℹ️ — registados, não corrigidos

1. **O identity token é verificado DEPOIS de o Passe ser consumido** (`registar-palpite.mjs:98` consome; `:116-119`
   verifica). O `createRemoteJWKSet` do jose 5.10.0 tem um timeout por omissão de **5 s**
   (`jose/dist/node/esm/jwks/remote.js:48-49`), e a cache morre com o arranque a frio da função.

   Com o JWKS lento, o pedido fica até 5 s com o Passe já descontado. Se a função for morta pelo timeout da Netlify
   nessa janela, o Passe perde-se e não há palpite (o `devolver()` nunca corre).

   **Recomendação:** verificar a identidade antes do `consumirPasse`, o que não muda o comportamento decidido, e/ou
   passar um `timeoutDuration` de cerca de 2 s. Não corrigi porque a janela é limitada e não a observei.
2. **O `usePalpite` espera pelo `getIdentityToken()` sem limite.** Medido no SDK 3.22.1: faz
   `await updateUserAndIdToken()`, que vai à rede. Se pendurar, o botão fica em «a enviar» e o palpite não sai. É o
   mesmo padrão do `CardLance` (UTAC146).

   **Recomendação:** usar `Promise.race` com cerca de 3 s, porque o token é best-effort.
3. **O `ler-palpites` devolve o endereço INTEIRO junto ao «PrimeiroNome I.»** a qualquer sessão. Isso liga um nome a
   uma carteira mainnet completa. É o mesmo padrão do `lances-flash` da R-1 (`lances-flash.mjs:236-243`), mas
   contrário ao R18-140-C da especial Relâmpago, que só manda `enderecoCurto`. Está declarado pelo executor (DEBT-116 b:
   o AAB v15 lê o campo).
4. **O «Seu palpite: N lances» refere só a 1.ª edição** (`edicaoTabela = programadas[0]`, `OfertasProgramadas.jsx:84`
   e `:246-250`). Com várias edições no carrossel, o valor de um palpite feito na 2.ª deixou de aparecer em texto: só
   fica a pílula «COM PALPITE». Antes ficava dentro do próprio cartão. Hoje a especial é a 1.ª (UTAC149), mas uma PROG-N
   palpitada em paralelo perde o texto.
5. **Na `TabelaLances` com `idEdicao` vazio, o título da omissão «lance» muda** (`📋 Lances — Edição ` → `📋 Lances`).
   É inalcançável no MLC (ver 1.).
6. **Uma linha revelada com valor inteiro acima de 1 000 000 desapareceria da tabela:** a OP marca-a como não oculta e
   a variante «palpite» devolve `null`. É inalcançável, porque o servidor recusa valores acima de 1 000 000.
7. **O cabeçalho do `registar-palpite.mjs`** (l. 6, «Body: { edicaoId, valor }») não menciona o `identityToken`
   opcional.
8. **O nome do Google é controlado pelo titular**, que pode pôr, por exemplo, «Admin S.». É pré-existente
   (UTAC146/142), a mesma regra do lance.

---

## Testes e mutantes corridos

**Ficheiros novos:**
- `desafio-gut/frontend/src/pages/__tests__/utac151-val-op-tabela.test.mjs`: V1–V7, **8/8**;
- `desafio-gut/frontend/src/pages/__tests__/_stubs-151val/privy.js`: duplo do `getIdentityToken`;
- `desafio-gut/frontend/netlify/functions/_tests/utac151-val-palpite-nome.test.mjs`: V1–V2, **2/2**.

**Ficheiros afectados, em sequência:**
- frontend: 18 ficheiros (`utac106f`, `utac107e2`, `utac108e1`, `utac109g`, `utac149-val`, `utac110a`, `utac0009`,
  `utac140-tabela`, `utac107d`, `utac108d`, `mc99`, `utac140-especial-aberta`, `utac141`, `Dashboard`, `utac109e`,
  `utac106h`, `utac110d` e o novo), **282 pass / 0 fail / 7 skip**;
- backend: `utac151-palpite-nome`, `utac151-val` e `utac107e2-ler-palpites`, **todos verdes**.

**Mutantes** (todos restaurados a partir de uma cópia fora do repo, com md5 igual):

| Id | Mutante | Resultado |
|---|---|---|
| MV1 | OP sem `mostrarPrazo`/`semSelo` (= a entrega) | RED 3 |
| MV2 | `TabelaLances` ignora `mostrarPrazo` | RED 2 |
| MV3 | `TabelaLances` ignora `semSelo` | RED 2 |
| MV4 | «Seu palpite» de volta ao cartão da OP | RED 1 (**sobrevivia** aos pré-existentes, medido) |
| MV5 | «Seu palpite» de volta ao Início | RED 1 (**sobrevivia** aos pré-existentes, medido) |
| MV6 | `usePalpite` não envia o `identityToken` | RED 1 (**sobrevivia** aos pré-existentes, medido) |
| MV7 | `identityTokenPrivy` sem `catch` | RED 1 |
| BM1 | sem `.catch` na verificação | RED 1 (**sobrevivia** aos 9 ficheiros pré-existentes) |
| BM2 | a repetição não devolve o Passe | RED |
| BM3 | nome do body aceite | RED |
| BM4 | verifica contra `body.endereco` | RED |
| BM5 | `valor` durante a edição | RED |
| BM6 | nome completo gravado | RED |

**Sonda de equivalência da Relâmpago:** 1152/1152 iguais, antes e depois da correcção. É um ficheiro temporário,
fora do repo.

«Pré-existentes» para MV4–MV6 quer dizer `utac106f`, `Dashboard`, `utac107e2-etiqueta`, `utac109g` e `utac146-feedback-passe`.

## Suíte
- **`npm test`** (harness `mc966`) neste worktree, com a correcção, deu:
  - frontend **VERMELHO 1**: a falha de DNS pré-existente (`mc9952` «nome prefixado» `sslip.io`). Corrida directa:
    **1382/1435** (52 skip). Isto é +8 face ao 1374/1427 do executor, e os +8 são os meus V1–V7;
  - backend **VERDE 1533/1623**.
- **Controlo do backend:** corri a mesma suíte em `8abdd5a`, neste worktree, e deu **1531/1621**. Os +2 são os meus
  V1–V2.

  O 1539/1628 do executor foi medido na árvore principal, que tem ficheiros alheios. A diferença é do ambiente, não
  do código: nenhum teste desapareceu com a minha correcção.

## Commits (branch `utac151-val`)
- `8ec82b2` — fix(UTAC151-val): a correcção do ⚠️1 + os testes novos (frontend V1–V7 e duplo do Privy; backend V1–V2).
- o commit deste relatório (o seguinte).

## Ficheiros tocados
- `desafio-gut/frontend/src/components/TabelaLances.jsx`: props opcionais `mostrarPrazo` e `semSelo`.
- `desafio-gut/frontend/src/pages/OfertasProgramadas.jsx`: passa as duas props.
- `desafio-gut/frontend/src/pages/__tests__/utac151-val-op-tabela.test.mjs`: novo.
- `desafio-gut/frontend/src/pages/__tests__/_stubs-151val/privy.js`: novo.
- `desafio-gut/frontend/netlify/functions/_tests/utac151-val-palpite-nome.test.mjs`: novo.
- `_logs/UTAC151_SEG4_VALIDADOR.md`: este ficheiro.

## Por corrigir
- **ℹ️1 e ℹ️2** são recomendações de robustez (verificar a identidade antes do Passe; timeout no `getIdentityToken`).
- **ℹ️3** é a DEBT-116 b, já declarada.
- **ℹ️4** é uma decisão de produto (que edição o «Seu palpite» refere quando há várias).
- **A correcção do ⚠️1 não está em produção.** Produção tem o `6b088433` com a regressão. Publicar é decisão do
  operador, e o AAB não é afectado porque o v15 tem o layout antigo.
