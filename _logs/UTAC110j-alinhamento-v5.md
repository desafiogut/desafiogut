# UTAC110j — UI alinhada ao Regulamento v5 + DEBT-034

Executor: Claude Code (Opus 5.5) · 2026-10-16 · baseline `0c99cc9` (= origin/main) · spec `_logs/UTAC110j.spec.yml`
Medição e decisões: `_logs/UTAC110j_SEG-1_MEDICAO.md` (R18-110j-1..5 + confirmações da 2.ª ronda).
**Não há commit nem push** (proibidos pelo enunciado sem autorização do operador).

## A14 (RAM)
Arranque 270 MB. Fechar processos foi **recusado pelo classificador de permissões** (não contornado).
Só trim de working sets (`EmptyWorkingSet`, nada fechado): 393 → ~2 000 MB, repetido antes de cada suíte
(2 044–2 299 MB). Suítes corridas acima de 1 500 MB; o trim regride durante a corrida (1 200–1 471 MB no fim).

## SEG0 — o que mudou (só texto/copy, + 1 linha de backend autorizada)

| decisão | ficheiro | mudança |
|---|---|---|
| 1-B | `CardLance.jsx` | nova `MSG_PROGRAMADO_LEGADO = "Esta modalidade não está disponível."` (exportada); substitui as ~14 frases do ramo Programado («consome 1 senha (Art. 20: R$ 2,00)», «Converter R$ → senha», «−1 senha», «converte R$ 2,00 → 1 senha»…). Rótulo do botão Programado → «Dar lance». **Código do ramo intacto**, comentado «LEGADO / INALCANÇÁVEL desde o UTAC108e.1». |
| 4 | `CardLance.jsx` | «Art. 26» retirado de 3 sítios (texto do mínimo R$ 0,01 mantém-se: é regra do backend/contrato). |
| 1-E | `ComprarFichasModal.jsx` | «Quantas senhas?» → «Quanto quer depositar (R$)?»; botões `1/5/10` → `R$ 2/R$ 10/R$ 20` (mesmo `setQtd(p)`); «N senhas × R$ 2,00» → «N × R$ 2,00»; subtítulo «Saldo R$ … Lance Relâmpago ou troca por senhas» → «O saldo em R$ serve para comprar o Passe Desafio»; dica pós-PIX «Lance Programado converte…» → «Use o saldo para comprar o Passe Desafio na Carteira.»; «comprar fichas» → «depositar». **Constantes, `valorBRL` e corpo `{endereco, qtd}` intactos.** |
| 1-A | `MeusAtivos.jsx`, `MinhaCarteira.jsx` | «🎫 Senhas antigas (on-chain, legado)»; indicador da Carteira «(on-chain, legado)»; «São usadas no Lance Programado» → «Ficam registradas on-chain (legado).» (promessa do ramo legado — mesma regra da 1-B). |
| 1-D | `ExcluirConta.jsx`, `ExcluirContaModal.jsx` | Medido no `conta-delete.mjs`: APAGA `saldo_rs`, `troco_senhas` (off-chain), `wallet`; as senhas on-chain ficam. Eliminado: «Saldo em R$ e registro off-chain de senhas (legado)» (antes dizia «senhas disponíveis», que era falso); Retido: «saldo de senhas on-chain (legado)». |
| 1-F / 4 | `Configuracoes.jsx`, `MinhaCarteira.jsx` | «Art. 20 — Senha: R$ 2,00 por edição» → «Art. 6º — Passe Desafio: R$ 2,00.»; linhas «Art. 26 (lance mínimo)» e «Art. 25 (apuração automática)» **removidas** (texto só dependia do artigo órfão). |
| 4 | `MeusAtivos.jsx`, `glass/ComingSoonHero.jsx` | «Art. 25: Apuração automática · Art. 7: …» → «Art. 14º: Menor lance único ganha»; «· Art. 8» → «· Art. 14º». |
| 5a | `CardEdicaoEspecial.jsx`, `i18n/pt.js` | «Prêmio especial» → «Produto especial»; «Prêmio em disputa» → «Produto em disputa» (chaves i18n inalteradas). |
| 5b | `Privacidade.jsx` | «smart contract LeilaoGUT (nome do contrato on-chain, imutável)». |
| 2 | `ChatbotWidget.jsx`, `Vitrine.jsx` | sugestão do GUTO sem «cotas»; Vitrine (rota do comprador, menu «Mais») sem a linha «Cotas: N de M» e sem o aviso «sistema de cotas … não está ativo». Admin `/admin/cotas` e restantes páginas admin **intactos**. |
| 3 | — | a UI já dizia «Cada lance consome 1 crédito de lance (Passe Relâmpago)» (UTAC110d-front): nada a mudar; a divergência v5 ↔ backend ficou em **DEBT-042**. |
| 5c | `netlify/functions/referral.mjs` | removida a linha `indicador: r.indicador,` da resposta do `usar-codigo` (**trivial**: 1 linha, 1 endpoint, sem migração ⇒ neste UTAC, não 110j.1). |

**Frente D:** sem código — todas as ligações já iam para `/regras-oficiais` (v5).

## SEG1–SEG3 — verificação

- **Contratos de UTACs fechados actualizados (invariante preservada, versão antiga à vista no comentário):**
  `artigosUI` (a UI inteira passa a ser julgada contra o mapa do **v5**, e o assunto tem de constar do próprio
  artigo do v5; o desconhecido continua a reprovar) · `citacoesRegulamento` (ocorrência a ocorrência no v5 +
  guarda contra artigos v4 órfãos) · `utac109e-cartao-unico` (rótulos do ramo legado passam a ser PROIBIDOS) ·
  `utac107c-deposito` (frase nova + a promessa tem de existir na Carteira) · `utac106c-carteira-render`
  (texto do indicador) · `mc991-ui` (**contrato invertido** por R18-110j-2: a Vitrine já não mostra cotas) ·
  `MeusAtivos`, `utac0008`, `utac105c` (âncora do rodapé «Art. 25» → «Art. 14º»; texto das senhas antigas).
- **Testes novos:** `src/__tests__/utac110j-vocabulario-v5.test.mjs` (11; inclui varredura GLOBAL de promessas
  do modelo antigo, a guarda «ninguém chama `setModalidade(`», o cruzamento da copy LGPD com o `conta-delete`
  real e o comportamento do depósito); 1 teste comportamental da DEBT-034 em
  `netlify/functions/_tests/utac110h4-grafo.test.mjs` (handler real: sem `indicador`, sem o endereço do indicante
  em lado nenhum do corpo, resto do contrato igual).
- **Mutação:** `scripts/utac110j-prova-mutacao.mjs` — baseline verde exigida, backup fora do repo, âncora 1×,
  confirmação de que o mutante entrou, restauro com md5 + `process.on("exit")` ⇒ **14/14 PROVADOS**, md5 final OK.
- **Suíte canónica (harness `mc966`, foreground):** frontend **VERDE 1159/1159** (baseline 1148; +11) · backend
  **VERDE 1311/1317** (baseline 1310; +1; 6 skipped). `vite build` OK (para o scratchpad); `package-lock.json` intacto.

## SEG4 — validador adversarial: **PARCIAL, 1 bloqueante** → corrigido (não re-validado)
Veredicto integral: `_logs/UTAC110j_SEG4_VALIDADOR.md` (worktree próprio via helper A13, patch md5 `faa5b52f`,
RAM 1 808 MB). Reproduziu 1159/1159 · 1311/1317 e 14/14. Confirmou: copy-only no depósito/CardLance/Vitrine,
DEBT-034 sem consumidores e sem outro endpoint a devolver o endereço, Art. 6º/14º correctos no v5.

| achado | tratamento |
|---|---|
| **B1** — a regra da edição especial dizia «a partir de R$ 0,01 (debita do saldo)» (`CardEdicaoEspecial.jsx:193`, `pt.js:130`); a minha alegação «decisão 3: nada a mudar» estava **errada** | **corrigido** (R18-110j-3): «… · cada lance consome 1 crédito de lance»; guarda + M15 |
| **R1** — «Quanto quer depositar (R$)?» sobre um campo que conta unidades de R$ 2,00 (escrever 10 = R$ 20) | **corrigido** (copy): «Quanto quer depositar? (em múltiplos de R$ 2,00)»; botões «R$ 2,00/10,00/20,00»; M16 |
| **R2 (LGPD)** — a lista de exclusão diz que os «vínculos de indicação» são eliminados (o `conta-delete` não toca em referral); `pontos`, `eco_quildo`, `palpites`, `resgates`, `google_play_compras` nem apagados nem declarados retidos; o teste 1-D só cruza as senhas | **NÃO corrigido — conflito novo UI × backend ⇒ PARAR e reportar** (decisão do operador). Limite declarado no próprio teste. |
| **R3** — 7 dos 9 mutantes do validador passavam pelas guardas do 110j | guardas endurecidas (prêmio case-insensitive, conjugações de «converter», preço da senha com qualquer artigo, «Artigo 25»/7/8 sem º, chaves da resposta do referral em allowlist, frase dos «removidos» do modal, «cotas» em qualquer página do comprador) ⇒ **M17–M23 PROVADOS**. Fica **sem guarda**: `setModalidade` chamado por alias (declarado). |
| **R4** — `SemSaldoBanner` (R$) no MLC | já declarado; escondido pelo `EM_BREVE_MODE` |
| menores — `nav.cotas`, `dash.senhas` órfãs; `CreditoStatus` sem consumidor | registados, não tocados |

Mutação final: **23/23 PROVADOS** (md5 restaurado). Suíte final: **frontend VERDE 1160/1160 · backend VERDE
1311/1317** (RAM 2 043–2 111 MB antes). `package-lock.json` intacto.

### ⚠️ Incidente do validador (declarado por ele)
Um `&&` falhado fez correr um `node --test` sem lista de ficheiros **no repo principal**: reconstruiu
`desafio-gut/frontend/dist/` às **21:03** (a pasta do APK — agora contém as alterações NÃO commitadas deste UTAC)
e correu scripts antigos que fazem **GET à produção**; os scripts on-chain falharam antes de qualquer transacção
(«invalid private key»). Ficheiros versionados intactos (diff = md5 do patch). O output dessa corrida perdeu-se:
**não se sabe que endpoints de produção responderam**. ⇒ Antes de qualquer APK: `npm run build:apk` a partir do
commit que se quer empacotar.

## Erros dos meus instrumentos (declarados)
1. Um comentário na MESMA linha de uma chave do `pt.js` partiu o extractor do `especial-i18n.test.mjs`
   (`pt ≠ fallback`, valor `undefined`) — o comentário passou para linha própria.
2. A 1.ª tentativa de um `grep` read-only foi recusada pelo classificador (falso positivo «Interfere With
   Workloads»); repetido com a ferramenta Grep.

## Achados novos (fora do escopo — reportados, NÃO corrigidos)
- **LGPD:** `_lib/conta-delete.mjs` não menciona `pontos` nem `eco_quildo` (grep = 0) — o saldo de pontos de
  fidelidade/lance e o ECOQUILDO do titular podem não ser anonimizados na exclusão. A medir (UTAC próprio).
- `src/i18n/pt.js:18` `nav.cotas` é chave órfã (0 consumidores) — não visível.
- O `SemSaldoBanner` do MLC (UTAC108c) avisa «Sem saldo» em R$ para o lance, mas o lance já não debita R$
  (110d) — declarado no 110d-front, continua.
