# UTAC115 — Auditoria final (Frente A: código · Frente B: infra)

Data: 2026-10-25 · Frente A: Opus 5.5 (Claude Code, read-only) · Frente B: Hermes
Estado: **PARADO ANTES DAS FRENTES C e D** — ver §4.

---

## 1. FRENTE A — PARECER DO OPUS 5.5

**VEREDICTO: APROVADO COM RESSALVAS**

Nenhum dos três commits (142ffd1 UTAC111, 095afbe UTAC112, 739dc8f UTAC114) introduz
defeito bloqueante. Contrato HTTP, origem da quantidade e isolamento da tabela de segredos
aguentaram a tentativa de refutação. **Mas** o Opus encontrou **duas falhas de Billing
pré-existentes** (commit `49eca175`, UTAC110i.1) que permitem **creditar Passes sem pagar**,
e que o UTAC114 tornou alcançáveis: a credencial passou a existir em produção e ele mediu
`isPagamentoNativoAtivo.android = true` em `config_remota`.

### ALTO-1 — Corrida entre contas credita o mesmo recibo em várias carteiras
`validar-compra-google.mjs:148-159`. Quando o INSERT colide (`23505`), o código relê o registo
mas só sai se `estado === "creditada" && endereco === endereco`. Se o registo estiver em
`"recebida"` e for de **outra** carteira, o pedido segue e credita no endereço do segundo
pedido. A idempotência por `ref` é por carteira, logo não trava.
**Exploração:** 1 compra real + N POSTs em paralelo com sessões de carteiras diferentes
⇒ N Passes por um pagamento. O rate limit (5/min) não trava 5 pedidos simultâneos.
**Cobertura:** o teste «CORRIDA» só cobre a mesma conta.

### ALTO-2 — Compra nunca consumida no servidor ⇒ reembolso com crédito retido
`useComprarPasse.js:115-119` + desenho do servidor. Quem faz `finish()` é só o cliente;
`reconhecerCompra` existe mas não é usado. Quem receber o 201 e impedir o `finish()`
(matar a app, cortar rede, cliente modificado) recebe reembolso da Google ao fim de 3 dias
**e mantém** os 10 pontos, os 200 pontos de lance e o ECOQUILDO. Não há tratamento de
Voided Purchases nem RTDN.

### Outros achados
- **MÉDIO-1** — `_contaCache` (`_lib/google-play-billing.mjs:125`) nunca expira: rotação/revogação
  da chave não chega à instância quente; um 401/403 da Google não limpa a cache.
- **BAIXO-1** — falha do Supabase aparece como `google_play_nao_configurado` (esconde a causa).
- **BAIXO-2** — o teste T7 pode tocar no Supabase real e aceita dois códigos (prova pouco).
- **BAIXO-3** — `google_play_compras`: `anon` tem SELECT e `authenticated` tem UPDATE em
  produção; o que os trava é o RLS sem política. Basta alguém criar uma política para abrir.
- **BAIXO-3** — `tg_config_secrets_touch` sem `search_path` fixo; cabeçalho do endpoint declara
  `409 compra_ja_consumida` que nunca é emitido.

### O que o Opus NÃO conseguiu derrubar
Replay do mesmo token · recibo de outra conta **sequencial** (409) · estados pending/cancelado ·
SKU divergente · quantidade (vem sempre do recibo; >100 não credita e gera alerta) · PIX do
produto (token assinado, `approved` confirmado, CAS) · `config_secrets` (RLS medido em produção:
uma política SELECT para `service_role`; `anon`/`authenticated` sem SELECT nem INSERT) · env
inválida não cai para o banco · contrato 400/401/405/409/503.

Sobre o `_limparCacheCredencial()` nos testes antigos: **legítimo** — a cache é estado de
módulo; sem a limpar os testes mediam a cache. Nenhuma asserção enfraquecida.

### Suíte corrida pelo Opus (independente)
frontend **1258/1258** · backend **1433/1439** (6 saltados, 0 falhas) · harness VERDE, saída 0.
⚠️ RAM abaixo do A14 durante a corrida (1209 → 1483 MB) — declarado por ele.

---

## 2. FRENTE B — AUDITORIA DE INFRA (Hermes)

| Item | Resultado |
|---|---|
| HEAD local | `739dc8f` |
| `origin/main` | `739dc8f` (0 à frente / 0 atrás) |
| Working tree | 95 entradas, **8 rastreadas** (pré-existentes: `.agents/skills` ×3, `.gitignore`, `.mcp.json`, `CLAUDE.md`, `build.gradle` com versionCode 3, `docs/`) + 87 untracked (logs e relatórios) |
| Último deploy Netlify | **ready**, commit `739dc8f`, publicado **16:08:29** — corresponde ao HEAD |
| Supabase `config_secrets` | RLS activo, política única SELECT→`service_role`, JSON presente (2 037 B) e **anon = 401** — verificado por mim e re-medido pelo Opus |
| Suíte canónica | corrida agora pelo Opus: **VERDE** (1258/1258 + 1433/1439) |

---

## 3. ARTEFACTO PRONTO
`C:\Users\Moltbot\Desktop\DesafioGUT-20261025-v3.aab` — 32 419 569 B · versionCode 3 ·
SHA-256 `460d13bb1edb423dcc24219f30996ee490e011c5d81eac910a29529e8688ef6d` · `jar verified`.

---

## 4. PORQUE PAREI ANTES DAS FRENTES C E D

O enunciado manda parar só em caso de **REPROVADO**. O parecer é **APROVADO COM RESSALVAS**,
mas as duas ressalvas ALTAS são **furos de dinheiro real** e o próximo passo do plano é o Ruan
fazer compras reais no telemóvel. Criar a pasta `DesafioGUT-v3`, escrever «engenharia
encerrada» e entregar o AAB como final, com ALTO-1 e ALTO-2 abertos, seria declarar pronto o
que não está — e o ALTO-1 é explorável **exactamente** no cenário que o teste do Ruan vai usar
(compra real + cliente controlado).

**Decisão do operador necessária:**

- **Opção 1 (recomendada) — corrigir o ALTO-1 antes do teste do Ruan.** É pequeno: na colisão
  `23505`, se `registo.endereco !== endereco` devolver **409** (como na linha 139) + teste com
  duas contas em corrida. Estimativa **30-45 min**, incluindo teste e mutação. Depois disso,
  retomar as Frentes C e D.
- **Opção 2 — fechar como está**, aceitando ALTO-1 e ALTO-2 como risco declarado durante o
  teste fechado (poucos utilizadores, todos conhecidos). Só recomendo se o teste for mesmo
  restrito ao Ruan e sem clientes modificados.
- **ALTO-2** (consumo/reembolso no servidor) é maior: **2-4 h** com `purchase.consume` +
  tratamento de Voided Purchases/RTDN. Cabe como dívida pós-lançamento **se** o risco de
  reembolso for aceite por escrito.
