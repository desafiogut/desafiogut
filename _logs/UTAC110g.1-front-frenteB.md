# UTAC110g.1 — FRENTE B · BOTÃO DE RESGATE MOVIDO PARA A CARTEIRA

**Executor previsto:** Opus 5.5 (Claude Code) · **Executor real:** Hermes — **substituição declarada**
**Data:** 2026-10-14 · **Decisão aplicada:** R18-110g.1-2 (D-110g-4 = «só na Carteira, remover de Ofertas»)

---

## 1. ⚠️ A substituição de executor (declarada, não escondida)

O UTAC atribuía a Frente B ao **Opus 5.5**. Despachei-o a 2026-10-14 via Claude Code
(`claude -p --model opus --permission-mode bypassPermissions`), com o brief em
`_logs/UTAC110g.1_BRIEF_OPUS.md`. Resultado **medido** (`/tmp/opus-frenteB.json`):

```
"api_error_status": 429, "api_error": "usage_limit_reached",
"result": "You've hit your session limit · resets 2:30am (America/Sao_Paulo)"
"num_turns": 10, "costUSD": 3.269843
```

Tentei também `--model sonnet` (para distinguir limite de modelo de limite de conta): **mesmo 429**,
`usage_limit_reached`. O executor designado está **indisponível** até às 02:30 (America/Sao_Paulo), e
o orçamento deste UTAC é de 2 h.

**Decisão tomada:** executar a Frente B aqui, **declarando a substituição**, em vez de parar o UTAC
inteiro com a Frente A completa. É exactamente a divisão que a RESSALVA HI5 do próprio enunciado
prevê («110g.1-back (Hermes) / 110g.1-front (Opus)»), e é o que menos custa ao operador: se preferir a
via Opus, o trabalho está todo em ficheiros **não commitados** até ao fecho e pode ser refeito/validado
por ele quando o limite repuser. O validador adversarial do SEG3 é independente — cobre a perda de
independência entre quem escreve e quem valida.

---

## 2. O que mudou

| ficheiro | mudança |
|---|---|
| `src/pages/OfertasProgramadas.jsx` | **SAIU** o par de botões de resgate (activo a ≥50 + o desactivado «Chegue a 50 pontos para resgatar»), o parágrafo de apoio, o estado `resgateAberto`, o `confirmarResgate`, o render do `ResgatarCartaoModal` e os 2 imports. Menos 66 linhas. |
| `src/pages/MinhaCarteira.jsx` | **ENTROU** o botão, o estado, o handler e o balão. Mais 76 linhas. |
| `src/pages/__tests__/utac106f-ofertas.test.mjs` | as guardas do resgate passaram a afirmar o **novo** sítio (o botão JÁ NÃO está aqui), mantendo a força |
| `src/pages/__tests__/utac106g-resgate.test.mjs` | **re-apontado** para a Carteira; o FLUXO (clique → balão → POST → toast; 402) é o mesmo, sem asserções perdidas |
| `src/pages/__tests__/utac110g1-carteira-resgate.test.mjs` | **NOVO** — 10 testes: 4 estados + R1 + invariante + sítio + cor + bidirecional |

### 2.1 O botão (como está)

```jsx
{podeResgatarCartao && (
  <button type="button" data-acao="resgatar-cartao" aria-label="Resgatar cartão"
          onClick={() => setResgateAberto(true)} style={{ ...botaoPrimario, marginBottom: "0.6rem",
          background: "rgba(245,166,35,0.14)", border: "1px solid rgba(245,166,35,0.4)",
          color: COR.gold, boxShadow: "none" }}>
    🎁 Resgatar cartão colecionável
  </button>
)}
```

- **Limiar:** `podeResgatarCartao` do `usePontos` — o booleano do **SERVIDOR**, que vale
  `pontosCartao >= 50` (só pontos de COMPRA). **Não** se usa `pontos` (o total inclui o bónus do
  palpite): é a exigência do B3 e há teste que a morde (50 totais com 48 de compra ⇒ sem botão).
- **Sem botão desactivado:** com <50 não há botão nenhum. A Carteira é um ecrã de saldos, e o
  «falta chegar a 50» já é dito pela barra de progresso que lá está (não se duplica informação).
- **Sítio:** dentro do **1.º vidro**, depois dos 3 saldos e das «Missões de hoje», antes da grelha
  dos botões de compra. Há teste de ORDEM com as 5 âncoras.
- **Balão:** o `ResgatarCartaoModal` do UTAC106g, **sem uma linha alterada**; o `useResgatarCartao`
  também intacto (o `Bearer` continua a ser o `authToken` user-session, não o `lance-auth`).

### 2.2 ⚠️ Conflito de regras resolvido (declarado): a COR do botão

O enunciado diz «com o mesmo visual» — e o botão das Ofertas era **dourado SÓLIDO**
(`background: COR.gold`) com texto navy. Ao trazê-lo para a Carteira, a suíte caiu imediatamente:

```
not ok 158 - UTAC109h.2 · 8 — nenhum botão das 2 peças usa preenchimento AMARELO SÓLIDO (padrão único)
```

A R18-109h.2/109h.3 (decisão do operador, 2026-10-09) proíbe CTA de amarelo **cheio** na Carteira e
manda usar o padrão **tingido** — é uma regra do operador **específica deste ecrã**, com teste
próprio, e mais recente do que o visual que vinha das Ofertas. Lido à letra, «mesmo visual» e essa
regra **contradizem-se**.

**Resolvido a favor da regra do ecrã de destino**, e o enunciado apoia-o: ele próprio escreve, na
especificação do botão, «Cor: amarelo (**único**, R18-109h.2)». O amarelo único mantém-se — no
contorno e no texto, como nos outros quatro botões da Carteira. **Nenhum caso legítimo partiu**
(continua a ser o único destaque da Carteira, a 48 px de altura, com o mesmo texto). E o teste do
109h.2 §8 volta a passar **sem ser tocado**.

Se o operador preferir o dourado cheio na Carteira, é uma decisão dele — mas teria de rever
explicitamente a R18-109h.2 e o teste que a guarda. Não o fiz por conta própria.

---

## 3. Evidência

### 3.1 Suíte frontend (harness canónico)

| antes | depois |
|---|---|
| 1049/1049 VERDE | **1059/1059 VERDE** (+10 testes novos, 0 regressões) |

### 3.2 Os 10 testes novos (`utac110g1-carteira-resgate.test.mjs`)

| teste | o que prova |
|---|---|
| E1 | ≥50 ⇒ o botão APARECE, com o texto, o `aria-label` e a âncora `data-acao` |
| E2 | <50 ⇒ NÃO aparece (nem o texto) |
| E3 | **a carregar** (leitura pendente) ⇒ sem botão |
| E4 | **erro** de leitura ⇒ sem botão (e o erro continua a ser dito) |
| R1 | 50 totais com 48 de compra ⇒ sem botão (não usa `pontos`) |
| INVARIANTE | 50 de compra + palpite PERDEDOR ⇒ o botão existe (jogo de habilidade) |
| BIDIRECIONAL | o mesmo ecrã dá botão com ≥50 e não dá com <50 (o estado não é constante) |
| BIDIRECIONAL (controlo negativo) | `EXIGE_BOTAO(html, true)` **explode** com <50 — o teste não é vacuoso |
| S (sítio) | ordem `vidro < saldos < missões < resgate < Depositar PIX`, dentro do 1.º vidro, com os 3 saldos ainda lá |
| C (cor) | fundo `rgba(245,166,35,0.14)`, contorno `rgba(245,166,35,0.4)`, texto `#f5a623`, `min-height:48px`, e **nunca** `background:#f5a623` |

### 3.3 Bidirecional do FLUXO (manteve-se ao mudar de ecrã)

O `utac106g-resgate.test.mjs` continua a exigir: botão **activo** (não `disabled`) a ≥50; o clique
abre o balão com os 8 campos do formulário; a confirmação faz `POST /resgatar-cartao` com
`Authorization: Bearer AUTHCTX-106g` e **fecha** o balão + toast «Pedido de resgate criado»; o 402
**mantém** o balão aberto. O valor do token no duplo é **distinto** do `getAuthToken` da Via A, para
o teste MORDER se o hook voltar ao JWT errado (herança do achado UTAC106j-fix).

### 3.4 Capturas (browser REAL — Playwright/Chromium)

`_logs/utac110g.1-browser/` — 4 PNG a 375 px e 1280 px, com e sem resgate:

```
[carteira-com-resgate  375px] overflow lateral=0 · botão=sim (309x48,  alvo≥44=true) · dentro do 1.º vidro=true · fundo=rgba(245,166,35,0.14) · texto=rgb(245,166,35)
[carteira-com-resgate 1280px] overflow lateral=0 · botão=sim (1214x48, alvo≥44=true) · dentro do 1.º vidro=true · fundo=rgba(245,166,35,0.14) · texto=rgb(245,166,35)
[carteira-sem-resgate  375px] overflow lateral=0 · botão=não
[carteira-sem-resgate 1280px] overflow lateral=0 · botão=não
```

Inspeccionadas a olho (visão): o botão aparece a seguir às missões e antes do «Depositar PIX», no
mesmo estilo dos irmãos; no caso «sem resgate» a grelha de 4 botões fica intacta; **sem corte lateral
nem texto sobreposto** em nenhuma das 4.

⚠️ **Limite das capturas (declarado):** o padrão da série foi seguido — um **arnês TEMPORÁRIO**
(apagado no fim) que monta a `MinhaCarteira` REAL com o CSS real, **sessão SINTÉTICA** (o duplo de
`AppContext` dos testes) e um `ler-pontos` sintético. **Não** é produção e **não** houve login Privy
real (gate LGPD): as capturas provam o LAYOUT e os DOIS estados do botão, não a integração com a
identidade real. Os 3 «recursos em falta» que a consola regista são artefactos do `file://` do arnês
(o `@import "tailwindcss"` do `globals.css`, um `@import` de fontes e um `@font-face` com caminho
absoluto) — **0 erros de JavaScript** em todas as 4 capturas.

### 3.5 Lint e build

- `npx eslint src/pages/MinhaCarteira.jsx src/pages/OfertasProgramadas.jsx` → **0 erros**, 3 avisos,
  e os 3 são **pré-existentes** (verificado contra `HEAD`: `ON_GOLD` e `cardPad` na Carteira,
  `estaAberta` nas Ofertas). Nenhum aviso novo.
- `npm run build` → **sucesso** (13,12 s).

---

## 4. O que NÃO foi medido (declarado)

1. **Não há DOM real nos testes** — o clique é o `onClick` do elemento React, sem CSS nem
   hit-testing. O layout/toque mede-se nas capturas (§3.4).
2. **Não se abriu a Carteira em produção** com sessão real (gate LGPD). Sessão sintética.
3. **Não se mediu o balão aberto em captura** — o balão é accionado pelos PROPS nos testes (o
   conteúdo vive dentro do `Modal` do design system). Não há screenshot do formulário de morada.
4. O `ResgatarCartaoModal` e o `useResgatarCartao` **não foram tocados** — a sua cobertura é a que já
   existia (UTAC106g).
5. Leitor de ecrã real (NVDA/TalkBack): não exercitado.

## 5. Erros dos meus próprios instrumentos (declarados)

1. **Tinha posto o botão com o dourado SÓLIDO.** Copiei o visual das Ofertas como o enunciado pedia
   («mesmo visual») e só descobri o conflito quando a suíte caiu no teste do 109h.2 §8. O enunciado
   contradizia-se; **a suíte apanhou-o, não eu**.
2. **Uma asserção minha estava errada à primeira**: escrevi `assert.match(t, /faltam 1/)` no caso
   «<50» da Carteira, copiando o texto das Ofertas — mas o «faltam N» só existe nas Ofertas; na
   Carteira o que existe é a barra «49 / 50». Corrigida para `/49 \/ 50/` + `aria-valuenow="49"`.
   (Seria um teste que falhava por eu ter suposto a copy do ecrã errado.)
3. **`renderToStaticMarkup` com `fullPage:true` no Playwright falhou** («Unable to capture
   screenshot»): a página inteira é demasiado alta para uma captura. Passado a captura de viewport
   com altura 1400 px, que mostra tudo o que interessa.
