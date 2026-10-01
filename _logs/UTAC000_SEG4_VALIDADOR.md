# UTAC000 — SEG4 · Validador adversarial (2026-09-30)

Subagente independente, **worktree próprio** `C:/Users/Moltbot/tmp-utac000v/wt` (detached,
`c1b2d943129ca8abf885009163030a9f3c4be1b2`), instruído a **TENTAR REFUTAR** — não confirmar.
Nada foi alterado no repo; este ficheiro é o único artefacto novo. Baseline comparado: `160bf09`.

**Veredito: APROVADO COM RESSALVAS — 0 bloqueantes.**
(2 achados ⚠️ · 8 notas ℹ️ · 3 alegações REFUTADAS — ver «Alegações REFUTADAS».)

---

## Reproduzido por execução (pelo validador)

### 1. Escopo cirúrgico e UTACs fechados intactos (GATE 3 / GATE 15)
```
$ git diff --name-status 160bf09 c1b2d94          # 25 ficheiros, todos A (nenhum M/D)
$ git diff --stat 160bf09 c1b2d94 | tail -1       # 25 files changed, 1171 insertions(+)
$ git diff --name-only 160bf09 c1b2d94 -- '_logs/MC*'                        # 0  (byte-idênticos)
$ git diff --name-status 160bf09 c1b2d94 -- desafio-gut/frontend/package-lock.json   # vazio
$ git diff --name-status 160bf09 c1b2d94 -- desafio-gut/ ':!desafio-gut/frontend/skills/utac01/'  # vazio
```
Só entram `desafio-gut/frontend/skills/utac01/**` (20 ficheiros) e `_logs/UTAC000_*.md` (5).
`CLAUDE.md`, `package-lock.json`, `_logs/MC*` e todo o código de produção: **zero diff**. ✔

### 2. Completude (GATE 14)
```
$ find <wt>/desafio-gut/frontend/skills/utac01 -type f | wc -l   # 20
$ git ls-tree -r --name-only c1b2d94 -- desafio-gut/frontend/skills/utac01/ | wc -l   # 20
$ cd <wt> && git rev-parse HEAD   # c1b2d943129ca8abf885009163030a9f3c4be1b2 (limpo)
```
20 = 5 protocolo + 6 tipos + 4 segmentos + 5 de topo, como declarado no SEG3 §3.6. ✔

### 3. Números declarados nos logs SEG0-SEG3 vs medidos (GATE 2)
Todos os 20 tamanhos de byte declarados **batem exactamente** com os ficheiros do commit:
`hard-gates 5790 · regras 2767 · licoes 3829 · ambiente 2407 · contexto 3309` ·
`types 1552/1510/1739/1809/2364/1702` · `segments 1962/1786/2017/2082` ·
`SKILL.md 4390 · comandos 2290 · exemplo.spec.yml 1659 · exemplo.UTAC.md 8498 · spec-template.yml 3183`. ✔

### 4. Os 16 nomes de HARD GATE (GATE 2)
`## GATE <n> — <NOME>` presente 1× para cada um dos 16 nomes canónicos do enunciado
(1 MEDIR ANTES DE CRIAR … 16 EXEMPLO FUNCIONAL): **16/16 correspondências exactas**. ✔

### 5. YAML válido + prova de mutação do spec (GATE 7 adaptado) — repetida por mim
Validador ad-hoc **fora do repo** (`C:/Users/Moltbot/tmp-utac000v/val.py`, parser real `pyyaml 6.0.3`):
```
a) exemplo.spec.yml (original)      -> VALIDO
a2) spec-template.yml               -> VALIDO
b) M1 mutante: remover baseline     -> ['campo obrigatorio ausente/vazio: baseline']
b2) M3 mutante: remover proibe      -> ['campo obrigatorio ausente/vazio: proibe']
c) M2 mutante: type inventado       -> ['tipo desconhecido: inventado']
c2) controlo: type=infra (real)     -> []
d) medidor distingue (só diagnostico)-> ['tipo desconhecido: lgpd']
e) controlo negativo do parser      -> ParserError
TODOS OS CASOS COMO ESPERADO (exit 0)
```
Os 3 mutantes M1/M2/M3 do SEG3 §3.5 ficam **RED** e o original fica **VÁLIDO** (controlo positivo
do medidor). Os 9 campos obrigatórios e os 2 opcionais do `spec-template.yml` estão presentes. ✔

### 6. Suíte (GATE 4 — «não alterar nada que funciona»), corrida por mim
```
$ cd C:/Users/Moltbot/Desktop/DESAFIOGUT
$ node scripts/mc966-suite-harness.mjs ambos            # foreground, saída em tmp-utac000v/suite_saida.txt
frontend: VERDE 530/530 pass
backend:  VERDE 885/891 pass
VEREDITO: VERDE                                        # exit 0
```
Nada foi quebrado pela criação da skill. Nota: **nenhum log de `c1b2d94` cita número de suíte**
(ver ℹ️7 e «Alegações REFUTADAS» A3).

### 7. Auto-contidão (GATE 13) — o foco principal
```
$ git grep -n "este MC\|neste MC\|MC anterior\|ver o MC" c1b2d94 -- .../skills/utac01/
protocol/hard-gates.md:84: ... não há «ver o MC anterior».        # ← é o texto do próprio critério do GATE 13
```
**Zero referências que exijam ir buscar a série.** As 53 ocorrências de números `MC...` no pacote são
**citações de origem** (`*(MC102.1b)*`, `*(MC104.3)*`, «Exemplos: UTAC102 …»), sempre acompanhadas do
conteúdo: um leitor sem a série percebe a lição/armadilha sem abrir o MC. A alegação do SEG0 §0.7(c)
(«0 referências reais») **reproduz-se**. ✔

### 8. Caminhos citados (GATE 1/2)
```
$ git grep -o "protocol/[a-z0-9/.-]*\|segments/[a-z0-9/.-]*\|types/...\|references/..." c1b2d94 -- .../utac01/
exemplo.UTAC.md: protocol/segments/seg-1.md · seg0-3.md · seg4.md · seg5-6.md     ← 4 caminhos QUEBRADOS
licoes.md:8:  (`../references/` do projeto)     seg4.md:9: (`references/` do projeto)  ← 2 ponteiros mortos
```
`protocol/` contém só 5 `.md` (hard-gates, regras, licoes, ambiente, contexto) — não existe
`protocol/segments/`. E não existe `references/` dentro de `skills/` (nem na raiz do projecto:
só em `.claude/skills/*/references`). Achados ℹ️4 e ℹ️5.

### 9. Exemplo vs UTAC real (GATE 16)
`exemplo.UTAC.md`: **8 secções em caixa ═══** (CONTEXTO · HARD GATES · REGRAS+ARMADILHAS · FRENTES ·
SEG-1 · SEG0-3 · SEG4 · SEG5-6) + 3 blocos finais (RESSALVAS · BOULDER LOOP/ARRANQUE · ENTREGA) →
o «8/8 secções» do SEG3 §3.5 reproduz-se. Comparado com um UTAC real fechado
(`_logs/MC105a-RELATORIO.md`: Veredito · O que existe agora · Decisões R18 · Provas `gate|resultado` ·
Pendências (não executadas)) e com `MC104.3_SEG4_VALIDADOR.md` (Veredito · Reproduzido por execução ·
Achados e tratamento ⚠️/ℹ️): **nada essencial falta** — os itens do relatório de fecho são exigidos no
bloco SEG5-6. Honestidade verificada: o ficheiro **declara-se exemplo não executado** e usa `«…»/«n/n»`
como placeholders em vez de números inventados (GATES 2 e 16). ✔

### 10. R11/R12/R13/R17 (GATE 2 — lacuna declarada)
```
$ git grep -nw "R11\|R12\|R13\|R17" c1b2d94 -- _logs/MC10*        # VAZIO (0 ocorrências)
```
Na janela declarada (`MC100 … MC105a.1`) a ausência **confirma-se**. Fora dessa janela, na **mesma
série de regras R1..R20**: `_logs/MC00.0-RELATORIO.md:173` «| **R13 — registo** | Esta secção. |»
(tabela cujos R1/R2/R3/R4/R5/R6/R14/R16 têm nomes **idênticos** aos da skill), `MC93-RELATORIO.md:93`,
`MC93B-RELATORIO.md:83`, `MC93C-RELATORIO.md:75` («Registo operacional (R13)»), `MC93B-RELATORIO.md:74`
«Execução é do operador (**R12**/R5)», `MC93C_SEG4_VALIDACAO-A.txt:518`. Achado ⚠️2.

### 11. HG2 / HG13 / HG15 na série (GATE 2)
```
MC104.2-RELATORIO.md:16   HG2 A/B pareado
MC104.3-RELATORIO.md:23   HG2 A/B pareado
MC105a-RELATORIO.md:25    HG2 A/B
MC104.2-RELATORIO.md:20   HG13 fiscal          MC105a-RELATORIO.md:28  HG13 (10 cliques simultâneos)
MC104.3-RELATORIO.md:27   HG15 hash            MC105a-RELATORIO.md:30  HG15 (SQL/migração)
```
Confirma o que o próprio UTAC000 mediu (SEG0 §0.1): **na série, o significado dos HG varia**. O problema
não é a série — é o pacote publicar **ao mesmo tempo** o mapa canónico e rótulos da série em conflito.
Achado ⚠️1.

---

## Achados e tratamento

| # | achado | evidência (medida) | tratamento proposto |
|---|---|---|---|
| ⚠️1 | **O mesmo número de HARD GATE aparece com dois significados incompatíveis dentro do próprio pacote.** `protocol/hard-gates.md` fixa 2 = NÃO INVENTAR, 13 = AUTO-CONTIDO, 15 = NÃO ALTERAR OS UTACs FECHADOS; mas `segments/seg0-3.md:19` diz «A/B pareado (**HARD GATE 2**)», `types/diagnostico.md:8` «**HG2 (A/B)**», `exemplo.UTAC.md:36` «**HG2 (A/B)**» (3 linhas abaixo da lista que diz «2 NÃO INVENTAR»), `types/produto.md:10` «**HG13 (concorrência)**», `types/infra.md:7` «**HG15 (migração)**», `types/diagnostico.md:12` «**HG4** proibição reforçada». E `hard-gates.md:10-11` apresenta como prova do mapa uma lista da série cuja HG2 é «A/B» — ou seja, a prova citada **contradiz** o que diz confirmar. | grep acima; série mede HG2=A/B (3 relatórios), HG13=fiscal/concorrência, HG15=hash/migração | Corrigir a documentação **antes do fecho** (é defeito, não doutrina: o mesmo `seg-1.md:31` usa GATE 2 no sentido canónico). Opções para o operador (R20 — o executor não escolhe): (a) renomear os rótulos (6 linhas, 4 ficheiros) para os nomes canónicos; (b) manter os números da série e acrescentar em `hard-gates.md` a tabela «número → significado na série → nome canónico»; (c) retirar o prefixo numérico dos itens em `types/`. Teste + mutante: compor 1 UTAC de cada tipo e asserir que nenhum `HG<n>`/`GATE <n>` aparece com 2 significados (repor o rótulo antigo → RED). |
| ⚠️2 | **Lacuna declarada como «medida (não inventada)» que as fontes primárias desmentem.** `protocol/regras.md` afirma que «R11, R12, R13 e R17 não aparecem em nenhum UTAC dos ficheiros-fonte». Verdadeiro só para a janela estreita `MC100…MC105a.1`; **R13 e R12 existem** na série do repo, no mesmo namespace (R1..R20) cujos nomes R1-R6/R14/R16 a skill reproduz à letra. | `_logs/MC00.0-RELATORIO.md:173`, `MC93-RELATORIO.md:93`, `MC93B-RELATORIO.md:74,83`, `MC93C-RELATORIO.md:75`; `grep -w` em `_logs/MC10*` → vazio | Reescrever a nota para o que foi medido: «ausentes na janela MC100…MC105a.1» + declarar que R13 aparece como «registo operacional» em MC00.0/MC93x e R12 como «execução pelo operador» em MC93B (2-3 linhas). Não exige tocar em UTAC fechado. |
| ℹ️3 | **Range de fontes inconsistente entre ficheiros do mesmo pacote:** `hard-gates.md`/`regras.md` dizem «MC100 … MC105a.1»; `licoes.md` diz «MC98 … MC105a.1» e cita MC72, MC99.1, MC99.5.1, MC98. | cabeçalhos dos 3 ficheiros + citações | Uniformizar a frase do range (1 linha por ficheiro) e indicar que as citações mais antigas vieram por referência. |
| ℹ️4 | **4 caminhos quebrados** no `exemplo.UTAC.md`: «(protocol/segments/seg-1.md)», «(protocol/segments/seg0-3.md)», «(protocol/segments/seg4.md)», «(protocol/segments/seg5-6.md)». O caminho real é `segments/…`; `protocol/` tem só 5 ficheiros. | grep do ponto 8; `ls protocol/` | Substituir `protocol/segments/` → `segments/` (4 linhas). Num exemplo que serve de prova, um caminho inexistente é o pior sítio para o ter. |
| ℹ️5 | **2 ponteiros mortos para `references/`:** `licoes.md:8` «(ver `../references/` do projeto)» e `seg4.md:9` «…(`references/` do projeto o passo exacto)» — não existe `references/` em `skills/` nem na raiz do projecto (só dentro de `.claude/skills/*/`). O conteúdo em volta basta-se sozinho (o passo do worktree está escrito por extenso), mas o ponteiro obriga o leitor a sair do ficheiro (GATE 13). | `ls desafio-gut/frontend/skills/` → só `utac01`; `find -name references` | Remover as duas referências ou substituí-las pelo comando concreto (`git worktree add <path> <sha> --detach`). Frase do `seg4.md:9` está também sintacticamente truncada. |
| ℹ️6 | **Caminho do harness ambíguo.** `protocol/contexto.md` descreve `scripts/` dentro da árvore do **frontend** e logo a seguir nomeia o harness `scripts/mc966-suite-harness.mjs`; o harness vive na **raiz do repo** (`./scripts/mc966-suite-harness.mjs`) e `desafio-gut/frontend/scripts/` existe mas **não** o contém. O `exemplo.spec.yml` repete `node scripts/mc966-suite-harness.mjs ambos` sem indicar o CWD. | `find` do harness; `ls desafio-gut/frontend/scripts/` (20 ficheiros, sem harness); fonte do harness resolve `FE = <raiz>/desafio-gut/frontend` | Uma linha: «correr da **raiz** do repo:`node scripts/mc966-suite-harness.mjs ambos`». |
| ℹ️7 | **Nenhum log do commit mede a suíte.** `_logs/UTAC000_SEG-1_MEDICAO.md` (em `c1b2d94`) não cita número de suíte; o número só existe numa **edição não commitada** (+7 linhas, `git status` → ` M _logs/UTAC000_SEG-1_MEDICAO.md`) que declara «frontend 530/530 · backend 885/891». Eu medi o mesmo. Ou seja: a afirmação é **verdadeira**, mas em `c1b2d94` não tem lastro versionado (GATE 14). | `git diff --name-only 160bf09 c1b2d94 \| grep 530` → 0; `git diff -- _logs/UTAC000_SEG-1_MEDICAO.md` → +7 linhas | Commitar o aditamento (ou medi-lo no SEG6 e citá-lo lá), dentro do escopo autorizado. |
| ℹ️8 | **Acoplamentos e grandezas menores, não medidos na origem:** `segments/seg4.md:3` escreve «Obrigatório (HARD GATE 9 / **R16**)» — R16 é *mutação*; o validador dos relatórios é sempre citado como HG9/R8-R9. E o `spec-template.yml` diz «um spec completo tem ~35 linhas» quando `exemplo.spec.yml` tem **56** linhas e o próprio template **81**. | grep do ponto 10 acima; `wc -l` | Corrigir o acoplamento (1 linha) e trocar «~35» por «< 60 linhas» ou remover a estimativa. |

---

## Alegações REFUTADAS pelo validador

1. **A1 — «o mapa posicional é confirmado pela série»** (`hard-gates.md:10-11`) — **REFUTADA.**
   A lista citada como prova (`HG1 medir · HG2 A/B · …`) atribui a HG2 o significado «A/B», que
   contradiz o GATE 2 do mapa abaixo («NÃO INVENTAR»); a série confirma a *existência* da numeração,
   não os *nomes*. A frase é uma confirmação sem base no que mediu.
2. **A2 — «R11, R12, R13 e R17 não aparecem em nenhum UTAC dos ficheiros-fonte»** (`regras.md`) —
   **REFUTADA** para R13 e R12: existem, com o mesmo namespace R1..R20, em `MC00.0-RELATORIO.md:173`
   («R13 — registo»), `MC93-RELATORIO.md:93`, `MC93B-RELATORIO.md:74,83`, `MC93C-RELATORIO.md:75` e
   `MC93C_SEG4_VALIDACAO-A.txt:518`. Verdadeira apenas dentro da janela `MC100…MC105a.1` — janela que a
   própria skill não aplica de forma consistente (ℹ️3). Nota: **R11 e R17** não foram encontrados como
   regras (R11/R17 aparecem só como *itens de recomendação* em `docs/MC8x-*.txt` e como códigos de risco
   em `MC00.0_SEG3`, o que **não** é o namespace das regras) — para esses dois a lacuna resiste.
3. **A3 — premissa do enunciado de validação («o log SEG0 declara 530/530 frontend e 874/880 backend»)**
   — **não reproduzível em `c1b2d94`**: nenhum dos 5 logs `_logs/UTAC000_*` cita qualquer número de
   suíte. O `874/880` é de `MC105a`/`MC105a.1_SEG-1`; o fecho do MC105a.1 declara `885/891`, que é o
   valor que eu medi. A skill **não** fez essa alegação — a premissa é que estava desactualizada.

## Alegações que NÃO consegui refutar (verificadas)
- Os 20 ficheiros existem e os 20 tamanhos declarados batem byte a byte.
- Os 16 nomes de gate correspondem 1:1 ao enunciado canónico.
- Escopo cirúrgico: 25 ficheiros, nenhum fora de `skills/utac01/` + `_logs/UTAC000_*`; zero diff em
  `CLAUDE.md`, `package-lock.json`, produção e `_logs/MC*` (GATE 3/15).
- `exemplo.spec.yml` e `spec-template.yml` são YAML válido; os 9 obrigatórios estão todos presentes;
  os 3 mutantes do SEG3 ficam RED e o original fica VÁLIDO (controlo positivo).
- GATE 13: 0 referências que obriguem a consultar a série (53 citações de origem, todas auto-explicativas).
- `exemplo.UTAC.md`: 8 secções + 3 blocos, placeholders em vez de números inventados, exemplo declarado
  como não executado.
- Suíte VERDE (530/530 · 885/891) — medida por mim, não pela parte.

## Não medido / limites deste validador
- Não corri o validador ad-hoc do SEG6 nem o script de mutação da própria skill (vive **fora do repo**,
  `C:/Users/Moltbot/tmp-utac000/…`, e não é versionado): reproduzi o **efeito** (M1/M2/M3 RED + positivo
  VÁLIDO) com parser real, mas não o script original.
- Não toquei em Supabase, Netlify, produção ou deploy (fora do escopo do UTAC e deste validador).
- O worktree `/c/c/Users/…/wt` criado na 1.ª tentativa (mapeamento MSYS) desapareceu do disco; usei o
  worktree `C:/Users/Moltbot/tmp-utac000v/wt` @ `c1b2d94` (limpo) — declarado para quem quiser repetir.
- O working tree do repo principal está sujo **fora** deste commit (` M package-lock.json` pré-existente,
  ` M _logs/UTAC000_SEG-1_MEDICAO.md` pós-commit, ~30 `?? _logs/MC*` históricos não rastreados). Não
  alterei nada; nada disso pertence a `c1b2d94`.

## Decisão

**APROVADO COM RESSALVAS — 0 bloqueantes.** O artefacto central está entregue, é cirúrgico, é
auto-contido, tem exemplo funcional com placeholders honestos, YAML válido com prova de mutação
reproduzida e a suíte intacta (530/530 · 885/891). Duas alegações **não resistem** à refutação (⚠️1 e
⚠️2) e devem ser corrigidas **antes do fecho** (GATE 11 exige pendências fechadas ou declaradas): são
correcções de poucas linhas, todas dentro do escopo já autorizado do UTAC000, e o ⚠️1 deve levar teste
+ mutante próprios (R16/R15) — feito isso, este UTAC fecha sem ressalvas.

*Achados ⚠️ deste validador: 2. ⚠️ corrigidos: 0 (nenhuma correcção foi feita depois deste veredicto —
as correcções ficam declaradas como **não re-validadas** se não passarem por uma 2.ª validação.)*
