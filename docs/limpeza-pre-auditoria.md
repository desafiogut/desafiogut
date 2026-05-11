# Limpeza Pré-Auditoria — DesafioGUT
> **FASE 0 do Bloco A de Reestruturação**  
> Data: 2026-05-11 | Aguardando aprovação antes de qualquer remoção

---

## Critérios de Classificação

| Símbolo | Significado |
|---------|-------------|
| ✅ KEEP | Código ativo, documentação protegida, assets em uso |
| 🗑️ LIXO | Supersedido, temporário, diagnóstico, duplicata sem referência |
| ⚠️ KEEP-VERIFICAR | Potencialmente obsoleto, mas requer confirmação de uso |

**Regras absolutas (nunca tocar):**
- `netlify/functions/` e toda sua subárvore
- `src/context/AppContext.jsx`
- `src/components/*` (lógica de lance, auth, PIX)
- `CLAUDE.md`, `CLAUDE_DEBUG.md`, `RELATORIO-FINAL.md`
- `docs/auditoria-contrato.md`, `docs/stress-test.md`
- `public/assets/telas/guto tradicional.png` (2.689 KB)
- `public/assets/telas/reff oficial.jpeg` (562 KB)

---

## RAIZ DO REPOSITÓRIO (`DESAFIOGUT/`)

| Caminho | Classificação | Motivo |
|---------|--------------|--------|
| `CLAUDE.md` | ✅ KEEP | Protegido — fonte de verdade |
| `CLAUDE_DEBUG.md` | ✅ KEEP | Protegido |
| `RELATORIO-FINAL.md` | ✅ KEEP | Protegido |
| `netlify.toml` | ✅ KEEP | Config deploy ativo |
| `.gitignore` | ✅ KEEP | |
| `.git/` | ✅ KEEP | |
| `.claude/` | ✅ KEEP | Config Claude Code |
| `.agents/` | ✅ KEEP | Skills instaladas |
| `.mcp.json` | ✅ KEEP | MCP config |
| `.netlify/` | ✅ KEEP | Estado deploy Netlify |
| `desafio-gut/` | ✅ KEEP | Projeto principal |
| `docs/` | ✅ KEEP | (ver seção docs/) |
| `refs visuais/` | ✅ KEEP | 5 imagens WhatsApp de referência visual |
| `skills-lock.json` | ✅ KEEP | Lock de skills |
| `AUDITORIA-UX-UI-ETAPA-4.md` | 🗑️ LIXO | Supersedido por `docs/design-system-desafiogut-final.md` |
| `ETAPA-5-COMPLETO.md` | 🗑️ LIXO | Status ephemeral — irrelevante |
| `PANORAMA-DESAFIOGUT.md` | 🗑️ LIXO | Supersedido por `CLAUDE.md` |
| `RELATORIO-BETA-FINAL.md` | 🗑️ LIXO | Supersedido por `RELATORIO-FINAL.md` |
| `claude_help.txt` | 🗑️ LIXO | Help text dumped, não pertence ao repo |
| `airfryer.jpeg` | 🗑️ LIXO | Imagem de produto não relacionado na raiz |
| `test_ok.png` | 🗑️ LIXO | Arquivo de teste |
| `diag_findstr.txt` | 🗑️ LIXO | Output diagnóstico |
| `diagnostic-*.txt` (10 arquivos) | 🗑️ LIXO | Outputs diagnóstico — `diagnostic-build-output.txt`, `diagnostic-build-output-utf8.txt`, `diagnostic-git-log.txt`, `diagnostic-git-log-utf8.txt`, `diagnostic-git-status.txt`, `diagnostic-git-status-utf8.txt`, `diagnostic-output-2.txt` a `6.txt`, `diagnostic-output-scripts.txt`, `diagnostic-output.txt` |
| `generate_15_assets.py` | 🗑️ LIXO | Script Python abandonado, supersedido por `generate-v3-assets.mjs` |
| `generate_assets.py` | 🗑️ LIXO | Idem |
| `generate_tela_1.txt` | 🗑️ LIXO | Rascunho de prompt |
| `probe_rpc.json` | 🗑️ LIXO | Output de probe RPC |
| `probe_runcomfy.py` | 🗑️ LIXO | Probe ComfyUI — irrelevante |
| `probe_runcomfy2.py` | 🗑️ LIXO | Idem |
| `probe_runcomfy3.py` | 🗑️ LIXO | Idem |
| `rpc_methods.json` | 🗑️ LIXO | Output de diagnóstico RPC |

**Lixo na raiz: 20 arquivos/dirs**

---

## DOCS (`docs/`)

| Caminho | Classificação | Motivo |
|---------|--------------|--------|
| `docs/auditoria-contrato.md` | ✅ KEEP | Protegido |
| `docs/stress-test.md` | ✅ KEEP | Protegido |
| `docs/DESIGN.md` | ✅ KEEP | Design spec 9-seções atual |
| `docs/design-system-desafiogut-final.md` | ✅ KEEP | Design system compilado v3 |
| `docs/design-system-final.md` | 🗑️ LIXO | Tema verde v2 — supersedido pelo v3 |
| `docs/design-model.yaml` | ⚠️ KEEP-VERIFICAR | Pode conter referências úteis — manter se <10KB |
| `docs/relatorio-autopsia.md` | ⚠️ KEEP-VERIFICAR | Relatório de diagnóstico — manter se contém decisões técnicas relevantes |

---

## BLOCKCHAIN (`desafio-gut/`, excluindo `frontend/`)

| Caminho | Classificação | Motivo |
|---------|--------------|--------|
| `desafio-gut/contracts/Leilao.sol` | ✅ KEEP | Contrato ativo |
| `desafio-gut/ignition/` | ✅ KEEP | Módulos de deploy e artifacts de ignition |
| `desafio-gut/hardhat.config.js` | ✅ KEEP | Config ativo |
| `desafio-gut/package.json` | ✅ KEEP | |
| `desafio-gut/scripts/` | ✅ KEEP | Scripts Hardhat (deploy, test, probe on-chain) |
| `desafio-gut/deploy.js` | ✅ KEEP | Script de deploy |
| `desafio-gut/.env` | ✅ KEEP | Vars de ambiente |
| `desafio-gut/setup-operacional.js` | ⚠️ KEEP-VERIFICAR | Pode ser útil para setup inicial |
| `desafio-gut/hardhat.config.js.txt` | 🗑️ LIXO | Backup de configuração — versão .txt sem uso |
| `desafio-gut/artifacts/` | 🗑️ LIXO | ABIs compiladas — regeneradas por `npx hardhat compile` (212 KB) |
| `desafio-gut/cache/` | 🗑️ LIXO | Cache Hardhat — regenerado automaticamente (16 KB) |

---

## FRONTEND — RAIZ (`desafio-gut/frontend/`)

| Caminho | Classificação | Motivo |
|---------|--------------|--------|
| `src/` | ✅ KEEP | (ver seção src/ abaixo) |
| `public/` | ✅ KEEP | (ver seção public/ abaixo) |
| `netlify/functions/` | ✅ KEEP | **INTOCÁVEL** |
| `index.html` | ✅ KEEP | Entry point |
| `vite.config.js` | ✅ KEEP | Build config |
| `package.json`, `package-lock.json` | ✅ KEEP | |
| `.env`, `.env.local`, `.env.production` | ✅ KEEP | Vars de ambiente |
| `.gitignore` | ✅ KEEP | |
| `node_modules/` | ✅ KEEP | (nunca commitar, regenerável) |
| `scripts/generate-v3-assets.mjs` | ✅ KEEP | Gerador de assets v3 ativo |
| `scripts/check-functions-health.mjs` | ✅ KEEP | Health check das Netlify functions |
| `scripts/check-iniciar-pagamento.mjs` | ✅ KEEP | Smoke test do PIX |
| `scripts/check-confirmar-pagamento.mjs` | ✅ KEEP | Smoke test do PIX |
| `dist/` | 🗑️ LIXO | Build output — regenerado por `npm run build` (17 MB) |
| `.vercel/` | 🗑️ LIXO | Deploy é Netlify — vercel config residual |
| `vercel.json` | 🗑️ LIXO | Idem |
| `.netlify/` | 🗑️ LIXO | Cache local Netlify — regenerado |
| `playwright-debug.js` | 🗑️ LIXO | Debug one-off |
| `tmp_color_extract.py` | 🗑️ LIXO | Script Python temporário |
| `tmp_color_quant.py` | 🗑️ LIXO | Script Python temporário |
| `scripts/.out/` | 🗑️ LIXO | Outputs de screenshots de debug (1.2 MB) |
| `scripts/generate-dashboard-image.mjs` | 🗑️ LIXO | Supersedido por generate-v3-assets.mjs |
| `scripts/generate-mercado-image.mjs` | 🗑️ LIXO | Idem |
| `scripts/generate-five-screens.mjs` | 🗑️ LIXO | Idem |
| `scripts/generate-v2-screens.mjs` | 🗑️ LIXO | v2 supersedido por v3 |
| `scripts/generate-countdown-v2.mjs` | 🗑️ LIXO | Idem |
| `scripts/generate-gut-logos.mjs` | 🗑️ LIXO | Supersedido por generate-v3-assets.mjs |
| `scripts/generate-guto-variations.mjs` | 🗑️ LIXO | Idem |
| `scripts/integrate-guto-screens.mjs` | 🗑️ LIXO | One-off de integração |
| `scripts/teste-beta-airfryer.mjs` | 🗑️ LIXO | Produto não relacionado |
| `scripts/check-no-placeholders.mjs` | 🗑️ LIXO | Verificação de UI antiga (telas v2) |
| `scripts/check-icons-mobile.mjs` | 🗑️ LIXO | Idem |
| `scripts/check-forward-console.sh` | 🗑️ LIXO | Debug script desatualizado |
| `scripts/debug-privy-headless.js` | 🗑️ LIXO | Debug Privy one-off |

---

## FRONTEND — `src/`

| Caminho | Classificação | Motivo |
|---------|--------------|--------|
| `src/App.jsx` | ✅ KEEP | Entry principal |
| `src/main.jsx` | ✅ KEEP | |
| `src/globals.css` | ✅ KEEP | Atualizado v3 |
| `src/design/tokens.css` | ✅ KEEP | Design tokens v3 |
| `src/context/AppContext.jsx` | ✅ KEEP | **INTOCÁVEL** |
| `src/components/CardLance.jsx` | ✅ KEEP | **INTOCÁVEL** |
| `src/components/TabelaLances.jsx` | ✅ KEEP | **INTOCÁVEL** |
| `src/components/TermosConsentimento.jsx` | ✅ KEEP | **INTOCÁVEL** |
| `src/components/ComprarFichasModal.jsx` | ✅ KEEP | **INTOCÁVEL** (PIX) |
| `src/components/BottomNav.jsx` | ✅ KEEP | |
| `src/components/Layout.jsx` | ✅ KEEP | |
| `src/components/Sidebar.jsx` | ✅ KEEP | |
| `src/components/Toast.jsx` | ✅ KEEP | |
| `src/components/ui/badge.jsx` | ✅ KEEP | |
| `src/components/ui/card.jsx` | ✅ KEEP | |
| `src/components/ui/progress.jsx` | ✅ KEEP | |
| `src/pages/Dashboard.jsx` | ✅ KEEP | |
| `src/pages/MercadoLances.jsx` | ✅ KEEP | |
| `src/pages/MinhaCarteira.jsx` | ✅ KEEP | |
| `src/pages/Configuracoes.jsx` | ✅ KEEP | |
| `src/pages/MeusAtivos.jsx` | ✅ KEEP | |
| `src/pages/Seguranca.jsx` | ✅ KEEP | |
| `src/utils/web3.js` | ✅ KEEP | Core blockchain utils |
| `src/utils/sanitize.js` | ✅ KEEP | Segurança |
| `src/utils/rateLimiter.js` | ✅ KEEP | Rate limiting |
| `src/lib/utils.js` | ✅ KEEP | cn() helper |
| `src/hooks/useIsMobile.js` | ✅ KEEP | |
| `src/utils/saldoInterno.js` | ⚠️ KEEP-VERIFICAR | Verificar se ainda usado (CLAUDE.md indica migração para on-chain) |
| `src/utils/appkit.js` | 🗑️ LIXO | Marcado como ARQUIVADO no CLAUDE.md, substituído por Privy. **Nenhum arquivo faz import dele.** |

---

## FRONTEND — `public/assets/`

### `telas/` — Regra: NUNCA tocar nas 2 bases

| Caminho | Classificação | Motivo |
|---------|--------------|--------|
| `telas/guto tradicional.png` | ✅ KEEP | **PROTEGIDO** — base para GUTO |
| `telas/reff oficial.jpeg` | ✅ KEEP | **PROTEGIDO** — referência visual oficial |
| `telas/v3/` (6 PNGs) | ✅ KEEP | Telas ativas v3 |
| `telas/v2/` (8 PNGs + com-guto/) | 🗑️ LIXO | Supersedido por v3 (1.4 MB) |
| `telas/teste 1/` (12 PNGs) | 🗑️ LIXO | Telas de teste v1/v2 (2.8 MB) |
| `telas/v3/temp_ui.html` | 🗑️ LIXO | Arquivo temporário |
| `telas/v3/com-guto/` | 🗑️ LIXO | Criado acidentalmente, sem conteúdo útil |

### `guto/` e `logos/`

| Caminho | Classificação | Motivo |
|---------|--------------|--------|
| `guto/v2/` (4 PNGs) | ✅ KEEP | GUTO v2 ativo |
| `guto/guto-avatar.png` | 🗑️ LIXO | v1 supersedido por v2 |
| `guto/guto-celebrando.png` | 🗑️ LIXO | v1 supersedido |
| `guto/guto-icon-animated.png` | 🗑️ LIXO | v1 supersedido |
| `guto/guto-logo.png` | 🗑️ LIXO | v1 supersedido |
| `logos/v2/` (5 PNGs) | ✅ KEEP | Logos v2 ativos |
| `logos/gut-favicon.png` | 🗑️ LIXO | v1 supersedido por v2 |
| `logos/gut-logo-full-dark.png` | 🗑️ LIXO | v1 supersedido |
| `logos/gut-logo-horizontal.png` | 🗑️ LIXO | v1 supersedido |
| `logos/gut-logo-icon.png` | 🗑️ LIXO | v1 supersedido |
| `logos/gut-logo-vertical.png` | 🗑️ LIXO | v1 supersedido |

### Outros

| Caminho | Classificação | Motivo |
|---------|--------------|--------|
| `public/produtos/airfryer.jpeg` | 🗑️ LIXO | Produto não relacionado |
| `public/_redirects` | ✅ KEEP | SPA redirect rule |

---

## Resumo Executivo

### Itens para Remover

| Categoria | Qtde | Espaço aprox. |
|-----------|------|---------------|
| Raiz repo (diagnósticos, probes, rascunhos) | 20 | ~500 KB |
| `docs/` (design-system v2 antigo) | 1 | ~50 KB |
| `desafio-gut/` (artifacts, cache, .txt backup) | 3 | ~230 KB |
| `frontend/` raiz (dist, .vercel, tmp) | 4 | ~17 MB |
| `frontend/scripts/` (geradores antigos, debug) | 12 | ~100 KB |
| `frontend/src/utils/appkit.js` | 1 | ~5 KB |
| `public/assets/telas/` (v2, teste 1, temp) | 3 dirs | ~4.2 MB |
| `public/assets/guto/` (v1 root) | 4 | ~800 KB |
| `public/assets/logos/` (v1 root) | 5 | ~400 KB |
| **Total** | **53 itens** | **~23 MB** |

### O que Nunca Será Tocado

```
netlify/functions/**          ← pipeline PIX + auth
src/context/AppContext.jsx    ← estado global
src/components/CardLance.jsx  ← lance on-chain
src/components/TabelaLances.jsx
src/components/ComprarFichasModal.jsx
CLAUDE.md / CLAUDE_DEBUG.md / RELATORIO-FINAL.md
docs/auditoria-contrato.md / docs/stress-test.md
public/assets/telas/guto tradicional.png
public/assets/telas/reff oficial.jpeg
```

---

## ⏸️ AGUARDANDO APROVAÇÃO

**Esta fase é DIAGNÓSTICO APENAS. Nenhum arquivo foi removido.**

Para autorizar a limpeza (FASE 1), responda:
- `"OK limpeza"` → executar remoção de todos os 🗑️ LIXO
- `"OK limpeza exceto X"` → remover tudo exceto o listado
- `"Ajustar: manter Y"` → reclassificar itens específicos antes de executar

**Não recomendo remover `docs/design-model.yaml` e `docs/relatorio-autopsia.md` sem revisão manual.**
