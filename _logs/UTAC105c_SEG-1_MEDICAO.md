# UTAC105c — SEG-1 · Medição (2026-10-01)

Nada alterado neste segmento. Spec: `_logs/UTAC105c.spec.yml`.

## Decisões do operador (R18, durante o SEG-1)
- **R18-A** — «Não cria nada novo, adapta ao que já existe no app.» Revoga, do enunciado original: as páginas
  `/ofertas-relampago` e `/ofertas-programadas` e os componentes `MeusCupons.jsx`, `MeusLances.jsx` e `MeusPalpites.jsx`.
- **Amendment** — sincronizar com `f0f02a6` (UTAC000.6/000.7); padrão de teste `_ponte-ssr.mjs` + `_render.mjs`
  (não se alteram); **apresentar o plano e aguardar aprovação antes de tocar no código**.

## -1.1 Estado do repo
| | medido | declarado |
|---|---|---|
| HEAD | `f0f02a6` | enunciado `135d190` · amendment `f0f02a6` |
| `origin/main..HEAD` | vazio | — |
| `HEAD..origin/main` | vazio (a árvore partilhada já tinha sido actualizada) | «repo atrasado» |
| modificados alheios | `frontend/package-lock.json` (padrão do `netlify deploy --build`) | — |

⚠️ **Árvore partilhada com escrita concorrente.** À 1.ª leitura, `src/components/meus-ativos/__tests__/_render.mjs`
tinha um **mutante de validador por restaurar** (`// MUTANTE-VALIDADOR (desliga a ponte): await servidor.ssrLoadModule(...)`).
Minutos depois, `git diff` estava vazio: outra sessão restaurou-o. **Não toquei no ficheiro.** Consequência de método:
o baseline mediu-se num **worktree limpo** e não na árvore partilhada.

## -1.2 Saúde da infraestrutura (HI1)
| medição | resultado |
|---|---|
| worktree limpo `f0f02a6` (+ junctions A9) | frontend **VERDE 535/535** · backend **VERDE 959/966** |
| árvore partilhada (já sem mutante) | frontend **VERDE 535/535** · backend **VERDE 967/973** |
| disco `C:` | **12 G livres** (95%) — acima do limite de 5 G |
| worktree de medição | junctions removidas com `rmdir`; `node_modules` real intacto (505 entradas); `git worktree remove` OK |

⚠️ **Desvio do backend não explicado:** 959/966 no worktree limpo contra 967/973 na árvore partilhada (8 testes a menos;
0 falhas nos dois). Os `_tests/` são os mesmos (`diff` vazio) e não há ficheiros ignorados relevantes. Fica **declarado,
não investigado**: está fora do escopo (só frontend) e não afecta o veredicto. Candidato a DEBT.

## -1.3 Inventário (o que o comprador já tem)
| Rota | Tela | O que já faz |
|---|---|---|
| `/mercado` | `MercadoLances.jsx` | `ModeSelector` ⚡ Relâmpago / 🎫 Programado + `CardLance` (**dar lance já existe**: Relâmpago → `lance-relampago`, debita saldo R$ ≥ 0,01) + `TabelaLances` + `LanceStatusBadge` |
| `/vitrine`, `/vitrine/:slot` | `Vitrine.jsx` | 4 slots com a modalidade (Diamante/Ouro → Programado 24 h; Prata/Bronze → Relâmpago), estado e cronómetro |
| `/edicao/:id` | `EdicaoDetalhe.jsx` | detalhe da edição + «ir para o mercado» (⚠️ **rota órfã**: sem link de entrada — MC99.1) |
| `/ativos` | `MeusAtivos.jsx` | stats, 5 secções do torneio, `MeusPedidos`, lista dos lances com filtros Todos/Únicos/Repetidos |
| (em `/ativos`) | `MeusPedidos.jsx` | morada, estado, rastreio + `TimelineRastreio`, NF-e, «Recebi» |
| `/carteira` | `MinhaCarteira.jsx` | saldo R$, PIX, atalho «Lance Relâmpago» |

## -1.4 O que falta (medido)
| Item do enunciado | Existe? | Nota |
|---|---|---|
| Ver Ofertas Relâmpago / Programadas | **sim** | `/mercado` + `/vitrine` |
| Dar lances | **sim** | `CardLance` |
| Acompanhar lances (único/repetido/vencedor) | **sim, com defeito** | ver ⛔ abaixo |
| Acompanhar pedidos | **sim** | `MeusPedidos` (MC102/102.1a/102.1b) |
| Passe Desafio (UI) | não | fora do escopo (UTAC106) |
| Cupons do comprador | não | ⛔ **não há endpoint**: `listarPassesDoComprador` existe em `_lib/passe.mjs` mas **nenhum handler o expõe**; `cupons.mjs` é do **lojista** (prova de posse). Ler cupons exige backend ⇒ só placeholder |
| Palpites | não | **nenhum backend** (UTAC108) ⇒ só placeholder |
| Catálogo | 0 produtos | não se inventam produtos (GATE 17) |

### ⛔ Defeito encontrado — o 🏆 «Menor e Único» pode ser falso
`MeusAtivos.jsx:274` e `:349`: `isVencedor = !lance.repetido && i === 0 && filtro !== "repetidos"`.
Com sessão, a lista é `meusLances` — **só os lances da pessoa, sem ordenar** (`:63-65`, `:69`). O 🏆 vai para o **1.º lance
da pessoa pela ordem de chegada**, não para o menor único **da edição**. O ecrã diz «🏆 Menor e Único» a quem **não está
a ganhar** sempre que outro participante tiver um lance único mais baixo (ou quando o lance mais baixo da pessoa não é o
1.º da lista). O próprio ficheiro já calcula o valor certo: `menorUnico` (`:77`, sobre todos os lances, ordenados).
É a classe do MC94: **um facto inventado sobre a pessoa.**

## Conflitos e ambiguidades (AU3 — perguntas ao operador)
1. **Frente A — o que mostrar sobre o Passe.** Em produção, a Programada **ainda funciona com senhas** (`CardLance:416`:
   «Lance programado consome 1 senha (Art. 20: R$ 2,00)»). Um texto «Passe Desafio» na mesma tela contradiz o que o botão
   faz, e o Passe depende de DEC-01/02 (pendentes). Opções: (a) **não mexer na Frente A** (recomendado: o pedido já está
   coberto); (b) uma linha declarada «Passe Desafio — em breve» só nos slots Programados da Vitrine.
2. **Frente C — prazo de arrependimento no ecrã.** O MC102 (R18) decidiu que o prazo fica **só na API**. Nada mais falta
   no `MeusPedidos`. Opções: (a) **não mexer** (recomendado); (b) mostrar o prazo (revoga a decisão do MC102).
3. **Frentes D/E** — placeholders **dentro** do `MeusAtivos.jsx` (JSX inline, sem ficheiro novo), com o texto a declarar
   que ainda não existem. Não afirmam nada sobre a pessoa (não precisam dos 4 estados). Confirmar.

## -1.7 Veredicto: **AJUSTAR**
A infraestrutura está verde e o escopo cabe no R18-A, mas as frentes A e C dependem das respostas 1 e 2. Paro aqui e
apresento o plano ao operador (amendment: «aguardar a aprovação antes de tocar no código»).
