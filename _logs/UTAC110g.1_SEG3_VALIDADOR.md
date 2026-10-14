# UTAC110g.1 — SEG3 · VALIDADOR ADVERSARIAL

**Veredicto: APROVADO COM RESSALVAS — 0 BLOQUEANTES**

Commit validado: **`41e5768`** (pai `a78626f`) · worktree próprio `.wt-110g1-val` (regra A13) ·
validador: **subagente independente** (Hermes/DeepSeek), instruído a **TENTAR REFUTAR**.

> ⚠️ **NOTA DE TRANSCRIÇÃO (declarada, não escondida).** O validador **explodiu o limite de iterações
> do subagente antes de escrever este ficheiro**. O veredicto abaixo é o **conteúdo do próprio
> validador, transcrito pelo executor SEM ALTERAÇÃO de substância** a partir do resumo final dele
> (§«Conteúdo pronto para o ficheiro»), com os números e as conclusões como ele os reportou. O resumo
> final na íntegra fica arquivado em
> `C:\Users\Moltbot\AppData\Local\hermes\cache\delegation\subagent-summary-0-20261014_021659_304967.txt`.
> Os **instrumentos próprios** que ele escreveu foram preservados em `_logs/utac110g.1-seg3/`
> (`_seg3-val-mutantes.mjs`, `_seg3-sonda-email.mjs`, `tmp/e1-eq.mjs`, `tmp/sonda-nota.mjs`) — para o
> veredicto ser reproduzível. O executor **não** reescreveu a conclusão nem apagou nenhuma ressalva.
> Consequência assumida: **não houve uma 2.ª ronda independente** a validar as correcções que o
> executor fez DEPOIS do veredicto (§5/§8) — é o mesmo regime do UTAC110g.

---

## 1. Veredicto

`APROVADO COM RESSALVAS`, **sem bloqueantes**.

**Números que o validador reproduziu** (worktree próprio, `node scripts/mc966-suite-harness.mjs ambos`):

```
frontend: VERDE 1059/1059 · backend: VERDE 1226/1232 · VEREDITO: VERDE
```

— **bate exactamente** com a alegação do executor. Aritmética fechada: frontend 1049+10 = 1059;
backend 1219+13 = 1232. Portão A14: **1470 MB (abaixo)** na 1.ª leitura → aguardou → **1542 MB** no
arranque da suíte.

## 2. O que ele TENTOU refutar e NÃO conseguiu

Itens 1, 3, 4, 5, 6, 7, 8, 9 e 10 da lista do brief:

| item | resultado |
|---|---|
| 1 · Nota Técnica sem os campos esperados / data errada ou em UTC | **não refutado** (sonda própria imprimiu o documento: 5 campos ✓, `Data: 13/10/2026` para `02:30Z` ✓ Manaus, CEP/`—` defensivo ✓) |
| 3 · botão ainda em Ofertas | **não refutado** — 1 só ocorrência de `data-acao="resgatar-cartao"` em todo o `src/` |
| 4 · botão com < 50 ou decidido por `pontos` | **não refutado** — limiar por `pontosCartao>=50` do servidor (`ler-pontos.mjs:86`) |
| 5 · botão não abre o modal | **não refutado** (mutante V4 do próprio validador: `onClick` no-op → **PROVADO**, 4/6, fail 2) |
| 6/7/8 · backend fora do escopo; `CartaoEdicao`/`GlassHeader`/`CardLance`/`leilaoLock`/`package.json`/`.env` mexidos | **não refutado** — escopo só `resgatar-cartao.mjs` + `_lib/nota-tecnica.mjs`; os proibidos intactos |
| 9 · testes falsos | **não refutado** (correu a prova de mutação do autor e escreveu a dele) |
| 10 · regressão escondida / guardas apagadas | **não refutado** — contagem de testes preservada (**29→29** e **6→6**); guardas **invertidas, não apagadas** |

## 3. Mutantes PRÓPRIOS do validador (não copiados)

Script dele: `.wt-110g1-val/scripts/_seg3-val-mutantes.mjs` (inclui o **frontend**, que a prova do
autor não toca). Preservado em `_logs/utac110g.1-seg3/`.

| Mutante | Resultado |
|---|---|
| V1 devolver o botão às Ofertas | **PROVADO** (26/29, fail 3) |
| **V2 Manaus → São Paulo (UTC−3)** | **SOBREVIVEU 13/13 ← ACHADO F1** |
| V3 Manaus → Noronha (UTC−2) | PROVADO (12/13, fail 1) |
| V4 `onClick` do botão no-op | **PROVADO** (4/6, fail 2) |

## 4. O que ele REFUTOU (bloqueantes)

**Nenhum.**

## 5. Achados não-bloqueantes (ℹ️)

### F1 — o fuso (que É a decisão) não era discriminado pela minha prova de mutação
Os dois instantes pinados no teste caíam no **mesmo dia** em UTC−4 (Manaus) e UTC−3 (São Paulo),
logo um mutante Manaus→São Paulo **sobrevivia**: o M3 (→UTC) morria pelo DIA, não pelo FUSO. Um
documento emitido entre 03:00–03:59Z dataria **um dia a mais**.
**Correcção do executor (declarada, feita DEPOIS do veredicto):** instante de **fronteira**
`2026-10-14T03:30:00.000Z` (= 13/10 em Manaus, 14/10 em São Paulo) com **controlos** que provam que o
instante separa mesmo os dois fusos, + **mutante M8** (Manaus→São Paulo) na prova de mutação.
Re-medido: **8/8 PROVADOS** (o M8 morre) e backend **1227/1233** VERDE. **Não re-validado** por uma
2.ª ronda independente.

### §2.2 — Privy: o desvio declarado pelo executor é VERDADEIRO
Verificado independentemente: `verificarUserSession` só verifica HS256/`JWT_SECRET` + `tipo`; **não há
`PRIVY_*`** nos segredos (`netlify.toml` `SECRETS_SCAN_OMIT_KEYS` não tem nada Privy);
**`@privy-io/server-auth` NÃO está instalado** (só `@privy-io/react-auth`) ⇒ o servidor **não podia**
verificar um access token Privy mesmo que lhe chegasse; `useResgatarCartao` envia
`user.email.address` no **corpo**. **Não há caminho server-side que o autor não viu** ⇒ não bloqueante —
mas é um **desvio real da R18-110g.1-3**, registado como **DEBT-027**.

### Outros
- **«mesmo visual» não literalmente cumprido** — justificado: a R18-109h.2/109h.3 proíbe CTA de amarelo
  cheio na Carteira (teste `utac109h2-carteira` §8). O validador **não confirmou a decisão R18-109h.2
  em si** (só o teste no código) — limite da medição dele.
- `from: desafiogut@gmail.com` (o default do `_lib/email.mjs`).
- **Não medido por ele:** as 4 capturas PNG `_logs/utac110g.1-browser/` **não foram verificadas**.

## 6. Testes fracos do autor (apontados pelo validador)

1. A asserção do texto do modal no `utac106g-resgate` era uma **tri-alternação** em que a 1.ª
   hipótese (`Com a Família Quildo`) **não casava nada** — guarda que passava por acidente.
   **Corrigida** (estreitada para o texto real do `ResgatarCartaoModal.jsx:57-59`), após o veredicto.
2. O «A3 mutação» é `.replace()` sobre a string capturada — **mutação de TEXTO, não de código de
   produção**. Declarado pelo autor; **anotado** com a indicação de que a mutação de CÓDIGO da mesma
   regra é o **M5** (essa corre de verdade, com md5 confirmado), após o veredicto.
3. A invariante «o cartão nunca depende do palpite» nas Ofertas **perdeu a metade do botão** (legítimo
   — o botão mudou de casa) e ficou só com a barra. A metade perdida vive agora no
   `utac110g1-carteira-resgate.test.mjs` (INVARIANTE com palpite PERDEDOR ⇒ botão existe).

## 7. Prova de mutação do autor — auditada pelo validador

Correu-a ele: **`7/7 PROVADOS` + `E1 EQUIVALENTE CONFIRMADO`**; restauração **md5 IDÊNTICO**.
Auditou o **E1 independentemente** (`_logs/utac110g.1-seg3/tmp/e1-eq.mjs`): o mutante **entrou**
(md5 `d088e730`→`3b7c1d12`), a guarda `if (email) {` está a **montante** e o percurso é mutuamente
exclusivo ⇒ **é equivalente a sério, não um mutante desculpado**.

## 8. Higiene

- Worktree `.wt-110g1-val` criado pelo helper (4 junctions) e **removido pelo helper** (o executor
  fechou este passo, que o validador não chegou a fazer): `reparse points encontrados: 0`,
  `git worktree remove -> exit 0`, `{ok:true}`. **Nada de `rm -rf` à mão.**
- `node_modules` do frontend: **498 antes e 498 depois** — intacto (era o risco da A13).
- `git diff --stat HEAD` no worktree: **vazio** (nenhum ficheiro rastreado alterado; restaurações md5 ✓).
- Os 3 instrumentos próprios do validador foram **preservados** em `_logs/utac110g.1-seg3/` antes de o
  worktree ser removido (para o veredicto ser reproduzível).
- RAM: 1470 MB (1.ª leitura, abaixo) → **1542 MB** no arranque da suíte.

## 9. Limites da medição DO VALIDADOR (o que ele não mediu)

- As 4 capturas PNG do browser **não foram verificadas** por ele.
- Sem DOM real (SSR) nos testes — o clique é o `onClick`, sem hit-testing.
- **Não confirmou a decisão R18-109h.2 em si**, só o teste que a guarda no código.
- O worktree **não foi removido** por ele (orçamento de iterações); foi o executor que o removeu.

## 10. Limites da MEDIÇÃO DO EXECUTOR após o veredicto (declarado)

As correcções do §5-F1 e do §6.1/6.2 foram feitas **depois** de o validador fechar, **sem 2.ª ronda
independente** (GATE 15: a série mantém o achado à vista em vez de o apagar). Foram re-medidas pelo
executor: suíte **frontend 1059/1059 · backend 1227/1233 VERDE**, mutação **8/8 PROVADOS**, RAM 1664 MB.
