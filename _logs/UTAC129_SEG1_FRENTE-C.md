# UTAC129 — SEG1 · Frente C (links e textos do frontend)

| Ficheiro | Alteração |
|---|---|
| `src/lib/apiOrigin.js` | `ORIGEM_PRODUCAO` passa a ser **exportada** (era `const` local) |
| `src/components/PainelIndicacao.jsx` | link de convite `${ORIGEM_PRODUCAO}/?ref=…` (era `window.location.origin`, que no APK é `https://localhost`) |
| `src/components/ChatbotWidget.jsx` | idem (link de convite do GUTO) |
| `src/pages/MercadoLances.jsx` | `PWA_URL = ORIGEM_PRODUCAO` e o texto mostrado passa a ser o host real (era `desafiogut.com`, morto) |
| `src/hooks/useComprarPasse.js` | `PWA_PASSE = ORIGEM_PRODUCAO` (mensagem do PIX bloqueado no APK) |
| `src/components/CardLance.jsx` | saíram a trava de inventário (`semPasseRelampago`), a caixa «Precisa de 1 Passe Relâmpago», o botão «Comprar Passe Relâmpago» que substituía o lance, o balão de compra e as mensagens `sem_passes_disponiveis`/`inventario_indisponivel` (+4 −49). O botão de lance continua governado pelos **pontos** (fail-closed do UTAC110j.5) |
| `src/pages/Dashboard.jsx` | **NÃO tocado** (R18-129-3): a mensagem que tem é a do PALPITE, que continua a exigir Passe |
| `src/__tests__/utac110i1-front-billing.test.mjs` | 2 asserções fixavam o domínio morto (`/desafiogut\.com/`); passam ao host de produção. A intenção («a mensagem remete para o site») mantém-se. ⚠️ ficheiro fora da lista nomeada, declarado (teste que codificava o defeito) |

| Prova | Resultado |
|---|---|
| Teste novo `src/__tests__/utac129-front.test.mjs` | **5/5** |
| Controlo positivo (o mesmo teste contra os ficheiros do HEAD) | **4 RED** (C1-C4); C5 passa nos dois, de propósito (é a guarda do palpite) |
| 1.ª suíte completa | frontend **2 RED** (as 2 asserções do domínio morto acima) → corrigidas |
| Suíte final (`npm test`, harness) | **frontend 1301/1301 · backend 1454/1460 VERDE** (linha de base UTAC123: 1296/1296 · 1442/1448; +5 / +12 = os testes novos; os 6 não-pass do backend são os skips de sempre). Saída: `_logs/UTAC129_SEG1_SUITE.txt` |
| RAM antes da suíte | 1 646 MB (depois de fechar o headless do UTAC124, o Edge e o WhatsApp, com autorização do operador) |
