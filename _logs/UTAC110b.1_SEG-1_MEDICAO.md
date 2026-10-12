# UTAC110b.1 — SEG-1 MEDIÇÃO

**Estado final: SEGUIR** (A14 satisfeita na 2.ª tentativa). Baseline `ae72248`.

## 1. RAM (A14) — 2026-10-12

| Tentativa | Leituras (MB livres) | Gate ≥ 1.500 |
|---|---|---|
| 1.ª | 888 · 882 · 892 | ❌ → PARADO e reportado |
| 2.ª (operador «acabei de fechar tudo») | 710 · 736 · 746 | ❌ |
| 3.ª (depois de fechar só processos **sem janela**) | **1883 · 1886 · 1897** | ✅ |

Entre a 2.ª e a 3.ª: medido que **nenhum** processo `msedge`/`claude` tinha janela (`MainWindowHandle = 0`).
Fechados: o Edge em segundo plano (10 processos, ~680 MB) e a app **Claude Desktop** no tabuleiro
(`WindowsApps\Claude_2.31226.0.0_x64…\Claude.exe`, árvore do pid 8576, 9 processos, ~1.083 MB). O operador tinha
dito que fechou tudo; estes ficaram no tabuleiro. **Intactos:** esta sessão (pid 5960) e o WhatsApp.
Instrumento: `[int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024)`.

## 2. Repo

- HEAD `ae72248` (fecho do 110b). `git status`: só os 30 `??` pré-existentes (`MC100_*`, `MC101_*`, `MC102_*`,
  `UTAC106x.2.spec.yml`) + os ficheiros deste UTAC.

## 3. Suíte (foreground, harness `mc966`)

`frontend: VERDE 979/979` · `backend: VERDE 1095/1101` · VEREDITO VERDE (= baseline declarada).

## 4. Inventário do sistema GUTO (medido)

| Ficheiro | Linhas | Papel |
|---|---|---|
| `src/components/ChatbotWidget.jsx` | — | UI do chat; `apiPost("chatbot", …)` (`:367`) + cards de `/notificacoes` |
| `netlify/functions/chatbot.mjs` | 1514 | endpoint: perfil → conformidade → intent router → RAG → LLM/template |
| `netlify/functions/_lib/rag.mjs` | 315 | embeddings (HF), busca por cosseno e textual, `montarContexto` |
| `netlify/functions/_lib/guto-perfis.mjs` | 508 | system prompts e respostas por perfil (4 perfis) |
| `netlify/functions/_lib/edicoes-core.mjs` | — | intents de edições (Blob `edicoes-metadata`) |
| `_lib/referral.mjs`, `troco-senhas.mjs`, `wizard-session.mjs`, `system-state.mjs`, `log-operacional.mjs`, `pulso.mjs`, `simulador.mjs`, `admin-metricas.mjs`, `data-store.mjs`, `recursos-app-config.mjs` | — | fontes de dados dos intents (Blobs + Supabase) |
| `docs/RAG-GUTO-v2.md` | 6.906 B / 1.113 palavras | fonte do índice vivo |
| `scripts/mc964-gerar-chunks.mjs`, `scripts/build-rag-index.mjs` | — | os 2 builds do índice (divergentes; 110b) |

**Quem importa `_lib/rag.mjs`:** só `chatbot.mjs`, os 2 scripts de build e `desafio-gut/frontend/scripts/test-mc9.1.mjs`.

## 5. Variáveis de ambiente (só nomes)

Lidas pelo GUTO (`process.env.*` em `chatbot.mjs`/`rag.mjs`): `CHATBOT_ATIVO` (`chatbot.mjs:1258`),
`LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL` (`:1311-1313`), `HF_API_TOKEN` (`rag.mjs:216`), `HF_FORCE_REMOTE`
(`rag.mjs:209`), `NETLIFY`/`AWS_LAMBDA_FUNCTION_NAME` (`rag.mjs:152-153`, só para detectar o ambiente).
Existência das 5 de produção: medida no 110b (todas presentes e não vazias em `production`). **Não re-lidas aqui**:
o enunciado traz o resultado da sonda do operador (HF 401 · LLM 401 · `LLM_MODEL = deepseek-v4-flash` ·
`LLM_BASE_URL = api.deepseek.com/v1`). Os valores são do operador; não os li (R5).
