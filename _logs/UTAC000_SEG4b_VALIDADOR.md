# UTAC000 — SEG4b · Validador adversarial (2.ª ronda) — commit `04ce7d6` (2026-09-30)

Subagente independente, instruído a **TENTAR REFUTAR** — não confirmar. **Nada foi alterado no
repo**; todos os artefactos novos ficaram em `C:/Users/Moltbot/tmp-utac000v2/` (a única escrita no
repo é este ficheiro, autorizado). Commit validado: **`04ce7d6`** (HEAD de `main`, limpo em
`skills/utac01/**` e nos logs). Antecessor: `c1b2d94`. Baseline da série: `160bf09`.

**Veredito: APROVADO COM RESSALVAS — 0 bloqueantes.**
(4 achados ⚠️ — dois deles regressões/omissões introduzidas por este próprio commit — · 8 notas ℹ️ ·
3 alegações do commit **REFUTADAS** · 1 achado anterior [⚠️1] **não refutável**.)

---

## Resumo do mérito

O que este commit tinha de fazer, fez: os 9 ficheiros de regras são **cópia fiel** do adendo
(verificação independente, byte a byte, abaixo), as correcções de **⚠️1** (numeração dos HARD GATES)
resistem a todas as minhas tentativas de refutação, os números declarados nos logs batem todos com o
disco, o escopo é cirúrgico e a suíte continua verde (medida por mim). **Mas** o commit deixou três
referências mortas/contraditórias dentro do próprio pacote — uma delas quebra a **composição** da
skill (provada por execução) — e não aplicou a instrução do adendo sobre o
`Desktop/UTAC000-RELATORIO.md`.

---

## Reproduzido por execução (pelo validador)

### 1. Escopo cirúrgico (GATE 3 / GATE 15) — **não refutado**
```
$ git diff --name-status c1b2d94 04ce7d6     # 31 entradas: 13 A · 1 D · 17 M
$ git diff --name-only 160bf09 04ce7d6 | grep -v '^desafio-gut/frontend/skills/utac01/' \
    | grep -v '^_logs/UTAC000'               # → NADA
$ git diff --name-status 160bf09 04ce7d6 -- '_logs/MC*' 'CLAUDE.md' \
    'desafio-gut/frontend/package-lock.json' # → vazio
```
Só entram `desafio-gut/frontend/skills/utac01/**` e `_logs/UTAC000_*.md`. **Zero diff** em
`CLAUDE.md`, `package-lock.json`, `_logs/MC*` e código de produção. A modificação pré-existente
` M desafio-gut/frontend/package-lock.json` **não** pertence a este commit. ✔
`git status --porcelain` no `utac01` e no `SEG0.md` → **vazio** (o commit está integralmente
aplicado; `git hash-object` do `spec-template.yml` == `git rev-parse 04ce7d6:…` = `82ed98235…`).

### 2. Fidelidade ao adendo — **9/9 blocos idênticos** (crítica de fidelidade, o teste mais duro)
Extraí os 9 blocos de `tmp-utac000/adendo.md` (com `.replace(b"\x00", b"")` e sem `\r`) e comparei-os
**linha a linha** com `protocol/regras/*.md`:
```
E-engenharia 48 linhas EXACT MATCH: True    S-seguranca 31 linhas EXACT MATCH: True
T-testes     30 linhas EXACT MATCH: True    A-ambiente  40 linhas EXACT MATCH: True
G-git-deploy 30 linhas EXACT MATCH: True    P-processo  32 linhas EXACT MATCH: True
L-lgpd       31 linhas EXACT MATCH: True    AU-autonomia 24 linhas EXACT MATCH: True
                                            ST-stop     44 linhas EXACT MATCH: True
```
Contagens medidas (regex `^## <PREFIXO><n> — ` e paridade com `Origem:`):
`E=9 · T=5 · G=6 · L=6 · S=6 · A=8 · P=7 · AU=4 · ST=10` → **61**, todos com ID + texto + `Origem:`
(**0** ficheiros com ID ≠ nº de `Origem:`). **Nenhuma regra a mais, nenhuma a menos, nenhum desvio de
texto.** `grep -rn "este MC\|neste MC\|MC anterior" protocol/regras/` → **NENHUM**. ✔

### 3. `protocol/regras.md` removido · `regras-legado.md` presente e completo — **não refutado**
```
$ ls protocol/            # ambiente.md contexto.md hard-gates.md licoes.md regras/ regras-legado.md
$ ls protocol/regras.md   # No such file or directory
```
O mapa do legado tem **20 linhas** (R1..R20, verificado por regex) — completo, com o desvio ao texto
literal do adendo **declarado** em `_logs/UTAC000_SEG0.md` §A.4 (`R12`/`R13` existem; `R11`/`R17`
lacuna). ✔ **mas ver ⚠️2b e ⚠️4' abaixo.**

### 4. ⚠️1 (numeração dos HARD GATES) — **NÃO consegui refutar**
```
$ grep -rn "HG[0-9]" . | grep -v hard-gates.md      # → NENHUM
$ grep -rho "GATE [0-9]\+" . | grep -v hard-gates   # 43 ocorrências numeradas — todas com o sentido canónico
```
*(o `grep -rno "GATE [0-9]*"` dá 44 matches fora do `hard-gates.md` porque apanha também o «HARD GATE
(`gate | resultado`)» do `segments/seg5-6.md:15`, que não tem número.)*
Revi **uma a uma** as 43 ocorrências de `GATE <n>` fora do `hard-gates.md` e nenhuma usa o número com
o sentido da série: `GATE 1`=medir · `GATE 2`=não inventar · `GATE 3`=escopo · `GATE 4`=preservar ·
`GATE 5`=ponytail («alteração mínima») · `GATE 6`=uma frente · `GATE 7`=mutação · `GATE 8`=bidirecional ·
`GATE 9`=validador · `GATE 10`=commit foreground · `GATE 11`=fechar · `GATE 12`=não concebe/escala ·
`GATE 15`=não alterar UTACs fechados · `GATE 16`=exemplo funcional. Os rótulos da série
(`HG13 (concorrência)`, `(HG15)`, `HG2 (A/B)`, `HG4`, `(HARD GATE 2)`) **desapareceram** — o
`types/produto.md` passou a `Concorrência (T4)`, o `types/infra.md` a `(ST3 / HARD GATE 12)`, o
`types/diagnostico.md` a `A/B pareado (E8)` e `GATE 3`, o `segments/seg0-3.md` a `(E8)`.
A tabela de alias do `hard-gates.md` (l.14-25) **confere com o que medi na série**:
`MC104.2-RELATORIO.md:16` HG2 A/B · `:20` HG13 fiscal · `:21` HG14 sem apagar ·`MC104.3:27` HG15 hash ·
`MC105a:28` HG13 concorrência · `:30` HG15 migração · `:29` HG14 nunca negativo · `:31` HG16 on-chain.
Teste da parte, corrido por mim (`node tmp-utac000/utac000-teste-gates.mjs`): **VERDE** + controlo
positivo (`types/produto.md:HG13 (concorrência) → APANHADO`, `segments/seg0-3.md:GATE 2 (A/B) →
APANHADO`), exit 0. ✔ *Este é o achado que o commit alega fechar e **fecha** — com uma reserva (ℹ️4).*

### 5. ⚠️2 (R12/R13) — corrigido no sítio principal, **re-introduzido noutro** (ver ⚠️2b)
Medições próprias, lidas no disco (não copiadas do validador anterior):
```
_logs/MC00.0-RELATORIO.md:163  ### 3.4 Registo operacional (R13)      :173  | **R13 — registo** | Esta secção. |
_logs/MC93-RELATORIO.md:93     ### 3.2 Registo operacional (R13)
_logs/MC93B-RELATORIO.md:74    «Execução é do operador (R12/R5)»      :83   ### 3.4 Registo operacional (R13)
_logs/MC93C-RELATORIO.md:75    ### 3.3 Registo operacional (R13)
```
A tabela do `MC00.0` usa R1/R2/R3/R4/R5/R6/R14/R16 com nomes **idênticos** aos da skill, e o
`MC93B:75` cita «R2 reativada» no sentido de custo ⇒ é o **mesmo namespace** R1..R20. Logo R12 e R13
existem: a correcção em `regras-legado.md` (e a declaração do desvio em SEG0 §A.4) é **correcta**.
R11/R17: ver ⚠️4'.

### 6. ℹ️3-ℹ️8
```
ℹ️3  licoes.md:3-5  → range uniformizado («duas janelas: MC100…MC105a.1 primária + MC72…MC99.5.3 património»)  ✔
ℹ️4  grep -rn "protocol/segments" .        → NENHUM                                        ✔ (mas ver ⚠️1')
ℹ️5  grep -rn "references/" .              → NENHUM                                        ✔
ℹ️6  protocol/contexto.md:51               → «correr da raiz do repo: node scripts/…»        ✔ (parcial — ℹ️8b)
ℹ️7  _logs/UTAC000_SEG-1_MEDICAO.md está agora versionado (M no diff; :35-40 com 530/530 · 885/891)  ✔
ℹ️8  segments/seg4.md:3 «(HARD GATE 9)»  (o «R16» desapareceu) · spec-template.yml:4 «< 60 linhas» ✔/✗
```
ℹ️8 fica **meio corrigido**: o template passou a «< 60 linhas», mas o `exemplo.spec.yml:18` mantém
«um spec de **~35 linhas**» tendo o ficheiro **66 linhas** (`wc -l`), e o `SKILL.md:13` diz «menos de
60». Estimativa incoerente com o `wc -l` ⇒ **ℹ️1**. O `spec-template.yml` tem **93** linhas — logo
«menos de 60 linhas» é um alvo, não o tamanho do template (aceitável).

### 7. YAML — válido, 3 campos novos, prova de mutação **repetida por mim**
`pyyaml 6.0.3` (`tmp-utac000v2/v2-valida-spec.py`, saída em `v2-valida-spec_saida.txt`):
```
OK  a)  exemplo.spec.yml     → YAML válido + schema OK (9 obrigatórios presentes, type=diagnostico)
OK  a2) spec-template.yml    → YAML válido + schema OK
OK  novos campos: exemplo.spec.yml    regras_activas=[E,T,G,L,S,A,P,AU,ST] extra=[E9,T2] stop=[ST2,ST4]
OK  novos campos: spec-template.yml   regras_activas=[E,T,G,L,S,A,P,AU,ST] extra=[]     stop=[]
OK  M1 sem baseline (exemplo)   → RED  ['campo obrigatorio ausente/vazio: baseline']
OK  M2 type=inventado           → RED  ['tipo desconhecido: inventado']
OK  M3 sem proibe (template)    → RED  ['campo obrigatorio ausente/vazio: proibe']
RED M4 regras_activas=['Z']     → VALIDO (o schema NÃO valida categorias/IDs)   ← ℹ️5
OK  e) controlo negativo do parser → ParserError (esperado)
```
Os 3 mutantes ficam RED e o original fica VÁLIDO ⇒ o medidor distingue (controlo positivo implícito).
Os 3 campos novos existem nos 2 ficheiros e o `exemplo.spec.yml` usa a nova nomenclatura por ID. ✔
*(Divergência literal pequena: o adendo escreve `stop_conditions_extra: [ST3, ST5]`; o template
traz `[]` com `ST3/ST5` em comentário — ℹ️7.)*

### 8. Suíte (GATE 4) — **VERDE**, medida por mim
```
$ cd C:/Users/Moltbot/Desktop/DESAFIOGUT && node scripts/mc966-suite-harness.mjs ambos   (raiz do repo)
frontend: VERDE 530/530 pass
backend:  VERDE 885/891 pass
VEREDITO: VERDE
```
Idêntico ao que o validador do SEG4 mediu em `c1b2d94` ⇒ **nenhuma regressão introduzida** por este
commit. ✔

### 9. GATE 16 — `exemplo.UTAC.md`
**8 secções** (CONTEXTO · HARD GATES · REGRAS · FRENTES · SEG-1 · SEG0-SEG3 · SEG4 · SEG5-SEG6 —
contadas por regex sobre os pares `═══`) + **3 blocos** (RESSALVAS · BOULDER LOOP/ARRANQUE · ENTREGA).
Regras **categorizadas** (E1-E9 … ST1-ST10, com as contagens certas) e o cabeçalho declara-se exemplo
**não executado** com placeholders «n/n» (GATES 2 e 16). Caminhos citados dentro do pacote:
`types/diagnostico.md`, `protocol/hard-gates.md`, `segments/seg-1.md`, `segments/seg0-3.md`,
`segments/seg4.md`, `segments/seg5-6.md` — **todos existem** (19 caminhos resolvidos; os restantes são
`CLAUDE.md`, `_logs/…`, `Desktop/…` e ficheiros de produção, que existem fora da pasta da skill). ✔
**Excepto** o ID de regra `P10` (⚠️3').

---

## Achados e tratamento

| # | achado | evidência (medida por mim) | tratamento |
|---|---|---|---|
| ⚠️1' | **Referência morta no próprio template: `spec-template.yml:40` lista `protocol/regras.md` nos entregáveis da FRENTE A — o ficheiro foi DELETADO por este commit.** E a lista de composição do script do SEG6 (`tmp-utac000/utac000-valida-spec.mjs`, alvos `protocol/regras.md`) também não foi actualizada, pelo que **a skill já não compõe um UTAC válido**. É a mesma classe do ℹ️4 (caminho quebrado), no ficheiro mais central. | `grep -rn "regras\.md" .` → `spec-template.yml:40` · `ls protocol/regras.md` → não existe · `node utac000-valida-spec.mjs caso1-valido.yml` → **`RED caso1-valido.yml -> COMPOSICAO-INCOMPLETA protocol/regras.md` (FALHAS: 1)** | Trocar `protocol/regras.md` → `protocol/regras/` (e `protocol/regras-legado.md`) na lista `entrega` (1 linha) e na lista de alvos do script ad-hoc. Sem isto a afirmação «exemplo funcional» (GATE 16) só é verdadeira por leitura, não por execução. |
| ⚠️2' | **Ficheiro CRIADO neste commit re-afirma a alegação refutada.** `_logs/UTAC000_REGISTO-CLAUDE.md:26` — que é o **texto proposto para colar no `CLAUDE.md`** (fonte única de verdade) — diz «**Lacuna declarada:** R11/R12/R13/R17 não existem nos UTACs-fonte». É exactamente a frase do ⚠️2 do SEG4, já corrigida no `regras-legado.md`/SEG0 §A.4. O pacote passa a **contradizer-se a si próprio**, e a contradição vive no texto destinado ao `CLAUDE.md`. | `grep -n "R11" _logs/UTAC000_REGISTO-CLAUDE.md` → `:26` (ficheiro novo em `04ce7d6`) vs `regras-legado.md:10-16` («R12 e R13 EXISTEM») | Reescrever a linha 26 no mesmo sentido do `regras-legado.md` (1 linha). |
| ⚠️3' | **ID de regra irresolúvel dentro do pacote: `P10`.** `exemplo.spec.yml:20` e `exemplo.UTAC.md:4` citam «HARD GATE 16 / **P10**», mas a categoria P tem **P1-P7** e nenhum ficheiro do pacote define P10 (nem o adendo). Violação do GATE 13 (auto-contido) na mesma classe do ⚠️1: um leitor do pacote não consegue resolver o ID. (Vem já do `c1b2d94` — o validador anterior não o apanhou — e a correcção do ⚠️1 foi aplicada aos *gates* mas não aos *IDs de regra*.) | `grep -rnoE "\b(E\|T\|G\|L\|S\|A\|P\|AU\|ST)[0-9]+\b" . \| sort \| uniq -c` → **`2 P10`** e mais nenhum ID órfão (todos os outros ∈ 61) | Trocar por um ID real (`P1`? `E9`? `P5`?) ou remover o ID (1-2 linhas). |
| ⚠️4' | **`regras-legado.md:13-14` caracteriza mal a evidência de R11.** Diz que R11 aparece «só como itens de recomendação/códigos de risco fora do namespace»; medido: **R11 é citado como REGRA NOMEADA** em `MC37-plano.md:34` («Cutover anti-split-brain (**R11**)»), `desafio-gut/docs/MC39.18-escalabilidade.md:192,231` («escrita só no primário (R11)»), `cloud.md:835` («escrita exclusiva por backend (R11)») e no comentário de fonte `desafio-gut/frontend/netlify/functions/_lib/saldoRs-store.mjs:6`. A conclusão «lacuna» continua defensável **só** para o namespace MC93x/MC10x (o `MC37` usa outra era: aí R2 = «build verde», não «custo»), mas a frase entre parênteses é factualmente falsa — o mesmo tipo de erro que o ⚠️2 mandou corrigir. | `git grep -nw "R11"` → `MC37-plano.md:34,36` · `docs/MC39.18-escalabilidade.md:71,192,231` · `cloud.md:143,835` · `saldoRs-store.mjs:6` (a 2ª, `cloud.md:143`, dá a R11 um 3.º sentido: «taste-engineering») | Reescrever o parêntese: «R11 existe noutra era de numeração (`MC37`/`cloud.md`, anti-split-brain), não no namespace R1..R20 dos MC93x/MC10x». 1 linha. |
| ℹ️1 | **ℹ️8 meio corrigido:** `exemplo.spec.yml:18` mantém «um spec de **~35 linhas**» (ficheiro com **66** linhas; `SKILL.md:13` e `spec-template.yml:4` dizem «< 60»). | `wc -l exemplo.spec.yml` → 66 · `grep -rn "~35"` → `exemplo.spec.yml:18` | Trocar por «< 60 linhas» (1 linha). |
| ℹ️2 | O mesmo número errado vai no texto para o `CLAUDE.md`: `UTAC000_REGISTO-CLAUDE.md:17` «specs de **~35 linhas**». | `grep -n "35 linhas" _logs/UTAC000_REGISTO-CLAUDE.md` | Alinhar com «< 60 linhas». |
| ℹ️3 | **Instrução do adendo não cumprida e não declarada:** §RESSALVAS manda «Actualizar o `Desktop/UTAC000-RELATORIO.md` com a nova estrutura». O ficheiro **não existe** (nem em `Desktop/`, nem em lado nenhum do disco) — apesar de o commit o citar como entregável (`UTAC000_REGISTO-CLAUDE.md:21`) e de o `comandos.md`/`exemplo.UTAC.md` o exigirem no fecho. Nenhum log declara a omissão. | `find C:/Users/Moltbot -iname "*UTAC000*RELATORIO*"` → 0 · `ls Desktop/UTAC000-RELATORIO.md` → não existe · `git grep "UTAC000-RELATORIO"` → só o REGISTO-CLAUDE | Criar o relatório (ou declarar explicitamente a pendência, GATE 11). |
| ℹ️4 | A tabela de alias do `hard-gates.md` está **incompleta para HG14**: cita «sem apagar» (MC104.2) mas omite o 3.º sentido medido, `MC105a-RELATORIO.md:29` HG14 = «nunca negativo» — numa tabela cuja única função é inventariar os sentidos divergentes. | `hard-gates.md:23` vs `MC105a-RELATORIO.md:29` | Acrescentar «/ nunca negativo (MC105a)». |
| ℹ️5 | O schema `utac/1` **não valida as categorias/IDs de regras**: mutei `regras_activas: ['Z']` e o spec continuou `VALIDO`. É por este buraco que o `P10` passa silenciosamente (⚠️3'). | `v2-valida-spec.py` caso M4 → «RED … VALIDO» | Validar `regras_activas ⊂ {E,T,G,L,S,A,P,AU,ST}` e os IDs contra os 61 (opcional, 3 linhas). |
| ℹ️6 | O `Origem:` das 61 regras cita «UTAC100 … UTAC105a» (prefixo novo) mas os UTACs no repo chamam-se `MC100 … MC105a`; a equivalência só está declarada em `SKILL.md:16-17`, não em `protocol/regras/` (auto-contidão do rótulo de origem — GATE 13). | cada `regras/*.md`, campo `Origem:` vs `ls _logs/MC*` | Uma nota de 1 linha no topo de `regras/` (ou usar o nome do ficheiro-fonte). |
| ℹ️7 | Divergência literal ao adendo: ele escreve `stop_conditions_extra: [ST3, ST5]`; o template traz `[]` e os dois IDs em comentário. Declarado e aceitável, mas não é o texto do adendo. | `spec-template.yml:78-81` vs `adendo.md` §COMO APLICAR | Nada a fazer se for esta a intenção declarada; caso contrário, 1 linha. |
| ℹ️8 | ℹ️6 meio aplicado: o CWD («da raiz do repo») passou a estar em `protocol/contexto.md:51`, mas o `exemplo.spec.yml:27,50` e o `exemplo.UTAC.md:72,83` continuam a mandar correr `node scripts/mc966-suite-harness.mjs ambos` **sem indicar o CWD** — e o harness só existe na raiz. | `grep -rn "mc966-suite-harness" .` (4 sítios, 1 com CWD) | Acrescentar «(da raiz do repo)» nas 3 restantes. |

---

## Alegações do commit REFUTADAS

1. **«correcções dos achados ⚠️1/⚠️2/ℹ️3-ℹ️8»** (mensagem do commit) — **parcialmente REFUTADA.**
   ⚠️1 fechado (não refutável, ver §4). ⚠️2 fechado no `regras-legado.md`, **re-introduzido** em
   `UTAC000_REGISTO-CLAUDE.md:26` (⚠️2'). ℹ️3/ℹ️5/ℹ️6/ℹ️7 fechados. ℹ️4 («não há caminhos
   quebrados») **REFUTADO**: sobrevive um caminho morto no `spec-template.yml:40` — que **este
   commit** transformou de válido em morto ao apagar `protocol/regras.md` (⚠️1'). ℹ️8 **meio
   fechado** (ℹ️1).
2. **«exemplo funcional» / composição da skill (GATE 16)** — **REFUTADO por execução**: o script
   ad-hoc do próprio UTAC, corrido sobre o spec válido, devolve
   `RED caso1-valido.yml -> COMPOSICAO-INCOMPLETA protocol/regras.md` (exit 0, **FALHAS: 1**). A
   skill compõe a *estrutura*, mas a lista de entregáveis do template aponta para um ficheiro que já
   não existe.
3. **`regras-legado.md`: «R11 … só como itens de recomendação/códigos de risco fora do namespace»** —
   **REFUTADO** (ver ⚠️4'): R11 é citado como regra nomeada em `MC37-plano.md:34`, `docs/MC39.18-
   escalabilidade.md:192,231`, `cloud.md:835` e no comentário de `saldoRs-store.mjs:6`.

## Alegações que NÃO consegui refutar (verificadas)

- 9/9 ficheiros de regras **idênticos** ao adendo (linha a linha) · **61 regras** (9/5/6/6/6/8/7/4/10),
  cada uma com ID + texto + `Origem:`; nenhuma a mais, nenhuma a menos.
- `protocol/regras.md` ausente; `protocol/regras-legado.md` presente com o mapa R1-R20 **completo**.
- 0 `HG<n>` fora do `hard-gates.md`; as 43 ocorrências numeradas de `GATE <n>` usam todas o sentido canónico; a
  tabela de alias confere com a série; o teste de gates corre VERDE com controlo positivo.
- Tamanhos declarados em SEG0 §A.2 batem **byte a byte** (E 1597 · T 984 · G 897 · L 916 · S 959 ·
  A 1279 · P 1025 · AU 840 · ST 1249 · legado 1601 · SKILL.md 6037).
- Escopo cirúrgico (GATE 3/15): 0 diff em `CLAUDE.md`, `package-lock.json`, `_logs/MC*` e produção.
- YAML válido nos 2 ficheiros, 3 campos novos presentes, mutantes M1/M2/M3 RED, controlo negativo do
  parser OK.
- Suíte VERDE (530/530 · 885/891) — medida por mim, não pela parte.
- `exemplo.UTAC.md`: 8 secções + 3 blocos, regras categorizadas, caminhos do pacote existem,
  placeholders honestos, declarado não executado.
- `grep "este MC"` no pacote → só o texto do critério do próprio GATE 13 (`hard-gates.md:101`).

## Não medido / limites deste validador

- **Não alterei o repo** (nem temporariamente): as mutações do YAML foram feitas em memória (pyyaml) e
  o teste de gates corre só-leitura (acrescenta o mutante ao texto em memória, nunca escreve). O
  controlo positivo do `types/produto.md` foi reproduzido **executando o script da parte** e revendo-o
  linha a linha, não mutando o repo.
- Não re-corri o `utac000-seg6-verificacao.mjs` (não o li) nem o `utac000-valida-spec.mjs` como
  "medidor oficial" — usei o meu (`v2-valida-spec.py`, pyyaml 6.0.3) e, adicionalmente, corri o script
  da parte **apenas** como prova do defeito de composição (⚠️1'), declarando-o.
- Não toquei em Supabase, Netlify, produção, deploy ou APK (fora do escopo).
- O `working tree` do repo tem, **fora deste commit**, ` M package-lock.json` e ~30 `?? _logs/MC*`
  históricos (pré-existentes). Nada disso pertence a `04ce7d6`; não mexi.
- Achados por leitura de contexto de série (não execução): a classificação de "mesmo namespace" para
  R12/R13 (baseada nos nomes R1-R6/R14/R16/R2 idênticos em `MC00.0`/`MC93B`) e o inverso para R11.

## Decisão

**APROVADO COM RESSALVAS — 0 bloqueantes.** O núcleo do adendo está **entregue e fiel**: 9/9 blocos
byte-idênticos, 61 regras com ID+texto+origem, estrutura de `protocol/` correcta, escopo cirúrgico,
YAML válido com prova de mutação, suíte verde, `exemplo.UTAC.md` completo. O achado **⚠️1 do SEG4
fecha** (não o consegui derrubar). O achado **⚠️2 fecha no `regras-legado.md`**, mas foi
**re-introduzido** noutro ficheiro do mesmo commit (⚠️2'), e o ℹ️4 fica **incompleto** porque este
commit criou um caminho morto novo no `spec-template.yml` (⚠️1') — com impacto funcional provado
(a composição da skill falha por execução). **Antes do fecho do UTAC000 (GATE 11)** devem ser
corrigidos, no mínimo, os **⚠️1', ⚠️2' e ⚠️3'** (3 linhas + 1 ID), e declarada a ausência do
`Desktop/UTAC000-RELATORIO.md` (ℹ️3). Feito isto, este UTAC fecha sem ressalvas.

*Achados ⚠️ desta 2.ª ronda: **4** (⚠️1', ⚠️2', ⚠️3', ⚠️4') · notas ℹ️: **8** · alegações refutadas: **3** ·
achados do SEG4 fechados: ⚠️1 (sim) · ⚠️2 (em `regras-legado.md`; reaberto em `REGISTO-CLAUDE.md`) ·
ℹ️3 ℹ️5 ℹ️6 ℹ️7 (sim) · ℹ️4 ℹ️8 (parcialmente).*
*Artefactos do validador (fora do repo): `C:/Users/Moltbot/tmp-utac000v2/` — `v2-valida-spec.py`,
`v2-valida-spec_saida.txt`, `repro-teste-gates_saida.txt`, `repro-valida-spec_saida.txt`, `adendo.txt`.*
