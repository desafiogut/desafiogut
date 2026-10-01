# UTAC105b — SEG-1 Medição (2026-09-30) · skill UTAC01 (tipo `produto`)

| # | Medição | Resultado |
|---|---|---|
| -1.1 | Repo | HEAD `5cac238` = baseline do spec ✅ · só `desafio-gut/frontend/package-lock.json` modificado (pré-existente) |
| -1.1b | Suíte (`mc966-suite-harness.mjs ambos`) | frontend **VERDE 530/530** · backend **VERDE 885/891** ✅ |
| -1.2 | `_lib/voucher.mjs` | ❌ **NÃO EXISTE.** Existe `netlify/functions/voucher.mjs` (268 l.): HANDLER HTTP de «Vouchers de Networking — Bônus Diamante» (Blobs `voucher`/`vouchers-emissor`, códigos `GUT-XXXXXXXX`, gerar=admin, resgatar=lance-auth). Não é um repositório; nada reaproveitável para cupons por valor/lojista além do padrão de handler |
| -1.3 | `_lib/passe.mjs` (70 l.) | `criarPasse({endereco, edicaoId, produtoId})` **não aceita `cupons_ids`**; não há setter. Escrever `cupons_ids` exige helper novo (em `passe.mjs` → reportar) ou escrita fora do repositório |
| -1.4 | `comprar-passe.mjs` (119 l.) | fluxo: auth → edição Programada na janela → `meta.produtoId === produtoId` → `produto.status==="ativo"` → passe existente? 200 → débito → `criarPasse` → 201 (ou reembolso). Ponto de ligação: depois de `r.ok && r.criado`. **Uma edição vende 1 produto (`meta.produtoId`) → 1 lojista (`produto.lojista`)** |
| -1.5 | `CorporativoDashboard.jsx` (637 l.) | identifica o lojista por `cotaCorporativa.cliente_id`; produtos por `produtos?lojista=<cliente_id>`. Rotas corporativas vivem em **`src/App.jsx:495-499`** (lazy imports `:69-73`) |
| -1.5b | Rota nova | `/corporativo/cupons` precisa de `<Route>` + `lazy` em **`App.jsx` — NÃO autorizado**. Sem ela o link cai na SPA e o guarda `mc991-rotas.test.mjs` fica vermelho |
| -1.6 | Supabase | `cupons` **não existe** ✅ · `passes` 0 linhas · cotas corporativas: **5 `0x…` (1 com `endereco`) + 2 `cnpj:…` (0 com `endereco`)** |
| -1.6b | Identidade do lojista | `produto.lojista` = `cliente_id` (`produtos.mjs:292`). Posse de um `cliente_id` só é provável (MC89.38, `produtos.mjs:295-330`) se = endereço do JWT, ou cota com `endereco` = JWT, ou admin → **os 2 lojistas `cnpj:` não conseguem provar posse** |
| -1.7 | Disco C: | 13 GB livres ✅ |

## Achado de segurança pré-existente (fora do âmbito — só reportado)
`cotas.mjs:471-499` `POST ?action=update-corporativo` **não autentica**: o comentário diz «verifica se o email do body bate», o código não verifica
nada — qualquer pessoa altera empresa/site/logo/**email** de qualquer cota corporativa conhecendo o `cliente_id`. Candidato a UTAC próprio.

## ⚠️ Conflitos entre o enunciado e o medido (AU3/AU4 — NÃO resolvidos pelo executor)
1. **Migração `cupons` (GATE 15):** SQL em `_logs/UTAC105b_MIGRACAO.sql`. Aplicar em produção?
2. **Rota `/corporativo/cupons`:** exige +2 linhas em `App.jsx` (não autorizado). Autorizar, ou outra forma?
3. **`cupons_ids` no passe:** `passe.mjs` não tem setter → helper `definirCuponsDoPasse(passeId, ids)` em `_lib/passe.mjs` (o enunciado pede reportar antes)?
4. **Posse do lojista no `PUT /cupons`:** usar a regra MC89.38 (cnpj sem endereço → 403) ou outra?
5. **Edição cujo lojista tem 0 cupons activos:** vender o Passe com `cupons_ids: []` ou recusar (o MN §2.2 diz que o Passe vale pelos cupons)?
6. **Falha ao gravar `cupons_ids` depois do débito:** passe fica com `[]` (fail-soft, alerta) ou reembolsa e falha?
7. `P1 — reaproveitar _lib/voucher.mjs`: impossível (não existe; o `voucher.mjs` é outro produto). Proposta: `_lib/cupom.mjs` novo, `voucher.mjs` intocado.

## Veredito: **AJUSTAR** — parar antes do SEG0 e reportar ao operador.

## R18 — respostas do operador (2026-09-30)
- **R18-A** Autoriza: aplicar a migração `cupons` · +2 linhas em `App.jsx` (rota `/corporativo/cupons`) · helper em `_lib/passe.mjs`.
- **R18-B** Posse no `PUT /cupons`: **regra MC89.38** (cliente_id = carteira do JWT, ou cota com `endereco` = JWT, ou admin; cnpj sem carteira → 403).
- **R18-C** Edição cujo lojista tem 0 cupons activos: **recusa 409** (`sem_cupons_ativos`), antes de debitar.
- **R18-D** `cupons_ids` gravado **no próprio INSERT** do passe (lidos antes de criar) — sem janela de falha pós-débito.
- **R18-E** Usar SEMPRE a skill UTAC01 (padrão daqui em diante). Spec: `_logs/UTAC105b.spec.yml` (41 linhas, campos obrigatórios validados).
- Q7 (voucher): sem objecção → `_lib/cupom.mjs` novo, `voucher.mjs` intocado.

Veredito após R18: **SEGUIR**.
