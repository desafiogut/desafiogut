# UTAC109h.3 — «Comprar Passe Desafio» e «📋 Copiar código» ao PADRÃO amarelo dos outros botões

**Data:** 2026-10-09 · **Executor:** Hermes (DeepSeek) · **Baseline:** `e48acf6` (fecho do 109h.2)

## -1.1 A decisão do operador (verbatim, em duas mensagens)

> «esta perfeito, porem o comprar passe desafio, esta fora do padrao, e o copir codigo tbm»
> «deixe eles no padrao amarelo dos outros botoes»

## -1.2 O que estava fora do padrão (medido, antes da mudança)

| Botão | Preenchimento (antes) | Irmãos no mesmo ecrã |
|---|---|---|
| 💰 Depositar PIX | tingido `rgba(245,166,35,0.14)` + contorno + texto amarelo | — |
| **Comprar Passe Desafio** | **DOURADO SÓLIDO** `COR.gold` + texto navy `ON_GOLD` | ⬅ destoava |
| ⚡ Menor Lance Único | tingido (idem PIX) | — |
| 🎫 Ofertas Programadas | tingido (idem PIX) | — |
| **📋 Copiar código** (`PainelIndicacao`) | **AMARELO SÓLIDO** `#f5a623` + texto `#04080f` | ⬅ destoa |
| 📤 Compartilhar (`PainelIndicacao`) | tingido `rgba(245,166,35,0.12)` + contorno + texto amarelo | — |

Nota de medição: **não existe classe global de botão** no repo (não há `.btn`/`gut-botao` no CSS); o padrão é
inline e o **tingido é o dominante** no app (`rgba(245,166,35,…)` aparece em 8 pontos do `CardLance.jsx`,
19 do `ComprarFichasModal.jsx`, 2 do `CartaoEdicao.jsx`, etc.). Foi esse o padrão aplicado.

## -1.3 O que mudou

| Ficheiro | Mudança |
|---|---|
| `pages/MinhaCarteira.jsx` | O botão do Passe deixou de ser `background: COR.gold` + `color: ON_GOLD` e passou a `rgba(245,166,35,0.14)` + `1px solid rgba(245,166,35,0.4)` + `COR.gold` + `boxShadow: none` — **exactamente** o bloco dos 3 irmãos. O `ON_GOLD` **fica definido** (contrato do UTAC106c) mas já não é usado por nenhum CTA (declarado no próprio comentário). |
| `components/PainelIndicacao.jsx` | O botão «📋 Copiar código» passou de `style={botaoPrimario}` (cheio) a `style={botaoSecundario}` (o MESMO do «📤 Compartilhar»). O objecto `botaoPrimario` ficou **sem uso** e foi **removido** (KISS), com um comentário a registar porquê. |
| `__tests__/utac106c-carteira.test.mjs` | **Contrato pré-existente actualizado** (o antigo `UTAC107b/SEG4` exigia `color: ON_GOLD` neste botão ⇒ ficaria vermelho). Actualizado **preservando a invariante**: o par de cores do rótulo continua a ter de passar o AA — só mudou o par (agora amarelo sobre o botão tingido composto sobre o vidro = `#2d262f`). O histórico da decisão 5 do 107b fica **à vista** no comentário. |
| `__tests__/utac109h2-carteira.test.mjs` | O teste 8 (que fixava o par dourado+navy) foi **reescrito**: agora exige que **nenhum** botão das 2 peças use preenchimento amarelo SÓLIDO, que o Passe esteja no padrão tingido e que «Copiar código» use `botaoSecundario`. |
| `scripts/utac109h2-prova-mutacao.mjs` | `M6` (que mutava o já extinto par `ON_GOLD`) substituído por **«CTA do Passe volta a dourado SÓLIDO»**; acrescentado **`M11` «Copiar código volta a cheio»**. Total **11 mutantes**. |

## -1.4 Contraste WCAG do par novo (recalculado)

| Par | Razão |
|---|---|
| texto `#f5a623` sobre o botão tingido `rgba(245,166,35,.14)` composto sobre o vidro (`#2d262f`) | **7,25:1** ✅ |
| o mesmo par no botão do PIX (idêntico) | 7,25:1 ✅ |
| CONTROL NEGATIVO: branco `#fff` sobre `#f5a623` | 2,03:1 (reprova — é o par que se está a evitar) |

## -1.5 Medições

| Prova | Resultado |
|---|---|
| Suíte canónica (RAM 1 470 MB) | **frontend VERDE 970/970** · **backend VERDE 1095/1101** · `VEREDITO: VERDE` |
| Ficheiros de teste isolados | `utac109h2` 9/9 · `utac106c-carteira` 16/16 · `utac106c-carteira-render` 15/15 |
| Mutação | **11/11 PROVADOS**, baseline `fail=0`, todos com RED estritamente acima (M6 e M11 incluídos) |

## -1.6 Âmbito / limites

- **Âmbito:** os 2 botões assinalados pelo operador + os contratos que os fixavam. Nada mais.
- **Limite declarado:** o `botaoPrimario` da `MinhaCarteira` continua a ser o **objecto-base** com
  `background: "#f5a623"`/`color: "#fff"` — **nenhum** dos 4 botões o renderiza sem sobrepor fundo e cor
  (todos sobrepõem), logo não há preenchimento sólido no ecrã; mantido como está para não alargar o diff
  (o teste 8 verifica que nenhum botão *usa* o par sólido).
- **Limite declarado:** com os dois botões no mesmo padrão, «📋 Copiar código» e «📤 Compartilhar» ficam
  **visualmente idênticos** no painel — é a consequência directa do pedido («no padrão dos outros»).
- Sem medição no browser (prova estática sobre o código + contraste recalculado).
- A leitura de «padrão amarelo dos outros botões» = **tingido** (o padrão dominante no ecrã e no app) — se o
  operador queria o inverso (todos **cheios**), é outro UTAC.
