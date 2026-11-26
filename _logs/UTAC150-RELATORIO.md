# UTAC150 — AAB versionCode 15 com o Regulamento v8.0 — RELATÓRIO (2026-11-26, Opus 5.5)

## AAB
`Desktop/DesafioGUT-v15/DesafioGUT-v15.aab` — **versionCode 15 / versionName 1.5.0** (manifesto empacotado), 32 437 236 B
- SHA-256 `ebea578ccc8e0488c38eda4c7213ce1f465a4e0975591624738180a39bc78d79`
- MD5 `32fd30ee001b6578c3635dca39c38904`
- `jar verified`; certificado igual ao do v13 (SHA-256 `85:44:BC…17:29`); `validarAmbienteProducao` correu no Gradle
- bundle web embutido `index-BAF9Bb-s.js`: contrato mainnet presente, Sepolia ausente, sem «Depositar PIX», gate «3.7», «VERSÃO 8.0», «+50 ECOQUILDO»

## Checklist
- [x] Regulamento v8.0 no código e no GUTO: `docs/REGULAMENTO-v8.0.md` (1282 palavras = PDF), 3 cópias byte a byte, Regras Oficiais.
- [x] Gate **3.7** (próxima sequencial, R18-150-B), com o backend a aceitar também 3.4/3.5/3.6.
- [~] Apuração do palpite: a resposta do operador define o palpite, mas não a fonte do número real. A apuração continua manual (DEBT-111(b)/DEBT-114(a)).
- [x] «+2 pontos» trocado por «50 ECOQUILDO» e os +2 pontos retirados do backend (R18-150-D).
- [x] Especial Palpite no Início e em Ofertas Programadas com o layout do UTAC149 (R18-150-C, verificado em produção no UTAC149).
- [x] AAB vc15 em `Desktop/DesafioGUT-v15/`.
- [x] Suíte VERDE: 1369/1421 · 1535/1624. Mutação 3/3.

## ⚠️ Antes de subir na Play (DEBT-113)
O backend em produção ainda é o do UTAC149, porque este UTAC proibia o deploy:
- aceita o gate 3.6, mas não o **3.7**;
- o GUTO responde pelo v7;
- a apuração ainda paga +2 pontos;
- as Regras Oficiais do site estão no v7.

**É preciso fazer o deploy do commit `715b0c5` antes de o vc15 chegar aos utilizadores.**

## Pendências
- DEBT-113: deploy.
- DEBT-114: o que o v8.0 promete e o código não faz. Inclui a referência do Art. 15 ao «Art. 17», que vai para o jurídico.
- Validador adversarial (SEG4) **não corrido**.
