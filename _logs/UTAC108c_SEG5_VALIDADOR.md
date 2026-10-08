# UTAC108c — Veredicto do validador adversarial

**Veredicto: APROVADO COM RESSALVAS**

O código cumpre (a)–(l) e as decisões R18-A/R18-B. Não consegui refutar o comportamento. As ressalvas são lacunas nos testes: 7 dos meus 15 mutantes sobrevivem. Há ainda uma nota de produto sobre o modo «Programado». Nenhum destes pontos bloqueia o UTAC.

Base: worktree `C:/Users/Moltbot/tmp-108c-val/wt` no commit dcb4f43 (detached), comparado com 3e4febe.

## Tabela (a)–(l)

| # | Resultado | Evidência |
|---|---|---|
| (a) o botão MLC ainda tem `disabled` | **NÃO** ✅ | `git diff 3e4febe dcb4f43 \| grep '^-'` mostra que saiu `disabled={!saldoReais}` e também o `cursor`/`opacity`/`title` condicionais. Ver `MinhaCarteira.jsx:246-262`. Teste `utac108c-carteira-mlc` (4 estados: 0/ok, null/loading, null/error, 1234/ok): `!b.props.disabled`. |
| (b) o botão MLC não navega com saldo 0 | **Navega** ✅ | `onClick={irParaMenorLanceUnico}` → `navigate("/mercado")` (`MinhaCarteira.jsx:101-103`). O teste exige `__NAVEGADAS == ["/mercado"]` com saldo 0. O mutante V12 (onClick só com saldo) foi morto. |
| (c) a mensagem «Sem saldo» não aparece no MLC | **Aparece** ✅ | `MercadoLances.jsx:350`: `mostrarAvisoSemSaldo(...) && <SemSaldoBanner />` dentro de `<main>`, antes da section do CardLance. O teste da página real verifica o texto 1× e o botão «Carregar PIX →». |
| (d) a mensagem bloqueia | **Não bloqueia** ✅ | O aviso é um irmão no grid. O CardLance, a tabela e o cabeçalho são renderizados sem condição. O teste confirma `card-lance` e `tabela-fim` presentes, com o aviso antes do lance. O mutante M7 (esconder o CardLance) foi morto. |
| (e) «Carregar PIX» não navega para `/carteira` | **Navega** ✅ (com ressalva no teste) | `SemSaldoBanner.jsx:35` `navigate("/carteira")`. A rota `/carteira` → `MinhaCarteira` está em `App.jsx:466`. O teste chama o `onClick` → `["/carteira"]`. ℹ️ O teste não vê `disabled` nem `pointerEvents`: os mutantes V10 e V13 sobrevivem. |
| (f) outros botões com o mesmo padrão continuam bloqueados | **Só 1, deliberado (R18-B)** ✅ | `grep -rnE "disabled=\{[^}]*([sS]aldo\|semSaldo\|saldoReais\|senhas)" src` devolve apenas `CorporativoCarteira.jsx:214` («Ir dar lances», `disabled={!saldoOnChain}`), que fica para o UTAC108f. O `:211` (converter troco) é uma acção. Os outros 3 botões da grelha da Carteira têm teste que prova que não estão desactivados. |
| (g) botão de acção perdeu `disabled` por engano | **Não** ✅ | A única linha `disabled` removida no diff é a do MLC da Carteira. `CardLance.jsx` não mudou (`git diff --quiet` OK). Com saldo 0 o lance continua bloqueado: `desabilitado = … \|\| !valor \|\| … \|\| semSaldoRsFlash` (`CardLance.jsx:102-104, 324-325, 551`). |
| (h) botão de segurança/permissão alterado | **Não** ✅ | O diff toca só os 6 ficheiros. Admin, AuthArea, Termos, AdminLayout e ComandoButton ficaram intactos. |
| (i) outro ecrã quebrou | **Não** ✅ | Suíte canónica VERDE. `Dashboard.jsx`, `OfertasProgramadas.jsx`, `App.jsx` e `context/` não mudaram (`git diff --quiet` OK). |
| (j) backend alterado | **Não** ✅ | `git diff --name-only` mostra só 4 ficheiros em `desafio-gut/frontend/src/**` e 1 em `scripts/`. Nada em `netlify/functions`, `contracts`, etc. |
| (k) `.bak-*` tocado | **Não** ✅ | Os 5 rastreados (`git ls-files \| grep '\.bak-'`) dão `git diff --quiet 3e4febe dcb4f43` = OK e worktree = OK. |
| (l) suíte canónica vermelha | **VERDE** ✅ | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` em foreground: `frontend: VERDE 867/867`, `backend: VERDE 1095/1101`, `VEREDITO: VERDE`. |

Outras verificações:
- `EM_BREVE_MODE = true` (`src/lib/leilaoLock.js:10`). `leilaoLock.js` não mudou.
- Nenhum `package.json` nem `package-lock.json` (8 ficheiros rastreados) aparece no diff.
- `git diff --stat 3e4febe dcb4f43` dá 6 ficheiros, exactamente os declarados, com +396/−4.

## Números medidos

- Os 2 testes novos (`node --test` dos dois ficheiros): **18/18 pass**, 0 fail.
- Suíte canónica: **frontend 867/867, backend 1095/1101**. A contagem na base 3e4febe não foi medida.
- `node scripts/utac108c-prova-mutacao.mjs < /dev/null`: **7/7 PROVADOS (RED)**, exit 0, restauro md5 idêntico. O script resolve `RAIZ` a partir da sua própria localização. Antes e depois, os md5 dos 3 ficheiros no repo principal são iguais (`MAIN_INTACTO`). Os md5 do worktree são os mesmos de antes e de depois (Carteira 7e861bbd…, MLC 45b74549…, Banner e1e836be…), e `git status` está limpo.

## Os meus mutantes (script em `C:/Users/Moltbot/tmp-108c-val/mut/val-mutantes.mjs`, restauro md5 confirmado em todos)

| Mutante | Resultado |
|---|---|
| V1 aviso também com status `loading` | MORTO (fail=2) |
| V2 aviso sem login (sem a verificação de `isConnected`) | MORTO (2) |
| V3 botão MLC da Carteira com `display:"none"` | **SOBREVIVEU** |
| V4 botão MLC da Carteira com `pointerEvents:"none"` | **SOBREVIVEU** |
| V5 botão MLC da Carteira com `hidden={!saldoReais}` | **SOBREVIVEU** |
| V6 aviso depois do CardLance | MORTO (1) |
| V7 aviso fora do `<main>` (antes dele) | **SOBREVIVEU** |
| V8 texto alterado | MORTO (3) |
| V9 `stale` deixa de contar | MORTO (1) |
| V10 «Carregar PIX» com `disabled` | **SOBREVIVEU** |
| V11 aviso (GlassCard) com `display:"none"` | **SOBREVIVEU** |
| V12 Carteira: onClick só com saldo | MORTO (3) |
| V13 «Carregar PIX» com `pointerEvents:"none"` | **SOBREVIVEU** |
| V14 coerção `<= 0` | MORTO (2) |
| V15 MLC fixa `saldoRsStatus:"ok"` | MORTO (1) |

Resumo: 8 mortos e 7 sobreviventes. Nenhum sobrevivente está activo no código entregue. São lacunas que permitiriam uma regressão futura.

## Achados

### ℹ️ N1: os testes não vêem que o botão está bloqueado por meios que não sejam `disabled`/`opacity`/`cursor` (V3, V4, V5, V10, V11, V13)

O próprio cabeçalho de `utac108c-carteira-mlc.test.mjs` avisa que chamar `onClick` directamente passa mesmo com o botão desactivado. A lição foi aplicada à Carteira mas não ao «Carregar PIX →» do banner: o teste de navegação chama `botao.props.onClick()` sem olhar para `disabled` (V10).

Tratamento proposto:
- No teste do banner, verificar `!botao.props.disabled` e que `style.pointerEvents !== "none"`.
- Nos testes da Carteira e do banner, verificar que `style.display !== "none"`, `!props.hidden` e `style.pointerEvents !== "none"`.

O custo é baixo e não exige mudar código.

### ℹ️ N2: o aviso fora do `<main>` não é detectado (V7)

O teste exige apenas «dentro de vidro» e «antes do CardLance». Fora do `<main>` o aviso perde o padding e o gap do grid. É um problema visual, não funcional.

Tratamento opcional: verificar que o índice do aviso fica depois da abertura `<main`.

### ℹ️ N3: o aviso ignora a modalidade

O `GlassHeader` do MLC continua a mostrar o `ModeSelector` com «🎫 Programado» (`GlassHeader.jsx:62`, `ModeSelector.jsx:8`). No modo programado o CardLance usa **senhas** (`isProgramado` → `semFichas`), não R$. Um utilizador comum com R$ 0,00 e senhas > 0 no modo Programado vê «Sem saldo. Carregar agora?» e mesmo assim consegue dar lance. A mensagem engana, mas não bloqueia.

O gate antigo da Carteira também olhava só para R$, por isso não houve regressão.

Tratamento: é uma decisão do operador (R18). Uma opção é `modalidade !== "programado"` na condição. A outra é considerar `saldoSenhas`.

### ℹ️ N4: «stale» vindo do cache de arranque

O `saldoRsStatus` nasce `stale` a partir de `gut_saldo_cache` (`AppContext.jsx:339-341`) e mantém-se `stale` durante o refetch (`:1013`). Se o último saldo em cache era 0 e o utilizador depositou noutro dispositivo, o aviso aparece durante segundos até a leitura voltar `ok`. Isto está coberto explicitamente por R18-A (stale conta) e é aceitável.

Sem acção.

### ℹ️ N5: R18-B mantém o mesmo defeito de UX para o lojista

`CorporativoCarteira.jsx:214` continua com `disabled={!saldoOnChain}`: o lojista com 0 senhas clica e nada acontece. Isto foi deliberado e está adiado para o UTAC108f. Não encontrei defeito na decisão: o aviso R$ seria errado para o lojista, e o `tipoProvavel === "corporativo"` cobre também `/corporativo/mercado`, que monta o mesmo `MercadoLances` (`App.jsx:526`).

Acção: garantir que o UTAC108f trata este botão.

Nenhum achado ⚠️ grave.
