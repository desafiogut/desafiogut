# UTAC110h.2 — Validação adversarial (SEG5)

**Objecto:** ECOQUILDO por indicação (Art. 51º) + 3 sítios sem «+1 senha» + GUTO com os dois créditos
**Commit validado:** `80ce770` (UTAC) contra `3f5aac6` (base)
**Worktree:** `C:/Users/Moltbot/tmp-utac110h2-val/wt` (destacado em `80ce770`; 4 junctions de `node_modules` — regra A13; **o worktree ficou limpo no fim**)
**Repo de leitura:** `C:/Users/Moltbot/Desktop/DESAFIOGUT` (não escrito)
**Ambiente:** Windows 10 · bash (git-bash/MSYS) · `node` (sem python3 no caminho do harness)
**Data:** 2026-10-15 · Validador: subagente SEG5 (adversarial)

---

## 0. VEREDICTO

> ## **APROVADO COM RESSALVAS**
> Nenhuma das 8 alegações foi **refutada** — todas se confirmaram com prova reproduzível.
> Duas ressalvas ⚠️ (uma de **regressão demonstrada** num teste pré-existente; uma de **Art. 50º num
> caminho de dupla falha**), ambas com reprodução exacta abaixo. 4 notas ℹ️.

---

## 1. Medição canónica (o instrumento está verde e mediu de verdade)

```
$ cd C:/Users/Moltbot/tmp-utac110h2-val/wt && node scripts/mc966-suite-harness.mjs ambos
frontend: VERDE 1088/1088 pass
backend: VERDE 1246/1252 pass
VEREDITO: VERDE
```

Testes dirigidos (backend):

```
$ cd C:/Users/Moltbot/tmp-utac110h2-val/wt/desafio-gut/frontend/netlify/functions
$ node --test --experimental-test-module-mocks _tests/utac110h2-eco-indicacao.test.mjs \
      _tests/utac110h2-guto-eco.test.mjs _tests/utac110h1-guto-indicacao.test.mjs
ℹ tests 19
ℹ pass 19
ℹ fail 0
```

Testes dirigidos (frontend):

```
$ cd C:/Users/Moltbot/tmp-utac110h2-val/wt/desafio-gut/frontend
$ node --test --test-concurrency=1 src/__tests__/utac110h2-indicacao-copy.test.mjs \
      src/__tests__/utac110h2-pendencias.test.mjs
ℹ tests 11
ℹ pass 11
ℹ fail 0
```

Prova de mutação do autor:

```
$ cd .../netlify/functions && node _tests/utac110h2-prova-mutacao.mjs
baseline back VERDE pass=19
baseline front VERDE pass=11
✓ PROVADO A1 … (23 linhas «✓ PROVADO», restauro md5 idêntico em todas)

23/23 PROVADOS            (exit=0)
```

---

## 2. Tabela de alegações (R18 do operador 110h.2)

| # | Alegação | Veredicto | Prova (resumo) |
|---|----------|-----------|----------------|
| 1 | +2/+1 ECOQUILDO ao indicante/indicado via `POST /referral?acao=usar-codigo`, em `_lib/fontes-lance.mjs` (não em `_lib/referral.mjs`) | **CONFIRMADO** | §3.1 — endpoint chama `creditarIndicacao(r.indicador, endereco)` com **endereços reais** (`referral.mjs:171`); `_lib/referral.mjs` recebe **mascarados** (`referral.mjs:161`) → só lá o crédito seria inerte |
| 2 | Lastro actualiza (+`total_emitido`, `reserva_rs_centavos` derivada, +3) e reverte se falhar (Art. 50º) | **CONFIRMADO (com ressalva ⚠️-2)** | R1: `[total_emitido,total_usado,reserva]=[3,0,300]`; R7: falha do lastro → emissões revertidas. **Ressalva:** dupla falha (lastro **e** reversão) deixa ECO sem lastro — repro §5.2 |
| 3 | Os 3 sítios deixaram de dizer «+1 senha» (PainelIndicacao ×3, ChatbotWidget, `mensagemInducao`) | **CONFIRMADO** | §3.3 — B1a/B1b/B1c/B2/B3/B3b todos PROVADOS; `grep` de «senha» só encontra comentários e o campo de dados `senhas_ganhas` (não renderizado) |
| 4 | GUTO (`indique_e_ganhe`, 4 perfis) diz os DOIS créditos, amarrados às constantes e ao Art. 51º | **CONFIRMADO** | §3.4 — 4 respostas literais; teste lê as constantes da fonte **e** o Art. 51º de `docs/REGULAMENTO-v5.md` |
| 5 | Idempotência: re-executar não duplica | **CONFIRMADO** | §3.5 — R4 (mesmo pedido) e a minha sonda P5 (indicação recíproca A↔B) sem duplicação |
| 6 | Auto-indicação → 400 `auto_indicacao`; outro código → 409 `ja_indicado`, zero crédito | **CONFIRMADO** | §3.6 — R2 (400/`auto_indicacao`, ECO/pontos/lastro a zero) e R3 (409/`ja_indicado`, zero ECO) |
| 7 | NÃO tocado: `docs/REGULAMENTO-v5.md`, `docs/GUTO-REGULAMENTO.md`, `docs/regras-oficiais.md`, contrato on-chain, env vars / `EM_BREVE_MODE` | **CONFIRMADO** | §3.7 — `git diff --stat` **vazios** + `md5sum` idênticos ao repo do Desktop |
| 8 | Pendências menores: `Privacidade.jsx` «Passes Desafio»; `pt.js` «regra da competição»; caixa de contacto só com o e-mail | **CONFIRMADO** | §3.8 — D1/D2/D3 PROVADOS; `grep -n senha src/pages/Privacidade.jsx` → vazio |

---

## 3. Provas por alegação

### 3.1 Alegação 1 — o sítio escolhido é o correcto; refutação tentada e falhada

Tentei provar que o crédito é inerte no caminho real. **Não é.**

```
$ grep -n "creditarIndicacao\|registrarConversao" referral.mjs
27:import { creditarIndicacao } from "./_lib/fontes-lance.mjs"; // UTAC110f — +50 pontos de lance
160:      conversao = await registrarConversao(
161:        { codigo, indicador: mascararEndereco(r.indicador), indicado: mascararEndereco(endereco) },
171:      const pl = await creditarIndicacao(r.indicador, endereco);
```

Leitura literal: o **mesmo** par de endereços entra **mascarado** em `_lib/referral.mjs` (linha 161) e
**real** em `_lib/fontes-lance.mjs` (linha 171). A prova de que o mascaramento mata o crédito está nos
logs do meu probe (sonda P4):

```
[MC17.5.1] T6 concederBonus(indicador) {
  indicador: '0xaaaa…aaaa',
  bonusOk: false,
  bonusCode: 'endereco_invalido',      <-- o "0xaaaa…aaaa" não passa no /^0x[a-f0-9]{40}$/
  txHash: null
}
```

⇒ Se o ECOQUILDO tivesse sido posto em `_lib/referral.mjs`, herdaria o endereço mascarado e morreria em
`endereco_invalido`. **A alegação 1 resiste à refutação.** O desvio autorizado (R18-110h.2-A) é tecnicamente correcto.

Prova positiva do crédito real (R1, saída literal):

```
✔ R1 indicação válida → 200, +50/+50 pontos E +2 ECOQUILDO (indicante) / +1 (indicado)
assert.deepEqual([eco(A), eco(B)], [2, 1], "ECOQUILDO do Art. 51º");
assert.deepEqual(histEco(A).map(h=>[h.ref,h.delta,h.motivo,h.saldo]), [[`eco-indicacao:${B}`,2,"indicacao",2]]);
assert.deepEqual(histEco(B).map(h=>[h.ref,h.delta,h.motivo,h.saldo]), [["eco-indicacao-recebida",1,"indicacao",1]]);
assert.deepEqual([lastro().total_emitido, lastro().total_usado, lastro().reserva_rs_centavos], [3,0,300]);
```

**Ressalva ℹ️-1:** o **único** caminho real onde o ECO (e os +50 pontos) fica inerte é o ramo de
**throttle por IP** (`referral.mjs:146-155`): aí `creditarIndicacao` **não é chamada**. É o desenho
anti-fraude herdado do UTAC110f (o teste do 110f também o não cobre) — consistente, mas **não testado**
(ver mutante próprio V7, que sobrevive, §4).

### 3.2 Alegação 2 — lastro e reversão

Positivo (R1) e reversão na falha simples (R7):

```
✔ R7 falha do lastro → emissões revertidas (nunca fica ECOQUILDO sem reserva)
assert.deepEqual([eco(A), eco(B)], [0, 0], "emissões revertidas");
assert.deepEqual([histEco(A).length, histEco(B).length], [0, 0], "histórico limpo (reversão integral)");
assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [0, 0]);
```

`reserva_rs_centavos` é **derivada**, nunca somada à mão (`_lib/eco-quildo.mjs:57-58`, `220`):
`(total_emitido − total_usado) × CENTAVOS_POR_ECOQUILDO`. O mutante V6 (remover a conversão para centavos)
morre (fail=4) ⇒ a unidade está amarrada por teste.

Contudo, a **reversão é best-effort e silenciosa** — ver §5.2 (achado ⚠️-2).

### 3.3 Alegação 3 — «+1 senha» fora dos 3 sítios

```
$ grep -rn "senhas\? ganhas\|senhas_ganhas" desafio-gut/frontend/src desafio-gut/frontend/netlify --include=*.jsx --include=*.js --include=*.mjs | grep -v node_modules
src/components/ChatbotWidget.jsx:183:  {/* UTAC110h.2 … era «Senhas ganhas» … */}          <-- comentário
src/components/PainelIndicacao.jsx:8:// … senhas_ganhas …                                  <-- comentário
src/components/PainelIndicacao.jsx:42/55/64: … senhas_ganhas: 0 …                          <-- CAMPO de dados (não renderizado)
src/__tests__/…                                                                            <-- testes
```

Nenhuma ocorrência em **texto visível**. As mutações do autor que reintroduzem a copy antiga em cada um
dos 3 sítios morrem todas: `B1a fail=1 · B1b fail=2 · B1c fail=2 · B2 fail=1 · B3 fail=1 · B3b fail=1`.
O verificador é bidireccional (GATE 8): reprova verbatim a copy antiga e a copy do UTAC110h.1 (já sem
«senha» mas sem ECOQUILDO).

### 3.4 Alegação 4 — GUTO, 4 perfis (saída literal)

```
[visitante] Indique e Ganhe é para membros! Crie a sua conta e, por cada amigo que se cadastrar com o seu
            código, você ganha +50 pontos de lance e +2 ECOQUILDO (e o seu amigo ganha +50 pontos de lance e +1 ECOQUILDO). 😊
[comum]     … você ganha +50 pontos de lance e +2 ECOQUILDO na hora (e o seu amigo ganha +50 pontos de lance
            e +1 ECOQUILDO), até 10 indicações por mês. Código: IND-ABC123.
[corporativo] … +50 pontos de lance e +2 ECOQUILDO para si, +50 pontos de lance e +1 ECOQUILDO para o indicado,
            creditados no cadastro (até 10 indicações creditadas por mês). …
[admin]     … Recompensa: +50 pontos de lance e +2 ECOQUILDO ao indicante, +50 pontos de lance e +1 ECOQUILDO
            ao indicado (até 10 por mês por indicante).
```

Nenhum diz «+1 senha»; nenhum diz número diferente de 2/1 para ECOQUILDO; **os papéis não se trocam**
(há teste dedicado à ORDEM: o 1.º ECOQUILDO dito é o do indicante — criado por causa de um mutante
sobrevivente medido pelo próprio autor). O teste lê a fonte legal:

```
$ grep -n "Art. 51" docs/REGULAMENTO-v5.md
225:Art. 51º — … Cada indicação de novo cadastro, após confirmação, concede 2 (dois) ECOQUILDO ao indicante
     e 1 (um) ECOQUILDO ao indicado.
```

⇒ código e Regulamento concordam (o teste `assert.deepEqual([ECO_INDICANTE, ECO_INDICADO], [doRegulamento("indicante"), doRegulamento("indicado")])` passa).

### 3.5 Alegação 5 — idempotência

```
✔ R4 re-execução do mesmo pedido → sem crédito duplo (ECOQUILDO idempotente pelo ref)
assert.deepEqual([eco(A), eco(B)], [2, 1]);
assert.equal(histEco(A).length, 1); assert.equal(histEco(B).length, 1);
assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [3, 300]);
```

Idempotência por **namespace próprio** no histórico da tabela `eco_quildo`
(`eco-indicacao:<indicado>` para o indicante, `eco-indicacao-recebida` para o indicado) — **independente**
das refs do ledger de pontos. Tentei quebrar:

* mutante V2 (ref do indicado passa a `refEcoIndicacao(indicante)`, i.e. deixa de ser 1×/vida) → **morre** (fail=2);
* sonda própria P5 (**indicação recíproca** A↔B, caminhos/refs diferentes):

```
=== P5 A↔B (indicação recíproca) ===
{ "status": 200, "pontos": {"A":100,"B":100}, "eco": {"A":3,"B":3},
  "lastro": {"em":6,"reserva":600} }
```

⇒ 3 = 2 (como indicante) + 1 (como indicado), para cada um, e lastro 6. **Correcto** (ninguém recebe duas
vezes o mesmo papel). A idempotência resistiu.

### 3.6 Alegação 6 — auto-indicação e `ja_indicado`

```
✔ R2 auto-indicação → 400 auto_indicacao e ZERO crédito (pontos e ECOQUILDO)
   assert.deepEqual([r.status, r.corpo?.error?.code], [400, "auto_indicacao"]);
   assert.deepEqual([pontos(A), eco(A)], [0, 0]);
   assert.deepEqual([lastro().total_emitido, lastro().reserva_rs_centavos], [0, 0]);

✔ R3 o mesmo indicado por OUTRO código → 409 ja_indicado e nenhum ECOQUILDO extra
   assert.deepEqual([r.status, r.corpo?.error?.code], [409, "ja_indicado"]);
   assert.deepEqual([eco(A), eco(B), eco(C)], [2, 1, 0]);
```

### 3.7 Alegação 7 — ficheiros intocados (prova por diff E por hash)

```
$ git -C …/wt diff 3f5aac6..80ce770 --stat -- docs/REGULAMENTO-v5.md docs/GUTO-REGULAMENTO.md \
      docs/regras-oficiais.md **/contract.mjs **/*.sol **/hardhat* **/contracts/**
(vazio)
$ git -C …/wt diff 3f5aac6..80ce770 --name-only | grep -iE "env|\.env|netlify.toml|config"
(vazio)

$ md5sum docs/REGULAMENTO-v5.md docs/GUTO-REGULAMENTO.md docs/regras-oficiais.md
7d248be4388f09e6c337b987a8d67774 *docs/REGULAMENTO-v5.md
4232369ff7d5ac18fbba8b40f0171a85 *docs/GUTO-REGULAMENTO.md
36f43060390b37c4c5bd865a4bf2e75a *docs/regras-oficiais.md
$ md5sum C:/Users/Moltbot/Desktop/DESAFIOGUT/docs/…   (os MESMOS três hashes)
```

Lista completa dos 18 ficheiros tocados (`--name-only`): 2 `_logs/`, 3 `_lib/`, 3 `_tests/` backend,
3 `_tests/`… (1 pré-existente + 2 novos), 3 `__tests__/` frontend (1 pré-existente + 2 novos),
5 componentes/páginas + `i18n/pt.js`. **Nada de docs, contrato, env ou flags.** ✅

### 3.8 Alegação 8 — pendências menores

```
✔ D1 Privacidade: zero «senha»/«senhas» no texto visível (passa a «Passe Desafio»)
$ grep -n "senha" src/pages/Privacidade.jsx
(vazio)
✔ D2 pt.js: nenhum VALOR i18n diz «torneio»; o aviso do lance diz «competição»
✔ D3 Termos: a caixa de contacto mostra SÓ o e-mail (Art. 69º do v5.0)
$ grep -nE "98428|grupouniaoetrabalho|www\." src/components/TermosConsentimento.jsx
166:  (92) 98428-5774 e o site www.grupouniaoetrabalho.com.br — deixaram de figurar aqui. O texto   <-- comentário JSX, não visível
170:  📧 Dúvidas: desafiogut01@gmail.com
$ grep -n "Art. 69" docs/REGULAMENTO-v5.md
273:Art. 69º — Dúvidas, informações e sugestões deverão ser encaminhadas exclusivamente através do e-mail
     desafiogut01@gmail.com.
```

---

## 4. Mutações PRÓPRIAS do validador (além das 23 do autor)

Script: `C:/Users/Moltbot/tmp-utac110h2-val/my-mutations.mjs` (fora do worktree).
Instrumento: os mesmos testes-alvo (backend: 19; frontend: 11). Baseline VERDE antes de mutar.

```
baseline back: pass=19 fail=0
baseline front: pass=11 fail=0
✓ MORDE V1  o ECO do indicado vai para o INDICANTE (papel trocado no 2.º crédito)   — fail=6
✓ MORDE V2  o ref do indicado passa a incluir o indicante (deixa de ser 1×/vida)    — fail=2
✓ MORDE V3  lastro com valor FIXO 2 (só o crédito do indicante)                     — fail=5
✓ MORDE V4  o ECO do indicado só entra se o INDICANTE recebeu de facto (assimetria) — fail=1
✓ MORDE V5  motivo do ECO trocado por outro da lista fechada ("passe-relampago")    — fail=2
✓ MORDE V6  reserva sem a conversão para centavos (reservaDe = emitido − usado)     — fail=4
✗ SOBREVIVE V7  endpoint: creditarIndicacao passa a ser chamada no ramo do throttle de IP — fail=0
✓ MORDE V8  endpoint: creditarIndicacao chamada com o indicado como indicante       — fail=6
✓ MORDE V9  pt.js: o aviso do lance volta a «regra do torneio»                      — fail=1
✗ SOBREVIVE V10 PainelIndicacao: 3.º card mostra o crédito do AMIGO (+1)            — fail=0
✓ MORDE V11 ChatbotWidget: o card volta a mostrar o contador morto ao lado          — fail=1
✗ SOBREVIVE V12 TermosConsentimento: telefone posto FORA da caixa (fora dos 280 chars) — fail=0

PROVADOS 9/12 · restauro md5 idêntico em todos
```

**Leitura dos 3 sobreviventes (nenhum deles refuta uma alegação; todos são notas ℹ️):**

* **V7 (ℹ️-1)** — acrescentar um `creditarIndicacao` no ramo do throttle por IP **não** faz falhar nada:
  **o ramo anti-fraude por IP não é testado quanto ao ECO** (nem quanto aos +50 pontos — herdado do 110f).
  A ausência é o comportamento correcto, mas não está pinada por teste.
* **V10 (ℹ️-3)** — o **3.º card** do painel pode passar a mostrar o crédito do **amigo (+1)** em vez do
  indicante (+2) sem reprovar: os dois `+N ECOQUILDO` continuam presentes no ficheiro (parágrafo e convite),
  logo o teste (que verifica o **ficheiro**, não o **card**) não distingue. Granularidade fraca.
* **V12 (ℹ️-4)** — a guarda da caixa de contacto inspecciona **só os 280 caracteres** a partir de
  `estilos.contatoBox}>`: um telefone posto **noutra parte** do mesmo componente do gate passa. A caixa
  está hoje limpa (ver §3.8), logo não é um defeito do entregável — é o **alcance** do instrumento.

### 4.1 Regressão DEMONSTRADA num teste pré-existente ⚠️ (mutante V13)

O teste pré-existente `_tests/utac110h1-guto-indicacao.test.mjs` (guarda «X9/X10 do SEG4») foi
**reescrito** de uma varredura **genérica** de todos os `+N` para duas varreduras **escopadas**:

```diff
-    for (const m of r.matchAll(/\+(\\d+)/g)) assert.equal(Number(m[1]), PONTOS, …);
+    for (const m of r.matchAll(/\+(\\d+) pontos de lance/g)) assert.equal(Number(m[1]), PONTOS, …);
+    for (const m of r.matchAll(/\+(\\d+) ECOQUILDO/g)) { assert.ok([ECO_INDICANTE, ECO_INDICADO].includes(Number(m[1])), …); }
```

Verificação **directa** (mutante V13 = acrescentar « Ganhe +7 bónus.» à resposta do perfil *comum*):

```
$ # guard ANTIGO (3f5aac6:…/utac110h1-guto-indicacao.test.mjs), com V13 aplicado
ℹ pass 3
ℹ fail 2          <-- APANHAVA o «+7»
$ # guard NOVO (80ce770), com V13 aplicado
ℹ pass 5
ℹ fail 0          <-- JÁ NÃO APANHA
```

⇒ Qualquer número inventado de crédito que **não** seja «+N pontos de lance» nem «+N ECOQUILDO» (ex.:
«+7 bónus», «+3 passes») passa a escapar ao GUTO. **O autor declarou** a inversão do ECOQUILDO
(proibir→exigir), mas **não declarou** este estreitamento do alcance numérico. Impacto prático contido
(a regex `\bsenhas?\b` continua a bloquear o vocabulário antigo, e as duas varreduras novas são mais
estritas nos dois créditos reais), mas é uma **regressão mensurável** de força de guarda. Ver ⚠️-1.

Asserções totais do ficheiro: **11 → 15** (nenhuma removida; a inversão é líquida-positiva em contagem).

O outro teste pré-existente alterado, `src/__tests__/utac109h2-carteira.test.mjs`:
**36 → 36** asserções (nenhuma removida); a única alteração é a string `"🎁 Senhas ganhas"` →
`"🎁 Recompensa por indicação"` dentro de um `for` que exige 5 frases visíveis do painel. As 4 primeiras
frases e os botões continuam exigidos, sem alteração.

```
$ git -C …/wt diff 3f5aac6..80ce770 -- desafio-gut/frontend/src/__tests__/utac109h2-carteira.test.mjs
-  for (const frase of ["🎁 Indique e Ganhe", "Seu código de indicação", "👥 Indicados", "✅ Converteram", "🎁 Senhas ganhas"]) {
+  for (const frase of ["🎁 Indique e Ganhe", "Seu código de indicação", "👥 Indicados", "✅ Converteram", "🎁 Recompensa por indicação"]) {
```

**Avaliação: legítima.** A copy do 3.º card mudou por decisão do operador (R18-110h.2-3) num UTAC
posterior; a guarda do 109h.2 era sobre *esta* copy, não sobre a função. Nenhuma capacidade de detecção
foi perdida (a string antiga desapareceu do código por desenho). Não é enfraquecimento.

---

## 5. Achados

### ⚠️ 1 — Regressão de alcance na guarda X9/X10 do GUTO (pré-existente)

* **Onde:** `_tests/utac110h1-guto-indicacao.test.mjs` (`test("TODOS os números de crédito …")`).
* **O quê:** a varredura `/\+\d+/g` (todo e qualquer número) foi substituída por duas varreduras
  escopadas; números de crédito fora de «pontos de lance»/«ECOQUILDO» deixam de ser apanhados.
* **Reprodução (literal):**

```
$ cd C:/Users/Moltbot/tmp-utac110h2-val/wt/desafio-gut/frontend/netlify/functions
$ git -C C:/Users/Moltbot/tmp-utac110h2-val/wt show 3f5aac6:desafio-gut/frontend/netlify/functions/_tests/utac110h1-guto-indicacao.test.mjs > _tests/val-110h1-antigo.test.mjs
$ # mutante V13: perfil comum passa a terminar com "Ganhe +7 bónus."
$ node --test --experimental-test-module-mocks _tests/val-110h1-antigo.test.mjs
ℹ pass 3
ℹ fail 2
$ node --test --experimental-test-module-mocks _tests/utac110h1-guto-indicacao.test.mjs
ℹ pass 5
ℹ fail 0
```

  (o ficheiro temporário `val-110h1-antigo.test.mjs` foi removido; worktree limpo no fim).
* **Recomendação:** repor uma varredura genérica com o conjunto permitido:
  `for (const m of r.matchAll(/\+\d+/g)) assert.ok([PONTOS, ECO_INDICANTE, ECO_INDICADO].includes(Number(m[1])))`.

### ⚠️ 2 — Art. 50º: a reversão da emissão é best-effort e **silenciosa** (dupla falha)

* **Onde:** `_lib/fontes-lance.mjs:143-145`.
* **O quê:** quando o lastro falha, o código reafirma que «desfaz SÓ o que este passo criou» e devolve
  `LASTRO_FALHOU`, mas o resultado de cada `reverterEcoQuildo` é **ignorado** (`.catch(() => ({ ok: false }))`,
  e o valor devolvido `{ok:false}` também não é inspeccionado). Se a **própria reversão** falhar (update do
  Supabase em baixo, ou `CONFLITO_CONCORRENCIA` após 5 tentativas de CAS), o ECOQUILDO **fica creditado sem
  lastro em R$** — e **sem alerta**.
* **Contraste com a doutrina do próprio repo:** `_lib/comprar-passe-tipado.mjs:115-118` faz exactamente o
  mesmo passo **mas chama `captureSecurityAlert(...)`** quando `rev.ok && rev.revertido` não se verifica:

```
$ sed -n '113,120p' _lib/comprar-passe-tipado.mjs
        const rev = await reverterEcoQuildo(endereco, ref).catch(() => ({ ok: false, code: "ERRO_DB" }));
        if (!(rev.ok && rev.revertido)) {
          captureSecurityAlert(`${nome}_reversao_eco_falhou`, { code: rev.code ?? null }, "error").catch(() => {});
        }
```

* **Reprodução (sonda própria P2, fora da suíte — duplo com ambos os updates do Supabase a falhar):**

```
=== P2 lastro falha + reversão falha (lib directa) ===
{ "pontosA": 50, "pontosB": 50,
  "ecoA": 2, "ecoB": 1, "histA": 1,
  "lastro": { "em": 0, "reserva": 0 },
  "ecoQuildo": { "emitidos": 0, "code": "lastro:ERRO_DB",
                 "indicante": {"ok": false, "code": "LASTRO_FALHOU"},
                 "indicado":  {"ok": false, "code": "LASTRO_FALHOU"} },
  "VEREDICTO": "ECO SEM LASTRO (Art. 50º violado)" }
```

* **Alcance:** exige **duas** falhas de escrita simultâneas (lastro **e** reversão) — cenário raro, não
  coberto por R7 (que força falha **só** no lastro, com reversão a funcionar). A alegação 2 é **verdadeira
  no caso declarado e testado**; este é o canto que falta.
* **Recomendação:** verificar `rev.ok && rev.revertido` e `captureSecurityAlert` (como em `comprar-passe-tipado`).

### ℹ️ 1 — O ramo anti-fraude por IP não é testado quanto ao ECO (nem aos +50 pontos)

Mutante próprio **V7 SOBREVIVE** (ver §4). Reprodução indirecta da sonda P3b (12 indicações do mesmo IP):

```
=== P3b 12 indicações do MESMO IP (gate de IP) ===
i=0  status 200  pontosLance {indicante:true, indicado:true}
i=1  status 200  pontosLance {indicante:true, indicado:true}
i=2… status 200  pontosLance null        <-- vincula mas NÃO credita (nem pontos nem ECO)
"quantosComPontos": 2
```

⇒ comportamento **coerente** com o UTAC110f (o ECO acompanha os pontos: onde não há pontos, não há ECO),
mas **não pinado por teste**. Nada a corrigir se for o pretendido (é).

### ℹ️ 2 — `registrarConversao` continua a creditar +1 senha on-chain (DEBT-025) — e continua **vivo** no `comprar-senhas`

* **Declarado pelo autor:** o comentário do topo de `_lib/referral.mjs` diz
  «o crédito on-chain de senhas do modelo antigo continua em `concederBonus` (DEBT-025: morto no caminho do
  endpoint, vivo no `comprar-senhas`)». **Confirmado por leitura e por observação.**
* **Onde:** `comprar-senhas.mjs:351-355` chama `registrarConversao(vinculo, …)` com o vínculo **real**
  (de `buscarVinculoPorIndicado`), e `_lib/referral.mjs:486` (`concederBonus`) e `:591` creditam
  `creditarSenhas(..., 1)` — **indicador +1 e indicado +1**.
* **Contradição com o objectivo do UTAC?** Parcial e **declarada**, não escondida:
  * a **copy** deixa de prometer senhas (feito, testado);
  * o **endpoint** de indicação deixa de as poder dar (mascaramento, confirmado no log `endereco_invalido`);
  * mas um utilizador que **compre um Passe** continua a receber um bónus on-chain de «senha» legado —
    **a mais**, nunca a menos, do que a copy promete. Não há promessa falsa ao utilizador;
  * o contador `senhas_ganhas` continua a alimentar `total_convertidos`-style stats (ver ℹ️-3).
* **Nota:** este é o mesmo sítio que o autor usou para justificar o desvio R18-110h.2-A — a alegação 1 é
  consistente; o que fica é dívida técnica **já declarada** (DEBT-025), não um defeito novo. Recomenda-se
  UTAC próprio para extirpar `concederBonus`/`creditarSenhas` do caminho de compra.

### ℹ️ 3 — O contador `senhas_ganhas` continua a vir da API mas **não é mostrado em sítio visível** (tentativa de refutação falhada)

Tentei encontrar um sítio **visível** que ainda mostre o contador. **Não encontrei.**

```
$ grep -rn "senhas_ganhas" desafio-gut/frontend/src | grep -v node_modules
src/components/PainelIndicacao.jsx:42:  useState({ … senhas_ganhas: 0 … })      <-- estado, não renderizado
src/components/PainelIndicacao.jsx:55:  setDados({ … senhas_ganhas: 0 … })      <-- estado
src/components/PainelIndicacao.jsx:64:  senhas_ganhas: Number(d.senhas_ganhas || 0)  <-- leitura, não renderizado
src/__tests__/…                                                                 <-- testes
$ grep -n "senhas_ganhas" netlify/functions/referral.mjs netlify/functions/chatbot.mjs
referral.mjs:78:  senhas_ganhas: stats.senhas_ganhas,      <-- resposta da API (fora do escopo autorizado)
chatbot.mjs:950:  senhas_ganhas: stats.senhas_ganhas,      <-- resposta da API (fora do escopo)
```

⇒ **zero** sítios de renderização. O campo morto (DEBT-025) permanece no contrato HTTP e no estado do
cliente (limpeza pendente, fora do âmbito declarado). A alegação 3 é **verdadeira** também neste ponto.

### ℹ️ 4 — Alcance do instrumento: guardas por ficheiro/por fatia, não por elemento

Mutantes próprios **V10** (3.º card do painel trocado pelo crédito do amigo, `fail=0`) e **V12**
(telefone posto fora dos 280 caracteres da caixa de contacto, `fail=0`) sobrevivem. Não refutam nenhuma
alegação (o estado actual está correcto e verificado), mas mostram que essas duas guardas **não pinam o
elemento**: pinam o ficheiro inteiro e uma fatia de 280 caracteres, respectivamente. Nota para o SEG6:
se se quiser rigidez a esse nível, assere-se o bloco exacto.

### ℹ️ 5 — `creditarIndicacao(A, <endereço inválido>)` credita o indicante (assimetria, inalcançável por HTTP)

Sonda própria P1 (chamada directa à libraria):

```
=== P1 indicado inválido (lib directa) ===
{ "ok": false, "pontosA": 50, "ecoA": 2, "ecoB": 0,
  "indicante": {"ok": true, "creditado": true, "pontosLance": 50},
  "indicado":  {"ok": false, "code": "ENDERECO_INVALIDO"},
  "ecoQuildo": {"emitidos": 2, "indicante": {"ok": true, "creditado": true},
                "indicado": {"ok": false, "code": "ENDERECO_INVALIDO"}},
  "lastro": {"em": 2, "reserva": 200} }
```

O ECO do indicante (+2, com lastro) entra mesmo com um indicado inválido — **assimetria herdada** do
padrão dos pontos de lance (UTAC110f credita o indicante antes de tentar o indicado). **Não é
alcançável pelo endpoint**: `referral.mjs:96-99` valida o `endereco` com `validarEndereco(body.endereco)`
antes de qualquer crédito. Nenhum teste pré-existente quebra se se passar a exigir `indicadoRes.ok`;
fica como nota de higiene da libraria.

---

## 6. O que NÃO consegui testar (lacunas declaradas)

1. **Produção / Supabase real.** Proibido pelo âmbito. Tudo o que se mediu usa duplos. Em especial:
   * a migração `desafio-gut/frontend/supabase/migrations/20261014_utac110e_eco_quildo.sql` **existe** no
     worktree, e os testes **inserem manualmente** a linha única do lastro (`id = 1`) no `beforeEach`
     (comentário explícito: «a migração 20261014 insere em produção a linha ÚNICA … o duplo tem de a ter,
     senão o teste mente»). **Não verifiquei em produção** que a linha existe — se faltar, a sonda P6 mostra
     o resultado: **todo o ECO é revertido** e o crédito fica **inerte** (`code: "lastro:LASTRO_AUSENTE"`,
     ver abaixo). Fica declarado como risca de implantação a confirmar pelo SEG6/operador.
     ```
     === P6 lastro ausente ===
     { "pontosA": 50, "ecoA": 0, "ecoB": 0,
       "ecoQuildo": { "emitidos": 0, "code": "lastro:LASTRO_AUSENTE", … } }
     ```
   * Idem para as CHECKs: o duplo modela `saldo >= 0`, histórico array e contadores `>= 0` (fiéis à migração),
     mas **o CAS real** (`.eq("atualizado_em", …)` sobre `timestamptz`) não foi exercido contra o Postgres.
2. **Render visual.** A copy foi validada por análise estática (o próprio teste o declara: «não prova render
   — a prova visual são as 2 capturas do SEG4»). Não abri browser nem fiz capturas.
3. **Concorrência real.** O limite de 10/mês tem a limitação declarada no código («o CAS impede só a
   duplicação, não o excesso»); não a reproduzi em paralelo (exigiria instrumentação de escrita concorrente
   no duplo) — o autor já a declara medir 9+6→14 noutro contexto.
4. **`REFERRAL_ATIVO` em produção.** Nos testes a variável é apagada; observei `referralAtivo()` a devolver
   verdadeiro nesse estado (o log do probe mostra `concederBonus` a chegar ao teste de formato do endereço).
   **Não testei** o comportamento com a flag desligada no endpoint real.
5. **Ramo do throttle de IP** quanto ao ECO (ℹ️-1) — sem teste, por desenho.

---

## 7. Confirmação final de integridade

| Alvo | Comando | Resultado |
|------|---------|-----------|
| `docs/REGULAMENTO-v5.md` | `git diff 3f5aac6..80ce770 --stat -- docs/REGULAMENTO-v5.md` | **vazio** · md5 `7d248be4388f09e6c337b987a8d67774` = repo Desktop |
| `docs/GUTO-REGULAMENTO.md` | idem | **vazio** · md5 `4232369ff7d5ac18fbba8b40f0171a85` = repo Desktop |
| `docs/regras-oficiais.md` | idem | **vazio** · md5 `36f43060390b37c4c5bd865a4bf2e75a` = repo Desktop |
| Contrato on-chain (`**/contract.mjs`, `**/*.sol`, `**/hardhat*`, `**/contracts/**`) | `git diff --stat -- <padrões>` | **vazio** |
| Env vars / `netlify.toml` / config (`_lib/recursos-app-config.mjs`) | `git diff --name-only \| grep -iE "env\|\.env\|netlify.toml\|config"` | **vazio** |
| `EM_BREVE_MODE` | não aparece em nenhum ficheiro tocado | **intacto** |

Estado final do worktree: **limpo** (`git status --short` vazio); o ficheiro de sonda
`_tests/val-probe.mjs` e o temporário `_tests/val-110h1-antigo.test.mjs` foram **removidos**;
nenhum ficheiro foi escrito em `C:/Users/Moltbot/Desktop/DESAFIOGUT`.

---

## 8. Síntese

* **8/8 alegações confirmadas** com prova reproduzível (nenhuma refutada).
* **2 ressalvas ⚠️**: (1) regressão mensurável de alcance na guarda numérica X9/X10 do GUTO, não declarada
  — o guard antigo apanhava `+7`, o novo não; (2) Art. 50º num canto de dupla falha (lastro **e** reversão),
  em que a reversão falha em silêncio e sem alerta, ao contrário da doutrina de `comprar-passe-tipado.mjs`.
* **5 notas ℹ️**, todas de higiene/alcance de instrumento, nenhuma refutando uma alegação.
* **Mutantes próprios:** 9/12 mordem; 3 sobrevivem (V7, V10, V12) — todos declarados como lacunas de
  cobertura/granularidade, nenhum escondendo um defeito activo.
* **Regressões:** 1 enfraquecimento demonstrado (⚠️-1); a alteração a `utac109h2-carteira.test.mjs` é
  **legítima** (36→36 asserções; copy alterada por decisão do operador).

### **VEREDICTO FINAL: APROVADO COM RESSALVAS**
