# UTAC000.17 — SEG-1 — Medição

**Data:** 2026-10-02 · **Base:** `85837bf` = `origin/main` = HEAD · Evidência: `_logs/UTAC000.17_SEG-1_EVIDENCIA.txt`
Suíte (herdada do fecho do UTAC000.15, mesmo HEAD de código): frontend 670/670 · backend 967/973.

## 1. O prazo do relâmpago (Frente A)
- **Cliente:** `AppContext.jsx` l. 193-195 — `prazoFlash = lerPrazoStorage("gut_prazo_flash") ?? agora + 1800 s`. Puramente local (por browser), reaceita um prazo vencido há < 10 min (`leilaoTimer.js`). É a DEBT-016.
- **Servidor:** `GET /edicoes` devolve a `R-1` com `termino_em = agora + 24 h` **exactos** (`07:30:01.575Z` com `agora = 07:30:01.383Z`). Medido no código: `edicoes-core.mjs` l. 18-19/117/193 — **sem metadata persistido, a R-1 é SINTETIZADA** a cada pedido (compat D5). **Não é um prazo real: renova-se sempre.**
- **On-chain:** `prazo = 0` para a R-1 (medido pelo validador do UTAC000.14, `eth_call`).
- ⇒ **Hoje não existe prazo real da R-1 em lado nenhum.** Só existe quando alguém ABRE uma edição (metadata no Blob `edicoes-metadata` com `termino_em`, como as `RELAMP-1..3` e a `ESPECIAL-AIRFRYER`) — acto operacional, não código.

## 2. «O utilizador participou» (GATE 21) — não é observável hoje em mainnet
- `lances-flash` lê o Blob `lances-relampago`, que **não é escrito em mainnet** (UTAC000.8: os lances vão para o Key-Per-Bid) e devolve valores/unicidade blindados ⇒ em produção é `[]`.
- `ranking?recurso=feedback` lê `rankings_ciclo` — **só existe depois de consolidar/pontuar** (e a especial não pontua).
- Não há endpoint autenticado «as minhas participações por edição». O único rasto no cliente são os lances feitos **neste browser** (`handleLanceSucesso`), que não sobrevivem a outro aparelho.
- ⇒ O filtro por utilizador exige **API nova no backend** (HI9 «não altera API pública»; e o spec só autoriza `src/**`).

## 3. Onde o overlay aparece
- `FimEdicaoOverlay` está em **`src/components/FimEdicaoOverlay.jsx`** (o caminho do spec, `components/edicao-especial/`, não existe). Sem `onClose` (`<Modal open>` fixo) — confirmado.
- É montado pelo **`Dashboard.jsx`** (l. 524); o do Mercado (`OverlayVencedor`) pelo **`MercadoLances.jsx`** (l. 209) — **os dois ficheiros estão proibidos** neste UTAC. Um overlay agregado único tem de ser montado num sítio novo (layout/Provider) **e** retirado desses dois, ou ficam dois overlays.
- O spec diz ao mesmo tempo «NÃO altera o `FimEdicaoOverlay.jsx`» e «AUTORIZA alterar» — contradição.

## 4. Dimensão
Prazo real (fonte + abertura das edições) · API de participações · overlay agregado novo + montagem · `onClose` · «visto» persistente · testes com o arnês ⇒ **várias frentes de backend + frontend + decisão operacional**; não cabe em 2 h (HI5) nem no escopo autorizado (GATE 2/HI4).

## 5. Veredito: **PARAR e ESCALAR** (GATE 10). Opções ao operador no relatório/pergunta.
