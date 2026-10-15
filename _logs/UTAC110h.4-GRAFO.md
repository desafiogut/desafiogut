# UTAC110h.4 — GRAFO SOCIAL · MEDIÇÃO E CLASSIFICAÇÃO (FRENTE B)
> Baseline `57fe37d`. **Só diagnóstico — nada foi alterado para produzir este ficheiro.**
> Objecto: a **aresta** `indicador ↔ indicado` (grafo social) nas superfícies do sistema.
> Raiz: `desafio-gut/frontend/` (ver a NOTA DE TOPOGRAFIA do `UTAC110h.4_SEG-1_MEDICAO.md` §-1.1 — a raiz
> do repo tem uma árvore `netlify/` **residual** e uma varredura lá devolve 0 e engana).

---

## 1. O instrumento do enunciado (§e) é CEGO — medido

O enunciado propõe:
`grep -rn "registrarConversao|indicante.indicado|indicou" netlify/functions/ src/ ...`

| padrão | ocorrências reais (fora de `_tests/`) | leitura do instrumento |
|---|---|---|
| `indicou` | **0** | «não há fugas» |
| `indicante.indicado` | **0** | «não há fugas» |
| `registrarConversao` | **3** (todas **chamadas**, nenhuma é log) | «há 3» |

⇒ o instrumento do enunciado devolve **«não há fuga nenhuma»** com **8 arestas reais** a descoberto. É
a **mesma família de defeito** do MC96.5 (o `^.` que casava bytes e devolvia vazio, lido como
«vermelho»): *um instrumento que devolve vazio não mede «não há» — mede «não procurei»*.

**Instrumento que FOI usado** (substituto, por semântica e não por palavra):
`grep -rn "indicador:\|indicado:\|endereco:"` sobre os argumentos de `console.*`, mais a enumeração das
**duas** funções que persistem ou exportam o par: `appendReferralLog({...})` e
`captureSecurityAlert(kind, payload)`; mais a resposta HTTP do endpoint; mais os `console.*` do
frontend.

---

## 2. Classificação — as 8 ocorrências de GRAFO (aresta)

Legenda: **INTERNO** = só `console.*` do backend · **INTERNO-em-repouso** = persistido em Blob do
backend · **EXPOSTO** = sai do backend (serviço externo, cliente) · **AMBÍGUO** = precisa de decisão.

| # | sítio (ficheiro:linha) | conteúdo | superfície | classe | acção |
|---|---|---|---|---|---|
| 1 | `netlify/functions/referral.mjs:198-211` | `[MC17.4.2] usar-codigo resultado { codigo, indicado: endereco, indicador: r.indicador, vinculoIdempotent, ipGateOk, conversaoOk, ... }` | `console.log` backend | **INTERNO** | **MASCARAR** (é a ocorrência da DEBT-031) |
| 2 | `netlify/functions/comprar-senhas.mjs:356-358` | `[comprar-senhas] referral check { indicado: endereco, indicador: vinculo.indicador, codigo, referralBonus }` | `console.info` backend | **INTERNO** | **MASCARAR** |
| 3 | `netlify/functions/_lib/referral.mjs:581-583` | `[MC17.5.1] T6 concederBonus(indicador) { indicador, bonusOk, bonusCode, txHash }` | `console.log` backend | **INTERNO** (meia-aresta: o par forma-se com o #4 na mesma execução) | **MASCARAR** |
| 4 | `netlify/functions/_lib/referral.mjs:602` | `[MC17.5.1] T6 crédito indicado { indicado, txHashIndicado }` | `console.log` backend | **INTERNO** (meia-aresta) | **MASCARAR** |
| 5 | `netlify/functions/_lib/referral.mjs:627-630` | `appendReferralLog({ tipo:"conversao", codigo, indicador, indicado, semBonusIndicador, origem })` | Blob `referral-log` (repouso) | **INTERNO-em-repouso** | **MANTER** (ver §4) |
| 6 | `netlify/functions/_lib/referral.mjs:566` | `appendReferralLog({ tipo:"fraude", motivo:"auto_indicacao", codigo, indicador, indicado })` | Blob `referral-log` | **INTERNO-em-repouso** | **MANTER** (ver §4) |
| 7 | `netlify/functions/_lib/referral.mjs:588` | `appendReferralLog({ tipo:"conversao_falha", codigo, indicador, indicado, motivo })` | Blob `referral-log` | **INTERNO-em-repouso** | **MANTER** (ver §4) |
| 8 | `netlify/functions/referral.mjs:149-153` e `:188-191` | `appendReferralLog({ tipo:"suspeita", motivo:"ip_excedido"/"device_tracked", codigo, indicado, indicador, count, deviceTracked })` | Blob `referral-log` | **INTERNO-em-repouso** | **MANTER** (ver §4) |

### 2.b As 3 ocorrências de grafo em serviço EXTERNO (achadas por medir além do grep)

| # | sítio | conteúdo | superfície | classe | acção |
|---|---|---|---|---|---|
| 9 | `_lib/referral.mjs:406-408` | `captureSecurityAlert("referral_fraude", { codigo, novoEndereco: novoLower, motivo })` | **Sentry** (`@sentry/node`, `captureMessage` → DSN externo) **e** `console.warn` de fallback quando não há DSN (`sentry-server.mjs:60`) | **EXPOSTO** | **MASCARAR** + escalar Data Safety |
| 10 | `_lib/referral.mjs:495-497` | `captureSecurityAlert("referral_bonus_falhou", { indicador: enderecoLower, err, contexto })` — e `contexto` **já contém** `codigo` **e** `indicado` (vêm de `registrarConversao:579`) ⇒ **a aresta completa sai para o Sentry** | **Sentry** + fallback `console.warn` | **EXPOSTO** | **MASCARAR** + escalar Data Safety |
| 11 | `_lib/fontes-lance.mjs:169-171` | `captureSecurityAlert("indicacao_eco_reversao_falhou", { code, enderecos: criados.map(c => c.endereco), emitidos })` — o array traz **indicante e indicado juntos** | **Sentry** + fallback `console.warn` | **EXPOSTO** | **MASCARAR** + escalar Data Safety |

⚠️ **O próprio contrato do wrapper diz o contrário do que os chamadores fazem.**
`_lib/sentry-server.mjs:53` documenta o parâmetro como *«dados estruturados (**NÃO incluir PII bruta**)»*
e o `beforeSend` (:31-40) só redige `argon2id_` — **não** vê endereços. Medido: os 3 chamadores acima
violam o contrato do wrapper.

⚠️ **Duas superfícies num só sítio:** quando `SENTRY_DSN` **não** está definido (dev/preview), o
`captureSecurityAlert` cai em `console.warn("[SEC-ALERT] …", JSON.stringify(payload))` — o payload com
os endereços vai para o **log**, não para o Sentry. Mascarar o payload resolve **as duas**.

### 2.c A resposta da API (EXPOSTO para o cliente)

| # | sítio | conteúdo | classe | acção |
|---|---|---|---|---|
| 12 | `netlify/functions/referral.mjs:213-223` | `jsonResponse({ sucesso, idempotent, codigo, indicador: r.indicador, indicado: endereco, conversao, pontosLance })` | **EXPOSTO** (resposta HTTP ao **indicado**, autenticado pelo próprio JWT) | ⚠️ **ESCALAR** — **não** corrigir às cegas |

Severidade medida: **baixa**. Quem recebe é o **próprio indicado** (o `validarOwnerOuAdmin` /
`auth.payload.endereco === endereco` obrigam-no a ser ele), e o `indicador` é o endereço de quem lhe deu
o código — informação a que ele já tem acesso por outra via. O frontend **não consome** o campo
(`grep -rn "indicador" src/` mostra-o só a correr texto de UI/comentários: **0 leituras de
`data.indicador`**). Fica **escalado** porque a remoção **muda o contrato da resposta** (e o
`codigo`/`indicado` são usados pelo `ReferralRegistrar` para decidir retry).

### 2.d O console do PRÓPRIO cliente (endereço próprio, sem aresta)

| # | sítio | conteúdo | classe | acção |
|---|---|---|---|---|
| 13 | `src/components/ReferralRegistrar.jsx:60` e `:62` | `console.log("[GUT][MC17.4.2] T4 POST usar-codigo", { codigo, endereco: address, … })` e `"[MC17.5.1] T3 POST enviado"` | console do **browser do próprio utilizador** | **EXPOSTO-menor** (endereço do dono, **sem** aresta) | **MASCARAR** (higiene; dá a invariante «zero endereços completos em `console.*`») |
| 14 | `src/PrivyRoot.jsx:137` | `console.info("[GUT] embedded wallet criada", { address: wallet?.address })` | console do browser do próprio | **EXPOSTO-menor** (endereço do dono, sem aresta) | **MASCARAR** (higiene) |

Nota: as **respostas** do backend que o `ReferralRegistrar` loga (`:76-85`) **não** trazem o
`indicador` — por isso o browser **nunca** vê a aresta. Medido.

---

## 3. Todas as ocorrências do grafo, por superfície

| superfície | ocorrências | classe |
|---|---|---|
| `console.*` do backend | **4** (#1-#4) | INTERNO |
| Blob `referral-log` (repouso) | **5** (#5-#8) | INTERNO-em-repouso |
| Sentry / `console.warn` de fallback | **3** (#9-#11) | **EXPOSTO** |
| resposta de API | **1** (#12) | **EXPOSTO** |
| `console.*` do browser | **3** (#13, #14) | EXPOSTO-menor |

**NÃO há ocorrências AMBÍGUAS** ⇒ **não há paragem por AMBÍGUO** (§SEG2 RAMO 3). Há **EXPOSTAS** ⇒
aplica-se o **RAMO 2** (correcção + auditoria + escalada da Data Safety, §R18-110h.4-2).

---

## 4. Porque é que o log persistido (Blob) NÃO se mascara na escrita

`appendReferralLog` grava `{codigo, indicador, indicado, …}` no Blob `referral-log:{AAAA-MM-DD}`. O
**único** consumidor é `gerarRelatorioIndicacoes` (`_lib/referral.mjs:238`), que:

1. **agrupa por endereço real** para contar o «Top 3 indicadores» (`:252-260` — `porIndicador[c.indicador]`),
2. e só **na saída** o abrevia (`abreviarEndereco` → `0x1234…abcd`, `:226-229, :260`).

Mascarar **na escrita** faria `0x1234…abcd` de indicadores diferentes somarem-se no mesmo balde (o
relatório passaria a mentir) — **é um trade-off que parte um caso legítimo** ⇒ pela regra do processo,
**PARAR e escalar**, não corrigir às cegas. Fica **por mascarar** (doutrina: o dado em repouso no
backend é legítimo; o que se controla é a **saída**), **declarado** e entregue ao operador para a
decisão de Data Safety.

O mesmo raciocínio vale para os Blobs do **modelo de dados**, que contêm a aresta por necessidade
funcional — **não são logs** e ficam:
`referral:{codigo}:{novoEndereco}` (vínculo: `{codigo, indicador, indicado, status}`),
`referral-convertido:{codigo}:{indicado}`, `referral-code-reverso:{codigo} → endereco`.

---

## 5. Auditoria das outras superfícies (o que o RAMO 2 exige)

| superfície | auditada? | achado |
|---|---|---|
| **Sentry** (servidor) | ✅ | **3 chamadores com endereços** (#9-#11); o wrapper tem `beforeSend` que só redige `argon2id_` — **não** cobre endereços. Sem DSN, cai em `console.warn` com o payload inteiro. |
| **Sentry** (cliente/`@sentry/react`) | ✅ | nenhum evento do cliente envia o par (o `indicador` nunca chega ao browser — §2.d). |
| **Frontend** (browser) | ✅ | o par **não** aparece; só o endereço **próprio** (#13, #14). |
| **Resposta de API** | ✅ | 1 campo (`indicador`, #12), **sem consumidor** no `src/`; escalado. |
| **Blob em repouso** | ✅ | o par existe (necessário); consumidor único mascara na saída (§4). |
| **Regulamento / docs públicos** | ✅ | nenhum endereço; nada a fazer. |

---

## 6. CORRECÇÃO APLICADA (FRENTE C · RAMO 2) — o que mudou desde a medição

> Esta secção foi acrescentada **depois** da medição. O corpo do documento (§1 a §5) mantém-se
> **como estava** — é o registo do que se mediu ANTES de tocar em nada (doutrina «manter à vista»).

| # do §2 | classe | o que ficou |
|---|---|---|
| 1-4 | INTERNO (console backend) | **MASCARADOS** com `mascararEndereco` (o endpoint e o `_lib` já o tinham importado; nos outros passou a ser importado) |
| 5-8 | INTERNO-em-repouso (Blob) | **MANTIDOS** por desenho (§4) |
| 9-11 | **EXPOSTO** (Sentry) | **MASCARADOS** — o #10 inclui o `contexto.indicado`, que era por onde o **par inteiro** saía |
| 12 | **EXPOSTO** (resposta de API) | **NÃO alterado** — **ESCALADO** → `DEBT-034` (remover muda o contrato da resposta) |
| 13-14 | console do browser | **MASCARADOS** com o novo `src/lib/mascarar.js::mascararEnderecoLog` |

**Total: 53 substituições em 19 ficheiros de produção + 1 ficheiro novo**, com âncoras de **contagem
exacta** (duas passagens — ver §3.3 do `UTAC110h.4-quota-grafo.md` para o erro do `grep` de uma linha
que obrigou à 2.ª).

⚠️ **A lista de ocorrências do §2 CRESCEU durante a correcção.** O **teste-guarda estático** (que lê o
payload inteiro da chamada) encontrou **13 ocorrências de endereço isolado** que o levantamento manual
inicial não tinha: `comprar-senhas.mjs` ×3 (`início`, `reembolso`, `concluído`), `cotas.mjs` ×2
(`register-corporativo`, `upsert`), `lance-relampago.mjs` ×2 (`início`, `concluído`), `_lib/credito.mjs`
×2 (`erro on-chain`, `crédito concluído`), `delete-account.mjs` (conclusão), `troco.mjs` (devolução) e
`src/context/AppContext.jsx` ×2 (`refetchSaldo`, `refetchSaldoRs`). São **endereço isolado**, não
arestas do grafo — mas a invariante que se quer testável é «zero endereços completos em `console.*`», e
por isso foram mascarados **todos**. O §2 fica com o inventário **de arestas**; a contagem completa de
endereços está no §-1.6 do `UTAC110h.4_SEG-1_MEDICAO.md`.

