# UTAC139 — SEG5/SEG6 · FECHO

Data: 2026-11-18, 02:45–07:00 BRT · Executor: Hermes · HEAD de partida: `fd770db`

## 1. Decisão do operador (fecho da única pendência do SEG-1)
**R18-139-A — opção A: NÃO mexer no CSS global.** O cartão da edição especial mantém o padrão das outras
edições; aceita-se o corte da arte no desktop (1:1 mostrada em 16:9 `object-fit: cover`, 43,8 % cortada).
Consequência declarada: no desktop continua a não se ler, na arte, «EDIÇÃO ESPECIAL 1», o troféu e o
logótipo; no telemóvel a arte é mostrada inteira (1:1). Nada foi alterado em `CartaoEdicao.jsx` nem em
`globals.css` — como a decisão manda.

## 2. O que este UTAC produziu
- **SEG-1** (`_logs/UTAC139_SEG-1_MEDICAO.md`): a letra do enunciado já estava cumprida (UTAC138, `cb2748f`
  e `e9fff51`); medido no código e no DOM de produção.
- **SEG4** (`_logs/UTAC139_SEG4_VALIDADOR.md`): validador adversarial independente, instruído a refutar →
  **APROVADO COM RESSALVAS · 0 bloqueantes**; achou o corte de 43,8 % da arte e os órfãos.
- **AAB v12**: `versionCode 12` / `versionName "1.2.0"`, construído de `fd770db` + o bump.
  `Desktop/DesafioGUT-v12/DesafioGUT-v12.aab` — 32 431 880 B,
  sha256 `5af715dc8e248243c58f3f0c704b8b403c4b364191b22b7228635478e716d7e4`,
  md5 `d53ba2edfaff993c7c0e075f7bf2e187`, assinado com o certificado CN=DesafioGUT (SHA256withRSA/RSA 2048).
  Versão confirmada no **manifesto empacotado no AAB** (`bundle_manifest`, não só no `build.gradle`).
- **Fecho das dívidas dependentes do v12**: DEBT-092 e DEBT-095 actualizadas — o artefacto existe; falta a
  publicação no Play Console (acção do operador).

## 3. Testes (medidos depois das três alterações, duas vezes)
- Harness canónico `node scripts/mc966-suite-harness.mjs ambos`:
  `frontend: VERDE 1346/1346 pass` · `backend: VERDE 1499/1505 pass` · `VEREDITO: VERDE`.
- Focado: `utac123-build-blindado` + `utac132-apk-sem-pix-build` → 45/45 pass.
- Ad-hoc (script temporário, apagado): `gradle 12 / 1.2.0 · utac123 12 · utac132 12`.
- Nota de instrumento: o primeiro verificador ad-hoc estava **cego** — lia o 1.º `versionCode` do ficheiro,
  que num comentário do `utac123` é `7`. Corrigido para ler a **asserção** (`versionCode N\s*$`). Se tivesse
  ficado assim, ou «reprovava» código correcto, ou passaria a aceitar qualquer número.

## 4. Edição especial — o seed NÃO era preciso
`node scripts/utac138-seed-edicao-especial.mjs` (sem `--force`) → «edicoes-metadata:ESPECIAL-RELAMPAGO1 já
existe — nada gravado». A API de produção devolve a edição em `agendadas`, 30/11/2026 19:00–20:00 BRT,
arte no Storage. **Não corri com `--force`**: o valor gravado tem `status:"aberto"` no Blob e a API
normaliza para `"agendado"` pela data; reescrever só mudaria o `criadoEm`. Se o operador quiser o `--force`
mesmo assim, é um comando e um relatório.

## 5. Canal de entrega do ficheiro
- **Litterbox: bloqueado nesta rede** (4 tentativas em ~40 min): `500 Internal Server Error` no AAB,
  `No file!` com um ficheiro de 5 bytes, depois `403 Forbidden` (WAF/BunkerWeb). Não é o ficheiro nem a
  sintaxe do `curl` — o mesmo `-F` funciona noutros serviços.
- **Entregue por gofile**: `https://gofile.io/d/4eQWv6ZT` — o md5 publicado (`d53ba2ed…7bf2e187`) é igual
  ao local, logo o upload é íntegro. Sem expiração por tempo; apaga após 10 dias sem downloads.
- Fica a cópia local em `Desktop/DesafioGUT-v12/` (o caminho não expira).

## 6. Ficheiros alterados/novos
| ficheiro | natureza |
|---|---|
| `android/app/build.gradle` | versionCode 11→12, versionName "1.1.1"→"1.2.0" (2 linhas) |
| `src/__tests__/utac123-build-blindado.test.mjs` | asserção 11→12 + título (2 linhas) |
| `src/__tests__/utac132-apk-sem-pix-build.test.mjs` | asserção 11→12 + título (2 linhas) |
| `_logs/DEBT.md` | DEBT-092 e DEBT-095 com o estado do AAB v12 |
| `_logs/UTAC139_SEG-1_MEDICAO.md`, `_logs/UTAC139_SEG4_VALIDADOR.md`, este ficheiro | registo |

Fora do repo: `Desktop/RELATORIO-UTAC139-ESPECIAL.txt`, `Desktop/UTAC139-ESPECIAL-PADRAO/`,
`Desktop/DesafioGUT-v12/` (AAB + `ENTREGA-AAB-v12.txt`), `C:\Users\Moltbot\_validador-utac139\` (2 imagens).

## 7. Pendências que ficam declaradas
1. **Upload do AAB no Play Console** (operador) → só aí DEBT-092 fecha e a DEBT-095 desaparece para o utilizador.
2. **Ruan instalar**: se precisar de ficheiro instalável à mão (fora da Play), é preciso um APK
   (`gradlew assembleRelease`, mesma chave) — o `.aab` não se instala num telemóvel.
3. **Litterbox**: retentar quando o WAF deles desafogar; o link gofile serve até lá.
4. **Órfãos do SEG-1 §6** (`ContagemDecrescente.jsx`, `caixa`, `janelaEmBrasilia`, 5 chaves i18n): remoção
   num UTAC de limpeza próprio, porque obriga a mexer no teste de i18n e nas 3 traduções.
