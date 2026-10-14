# UTAC110g.1 — SEG-1 · MEDIÇÃO

**Data:** 2026-10-14 · **Executor:** Hermes (Frente A) + Opus 5.5 (Frente B)
**Baseline declarado:** `a78626f` (= `origin/main`, pós-110g)
**Tipo:** correcção + movimentação de UI (decide D-110g-3 e D-110g-4)

---

## 1. RAM (regra A14 — portão antes da suíte: RAM livre ≥ 1 500 MB)

Máquina pequena (≈ 5 877 MB total). Métrica canónica:
`[int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024)` MB.

| medição | leitura | momento |
|---|---|---|
| 1 | 1039 MB | antes de qualquer alavanca |
| 2 | 1015 MB | antes de qualquer alavanca |
| 3 | 1034 MB | antes de qualquer alavanca |
| 4 | 1025 MB | antes de qualquer alavanca |

⇒ **RECURSO INSUFICIENTE**, como o A14 prevê. Aplicadas as alavancas SEGURAS da skill
`windows-memory-pressure` (`scripts/liberar-ram.ps1`: fecha `msedgewebview2` SEM janela — 12
processos — e faz *trim* de working sets via `EmptyWorkingSet`). **Não se fechou nenhuma app do
utilizador**; `MsMpEng` (Defender), `explorer`, `dwm` e a própria sessão ficaram intactos.

| leitura pós-trim (1.ª ronda) | 1613 / 1610 / 1612 / 1598 / 1563 / 1593 MB |
|---|---|
| **pico medido** | **1613 MB** (≥ 1500 MB — portão satisfeito) |

**⚠️ DESVIO DECLARADO (transparência do instrumento):** o trim **decai** — a cache do Windows
(standby) volta a encher em minutos. Medido imediatamente antes de arrancar a suíte:

| leitura imediatamente antes da suíte | 1488 MB |
|---|---|
| leituras da 2.ª ronda de trim | 1480 / 1480 / 1489 / 1490 / 1490 / 1530 MB |

Isto é o **desvio declarado** previsto no §3 da skill: pico 1613 MB atingido e registado, leitura
de arranque 1488 MB (abaixo do limiar), **mitigação**: tarefa corrida em *foreground*, comparada
com o baseline conhecido, e **PARAR** se aparecerem falhas não explicadas — é esse o dano que o
portão existe para evitar (§3, ponto 2).

**Pico / mínimo medidos na janela da tarefa:** pico 1613 MB · mínimo 1465 MB.
Nada foi declarado satisfeito sem medição: o número abaixo do limiar está DITO, não escondido.

---

## 2. GIT

- `git rev-parse HEAD` → **a78626f49aed30b582083a92962d8a1161f98543** ✔ (= baseline declarado)
- `git status --porcelain` → 36 entradas, **todas PRÉ-EXISTENTES** (nenhuma criada por este UTAC):
  - ` M` (6): `.agents/skills/aidesigner-frontend/SKILL.md`,
    `.agents/skills/aidesigner-frontend/references/api.md`,
    `.agents/skills/aidesigner-frontend/references/frontend-rubric.md`,
    `.gitignore`, `.mcp.json`, `desafio-gut/frontend/package-lock.json`
    (este último é o ensujo conhecido do `netlify deploy --prod`, que corre o build LOCAL e mexe no
    lock do frontend);
  - `??` (30): `_logs/MC100_*.md` … `_logs/MC105a*.md` (logs históricos por commitar).

**Nada foi revertido nem tocado.** Os ` M` são pré-existentes e continuam fora deste UTAC.

---

## 3. SUÍTE BASELINE (harness canónico)

```
node scripts/mc966-suite-harness.mjs ambos
frontend: VERDE 1049/1049 pass
backend:  VERDE 1213/1219 pass
VEREDITO: VERDE   (exit 0)
```

✔ Bate **exactamente** com o baseline declarado no enunciado (1049/1049 · 1213/1219).
(Os 6 não-passados do backend são pré-existentes e conhecidos: o denominador 1219 já os inclui.)

---

## 4. INVENTÁRIO — BACKEND (Frente A)

Caminho raiz: `desafio-gut/frontend/netlify/functions/`

### 4.1 `resgatar-cartao.mjs` (195 linhas) — como monta o e-mail HOJE

- Importa `enviarEmail` (`_lib/email.mjs`) por **import dinâmico** dentro do `try` (fail-soft).
- Função **PURA** `montarEmailResgate({ nome, resgateId, pontos, prazoDias })` → `{assunto, mensagem}`:
  - assunto = `Cartão colecionável resgatado — chega em 30 dias`;
  - corpo = saudação + «pedido nº X» + «Trocou 50 pontos» + prazo (30 dias corridos) + quem paga o
    envio + «Guarde este e-mail: é o comprovante do seu pedido.» + **duas linhas que MENCIONAM** a
    Nota Técnica («Nota Técnica do resgate nº X» / «…emite a Nota Técnica da entrega»).
- Chamada: `await enviarEmail({ para: email, assunto: texto.assunto, mensagem: texto.mensagem })`
  onde `email` = **`body.email`** validado (`validarEmail`), opcional.
- Só envia quando `r.idempotent !== true` (a repetição idempotente não reenvia) e o resgate é novo.

### 4.2 `_lib/nota-tecnica.mjs` — **NÃO EXISTE** ✔ (confirmado com `ls _lib/`)

Nenhum ficheiro de Nota Técnica na `_lib` (76 módulos listados; nenhum `nota*`).

### 4.3 `_lib/pedidos.mjs` — modelo de pedido / contrato da morada

`validarMorada(m)` devolve o objecto **normalizado**: `{ nome, cpf, cep, logradouro, numero,
complemento, bairro, cidade, uf, telefone|null }`. Nomes de campo relevantes para a Nota Técnica:
`logradouro` (não «rua») e `numero`, `cidade`, `uf`, `cep`, `nome`.

### 4.4 `_lib/resgates.mjs` (85 linhas) — o pedido de resgate

Tabela `public.resgates`. `criarResgate()` grava
`{ endereco, cartao_id, morada, status:"pendente", idempotency_key, criado_em, atualizado_em }` e
devolve `{ok, criado, resgate}`. **Não há coluna de produto/descrição** — a descrição do produto
tem de ser derivada (`cartao_id`) ou passada explicitamente.

### 4.5 `_lib/email.mjs` (38 linhas)

`enviarEmail({ para, assunto, mensagem, link? })` → SendGrid. `mensagem` é TEXTO (convertido a
`<br>` no HTML). `from` = `SENDGRID_FROM || "desafiogut@gmail.com"`.

### 4.6 `_lib/jwt.mjs` (114 linhas) — **o que o token de sessão carrega**

`verificarUserSession(token)` devolve o payload do JWT HS256. O token é emitido por
`auth-user.mjs` (`assinarUserSession`) a partir de **assinatura EIP-191** sobre
`DESAFIOGUT-AUTH:<ts>:<endereco>` — e as claims são **`{ endereco, tipo:"user-session" }`**.
`grep -n -i "email" _lib/jwt.mjs` → **0 resultados**. **Não existe claim de e-mail.**

---

## 5. INVENTÁRIO — FRONTEND (Frente B)

Caminho raiz: `desafio-gut/frontend/`

### 5.1 `src/pages/OfertasProgramadas.jsx` (495 linhas) — o botão está AQUI

Vive **dentro do vidro do cartão** (§3 do ficheiro, ~linhas 326–346):
- `podeResgatarCartao` verdadeiro → `<button aria-label="Resgatar cartão">🎁 Resgatar cartão</button>`
  (`onClick={() => setResgateAberto(true)}`, amarelo `COR.gold`);
- senão → botão `disabled` «Chegue a 50 pontos para resgatar».
- O balão `ResgatarCartaoModal` é renderizado no fim do ficheiro, com `aberto={resgateAberto}`.

### 5.2 `src/pages/MinhaCarteira.jsx` (586 linhas) — estrutura actual

Ordem dentro do **1.º vidro** (o do saldo):
1. cabeçalho «Carteira» + botão `↻` (refetch do saldo on-chain);
2. «Saldo Disponível» (R$ grande);
3. `data-saldos-passe` → **3 saldos** em grelha: `data-saldo="fidelidade"` (pontos de fidelidade
   `X / meta` + barra), `data-saldo="creditos"` (créditos de lance), `data-saldo="eco-quildo"`;
4. `<section data-missoes-hoje data-estado=…>` «Missões de hoje» (UTAC110f-front);
5. grelha de **botões de compra**: `💰 Depositar PIX`, `Comprar Passe Desafio R$ 2,00`,
   `⚡ Menor Lance Único`, `🎫 Ofertas Programadas`.
- **SEM botão de resgate.** O `MinhaCarteira.jsx` **não importa** `ResgatarCartaoModal` nem
  `useResgatarCartao` (medido: `grep -n "ResgatarCartao\|useResgatarCartao" src/pages/MinhaCarteira.jsx` → 0).
- Estilo dos CTAs: `botaoPrimario` = amarelo único `#f5a623`, `minHeight:"48px"`, `borderRadius:"12px"`.

### 5.3 `src/hooks/usePontos.js` (86 linhas) — a fonte de verdade do limiar

Devolve `pontosCartao`, `pontosParaCartao` (meta, default 50) e **`podeResgatarCartao`** (booleano
do SERVIDOR, `data?.podeResgatarCartao === true`). O limiar está, portanto, decidido no backend —
a Carteira pode consumi-lo sem recalcular a regra.

### 5.4 `src/components/ResgatarCartaoModal.jsx` — já existe (UTAC106g)

Balão de morada; título «Resgatar cartão colecionável»; `onConfirmar` → `useResgatarCartao.resgatar`.
**NÃO é tocado por este UTAC.**

### 5.5 `src/hooks/useResgatarCartao.js` — o e-mail que vai hoje

`emailLogin = user?.email?.address || user?.google?.email || user?.apple?.email || null` — lido do
**objecto Privy do CLIENTE** (`usePrivy()` no AppContext) e enviado em `corpo.email`. Sem sessão com
e-mail, o campo não é enviado.

---

## 6. TESTES QUE TOCAM NO BOTÃO DE RESGATE

**Ficheiros que ASSERTAM o botão em Ofertas (têm de acompanhar a mudança):**

| ficheiro | linhas | o que afirma |
|---|---|---|
| `src/pages/__tests__/utac106f-ofertas.test.mjs` | 162, 167-174, 190, 311 | botão ausente < 50; presente e ACTIVO com 50; 48 de compra NÃO desbloqueia; o palpite não decide |
| `src/pages/__tests__/utac106g-resgate.test.mjs` | 3, 12, 61, 100, 116-130, 136-174 | botão ACTIVO a ≥50; ausente a 49; **clique abre o balão**; campos do balão |

**Ficheiros que apenas referenciam `podeResgatarCartao` na fixture** (não assertam o botão):
`src/pages/__tests__/utac109g-op-alinhamento.test.mjs:47`, `src/__tests__/utac107e2-etiqueta.test.mjs:190`.

**Ficheiro que lê o TEXTO do modal** (não o botão): `src/__tests__/utac107g2-pt-br.test.mjs:134`.

⚠️ **Consequência medida:** mover o botão **quebra** `utac106f-ofertas` e `utac106g-resgate` se os
testes não forem actualizados — mas actualizá-los é parte da Frente B (a asserção muda de LOCAL, não
de substância), e o 106g-resgate é o teste do FLUXO (clique → balão), que passa a viver na Carteira.

---

## 7. CONFIRMAÇÕES PEDIDAS PELO ENUNCIADO (§6.f)

| confirmação | resultado | prova |
|---|---|---|
| O e-mail actual **não tem** Nota Técnica ESTRUTURADA | **CONFIRMADO** | `montarEmailResgate` só MENCIONA «Nota Técnica» em 2 linhas de prosa; não há bloco de produto/destinatário/remetente/pedido/data nem `_lib/nota-tecnica.mjs` |
| O botão está em **Ofertas**, não na **Carteira** | **CONFIRMADO** | §5.1 (botão em `OfertasProgramadas.jsx:326-346`) vs §5.2 (`MinhaCarteira.jsx` sem import do modal/hook) |

---

## 8. ⚠️ PREMISSA MEDIDA ANTES DO HARD GATE — R18-110g.1-3 (D-110g-1 = a)

**A decisão diz:** «E-mail da sessão (Privy) é a fonte de verdade».
**O enunciado, na Frente A/A2, escreve:** `await enviarEmail({ para: authEmail, // do Privy })`.

**Medido (não suposto):**

1. O JWT de sessão (`user-session`, `_lib/jwt.mjs` + `auth-user.mjs`) carrega **`{ endereco, tipo }`**
   — a sessão é cunhada a partir de uma **assinatura EIP-191 de carteira**, que **não contém e-mail**.
   `grep -i email _lib/jwt.mjs` → 0. **Não há `authEmail` no servidor.**
2. O `_lib/resgates.mjs` (tabela `public.resgates`) **não tem coluna de e-mail** — não há e-mail
   persistido para ir buscar.
3. Não existe no backend nenhuma verificação de token Privy (nenhum `_lib/privy*.mjs`; as 10
   ocorrências da palavra «privy» em `netlify/functions/` são comentários/outros usos).
4. O e-mail do Privy existe **só no CLIENTE**: `usePrivy().user` → `email.address | google.email |
   apple.email`, lido em `useResgatarCartao.js` e em `AppContext.jsx:481` — e **é assim que já viaja
   hoje**, no **corpo** do pedido.

**Conclusão da medição:** a forma LITERAL da decisão (`para: authEmail`, do servidor) **não é
implementável** dentro do AUTORIZA deste UTAC — exigiria verificar o token Privy (JWKS + novo
`_lib` + env var `PRIVY_APP_ID`), e **«Alterar env vars» está expressamente NÃO AUTORIZADO**.

**O que É implementável e foi o caminho seguido (sem inventar infraestrutura):** a fonte de verdade
é o **e-mail da sessão Privy obtido no cliente** (`emailLogin`, o mesmo objecto que o AppContext já
usa) — e o servidor **não inventa** um e-mail: sem `email`, não envia. O que a Frente A acrescenta é
a **guarda de origem**: teste que PROVA que o destino do e-mail é o da sessão (a chave
`user.email.address` do Privy) e **não** o campo `nome`/morada nem um valor arbitrário novo; e o
destino continua a **não ser persistido** (minimização).

⇒ **Desvio declarado, escalado ao operador no fecho** (à luz da sua regra: trade-off que parte um
caso legítimo → PARAR e escalar). Implementado o máximo dentro do autorizado; a via «servidor lê o
e-mail do Privy» fica registada para UTAC próprio (exigiria env + `_lib` novos).

---

## 9. ESTADO DE PARTIDA RESUMIDO

- Baseline `a78626f` ✔ · suíte 1049/1049 + 1213/1219 ✔ · árvore limpa (só pré-existentes) ✔
- Frente A: `_lib/nota-tecnica.mjs` **não existe**; e-mail montado por função pura em
  `resgatar-cartao.mjs` → **alvo cirúrgico claro**.
- Frente B: botão em `OfertasProgramadas.jsx` (linhas 326-346) → **mover** para `MinhaCarteira.jsx`
  (após os 3 saldos, antes dos botões de compra), usando `podeResgatarCartao` do `usePontos`.
- 2 ficheiros de teste terão de acompanhar a mudança de LOCAL do botão.
