# UTAC108h.2 — DUAS PRATELEIRAS NO INÍCIO (Relâmpago + Programada)

**Tipo:** produto (frontend). **Owner:** Hermes · **Data:** 2026-10-08 · **HI5:** 1 h 30 (usado: ver §Fecho).
**Depende de:** UTAC108h.1 (diagnóstico, fechado em `c929c6e`) — que provou que a divisão **nunca foi
implementada**, por a ter o operador excluído do escopo do UTAC107c (R18-C).

**DECISÕES DO OPERADOR (input deste UTAC):**
- **P-2** — estrutura: **2 prateleiras separadas** («⚡ Relâmpago» + «🎫 Programada»).
- **P-2b** — prateleira vazia: **o título fica** e o **estado vazio vive dentro** dele.
- **P-3** — medir o Blob se possível (declarar se não).

---

## Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| HEAD no arranque | `c929c6e` (= `origin/main`) | `git log --oneline -1` |
| Ficheiros de código modificados | **0** | `git status --porcelain` |
| Suíte (antes) | frontend **899/899** · backend **1095/1101** | `node scripts/mc966-suite-harness.mjs ambos` |
| Arranque | 11:47 | `date` |

### P-3 — MEDIDO (e é o achado mais útil deste UTAC)

O `GET /.netlify/functions/edicoes` é **público** (o app chama-o sem sessão) ⇒ dá para medir a produção
sem credenciais, sem violar R5:

```
HTTP 200 · 5 edições · agendadas: 0
  ESPECIAL-AIRFRYER  tipo=relampago  status=aberto    produto=Air Fryer
  RELAMP-1           tipo=relampago  status=encerrado produto=Smart TV
  RELAMP-2           tipo=relampago  status=encerrado produto=Smart TV
  RELAMP-3           tipo=relampago  status=encerrado produto=Smart TV
  R-1                tipo=relampago  status=aberto    produto=None
  POR TIPO: {'relampago': 5}      <<< ZERO programado
```

**Consequência directa (declarada antes da implementação):** em produção a prateleira «🎫 Programada»
vai nascer **VAZIA** — e é por isso que o estado vazio da P-2b não é um caso de laboratório: é o que o
operador vai ver. A prateleira «⚡ Relâmpago» vai com **3 cards** (RELAMP-1/2/3; a R-1 é a edição ativa e a
ESPECIAL-AIRFRYER é especial — ambas excluídas, como sempre).

### SEG0 — o código, como estava

| Medida | Valor | Prova |
|---|---|---|
| Prateleira única | «🗓️ Outras Edições» | `Dashboard.jsx:485` (antes) |
| Filtro da prateleira | `e.id !== EDICAO_ATIVA && !ehEspecial(e.id)` | `Dashboard.jsx:151-153` (antes) |
| Filtro por `tipo` | **inexistia** no Início | — |
| `tipo` disponível? | sim, normalizado para `"programado" \| "relampago"` | `useEdicoes.js:83` |
| Padrão já existente na casa | `filter((e) => e?.tipo === "programado")` | `OfertasProgramadas.jsx:58` |
| Título dentro de vidro | sim (veio do UTAC107c) | `Dashboard.jsx:484` |

---

## SEG1 — A SEPARAÇÃO

Feita numa **função pura exportada** (`Dashboard.jsx`), para poder ser medida sem render:

```js
export function prateleirasDeEdicoes(edicoes, edicaoAtiva, ehEspecialFn = ehEspecial) {
  const extra = Object.values(edicoes || {}).filter(
    (e) => e && e.id !== edicaoAtiva && !ehEspecialFn(e.id)
  );
  return {
    relampago: extra.filter((e) => e.tipo !== "programado"),
    programada: extra.filter((e) => e.tipo === "programado"),
  };
}
```

- **Critérios de exclusão INALTERADOS** (edição ativa + especiais, do MC15.4/MC94.2) — só se acrescenta o
  agrupamento por `tipo`. As duas listas somam exactamente o que somava a lista única (provado por teste).
- **`tipo` ausente ou estranho cai em `relampago`** — a MESMA regra do normalizador (`useEdicoes.js:83`),
  para que nenhuma edição desapareça do ecrã por trazer um `tipo` inesperado.
- A fonte (`edicoes` do contexto) **não foi tocada**; `useEdicoes.js` **não foi tocado**.

## SEG2 — AS DUAS PRATELEIRAS

- Um **`map` sobre um array de 2 famílias** — o markup do carrossel vive **uma só vez** (sem duplicação, e
  sem componente novo: ver «Decisões de desenho» abaixo).
- Cada prateleira: **título em `<h3>` dentro de `<GlassCard>`** (Regra 1), **sempre visível** (P-2b).
- Lista cheia → carrossel do MC99 (scroll lateral, uma edição visível, `scroll-snap`).
- Lista vazia → **`<GlassCard>` com o estado vazio** (Regra 1), sem carrossel.
- Ordem: **Relâmpago → Programada** (a do mockup aprovado).
- Textos: `⚡ Relâmpago` · `🎫 Programada` · vazios `Nenhuma edição Relâmpago em andamento.` /
  `Nenhuma edição Programada em andamento.`

### ⚠️ DESVIO DECLARADO do enunciado (o texto dos vazios)

O enunciado pede «Nenhuma edição Relâmpago **a decorrer**.» O guard de pt-BR do próprio repo
(`utac107g2-pt-br.test.mjs`) **proíbe literalmente `\ba decorrer\b`** (`PT_PT_I`). Com a ressalva 4 do
enunciado («pt-BR sempre») a decidir, usei a forma que o app **já usa** — «**em andamento**»
(`CartaoEdicao.jsx:36`). Não é preferência: é a única das duas que não faz a suíte vermelha.

### Decisão de desenho: NÃO criei `PrateleiraEdicoes.jsx` (o enunciado autorizava, se útil)

Declaro porquê, em vez de o deixar implícito:
1. A guarda do **MC99** mede o **código-fonte do `Dashboard.jsx`** (bloco com `display:"flex"`,
   `overflowX:"auto"`, `scrollSnapType`…) e o seu mutador MUT1 substitui essa string. Extrair a prateleira
   para um componente novo obrigaria a mudar o alvo da guarda **e** do mutador.
2. O markup da prateleira é **um só** graças ao `map` — não há duplicação a eliminar com um ficheiro extra.
3. O Início já tem **teste de render** próprio (`Dashboard.test.mjs`, com stubs); uma prateleira isolada
   precisaria de um segundo arnês para provar menos.
⇒ Manguei a guarda do MC99 **de nome** (`outras-edicoes-scroll` → `prateleira-scroll`) e actualizei o
mutador para apontar ao nome novo, **mantendo a guarda a morder** (provado em §SEG3).

---

## SEG3 — TESTES + MUTAÇÃO

`Dashboard.test.mjs` + `mc99-limpeza-ui.test.mjs` → **60/60 VERDE**.

Testes **actualizados** (o título «Outras Edições» deixou de existir):
- «as prateleiras continuam a mostrar as outras edições» — agora ancora na prateleira e no `<h3>`.
- «Regra 1: os títulos das DUAS prateleiras ficam DENTRO de vidro» — mede **cada `<h3>`**, não uma contagem
  na página (o «⚡ Relâmpago» também aparece como **rótulo** no card da Edição Ativa, `Dashboard.jsx:434`).
- «a especial NÃO é desenhada TAMBÉM nas prateleiras»: a asserção antiga era `doesNotMatch /Outras Edições/`
  — com o título removido, essa forma passaria **VERDE por aritmética**. Substituída por uma medição do
  alvo (a especial não pode aparecer depois da 1.ª prateleira).

Testes **novos**: ordem das prateleiras; cada prateleira só com a sua família (+ nenhuma edição duplicada);
P-2b com as duas listas vazias; P-2b com uma cheia e outra vazia; Regra 1 do estado vazio; ativa/especial
fora das prateleiras; e 4 testes da função pura.

### Mutação (GATE 7/8) — 4 mutações, todas mordem

| # | Mutação | Veredicto | Testes que caíram |
|---|---|---|---|
| M1 | remover a separação (tudo numa prateleira) | **RED ✓** (3 falhas) | «cada prateleira mostra SÓ a sua família» + 2 da função pura |
| M2 | esconder o título quando a lista está vazia | **RED ✓** (3 falhas) | «Regra 1: os títulos das DUAS prateleiras» + os 2 testes de P-2b |
| M3 | trocar os tipos | **RED ✓** (4 falhas) | «cada prateleira mostra SÓ a sua família» + 3 da função pura |
| M4 | trocar o título da 1.ª prateleira | **RED ✓** (3 falhas) | «renderizam as DUAS prateleiras, na ordem» + 2 |

**Restauro byte-idêntico:** `md5` antes = `md5` depois = `a9ca771cd9c6bb55ba4c83f6395c8a01` ✓.

### ⚠️ Erros do MEU instrumento nesta frente (declarados)

1. **Li o `exit_code` do fim do pipeline** (`... | grep | tr`) em vez do `node --test` — o `tr` devolve
   sempre 0, e a minha 1.ª leitura concluiu «NAO MORDE» nas 4 mutações quando elas **mordiam** (3/3/4/3
   falhas). Corrigido lendo o **número de falhas** da própria saída. Uma mutação que parece não morder
   pode ser só um instrumento mal apontado.
2. **A 1.ª versão do meu teste novo estava errada, não o código:** ancorei o controlo em
   `data-testid="prateleira-scroll"` num cenário em que as duas listas ficam **vazias** — logo só existe
   `prateleira-vazia` e o controlo rebentou («as prateleiras não renderizaram»). A asserção de controlo
   apanhou o meu erro; a âncora passou a `prateleira-`.
3. **A 1.ª corrida da mutação não casou nenhuma substituição** (ficheiro CRLF, padrões com `\n`) — o
   `assert count == 1` da própria mutação apanhou-o. Um `replace` que não casa é uma mutação que não testa.

---

## SEG4 — VERIFICAÇÃO PONTA A PONTA

| Verificação | Resultado |
|---|---|
| Suíte canónica | frontend **VERDE 909/909** (era 899: +10 testes meus) · backend **VERDE 1095/1101** |
| `npx vite build` | **exit 0**, 14,43 s |
| Chunk do Início | `PrivyRoot-BTiCONVL.js` com «⚡ Relâmpago» ×4, «🎫 Programada» ×1, `prateleira-scroll` ×1, `prateleira-vazia` ×1, «Nenhuma edição Programada em andamento» ×1 |
| `package-lock.json` / `package.json` | **intactos** (`git status` limpo nesses ficheiros) |
| Ficheiros tocados | só os 4 previstos |

### ⚠️ Erro do MEU instrumento (3.º da ronda)

A 1.ª medição do build deu «🎫 Programada ×0» **e** «Outras Edições ×1» — parecia que o build não levava o
título novo. Medido por Python: os títulos **estão** lá. A causa do «0» foi **`grep` de emoji falhar em
silêncio** neste ambiente (devolve 0 sem erro) — armadilha já conhecida e ainda assim accionada. O «Outras
Edições ×1» era **real mas noutro sítio**: `src/i18n/pt.js:35`, a chave `dash.outrasEdicoes`, que ficou
**órfã** (ver achado latente).

### Achado latente (não é causa, não bloqueia)

`src/i18n/pt.js:35` mantém `"dash.outrasEdicoes": "🗓️ Outras Edições"` — chave que **já ninguém usa** (o
título era escrito à mão no `Dashboard.jsx`). Fica para o **UTAC108h (limpeza geral)**, já previsto na
ordem da série. Não toquei nela: o enunciado não autoriza `i18n`, e apagar uma chave sem medir os
consumidores é exactamente o erro que o UTAC108h.1 documentou.

---

---

## SEG5 — VALIDADOR ADVERSARIAL

**VEREDICTO: ✅ APROVADO — 0 bloqueantes** (`deleg_2d6cafac`, worktree `C:\Users\Moltbot\tmp-108h2-val\wt`
@ `e737930`). Veredicto integral verbatim: `_logs/UTAC108h.2_SEG5_VALIDADOR.md`.

Tentou derrubar os **10** alvos do enunciado (a)–(j) e **nenhum se reproduziu**. Reproduziu por execução:
âmbito do commit (só os 4 ficheiros; 0 `.bak-*`, 0 `netlify/`), os testes do Dashboard (**43/43**), a suíte
canónica (**909/909 + 1095/1101**) e a ausência de referências executáveis ao código antigo
(`edicoesExtra`, `outras-edicoes-scroll/-item`) — as que restam são **comentários**, com o rename documentado.

**Notas ℹ️ que aceito (nenhuma bloqueia):**
- chave i18n `dash.outrasEdicoes` órfã — **já declarada** por mim em §SEG4 (vai para o UTAC108h);
- `"programado"` (chave interna) vs «🎫 Programada» (texto) — cosmético, alinhado com o resto do app;
- `outras-edicoes-scroll` sobrevive em **comentário** (documenta o rename) — pode induzir um `grep` ingénuo;
- o Início passa a mostrar **sempre** 2 prateleiras, mesmo sem edições — efeito **declarado** da P-2b;
- backend 1095/1101 (6 não-pass) — baseline **pré-existente**, não introduzido aqui.

**O que o validador NÃO mediu** (e eu medi): o mutador `MUT1`. A instrução dele proibia escrever no repo,
por isso limitou-se a lê-lo. **Eu corri as 4 mutações** e todas mordem (§SEG3) — a evidência está fechada.

---

## SEG6 — DEPLOY + REGISTO

| Passo | Medido |
|---|---|
| Bundle em produção **antes** | entry `assets/index-DnPRjG5D.js` |
| Push | `c929c6e..e737930` → `origin/main` = `e737930` |
| Site depois | **HTTP 200** (5 062 B) |
| Bundle mudou? | **SIM** — entry `assets/index-TvfL10s1.js` |
| Chunk do Início | `PrivyRoot-B4GSJVIh.js` — `prateleira-scroll` ×1, `prateleira-vazia` ×1, `prateleira-item` ×1, «⚡ Relâmpago» ×4, «🎫 Programada» ×1, os **dois** textos de vazio ×1, **«Outras Edições» ×0** |
| `package-lock.json` / `package.json` | **intactos** (`git status` sem esses ficheiros, antes e depois) |

**Produção = commit.** E, como a P-3 previu, a prateleira «🎫 Programada» está **no ar, visível e vazia** —
com o estado vazio dentro de vidro, que é exactamente a decisão P-2b exercida no ecrã real.

### Fecho

- **HI5:** 11:47 → 12:2x (dentro do limite de 1 h 30 declarado no enunciado).
- **Validador:** **APROVADO, 0 bloqueantes**.
- **Estado:** implementado, verificado, em produção. Nada por arrumar.
