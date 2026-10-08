# VEREDICTO — UTAC108h.2 (duas prateleiras no Início)

**Worktree:** C:\Users\Moltbot\tmp-108h2-val\wt @ e737930 (limpo, `git status` vazio)
**Repo principal:** C:\Users\Moltbot\Desktop\DESAFIOGUT @ **e737930** (mesmo commit — a suíte canónica mede a alteração)
**Data:** 2026-10-08
**Natureza:** validação adversarial (tentativa de refutação, lista (a)–(j))

---

## Veredicto
# ✅ APROVADO — 0 bloqueantes

Tentei derrubar os 10 alvos (a)–(j). **Nenhum se reproduziu.** O helper `prateleirasDeEdicoes`
replica exactamente a regra do normalizador do `useEdicoes` (`useEdicoes.js:83`:
`tipo: e.tipo === "programado" ? "programado" : "relampago"`), o que fecha o único ponto
onde uma separação por família poderia falhar em silêncio.

## Bloqueantes
**Nenhum.** (0/10 alegações confirmadas)

---

## Reproduzido por execução

**1. Âmbito do commit — só os 4 ficheiros declarados:**
```
$ git show --stat --oneline e737930
 desafio-gut/frontend/src/pages/Dashboard.jsx             |  82 +++++++--
 .../src/pages/__tests__/Dashboard.test.mjs               | 164 +++++++++++--
 .../src/pages/__tests__/mc99-limpeza-ui.test.mjs         |  12 +-
 scripts/mc99-prova-mutacao.mjs                           |   8 +-
 4 files changed, 235 insertions(+), 31 deletions(-)
```
```
$ git show --name-only e737930 | grep -i bak   → (vazio)
$ git show --name-only e737930 | grep -iE "netlify|backend" → (vazio)
$ git status --short → (vazio, worktree limpo)
```

**2. Testes do Dashboard (25 testes novos/actualizados):**
```
$ cd .../frontend && node --test --experimental-test-module-mocks src/pages/__tests__/Dashboard.test.mjs
ℹ tests 43   ℹ suites 7   ℹ pass 43   ℹ fail 0
  ✔ renderizam as DUAS prateleiras, na ordem Relâmpago → Programada
  ✔ cada prateleira mostra SÓ a sua família (nenhuma edição nas duas)
  ✔ P-2b — com as DUAS listas vazias, os DOIS títulos ficam e os dois vazios aparecem
  ✔ P-2b — uma lista cheia e a outra vazia: os DOIS títulos ficam
  ✔ Regra 1 — o texto do estado vazio vive DENTRO de vidro
  ✔ a edição ativa e a especial continuam FORA das prateleiras
  ✔ prateleirasDeEdicoes — separa por tipo, sem perder nem duplicar
  ✔ tipo ausente ou desconhecido cai em `relampago` (a regra do useEdicoes.js:83)
```

**3. Suíte canónica (repo principal, HEAD = e737930):**
```
$ cd C:/Users/Moltbot/Desktop/DESAFIOGUT && node scripts/mc966-suite-harness.mjs ambos
frontend: VERDE 909/909 pass
backend:  VERDE 1095/1101 pass
VEREDITO: VERDE
```

**4. Ausência de referências residuais ao código antigo:**
```
$ git grep -n -E "outras-edicoes|edicoesExtra|Outras Edi"
  → código-fonte/testes: SÓ comentários (Dashboard.jsx:177,533; mc99-limpeza-ui.test.mjs:59,74;
    Dashboard.test.mjs:19,192,260); o resto é CLAUDE.md/docs/_logs (histórico, GATE 15)
  → ZERO referências executáveis a `edicoesExtra` / `outras-edicoes-scroll`/`-item`
```
`grep` de emoji não foi usado (armadilha medida). Contagens feitas em Python:
`⚡`=4, `🎫`=3 no Dashboard.jsx; `prateleira-scroll` presente em código real + 1 comentário.

---

## Tabela de achados

| # | Alvo | Severidade | Tratamento proposto |
|---|------|-----------|---------------------|
| (a) | ainda 1 prateleira | ✅ REFUTADO | — (o `map` sobre 2 entradas desenha 2 `<section>`, títulos no array `:513-516`) |
| (b) | famílias misturadas | ✅ REFUTADO | — (partição por `tipo`: `!== "programado"` vs `=== "programado"`, mutuamente exclusiva e exaustiva) |
| (c) | título desaparece quando vazio | ✅ REFUTADO | — (`<GlassCard><h3>{titulo}</h3>` renderiza FORA do ternário `lista.length>0`, Dashboard.jsx:524-526) |
| (d) | vazio fora de vidro | ✅ REFUTADO | — (o vazio é `<GlassCard data-testid="prateleira-vazia">` → `data-testid` conta 2 no teste P-2b) |
| (e) | edição em duas prateleiras | ✅ REFUTADO | — (filtros exclusivos; `pilula()` do id == 1; teste "separa por tipo, sem perder nem duplicar") |
| (f) | EdicaoCard/useEdicoes/OfertasProgramadas alterados | ✅ REFUTADO | — (commit toca SÓ 4 ficheiros; nenhum desses 3) |
| (g) | outro ecrã quebrou | ✅ REFUTADO | — (frontend 909/909 verde; mc99-limpeza-ui actualizado e verde) |
| (h) | backend alterado | ✅ REFUTADO | — (nenhum ficheiro `netlify/`/backend no commit) |
| (i) | .bak-* tocado | ✅ REFUTADO | — (os 5 `.bak-*` fora do commit; worktree limpo) |
| (j) | suíte canónica vermelha | ✅ REFUTADO | — (VERDE: 909/909 + 1095/1101) |
| ℹ️ | chave i18n `dash.outrasEdicoes` (`pt.js:35`) fica órfã | ℹ️ nota | Título passou a string literal no Dashboard. `pt.js` NÃO devia ser tocado (âmbito) — limpeza opcional num UTAC próprio. Não é bloqueante. |
| ℹ️ | chave interna `"programado"` vs texto visível «🎫 Programada» | ℹ️ nota | Cosmético (género). Alinha com `useEdicoes`/`EDICAO_ATIVA`; não tocar. |
| ℹ️ | string `outras-edicoes-scroll` ainda existe em **comentário** (Dashboard.jsx:533) | ℹ️ nota | Documenta o rename; não é código. Pode induzir um `grep` ingénuo a falso-positivo. |
| ℹ️ | Início passa a mostrar SEMPRE 2 prateleiras (mesmo com 0 edições) | ℹ️ nota | Efeito DECLARADO da decisão P-2b — não é regressão. |
| ℹ️ | backend 1095/1101 (6 não-pass) | ℹ️ nota | Baseline pré-existente do harness (VEREDITO: VERDE). Não introduzido por este commit. |

---

## Alegações REFUTADAS (as que derrubei)
Todas: **(a), (b), (c), (d), (e), (f), (g), (h), (i), (j)** — 10/10.
Não consegui *confirmar* nenhuma das dez queixas; cada uma tem refutação por leitura de código
**e** por execução (teste dedicado e/ou suíte canónica).

## O que NÃO consegui refutar
Nada da lista (a)–(j). O ponto mais próximo de uma brecha — «a separação por `tipo` poderia
desviar a família errada» — fechou-se ao ler `useEdicoes.js:83`, que normaliza
`tipo` para exactamente `"programado" | "relampago"`; o helper usa a MESMA regra, logo não há
valor que caia no ramo errado. O teste da função pura cobre ainda `tipo` ausente/desconhecido.

## O que NÃO medi e porquê
1. **UI renderizada / browser** — validação feita sobre o HTML do render + fonte; sem browser
   nesta tarefa (a Regra 1 «vidro» foi medida por `data-testid="prateleira-vazia"` dentro de
   `GlassCard` e pela asserção «abre > fecha» de `gut-glass-standard`, não por inspecção visual).
2. **Dados reais com >1 edição por família** — a fonte é `GET edicoes` (`useEdicoes` pode devolver
   `null`→fallback sem `id:`); não há fixture de produção com muitas edições por família. Os
   cenários foram sintéticos (renders de teste).
3. **`scripts/mc99-prova-mutacao.mjs` (MUT1) não executado** — a instrução proíbe alterar o repo
   principal/worktree e o mutador escreve no código; limiei-me a ler o mutador (`replace` do
   testid `prateleira-scroll` → guarda `mc99-limpeza-ui.test.mjs:66` continua dependente desse
   testid, logo o mutante mantém-se morto por inspecção).
4. **`.bak-*` por mtime** — verifiquei que não estão no commit nem no `git status`; não olhei a
   timestamp de disco (irrelevante para o contrato «não tocados»).
