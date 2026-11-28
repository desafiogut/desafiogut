# UTAC153: Desbloqueio de CORS para o iOS (DEBT-117) — RELATÓRIO FINAL

**Data:** 2026-11-28 · **Baseline:** `a80a4b0` · **Tipo:** produto · **Executor:** Opus 5.5

**Commits (locais, ⛔ SEM push e SEM deploy):**
| Hash | Conteúdo |
|---|---|
| `44a90b4` | feat: o CORS reflecte `capacitor://localhost` e `ionic://localhost` |
| `c471bde` | test: notas do validador (preflight como 1.ª instrução, 429 do iOS, comentário) |
| docs | logs, SEG4, DEBT-117/121 (hash: `git log -1 -- _logs/UTAC153-RELATORIO.md`) |

## Checklist de aceite (enunciado)
| | Item | Estado |
|---|---|---|
| ✅ | CORS aceita `capacitor://localhost` e `ionic://localhost` | Lista fechada + reflexão da origem do pedido. O Android (`https://localhost`) e o site ficam iguais, cabeçalho a cabeçalho. Nunca `*` |
| ✅ | Teste de preflight a passar | `_tests/utac153-cors-ios.test.mjs`: OPTIONS das duas origens iOS ⇒ 204 + `Access-Control-Allow-Origin` certo, **nas 85 functions reais do app** |
| ✅ | Commit local (sem push) | `44a90b4`, `c471bde`, docs |
| ✅ | Relatório final | este ficheiro |

## O que mudou (e porquê não foi «acrescentar à lista»)
- **Onde estava o CORS:** `netlify/functions/_lib/cors.mjs`, não o `netlify.toml`.
- **Porque não bastava acrescentar:** `Access-Control-Allow-Origin` aceita **um** valor. Antes era a constante `https://localhost` em todas as respostas.
- **R18-153-A (decisão do operador):** a origem é capturada em `respostaPreflight(req)` (a 1.ª instrução das 85 functions do app) por `AsyncLocalStorage` e reflectida se estiver na lista. Fora dela fica `https://localhost`.
- **Ficheiros alterados:** o `cors.mjs` e 4 sítios (`jsonResponse`/`jsonError`, `jsonCacheavel`, o 429 do rate-limiter e o CSV do ADM).
- **Lógica de negócio:** zero linhas (pontos, lances e palpites intactos).
- **CDN:** o `Vary: Origin` já existia e a documentação da Netlify diz que entra na chave de cache. Uma resposta cacheada para o Android não vai para o iOS.

## Provas
- **Suíte backend: 1552/1641, 0 falhas** (89 skipped), igual ao UTAC151 mais os testes novos.
  - Na 1.ª corrida caíram 43 testes: 8 ficheiros faziam mock de `cors.mjs` sem a função nova. Os mocks foram corrigidos e nenhum deles faz asserções sobre CORS.
  - Os 2 testes acrescentados depois do SEG4 correram só nos ficheiros de CORS (20/20). A suíte completa não foi recorrida depois deles.
- **Mutação 10/10 RED** (8 + 2), restauro md5 idêntico. Scripts em `_logs/UTAC153_mutacao*.py`. Os mutantes incluem «reflectir qualquer origem», «contexto global em vez de por pedido» e «uma resposta antes do preflight».
- **Validador adversarial: APROVADO COM RESSALVAS, 0 graves** (`_logs/UTAC153_SEG4_VALIDADOR.md`).
  - Leu as 85 functions e confirmou que o preflight é a 1.ª instrução.
  - Mandou GET/POST reais com 4 origens (680 respostas): nenhuma com a origem errada.
  - **Refutou uma afirmação minha:** o CSV do ADM **não** rebentava em produção, porque o esbuild resolve o `require`. A afirmação foi corrigida à vista.

## Pendências
1. **⛔ Deploy.** O iOS só fala com a API depois de `netlify deploy --prod --build`, que precisa de autorização tua. A seguir, medir em produção o preflight `curl -X OPTIONS -H "Origin: capacitor://localhost"` e uma resposta cacheada (`/produtos`) pedida com as duas origens.
2. **DEBT-121** (pré-existente): o `<img>` do `img-proxy` usa um caminho relativo e parte nos WebViews nativos. Não é CORS.
3. Seguem do UTAC152: DEBT-118 (Sign in with Apple), DEBT-119 (sem compra no iOS), DEBT-120.
4. Os worktrees dos dois validadores ficaram em `.claude/worktrees/` (não foram apagados).
