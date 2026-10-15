# UTAC110h.4 — QUOTA DO BÓNUS ON-CHAIN + GRAFO SOCIAL (FRENTES A, B, C)
> Baseline `57fe37d` (= origin/main, pós-110h.3). Registo das frentes de **código** deste UTAC.
> Leitura prévia: `_logs/UTAC110h.4_SEG-1_MEDICAO.md` (medição e conflitos) e
> `_logs/UTAC110h.4-GRAFO.md` (classificação do grafo).

---

## 1. O que o UTAC pedia e o que a medição encontrou

| frente | premissa do enunciado | medido no SEG-1 | consequência |
|---|---|---|---|
| **A — DEBT-030** | «o bónus on-chain está reactivado mas **SEM QUOTA**» | **a quota EXISTE** (10/mês/indicante, mês UTC), é **pré-existente** (`1470369`, «mega comando 10») e está viva no baseline | a premissa está **REFUTADA**; o trabalho deslocou-se para os **gaps reais** da quota (GAP-1…GAP-5) |
| **B/C — DEBT-031** | 1 ocorrência (`referral.mjs:193`), correcção «trivial (1 linha)» | **8 ocorrências de grafo** em 4 superfícies, + 9 de endereço isolado; e o `grep` proposto pelo enunciado mede **0** | a DEBT-031 estava **SUBESTIMADA**; o instrumento de medição do enunciado é **cego** |

---

## 2. FRENTE A — o que foi implementado

### 2.1 A quota já existia: o que se fez foi FECHAR os gaps dela

| # | gap | antes | agora |
|---|---|---|---|
| **GAP-1** | o contador **falhava ABERTO** | `verificarLimiteMensal`: `if (!store) return { ok:true, conversoes:0, fonte:"fail-open" }` **e** o `catch` da leitura fazia `reg = null` ⇒ 0 conversões. Com o Blobs indisponível, a quota **desaparecia** e o bónus on-chain era creditado **sem limite** — gas real de mainnet, por toda a duração da indisponibilidade | **FAIL-CLOSED**: sem contador legível **não se credita**. Devolve `{ ok:false, motivo:"quota_indisponivel", fonte:"fail-closed" }`. Um `get` que devolve `null` (indicador sem conversões este mês) **continua a ser 0 conversões** — não é falha, é o caminho normal. |
| **GAP-2** | a quota **não tinha teste nenhum** (`grep` de `limite_mensal_excedido` nos testes = **0**) | 0 cobertura | **8 testes novos** (`_tests/utac110h4-quota.test.mjs`) + **5 mutantes** que os provam |
| **GAP-5** | custo não documentado | — | §2.3 abaixo + bloco de custo no cabeçalho de `_lib/referral.mjs` |
| **GAP-3** | o marcador de convertido é **definitivo** quando a quota bloqueia | — | **NÃO corrigido** (parte um caso legítimo, muda a doutrina R2) ⇒ **DEBT-032**, escalada |
| **GAP-4** | a quota é **TOCTOU** (verifica fora do CAS) | — | **NÃO corrigido** (exige contador atómico) ⇒ **DEBT-033**, medida e registada |

### 2.2 A distinção que faz o fail-closed não ser pior que a doença

`concederBonus` passou a devolver **dois códigos diferentes** para os dois motivos de `!limite.ok`:

| motivo | código | tratamento do chamador | porquê |
|---|---|---|---|
| `limite_mensal_excedido` | `"limite_mensal_excedido"` | **TERMINAL do mês** — `registrarConversao` grava o marcador `referral-convertido:{codigo}:{indicado}` | é o estado real: 10 conversões creditadas |
| `quota_indisponivel` | `"quota_indisponivel"` | **TRANSITÓRIO** — `registrarConversao` **NÃO grava nada** e devolve o erro, para a conversão poder ser **re-tentada** | confundir os dois transformaria «uma indisponibilidade de minutos» em «o mês perdido» |

O `ReferralRegistrar` do frontend passou a incluir `"quota_indisponivel"` no conjunto `RECUPERAVEIS`,
para o cliente **guardar o código e re-tentar** em vez de selar o referral.

**O que se mantém intacto (exigência do §A3):** o crédito dos **+50 pontos de lance** e do
**ECOQUILDO** vive noutro caminho (`creditarIndicacao`, chamado em paralelo pelo endpoint) e **não é
afectado** pelo fail-closed — provado pelo teste do ramo de limite (o **indicado** recebe sempre a
parte dele; o **indicante** em limite não recebe pontos nem ECOQUILDO).

### 2.3 Custos (A5) — o que a quota limita e o que NÃO limita

- A quota limita **um só lado**: o **indicante** (10 créditos/mês). O lado do **indicado** não tem
  quota — mas o marcador `referral-convertido:{codigo}:{indicado}` é único **por endereço**, logo
  cada indicado gera **1 transacção na vida**.
- ⇒ **Tecto de transacções/mês = 10 × (indicantes activos) + (endereços indicados NOVOS no mês)**.
  Não é «10 × utilizadores».
- ⚠️ **É estimativa, não medição** (medir exige transaccionar — proibido): custo ≈
  `gas_por_tx × preço_do_gás × preço_do_ETH`, com `gas_por_tx` de ~50–70 k (escrita de estado) ⇒
  ordem de grandeza **~10⁻³ ETH por transacção** e **~2× por indicação confirmada** (2 tx). O número
  em dinheiro muda com o ETH; **a fórmula é a verdade durável**.
- Sem a quota (comportamento ANTERIOR do caminho `fail-open`), o tecto era, na prática, o **volume de
  indicações** — foi essa a dívida que o GAP-1 fechou.

### 2.4 Provas (Frente A)

| prova | resultado |
|---|---|
| `_tests/utac110h4-quota.test.mjs` | **8/8 pass** |
| — 10 no mês creditam; **a 11.ª NÃO** (o indicado recebe na mesma) | ✔ |
| — **reset de mês**: cheio no mês ANTERIOR ⇒ credita; cheio no mês CORRENTE ⇒ trava (**par bidireccional**, com a chave do Blob como única variável) | ✔ |
| — **GAP-1**: contador ilegível ⇒ **0 créditos**, **0 marcadores**, código `quota_indisponivel`; e o **retry** depois da indisponibilidade fecha a conversão | ✔ |
| — **idempotência**: repetir não credita nem conta duas vezes | ✔ |
| — unitário: os **dois motivos** distinguem-se; um indicante novo não aparece no limite | ✔ |
| — guarda de gas: **nenhum teste toca a rede** (contrato sempre duplo espiado) | ✔ |
| Prova de mutação (`_tests/utac110h4-prova-mutacao.mjs`) | **9/9 mutantes MORREM** |

---

## 3. FRENTES B e C — o grafo social

### 3.1 A medição (Frente B)

O ficheiro dedicado é **`_logs/UTAC110h.4-GRAFO.md`**. Resumo do que ele fixa:

- **O instrumento do enunciado é cego.** `grep -rn "registrarConversao|indicante.indicado|indicou"` ⇒
  `indicou` = **0** ocorrências, `indicante.indicado` = **0**, `registrarConversao` = 3 (todas
  **chamadas**, nenhuma é log). Mediria **zero fugas** com **8 arestas** a descoberto. Substituído por
  varredura **semântica** (argumentos de `console.*`, `appendReferralLog`, `captureSecurityAlert`,
  resposta de API e `console.*` do browser).
- **4 superfícies**: console do backend (**INTERNO**, 4) · Blob `referral-log` (**em repouso**, 5) ·
  **Sentry** (**EXPOSTO**, 3) · **resposta de API** (**EXPOSTO**, 1) · console do browser (3).
- **Nenhuma AMBÍGUA** ⇒ não houve paragem por ambiguidade; **há EXPOSTAS** ⇒ aplicou-se o **RAMO 2**.

### 3.2 Porque mascarar os payloads do Sentry **não** é um trade-off

A regra **S6 — Soberania de dados** (da própria skill UTAC) diz: *«Nada sai do ambiente sem
autorização explícita.»* Os 3 alertas mandavam **endereços** (e, no caso do `referral_bonus_falhou`, o
**par inteiro** via `contexto`) para o **Sentry** — um serviço externo. O próprio wrapper
`_lib/sentry-server.mjs:53` documenta o parâmetro como *«NÃO incluir PII bruta»*, e o `beforeSend` só
redige `argon2id_`. ⇒ mascarar **alinha o código com a regra que o repo já tinha**, não sacrifica nada;
e, sem `SENTRY_DSN`, o mesmo payload caía em `console.warn` — mascarar resolve **as duas** superfícies
de uma vez.

### 3.3 A correcção aplicada (Frente C) — 53 substituições em 19 ficheiros de produção (+1 novo)

| superfície | o que foi feito |
|---|---|
| **console do backend** (INTERNO) | **todos** os payloads com endereço passaram a `mascararEndereco(...)`: 4 de **aresta** (`referral.mjs` ×2, `comprar-senhas.mjs`, `_lib/referral.mjs` ×2) + 15 de **endereço isolado** (`auth-admin`, `auth-lance`, `auth-user`, `delete-account`, `lance-relampago`, `scheduled-anuncio-especial`, `_lib/require-mfa`, `comprar-senhas`, `cotas`, `troco`, `_lib/credito`) |
| **Sentry** (EXPOSTO) | mascarados os payloads de `referral_fraude`, `referral_bonus_falhou` (**incluindo o `contexto.indicado`**), `indicacao_eco_reversao_falhou`, `comprar_senhas_reembolso_falhou`, `comprar_senhas_tx_pendente` ×2, `worker_bonus_credito_falhou`, `worker_credito_reembolso_falhou` |
| **console do browser** | novo **`src/lib/mascarar.js::mascararEnderecoLog`** (espelha o `mascararEndereco` do backend) usado em `ReferralRegistrar.jsx` (×2), `PrivyRoot.jsx` e `AppContext.jsx` (×2) |
| **Blob `referral-log` em repouso** | **MANTIDO, por desenho** — ver §3.4 |
| **resposta de API** (`indicador`) | **NÃO alterada** — ver §3.5 |

⚠️ **A 2.ª passagem existiu por causa de um erro meu, declarado.** A minha 1.ª varredura foi um `grep`
**de uma linha só** (`grep ... console.` + `endereco` na MESMA linha) e por isso **não viu os payloads
multi-linha** (`{ endereco,` na linha seguinte) — escaparam-lhe **13 ocorrências** (`comprar-senhas` ×3,
`cotas` ×2, `lance-relampago` ×2, `_lib/credito` ×2, `delete-account`, `troco`, `AppContext` ×2). Foi o
**teste-guarda estático** (que varre o payload inteiro, não a linha) que as encontrou. **Regra que
fica:** *varrer logs exige ler o PAYLOAD da chamada (parênteses emparelhados), não a linha.*

### 3.4 O log de auditoria em repouso tem de ficar (declarado)

`appendReferralLog` grava `{indicador, indicado}` no Blob `referral-log`, e o **único** consumidor
(`gerarRelatorioIndicacoes`) **precisa do endereço real** para agregar o «Top 3 indicadores», mascarando
**na saída** (`abreviarEndereco`). Mascarar **na escrita** faria `0x1234…abcd` de indicadores diferentes
somarem-se no mesmo balde — **um trade-off que parte um caso legítimo** ⇒ pela regra do processo
**PARAR e escalar**, não corrigir às cegas. Fica classificado **INTERNO-em-repouso** e **provado nos
dois sentidos** pelo teste: o log **guarda** o par **e** a saída do relatório é **anónima**.

### 3.5 ⚠️ ESCALADO — o campo `indicador` na resposta de API (DEBT-034)

`netlify/functions/referral.mjs:213-223` devolve `indicador: r.indicador` ao **indicado** (autenticado
pelo próprio JWT). Severidade **medida como baixa** — quem recebe é o próprio indicado e o `indicador`
é o endereço de quem lhe deu o código — mas é uma **aresta do grafo a sair do backend**, o **frontend
não consome** o campo (0 leituras de `data.indicador` em `src/`) e **remover muda o contrato da
resposta**. Não se corrige sozinho: **escalado ao operador** (§R18-110h.4-2 e a ressalva do enunciado).

### 3.6 Provas (Frentes B/C)

`_tests/utac110h4-grafo.test.mjs` — **6/6 pass**, com **dois instrumentos** e limites declarados:

| prova | resultado |
|---|---|
| **Comportamental**: uma conversão real + o ramo de suspeita ⇒ **nenhum endereço completo** em `console.*` (captura de **toda** a saída) | ✔ |
| **Comportamental**: `referral_fraude` e `referral_bonus_falhou` ⇒ **nenhum endereço completo** no payload do Sentry (Sentry **capturado**, não silenciado) | ✔ |
| **Comportamental**: o Blob guarda o par **e** a saída do relatório é anónima, com o «top 3» a agregar | ✔ |
| **Estático**: nenhum `console.*`/`captureSecurityAlert` de produção leva endereço sem mascarar (>100 ficheiros varridos) | ✔ |
| **CONTROL POSITIVO** dos dois varrimentos (vêem a forma crua quando ela existe e **não** reprovam a mascarada) | ✔ |
| `src/__tests__/utac110h4-mascarar.test.mjs` | **2/2 pass** (helper + os 3 pontos de uso do browser) |
| Prova de mutação | **4 mutantes** do grafo **MORREM** (G1 aresta crua no endpoint · G2 par no payload do Sentry · G3 console cru noutro ficheiro · G4 console cru no browser) |

**Limites declarados destes testes:** o comportamento **transitivo** (`contexto` a transportar
`indicado` por dentro) só é visível no teste comportamental — o estático não o vê; e o caminho
`indicacao_eco_reversao_falhou` (Art. 50º) exige lastro **e** reversão a falhar e **não é exercido**
(é coberto só pelo varrimento estático, que é mais fraco).

---

## 4. Ficheiros tocados (código de produção)

**Frente A (2):** `_lib/referral.mjs` (quota fail-closed, dois códigos, custo documentado) ·
`src/components/ReferralRegistrar.jsx` (+1 código recuperável).

**Frente C (20):** `netlify/functions/` — `referral.mjs`, `comprar-senhas.mjs`, `cotas.mjs`,
`troco.mjs`, `auth-admin.mjs`, `auth-lance.mjs`, `auth-user.mjs`, `delete-account.mjs`,
`lance-relampago.mjs`, `scheduled-anuncio-especial.mjs`, `_lib/referral.mjs`, `_lib/credito.mjs`,
`_lib/fontes-lance.mjs`, `_lib/require-mfa.mjs`, `_lib/worker-bonus.mjs`, `_lib/worker-credito.mjs`;
`src/` — `lib/mascarar.js` (**novo**), `components/ReferralRegistrar.jsx`, `PrivyRoot.jsx`,
`context/AppContext.jsx`.

**Testes (4 novos):** `_tests/utac110h4-quota.test.mjs` · `_tests/utac110h4-grafo.test.mjs` ·
`_tests/utac110h4-prova-mutacao.mjs` · `src/__tests__/utac110h4-mascarar.test.mjs`.

**Intocados (verificado por diff):** `docs/REGULAMENTO-v5.md`, `GUTO-REGULAMENTO.md`,
`regras-oficiais.md`, o **contrato on-chain** (só leitura), env vars, `_lib/contract.mjs` (**não foi
necessário** — medido: o defeito nunca esteve lá).
