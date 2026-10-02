# UTAC000.17bc — RELATÓRIO: prazo real do servidor + overlay agregado (DEBT-016 + DEBT-017)

**Data:** 2026-10-02 · **Executor:** Hermes Agent · **Base:** `dd3f151` (= `origin/main`)
**Modo:** COMPLETO · ⚠️ **LIMITE DE TEMPO ULTRAPASSADO (GATE 4/HI5): ~5 h contra as 3 h** — ver §7.

## 1. O que estava errado (medido no SEG-1, antes de tocar)

1. **O fim do leilão era um cronómetro LOCAL** (`AppContext` l.193-197: `localStorage` ou
   `agora + DURACAO.flash`) ⇒ o overlay abria **a cada 30 min** (DEBT-016). O servidor **já chegava** ao
   `AppContext` (`useEdicoes` l.184, com `termino_em` server-authoritative + `offsetRelogioMs`) mas
   **não era usado** para decidir o fim.
2. **Ninguém conseguia distinguir uma edição sintética de uma real**: nem o cliente
   (`useEdicoes.sintetizarR1` l.42-57) nem o servidor (`edicoes-core.sintetizarR1` l.117-127, 24 h
   inventadas) marcavam o prazo como inventado ⇒ (GATE 26) não havia como «não tratar o fallback como
   prazo».
3. **A R-1 não podia existir**: `EDICAO_ID_RE` rejeitava `R-1` e `criarEdicao` não aceitava `id` (só
   `RELAMP-N`/`PROG-N`) ⇒ a edição ACTIVA do cliente era sempre sintética (DEBT-017).
4. **O overlay não tinha saída**: `FimEdicaoOverlay` só tinha «⚡ NOVA RODADA» (`onClose` inexistente) e
   nada agregava as participações do titular.

## 2. O que foi implementado (correcção mínima, HI3)

| # | Mudança | Ficheiro(s) |
|---|---|---|
| B | `EDICAO_ID_RE` aceita `R-N`; `criarEdicao({ id })` cria com id explícito (sem tocar no contador nem no caminho antigo) | `_lib/edicoes-core.mjs` |
| B | `sintetizarR1()` do SERVIDOR marca `sintetizada: true` | `_lib/edicoes-core.mjs` |
| C | `sintetizarR1()` do CLIENTE marca `sintetizada: true`; `normalizarMapa` passa o marcador do servidor | `src/hooks/useEdicoes.js` |
| C | O fim decide-se pelo **`termino_em` real do servidor** (+`offsetRelogioMs`); **sintética ou ausente ⇒ não encerra** (GATE 26) | `src/context/AppContext.jsx` |
| D | Overlay agregado (participações do titular, vitória destacada) + `onClose` + «visto» (localStorage) montado no Dashboard e no MercadoLances | `FimEdicaoOverlay.jsx`, `MercadoLances.jsx` (OverlayVencedor), `Dashboard.jsx`, `src/lib/overlayVisto.js` (novo), `src/hooks/useMinhasParticipacoes.js` (novo) |
| — | O overlay não reabre: `jaVisto(address, EDICAO_ATIVA)` no gate; «NOVA RODADA» e «FECHAR» marcam visto | `src/context/AppContext.jsx` |

Nada fora do escopo: `exportar-dados`, contrato on-chain, GUTO, `minhas-participacoes.mjs`,
`package.json`/lock, `vite.config.js`, `_ponte-ssr.mjs`, `_render.mjs` — **intocados** (9 ficheiros
de código alterados, 6 novos: 2 módulos + 2 testes + os logs).

## 3. Verificação (medida)

| instrumento | resultado |
|---|---|
| suíte **frontend** | **681/681 VERDE** (era 670/670; +11) |
| suíte **backend** | **990/996 VERDE** (era 984/996; +6) |
| contrato do `tick` (a função REAL extraída e executada) | **12/12** — inclui: prazo real vencido abre; **sintética NÃO abre**; **sem prazo NÃO abre**; relógio do **servidor** (offset); **já vista não abre** |
| arnês de **runtime** (GATE 23: servidor → AppContext → página) | **7/7** — inclui o caso novo em runtime: edição sintética com prazo vencido **não encerra nem abre** |
| edição real da R-1 (backend) | **6/6** — cria com `termino_em` real; inválidos recusados; `listarEdicoes` prefere a REAL e marca a sintética |
| «visto» (novo módulo) | **8/8** — por endereço E por edição; idempotente; storage corrompido/sem `window` não lança |

Testes de contrato **actualizados porque o contrato MUDOU** (documentado no próprio ficheiro, sem
apagar a regra antiga): `utac00014-show-overlay.test.mjs` (a fonte do prazo passou a ser o servidor) e
`mc941-edicao-especial.test.mjs` (`R-1` saiu da lista de ids rejeitados).

## 4. Erros MEUS declarados nesta ronda
1. `patch` que **fechou o destructuring a meio** no `Dashboard.jsx` (corrigido na hora, antes de correr nada);
2. o duplo de `Date` do meu arnês só tinha `now` e a `tick` passou a usar `Date.parse` (9 RED falsos);
3. pus o helper `edicaoR1Real` dentro de um `describe` e usei-o noutro escopo (`ReferenceError`);
4. **não** acrescentei o `jaVisto` aos duplos quando mudei a `tick` ⇒ 3 testes do contrato ficaram RED e
   só os apanhei porque corri a suíte inteira (as corridas isoladas com `/dev/null` escondiam-nos);
5. o meu detector de «pendura» usou `grep -c` (que devolve 1 quando não há falhas) ⇒ 12 falsos positivos.

## 5. O que **NÃO** ficou feito (declarado, não maquilhado)

- **GATE 6 (mutações): NÃO corridas.** Os testes existem e mordem por construção (os controlos negativos
  já morrem: ex. «sem prazo NÃO abre» falharia se a condição desaparecesse), mas **não houve martelo de
  mutação** (backup fora do repo → mutar → exigir RED → restaurar → md5) nesta ronda.
- **GATE 8 (validador adversarial): NÃO despachado** (o limite de tempo estourou antes).
- **Frente B em produção: NÃO criada a R-1 real** no Blob `edicoes-metadata`. O **código** cria-a
  (`criarEdicao({id:"R-1"})`, provado por teste); a escrita em produção exige decisão do operador sobre a
  **duração** (o `POST /edicoes` é admin-gated e não tenho token de admin; o caminho previsto é a escrita
  directa no Blob via CLI, como a própria DEBT-017 diz).
- **Frente E (verificação em produção): NÃO feita** — depende da R-1 real.
- **17c parcial**: o overlay agregado mostra a lista de participações e destaca a vitória da edição
  terminada; **não** há teste de render da secção nova nas páginas (os testes das páginas continuam a
  passar, mas a secção nova não tem asserção própria).

## 6. Estado do repositório
- Suítes **verdes** (681/681 · 990/996) na árvore de trabalho; **commit LOCAL feito, NÃO empurrado**
  (protocolo da série: o push espera o veredicto adversarial).
- **DEBT-016 / DEBT-017: fechadas NO CÓDIGO, NÃO fechadas no registo** — faltam o martelo de mutação, o
  validador e a R-1 real. O `_logs/DEBT.md` fica com o estado **parcial** declarado (não se marca
  «fechada» o que não teve veredicto).

## 7. Custo e tempo
- **Tempo: ~5 h** (limite 3 h, GATE 4) — **excedido e declarado**. O excedente tem causa medida: o arnês
  de runtime pendurava **6m40s** por causa do fixture antigo (prazo local) e a caça ao travamento +
  adaptação do arnês consumiu a maior parte do excedente.
- **Custo de API (sessão dedicada): ≈ US$ 0,165** — `state.db` 1 316 732→**1 591 620** in · 741 503→**849 199** out (leitura anterior no fecho do UTAC000.17a: US$ 1,0220 → **1,1872**). **Sem subagente** (o validador não chegou a ser despachado).
- **Saldo da API no fecho: US$ 0,80** (era 1,09 no fecho do UTAC000.17a).

## 8. Decisões do operador (R18, 2026-10-02)

| # | Decisão | Efeito |
|---|---|---|
| **a** | **Duração da R-1 = 1800 s (30 min) CONFIRMADA**, mas **a R-1 real NÃO se cria em produção agora**: é a edição activa em `EM_BREVE_MODE` e dar-lhe prazo de 30 min antes de desligar o modo seria contraditório. **A criação passa para o UTAC que desligar o `EM_BREVE_MODE`** (duração já decidida). | DEBT-017: código pronto+testado; **criação de dados TRANSFERIDA** (não é falha deste UTAC). A justificação da Frente B deixa de ser «falta criar» e passa a ser «criar no UTAC certo». |
| **b** | **Despachar o validador adversarial AGORA** sobre `1f446db`, corrigir o que ele apanhar e só então fechar DEBT-016/017. **Protocolo: veredicto primeiro, push depois.** | O commit fica LOCAL até ao veredicto; as correcções que ele exigir entram antes do push. |

**Nota do executor sobre (a):** a restrição elimina o único item da Frente B que eu tinha declarado em
falta por razões de autorização; o que resta da Frente B é uma **tarefa de dados agendada** para outro
UTAC, com parâmetros já fixados (id `R-1`, 1800 s, via `criarEdicao({id:'R-1'})` — código já testado em
`_tests/utac0017bc-edicao-r1.test.mjs`).
