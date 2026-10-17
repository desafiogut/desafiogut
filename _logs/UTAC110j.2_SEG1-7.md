# UTAC110j.2 — PORTABILIDADE COMPLETA (LGPD art. 18, II e V) · registo de execução

Executor: Hermes · 2026-10-17 · base `a55869b` · **DEBT-046**

## 1. SEG-1 — medição (nada alterado)

| # | Objecto | Medido |
|---|---|---|
| 1 | `exportar-dados.mjs` | 216 linhas. Li Santa **11 tabelas** por coluna + `cotas` por `cliente_id` OU `endereco`. Blobs: `saldo-rs`, `wallet`, `cotas`, `renovacao-adesao`, `voucher`, `consent-log`, `lance-idem`, `pedidos`, `lances-relampago`. |
| 2 | Em falta (DEBT-046) | `pontos`, `palpites`, `resgates`, `eco_quildo`, `google_play_compras` — **e mais 3 que a dívida não nomeava**: `cotas_pagas`, `wallet_idem` (ambas com `payload.endereco`) e **as indicações inteiras** (5 stores). |
| 3 | UI de exportação | **Não existia.** Nenhuma referência em `src/` — o direito só era exercível por quem soubesse chamar o endpoint. |
| 4 | Schema das tabelas | `pontos(endereco PK, pontos, historico[])` · `palpites(endereco, edicao_id, valor, apurado, resultado)` · `resgates(endereco, cartao_id, morada JSONB, status)` · `eco_quildo(endereco PK, saldo, historico[])` · `google_play_compras(purchase_token PK, order_id, produto_id, tipo_passe, endereco, estado, pontos)` · `cotas_pagas(pedido_id, payload)` · `wallet_idem(idem_key, payload)` |
| 5 | RAM | 972 → trim → **1 841 MB** (A14 cumprido no SEG-1). Antes da 1.ª corrida o trim já tinha decaído para **1 391 MB**; depois de duas passagens novas subiu a **1 780–1 782 MB** e a corrida final arrancou com **1 737 MB** (portão cumprido). |

**Achado que o enunciado não previa:** `resgates.morada` guarda **nome, CPF, CEP, logradouro** — é o único sítio do sistema com CPF do titular junto da morada. A exportação não o mostrava, e a exclusão já o pseudonimizava: o titular podia apagar o que nunca lhe foi mostrado.

## 2. FRENTE A — cobertura (o buraco da DEBT-046)

Acrescentadas a `SUPA_POR_COLUNA` (cada uma filtrada pelo titular):

| Tabela | Coluna de filtro |
|---|---|
| `pontos` | `endereco` |
| `palpites` | `endereco` |
| `resgates` | `endereco` (com a morada — é dado DELE) |
| `eco_quildo` | `endereco` |
| `google_play_compras` | `endereco` |
| `cotas_pagas` | `payload->>endereco` |
| `wallet_idem` | `payload->>endereco` |

**Indicações** (`coletarIndicacoes`): código do titular + registo reverso, vínculos (como indicador **e** como indicado), conversões, marcas de fraude, bónus, contadores mensais, log filtrado e indução agrupada.

**Auditoria** (`coletarAuditoria`): eventos do store `auditoria` criado no 110j.1.

## 3. FRENTE B — formato

- **JSON** (principal) com envelope: `titular`, `geradoEm`, `geradoPor`, `politicaRetencao`, **`schema: "2.0"`**, **`exportacao`** (metadados) e `dados`. O contrato anterior mantém-se — nada que já lia o JSON partiu.
- **Metadados**: controlador (nome, CNPJ, **DPO**), direito invocado (art. 18, II e V; art. 19, II), formatos, **base legal por categoria**, **o que fica retido depois da exclusão e porquê**, nota de pseudonimização (ANPD) e declaração de segredos comerciais (art. 18, §4º).
- **CSV** (`?formato=csv`): formato longo `categoria,caminho,valor`, uma linha por campo, com escape de vírgula/aspas/quebra e **BOM UTF-8** para abrir no Excel.

## 4. FRENTE C — interface

`Configuracoes.jsx` → cartão de conta → **«⬇️ Baixar meus dados»** (ao lado de «Excluir conta»):
- `POST /.netlify/functions/exportar-dados` com o JWT do titular (o endereço vem do contexto, não de input);
- entrega por download (`Blob` + `a.download="desafio-gut-meus-dados-AAAA-MM-DD.json"`), URL revogada no fim;
- botão desactivado durante a geração; erro mostrado no ecrã **com o canal alternativo por e-mail**;
- **prazo**: imediato (o art. 19, II dá 30 dias; não é preciso usá-los).

## 5. FRENTE D — coerência com o 110j.1

- O `exportacao.retencaoAposExclusao` diz, item a item, **o que fica e porquê** (fiscal 10 anos, Marco Civil 13 meses, ECOQUILDO como lastro, on-chain imutável, lances de edição aberta).
- Corrigida uma frase que **contradizia** o 110j.1 em `Configuracoes.jsx`: «A exclusão remove permanentemente seus dados pessoais» → «elimina ou pseudonimiza». Estava fora do âmbito estrito (não é o fluxo de exportação) — corrigi porque era falsa e vizinha do botão novo; declarado aqui.

## 6. SEG4 — verificação

| Verificação | Resultado |
|---|---|
| Testes novos (`utac110j2-exportar-dados`) | **10/10** |
| Teste novo de UI (`utac110j2-exportar-ui`) | **5/5** |
| Teste prévio estendido (`mc104-exportar-dados`) | **8/8** — inclui o HARD GATE 13 («nada de terceiros»), que passou a exercer as tabelas novas |
| Backend (todos) | **1351/1357**, 0 falhas (1317 → +34) |
| Suíte canónica | ver `_logs/UTAC110j.2_SEG4_VEREDITO.txt` |
| **Mutação** | **4/4 mortos** — M1 (tirar `pontos`), M2 (não mascarar a contraparte), M3 (tirar base legal), M4 (CSV sem escape). Restauro conferido por md5. |

**Portão A14, com o histórico à vista:** o trim deu 1 841 MB no SEG-1; minutos depois, no arranque da 1.ª corrida, a leitura era **1 391 MB** (abaixo do portão — o efeito do trim decai em segundos). Pedido novo de libertação → **1 780 MB**, e a corrida final arrancou com **1 737 MB**. Fica o número de cada leitura, não só o favorável.

## 7. Decisões e limites

- **Terceiros**: em `vinculos` a contraparte sai como `anon:<hash>`; `bonus.ultimos[]` e eventos de log também. O **código** de indicação do terceiro aparece (é o que o titular usou para se registar — dado dele), mas nunca o endereço.
- **`purchase_token`** (Google Play) sai como está: é a prova da compra dele. Não é segredo comercial.
- **Não exportado**: `cota_fingerprints` (chave `visitor_id`, não alcançável pelo endereço — DEBT-050) e dados on-chain (não há leitura por endereço neste endpoint; o histórico está em `lances`).
