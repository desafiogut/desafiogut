# MC97 — COPY PT/EN/ES ALINHADA AO TORNEIO DE HABILIDADE

**Fecho:** `469be5e` · **Suítes:** frontend **389/389** · backend **680/686** · VERDE
**Validador independente:** `deleg_ebdb6ee3` — despachado, veredicto pendente

---

## 1. O problema, medido

O MC96 corrigiu o vocabulário em PT. EN e ES ficaram para trás — e o app **contradizia-se entre
idiomas**: um utilizador que mudasse para EN via «Bids», para ES «Pujas».

```
en.js  22 termos proibidos  (bid ×13, bids ×9)
es.js  22 termos proibidos  (puja ×14, pujas ×8)
«skill-based tournament» em en.js: 0 ocorrências  ← o termo central do glossário faltava
```

⚠️ A 1.ª varredura acusou também `auction`, `bet`, `gambling`, `draw`, `chance`, `luck` — **falsos
positivos meus**, por usar padrões sem fronteira de palavra (`bet` dentro de «better», `draw`
dentro de «drawer»). Re-medido com `\b`: **22, todos `bid`/`pujas`**. *Uma medição sem fronteira
de palavra mede a língua inteira.*

## 2. Aplicado (glossário do operador)

| | de | para | n |
|---|---|---|---|
| EN | bid(s) | offer(s) | 22 |
| EN | password(s) | **token(s)** | 7 |
| EN | «Skill tournament» | «Skill-based tournament» | 2 |
| ES | puja(s) | oferta(s) | 22 |
| ES | contraseña(s) | **token(s)** | 7 |

`password`/`contraseña` estão na lista de proibidos por decisão do operador: «senha» traduz-se por
**Token**. *Password* lê-se como credencial de conta, não como crédito de participação.

**Resultado:** 0 termos proibidos nos valores dos 3 idiomas · **129 chaves em cada** (sincronizados).

## 3. ⚠️ O buraco que a mutação encontrou — e era do tamanho do uso real

Escrevi o teste e a primeira mutação passou. Depois:

```
mutação «Bids» em EN ........ MORRE ✅
mutação «Subastas» em ES .... SOBREVIVEU ❌   ← subasta não casa o plural
```

**Ninguém escreve «Subasta» num botão.** O singular que eu testava não é o que aparece no ecrã.
Corrigidos todos os padrões para plural, as três mutações morrem — e a remoção de uma chave também.

```
baseline 5/5 · «Bids» MORRE · «Auctions» MORRE · «Subastas» MORRE · chave removida MORRE
```

## 4. ⚠️ A ficha da Play: 5 de 9 campos estouravam o limite, com um ✅ inventado

Escrevi a ficha com as **contagens de cabeça**. Medidas a seguir:

| campo | escrevi | MEDIDO | limite |
|---|---|---|---|
| PT título | 21 | **34** | 30 ❌ |
| ES título | 28 | **32** | 30 ❌ |
| PT curta | 76 | **86** | 80 ❌ |
| EN short | 79 | **87** | 80 ❌ |
| ES corta | 78 | **87** | 80 ❌ |

**Cinco campos estouravam, e eu tinha escrito ✅ ao lado de cada um.** Copy encurtada e as
contagens passaram a ser **medidas por código** (`scripts/mc97-medir-ficha.mjs`, que recusa
validar se algum campo exceder). Estado final: 9/9 dentro dos limites.

> É a mesma lição que o validador me deu no MC96.6 («três números para a mesma contagem»).
> **Escrever um número sem o medir é inventá-lo — e um ✅ inventado é pior que nenhum, porque
> fecha a questão.** Se o MC100 colasse isto, teria falhado na Play Console.

## 5. Entregáveis

```
docs/GLOSSARIO-OFICIAL.md ........ tabela PT/EN/ES + proibidos + a razão de cada escolha
docs/FICHA-PLAY-3-IDIOMAS.md ..... títulos/curtas/longas medidos, 9/9 dentro dos limites
scripts/mc97-medir-ficha.mjs ..... mede e RECUSA se estourar
src/i18n/__tests__/glossario.test.mjs ... 5 asserções bidireccionais
en.js · es.js .................... 22+29 substituições cada
```

## 6. Lições

1. **Um padrão que só apanha o singular é uma guarda com um buraco do tamanho do uso real.**
2. **Medir a língua exige fronteira de palavra** — senão «better» conta como «bet».
3. **Escrever um número sem o medir é inventá-lo.** Cinco ✅ meus, cinco limites violados.
4. **Testar o dicionário não é testar o produto** — a UI pode chamar chaves que mudaram.


---

## 7. Veredicto do validador independente (`deleg_ebdb6ee3`) — e o que ele refutou

50 chamadas, 736 s. **Confirmou** o essencial com medição própria, mais forte que a minha — leu o
**objecto importado por ESM** (não o regex): 0 termos proibidos nos valores · 129/129/129 chaves ·
9/9 campos da Play dentro dos limites, medidos com parser dele · suites 389/389 e 680/686.
E confirmou a lição central que eu já suspeitava: **35 de 129 chaves são MORTAS** — 18 `nav.*`,
10 `dash.*`, 7 `config.*`, nunca referenciadas. `Sidebar.jsx` tem `NAV_ITEMS` com **PT hardcoded**
(«Mercado de Lances», «Meus Ativos») e `Dashboard.jsx:143-149` hardcoda `label: "Senhas"`.
⇒ **A minha correcção «Bids→Offers» em `nav.lances` tem efeito visível ZERO.** O dicionário está
certo; o ecrã não o usa. É a lição do MC96.1 («testar o dicionário não é testar o produto») a
fechar-se contra mim, **no mesmo MC em que a citei**.

**REFUTADO — tudo meu, tudo corrigido:**

| achado | correcção |
|---|---|
| `en.js:86` «a offer» · `en.js:97` «participant offer» | «an offer» · «participant's offer» |
| `es.js:85/86` «**Las** tokens» (concordância quebrada) | «**Los** tokens» |
| `es.js:25` `dash.senhas` = «**Fichas**» — proibido pelo glossário | «Tokens» |
| guarda **value-blind**: 4 mutações escapavam | 3 testes novos; as 4 morrem |
| contagem ×2 declarada no commit | **medido: 2** em `en.js` (ele mediu 1 — divirjo no método, registo ambos) |

As 4 mutações que **sobreviviam** ao meu guarda e agora morrem: «Skill-based tournament»→«Skill
tournament» (escape *file-vs-value*: o teste fazia grep ao **ficheiro**, e o comentário mantinha a
frase) · EN «Offers»→«Lances» e ES «Ofertas»→«Lances» (um **valor em português** passava!) · PT
«Senhas»→«Tokens» (desalinhamento do glossário PT) · «Fichas» em ES.

⚠️ E dois erros meus **na própria medição das mutações**: a 1.ª corrida foi **ilegível** (base a
`fail 1`, logo não se distinguia falha nova de pré-existente) e a mutação M4 sobreviveu porque
substituí **só a 1.ª ocorrência** — havia 2. *Mutação sobre base vermelha não prova nada; mutação
incompleta não é mutação.*

**Não resolvido (fica para o MC98/MC100):**
1. **35 chaves mortas** + `NAV_ITEMS`/`Dashboard` com PT hardcoded — o trabalho de i18n real.
2. **59 de 62 `.jsx`** com texto de UI não usam i18n; **96 atributos** literais (`aria-label`,
   `placeholder`, `alt`, `title`), todos PT.
3. **A ficha da Play contém «sorteio», «azar», «luck», «draw» dentro de NEGAÇÕES** — a mesma lista
   que o guarda proíbe no i18n. Decisão do operador: manter a negação (clareza jurídica) ou
   reescrever (fricção de keyword-scan). **E o título EN não usa o termo do glossário.**
4. **6 skips do backend** (5 sem `SUPABASE_*`, 1 sem `MAINNET_RPC_URL`) — não medidos, **não verdes**.
5. O **HEAD moveu-se 3×** durante a auditoria: eu commitei enquanto ele media. **Congelar o HEAD
   antes de auditar.**
