# UTAC000.8 — SEG-1 · Medição, investigação (Frente A) e PARAGEM (GATE 4) — 2026-10-01

> **ESTA SESSÃO (2.ª):** o SEG-1 abaixo (§-1.1 a §-1.7) é o registo da 1.ª sessão, **preservado tal
> como estava**. A 2.ª sessão reconfirmou o baseline e, ao medir a **produção**, **refutou** parte do
> seu diagnóstico — ver **§-1.8**, **§-1.9** e **§-1.10**. As conclusões refutadas ficam **à vista**,
> marcadas (nunca apagadas).

**Objectivo:** fechar **DEBT-007** (histórico de lances completo; 🏆 «Menor e Único» honesto).
**Veredito: PARAR no fim do SEG-1/Frente A.** A investigação **ficou feita e a abordagem decidida**
(o que o SEG0 pedia), mas a implementação é **cross-stack** (backend + frontend) e **não cabe no
orçamento desta sessão** — começá-la e deixá-la a meio seria pior (HI5/GATE 4, GATE 13).

## -1.1 Estado MEDIDO (≠ do que o spec supunha — ver §-1.6)
| item | spec dizia | **medido** |
|---|---|---|
| base | `f0f02a6` | **`93c286d`** = `origin/main` |
| suíte frontend | 547/547 | **VERDE 547/547** ✅ |
| suíte backend | 967/973 | **VERDE 967/973** ✅ |
| severidade da DEBT-007 | **ALTA** | **`média`** (é o que está em `_logs/DEBT.md`) |

## -1.2 É PRÉ-EXISTENTE (HI2) — confirmado
O próprio achado é do validador do **UTAC105c** (ressalva 2 do `_logs/UTAC105c_SEG4_VALIDADOR.md`), que
o registou como **já existente**: «Isto já existia: afeta o cartão «Menor Lance» e o `vencedor` do
Dashboard da mesma forma». Nenhuma linha deste UTAC o introduziu.

## -1.3 ⚠️ O DEFEITO, com precisão (medido no código) — **REFUTADA quanto a PRODUÇÃO (ver §-1.9)**
> As duas afirmações abaixo estão certas **como leitura do código em Sepolia/localhost (modo legado)** e
> estão **erradas como descrição do que a produção faz hoje**. O texto original fica à vista; a
> refutação medida está em §-1.9. Não se apaga (P2/GATE 14).

`src/context/AppContext.jsx`:
- **`lancesFlash`** (modalidade *flash*) — **CARREGADO INTEIRO no mount**, por polling ao blob:
  `apiGet("lances-flash?edicaoId=…")` → `setLancesFlash(data.lances)` (linhas **768-770**).
  **Não tem o defeito.** ← **REFUTADA em produção: o blob está VAZIO (§-1.9, M3/M5) e a lista que o
  utilizador vê em produção é `[]`.**
- **`lances`** (modalidade *on-chain*/*programado*) — **só** se enche com (a) eventos `LanceDado` em
  tempo real (`subscribeLanceDado`, l. **780-781**) e (b) os lances do próprio utilizador
  (l. **1297-1303**). **Não há carga inicial do histórico da edição.** ← **é aqui que está o defeito.**
  ← **INCOMPLETA: em produção não há eventos `LanceDado` nenhuns (§-1.9, M5/M6), logo o defeito não é
  «só» deste lado — cobre as duas listas.**

Logo: o 🏆 «Menor e Único» (`MeusAtivos.jsx`), o cartão «Menor Lance» e o `vencedor` do Dashboard
(`l. 698`) dizem, na modalidade on-chain, **«o menor único que ESTE browser viu desde que abriu»**.

## -1.4 Frente A — a abordagem (DECIDIDA, Ponytail)
**A infraestrutura já existe — não é preciso inventar nada:**
- `netlify/functions/_lib/contract.mjs` exporta **`getLanceDadoEvents(ini, fim)`** e **`getBlocoAtual()`**;
- `netlify/functions/monitor-onchain.mjs` já os usa **com paginação** (`lote = await getLanceDadoEvents(ini, fim)`, l. 138) para varrer `LanceDado` de `ultimoBloco+1` até `blocoAtual`;
- `consolidar-lances.mjs` já lê TODOS os lances (Key-Per-Bid) com paginação.

**Opção escolhida (mínima):** um endpoint que sirva o histórico da edição a partir dos **eventos
`LanceDado` desde o bloco de arranque da edição** (reutilizando `getLanceDadoEvents`, com a paginação
que o `monitor-onchain` já demonstra), e o `AppContext` a fazer **uma carga inicial** para `setLances`
no modo on-chain — espelhando o efeito de polling que já existe para `lancesFlash` (l. 768-770).
Não é preciso tocar em contratos nem no GUTO.

**Opções descartadas:** (B) pôr a página a falar directamente com a chain — duplicaria a paginação no
browser e exporia o RPC; (C) servidor de índice novo — desproporcionado.

> ⚠️ **Esta «opção escolhida» foi refutada por medição em §-1.9 (M5/M6/M10).** O registo fica à vista
> porque é o que a 1.ª sessão decidiu; a alternativa medida está em §-1.10.

## -1.5 Saúde global (HI1)
Disco OK · suíte **547/547 · 967/973 VERDE** · árvore limpa (só `package-lock.json` pré-existente) ·
`_logs/UTAC105c*` presentes mas **alheios** (outra sessão; não tocados) · nenhum processo em execução.

## -1.6 DESVIOS SPEC↔REALIDADE (declarados, não corrigidos por mim)
1. **Base errada no spec:** diz `f0f02a6`; o real é **`93c286d`** (o UTAC105c foi fechado e pusheado
   noutra sessão, entretanto).
2. **Severidade:** o spec diz **ALTA**; a `DEBT.md` regista **`média`**. Não alterei — atribuir
   severidade é decisão de prioridade do operador (GATE 12/AU3).
3. **Contagem da suíte:** o spec diz 535; são **547** (o UTAC105c acrescentou 12 testes).
   Nenhum destes desvios altera o trabalho: o defeito existe igual.

## -1.7 VEREDITO DO SEG-1: **PARAR** (GATE 4/HI5)
Entregue: medição completa, confirmação de pré-existência, localização exacta do defeito, inventário da
infraestrutura existente e **abordagem decidida**. Não entregue: implementação, testes, validador.
A implementação fica com um ponto de partida concreto e sem ambiguidade para o UTAC seguinte.

---

# 2.ª SESSÃO (2026-10-01) — verificação do SEG-1, medição da produção e PARAGEM (GATE 11)

## -1.8 Baseline reconfirmado (-1.2 do spec desta sessão)
| item | medido nesta sessão |
|---|---|
| `git rev-parse HEAD` | **`c64a5bb`** = `origin/main` (commit de **docs**: `CLAUDE.md`, `_logs/DEBT.md`, `_logs/UTAC000.8-*`; o **código** é o de `93c286d`) |
| suíte frontend | **VERDE 547/547** (`# tests 547 · # pass 547 · # fail 0 · # skipped 0`) |
| suíte backend | **VERDE 967/973** (`# tests 973 · # pass 967 · # fail 0 · # skipped 6`) |
| árvore | limpa excepto `desafio-gut/frontend/package-lock.json` (pré-existente, não meu) |
| harness | `frontend: VERDE 547/547 pass` · `backend: VERDE 967/973 pass` · `VEREDITO: VERDE` |

**Evidência bruta (HI10/GATE 6):** `_logs/UTAC000.8_SEG-1_EVIDENCIA.txt` — veredicto do harness,
resumos TAP das duas suítes, respostas **de produção** (abaixo) e `md5` dos ficheiros envolvidos
**antes** de qualquer correcção. Desvio declarado: o **TAP completo** não foi arquivado (só os
resumos) — instrumento imperfeito, registado.

## -1.9 MEDIÇÃO DA PRODUÇÃO — o diagnóstico do SEG-1 não sobrevive (-1.4 do spec)
Leituras **públicas, sem autenticação**, contra `https://silly-stardust-ca71bc.netlify.app` (o site de
produção; URL retirado da CSP do `netlify.toml`). Prova de que a resposta é gerada em tempo real: o
`/edicoes` devolve o campo `"agora":"2026-10-01T22:05:41.532Z"`.

| # | medido | como |
|---|---|---|
| **M1** | `HEAD = origin/main = c64a5bb`; código igual a `93c286d` | `git rev-parse` |
| **M2** | **A produção corre em `NETWORK_STAGE = mainnet`** | `GET /lances-flash?edicaoId=R-1` devolve `{"ocultoAteConsolidar":true,...}` — esse campo **só existe no ramo `mainnet`** do `lances-flash.mjs` (l. 85-98) |
| **M3** | **A lista de lances do relâmpago está VAZIA em produção**: `{"edicaoId":"R-1","ocultoAteConsolidar":true,"lances":[]}` (idem `RELAMP-1`) | `GET /lances-flash` |
| **M4** | Edição **`R-1`** (a activa do `AppContext`): `tipo: relampago`, `status: aberto`, `termino_em` ≈ agora + 24 h (janela rolante), `lances: 0` | `GET /edicoes` |
| **M5** | Em mainnet **o Blob `lances-relampago` nunca é escrito**: `lance-relampago.mjs` l. 247-270 escreve **só** em `addLance` (Key-Per-Bid); o ramo do Blob é o `else` (legado/Sepolia). Nada no repo sincroniza Key-Per-Bid → Blob | leitura do código + `grep` de escritores do Blob |
| **M6** | Em mainnet **não há eventos `LanceDado`**: o caminho on-chain da UI (`enviarLance`/`darLance` → evento com valor) só corre em `!MAINNET` (`CardLance.jsx` l. 172 e l. 246+). Em mainnet vai **só o hash** (`comprometerLance` → evento `LanceComprometido`) | leitura do código |
| **M7** | **O vencedor oficial é apurado fora da cadeia**, a partir do **Key-Per-Bid**: `_lib/consolidacao.mjs` l. 82-83 → `apurarMenorUnico(await getLances(edicaoId))`; `data-store.mjs` (fachada; `DATA_STORE_BACKEND` ausente do `netlify.toml` ⇒ default `blobs`) → `bids-store.listarBids` | leitura do código |
| **M8** | **Por desenho, em mainnet o valor não sai em claro**: `lances-flash.mjs` l. 82-98 devolve `valor:null, oculto:true, repetido:null` e `acao=verificar` responde **403** durante o leilão (MC28.1 R9 / G-2, anti-bot) | leitura do código |
| **M9** | `/ranking?cicloId=R-1` → `{"total":0,"ranking":[]}` (nada pontuado ainda) | `GET /ranking` |
| **M10** | **Não existe** nenhum «bloco de arranque da edição» no repo (`grep` por `blocoInicio|blocoArranque|inicioBloco|bloco-edicao` → 0 resultados) e o `monitor-onchain.mjs` documenta um **limite duro de 10 blocos por `getLogs`** (plano Free do Alchemy, l. 39) | leitura do código |

### Consequências (todas medidas, nenhuma suposta)
1. **A abordagem decidida no SEG-1 (`getLanceDadoEvents` + `getBlocoAtual`) é inútil em produção:**
   em mainnet o valor **nunca** vai nos eventos (vai só o hash, M6); **não existe** `fromBlock` honesto
   para o início da edição (M10); e o limite de 10 blocos/query torna a varredura de uma edição de
   ~24 h inviável.
2. **O defeito é mais largo do que o SEG-1 registou.** Em produção (edição `R-1`, relâmpago) o
   utilizador vê **as duas listas vazias** — `lancesFlash` (M3) e `lances` (M5/M6) — e o 🏆 / cartão
   «Menor Lance» ficam em «—». A frase «o `lancesFlash` não tem o defeito» **é falsa quanto ao que a
   produção faz** (o código carrega o Blob inteiro; o Blob está vazio).
3. **O único lugar onde o histórico completo com valores existe é o servidor** (Key-Per-Bid, M7) —
   e é **deliberadamente blindado durante o leilão** (M8). «Fazer o 🏆 ir para o vencedor real durante
   o leilão» exige **revelar os valores** ⇒ quebra o MC28.1 R9/G-2 ⇒ **decisão de produto**, que o
   spec **não autoriza** («NÃO AUTORIZA tomar decisões de produto»).

## -1.10 VEREDITO DESTA SESSÃO: **PARAR** e **ESCALAR** (GATE 11 + R15)
Não implementei nada: qualquer implementação da Frente A tal como especificada não serve a produção,
e a alternativa exige uma decisão de produto que não me pertence. Opções medidas, custos e a minha
recomendação: `_logs/UTAC000.8_SEG0_ESCALADA-OPCOES.md`.

## -1.11 Erros dos MEUS instrumentos (declarados, como o operador exige)
| # | instrumento | erro/limite |
|---|---|---|
| I1 | harness `mc966-suite-harness.mjs` | a 1.ª execução só guardou o **resumo** (73 bytes); o **TAP completo antes/depois** não ficou arquivado. Corrigido parcialmente na evidência (resumos TAP por suíte). |
| I2 | flag **frontend** (`VITE_NETWORK_STAGE`) | **NÃO medida.** O chunk que contém o `CardLance.jsx` não está no bundle de entrada (`/assets/index-*.js`, 27 KB) e não o persegui. Consequência: se o frontend **não** for `mainnet`, o caminho legado `darLance` (com eventos `LanceDado`) pode existir na modalidade **programado**; isso **não altera** a conclusão sobre a modalidade **relâmpago** (medida vazia, M3) nem a fonte de verdade server-side (M7). Declarado por NÃO estar medido. |
| I3 | `curl` em MSYS | `-o /dev/null` devolve `bytes=0` mesmo em sucesso — **não** foi usado; os corpos foram lidos por inteiro. |
| I4 | cache de CDN | descartado como causa: o `/edicoes` devolve `agora` com timestamp de geração (leitura viva); a CSP e o `Cache-Control` de `/*` são `no-cache` para HTML/`index.html` e as Functions não são estáticas. Não medi explicitamente o `Cache-Control` da resposta da função — declarado. |
| I5 | `_logs/UTAC000.8_SEG-1_MEDICAO.md` (1.ª sessão) | continha **duas conclusões que a produção refuta** (§-1.3 e a «opção escolhida» de §-1.4). Corrigidas por marcação **REFUTADA**, com o texto original à vista (§-1.3, §-1.4). |
| I6 | ferramenta `patch` (A11, confirmada **fora** dos `.jsx`) | ao inserir texto no `CLAUDE.md`, a ferramenta **partiu uma linha alheia** que continha um `\r` literal (a lição de instrumento «`grep -c $'\r'` no MSYS…»): o `\r` virou fim-de-linha e a linha passou a duas. **Detectado pelo `git diff`** (2 hunks em vez de 1) e **reparado ao byte** (Python, comparação com `git show HEAD:CLAUDE.md`) → `git diff --stat CLAUDE.md` = `2 insertions(+)`, 0 remoções. Lição: **nunca usar `patch`/`write_file` cegamente num ficheiro com `\r` literal; verificar sempre o `git diff` por hunks inesperados.** |
