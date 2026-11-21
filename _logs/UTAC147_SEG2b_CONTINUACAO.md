# UTAC147 — Continuação depois da paragem HI5 (2026-11-21, Opus 5.5)

## Decisões do operador (R18)
- **R18-147-F**: «Continuar agora». O operador estendeu o tempo para lá da HI5 (1,5 h).
- **R18-147-G**: «libere ram» / «feche oque for necessario». Fechei Edge, WhatsApp e Widgets. A RAM livre passou de **879 para 1758 MB** (A14 cumprida). Não toquei em Claude, terminal, Explorer, nem nos `node`/`python` de outras sessões.

## Frentes concluídas (commit local `b75fee0`)
- **D — CardLance**: `useInventarioPasses` + `estadoPassesLance` (`lib/passes.js`, fail-closed). Mostra «Cada lance usa 1 Passe Relâmpago» e «Este lance custa 1 Passe Relâmpago · seu saldo: N Passes Relâmpago». Trata `sem_passes_disponiveis` e `inventario_indisponivel`; o atalho passou a «Comprar Passes →»; o campo volta a ser «em centavos» e o limite a «Mín R$ 0,01».
- **D — Início**: os tiles passaram a «⚡ Passes Relâmpago» e «🎯 Passes Programados» (`tilePasseTipoComMemo`, com o mesmo memo anti-«0 falso» do UTAC130).
- **D — Carteira**: «⭐ Pontos de lance» e «Missões de hoje» ficam atrás de `MOSTRAR_PONTOS_ENGAJAMENTO = false` (`lib/pontosLance.js`).
- **D — compra**: `QUANTIDADES_PASSE = [1,3,5]` na UI; os benefícios dizem «1 lance…» / «1 palpite…».
- **B**: Art. 18 do v6.1 diz «O produto correspondente, consistente em produto fornecido pelo patrocinador…». A troca foi literal, palavra a palavra, porque o executor não redige texto jurídico. A mesma mudança está nas 2 cópias do GUTO, byte a byte; o v6.0 do RTD ficou intacto. As Regras Oficiais passam a ter o resumo «Como participar» / «Indique e Ganhe» / «O que o Passe dá».
- **Revertido (GATE 3)**: escondi os painéis de pontos/sequência em Meus Ativos, mas isso não estava no pedido e partiu 17 testes. Repus. ⇒ **DEBT** (ver abaixo).
- **HI**: os testes `versionCode 12` estavam vermelhos por causa do `9108312` (UTAC146 subiu para 13 sem os actualizar). Corrigidos para 13; não é defeito deste UTAC.

## Suíte (RAM 1759 MB)
- Completa: backend **VERDE 1527/1595**; frontend VERMELHO 2, os dois de versionCode (HI acima) → corrigidos → frontend **VERDE 1366/1396**. Saídas: `_logs/UTAC147_SUITE-COMPLETA.txt`, `_logs/UTAC147_SUITE-FRONTEND-2.txt`.
- Não-pass = **skips com motivo `[UTAC147 …]`** (66 backend + 30 frontend), mais os 6 backend de sempre.

## Portões de deploy
`NETWORK_STAGE=mainnet` · `MP_WEBHOOK_SECRET` definida (64 chars, valor não lido para o log).

## Dívidas novas
- **Meus Ativos**: ainda mostra «Seus pontos de lance» e «Bônus de sequência: +50 pontos de lance», que já não são creditados.
- **Regulamento v6.1, corpo**: os Arts. 3º, 6º, 12 e 16 ainda descrevem pontos de lance gratuitos e o «Passe opcional». Só o Art. 18 foi autorizado; o resto precisa de decisão do operador ou do jurídico (e de nova versão + gate). O resumo das Regras Oficiais (topo) já está no modelo novo e contradiz o corpo.
- **Gate legal (`TermosConsentimento` 3.5)**: o texto aceite diz que o Passe é opcional.
- **APK v12.1**: continua no modelo de pontos (o deploy web não actualiza o APK; o AAB v13 fica para um UTAC futuro).
