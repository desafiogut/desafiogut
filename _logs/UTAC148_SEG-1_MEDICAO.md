# UTAC148 — SEG-1 MEDIÇÃO (2026-11-21, Opus 5.5)

- HEAD `41de5d6` (= baseline). 9 commits por publicar (UTAC146 ×2 + UTAC147 ×7). Ficheiros alheios modificados: `.agents/skills/*`, `.gitignore`, `.mcp.json`, `package-lock.json` (não se tocam).
- Disco 8,3 GB livres (≥ 5). **RAM livre 666 MB** (< 1500): libertar antes da suíte/build.
- Gerador do PDF/QR: `_logs/UTAC138_gerar-pdf-qr.mjs` + `_logs/UTAC138_verificar.py` (v6.1).
- `android/app/build.gradle`: **versionCode 13 / versionName "1.2.1"** — o vc13 já foi usado pelo AAB v12.1 (UTAC146, entregue por GoFile `UuvbtvOS`).
- Gate: `_lib/consentimento.mjs` `VERSAO_GATE = "3.5"`, `VERSOES_GATE_LEGADO = ["3.4"]` (DEBT-092).
- Palpite: `apurar-palpite.mjs` credita ao vencedor **+2 pontos de fidelidade** (`PONTOS_POR_PALPITE_CERTO = 2`, `_lib/passe-pontos.mjs:168`). **Não existe crédito de 50 ECOQUILDO** ao vencedor do palpite (grep `palpite` em `_lib/eco-quildo.mjs` = 0).
- Regulamento v6.1: 29 artigos; o enunciado mexe nos Arts. 3, 5, 6, 7, 12, 15 e 18. O Art. 10 (30 dias de aviso) e o Art. 25 («exclusivamente Google Billing», o site usa PIX) não são citados.

## ⚠️ Conflitos (AU3)
1. **Art. 18 v7 — «o vencedor do palpite recebe 50 ECOQUILDO»**: o backend dá +2 pontos de fidelidade, não 50 ECOQUILDO. Escrever o v7 assim promete o que o código não faz; implementar exige backend (fora da autorização) e lastro de R$ 25 por vencedor.
2. **versionCode 13** já pertence ao AAB v12.1. Se o v12.1 foi carregado na Play, um AAB com 13 é recusado. Proposta: 14 / "1.3.0".
3. **Gate 3.6 e o APK v12.1** (que envia 3.5): sem legado, quem tem o v12.1 fica bloqueado no aceite até actualizar. Proposta: `VERSOES_GATE_LEGADO = ["3.4", "3.5"]` até o v13 estar aprovado.

## Veredito: AJUSTAR (perguntar antes do SEG0)
