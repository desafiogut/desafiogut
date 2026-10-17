# UTAC110j.1 — SEG3: verificação (suítes, mutação, o que correu mal)

> Executor: Hermes · 2026-10-16

## 1. Porque este documento regista uma corrida VERMELHA

A primeira corrida completa do frontend deu **VERMELHO 3 falhas**. As três eram **minhas**, causadas
pela alteração de texto — e ficam aqui à vista, com a causa e a correcção, porque apagá-las do registo
seria exactamente o defeito que a série MC96 combate.

| # | Teste que falhou | Causa medida | Correcção |
|---|---|---|---|
| 1 | `1-D · a lista de exclusão diz o que o conta-delete APAGA e RETÉM` (`utac110j-vocabulario-v5`) | Este teste **era o detector da lacuna do 110j**: exigia a frase antiga do modal (`saldo em R$, registro off-chain de senhas, histórico de lances e perfil`) e continha o comentário «LIMITE DECLARADO: vínculos de indicação, pontos, ECOQUILDO, palpites, resgates e google_play_compras **não são apagados nem declarados**». Ao fechar a lacuna, a frase mudou. | Teste **actualizado para exigir MAIS**: as seis famílias passam a ter de estar no ecrã, as listas são lidas por `export const APAGADOS` / `RETIDOS`, e o «limite declarado» foi substituído pela ligação ao teste de deriva novo. Não foi enfraquecido. |
| 2 | `cada (Art. Nº) na UI aponta para o artigo certo do v5` (`artigosUI`) | Escrevi «Marco Civil da Internet, **art. 15**». O scanner de citações leu-o como citação do **art. 15º do Regulamento v5** (que é outra coisa) e exigiu palavra-chave no mapa. **Falso positivo gerado por mim**: a citação era ambígua. | Passou a citar a **lei** («Marco Civil da Internet, Lei 12.965/2014»), que é o que se quer dizer. A referência jurídica ficou mais precisa, não menos. |
| 3 | `P3: em TODA a produção, «torneio» só existe como chave/...` (`utac110h3-pendencias-front`) | Escrevi «DesafioGUT **Torneio** Habilidade» na página pública (nome da ficha da Play). A regra do v5 proíbe «torneio» como vocabulário na UI. | A página nomeia a app **«DesafioGUT»**. O nome completo continua na ficha da Play; a coerência ficha↔página fica no Data Safety (**DEBT-047**). |

## 2. Resultado final

| Suíte | Antes (enunciado) | Depois | Estado |
|---|---|---|---|
| Frontend | 1160/1160 | **1163/1163** (1160 + 3 novos) | **VERDE** |
| Backend | 1311/1317 (6 skipped) | **1340/1346** (1317 + 29 novos, os MESMOS 6 skipped, 0 falhas) | **VERDE** |
| `conta-delete` antigos (mc72 + mc1042 + mc1043) | 31/31 | **31/31** | sem regressão |
| Testes novos | — | **33/33** (29 backend + 4 frontend) | VERDE |
| Mutação dos testes novos | — | **12/12 mortos** (5 + 3 do 4b + 4 das correcções B1/B2/B3/B6) | VERDE |

⚠️ **Duas corridas canónicas, dois códigos diferentes — as duas ficam à vista:**
- `UTAC110j.1_SEG3_VEREDITO.txt` → VERDE (1163/1163 · 1326/1332), **antes** das correcções do
  R18-110j.1-4b.
- `UTAC110j.1_SEG3_VEREDITO_POSVALIDADOR.txt` → **VERDE 1164/1164 · 1337/1343**, com as correcções
  B1/B2/B3/B4/B6/B8/B9 da 1.ª ronda do validador.
- **`UTAC110j.1_SEG3_VEREDITO_FINAL2.txt` → VERDE 1164/1164 · 1340/1346 — é ESTA a que vale.**
  Inclui o B2-residual, o `wallet_idem`, o B5 e o B7. RAM antes: **1 820 MB** (portão cumprido).

## 3. Mutação (R16)

| Mutante | O que faz | Resultado |
|---|---|---|
| D1 | tira `pontos` da lista de hard delete | **MORTO** (9 falhas) |
| D2 | anonimização do ECOQUILDO vira no-op (grava o endereço outra vez) | **MORTO** (3) |
| D3 | apaga o vínculo do TERCEIRO em vez de o anonimizar | **MORTO** (3) |
| D4 | auditoria grava o endereço em vez do pseudónimo | **MORTO** (3) |
| D5 | `referral-log` deixa de ser anonimizado | **MORTO** (3) |
| **D6** | a morada do resgate deixa de ser substituída (fica o dado pessoal) | **MORTO** (3) |
| **D7** | apaga `pontos` mesmo havendo resgate (o CASCADE levaria o registo retido) | **MORTO** (5) |
| **D8** | desliga a guarda fail-closed: com o resgate por anonimizar, `pontos` seria apagado | **MORTO** (3) |

D6–D8 são a 2.ª ronda, depois da decisão R18-110j.1-4b — instrumento em
`_logs/UTAC110j.1_SEG3_MUTACAO_4b.sh`. Restauro conferido: md5 `6046e489…` == inicial.

Restauro: `.bak` **fora do repo** antes de cada mutante + `md5` no fim — 1.ª ronda
**`749739a6f642ef604525477f6807d6cb` == inicial**; 2.ª ronda **`6046e489…` == inicial** (DEBT-041: o restauro in-process dos instrumentos
antigos falha quando a corrida morre; este script não depende disso).
Script preservado no repo como evidência re-executável: `_logs/UTAC110j.1_SEG3_MUTACAO.sh`.

## 4. Desvio declarado do A14 (RAM)

Portão ≥ 1 500 MB, medido antes de CADA corrida (não transita entre rondas).

- **1.ª ronda: NÃO CUMPRIU.** 456 · 443 · 435 (arranque) → 712 · 1 016 (após fechar 8 `msedge` sem
  janela) → 1 229…1 379 (após `EmptyWorkingSet` em 112 processos) → **1 398 MB** antes da corrida.
  Correu abaixo do portão, em foreground, sem falha inexplicada (as 3 falhas do frontend têm causa
  medida — §1). Desvio declarado.
- **Ronda do fecho: CUMPRIU.** A mesma escada segura deu **1 880 · 1 928 · 1 963 MB**, e a leitura
  imediatamente antes da corrida foi **1 867 MB**. É só desta corrida que se afirma o cumprimento; a
  primeira fica registada como desvio, sem ser reescrita.
(Skill `windows-memory-pressure` §3.1/§3.2: o tecto é estrutural — `svchost` 816 MB em 91 processos,
`MsMpEng` 374, `Memory Compression` 162, a sessão 402 e as apps do operador.)
