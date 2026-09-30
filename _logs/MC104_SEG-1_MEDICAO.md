# MC104 — SEG-1 · MEDIÇÃO

Data 2026-09-30 · HEAD `42e76d0` · disco C: **8,6 GB livres** (≥ 5; caiu de 14 GB desde o MC103 — consumidor externo, já registado no MC102.0).

## -1.1 Suíte
`mc966-suite-harness.mjs ambos`: frontend **508/508** · backend **800/806** (VERDE).
⚠️ A 1.ª corrida terminou com um erro do Node truncado (sem veredicto); a 2.ª, imediata, VERDE. Não reproduzido — registado como
instabilidade do harness, não como verde.

## -1.2 Gate (`src/components/TermosConsentimento.jsx`)
- 4 caixas (`lido`, `maiores`, `termos`, `privacidade`), botão só activo com as 4 (`:22`, `:36-41` do bloco de caixas).
- **Aceite gravado SÓ no `localStorage`** `gut_consentimento = {aceito, timestamp (relógio do cliente), versao:"2.0"}` (`:24-37`).
  **Nenhuma chamada ao servidor.** ⇒ **LGPD art. 8º §2º: hoje não há prova do aceite do gate no servidor.**
- `VERSAO_CONSENTIMENTO = "2.0"` (`:14`); `Boot.jsx:29-38` só deixa passar com a versão igual.

## -1.6 Endereço / token no momento do aceite — ⛔ o gate é ANTES do login
`Boot.jsx:82-93`: sem aceite, o `Boot` renderiza **só** o gate — o chunk da app, o Privy e o `AppContext` nem carregam
(MC82.2). ⇒ **No momento do clique não existe endereço nem `authToken`.** O endereço e o token só existem depois, no
`AppContext` (`authToken` em `:425`, `obterAuthToken` em `:887-915`). Consequência: «ao aceitar, chamar o endpoint» (0.2 do
enunciado) **não consegue** gravar o endereço; o registo tem de ser enviado **depois do login**, a partir de um ficheiro que
tenha o token — `AppContext.jsx` **não está autorizado**.

## Registo existente no servidor: Blob `consent-log`
- Escrito **só** por `comprar-senhas.mjs:60-76` (chamado em `:253` e `:344`), ao comprar senhas:
  chave `${ts}:${endereco}`, `{endereco, aceiteEm (servidor), termoVersao:"v2026-05", ip, userAgent, contexto:"comprar-senhas"}`.
- ⚠️ `termoVersao` é **fixo `"v2026-05"`** — o comentário `:40` manda sincronizar com o gate, que está em `"2.0"`. Não estão.
- Já é: **exportado** (`exportar-dados.mjs:46-63,137`), **apagado** na exclusão (`_lib/conta-delete.mjs:229-236,276`),
  **retido 5 anos** (`purge-logs.mjs:35`) e **incluído no backup** (`backup-blobs.mjs:30`).
  ⇒ É o mecanismo de consentimento que já existe (P1 — não recriar).

## -1.3 `exportar-dados.mjs` (151 linhas) — o que exporta
Só **Netlify Blobs**: `saldo-rs`, `wallet`, `cotas`, `renovacao-adesao`, `voucher` (por chave), `consent-log` (sufixo da chave),
`lance-idem` e `pedidos` (por `obj.endereco|obj.address`). Auth owner-ou-admin (`:112-130`) ✅. **Nenhuma leitura do Supabase.**

| Tipo pedido pelo MC | Hoje | Evidência |
|---|---|---|
| Lances | ❌ só `lance-idem` (chaves de idempotência). Os lances estão no Blob **`lances-relampago`** (`lance-relampago.mjs:38`) e na tabela **`lances`** (Supabase) | `:138` |
| **Pedidos** (morada, CPF, NF-e) | ❌ **nunca casam**: o pedido guarda o dono em **`comprador`** (`_lib/pedidos.mjs:204`), a exportação só procura `endereco`/`address` (`:74`) | `:139` |
| Palpites | N/A — a funcionalidade **não existe** (as ocorrências de «palpite» são o palpite de *tipo de conta* do `AppContext`) | grep |
| Pontos do torneio | ❌ `pontuacoes` e `rankings_ciclo` (Supabase) não são lidos | — |
| Histórico de consentimento | ✅ parcial — `consent-log` (só o de compra de senhas) | `:137` |

⚠️ **Achado maior que o enunciado:** desde o MC36.1 o saldo R$, créditos PIX, Vale-Crédito e cotas vivem no **Supabase**
(`DATA_STORE_BACKEND=supabase`), mas a exportação lê os **Blobs legados**. Também faltam `atividade_utilizadores`,
`troco_senhas`, `saldo_rs_creditos`. O titular recebe hoje uma exportação desactualizada nestes tipos.

## -1.4 `_lib/conta-delete.mjs` (não alterado)
Apaga Supabase (`saldo_rs`, `troco_senhas`, `wallet`, `lances`, `lojistas`, `atividade_utilizadores`, `cotas`), anonimiza
`saldo_rs_creditos/debitos`, apaga Blobs por chave + `lance-idem` + `consent-log`, anonimiza `pedidos*` por `endereco`
(mesmo defeito do `comprador` — achado do MC102.1b, MC próprio). Não trata `pontuacoes`/`rankings_ciclo`.
⚠️ **Autorizações contraditórias no enunciado:** «AUTORIZA alterar `_lib/conta-delete.mjs` (só para a exportação)» e
«NÃO AUTORIZA tocar no `conta-delete.mjs`». Se o consentimento continuar no `consent-log`, **não é preciso tocar**.

## -1.5 Supabase (só SELECT)
Sem tabela de consentimento. Tabelas com dados pessoais: `lances(endereco,…)`, `pontuacoes(endereco,…)`,
`rankings_ciclo(endereco,…)`, `atividade_utilizadores(endereco,…)`, `cotas(cliente_id,endereco,cnpj,email,…)`,
`saldo_rs`, `saldo_rs_creditos`, `troco_senhas`, `wallet`, `lojistas`, `usuarios_bloqueio(cliente_id,…)`.

## Veredito SEG-1: **AJUSTAR** — 3 decisões do operador antes de tocar
1. **Onde gravar o aceite:** reutilizar o Blob `consent-log` (já exportado/apagado/retido/backup — P1) ou tabela nova no Supabase.
2. **Como ligar o aceite ao endereço**, se o gate é pré-login: exige enviar o aceite depois do login (ficheiro fora da lista).
3. **Âmbito da Frente B:** só os 5 tipos do enunciado, ou também os dados que migraram para o Supabase.

## R18 — decisões do operador (2026-09-30, durante o SEG-1)
1. **Registo do aceite no Blob `consent-log`** (existente), não em tabela nova. ⇒ sem migração; `conta-delete` intocado.
2. **Envio depois do login**, a partir do `AppContext.jsx` (fora da lista original — autorizado agora). O gate continua a
   guardar localmente; o servidor grava a hora do servidor **e** a hora declarada pelo cliente.
3. **Frente B = 5 tipos + dados migrados para o Supabase** (saldo R$, créditos/débitos PIX, Vale-Crédito, cotas, atividade, troco).
Registado em 3 lugares: este log, `CLAUDE.md` (secção MC104) e `Desktop/MC104-RELATORIO.md`.
4. **(SEG2) O aceite do aparelho vale só para a 1.ª conta** que entra depois do clique; as seguintes ficam sem registo (não com um falso). Decidido após o validador mostrar que o aceite era atribuído a qualquer conta do aparelho.
