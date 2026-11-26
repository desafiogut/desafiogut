# UTAC150.1 — SEG-1 + frentes (2026-11-26, Opus 5.5)

## SEG-1
- HEAD `ed76f5a`, com 3 commits locais à frente de origin/main (`715b0c5`, `8caf6dd`, `ed76f5a`) e nada no remoto à frente.
- AAB `Desktop/DesafioGUT-v15/DesafioGUT-v15.aab`, sha256 `ebea578c…8d79`, igual ao do UTAC150.
- RAM 1229 MB. Fechei o Edge e parei o daemon do Gradle e fiquei com 1438 MB. **R18-150.1-A:** o operador mandou seguir com 1438 MB (excepção à A14). Pediu depois «libere a RAM necessária»: o resto são processos `claude` (incluindo esta sessão) e não foram tocados. No pós-deploy medi 1932 MB.

## Frente A — push + deploy
- Push `f8e0d71..ed76f5a` (os commits têm `[skip netlify]`, logo não houve auto-build).
- `netlify deploy --prod --build` → **`6b08206e`**, bundle `index-B6ES8OJD.js` (= `dist` local), «CDN requesting 41 files and 3 functions».
- Bundle do site: gate `3.7`, «VERSÃO 8.0», mainnet presente, Sepolia ausente, «Depositar PIX» presente (é o site; o APK não o tem).
- **GUTO em produção** (`_logs/UTAC150.1_GUTO-PRODUCAO.txt`, visitante):
  - responde «versão 8.0», «vigência no Art. 28» e aplica o Art. 19 do v8.0 (quem perde o palpite perde o Passe);
  - ℹ️ a pergunta «o vencedor do palpite recebe pontos?» caiu na intenção «simulação de vencedor», um encaminhamento anterior a este UTAC.
- **Gate 3.7 em produção: sonda SEM poder discriminante** (`_logs/UTAC150.1_GATE-PRODUCAO.txt`). O `/consentimento` responde 401 `token_ausente` a 3.3, 3.4, 3.5, 3.6, 3.7 e 3.8, porque a versão só é verificada depois da sessão; o controlo positivo (3.3/3.8 recusadas) falhou. O aceite 3.7 fica provado pelo deploy do commit `715b0c5+` e pelo `mc104` (3.7 vigente, legado 3.4/3.5/3.6, 3.3 recusada), **não** por medição em produção. Prova real só com uma conta logada.

## Frente B — validador (SEG4)
APROVADO COM RESSALVAS. Commits `eba97c1` (as 3 correcções + teste `utac150-val-citacoes`) e `a7d50cd` (relatório), integrados por cherry-pick (conteúdo idêntico ao `7b70de2` do validador). Suíte em main **1374/1426 · 1535/1624 VERDE**.
- AAB regerado: vc15, sha256 `091c2394…c581`. Antes do build: **1106 MB de RAM sem nova medição** (desvio à A14, declarado).
- Deploy `6b082d0e`, com o chunk de produção a citar o Art. 21.

## Frente C
GoFile `https://gofile.io/d/jo4UbOJe`; o md5 devolvido `df5a5b80…` é igual ao local.
