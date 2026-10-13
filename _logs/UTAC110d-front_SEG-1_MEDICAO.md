# UTAC110d-front — SEG-1 MEDIÇÃO (Opus 5.5, 2026-10-13)

Skill: `desafio-gut/frontend/skills/utac/` (tipo `produto`). **Nada foi alterado neste segmento.**

## -1.1 Estado do repo
- `git rev-parse HEAD` → **183e703** (enunciado: «b677e92 ou mais recente após o 110d») — desvio esperado: +2 commits do 110d (`cfe9faa`, `183e703`).
- `git log origin/main..HEAD` → **cfe9faa, 183e703 NÃO estão em origin/main** (o backend do 110d ainda não foi publicado).
- `git status --porcelain` → `M desafio-gut/frontend/package-lock.json` (pré-existente, não é deste UTAC) + `_logs/MC100..MC102_*` não versionados (pré-existentes).

## -1.5 Recursos (A14)
- RAM livre (`Win32_OperatingSystem.FreePhysicalMemory`, 3×): **553 · 544 · 547 MB** — **todas < 1 500 MB ⇒ PARAR**.
- Total visível: 5 877 MB. Maiores consumidores: 3 processos `claude` (382/268/142 MB — sessões; não tocados), MsMpEng 305, ~8 `node` (MCPs) ~90–115 cada.
- Disco C: 20 GB livres (> 5 GB).
- **Suíte baseline: NÃO corrida** (A14).

## -1.3 Inventário (só leitura)
| Peça | Ficheiro:linha | Estado medido |
|---|---|---|
| Hook de compra | `src/hooks/useComprarPasse.js:52` | chama **`comprar-passe-pontos`** (1 ponto); sem `tipo` |
| Modal de compra | `src/components/ComprarPasseModal.jsx:26,42-44` | `PONTOS_POR_PASSE = 1`; texto «1 Passe … 1 ponto» |
| Carteira | `src/pages/MinhaCarteira.jsx:92,239-256` | 1 botão «Comprar Passe Desafio R$ 2,00» → modal acima; não mostra créditos de lance |
| Pontos | `src/hooks/usePontos.js:37-46` | lê `ler-pontos` mas só os campos antigos (`pontos`, `pontosCartao`…); **ignora `fidelidade`/`lance`** |
| Botão do lance | `src/components/CardLance.jsx:358,439,551` | «Dar lance»; desactiva só por `ocupado/!isConnected/encerrado`; chama `lance-relampago` (`:207`) |
| MLC | `src/pages/MercadoLances.jsx:300` | com EM BREVE os componentes de leilão (CardLance) ficam **DESMONTADOS** |
| OP — botão | `src/components/CartaoEdicao.jsx:24` | **já diz «Dar palpite»** (ficheiro PROIBIDO; nada a fazer) |
| OP — pontos | `src/pages/OfertasProgramadas.jsx:8-9,74` | **já mostra «X / 50» + barra**, com `pontosCartao` (R1 do 106f) |
| i18n | `src/i18n/pt.js` | 0 chaves de Passe/crédito (textos vivem inline nos componentes) |
| EM BREVE | `src/lib/leilaoLock.js:10` | `EM_BREVE_MODE = true` (intocado) |

Backend (110d, lido, não alterado):
- `comprar-passe-relampago.mjs` / `-programado.mjs` → `comprarPasseTipado(req, tipo)`; body `{ idempotencyKey }` (o tipo vem do endpoint, **não** do body). Erros: 401, 400, 402 `saldo_insuficiente`, 502 `creditar_*_falhou`, 503.
- `ler-pontos.mjs:60-72` → campos antigos **+** `fidelidade:{total,historico}` e `lance:{creditos,pontos,historico}` (aditivo).
- `lance-relampago.mjs:244` → 400 `sem_creditos_lance` com `{ creditosLance }`.
- `comprar-passe-pontos.mjs` continua presente (não será tocado).

## -1.4 Produção (só SELECT)
- `information_schema.columns` de `public.pontos` → **endereco, pontos, historico, atualizado_em** — **a migração 20261013 NÃO está aplicada** (faltam `creditos_lance`, `pontos_lance`, `historico_lance`).

## ⚠️ Conflitos entre o enunciado e o medido (R20 — não resolvidos pelo executor)
1. **A14: RAM 553/544/547 MB < 1 500** ⇒ PARAR. Libertar RAM (fechar janelas) ou autorizar «feche o que for necessário» (precedente 110d: MCPs sem janela + Claude Desktop na bandeja).
2. **Push bloqueado pela ressalva da migração.** A 20261013 **não** está em produção, e `origin/main..HEAD` já contém o backend do 110d ⇒ o push deste UTAC publicaria **também** o backend ⇒ o `lance-relampago` responde 502 a todo o lance relâmpago. Opções: (a) o operador aplica a migração antes do push; (b) commit sem push até lá.
3. **Frente C mora no `CardLance.jsx`**, não no `MercadoLances.jsx`. O `CardLance` também é usado por Dashboard, MinhaCarteira, CartaoEdicao e CardEdicaoEspecial. Não está na lista proibida, mas é partilhado: autoriza alterar o `CardLance` (com o gate de créditos a valer em todo o lado onde ele aparece)?
4. **Com EM BREVE ligado, o MLC não monta o CardLance** (`MercadoLances.jsx:300`) ⇒ o screenshot da Frente C no browser é impossível sem tocar no EM_BREVE_MODE (proibido). Proposta: a Frente C prova-se só por testes; os screenshots cobrem Carteira + modal.
5. **«X / 50» de qual número?** O enunciado diz «pontos de fidelidade» (`fidelidade.total` = TOTAL, inclui bónus de palpite). A R1 do 106f manda o cartão contar **só compras** (`pontosCartao`). Proposta: a barra usa `pontosCartao` (como a OP já faz).
6. **Frente D já está feita** (botão «Dar palpite» no CartaoEdicao proibido; «X / 50» + barra na OP). Proposta: só testes de verificação, zero código.
7. **Modal:** adaptar o `ComprarPasseModal` existente (R18-A «adaptar, nunca criar») para escolher entre os dois Passes, em vez de criar um novo. O modal antigo de 1 ponto deixa de ser alcançável pela UI (o endpoint fica vivo).

## -1.7 Veredito
**PARAR** — A14 (conflito 1). Os conflitos 2–7 esperam decisão do operador antes do SEG0.

## -1.8 Re-medição (A14) — 2.ª tentativa (operador: «tente novamente, feche o necessario»)
- Antes: RAM livre **487 MB**. Fechados SÓ processos sem janela: 7 servidores MCP desta sessão sem uso
  (binance, mockit, tapsite, claude-eyes, sportscore, validkit, jetbrains-proxy) + o Claude Desktop na bandeja
  (PID 10792 e filhos, sem janela). Intactos: esta sessão, o chrome-devtools MCP, WhatsApp, Defender.
- Depois: **1 606 · 1 606 · 1 611 MB** ✅ (A14 cumprida).
- Suíte baseline (harness `mc966`, foreground): **frontend VERDE 979/979 · backend VERDE 1128/1134** = declarado.
- Conflito 1 FECHADO. Conflitos 2–7: o operador NÃO respondeu às perguntas e mandou seguir ⇒ aplicadas as
  propostas do executor, DECLARADAS (R20 — não são decisões do operador):
  2 → commit SEM push enquanto a migração 20261013 não estiver em produção (re-verificado no fecho);
  3 → o `CardLance.jsx` é alterado (o bloqueio por créditos vale onde o Relâmpago aparecer);
  4 → Frente C provada por testes do CardLance REAL + screenshot do CardLance num harness (não do /mercado);
  5 → «X / 50» = `pontosCartao` (só compras, R1 do UTAC106f);
  6 → Frente D sem código, só verificação;
  7 → o `ComprarPasseModal` existente é ADAPTADO (escolha entre os dois Passes).
