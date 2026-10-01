# UTAC105b.1 — SEG1 · Frente B: aplicar autenticação (MC89.38) (2026-09-30)

## 1.1 Baseline do padrão (reconfirmado)
- **`produtos.mjs:296-354`** (referência do enunciado): com `body.cliente_id` presente →
  (a) `cliente_id` == endereço do JWT → passa; senão (b) admin → passa; senão (c) cota com
  `endereco` == endereço do JWT → passa; senão **403 `endereco_nao_corresponde`**.
  Leitura de cota que falha → `null` → **fail-closed**.
- **Padrão irmão DENTRO do `cotas.mjs`** (linhas 294-313, ação `consultar por cliente_id`):
  `resolverChamador(req)` → **401 `token_ausente`** se `papel === "anon"` → `validarOwnerOuAdmin` →
  **403**. `resolverChamador` **já resolve admin** (l.169). Foi este o esqueleto reutilizado
  (GATE 5 — reutilização, não invenção).

## 1.2 A correcção — 2 ficheiros, escopo cirúrgico provado ao carácter
| ficheiro | md5 (LF) antes → depois | linhas |
|---|---|---|
| `netlify/functions/cotas.mjs` | `0a30f401ac45c51e` → `4bfca3a8e7526a97` | 607 → 647 |
| `src/pages/CorporativoDashboard.jsx` | `678ee34a2a2fed5e` → `fcdf830e42781712` | 638 → 642 |

⚠️ **Errata do validador (SEG3 §0), aceite:** o md5 `3965732626899a1bee96ffe7586d8ac3` que uso na prova de mutação é a
renderização **CRLF do working tree**; o md5 do **conteúdo LF** (= o que o git guarda) é `4bfca3a8e7526a9794e3755ee7dee446`.
Nenhum desvio no repo — era a **minha régua** (md5sum sobre o ficheiro CRLF) a medir outra coisa. Confirmado por `tr -d '\r'`.

O commit `828f719` tem **7 ficheiros**: os 3 de código/teste + os 4 `_logs/` deste UTAC. «Só 3 ficheiros» = só 3 **fora de `_logs/`**.

**Verificação de escopo (medida):** em `cotas.mjs`, **tudo o que vem ANTES e tudo o que vem DEPOIS**
do bloco `update-corporativo` é **byte-idêntico ao HEAD** (`== True` / `== True`); o
`guardAdmin(req)` e o `export default` continuam intactos. Nenhum outro endpoint, nenhuma outra
função, nenhuma migração, nenhum dado.

**Backend** (`cotas.mjs`): depois de validar `cliente_id`, entra a guarda MC89.38 —
1. `resolverChamador(req)` → `papel === "anon"` → **401 `token_ausente`**;
2. leitura da cota em `try/catch` → falha = **502 `store_indisponivel`** (fail-closed);
3. não-admin: `ehProprio` (cliente_id == endereço do JWT, normalizado) **ou** `vinculado`
   (cota.`endereco` == endereço do JWT) → senão **403 `endereco_nao_corresponde`**;
4. só então o 404/`tipo` e a escrita.
⇒ **401/403 têm prioridade sobre o 404**: um atacante não descobre se a cota existe.

**Comentário corrigido:** o texto falso da l.484 foi substituído por um bloco que diz o que o código
faz, com o PoC, a regra e o registo do defeito.

**Frontend** (`CorporativoDashboard.jsx`): +2 linhas, no idioma **já usado 3× no mesmo ficheiro**
(l.247/288/308): `const token = authToken || await obterAuthToken?.();` e `, { token }` no `apiPost`.
⚠️ Errata: eu escrevi «l.241/282/302» e «~l.100»; o validador mediu **l.247/288/308** e o `apiPost` na **l.103**.

### ⚠️ Desvios declarados (R15/R20)
1. **502 no caminho de erro de leitura** — o código antigo deixava a excepção subir (500). Passa a
   502 `store_indisponivel`, com o mesmo formato do `cotas.mjs:289` (lookup por email). Motivo: tornar
   o **fail-closed explícito e testável** (A13). Não autoriza nem grava em nenhum caso.
2. **`cnpj:XXXX` sem `endereco` → 403 para o dono** — **aceite e documentado pelo operador**
   (decisão **R18-2**, resposta «opção 1»). É o mesmo trade-off que o `produtos.mjs` já assumiu.
3. **`cliente_id` em MAIÚSCULAS → 404** — **pré-existente** (a leitura não normaliza) e **fora do
   escopo**: não se corrige aqui. Registado no teste A2.

## 1.3 Teste bidireccional (16 casos) + mutação (8 mutantes)
`_tests/utac105b1-cotas.test.mjs` → **16/16 VERDE**.
Cobertura: A1 dono · A2 maiúsculas (404 pré-existente) · A3 sem token 401 · A4 sem token + inexistente
401 · A5 token inválido 401 · A6 token **expirado** 401 · A7 token de outro 403 · A8 token de outro +
inexistente 403 · A9 `cnpj:` **com** `endereco` == JWT → 200 (ramo b) · A10 `cnpj:` sem `endereco` →
403 (R18-2) · A11 o mesmo com admin → 200 · A12 admin → 200 · A13 **falha de leitura → 502**
(fail-closed) · A14 campos protegidos não sobrescritos · A15 sem `cliente_id` → 400 · A16 `tipo` ≠
corporativo → 404. Em A3/A7/A10/A13/A15/A16 verifica-se também que **`upserts.length === 0`** (não
basta recusar: não pode gravar).

**Mutação** (`C:/Users/Moltbot/tmp-utac105b1/mut-utac105b1.mjs`, fora do repo, corre 1×):
```
base (sem mutação): 16/16 VERDE ✅
M1 sem o 401 ............................... RED ✅ (A3,A4,A5,A6)
M2 sem o 403 ............................... RED ✅ (A7,A8,A10)
M3 sem a excepção do admin ................. RED ✅ (A11,A12)
M4 sem normalizar a caixa na guarda ........ RED ✅ (A2)
M5 sem o ramo (b) (vínculo por endereco) ... RED ✅ (A9)
M6 falha de leitura engolida (fail-open) ... RED ✅ (A13)
M7 404 antes do 401 (revela existência) ..... RED ✅ (A3,A4)
M8 espalhar o body por cima da cota ......... RED ✅ (A14)
md5 depois: 3965732626899a1bee96ffe7586d8ac3 = igual ao de antes ✅
VEREDITO MUTACAO: TODOS OS MUTANTES COMO ESPERADO
```
**8/8 mutantes mortos, md5 restaurado idêntico.**

### 1.3b Correcções PÓS-VEREDICTO (achados F2/F3 do validador) — declaradas como não re-validadas
O validador apontou duas **lacunas de teste** (não buracos na guarda) e propôs os casos. Foram acrescentados
(os testes são ficheiro autorizado) + 2 mutantes novos:
- **A17 (F2):** cota `cnpj:` com `endereco` em **caixa mista (EIP-55)** → **200**. Sem ele, o
  `.toLowerCase()` aplicado ao `endereco` **da cota** não era exercido — e um payload legado em caixa mista
  bloquearia o **dono legítimo** com 403.
- **A18 (F3):** sem token **E** leitura em falha → **401** (e não 502). Fixa a **ordem** 401-antes-da-leitura;
  sem ele, mover o 401 para depois do `try/catch` daria a um anónimo o oráculo «store em baixo» (502).
- Mutantes **V6** (`toLowerCase` da cota) e **V7** (reordenar o 401 para depois da leitura) → **RED ✅ (A17/A18)**.
⇒ **10/10 mutantes mortos** com **18/18 testes verdes**. Ferramenta: `mut-utac105b1.mjs` (saída em
`C:/Users/Moltbot/tmp-utac105b1/mut-utac105b1_saida.txt`).
⚠️ Estas adições vieram **depois** do veredicto ⇒ ficam declaradas como **não re-validadas por um agente
independente** (verificadas por quem as escreveu + mutação), como manda o precedente da série.

### ⚠️ Dois erros MEUS, declarados (R8/precedente da série)
1. **O script de mutação deixou o M1 aplicado.** A 1.ª versão usava `execFileSync`, que **lança** em
   exit ≠ 0 — e exit ≠ 0 é o resultado **esperado** num mutante. O script rebentou **depois** de
   escrever o mutante e **antes** do restauro, deixando o `cotas.mjs` sem o 401 (md5
   `b2a88129…`). Apanhado por conferência de md5, **restaurado à mão byte-a-byte** e conferido
   (`3965732626899a1bee96ffe7586d8ac3`). Correcção: `try/catch` + restauro em `finally`.
2. **Previsão errada sobre o M4.** Declarei-o **equivalente** (não matável) no rodapé do teste.
   **Estava errado**: removê-lo faz o A2 dar 403 em vez de 404, logo o mutante **morre**. O rodapé foi
   corrigido para o que foi medido, com a previsão errada **à vista** (não apagada).

## 1.4/1.5 Nada quebrou (GATE 4)
- **Suíte:** frontend **535/535** (inalterado) · backend **929/935** = 913/919 **+16**, exactamente os
  testes novos. **VERDE.**
- **A/B do painel:** PoC antes → dono 200/escreveu, admin 200/escreveu; depois → **dono 200/escreveu,
  admin 200/escreveu** (zero regressão), e sem token 200→**401**, token alheio 200→**403**.
- **Build do frontend:** `npx vite build --outDir <temp>` → **✓ built in 9.24s** (exit 0; chunk
  `CorporativoDashboard-*.js` emitido). Só avisos `INVALID_ANNOTATION` em `node_modules/ox` (não
  relacionados). Build feito para pasta temporária (`dist/` é gitignored) e **apagada** depois.
