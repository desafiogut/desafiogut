# UTAC105b.3 — SEG0 a SEG2 · Frentes A / B / C (2026-10-01)

Skill UTAC01 (modo manual), tipo `saneamento`. Fecha a pendência **V-4** declarada pelo UTAC105b.2.
Executor que **retomou** (o UTAC foi interrompido por conflito spec-vs-suíte; ver
`Desktop/RELATORIO-UTAC105b.3.txt`, secção 9).

**Decisão do operador que desbloqueou a retomada: R18-5 = OPÇÃO A** (autorização formal recebida
em 2026-10-01; registada nos 3 lugares: este log, `CLAUDE.md`, `Desktop/UTAC105b.3-RELATORIO.md`).

---

## Frente A — medir o fluxo actual quando vem `endereco`

Instrumento: `C:/Users/Moltbot/tmp-utac105b3/poc-utac105b3.mjs` (handler **real**; duplos só nas
fronteiras externas; CNPJs sintéticos). Corrido a partir de `_tests/` (imports relativos +
`@netlify/blobs` só resolvem aí) e apagado no fim.

| caso | ANTES (baseline `00610b0`) |
|---|---|
| **V1** anónimo + `endereco` DE OUTRA pessoa (sem cota) | **201 e ESCREVEU** → pré-criou cota no endereço dela: `empresa="INVASOR LTDA"` ⛔ **V-4** |
| **V2** anónimo + `endereco` de outro (2.º) | **201 e escreveu** ⛔ **V-4** |
| **V5** **logado** com `endereco` DE OUTRO + token próprio | **201 e POLUIU** a cota dela ⛔ **V-4 (variante)** |
| V3 legítimo: anónimo **sem** `endereco` | 201 e criou `cnpj:77788899000183` ✅ |
| V4 logado com o **próprio** `endereco` | 201 e criou ✅ (contrato MC12.3.1) |
| V6 admin com `endereco` de outro | 201 e escreveu ✅ (acesso total, desenho) |

`V5` é o «erro esperado se ambíguo» previsto nas notas de arranque do spec ⇒ regra **403**.

**Evidência:** `_logs/UTAC105b.3_SEG-1_poc_ANTES.txt` *(ver nota de consolidação abaixo)*.

## Frente B — aplicar a regra MC89.38 (posse do `endereco` na criação)

Regra: **se vem `endereco` no corpo, exige-se Bearer do MESMO endereço — ou admin.**
Sem `endereco` no corpo (o ÚNICO caminho do frontend) nada muda. A guarda entra **dentro do ramo
`register-corporativo`**, a seguir ao `resolverChamador` que o UTAC105b.2 já ali tinha
(reutilização; não se tocou no `update-corporativo` nem no POST genérico — proibidos pelo spec).
Ordem: **ANTES da leitura do store** (auth antes da existência), como no `update-corporativo`.

**Escopo medido (GATE 3):**

| ficheiro | diff | nota |
|---|---|---|
| `netlify/functions/cotas.mjs` | **+27 / −0** (1 hunk) | só o ramo `register-corporativo` |
| `_tests/utac105b3-register-endereco.test.mjs` | novo (11 testes) | autorizado |
| `_tests/cotas-anti-fraude.test.mjs` | **+18 / −14** | **R18-5 (OPÇÃO A)** — só o helper `reqRegister` |

Line endings: `.mjs` em **LF** (regra A2), conforme medido (o artefacto parqueado vinha em CRLF —
erro declarado abaixo).

**A/B pareado (mesmos 6 casos, mesmos dados, braços alternados):**

| caso | ANTES | DEPOIS |
|---|---|---|
| V1 anónimo + `endereco` de terceiros | 201 escreveu | **401 recusou** ✅ |
| V2 anónimo + `endereco` de terceiros (2.º) | 201 escreveu | **401 recusou** ✅ |
| V5 logado com token de OUTRO | 201 poluiu | **403 recusou** ✅ |
| V3 legítimo sem `endereco` | 201 criou | 201 criou ✅ **igual** |
| V4 logado com o PRÓPRIO `endereco` | 201 criou | 201 criou ✅ **igual** |
| V6 admin | 201 escreveu | 201 escreveu ✅ **igual** |

**Evidência:** `_logs/UTAC105b.3_SEG-1_poc_DEPOIS.txt`.

### Testes + mutação (T1 / T4 / T5)

`_tests/utac105b3-register-endereco.test.mjs` — **11/11 VERDE** com a correcção.
Casos: E1/E2/E3 (o defeito), E4 (logado com o próprio), E5 (cadastro directo), E6 (admin),
E7 (formato inválido), E8 (401 **antes** da leitura do store — sem oráculo), E9 (`cliente_id` do
corpo é ignorado), E10 (caixa mista), E11 (token inválido).

| mutante | o que repõe | resultado |
|---|---|---|
| MB1 | sem a guarda da posse do `endereco` | **RED** (E1,E3) ✅ |
| MC1 | tira as DUAS guardas (V-4 **e** a do b.2) | **RED** (E1,E2,E3) ✅ |
| MB2 | anónimo tratado como utilizador (401→403) | **RED** (E1,E2) ✅ |
| MB3 | sem a isenção do admin | **RED** (E6) ✅ |
| MB4 | aceita qualquer token | **RED** (E1,E3) ✅ |
| MB5 | **[EQUIVALENTE]** sem `.toLowerCase()` no corpo | sobrevive ✅ declarado |
| ME1 | **[EQUIVALENTE]** sem o `!!chamadorReg.endereco &&` | sobrevive ✅ declarado |

5 mortos + 2 equivalentes; `md5` de `cotas.mjs` restaurado em todos (`48f0ba05befd…`, conferido).
**Evidência:** `_logs/UTAC105b.3_SEG0_mutacao_saida.txt`.

**Nota de defesa em profundidade (medida, não suposta):** `E2` **não** morre em MB1 nem MB4 porque
a guarda do UTAC105b.2 (cota já existente) também a recusa. Foi preciso o mutante **combinado MC1**
para a matar. Declarar isto é a diferença entre cobertura e aparência de cobertura.

## Frente C — A/B do cadastro legítimo (zero regressão)

1. **O frontend não envia `endereco`** — `SejaNossoParceiro.jsx:203-212` envia
   `cnpj, empresa, segmento, site, logoUrl, email` + header `X-Visitor-ID`. Confirmado no SEG-1.
2. **E5** (anónimo sem `endereco` → 201 cria `cnpj:…`) verde em ambas as fases do A/B.
3. **Prova bidireccional (T4):** o mesmo ficheiro de teste novo, corrido contra o código **ANTIGO**,
   cai em **4 casos** — exactamente os que exigem a correcção.

| contra o código | resultado |
|---|---|
| correcção aplicada | **11/11 passam** |
| baseline `00610b0` | **4 falham** → E1, E3, E8, E11 ✅ (como devem) |

**Evidência:** `_logs/UTAC105b.3_SEG0_bidirecional.txt`.

### Regressão do ficheiro legado (R18-5 → OPÇÃO A)

`_tests/cotas-anti-fraude.test.mjs` tinha 7 testes que registavam por «**anónimo + `endereco` no
corpo**» — precisamente o contrato que o V-4 manda fechar. **Os testes não eram defeituosos**: testam
anti-duplicidade (409), anti-Sybil (429) e os lookups MC87 com semântica correcta; o que estava velho
era o **setup**. Pela OPÇÃO A (autorizada) alterou-se **apenas o helper `reqRegister`** para provar a
posse (Bearer do mesmo `endereco` do corpo) + os 12 `await` nos call sites. **Nenhuma asserção foi
tocada.** Medido: **14/14 VERDE**.

### Suíte canónica (regressão global)

| momento | frontend | backend | veredito |
|---|---|---|---|
| baseline `00610b0` | 535/535 | 956/962 | VERDE |
| com a correcção **sem** a OPÇÃO A | 535/535 | **7 falhas** | ⛔ VERMELHO (ST4 — foi o motivo da paragem) |
| com a correcção **+ OPÇÃO A** | **535/535** | **967/973** | ✅ **VERDE** |

(`node scripts/mc966-suite-harness.mjs ambos`, da raiz, foreground. 973 = 962 + 11 novos;
967 = 956 + 11. Os 6 `skipped` do baseline mantêm-se, não medidos um a um — pendência declarada.)

---

## Nota de consolidação da evidência

O executor que retomou **re-correu os mesmos instrumentos** do PoC e da mutação e obteve saída
**idêntica** à da passagem interrompida (`diff` vazio nas linhas de resultado). O PoC mantém os
ficheiros existentes (`_logs/UTAC105b.3_SEG-1_poc_ANTES.txt`, `_logs/UTAC105b.3_SEG-1_poc_DEPOIS.txt`).
A evidência da mutação foi **substituída** por `_logs/UTAC105b.3_SEG0_mutacao_saida.txt` e a antiga
(`_SEG1_mutacao_saida.txt`) **removida** — ver «erros dos instrumentos», ponto 3, abaixo.

## Erros dos meus instrumentos (declarados)

1. **Artefacto parqueado em CRLF.** `tmp-utac105b3/cotas.mjs.proposto` tinha terminadores CRLF;
   a regra **A2** exige **LF** em `.mjs`. O A/B anterior correu sobre uma cópia CRLF (funcionalmente
   igual, disciplinarmente errada). Nesta retomada o ficheiro foi normalizado (`tr -d '\r'`) e o
   `md5` do que entra no repo é `48f0ba05befd289a34b4cce176036d20` (LF). **A regra A2 foi cumprida.**
2. **Ferramenta de leitura mascara segredos.** Ao copiar `cotas-anti-fraude.test.mjs` pela ferramenta
   de leitura de ficheiros, ela substituiu um template literal por `***` e o ficheiro resultante não
   compilava (`SyntaxError: Unexpected token '**'`). Corrigido lendo **bytes crus** (Python/`io`).
   **Lição: para copiar código com template literals, ler bytes, nunca a ferramenta de leitura.**
3. **Evidência da mutação ficou inconsistente com o artefacto commitado.** Ao commitar, levou-se a
   evidência da passagem interrompida (`_SEG1_mutacao_saida.txt`, que diz `md5 0e3a4284… (disco: CRLF)`)
   em vez da re-medição (`md5 48f0ba05… (disco: LF)`) — ou seja, o ficheiro de evidência **contradizia**
   o `cotas.mjs` que estava a ser commitado. Detectado por leitura do validador adversarial e
   **corrigido** (ficheiro substituído e renomeado para `_SEG0_mutacao_saida.txt`). A lição: a evidência
   tem de ser a do artefacto **que entra**, não a do ensaio anterior.
4. **`patch` corrompeu o `CLAUDE.md`.** A ferramenta de edição partiu uma linha não relacionada por
   conter um `\r` literal (num snippet sobre CRLF). Detectado pelo `git diff` (hunk extra). Corrigido
   reconstruindo o ficheiro a partir do `HEAD` e aplicando **só** a alteração pretendida, em bytes —
   confirmado: 1 hunk, 1 linha, região do snippet byte-idêntica.
5. **`cmd //c mklink` não corre em git-bash.** A criação das junctions do worktree falhou em silêncio
   (o `cmd` abria em modo interactivo). Resolvido com um `.bat` invocado por
   `MSYS2_ARG_CONV_EXCL='*' cmd /c`. Faltava ainda uma **terceira** junction
   (`netlify/functions/node_modules`, onde vive `@netlify/blobs`) — sem ela o worktree dava 69 falhas
   em vez de 967/973. **Uma cópia "limpa" do repo não é a suíte: medir o ambiente antes de concluir.**

## VEREDITO SEG0-SEG2: **SEGUIR** para o SEG3 (validador adversarial)

Frentes A/B/C medidas com A/B pareado, mutação e prova bidireccional; suíte canónica VERDE;
escopo cirúrgico; cadastro legítimo intacto; admin com acesso total.
