# UTAC108h.1 — DIAGNÓSTICO: a prateleira de Programadas no Início

**Tipo:** DIAGNÓSTICO (read-only). **Não corrige, não altera código, não faz deploy (R1).**
**Owner:** Opus 5.5 · **Executado por:** Hermes · **Data:** 2026-10-08 · **HI5:** 30 min
**Baseline:** `53d0d06` (= `origin/main`) — o esperado no enunciado.

---

## VEREDICTO (R8)

> **CAUSA RAIZ IDENTIFICADA — e NÃO é um bug: a divisão em duas prateleiras nunca foi
> implementada, por decisão do próprio operador.**
>
> O `Dashboard.jsx` tem **uma única** prateleira, «🗓️ Outras Edições» (`Dashboard.jsx:485`),
> alimentada por um filtro que **não olha ao `tipo`** (`Dashboard.jsx:151-153`). O mockup
> aprovado (variante A) mostra **duas** prateleiras («⚡ Relâmpago» + «🎫 Programadas»); o
> enunciado do UTAC107c **não pedia a divisão**; e o operador decidiu, em **R18-C de
> 2026-10-06**, mantê-la **fora do escopo** — «a divisão Relâmpago/Programadas … ficam fora do
> escopo; a Regra 1 aplica-se pondo o título «Outras Edições» dentro de vidro»
> (`_logs/UTAC107c-inicio.md`).
>
> O que o operador vê hoje é a execução fiel dessa decisão. **A prateleira de Programadas não
> se perdeu: nunca existiu.** Corrigir isto é **abrir escopo novo** (proposta P-1), não reparar
> uma regressão.

**Classificação (taxonomia pedida no SEG2):** hipótese 1 **CONFIRMADA** (é a causa) ·
hipóteses 2 e 3 **DESCARTADAS com evidência** · hipótese 4 **NÃO MEDIDA** (falta de acesso).

---

## Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| HEAD | `53d0d06` | `git log --oneline -1` |
| `origin/main` | `53d0d06` (= HEAD) | `git rev-parse --short origin/main` |
| Ficheiros de código modificados | **0** | `git status --porcelain` |
| Suíte | frontend **VERDE 899/899** · backend **VERDE 1095/1101** | `node scripts/mc966-suite-harness.mjs ambos` |
| Arranque / fecho | 11:38 / 11:43 (**5 min** de 30) | `date` |

Mockups lidos: `docs/mockups-107a/inicio.html` (107c, 21 511 B — **aprovado**) e
`docs/mockups-107a/mlc-op-v2/inicio.html` (108e, 8 323 B — referência).
Registos lidos: `_logs/UTAC107c-inicio.md` (12 312 B) e `_logs/UTAC108e.1-implementacao.md` (6 416 B).

---

## SEG0 — Código actual

### Onde está a prateleira, e o que ela filtra

| Medida | Valor | Prova |
|---|---|---|
| Existe prateleira «⚡ Relâmpago»? | **NÃO** | nenhum título com essa string no `Dashboard.jsx` |
| Existe prateleira «🎫 Programada»? | **NÃO** | idem |
| Existe prateleira única? | **SIM** — «🗓️ Outras Edições» | `Dashboard.jsx:485` |
| Filtro por `tipo === "programado"` no Início? | **NÃO EXISTE** | `Dashboard.jsx:151-153` |
| Filtro por `tipo === "relampago"` / `"flash"` no Início? | **NÃO EXISTE** | idem |

O que vem do contexto e alimenta a prateleira (`Dashboard.jsx:151-153`):

```js
const edicoesExtra = Object.values(edicoes || {}).filter(
  (e) => e && e.id !== EDICAO_ATIVA && !ehEspecial(e.id)
);
```

Duas exclusões — **a edição ativa** e **as especiais** (`MC94.2`) — e **nenhuma** por `tipo`.
Portanto edições Relâmpago e Programada caem **na mesma** prateleira, pela ordem do objeto.

A prateleira só é desenhada com `edicoesExtra.length > 0` (`Dashboard.jsx:477`), e cada item
renderiza um `EdicaoCard` (`Dashboard.jsx:511`) dentro de um carrossel horizontal (`MC99`).

### Onde o `tipo` APARECE (e por isso o defeito é de agrupamento, não de dados)

| Ficheiro:linha | O que faz |
|---|---|
| `hooks/useEdicoes.js:83` | normaliza `tipo: e.tipo === "programado" ? "programado" : "relampago"` — **toda** a edição em `edicoes` tem `tipo` fiável |
| `components/EdicaoCard.jsx:68` | `const tipoLabel = edicao.tipo === "programado" ? "🎫 Programado" : "⚡ Relâmpago"` — o cartão **já rotula** a família |
| `components/EdicaoCard.jsx:43` | `if (tipo === "relampago")` — a lógica de estado já distingue |
| `pages/OfertasProgramadas.jsx:58` | `filter((e) => e?.tipo === "programado" && e?.id)` — **o padrão pedido já existe na casa, mas só na OP** |
| `pages/Dashboard.jsx:434` | o tipo da edição ativa vira texto: `modalidade === "flash" ? "⚡ Relâmpago" : "🎫 Programado"` |

**Consequência para a leitura do sintoma:** o «⚡ Relâmpago» que o operador vê **é esse rótulo
dentro do card da Edição Ativa** (`Dashboard.jsx:434`), não o título de uma prateleira.

### Mockup vs código

| | Mockup 107c (aprovado) | Código `53d0d06` |
|---|---|---|
| Prateleiras de edições | **2** — «⚡ Relâmpago» e «🎫 Programadas» | **1** — «🗓️ Outras Edições» |
| Ocorrências de «Relâmpago» / «Programada» | 8 / 11 | (título ×0 · rótulo de card ✓) |

---

## SEG1 — Produção

`curl -s https://silly-stardust-ca71bc.netlify.app/` → **HTTP 200**, 5 134 B, entry
`index-DnPRjG5D.js`. O `index.html` referencia 5 assets; o Início vive em **chunk lazy**, por
isso fiz o varrimento dos **18 chunks** citados no entry.

| String | Ocorrências em produção | Leitura |
|---|---|---|
| «Outras Edições» | **2** (1 em `IdiomaContext-*`, 1 em `PrivyRoot-*`) | a prateleira única **está em produção** |
| «⚡ Relâmpago» | **3** | **rótulos de card** (`Dashboard:434`, `EdicaoCard:68`), não título |
| «🎫 Programada» (título de prateleira) | **0** | **não existe em produção** |
| «Passe Desafio» | 2 | 107c implementado **e** implantado ✓ |
| «Lances Únicos» / «Total de Lances» | 2 / 2 | KPIs mantidos (R18-A) ✓ |
| «Edição Ativa» | 2 | o card do topo ✓ |

**Produção = código de `53d0d06`.** Não há divergência entre o repositório e o que está no ar.
Logo, o que o operador vê é exactamente o que o código diz — e o código nunca teve a divisão.

---

## SEG2 — Diagnóstico

### Causa raiz

**A divisão em duas prateleiras nunca foi implementada — foi excluída do escopo pelo próprio
operador, em R18-C do UTAC107c (2026-10-06).** Prova verbatim do registo
(`_logs/UTAC107c-inicio.md`, §SEG0 → respostas do operador):

- Tabela de conflitos: «Regra 1 (título «Outras Edições» dentro de vidro) | sim — e **divide**
  em «⚡ Relâmpago» / «🎫 Programadas» | só «Regra 1» (não pede a divisão) | ⚠️»
- Conflito 3: «**Divisão «Outras Edições» em Relâmpago/Programadas e rótulo do botão da Edição
  Ativa** (variante A): entram neste UTAC ou ficam fora (o enunciado não os pede)?»
- **R18-C:** «a divisão Relâmpago/Programadas e o rótulo do botão da Edição Ativa ficam **fora**
  do escopo; a Regra 1 aplica-se pondo o título «Outras Edições» dentro de vidro.»

O código de hoje cumpre essa decisão ao pé da letra: título dentro de vidro
(`Dashboard.jsx:484`), sem divisão. **Nenhum UTAC posterior a 107c voltou ao assunto.**

### Agravante (explica o «só vejo a Edição Ativa»)

Com `edicoesExtra` **vazio**, nem a prateleira única é desenhada (`Dashboard.jsx:477`) e o ecrã
fica só com o card «🎯 Edição Ativa» — que traz o rótulo «⚡ Relâmpago». É a descrição exacta do
sintoma. **NÃO consegui medir o conteúdo do Blob** (sem credenciais; R5) — ver «O que não
provei». Este agravante **não é a causa** da ausência da Programada: mesmo com `edicoesExtra`
cheio, a prateleira seria uma só.

### Achado latente (real, mas não explica o sintoma)

Todas as peças para a divisão **já existem** na casa e estão testadas: `tipo` normalizado no
`useEdicoes.js:83`, rótulo por família no `EdicaoCard.jsx:68`, e o **filtro por
`tipo === "programado"` em `OfertasProgramadas.jsx:58`**. O que falta é **agrupar** no
Dashboard — não há nada a inventar. Isto **rebaixa o custo** da P-1 e **não** é a causa.

### Hipóteses — uma a uma

| # | Hipótese | Veredicto | Evidência |
|---|---|---|---|
| 1 | O 107c nunca implementou a prateleira de Programada | **CONFIRMADA — é a causa** | R18-C no log do 107c; `Dashboard.jsx:151-153` sem filtro de `tipo`; prateleira única em `:485` |
| 2 | O 108e.1 alterou o `CartaoEdicao` e o Início perdeu o carrossel | **DESCARTADA** | O log do 108e.1 tem **0** ocorrências de «Dashboard»/«Início»/«prateleira»; as suas secções são MLC B, OP A, 108d e pendências. E o Início importa **`EdicaoCard`** (`Dashboard.jsx:18`), **não** `CartaoEdicao` — a peça que o 108e.1 mexeu não é a que a prateleira usa |
| 3 | O `EM_BREVE_MODE` esconde a prateleira | **DESCARTADA** | Nos dois ficheiros do Início a expressão aparece **só em comentários** — `Dashboard.jsx:23` e `EdicaoCard.jsx:20` — e **não há um único condicional** com ela. `grep -n EM_BREVE_MODE pages/Dashboard.jsx components/EdicaoCard.jsx` → 2 linhas, ambas comentário |
| 4 | Não há edições Programada no Blob | **NÃO MEDIDA** | Exigiria ler o Blob (sem credenciais; R5). Contra-argumento parcial: `useEdicoes.js:83` normaliza `tipo` e a OP filtra do **mesmo** `edicoes` — se a aba OP mostra edições, elas estão em `edicoes` e apareceriam na prateleira única (sem divisão) |

---

## O que NÃO provei

| Não medido | Porquê |
|---|---|
| Conteúdo do Blob (quantas Programada existem hoje) | Sem credenciais; R5 proíbe tocar em chaves. **É o que decidiria o peso do agravante.** |
| O ecrã real em produção, num browser com sessão | Não medi com conta; a comparação produção↔código foi feita por chunk (grep), não por render |
| Se o operador quer a divisão como **prateleiras** ou como **filtro/aba** dentro da prateleira única | É decisão de produto — vai como P-2, não a decido eu |

## Erro do MEU instrumento (declarado)

A última linha do meu próprio script de varrimento de produção imprimiu «Existe alguma
prateleira titulada 'Relampago' ou 'Programada'? **SIM**» — porque somou «⚡ Relâmpago» (que em
produção são **rótulos de card**, ×3) a «🎫 Programada» (×0). **A inferência estava errada:** não
existe nenhum título de prateleira «⚡ Relâmpago» nem «🎫 Programada» em produção. O número
certo é o da tabela: «Outras Edições» ×2, mais nada. Fica à vista (GATE 15) para quem repetir o
diagnóstico não repetir o erro.

## Propostas (não aplicadas — R1)

- **P-1 — Implementar a divisão no `Dashboard.jsx`** (UTAC próprio). Reusar o padrão que já
  existe: duas listas derivadas de `edicoesExtra` por `tipo` (o critério de
  `OfertasProgramadas.jsx:58`), cada uma com o seu título em vidro (`⚡ Relâmpago` ·
  `🎫 Programadas`), reaproveitando o carrossel e o `EdicaoCard` já em uso. **Custo:** pequeno —
  não há dado nem componente novo. **Risco:** médio-baixo — mexe no ecrã mais visto; exige
  decisão sobre **ordem** e sobre o que fazer quando uma das listas está vazia.
- **P-2 — Decisão de produto que a P-1 precisa (do operador):** a divisão é em **duas
  prateleiras separadas** (como no mockup) ou em **filtro/segmentação dentro da prateleira
  única**? E se uma lista estiver vazia, o título dela desaparece (como hoje faz a prateleira
  única) ou fica?
- **P-3 — Fecho do agravante:** medir com credenciais quantas edições Programada existem hoje,
  para saber se o ecrã ficará com as duas prateleiras cheias ou com uma vazia.

## Custo

Sessão CLI **partilhada** (a mesma do dia); este UTAC não abriu sessão isolável. **Custo lido:
ver `state.db` no fecho.** Sem validador (é diagnóstico puro, por enunciado).

## Estado

**PARADO.** Nada foi alterado — código, mockups e `package*` intactos; `.bak-*` intactos;
`EM_BREVE_MODE` intacto. A correcção é **UTAC próprio** (P-1) e depende da decisão **P-2**.
