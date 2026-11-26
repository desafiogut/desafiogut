# UTAC150.2 — Retomada e fecho do UTAC150 — RELATÓRIO (2026-11-26, Opus 5.5)

Tipo `publicacao` (só verificação e fecho). Sem código de negócio, sem AAB novo, sem deploy. Spec: `_logs/UTAC150.2.spec.yml`.

## Frente A — Estado ✅
- `main` em `8a73c24`. `git log origin/main..HEAD` está **vazio**, logo os 6 commits do UTAC150/150.1 (`715b0c5` … `8a73c24`) já estão em origin.
- A árvore tem ficheiros soltos, mas **nenhum é do UTAC150**:
  - 6 modificados alheios: `.agents/skills/aidesigner-frontend/*` (3), `.gitignore`, `.mcp.json`, `desafio-gut/frontend/package-lock.json`;
  - cerca de 238 não rastreados antigos (`_logs/MC100..`, `UTAC106x..UTAC135`, `closed-testing/`).
  
  Por regra não foram tocados (nem stage, nem stash).
- AAB `Desktop/DesafioGUT-v15/DesafioGUT-v15.aab`, medido agora:
  - 32 437 248 B;
  - SHA-256 `091c2394e9b4cd8bfc8dc45256f0313d1df1322917d38b73ad7dcb86817ec581`;
  - MD5 `df5a5b8057ed5addd9a7d826561132d3`.
  
  Os três valores são iguais aos do UTAC150.1, logo o ficheiro está **intacto**.
- O link do GoFile `jo4UbOJe` **não foi reverificado** nesta sessão: a chamada à API do GoFile foi recusada pelo modo automático. A integridade foi confirmada no upload (UTAC150.1: o MD5 do GoFile é igual ao local).

## Frente B — Gate 3.7 em produção ⚠️ (sonda pronta; falta a sessão do operador)
- **Não automatizável sem conta.** O `/consentimento` exige um JWT `user-session` assinado com o segredo de produção. A ordem é: corpo → endereço → **sessão** → titular → **versão**. Forjar o token exigiria o segredo, e os segredos são do operador.
- **Leitura de produção** (Blob `consent-log`, 58 chaves; li **só** `termoVersao`/`aceiteEm`/`contexto`, sem endereço, IP nem UA):
  - **0 aceites desde o deploy `6b08206e` (12:05Z)**. O último registo é de 23/11. Ninguém aceitou ainda o gate 3.7.
  - **Controlo positivo do mecanismo:** depois do salto para o 3.6 (UTAC148, 21/11), produção gravou um aceite `3.6` a 23/11, pelo mesmo caminho de código. O 3.7 só muda a constante `VERSAO_GATE` (teste `mc104` verde no UTAC150.1). É analogia, não prova.
- **Sonda** `_logs/UTAC150.2_sonda-gate-3.7.mjs` (usa a sessão do próprio operador; nunca imprime o token):
  1. controlo `versao "3.3"` → espera **400 `versao_invalida`**. Prova que a sessão passou e que a versão é verificada; um 401 significa token inválido.
  2. `versao "3.7"` → espera **201/200**.
  3. `GET ?endereco=` → espera um registo `termoVersao "3.7"` com o `aceiteDeclaradoEm` do passo 2.
- **Provas da sonda:**
  - sem token → exit 2;
  - JWT falso contra produção → **401 `token_invalido`**, exit 1, nada gravado (`_logs/UTAC150.2_SONDA-CONTROLO-NEGATIVO.txt`);
  - caminho feliz contra um servidor falso local → os 3 passos ✓, exit 0;
  - corrigido: `process.exit()` com um `fetch` aberto rebentava o Node no Windows (assert do libuv, exit 127). Passou a `process.exitCode`.

### Passos para o operador (escolher um)
**A — sonda (2 min, prova completa):**
1. Entrar em https://silly-stardust-ca71bc.netlify.app com a conta Google.
2. F12 → Consola → `copy(JSON.parse(sessionStorage.getItem("gut_auth_user")).token)`
3. No Git Bash, em `Desktop/DESAFIOGUT`: `GUT_SESSION='<colar>' node _logs/UTAC150.2_sonda-gate-3.7.mjs`
4. Sucesso = última linha `GATE 3.7 VALIDADO EM PRODUÇÃO`. ⚠️ Grava um aceite 3.7 real na tua conta (o mesmo que aceitar o gate no site).

**B — manual (sem terminal):**
1. Entrar no site com uma conta que ainda não aceitou o 3.7. Deve aparecer o gate «Regulamento Oficial v8.0».
2. Marcar as 4 caixas e aceitar.
3. Confirmar que o gate **não volta** ao recarregar a página nem ao sair e entrar de novo. O cliente reenvia o aceite em cada login enquanto o servidor recusa; se o gate volta, há falha.
4. Pedir ao executor a leitura só de versões do `consent-log`: tem de haver um registo `3.7` com a hora do aceite.

## Frente C — Fecho ✅
- Mensagem para o Ruan: `Desktop/DesafioGUT-v15/MENSAGEM-RUAN-AAB-v15.txt` (link, tamanho, versionCode 15 / 1.5.0, SHA-256, MD5, passos na Play Console → Teste fechado).
- DEBT-114 e DEBT-115 já estavam registadas pelo UTAC150.1. Estado actualizado em `_logs/DEBT.md`; a DEBT-115(e) aponta para esta sonda.

## Pendências
- **DEBT-115(e):** validar o aceite 3.7 com a sonda (passo A) ou à mão (passo B). Só o operador pode, porque precisa de uma sessão Google.
- **DEBT-114** (jurídico) e **DEBT-115 (a)–(d), (f)**: sem mudança.
- **DEBT-111(b)** e **DEBT-112**: sem mudança.

## Desvios declarados
- **A14:** sem build, RAM não exigida. A pedido do operador a meio do UTAC, foram fechados os servidores MCP desta sessão que não estavam em uso, mais o Chrome, o WhatsApp e o Power BI. O slide «powerbi_aula02» e o Bloco de notas (com texto por gravar) ficaram abertos. RAM livre: 482 → 1926 MB.
- **HI5 (30 min):** cerca de 30 a 35 min, incluindo a libertação de RAM.
