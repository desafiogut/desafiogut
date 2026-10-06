# UTAC107e.2 — SEG-1 + SEG0: medição (nada alterado)

**Tipo:** produto (backend + frontend) · **Skill:** `utac` · **Data:** 2026-10-06 · **Modelo:** claude-opus-5-5 (Claude Code, sessão nova).

## Baseline
| Item | Medido | Fonte |
|---|---|---|
| `HEAD` / `origin/main` | `5c1886a` (iguais, 0 commits por empurrar) — **= enunciado** | `git rev-parse` |
| Sujeira tracked | 0 (só `??` históricos de `_logs/MC10x_*`, não deste UTAC) | `git status --short` |
| Suíte | **frontend VERDE 801/801 · backend VERDE 1061/1067** — **= enunciado** | `node scripts/mc966-suite-harness.mjs ambos` |
| Deploy vivo | `https://silly-stardust-ca71bc.netlify.app/` → **200** | curl |
| Anti-bot MC28.1 | `GET lances-flash?acao=verificar&valor=100` → **403 `verificacao_indisponivel`** | curl (produção) |
| `GET lances-flash?edicaoId=R-1` | 200 `{"ocultoAteConsolidar":true,"lances":[]}` | curl (produção) |
| `ler-palpites` | 200 = **fallback da SPA** (a função não existe) — não prova nada (lição «HTTP 200 não prova função viva») | curl |
| Disco | 12 GB livres (≥ 5 GB) | `df -h /c` |

## SEG0 — medição do backend
1. **Endpoint de lances = `lances-flash.mjs`** (público, sem auth). Lê o blob legado `lances-relampago` (`:10,:73-76`).
   - mainnet: `valor:null, oculto:true, repetido:null` **sempre** — não há ramo de revelação (`:82-97`).
   - Sepolia/local: valores em claro + `repetido` em tempo real (`:100-115`).
   - **Em mainnet os lances NÃO estão nesse blob**: `lance-relampago.mjs:245-261` grava-os no Key-Per-Bid (`bids`, chave
     `bid:{edicao}:{endereco}:{rand}`) via `addLance` (`_lib/data-store.mjs`). ⇒ a revelação tem de ler o **Key-Per-Bid**
     (`getLances`/`listarBids`), não o blob.
   - «encerrado» no backend: só existe o marcador `bid:{edicao}:consolidado` (`bids-store.mjs:95-105`), escrito por
     `consolidarEdicao` **depois do recibo on-chain** (`consolidacao.mjs:305`). Edição **sem lance único** → 422 `sem_vencedor`, **nunca** marcada.
2. **Anti-bot MC28.1** = `lances-flash.mjs:37-42` (`acao=verificar` → 403 em mainnet). Não é tocado por nenhuma frente.
3. **Palpites:** `registar-palpite.mjs` (POST, titular) e `apurar-palpite.mjs` (POST, admin). **Não existe leitura dos palpites de
   uma edição**; `_lib/passe-pontos.mjs` tem `lerPalpite(endereco, edicao)`, `lerPalpites(endereco)`, `edicaoApurada(edicao)` (`:179-213`).
   Tabela `public.palpites` (endereco FK → `public.pontos`, edicao_id, valor, criado_em, apurado, resultado).
4. **Liderança:** o backend **não** guarda quem foi líder. Mas cada lance do Key-Per-Bid tem `processadoEm` (ISO, `lance-relampago.mjs:240`)
   ⇒ a história de liderança é **reconstruível no fecho** reproduzindo os lances por ordem cronológica — sem guardar nada durante a edição.
   ⚠️ `public.pontos` só tem linha para quem comprou Passe (FK do `palpites`, UTAC106d-v2) — **quem dá lances com senha/saldo pode não
   ter linha em `pontos`** ⇒ `pontos.lider_em` não serviria para todos os licitantes.
5. **Frontend:** `TabelaLances.jsx` **já** mostra 🔒 durante e o valor após `encerrado` (`:218-229`, `:283-293`) — falta só o backend
   devolver os valores. `useResultadoOficial` (on-chain) dá `{vencedor, menorUnicoCentavos}`. `EM_BREVE_MODE` desmonta os componentes de
   leilão do MLC (`MercadoLances.jsx:281`).

## ⚠️ Conflitos (R20/AU3 — não resolvidos pelo executor)
1. **Quando é «encerrado» para revelar os lances?** (a) marcador de consolidação (= contrato actual `ocultoAteConsolidar`; edição sem
   vencedor nunca revela) ou (b) fim da janela da edição (revela já, antes da tx on-chain).
2. **Frente D — mecanismo:** o enunciado sugere gravar `lider_em` em `public.pontos` a cada lance. Medido: (i) exige ler TODOS os lances
   a cada lance, no caminho que move dinheiro (`lance-relampago`); (ii) `pontos` não tem linha para todos os licitantes. Alternativa medida:
   **reconstruir no fecho** pela ordem `processadoEm` (sem migração, sem tocar no lance, zero exposição durante a edição).
3. **Etiqueta «só o próprio vê»:** precisa de um pedido autenticado que devolva o estado do titular (o `lances-flash` é público).
4. **OP (cartão do palpite):** o palpite não é um lance — «menor e único» não se aplica; o cartão já tem os estados pós-fecho do palpite
   (🎯 mais próximo / não foi dessa vez).
5. **Declarado (sem pergunta):** o enunciado pede «—» durante a edição; o código (107d) mostra 🔒 — mantém-se 🔒 (mockup > enunciado).

**Veredito SEG-1: AJUSTAR** — perguntas ao operador antes do SEG1.

### Respostas do operador (R18, 2026-10-06 — 3 lugares: aqui, R14, relatório)
- **R18-A (revelar):** **após consolidar** — o marcador `bid:{id}:consolidado` é o «encerrado» do backend (contrato `ocultoAteConsolidar`).
- **R18-B (Frente D):** **reconstruir no fecho** a partir do Key-Per-Bid por ordem de `processadoEm` — sem migração, sem tocar no `lance-relampago`.
- **R18-C (etiqueta):** **acção autenticada** `GET lances-flash?acao=meu-estado&edicaoId=` (Bearer user-session; endereço só do token; só depois do fecho).
- **R18-D (OP):** **etiqueta não vai para a OP** — a OP mantém os estados do palpite e liga a tabela ao `ler-palpites`.

**Veredito: AJUSTAR → respondido → SEGUIR.**
