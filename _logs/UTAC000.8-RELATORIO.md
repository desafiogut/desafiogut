# UTAC000.8 — Relatório: histórico de lances completo (DEBT-007)

**Data:** 2026-10-01 · **Executor:** Hermes Agent · **Base real medida:** `c64a5bb` = `origin/main`
(o commit é **docs**; o **código** é o de `93c286d`)
**Objectivo:** fechar DEBT-007 (🏆 «Menor e Único» honesto)
**VEREDICTO DESTA SESSÃO: PARADO e ESCALADO (GATE 11).** Zero código de produção alterado.

> **Sessões.** Este relatório tem duas partes. A **1.ª sessão** (§1-§7, abaixo, preservada tal como
> estava) parou no fim do SEG-1 por orçamento. A **2.ª sessão** (§8) reconfirmou o baseline, mediu a
> **produção** e **refutou** parte do diagnóstico da 1.ª — que fica **à vista, marcada REFUTADA**
> (nunca apagada).

---

## 1. Porque parou (1.ª sessão)
A **investigação está feita e a abordagem decidida** (é o que o SEG0 pedia). O que falta é a
**implementação, que é cross-stack** — endpoint de backend + efeito de carga inicial no `AppContext` +
testes + validador adversarial. Isso **não cabe no orçamento desta sessão**, e uma correcção de
produção deixada a meio (frontend + backend alterados sem verificação) é pior do que não a começar.
Accionados o **HI5 / GATE 4** e o **GATE 13**.

## 2. ⚠️ O defeito, com precisão (medido) — **REFUTADA quanto a PRODUÇÃO (ver §8.2)**
> O texto abaixo está correcto **como leitura do código no modo legado (Sepolia/localhost)** e está
> **errado como descrição da produção**. Preservado à vista (P2/GATE 14).

Em `src/context/AppContext.jsx`:
- **`lancesFlash`** (modalidade *flash*) — **já vem completo** do blob, por polling no mount
  (`lances-flash?edicaoId=…`, l. 768-770). **Sem defeito.**
- **`lances`** (modalidade *on-chain*) — só tem eventos `LanceDado` **em tempo real** (l. 780-781) e os
  lances do **próprio** utilizador (l. 1297-1303). **Falta a carga inicial do histórico da edição.**
  ← **É aqui que está a DEBT-007.**

Logo, no on-chain, o 🏆 «Menor e Único» (`MeusAtivos.jsx`), o cartão «Menor Lance» e o `vencedor` do
Dashboard significam **«o menor único que este browser viu desde que abriu»**. Pré-existente
(confirmado pelo validador do UTAC105c).

## 3. A abordagem decidida (1.ª sessão) — ⚠️ **REFUTADA em §8.2**
| peça | onde | estado |
|---|---|---|
| `getLanceDadoEvents(ini, fim)` + `getBlocoAtual()` | `netlify/functions/_lib/contract.mjs` | **já existe** |
| paginação da varredura de `LanceDado` | `netlify/functions/monitor-onchain.mjs` (l. 138) | **já existe (modelo a copiar)** |
| leitura de TODOS os lances com paginação | `consolidar-lances.mjs` | **já existe** |
| carga inicial no mount (padrão) | `AppContext.jsx` l. 768-770 (`lancesFlash`) | **já existe (modelo a copiar)** |

## 4. Desvios spec↔realidade (1.ª sessão, declarados)
| # | spec dizia | medido |
|---|---|---|
| 1 | base `f0f02a6` | **`93c286d`** (UTAC105c fechado noutra sessão) |
| 2 | DEBT-007 severidade **ALTA** | **`média`** em `_logs/DEBT.md` — não a alterei (decisão do operador) |
| 3 | suíte frontend 535 | **547** (UTAC105c acrescentou 12) |

## 5. Não feito pela 1.ª sessão
Frentes B, C, D, E **não executadas**; validador adversarial **não despachado** (não havia correcção
nova para refutar); **DEBT-007 mantida aberta**.

## 6. Evidência e registo (1.ª sessão)
`_logs/UTAC000.8_SEG-1_MEDICAO.md` — medição, investigação e abordagem decidida.

## 7. Custo (1.ª sessão)
Ver `sessions` do `state.db`.

---

# 8. 2.ª SESSÃO — verificação, medição da produção e PARAGEM (GATE 11)

## 8.1 Baseline reconfirmado
| item | medido |
|---|---|
| `git rev-parse HEAD` | **`c64a5bb`** = `origin/main` |
| suíte frontend | **VERDE 547/547** (0 fail · 0 skipped) |
| suíte backend | **VERDE 967/973** (0 fail · 6 skipped) |
| árvore | limpa excepto `desafio-gut/frontend/package-lock.json` (pré-existente) |
| evidência bruta | `_logs/UTAC000.8_SEG-1_EVIDENCIA.txt` |

## 8.2 O que a PRODUÇÃO diz (e que derruba o diagnóstico da 1.ª sessão)
Produção: `https://silly-stardust-ca71bc.netlify.app`. Leitura pública, sem autenticação.

1. **A produção corre em `mainnet`** — `/lances-flash?edicaoId=R-1` devolve
   `{"edicaoId":"R-1","ocultoAteConsolidar":true,"lances":[]}`: esse campo só existe no ramo
   `NETWORK_STAGE === "mainnet"` do `lances-flash.mjs`. Logo o Blob **não** é alimentado em produção
   (em mainnet tudo vai para o **Key-Per-Bid**: `lance-relampago.mjs` l. 247-270).
2. **Resultado: em produção as DUAS listas estão vazias.** `lancesFlash` (o Blob vazio) e `lances`
   (em mainnet **não há eventos `LanceDado`** — o caminho `darLance`, que emite o valor, só corre fora
   de mainnet; em mainnet vai só o **hash** via `comprometerLance` → `LanceComprometido`).
   O utilizador vê uma lista vazia e o 🏆 em «—».
   ⇒ **A frase «o `lancesFlash` não tem o defeito» está REFUTADA quanto ao que a produção faz.**
3. **O vencedor oficial é apurado fora da cadeia**, a partir do mesmo Key-Per-Bid
   (`apurarMenorUnico(await getLances(edicaoId))`, `_lib/consolidacao.mjs` l. 82-83). É a única fonte
   com valores — e é **blindada de propósito durante o leilão** (valor `null`; unicidade dá **403**;
   MC28.1 R9 / G-2, anti-bot).
4. **A Frente A do spec não serve a produção:** os valores não estão na cadeia, não existe «bloco de
   arranque da edição» em lado nenhum do repo (0 resultados no `grep`) e o `monitor-onchain` documenta
   um limite de **10 blocos por `getLogs`** — varrer uma edição de ~24 h é inviável.
5. **Edição activa medida:** `R-1`, `tipo: relampago`, `status: aberto`, `termino_em` ≈ agora + 24 h.

## 8.3 Veredicto: PARAR e ESCALAR (GATE 11 + R15)
Não implementei nada. Fazer o 🏆 «honesto **durante o leilão**» exige revelar valores blindados:
isso é **decisão de produto** (o spec diz explicitamente «NÃO AUTORIZA tomar decisões de produto») e
quebraria o **MC28.1 R9 / G-2**. As opções medidas (com custos) estão em
`_logs/UTAC000.8_SEG0_ESCALADA-OPCOES.md`:
- **Opção 1 (recomendada, ~2,5-3 h):** endpoint que serve o **histórico de participações ofuscado**
  (sem valores) + o **resultado oficial** pós-consolidação; carga inicial no `AppContext`; 🏆 lê o
  resultado oficial. Muda o visível (a lista deixa de estar vazia).
- **Opção 2 (~1 h):** só o **resultado oficial** pós-consolidação no 🏆/«Menor Lance»; durante o
  leilão fica «—» como hoje.
- **Opção 3:** revelar valores durante o leilão — **não recomendada** (quebra o anti-bot; fora do
  autorizado).
- **Opção 4:** não implementar; manter DEBT-007 aberta com o diagnóstico corrigido.

## 8.4 Escopo respeitado
**Zero código de produção tocado.** Alterados apenas: `_logs/UTAC000.8_SEG-1_MEDICAO.md`,
`_logs/UTAC000.8_SEG0_ESCALADA-OPCOES.md`, `_logs/UTAC000.8_SEG-1_EVIDENCIA.txt`,
`_logs/UTAC000.8-RELATORIO.md`, `_logs/DEBT.md`, `CLAUDE.md` e este ficheiro no Desktop.
Contrato, GUTO, Passe, Concurso, `_render.mjs`, `_ponte-ssr.mjs`, `vite.config.js` e a modalidade
flash: **intocados**. DEBT-002/003/005/006: **não tocadas**.

## 8.5 Erros dos meus próprios instrumentos (declarados)
1. **I1** — a 1.ª execução do harness só guardou o resumo; o TAP completo não ficou arquivado (a
   evidência tem os resumos TAP das duas suítes, não o TAP inteiro).
2. **I2** — a flag **frontend** (`VITE_NETWORK_STAGE`) **não foi medida** (o chunk do `CardLance` não
   está no bundle de entrada). Não altera a conclusão sobre a modalidade relâmpago (medida vazia),
   mas fica **declarada como não medida**.
3. **I3** — `curl -o /dev/null` em MSYS devolve `bytes=0` mesmo em sucesso: **não usado**.
4. **I4** — cache de CDN descartada com base no campo `agora` (timestamp de geração) do `/edicoes`;
   o `Cache-Control` da resposta da função **não** foi medido (declarado).
5. **I5** — o `_logs/UTAC000.8_SEG-1_MEDICAO.md` da 1.ª sessão continha **duas conclusões que a
   produção refuta** (§-1.3 e a «opção escolhida» de §-1.4). Corrigidas por **marcação REFUTADA**, com
   o texto original **à vista** (§-1.3, §-1.4 da medição).
6. **I6** — a ferramenta `patch` **partiu uma linha alheia do `CLAUDE.md`** que continha um `\r`
   literal (A11, confirmada **fora** dos `.jsx`): o `\r` virou fim-de-linha. Detectado pelo `git diff`
   (2 hunks em vez de 1), **reparado ao byte** e reconfirmado (`git diff --stat CLAUDE.md` =
   `2 insertions(+)`, 0 remoções). Nada ficou por corrigir.

## 8.6 DEBT-007
**Mantida ABERTA** (GATE 15 — parcial), agora com **diagnóstico corrigido** e opções medidas em
`_logs/DEBT.md`.

## 8.7 Custo da API
Ver §9.

## 9. Custo (2.ª sessão)
Lido de `state.db` (`sessions`, id `20261001_184741_207919`, fonte `cli`, início 2026-10-01 21:48 UTC):
**input 105 722** · **output 56 115** · **cache-read 6 781 312** · **≈ US$ 0,0495** (`cost_status =
estimated`). Sessão dedicada a este UTAC.

## 10. Fecho (2.ª sessão — escalada)
O operador **não respondeu dentro do prazo** à pergunta de escalada (opções 1-4). Decisão do executor,
pelo protocolo (GATE 11; «NÃO AUTORIZA tomar decisões de produto»; commit só «após autorização»):
**nada implementado, nada commitado.** DEBT-007 **aberta**; UTAC fecha **PARADO/ESCALADO**.

> ⚠️ **Este §10 foi SUPERADO no mesmo dia:** o operador respondeu a seguir (ver §11).

---

# 11. DECISÃO DO OPERADOR (R18-1) E IMPLEMENTAÇÃO — commit `eec94b8`

## 11.1 A decisão (R18-1, 2026-10-01)
**OPÇÃO 2 — mínimo:** *«durante a edição, o 🏆 não aparece (honesto); corrigir só com o resultado
oficial pós-consolidação»*. Razões dadas pelo operador: resolve o problema real (o 🏆 deixa de mentir),
é honesto, a Opção 1 não resolve o principal (o endpoint ofuscado não traz valores) e respeita o
Ponytail. Autorizações: **commit + push em foreground: SIM**; **validador adversarial: SIM
(obrigatório)**; **fechar a DEBT-007: SIM (se resolvido)**. **Limite de tempo: 1 h.**

## 11.2 O que foi implementado (2 ficheiros + testes; nenhum toca contratos/regras)
| ficheiro | o que faz |
|---|---|
| `src/hooks/useResultadoOficial.js` **(novo)** | Lê o **resultado oficial** da edição: `resultados(edicaoId)` on-chain — o mapping escrito por `consolidarResultado`, que é quem decide o vencedor. **Reutiliza** `lerResultadoOnchain` de `components/edicao-especial/useResultadoEspecial.js` (já em produção, provider read-only, sem sessão) ⇒ **zero I/O novo**. Devolve **`null`** — nunca um objecto «vazio» — quando o resultado não é **utilizável**: edição **por consolidar**, **endereço nulo** (`resultados()` devolve-o quando não houve lance único), **valor ilegível**. **Fail-soft** (leitura falhada ⇒ a página não muda). |
| `src/pages/MeusAtivos.jsx` | O 🏆 e o cartão «Menor Lance» usam o resultado oficial **quando existe**. `ehLinhaVencedora()` assinala a linha pelo **endereço + valor** do vencedor oficial; se essa linha não estiver na lista visível, **nenhuma** linha é assinalada (não se assinala ninguém por aproximação). **Sem** resultado oficial mantém-se o apuramento local: **exactamente o comportamento anterior** — é o que garante zero regressões (GATE 19). |

## 11.3 Provas
- **Testes novos (24, em duas rondas):**
  1. `src/pages/__tests__/utac0008-resultado-oficial.test.mjs` (**16**) — a PÁGINA, com duplo do hook
     em `_stubs/` (regista a **edição pedida** — a lição do `hooks.js`: um duplo que ignora o argumento
     dá verde a uma página mal ligada).
  2. `src/hooks/__tests__/utac0008-resultado-oficial-hook.test.mjs` (**8**) — o **efeito real** do hook,
     com o condutor do projeto (`_hook-runner.mjs`): leitura ao montar, **paragem** ao consolidar,
     releitura enquanto o leilão corre, **limpeza** no desmonte (sem escritas tardias), **fail-soft** na
     leitura que falha, edição vazia e mudança de edição. *Lacuna declarada e fechada antes do validador:*
     os testes da página injectam o resultado por um duplo, logo o corpo do efeito não era exercitado.
- **Bidirecionalidade:** os mesmos cenários, com e sem resultado oficial — *com* → nenhum 🏆 para o
  próprio e cartão com o valor oficial; *sem* → comportamento antigo (🏆 e valor locais). É a prova de
  que a correcção morde, não o contrário.
- **Mutação (6 mutantes, todos mordem; todos restaurados com md5 idêntico ao pré-mutação):**
  **M1** «a página ignora o resultado oficial» (= repor a DEBT-007) → **8 RED**;
  **M2** «aceitar edição não consolidada» → **1 RED**;
  **M3** «nunca parar de reler depois de consolidar» → **1 RED**;
  **M4** «sem limpeza do intervalo» → **1 RED**;
  **M5** «servir o resultado de OUTRA edição» → **3 RED** (ressalva R1 do validador);
  **M6** «sem normalizar a caixa do vencedor» → **2 RED** (ressalva R2 do validador).
- **Validador adversarial (SEG3):** despachado sobre o commit `eec94b8` em worktree próprio →
  **APROVA (com ressalvas)**. Veredicto integral + resposta do executor:
  `_logs/UTAC000.8_SEG-3_VALIDADOR.md`. **R1** (servia o vencedor da edição anterior), **R2**
  (assimetria de caixa EIP-55), os **3 testes vácuos** que ele apontou e a **fragilidade que
  pendurava a suíte** (assert antes de `desmontar()` → `setInterval` vivo → `exit=124`) foram todos
  **fechados medidamente** na 3.ª ronda (§9 da evidência).
- **Suíte:** frontend **547/547 → 579/579 VERDE** (+20 página, +12 hook); backend **967/973 VERDE**
  (0 regressões).
- **Evidência bruta:** `_logs/UTAC000.8_SEG-2_ANTES-DEPOIS.txt` (md5s, diff do commit, saídas TAP,
  os 6 mutantes).

## 11.4 Desvios declarados (o operador deve ver isto)
1. **Escope:** o ESCOPO do R18-1 listava *endpoint de backend* e *carga inicial no `AppContext`*.
   **Não foram feitos** — mediu-se que são **desnecessários**: o leitor do resultado oficial **já existe**
   e **já corre em produção** (`useResultadoEspecial` → `resultados()`). Fez-se a solução mínima, que é o
   que o próprio operador invocou («respeita o Ponytail»). Se quiser o endpoint/AppContext à mesma, são
   ~30 min — mas seria código a mais para o mesmo efeito.
2. **Resíduo:** o `vencedor` do **Dashboard** (`AppContext.jsx` l. 698) **continua** a ser «o menor único
   que este browser viu». O R18-1 autorizou corrigir **só** o 🏆/«Menor Lance». Registado como
   **DEBT-008** (aberta, fora do escopo) — não se apaga nem se esconde.
3. **Limite de tempo — REGRA ALTERADA PELO OPERADOR (R18-2, 2026-10-01):** o pedido era **1 h**;
   medido, o UTAC somou 3 rondas (2.ª medição + escalada + implementação + ressalvas do validador) e
   **passou o limite**. No fim da sessão o operador **estendeu o padrão de 1 h para 2 h** para os
   UTACs seguintes (registo em `CLAUDE.md` e na memória do executor). O excesso desta sessão fica
   declarado (GATE 18), não escondido.
4. **`git add`:** ficheiros individuais, **nunca** `git add -A`. O `package-lock.json` modificado é
   **pré-existente** e ficou **de fora** do commit.

## 11.5 Estado final
- Commit **`eec94b8`** (código + testes). Documentação (este relatório, `DEBT.md`, `CLAUDE.md`,
  evidências) no commit seguinte, **antes do push** (R14).
- **DEBT-007 FECHADA**; **DEBT-008 aberta** (resíduo declarado).
- Validador adversarial despachado sobre `eec94b8` em worktree próprio → veredicto em
  `_logs/UTAC000.8_SEG-3_VALIDADOR.md`.


