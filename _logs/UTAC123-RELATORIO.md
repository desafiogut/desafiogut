# UTAC123 — RELATÓRIO FINAL · Build blindado + AAB v7 de produção

Tipo `publicacao` · baseline `7f8200e` · Opus 5.5 · 2026-11-01. Validador adversarial: **APROVADO COM RESSALVAS**
(2 ⚠️ confirmadas — 1 corrigida no código, 1 corrigida no plano; ver `UTAC123_SEG4_VALIDADOR.md`).

## Entrega
- [x] **Chave Alchemy fora do código** — `src/utils/web3.js`: RPC só do env; `getProvider()` lança erro claro;
  `subscribe*` degradam em vez de derrubar a app (achado do validador).
- [x] **Trava no Gradle** — tarefa `validarAmbienteProducao` ligada a `preReleaseBuild` (bundleRelease e
  assembleRelease); o guarda recusa chainId ≠ 1, contrato ausente/abandonado, RPC ausente, Supabase ausente e
  chave de RPC Sepolia embutida. Correu nas 3 compilações (`> Task :app:validarAmbienteProducao`).
- [x] **versionCode 7** (lido do manifesto do AAB).
- [x] **AAB v7** — `C:\Users\Moltbot\Desktop\DesafioGUT-v7\DesafioGUT-v7.aab` · 32 441 504 B ·
  SHA-256 `3744e6bb76bfeeb6133a95769f26d8e5db374bc5642ca86713eb8efda3a23366` · `jar verified` · certificado igual ao v6.
- [x] **Prova por extracção** — sobre o `.aab`: guarda exit 0 · `VITE_CHAIN_ID:1` · contrato `0x0052477A…16cd` ·
  Supabase `vjslwowwrpcawijdiksm` · Sentry presente · 0 chaves Sepolia. ⇒ a pílula «Ambiente de teste» não tem
  condição para aparecer (`AvisoRede.jsx:28-31` todos satisfeitos).
- [ ] **Link de download** — **não gerado**: o envio para o litterbox foi bloqueado pelo classificador de
  permissões do Claude Code («Data Exfiltration»). Para o gerar, o operador corre no prompt:
  `! curl -F "reqtype=fileupload" -F "time=72h" -F "fileToUpload=@C:/Users/Moltbot/Desktop/DesafioGUT-v7/DesafioGUT-v7.aab" https://litterbox.catbox.moe/resources/internals/api.php`

## R18 (pedidos do operador durante o UTAC)
1. Título «Carteira» maior (1.15/1.25 rem).
2. Ícone preenchido, sem fundo branco — o AAB v6 não tinha ícone adaptativo; criado `mipmap-anydpi-v26`, fundo `#0C1A3D`.
3. Ícone = **GUTO de mão aberta** (`Desktop/logo-do-app-512x512.png`), não o do martelo — 15 PNG regenerados.
4. **Exceção ao «não mexer no env do Netlify»**: apagada a var morta `VITE_RPC_URL_SEPOLIA` (contexto production),
   que reintroduzia a chave no bundle porque `network.js` embute `import.meta.env` inteiro.
5. Gradle autorizado com ~1 340 MB livres (gate A14 = 1 500; trims até 1 590 com o Chrome fechado).

## Provas
Testes novos `src/__tests__/utac123-build-blindado.test.mjs` (**26**) · mutação `scripts/utac123-prova-mutacao.mjs`
**12/12** · suíte **frontend 1296/1296 · backend 1442/1448 · VERDE** · paridade `recursos_app` Supabase × Blob = 0
divergências (o v7 passa a ler do Supabase).

## Desvios declarados
- `scripts/validar-dist-rede.mjs` editado (fora da lista) — necessário para «faltar Supabase aborta».
- Erros do meu instrumento: extracção parcial do AAB (2 `.js`) e dois escapes de regex — detectados e refeitos.
- `package-lock.json` reescrito pelo `netlify build` — **não commitado**.

## ⚠️ Pendências do operador
1. **NÃO rodar a chave Alchemy às cegas** — é a mesma do RPC de mainnet de produção (correcção ao UTAC122): primeiro
   allowlist de origens/app no painel da Alchemy; rotação só coordenada (Netlify + deploy web + AAB v8). DEBT-082.
2. Subir o v7 no teste fechado e confirmar no aparelho: sem pílula vermelha, ícone de mão aberta cheio, passes/Billing OK.
3. Ícone de 512 px da ficha da Play: trocar no Play Console (não vive no AAB).
4. Bundle web de produção ainda tem a var apagada até ao próximo `netlify deploy --prod --build`.
5. H2 (skill `types/publicacao.md` mandar `build:apk`) — fora da autorização.

Logs: `UTAC123.spec.yml` · `UTAC123_SEG-1_SEG0_SEG1.md` · `UTAC123_SEG2_SEG3.md` · `UTAC123_SEG4_VALIDADOR.md` · este.
