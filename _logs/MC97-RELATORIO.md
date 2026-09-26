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
