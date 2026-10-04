# VEREDICTO — Validador adversarial independente · UTAC106x.6 (commit `73cdd59`)

**Repo:** `C:/Users/Moltbot/Desktop/DESAFIOGUT` · **HEAD:** `73cdd59773f5efb1689e223496912572aa432059` (local, não empurrado)
**Método:** refutação adversarial executada (não por leitura). Todas as contagens re-medidas do zero.
**Data:** 2026-10-04 · **Validador:** subagente Hermes (deepseek-v4-flash)

---

## VEREDICTO: **PARCIAL**

**Bloqueantes: 0.** Nenhuma pendência foi fechada sem o problema resolvido; o `package-lock` não foi tocado; os bytes de controlo estão intactos; a A13 corrigida bate 100% com o helper.
**Porém:** a frente **(d) — gabarito Play** contém **1 afirmação factual falsa** (`DEBT-020`, item 4) que **refutei por medição**. Não invalida os fechos (A/B/E/F), mas a verificação do gabarito não é integralmente sustentável como está redigida ⇒ o fecho global não é APROVADO.

---

## Reproduzido por execução (comandos + saída real)

**(a) A13 vs helper — o helper cria MESMO as 4:**
```bash
node scripts/worktree-helper.mjs criar .../tmp-utac106x6-val/wt 73cdd59
# -> "junctions": [node_modules, desafio-gut/node_modules,
#                  desafio-gut/frontend/node_modules,
#                  desafio-gut/frontend/netlify/functions/node_modules]   (= 4)
node scripts/worktree-helper.mjs check .../wt
# -> "reparse": [4 caminhos]
node scripts/worktree-helper.mjs remover .../wt
# -> reparse points encontrados: 4 · rmdir x4 -> OK · git worktree remove -> exit 0
# node_modules reais ANTES 499 / 414 · DEPOIS 499 / 414 (INTACTOS); wt removido
```
A13 (ficheiro actual) lista exactamente as 4 linhas `mklink /J` na mesma ordem do array `JUNCTIONS`, e o passo 1 de «Remover» cita as 4 (`node_modules` · `desafio-gut/node_modules` · `.../frontend/node_modules` · `.../netlify/functions/node_modules`). **Internamente coerente.**

**(b) DEBT-001 — 6 skipped, enumerados:**
```bash
cd desafio-gut/frontend/netlify/functions
node --test --experimental-test-module-mocks --test-reporter=tap '_tests/*.test.mjs' < /dev/null | grep -E "^# (tests|pass|fail|skipped)"
# -> # tests 998 · # pass 992 · # fail 0 · # skipped 6
node scripts/mc966-suite-harness.mjs backend < /dev/null
# -> backend: VERDE 992/998 pass · VEREDITO: VERDE
```
Os 6 SKIP medidos são **exactamente** os enumerados: **1** `mc93d-contrato-onchain.test.mjs` («FORK DE MAINNET… MAIINNET_RPC_URL», `t.skip` sob guarda `process.env.MAINNET_RPC_URL`) + **5** `mc93d-contrato-postgrest.test.mjs` (grupo «SERVIDOR», `t.skip` sob guarda `SUPABASE_CONTRATO_URL/KEY`). **1+5=6 ✓.** Ambos os ficheiros gateiam o skip por env (`grep -n skip` mostra `t.skip(...)` atrás de `if(!rpc)` / `if(!URL_REAL||!KEY_REAL)`) ⇒ **não desbloqueáveis por código**. ✓

**(b') DEBT-005 — contagem 76/10:**
```bash
cd .../skills/utac/protocol
for f in E-engenharia T-testes G-git-deploy L-lgpd S-seguranca A-ambiente P-processo AU-autonomia ST-stop HI-higiene; do grep -cE '^## [A-Z]+[0-9]+' regras/$f.md; done
# -> 9 5 6 6 6 13 7 4 10 10  => TOTAL = 76 (10 categorias)
```
`regras-legado.md` passou de «61 regras / 9 categorias (…A8…)» para «76 regras / 10 categorias (…A13…HI10)» + bloco de errata. **Bate.** ✓

**(e) package-lock:**
```bash
git -C .../DESAFIOGUT diff --name-only 1a5fbd2..73cdd59
# -> CLAUDE.md · _logs/DEBT.md · _logs/UTAC106x.6-pendencias.md ·
#    skills/utac/protocol/regras-legado.md · skills/utac/protocol/regras/A-ambiente.md
#    (NENHUM package-lock.json)
grep -c '"node_modules/solc"' package-lock.json                 # 1
grep -c '"node_modules/solc"' desafio-gut/package-lock.json      # 0
grep -c '@nomicfoundation/edr' package-lock.json                 # 24
grep -c '@nomicfoundation/edr' desafio-gut/package-lock.json     # 24
```
Bate com a tabela da DEBT-019 (solc raiz=1, desafio-gut=0; edr raiz=24, desafio-gut=24). **Lock não alterado.** ✓

**(f) bytes de controlo do CLAUDE.md (0x00/0x1f):**
```bash
git show 1a5fbd2:CLAUDE.md | python -c "...count(b'\x00'),count(b'\x1f')"  # NUL= 2 US= 2
git show 73cdd59:CLAUDE.md | python -c "..."                              # NUL= 2 US= 2
python -c "...open('.../CLAUDE.md','rb')..."                             # NUL= 2 US= 2
```
**4 bytes (2 NUL + 2 0x1F), inalterados entre os dois commits e na árvore de trabalho.** ✓

**(c) NORTE — os 11 itens:**
Todos os 10 ✅ confirmados por leitura da secção (linhas 260–421): §2.1 Passe R$2=1 ponto · §2.3 50 pontos=cartão · §2.4 palpite=+2 bónus · §4.3 lojistas patrocinadores (não vendem/entram) · §5.1/5.2 CFOP 5.910+5.102 · §3.1-3.3 associação vendedor legal · §3.4 isenção IR/CSLL/Cofins · §6.3 sem SPA/MF · §7.1 Play=loyalty · §7.2 Apple=bem físico sem IAP.
```
git grep -in "5%"        # (tracked) -> só ruído de design skills; 0 no NORTE/série x
grep -a -in "5%" CLAUDE.md  # -> 4 hits: 2 da PRÓPRIA anotação (l.417-418), 1 «IC95%» (l.3176), 1 no resumo (l.4481)
```
⇒ «limite 5%» **não tem referente** em fonte medida. Item 11 **ausente de facto**; anotado, não inventado. ✓ (não refutado)

---

## Tabela de achados

| # | Grav. | Achado | Tratamento proposto |
|---|---|---|---|
| 1 | ⚠ grave | **DEBT-020 item (4) é FALSO.** A DEBT diz que «regras oficiais publicadas no app» *«aparece só na NORTE §10, não no gabarito»*. Medido: a expressão **existe no gabarito** — `docs/gabarito-play-console.md:92` (row #14: «concursos: regras oficiais») — e «regras publicadas» existe em `CLAUDE.md:205`. Ou seja, dos «2 requisitos não mapeados», o (4) está presente noutra redacção/contexto. O (2) «transacção separada genuína» **confirmo ausente do gabarito**, mas **existe em `CLAUDE.md:204`** («Gamified Loyalty (transação separada e genuína, …)»). | Reescrever DEBT-020: reduzir a **1 lacuna real** (item 2) — ou reclassificar o item 4 como «mapeado como Apple 5.3/concursos (❓), **não** como requisito Play da Gamified Loyalty». Corrigir a frase «aparece só na NORTE §10». |
| 2 | ℹ nota | **CLAUD.md resumo final diz «resta 1 skip local do teste de recompilação com solc» — inverídico localmente.** Local: `solc` resolve-se (`desafio-gut/node_modules/solc/index.js`) ⇒ o teste `mc93e-fork-onchain` *«a fixture é o que o solc produz…»* **corre** (não salta). Os 6 skips locais são mainnet(1)+postgrest(5), **nenhum** é solc. O skip do solc é **exclusivo do CI** (`npm ci` em `desafio-gut` não traz solc). | Reescrever: «no CI o único skip tolerado é a recompilação com solc» (a DEBT-019 já o diz bem; o resumo do CLAUDE.md é que troca CI↔local). |
| 3 | ℹ nota | **Divergência lock↔node_modules:** `solc` está **instalado** em `desafio-gut/node_modules` mas **ausente** de `desafio-gut/package-lock.json` (e de `package.json`). Um `npm ci` num runner limpo **remove-o** → reproduz o skip do solc em CI. É exactamente a causa que a DEBT-019 descreve, mas o número «local» citado (achado 2) confunde. | Já capturado na DEBT-019; só corrigir a redacção do resumo (achado 2). |
| 4 | ℹ nota | **Lacuna adicional que o executor NÃO assinalou:** o §4 do gabarito («Declarações obrigatórias na Play Console») lista Data Safety ×2, Financial features, IARC, account-deletion URL, privacy URL — mas **omite as declarações obrigatórias «Ads» (contém anúncios?) e «App access» (credenciais para revisão)**. `grep -inE "anúnc\|ads\|publicidade\|external link\|ligaç" docs/gabarito-play-console.md` → 0. São requisitos de consola, independentes do briefing B1 §9.1. | Acrescentar 2 linhas ao §4 (ou justificar por que não se aplicam). Não é bloqueio (gabarito fora do escopo autorizado). |
| 5 | ℹ nota | **Método de medição do «5%»:** `grep -in "5%" CLAUDE.md` imprime «Binary file matches» (o ficheiro tem bytes de controlo) — só com `-a` se vêem as linhas. À data da verificação havia **0** ocorrências, logo a conclusão da NORTE mantém-se; mas a **própria anotação** inserida por este commit passa a ser a única fonte de hits. | Nenhuma acção na conclusão; registrar que a verificação é válida *antes* da anotação. |

---

## Alegações que consegui REFUTAR

1. **`DEBT-020` item (4):** ««regras oficiais publicadas no app» aparece **só** na NORTE §10, **não no gabarito**» — **FALSO.** A string «regras oficiais» está no gabarito (`docs/gabarito-play-console.md:92`, §7 row #14) e «regras publicadas» em `CLAUDE.md:205`. O gabarito **mapeia-a** (contexto Apple 5.3/concursos, estado ❓).
2. **Resumo do `CLAUDE.md` (bloco final):** «resta **1 skip local** do teste de recompilação com solc» — **impreciso.** Localmente não há skip de solc (solc resolvido; 6 skips = mainnet+postgrest). O skip do solc só ocorre em CI.
3. **Bônus (parcial):** a afirmação implícita de que «transação separada/genuína» não está documentada em lado nenhum — está em `CLAUDE.md:204`. A lacuna **real** é só a ausência no **gabarito**.

## Alegações que NÃO consegui refutar

- **(a)** A13 = as 4 junctions exactas do helper; `criar`=4, `check`=4 reparse points, `remover`=rmdir×4 + `worktree remove` exit 0, node_modules reais intactos (499/414). Sem contradição com a A9 (a A9 dá o **procedimento**, não fixa contagem). Texto internamente coerente.
- **(b)** DEBT-001: `# skipped 6`, enumerados 1 (onchain/`MAINNET_RPC_URL`) + 5 (postgrest/`SUPABASE_CONTRATO_URL+KEY`), ambos env-gated ⇒ **não desbloqueáveis por código**. DEBT-005: contagem literal **76** (E9·T5·G6·L6·S6·A13·P7·AU4·ST10·HI10) = 10 categorias. Nenhum fecho sem resolução.
- **(c)** NORTE: 10/11 itens ✅ confirmados; «limite 5%» sem referente em qualquer fonte medida (grep `5%` tracked → 0 relevante).
- **(e)** `package-lock.json` **não** figura no diff `1a5fbd2..73cdd59`; `solc`/`edr` exactamente como a DEBT-019 declara.
- **(f)** Bytes de controlo: **2 NUL + 2 0x1F = 4**, idênticos em `1a5fbd2`, `73cdd59` e na árvore.

## O que NÃO medi

- O **briefing B1 §9.1** em si (não existe como artefacto no repo — a NORTE §FONTE-E-LACUNA já o declara): não posso enumerar requisitos Play para lá do que o repo documenta. O achado #4 («Ads»/«App access») é **candidato**, não confirmado contra o briefing.
- A **suíte frontend** (só corri o backend; o frontend é lento e fora dos 6 alvos).
- Os **runners de CI** (sem rede): a asserção «`test-onchain` instala `edr` e exige ≤1 skip» foi lida no `ci.yml`, não executada.

## Decisão

**PARCIAL.** Os cinco fechos substantivos (A13↔helper, DEBT-001, DEBT-005, `package-lock`, bytes) **sobrevivem à refutação** — reprodutíveis e verdadeiros. A frente de *verificação do gabarito* (d) tem **1 afirmação factual falsa** (`DEBT-020` item 4) e **1 lacuna não assinalada** (declarações «Ads»/«App access»), e o resumo do `CLAUDE.md` troca CI↔local no skip do solc. Nada disto torna inseguro o fecho (zero código/testes/lock tocados; 0 bloqueantes), mas o UTAC **não pode ser dado como APROVADO integralmente** enquanto a DEBT-020 mantiver a contagem «2 requisitos não mapeados» sem correcção. **Recomendação: corrigir DEBT-020 (achado 1) + redacção do resumo (achado 2); aceitar os restantes como notas.**

---

# RESPOSTA DO EXECUTOR AO VEREDICTO

**Veredicto: PARCIAL · 0 bloqueantes.** Os 5 fechos substantivos (A, B, C, E, F) sobrevivem; o
validador **refutou 1 afirmação minha** (frente D/gabarito) e trouxe 4 ℹ notas. Tratamento abaixo.

| Achado | Grav. | Tratamento do executor |
|---|---|---|
| **1** — a `DEBT-020` item **(4)** é **FALSA**: «regras oficiais publicadas no app» **está** no gabarito (`docs/gabarito-play-console.md:92`, row #14 «concursos: regras oficiais») e «regras publicadas» em `CLAUDE.md:205`; e «transação separada e genuína» existe em `CLAUDE.md:204` | ⚠ grave | **CORRIGIDO.** A `DEBT-020` foi **reescrita** para **1 lacuna real** (item (2) «transação separada e genuína», ausente do §6 do gabarito) — com a **afirmação errada mantida À VISTA, marcada REFUTADA** (errata, não apagada). Ver 2.º commit do UTAC. |
| **2** — o resumo do `CLAUDE.md` dizia «resta **1 skip local** do teste de recompilação com solc» — inverídico localmente (o `solc` resolve-se; os 6 skips são mainnet 1 + postgrest 5) | ℹ nota | **CORRIGIDO** no bloco R14 do `CLAUDE.md` e no log/relatório: o skip do `solc` é **exclusivo do CI**. |
| **3** — divergência lock↔node_modules do `solc` (instalado mas ausente do `desafio-gut/package-lock.json`) | ℹ nota | Já em **DEBT-019**; redacção alinhada com o achado 2. |
| **4** — o §4 do gabarito **omite** as declarações obrigatórias da consola **«Ads»** e **«App access»** | ℹ nota | **REGISTADO** em `DEBT-020` como **lacuna CANDIDATA** (não medida contra o briefing B1 §9.1, que não é artefacto do repo — tal como o validador declarou). Não bloqueia. |
| **5** — `grep -in "5%" CLAUDE.md` imprime «Binary file matches» (bytes de controlo); a anotação inserida passa a ser a única fonte de hits | ℹ nota | **Declarado** (limite do instrumento). A conclusão mantém-se: **antes** da anotação, `5%` tinha **0 relevantes** no `CLAUDE.md`/NORTE/série x. |

## Erros dos meus PRÓPRIOS instrumentos (declarados)

1. **A fonte da frente D/gabarito era um `grep` por termos exactos** (`transac`/`separad`/`genuin`/`regras
   oficiais` no gabarito) — e o termo «regras oficiais» **estava lá** (row #14, secção Apple). Concluí
   «ausente» a partir de uma leitura **parcial** da secção 6, sem varrer a secção 7. **Uma verificação que
   não varre TODAS as secções do alvo não é uma verificação** (o mesmo defeito que o §9.2 do protocolo
   descreve para contagens).
2. **Não confrontei o meu «ausente» com o `ESCOPO-ALVO` histórico** (`CLAUDE.md:204-205`), que **listava
   literalmente** «transação separada e genuína … regras publicadas». Uma lacuna declarada tem de ser
   testada contra o **corpus inteiro** antes de ir para dívida.
3. **`grep` sobre `CLAUDE.md` mascara-se pelos bytes de controlo** («Binary file matches»): usar
   `tr -d '\000'` ou `git grep` — e registar o método, porque a saída «0 ocorrências» de um `grep`
   truncado é indistinguível de uma medição.

**Correcções feitas depois deste veredicto ficam declaradas como «não re-validadas»** (não houve 2.ª ronda).
