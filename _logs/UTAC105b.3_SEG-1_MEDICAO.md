# UTAC105b.3 — SEG-1 · Medição (2026-10-01)

Skill UTAC01, **modo manual**. Tipo: `saneamento` (fecha a pendência **V-4** declarada pelo UTAC105b.2).
**Neste segmento nada é alterado** (só leitura; o PoC corre por cópia temporária em `_tests/`, apagada).

## -1.1 Estado do repositório
| item | medido |
|---|---|
| baseline | **`00610b0`** — spec dizia «medir no SEG-1» ⇒ **confere** com o fecho do UTAC105b.2 |
| `origin/main` | `00610b0` (sincronizado) |
| suíte | **frontend 535/535 · backend 956/962 · VEREDITO VERDE** (`node scripts/mc966-suite-harness.mjs ambos`, da raiz, foreground) — coincide com o esperado no spec (~535/535 · ~956/962) |
| disco | **17 GB** livres (`df -h /c`) ⇒ ≥ 5 GB, **ST2 não dispara** |
| working tree | só `package-lock.json` (pré-existente à série — não é deste UTAC) |

## -1.2 Existência dos caminhos nomeados
| caminho | estado |
|---|---|
| `desafio-gut/frontend/netlify/functions/cotas.mjs` | ✅ existe (694 l.) |
| `_lib/cotas-store.mjs` | ✅ existe (fonte do `colunas()`/`getCota`/`upsertCota`) |
| `src/pages/SejaNossoParceiro.jsx` | ✅ existe (consumidor do `register-corporativo`) |
| `_tests/utac105b2-register.test.mjs` | ✅ existe (25 testes — **não se toca**, GATE 15 da série) |
| `_tests/utac105b3-register-endereco.test.mjs` | ❌ não existe ⇒ **a criar** (autorizado) |

## -1.3 Fontes de conteúdo
Os UTAC105b.1/b.2 fechados dão o padrão (`MC89.38`), o veredicto do SEG3 do b.2 deu o achado (**V-4**), e
`_lib/cota-ativacao.mjs` dá a consequência. Nenhum valor foi inventado.

## -1.4 Medições específicas (as 3 premissas de segurança do spec)
O spec condiciona: «se o SEG-1 confirmar que o cadastro legítimo só posta quando o CNPJ não existe e não
envia `endereco`, a correcção é segura. Se não confirmar → **PARAR** e reportar.»

| # | premissa | medido | fonte |
|---|---|---|---|
| (a) | o frontend **não envia `endereco`** (nem `accessToken`) | **CONFIRMADO** — corpo = `cnpj, empresa, segmento, site, logoUrl, email` + header `X-Visitor-ID` | `SejaNossoParceiro.jsx:203-212` |
| (b) | o POST **só corre quando o CNPJ não existe** | **CONFIRMADO** — FASE B (`:171`) faz `GET cotas?cnpj=…&empresa=…` antes; se existe (`checkRes.ok`) a página **não chega** ao POST (painel / «CNPJ já registado» / OTP). A FASE C só corre no `404` | `SejaNossoParceiro.jsx:171-200` |
| (c) | o `endereco` do **corpo** define a identidade **sem prova de posse** | **CONFIRMADO** — `const clienteId = endereco ?? \`cnpj:${cnpjNums}\``; o `endereco` só passa por `validarEndereco` (formato), nunca por posse. A guarda do UTAC105b.2 protege apenas cotas que **já existem**; na **criação** (este caso) não há nada a proteger | `cotas.mjs:377-396` |

⇒ **As 3 premissas conferem** ⇒ a correcção é segura para o cadastro legítimo. **SEGUIR.**

## -1.5 PoC — o V-4 reproduzido por execução (estado ANTES de qualquer correcção)
`C:/Users/Moltbot/tmp-utac105b3/poc-utac105b3.mjs` (handler **real**; duplos só nas fronteiras externas;
CNPJs **sintéticos**). Saída: `_logs/UTAC105b.3_SEG-1_poc_ANTES.txt`.

| caso | resultado medido |
|---|---|
| **V1** anónimo + `endereco` DE OUTRA pessoa (sem cota) | **201 e ESCREVEU** → criou cota ali: `empresa="INVASOR LTDA" cnpj=44455566000183` ⛔ **V-4** |
| **V2** anónimo + `endereco` de outro (2.º) | **201 e escreveu** ⛔ **V-4** |
| **V5** **logado** com `endereco` DE OUTRO + token próprio | **201 e POLUIU** a cota dela (`empresa="Sou Outro"`) ⛔ **V-4 (variante)** |
| **V3** legítimo: anónimo **sem** `endereco` | **201 e criou** `cnpj:77788899000183` ✅ (não se pode quebrar) |
| **V4** logado com o **próprio** `endereco` | **201 e criou** ✅ (contrato MC12.3.1 — tem de continuar) |
| **V6** admin com `endereco` de outro | **201 e escreveu** ✅ (acesso total, desenho) |

**V5 é exactamente o «erro esperado se ambíguo»** que as notas de arranque do spec previram: corpo com
`endereco` + token de OUTREM ⇒ a regra é **403** (mesmo padrão do `update-corporativo`). Hoje dá 201.

## -1.6 A consequência na activação (confirmada no código, não suposta)
`_lib/cota-ativacao.mjs:36-47` — `ativarCotaPaga` faz `const existente = (await getCota(k)) ?? {}` e monta
`{ ...existente, cliente_id: existente.cliente_id || endereco, endereco: existente.endereco ?? endereco,
tipo: existente.tipo || "corporativo", … }`, com o comentário «Mescla: **preserva tipo/empresa/cnpj** do
registo corporativo» ⇒ se a pessoa poluída activar depois uma **cota paga** no mesmo endereço, o registo do
atacante (`empresa`/`cnpj`/`email`) é **herdado**.
**Severidade medida: poluição de dados/aparência — não é privilégio, não destrói valor, não revela PII.**

## -1.7 Erros dos meus instrumentos (declarados)
1. **PoC — objectos de resultado incompletos:** os casos V3/V4 não levavam o campo `escreveu`, e o resumo
   final imprimia «NÃO criou»/«recusou» para dois casos que **criaram** (o detalhe por caso estava certo).
   Corrigido e re-executado; a evidência guardada é a versão corrigida.

## -1.8 Conflitos e ambiguidades (AU3 / HARD GATE 12)
Nenhum **bloqueante**: as 3 premissas do spec conferem e o spec define a regra para o caso ambíguo
(`endereco` de outro → **403**). Registo, para o operador, **uma** observação não-bloqueante:
> ⚠️ O spec autoriza alterar «apenas o ramo `register-corporativo`» e **proíbe** tocar no
> `update-corporativo` (fechado no b.1) e no **POST genérico** (fechado no b.2). A correcção do V-4 é feita
> **dentro do ramo `register-corporativo`** e **reutiliza** o `resolverChamador` que o b.2 já lá tem — não
> se toca em nenhum dos dois ramos proibidos. **Sem conflito.**

## -1.9 VEREDITO DO SEG-1: **SEGUIR**
Baseline e suíte conferem; as 3 premissas de segurança do spec confirmadas por medição; o V-4 está
reproduzido por execução; nenhuma ambiguidade bloqueante. Avança para as frentes.

---

# RETOMADA (executor seguinte, 2026-10-01) — §-1.10 a §-1.12

## -1.10 O que aconteceu entre o SEG-1 e a retomada
A correcção foi escrita e provada, mas a suíte canónica ficou **VERMELHA (7 falhas)** e o UTAC parou
(**ST4**). Causa apurada: `_tests/cotas-anti-fraude.test.mjs` (ficheiro **PRÉ-EXISTENTE**, fora da
lista `autoriza` do spec) tinha 7 testes que registavam por «anónimo + `endereco` no corpo» — o
contrato exacto que o V-4 manda fechar. Relatório de paragem: `Desktop/RELATORIO-UTAC105b.3.txt`
(substituiu o `-PARAGEM.txt`, que já não existe).

## -1.11 Re-medição pelo executor que retomou (medida própria, não herdada)
| item | medido agora |
|---|---|
| baseline | `00610b0` = `origin/main`; **0 commits à frente** |
| working tree | só `package-lock.json` (**pré-existente à série**; não é deste UTAC) |
| suíte baseline | **frontend 535/535 · backend 956/962 · VERDE** (coincide com o §-1.1) |
| disco | **21 GB** livres ⇒ ≥ 5 GB (ST2 não dispara) |
| PoC (Frente A) | V1/V2/V5 em 201-escreveu ⛔ — **saída byte-idêntica** à de `_SEG-1_poc_ANTES.txt` |
| correcção aplicada | teste novo **11/11**; `cotas-anti-fraude.test.mjs` → **7 falhas** |
| + OPÇÃO A | suíte **535/535 · 967/973 · VERDE**; legado **14/14** |

⇒ o conflito spec-vs-suíte do §9 do relatório de paragem está **confirmado por medição independente**,
e a OPÇÃO A resolve-o **sem tocar em nenhuma asserção**.

## -1.12 DECISÃO DO OPERADOR — **R18-5** (desbloqueia a retomada)
> **R18-5 = OPÇÃO A.** Autorizado editar `_tests/cotas-anti-fraude.test.mjs` **APENAS** no helper
> `reqRegister` (+ os 12 `await` nos call sites). **Asserções intactas, comportamento testado
> inalterado.** Suíte esperada: 535/535 · 967/973 VERDE. Autorização formal do operador, 2026-10-01.
> *Consequência declarada do V-4 (aceite por esta decisão):* o contrato do MC12.3.1 muda **apenas** no
> caso «anónimo + `endereco` no corpo» — que passa de 201 a **401**; «logado com token de OUTRO +
> `endereco` de terceiros» passa a **403**.

**Registo nos 3 lugares (P4/R18):** este log · `CLAUDE.md` · `Desktop/UTAC105b.3-RELATORIO.md`.

## VEREDITO DA RETOMADA: **SEGUIR** — frentes A/B/C executadas (ver `_logs/UTAC105b.3_SEG0.md`)
