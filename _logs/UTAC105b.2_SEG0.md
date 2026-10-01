# UTAC105b.2 — SEG0 · Frente A: P0 do `register-corporativo` (2026-10-01)

## 0.1 PoC primeiro — o defeito, provado por execução
Script ad-hoc `C:/Users/Moltbot/tmp-utac105b2/poc-utac105b2.mjs` (fora do repo), handler **real**,
duplos só nas fronteiras, CNPJs **sintéticos**. Saídas: `poc_ANTES.txt` / `poc_DEPOIS.txt`.

| caso | ANTES | DEPOIS |
|---|---|---|
| **R1** anónimo com o `endereco` DA VÍTIMA (cnpj novo) | **201 e escreveu** · cota da vítima: `empresa="INVASOR LTDA" cat=null vendida=false valor=0` | **401, não escreveu** · cota **intacta**: `"LOJA DA VITIMA" ouro true 55000` |
| **R2** anónimo com o `endereco` E o CNPJ DA VÍTIMA | **201 e escreveu** (`"INVASOR 2"`) | **401, não escreveu** |
| **R3** CADASTRO LEGÍTIMO (cota nova, sem endereço) | 201 e criou `cnpj:77788899000183` | **201 e criou** (inalterado) |
| **R4** repetir o MESMO registo | 201 (escreveu por cima) | 401, não escreveu |
| **FC** POST genérico de admin sobre cota com `endereco` | **`endereco=null` — APAGOU a coluna** | **`endereco` preservado** |

⇒ O P0 e a Frente C ficaram **reproduzidos por execução** (não por leitura) e **fechados** no mesmo A/B.

## 0.2 A correcção (guarda de posse, antes do upsert)
Inserida entre o bloco anti-Sybil e a montagem do registo (minimiza o diff e **não reordena** nada do
que já existia). Estrutura **igual à do `update-corporativo`** (UTAC105b.1) — reaproveitamento, não
invenção (GATE 5):
1. `const chamadorReg = await resolverChamador(req);`
2. `getCota(clienteId)` em `try/catch` → **502 `store_indisponivel`** (fail-closed; a leitura que falha
   **não** vira autorização).
3. Se `existenteReg` e o chamador **não** é admin: `ehProprio` (cliente_id == JWT, normalizado) **ou**
   `vinculado` (cota.`endereco` == JWT) → senão **401** (anónimo) / **403** (utilizador), **sem escrever**.
4. Cota **NOVA** (não existe) → segue como antes: o cadastro directo `cnpj:…` continua a criar (B3).

**Ordem deliberada:** a guarda fica **depois** do 409 do anti-duplicidade (MC12.3) e **antes** do
`upsertCota` — as verificações existentes mantêm a ordem que tinham, e `B11` prova que o 409 continua vivo.

## 0.3 Teste bidireccional — **14/14 VERDE**
`node --test --experimental-test-module-mocks _tests/utac105b2-register.test.mjs`
`B1` anónimo+endereco da vítima → **401, não escreve, cota intacta** · `B2` idem com o CNPJ da vítima ·
`B3` **cadastro legítimo → 201 e CRIA** (P10) · `B4` dono (JWT == cliente_id) → 201 · `B5` ramo (b) → 201 ·
`B6` admin → 201 · `B7` autenticado não-dono → **403** · `B8` cota `cnpj:` sem endereço + anónimo → 401 ·
`B9` falha de leitura → **502 fail-closed** · `B10` repetição → 401 sem escrever · `B11` 409 intacto ·
`B12` cota nova com endereço próprio → 201 · `C1`/`C2` Frente C.

## 0.4 Mutação (T1) — **6/6 RED**, md5 restaurado
`C:/Users/Moltbot/tmp-utac105b2/mut-utac105b2.mjs` (restauro em `finally` — lição do UTAC105b.1, onde um
mutante ficou aplicado):
```
MA1 sem a guarda de posse ................. RED ✅ (B1,B2,B7,B8,B10)
MA2 anónimo tratado como utilizador ....... RED ✅ (B1,B2,B8,B10)
MA3 sem a excepção do admin ............... RED ✅ (B6)
MA4 sem o ramo (b) `vinculado` ............ RED ✅ (B5)
MA5 leitura do store engolida (fail-open) . RED ✅ (B9)
MA6 Frente C: não preservar `endereco` .... RED ✅ (C1)
md5 depois = md5 antes (c5368150cc04b871f0f0e417d5a85de7) ✅
```

## 0.5 A/B pareado + não quebrar nada
- **Antes/depois** na tabela 0.1: os dois ataques `201 → 401`; o **cadastro legítimo `201 → 201`**; FC
  `endereco apagado → preservado`.
- Suíte: `node scripts/mc966-suite-harness.mjs ambos` (foreground) → **frontend 535/535 (inalterado) ·
  backend 945/951** (= 931/937 **+14**, os testes deste UTAC) · **VEREDITO VERDE**.
- **Escopo cirúrgico medido:** `cotas.mjs` **+46 linhas / −0** (647→693 no diff, 648→694 com o LF final);
  o **prefixo** e o **sufixo** do ficheiro, fora dos dois blocos inseridos, são **byte-idênticos** ao
  `966a587`. md5(LF) `4bfca3a8e7526a97` → `1898dc6bdbf458bd`. Único ficheiro de produção alterado.

## 0.6 Erros dos meus próprios instrumentos (declarados, corrigidos)
1. **PoC — flag `escreveu` pegajoso:** não era reiniciado por caso, logo o `R4`/`B10` mostravam a escrita
   do caso anterior. Corrigido (`writes.length = 0`) e o R4 passou a `(nao escreveu)`.
2. **B5 e B8 — setup inválido (2 testes vermelhos):** eu semeava a cota da vítima **e** a cota `cnpj:`
   com o **mesmo CNPJ** → o anti-duplicidade disparava **409** e mascarava o ramo (b). Corrigido para
   semear só a cota em causa.
3. **B10 — flag pegajoso no 2.º pedido.** Corrigido (`escritas = []` antes da repetição).
4. **C2 — status inventado:** esperava **200** para cota nova no POST genérico; o código devolve **201**
   (`cotas.mjs:650`, `existente ? 200 : 201`). Expectativa minha **inventada** → corrigida para 201.
5. **Fronteira em falta:** o POST genérico entra em `creditarTrocoExcedente` → Supabase real (rebentava
   por falta de env). Passei a duplicar `_lib/troco-senhas.mjs` (fronteira externa legítima).
6. **CNPJs sintéticos:** a 1.ª versão usava uma base que calhava ser o CNPJ **real** do projecto; trocada
   por bases sintéticas (nunca ecoar identificadores reais).

## 0.7 Achados FORA do escopo (registados, NÃO corrigidos — GATE 12 / AU3)
- **⚠️ F-1 (o POST genérico destrói o payload corporativo inteiro).** Medido (PoC §FC2): como
  `cotas-store.colunas()` grava **`payload: registro`** (l.34) e `getCota` devolve o `payload`, o POST
  genérico de admin — cujo registo só tem os campos de lance — **elimina `tipo`, `empresa`, `segmento`,
  `site`, `logoUrl`, `origem` e `cadastradoEm`** dessa cota. Consequência: a cota deixa de ter
  `tipo: "corporativo"` (o `update-corporativo` passa a dar 404 ao dono) e perde o `endereco` (antes
  desta correcção). A Frente C resolve **só** o `endereco`, que é o que o UTAC autoriza. O resto é
  **pré-existente**, exige decisão de desenho (que campos o POST genérico pode substituir) ⇒ **candidato
  a UTAC**, não decisão do executor.
- **ℹ️ F-2 (idempotência).** Ver SEG-1 §-1.7: «repetir o próprio registo → 200» não é implementável sem
  ou escrever (destruir) ou revelar o registo a um anónimo (proibido pelo MC87/P0-1). Decisão declarada:
  **401 sem escrita**. Se o operador quiser o 200, é 1 linha — com o custo de informação descrito.

## 0.8 VEREDITO DO SEG0: **FECHADO** — P0 fechado, provado por A/B, 14 testes, 6/6 mutantes, suíte verde.
