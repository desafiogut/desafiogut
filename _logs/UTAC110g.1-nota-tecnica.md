# UTAC110g.1 — FRENTE A · NOTA TÉCNICA PADRONIZADA (backend)

**Executor:** Hermes (backend) · **Data:** 2026-10-14
**Decisão aplicada:** R18-110g.1-1 (D-110g-3 = «nota padrão de envio de produto»)
**Baseline:** `a78626f` · **Suíte de partida:** frontend 1049/1049 · backend 1213/1219 (VERDE)

---

## 1. O que foi entregue

| # | Ficheiro | O que é |
|---|---|---|
| 1 | `desafio-gut/frontend/netlify/functions/_lib/nota-tecnica.mjs` | **NOVO** — `gerarNotaTecnica(pedido)`, `formatarData`, `formatarCep`, `REMETENTE`, `PRODUTO_CARTAO` |
| 2 | `desafio-gut/frontend/netlify/functions/resgatar-cartao.mjs` | `montarEmailResgate` passou a **acrescentar o documento estruturado**; a chamada passa `morada`, `produto` e `criadoEm` do pedido |
| 3 | `desafio-gut/frontend/netlify/functions/_tests/utac110g1-nota-tecnica.test.mjs` | **NOVO** — 13 testes (template, integração, bidirecional, destino do e-mail) |
| 4 | `scripts/mc110g1-prova-mutacao.mjs` | **NOVO** — prova de mutação: 7 mutantes + 1 equivalente declarado |

### 1.1 O template (os 5 campos da R18-110g.1-1)

Texto plano, sem PDF (a decisão diz «texto no e-mail»). Moldura de `═` (39), cabeçalho
`NOTA TÉCNICA DE ENVIO`, e depois:

| campo exigido | de onde vem |
|---|---|
| 1. nome do produto | `PRODUTO_CARTAO` = «Cartão colecionável Família Quildo» (parametrizável) |
| 2. destinatário (nome + morada) | `nome` + `morada` **validada** por `validarMorada` (`logradouro`, `numero`, `bairro`, `complemento`, `cidade`, `uf`, `cep`) |
| 3. remetente (Associação + CNPJ) | `REMETENTE` = Associação Recreativa dos Nordestinos no Amazonas · CNPJ 23.040.066/0001-00 · Manaus/AM (o vendedor legal do NORTE do Produto) |
| 4. nº do pedido | `id` da linha de `public.resgates` |
| 5. data | `criado_em` da linha, formatado `DD/MM/AAAA` no fuso **America/Manaus** (UTC−4) |

A função é **pura e defensiva**: nunca lança, nunca escreve `undefined`/`null`/`NaN`/`Invalid Date`
(campo ausente ⇒ `—`), e aceita injecção de data para os testes serem determinísticos. O CEP de 8
dígitos sai formatado (`69027-010`); outra coisa sai como veio.

### 1.2 Como ficou o e-mail

`montarEmailResgate({ nome, resgateId, pontos, prazoDias, morada, produto, criadoEm })`.
Ordem final: saudação → «pedido nº X» → «Trocou 50 pontos» → prazo (30 dias corridos, R18-110g-3) →
quem paga o envio (R18-110g-2) → «Guarde este e-mail: é o comprovante do seu pedido.» (correcção
B-110g-1) → **«Segue a Nota Técnica de envio:»** → **o documento** → aviso de que o DESAFIOGUT não
emite documento fiscal deste resgate.

**Leitura do A2 do enunciado (declarada):** o enunciado escrevia «substituir o texto actual do
e-mail pela Nota Técnica». Lido à letra, isso **apagaria** o prazo (R18-110g-3), o pagador
(R18-110g-2) e a frase do comprovante (correcção do BLOQUEANTE B-110g-1) — três decisões anteriores
do operador, com testes próprios. O que se substituiu foram **as duas linhas de prosa que só
MENCIONAVAM a Nota Técnica** («Nota Técnica do resgate nº X» / «…emite a Nota Técnica da entrega»),
passando o documento real a ocupar esse lugar. Nenhuma decisão anterior foi perdida — e os 6 testes
do UTAC110g continuam verdes sem terem sido tocados (GATE 15).

### 1.3 Porque não se tocou nos testes do UTAC110g

Todas as asserções do `utac110g-c1c2-email.test.mjs` continuam a passar **sem alteração**: o e-mail
tem `/até 30 dias corridos/`, `/Nota Técnica/` (a nova linha de anúncio), `/Maria/`, `/Fam[íi]lia
Quildo/`, `/comprovante do seu pedido/`, e continua a NÃO dizer `/Carteira/`. A integração foi
**aditiva**, e isso é o que o GATE 15 exige.

---

## 2. A medição da premissa: R18-110g.1-3 («o e-mail do Privy é a fonte de verdade»)

Isto foi **medido antes de implementar**, e a decisão não é implementável na forma literal.
O detalhe completo está no `_logs/UTAC110g.1_SEG-1_MEDICAO.md` §8. Em resumo:

1. O JWT de sessão (`_lib/jwt.mjs`, emitido por `auth-user.mjs` a partir de uma **assinatura
   EIP-191 de carteira**) carrega **`{ endereco, tipo }`** e mais nada. `grep -i email _lib/jwt.mjs`
   → **0 resultados**. **Não existe `authEmail` no servidor** — a linha `para: authEmail, // do
   Privy` do enunciado não tem de onde sair.
2. `_lib/resgates.mjs` (`public.resgates`) **não tem coluna de e-mail**.
3. Não há no backend nenhuma verificação de token Privy (nenhum `_lib/privy*.mjs`).
4. O e-mail do Privy existe **só no cliente** (`usePrivy().user` → `email.address | google.email |
   apple.email`), e é daí que já vem o valor que o frontend envia no corpo
   (`useResgatarCartao.js`, o mesmo objecto que o `AppContext` usa).

**Desvio declarado (escalado ao operador):** implementar a decisão à letra exigiria verificar o token
Privy no servidor (JWKS + novo `_lib` + env var `PRIVY_APP_ID`) — e **«Alterar env vars» está
expressamente NÃO AUTORIZADO** neste UTAC. O que ficou implementado é o máximo dentro do autorizado:
a origem é o **objecto de sessão Privy obtido no cliente** (o único canal possível), o servidor
**não inventa** destino nenhum, e há guardas que o provam. A via «o servidor lê o e-mail do Privy»
fica registada para UTAC próprio.

---

## 3. Evidência

### 3.1 Suíte (harness canónico `node scripts/mc966-suite-harness.mjs`)

| | antes | depois |
|---|---|---|
| backend | 1213/1219 VERDE | **1226/1232 VERDE** (+13 testes novos, 0 regressões) |
| frontend | 1049/1049 VERDE | 1059/1059 VERDE (Frente B) |
| RAM antes da corrida final | — | **1836 MB** (≥ 1500 MB, A14) |

### 3.2 Prova de mutação (`node scripts/mc110g1-prova-mutacao.mjs`)

```
controlo (sem mutação): 13/13 pass, fail 0
M1 o produto perde a identificação («Cartão colecionável Família Quildo»): PROVADO (RED) — fail 1
M2 o CNPJ do remetente é outro (deixa de ser o vendedor legal):            PROVADO (RED) — fail 4
M3 a data do documento deixa de ser a de Manaus (passa a UTC):             PROVADO (RED) — fail 1
M4 o remetente perde a praça (Manaus/AM sai do bloco):                     PROVADO (RED) — fail 1
M5 a Nota Técnica deixa de ir no e-mail:                                   PROVADO (RED) — fail 4
M6 a morada validada deixa de alimentar a Nota Técnica:                    PROVADO (RED) — fail 2
M7 a guarda «sem e-mail de sessão não se envia» cai:                       PROVADO (RED) — fail 1
E1 `para: email || "fallback@…"` (inalcançável) — EQUIVALENTE CONFIRMADO (sobreviveu) — 13/13
restauração nota-tecnica.mjs: md5 IDÊNTICO
restauração resgatar-cartao.mjs: md5 IDÊNTICO
VEREDITO: 7/7 PROVADOS
```

**Equivalente declarado e explicado** (não escondido): o mutante E1 sobreviveu. A razão é medida e
não é «teste fraco»: a guarda `if (email)` a montante torna o fallback **inalcançável**. Foi por isso
que o M7 foi redesenhado para mutar **a guarda** (e aí morre). O script mantém os dois: mutantes que
têm de morrer e equivalentes que têm de sobreviver (se um equivalente morresse, a explicação estava
errada — e o script falha).

### 3.3 Testes novos (13)

- **A1** template: os 5 campos; data em Manaus (não UTC); nunca `undefined`/`Invalid Date`; CEP.
- **A2** integração com o handler REAL: o e-mail do resgate carrega a nota preenchida com a morada
  validada, o produto, o CNPJ e a data **da linha gravada**; e não se perdeu nada do que já estava
  decidido (prazo, pagador, comprovante, ausência de «Carteira», aviso fiscal).
- **A3** **bidirecional**: a guarda passa no e-mail NOVO e **falha** no e-mail anterior ao 110g.1
  (reconstruído fielmente — faltas ≥ 5), e um mutante do e-mail do handler (sem o documento) também
  cai. A guarda tem dentes.
- **A4** destino: só o campo `email` validado define `para`; um e-mail escondido na morada **não
  desvia** o envio; sem `email` não se envia nada; `email` inválido → 400 sem débito; nem o destino
  nem a nota são persistidos em `public.resgates` (minimização).

---

## 4. Limites do que foi medido (declarados)

1. **O e-mail do Privy não é verificável no servidor** (§2). O teste A4 prova o que é provável
   (só o campo validado define o destino; nada outro o desvia), **não** prova criptograficamente que
   o valor veio do Privy — isso viveria no cliente, e é lá que a origem é lida (`useResgatarCartao`).
2. `enviarEmail` (SendGrid) **não foi exercitado contra o fornecedor real** — é duplo em todos os
   testes. O que se prova é o CONTEÚDO e o DESTINO pedidos, não a entrega.
3. O documento é texto (a decisão diz texto). Não há medição de como cada cliente de e-mail o
   apresenta.
4. `Intl` com o fuso de Manaus foi exercitado no Node desta máquina (ICU completo). O ramo de
   degradação (ambiente sem ICU) está escrito mas **não foi exercitado** — não há aqui maneira de
   simular um Node sem ICU.

## 5. Erros dos meus próprios instrumentos (declarados)

1. **O M7 original era um mutante equivalente e eu não o sabia.** Escrevi-o como «o servidor inventa
   um destino quando não há e-mail» e ele **sobreviveu** (13/13). Li o resultado como prova de que o
   teste era fraco; a leitura correcta é que a mutação era **inalcançável** (a guarda `if (email)`
   fecha a porta antes). Corrigido: mutei a guarda (mata) e declarei o equivalente (sobrevive, com
   explicação e asserção de que sobrevive). Sem esta correcção, o relatório diria «o instrumento não
   mede o que eu pensava» sem dizer porquê.
2. **`assert.match(msg, /Produto|…/)` no A2**: o documento escreve `PRODUTO:` em maiúsculas, e
   `Produto` (capital P minúsculo) **não** casa — a asserção só passava pela alternativa. Trocada por
   `/PRODUTO:/` explícito, que é o que se quer medir.
