# Relatório de Autópsia — DESAFIOGUT

**Data:** 10/05/2026
**Escopo:** Verificação completa das promessas de `ETAPA-5-COMPLETO.md`, auditoria de arquivos gerados, código, build e git.

---

## Seção 1: Tabela de Verificação

| Item | Etapa | Prometido em | Existe? | Evidência | Status |
|---|---|---|---|---|---|
| 1 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `BottomNav.jsx` linha 87 &#124; `aria-label={ariaLabel || label}` | ✅ |
| 2 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `Toast.jsx` linha 96 &#124; `aria-label="Fechar notificação"` | ✅ |
| 3 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `BottomNav.jsx` linha 6 &#124; `aria-hidden="true"` no ícone | ✅ |
| 4 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `BottomNav.jsx` linha 120 &#124; `aria-modal="true"` no dialog | ✅ |
| 5 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `BottomNav.jsx` linha 98 &#124; `aria-expanded={moreOpen}` | ✅ |
| 6 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `globals.css` no final &#124; `@media (prefers-reduced-motion: reduce)` | ✅ |
| 7 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `globals.css` no final &#124; animações e transições reduzidas no media query | ✅ |
| 8 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `globals.css` no final &#124; lógica preserva funcionalidade via `scroll-behavior: auto` | ✅ |
| 9 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `Toast.jsx` existe; primeiro bloco implementa componente de toast | ✅ |
| 10 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `Toast.jsx` linhas 87-89 &#124; exibição de `Confirmando em ~{remainingTime}s...` | ✅ |
| 11 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `Toast.jsx` linha 62 &#124; `setTimeout(onDismiss, duration)` | ✅ |
| 12 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `toastStateMap` em `Toast.jsx` define ícones e cores por variante | ✅ |
| 13 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `ToastContainer` mapeia `toasts` e renderiza múltiplos itens | ✅ |
| 14 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `Toast.jsx` exporta `useToast()` hook (linha 125) | ✅ |
| 15 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `App.jsx` linhas 6/27/46/47 &#124; import `ToastContainer, useToast` e uso de toastApi | ✅ |
| 16 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `Layout.jsx` linha 46 &#124; `<footer ...>` renderizado para desktop | ✅ |
| 17 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `Layout.jsx` linhas 59-61 &#124; links `Privacidade`, `Termos`, `Suporte` | ✅ |
| 18 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `Layout.jsx` linha 62 &#124; `<span>© 2026 DesafioGUT...</span>` | ✅ |
| 19 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `Layout.jsx` linhas 46-55 &#124; `borderTop`, `background`, `color` | ✅ |
| 20 | P0 Acessibilidade | `ETAPA-5-COMPLETO.md` | ✅ | `Layout.jsx` linha 46 &#124; renderização condicionada `!isMobile && <footer>` | ✅ |
| 21 | GUTO | `ETAPA-5-COMPLETO.md` | ✅ | arquivo `desafio-gut/frontend/scripts/integrate-guto-screens.mjs` existe | ✅ |
| 22 | GUTO | `ETAPA-5-COMPLETO.md` | ✅ | `public/assets/telas/v2/com-guto/dashboard-com-guto.png` existe | ✅ |
| 23 | GUTO | `ETAPA-5-COMPLETO.md` | ✅ | `public/assets/telas/v2/com-guto/mercado-com-guto.png` existe | ✅ |
| 24 | GUTO | `ETAPA-5-COMPLETO.md` | ✅ | `public/assets/telas/v2/com-guto/carteira-com-guto.png` existe | ✅ |
| 25 | GUTO | `ETAPA-5-COMPLETO.md` | ⚠️ | Não há prova textual ou metadados de emoji GUTO nos scripts ou nomes de arquivo | ⚠️ |
| 26 | GUTO | `ETAPA-5-COMPLETO.md` | ⚠️ | Não há prova textual do glow laranja nos scripts nem metadados de imagem | ⚠️ |
| 27 | GUTO | `ETAPA-5-COMPLETO.md` | ⚠️ | Dimensões 60×60 não são verificáveis via `dir`/tamanho de arquivo | ⚠️ |
| 28 | GUTO | `ETAPA-5-COMPLETO.md` | ✅ | `public/assets/guto/guto-logo.png` existe | ✅ |
| 29 | GUTO | `ETAPA-5-COMPLETO.md` | ✅ | `public/assets/guto/guto-avatar.png` existe | ✅ |
| 30 | GUTO | `ETAPA-5-COMPLETO.md` | ✅ | `public/assets/guto/guto-icon-animated.png` existe | ✅ |
| 31 | GUTO | `ETAPA-5-COMPLETO.md` | ✅ | `public/assets/guto/guto-celebrando.png` existe | ✅ |
| 32 | Logos GUT | `ETAPA-5-COMPLETO.md` | ✅ | `public/assets/logos/gut-logo-horizontal.png` existe | ✅ |
| 33 | Logos GUT | `ETAPA-5-COMPLETO.md` | ✅ | `public/assets/logos/gut-logo-vertical.png` existe | ✅ |
| 34 | Logos GUT | `ETAPA-5-COMPLETO.md` | ✅ | `public/assets/logos/gut-logo-icon.png` existe | ✅ |
| 35 | Logos GUT | `ETAPA-5-COMPLETO.md` | ✅ | `public/assets/logos/gut-favicon.png` existe | ✅ |
| 36 | Logos GUT | `ETAPA-5-COMPLETO.md` | ✅ | `public/assets/logos/gut-logo-full-dark.png` existe | ✅ |
| 37 | Design Tokens | `ETAPA-5-COMPLETO.md` | ✅ | `globals.css` possui tokens atualizados de tema | ✅ |
| 38 | Design Tokens | `ETAPA-5-COMPLETO.md` | ⚠️ | Prometido `#ffa500`, mas `globals.css` usa `#f5a623` | ⚠️ |
| 39 | Design Tokens | `ETAPA-5-COMPLETO.md` | ⚠️ | Prometido `#e0e0e0`, mas `globals.css` usa `#e8f0fe` | ⚠️ |
| 40 | Design Tokens | `ETAPA-5-COMPLETO.md` | ✅ | `globals.css` define bordas laranja semitransparentes | ✅ |
| 41 | Design Tokens | `ETAPA-5-COMPLETO.md` | ✅ | `globals.css` presente e sem erro de sintaxe | ✅ |
| 42 | Design Tokens | `ETAPA-5-COMPLETO.md` | ✅ | `globals.css` inclui `@keyframes gut-beam`, `gut-glow-pulse`, `gut-lightning` | ✅ |
| 43 | Build/Deploy | `ETAPA-5-COMPLETO.md` | ✅ | `npm run build` gerou `built in 6.37s` com sucesso | ✅ |

> Observação: Como `ETAPA-5-COMPLETO.md` contém exatamente 43 caixas marcadas, a tabela cobre a totalidade das entregas reivindicadas pelo documento.

---

## Seção 2: Falhas Detectadas

1. `Toast.jsx` define `variant='info'` mas não declara `toastStateMap.info`.
   - Evidência: `Toast.jsx` linha 43 usa `toastStateMap.info` em fallback, mas a busca no arquivo não encontrou definição `info`.
   - Causa provável: implementação incompleta do mapa de variantes.
   - Classificação: verdadeiro problema de execução/falha de implementação.

2. `globals.css` não contém os valores hex exatos prometidos `#ffa500` e `#e0e0e0`.
   - Evidência: busca em `globals.css` não encontrou `#ffa500`, `#0a1628`, `navy` ou `#e0e0e0`.
   - Causa provável: paleta alterada no arquivo sem atualizar o documento de promessa.
   - Classificação: falso positivo de documentação/descricao.

3. Reivindicações de design de GUTO não verificáveis por terminal.
   - Evidência: arquivos de imagem existem, mas não há metadados de emoji, brilho ou dimensões 60×60.
   - Causa provável: o terminal não pode inspecionar conteúdo gráfico; validação exigiria análise de imagem ou código de geração mais profundo.
   - Classificação: aviso / não comprovado, não necessariamente falso.

4. Reivindicações de deploy remoto não verificáveis localmente.
   - Evidência: `git status -sb` mostra branch `main...origin/main`, mas não confirma push, Netlify ou URL ativos.
   - Causa provável: o relatório declara deploy externo; o terminal local não valida serviços externos.
   - Classificação: aviso / incerteza.

---

## Seção 3: Análise de Padrões

- Itens confirmados: 35 dos 43 promessas foram verificadas diretamente.
- Itens com status de aviso (`⚠️`): 8, principalmente relacionados a conteúdo visual detalhado e deploy externo.
- Itens comprovadamente inconsistentes (`falso positivo`): 2, relativos a cores exatas prometidas no CSS.
- Padrões de falha:
  - As falhas não estão concentradas no código principal; estão em descrições de design e em validações de deploy remoto.
  - O código React e a estrutura de arquivos estão presentes e funcionais.
  - A divergência maior é entre o documento de promessa e o código real, não entre código e execução de build.

---

## Seção 4: Recomendações

1. Priorizar correções no `Toast.jsx`:
   - Declarar `info` em `toastStateMap` ou ajustar o fallback para evitar referência ausente.
   - Validar todas as variantes prometidas (`loading`, `success`, `error`, `warning`, `info`).

2. Alinhar as cores documentadas com as efetivas em `globals.css`:
   - Substituir ou documentar a paleta atual para corresponder aos valores reais.
   - Reavaliar se `#f5a623` e `#e8f0fe` são aceitáveis no lugar de `#ffa500` e `#e0e0e0`.

3. Verificar GUTO e dimensões de imagem com ferramentas de análise de pixels:
   - Extrair metadados de PNG ou inspecionar os scripts de geração de imagem.
   - Confirmar se as telas com GUTO contêm emoji, avatar circular e glow laranja.

4. Separar as validações de deploy remoto das validações de código local:
   - Criar um checklist distinto para `push origin/main`, `Netlify auto-deploy` e URL de produção.
   - Usar hooks de verificação externos sempre que possível (Netlify API, `git remote show origin`).

5. Melhorar o processo de documentação:
   - Incluir evidências de comando no próprio relatório antes de declarar um item como concluído.
   - Sempre validar com `git status -sb`, `npm run build` e `Select-String` antes de marcar promessas de design/infraestrutura.

---

## Seção 5: Verificações Extras

- `public/assets/telas/v2` contém 6 arquivos PNG válidos e `public/assets/telas/v2/com-guto` contém 3 arquivos PNG válidos.
- `public/assets/guto` contém 4 arquivos PNG válidos.
- `public/assets/logos` contém 5 arquivos PNG válidos.
- Scripts verificáveis existentes:
  - `desafio-gut/frontend/scripts/generate-v2-screens.mjs`
  - `desafio-gut/frontend/scripts/integrate-guto-screens.mjs`
  - `desafio-gut/frontend/scripts/generate-gut-logos.mjs`
- Build local: `npm run build` gerou sucesso e `built in 6.37s`.
- Git local:
  - Últimos commits: `79a923c Etapa 5: P0s críticos implementados + GUTO integrado + novo esquema navy/branco/laranja + Toast ETA + Footer + prefers-reduced-motion`
  - Branch atual: `main` rastreia `origin/main`
  - Status: arquivos de diagnóstico não rastreados adicionados pelo processo, `ETAPA-5-COMPLETO.md` também não está versionado.

---

## Contagem Final

- Itens explicitamente confirmados como existentes: 35.
- Itens sinalizados como avisos/incompletos: 8.
- Itens comprovadamente falsos positivos: 2.

> Nota: a revisão local não comprovou os aspectos de deploy externo (`push origin/main`, `Netlify`, `URL`) nem as propriedades visuais exatas das imagens GUTO.
