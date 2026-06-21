# MC37 — Plano Executável: concluir migração de cotas (Blobs → Supabase)

**Data:** 2026-06-21 · **Branch:** `feat/mc37` (base `feat/mc36`) · **Fase:** 1 (corporativo/cotas; saldo-rs/wallet = MC36.1)

## 1. Resumo executivo
A fundação está feita e validada: schema (`cotas`, `cotas_pagas`, `cota_fingerprints`) aplicado em **produção+staging**, `_lib/cotas-store.mjs` (acesso Supabase) + 5 testes, backup dos Blobs, RLS role-based. **Suite 73/73 verde.** Falta **ligar os handlers** ao `cotas-store`, **migrar os 7 registos** e **adaptar o frontend** — preservando o anti-fraude. **Produção intocada até ao cutover** (tabelas vazias, cotas-store não ligado).

## 2. Pendências priorizadas
**P0 (núcleo da migração):**
- Refatorar `cota-ativacao.mjs` (ativação pós-pagamento) → `cotas-store`; atualizar `cota-ativacao.test.mjs`.
- Refatorar `cotas.mjs` (605 linhas: register-corporativo, anti-duplicidade CNPJ, anti-Sybil fingerprint, verificar-login, lookup email, CRUD admin, listagem/resumo) → `cotas-store`; **criar teste** (não existe).
- Migrar os **7 registos** `cotas` (+ índices cnpj/fingerprint embebidos no payload/colunas) com **dry-run → real → consistência**.

**P1:**
- Refatorar `iniciar-cota.mjs` (início da compra) → `cotas-store` para leitura de cota.
- Frontend: páginas corporativas leem via funções (já leem via `cotas.mjs`); confirmar que nada quebra (as funções é que mudaram, não o contrato de resposta).

**P2 / fora de âmbito (MC36.1):**
- `wallet.mjs` + `saldoRs.mjs` + `troco-senhas.mjs` (saldo R$/senhas — fluxo de dinheiro/lance, usado por `lance-relampago`). **NÃO** nesta fase.

## 3. Ordem de execução (cronograma)
1. `cota-ativacao.mjs` (mais pequeno, claro) + teste.
2. `cotas.mjs` (anti-fraude — devagar, R8) + novo teste.
3. `iniciar-cota.mjs`.
4. Script de migração de dados + dry-run (staging) + real (staging) + real (prod) + consistência.
5. Frontend smoke + visual MCP (375/1440, CLS=0).
6. Suite completa + docs + PR.

## 4. Estratégia de migração de dados
- Script `scripts/migrate-cotas.mjs`: lê Blobs `cotas` (7) + `cotas-cnpj` + `cotas-fingerprint`; para cada registo, `cotas-store.upsertCota`/`setFingerprint` (service_role). `--dry-run` imprime o que faria (sem escrever).
- **Consistência:** contar registos Blob vs `SELECT count(*)` Supabase; comparar `cnpj`/`categoria` chave-a-chave.
- Ordem: dry-run staging → real staging (validar) → real prod.

## 5. Cutover anti-split-brain (R11)
- **Escrita:** exclusiva Supabase (handlers refatorados). NUNCA dual-write.
- **Leitura (transição):** os handlers lêem Supabase; **fallback de LEITURA para Blob** apenas durante a janela (read Supabase → se ausente, read Blob legado) elimina o gap sem violar R11 (R11 proíbe dual-WRITE, não dual-read de histórico). Remover o fallback num MC seguinte após confirmação.
- Como o volume é baixo (7) e a escrita corporativa é rara, em alternativa: migrar dados → deploy imediato (janela mínima). **Escolha recomendada: fallback de leitura** (zero gap).

## 6. Rollback
- Backup em `Desktop\mc36-blobs-backup-20260621\` (cotas/saldo-rs/créditos).
- Reverter = `git revert` dos commits de refactor (handlers voltam a ler/escrever Blobs, que continuam intactos) + opcional `TRUNCATE` das tabelas Supabase. Blobs nunca são apagados nesta fase → rollback trivial.

## 7. Critérios de sucesso
- `node --check` limpo; `npm run build` verde em cada commit (R2).
- Suite **≥73 verde** (incl. testes atualizados/novos); MC28/29.1/30/33/34/35 intactos.
- Consistência: 7 cotas migradas == 7 em Supabase, campos conferem.
- Anti-fraude preservado (anti-duplicidade CNPJ, anti-Sybil) — testado.
- Visual MCP 375/1440, CLS=0, sem novos erros.
- Fluxo corporativo (registo → cota → leitura) funciona.

## 8. Riscos
- Anti-fraude em `cotas.mjs` é segurança → refactor cuidadoso + teste obrigatório.
- Janela de cutover → mitigada por fallback de leitura.
- `cotas.mjs` sem teste prévio → criar antes/durante o refactor.
