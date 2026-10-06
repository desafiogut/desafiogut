# UTAC107g.2 — Copy pt-BR restante (pt-PT → pt-BR)

**Tipo:** copy (só texto) · **Executor:** Claude Code (Opus 5.5) · **Data:** 2026-10-06 · **Arranque:** 17:55 · **HI5:** 30 min

## Baseline (SEG-1)
- `HEAD` = `origin/main` = **`7ab9bb6`** (esperado) · sujidade 0.
- Suíte: frontend **VERDE 840/840** · backend **VERDE 1095/1101**.

## SEG0 — Varredura e classificação
Varredura por marcadores pt-PT em `src/` (comentários removidos; ~223 linhas com marcadores, a maioria comentários de código).
**Copy visível (strings/JSX/toasts/erros) em pt-PT — 2.ª pessoa «tu» e «A + infinitivo»:**

| Ficheiro | Antes | Depois |
|---|---|---|
| `components/ComprarPasseModal.jsx` | «Vais comprar…» · «Ganhas 1 ponto» · «Teus pontos (total)» · «A processar…» | «Você vai comprar…» · «Você ganha 1 ponto» · «Seus pontos (total)» · «Processando…» |
| `components/ResgatarCartaoModal.jsx` | «Vais trocar…» · «Confirma os dados de entrega.» · «A processar…» | «Você vai trocar…» · «Confirme os dados de entrega.» · «Processando…» |
| `hooks/usePalpite.js` | «Escreve um número inteiro de lances» · «Precisas de ter comprado um Passe para palpitar» | «Escreva …» · «Você precisa ter comprado …» |
| `hooks/useResgatarCartao.js` | «Precisas de 50 pontos de compra…» | «Você precisa de 50 pontos de compra…» |
| `pages/OfertasProgramadas.jsx` | «Acumula 50 pontos…» · «…conquista-se só com os pontos das tuas compras» · aria «A carregar» · «A carregar os teus pontos…» · «Vais trocar…» · «Ainda não tens pontos. Compra o teu primeiro Passe na Carteira.» | «Acumule…» · «…é conquistado só com os pontos das suas compras» · «Carregando» · «Carregando seus pontos…» · «Você vai trocar…» · **«Você ainda não tem pontos. Compre o seu primeiro Passe na Carteira.»** |
| `pages/MercadoLances.jsx` | «Abre … no teu navegador … tudo o que já usas.» · aria «A carregar» | «Abra … no seu navegador … tudo o que você já usa.» · «Carregando» |
| `pages/MinhaCarteira.jsx` | toast «Erro. Tenta de novo.» | «Erro. Tente de novo.» |
| `components/PainelIndicacao.jsx` | convite «…no teu 1º lance…» | «…no seu 1º lance…» («Te convido» fica — coloquial pt-BR; decisão do operador) |
| `pages/admin/PerfilUsuario.jsx` · `VisaoGeral.jsx` · `Comunicacao.jsx` | «A carregar…» · «A ler…» · «A enviar…» | «Carregando…» · «Lendo…» · «Enviando…» |

**Decisões do operador (R18, 2026-10-06):** **R18-A** âmbito = «18 de consumo + admin»; **R18-B** convite «no seu 1º lance».
⚠️ **Ultrapassagem declarada:** aprovei 21 frases; apliquei **25 substituições em 25 linhas** (corrigido: a 1.ª redacção dizia «20 linhas» — ℹ️L1 do validador) — «Abre» e «já usas» estão na MESMA
frase do `MercadoLances`, «Acumula» na mesma constante das OP, e «Escreve» (`usePalpite.js:33`) só apareceu na 2.ª varredura. Mesma
classe (2.ª pessoa), mesmos ficheiros já aprovados; não é estrutural (cópia espalhada, não ficheiro partilhado).

**Mantidos (pt-BR válido, 3.ª pessoa/particípio):** «Senhas ganhas» (= obtidas), «Ganha o menor lance que ninguém repetir»,
tooltips «Abre o Mercado…/Abre as Ofertas Programadas…» (descrição do botão), «Confirma que a ação partiu…» (Segurança), «Abre em» (especial).

**Fora do âmbito (pendência registada — R18-A):** vocabulário pt-PT que NÃO é 2.ª pessoa — «utilizador», «contacto», «morada»,
«bónus», «registo/registado» — sobretudo em `Privacidade.jsx` e `RegrasOficiais.jsx` (esta espelha `docs/regras-oficiais.md`, com
teste de consistência do 106h) e no admin («Nenhum utilizador», «Nenhum registo»); «Bónus de palpite» no histórico das OP.

## SEG1-SEG3 — Correcções
Ver tabela. **Só copy**: 25 substituições de texto, nenhuma linha de lógica (diff = strings). Testes afectados actualizados:
`utac106e-compra-passe` (3 assertions — a 1.ª redacção dizia 4, ℹ️L1 do validador), `utac106f-ofertas` (1), `utac106g-resgate` (2); script de mutação antigo
`scripts/mc106f-prova-mutacao.mjs` (mutante R-G ancorado em «Teus pontos (total):» → «Seus pontos (total):» — extensão declarada:
sem isto o R-G abortaria por âncora).

## SEG4 — Guarda + mutação
A guarda do 107g.1 só cobria Meus Ativos e o aviso da Carteira. **Guarda nova GLOBAL** `src/__tests__/utac107g2-pt-br.test.mjs`
(extensão declarada): varre TODO o `src/` (sem testes, sem comentários) à procura de 2.ª pessoa «tu» (`tens|teu|tua|vais|podes|
estás|precisas|usas|…`, insensível) e de «A + infinitivo»/imperativos (`A carregar|A processar|…`, `Escreve|Ganhas|Confirma os|
Tenta de novo|…`, sensível). Controlo positivo e negativo (3.ª pessoa, particípio, comentários, CRLF).
**Erros do MEU instrumento (declarados):** (1) a 1.ª versão não removia comentários em ficheiros **CRLF** — o `.` do JS não casa
`\r` (corrigido com `split(/\r?\n/)` e controlo CRLF); (2) marcadores insensíveis a maiúsculas apanhavam 3.ª pessoa («nada aqui
escreve», «Senhas ganhas») — separados em sensível/insensível; (3) a shell desfez `\r\n` num heredoc (corrigido por Edit).
**Mutação 11/11** (script ad-hoc no scratchpad; md5 idêntico em todos): Q1 «Ainda não tens…» RED(3) · Q2 «A carregar os teus»
RED(2) · Q3 «Vais comprar» RED(3) · Q4 «Ganhas» RED(2) · Q5 «A processar» RED(1) · Q6 «Confirma os dados» RED(2) · Q7 «Precisas»
RED(2) · Q8 «Escreve» RED(1) · Q9 admin «A enviar» RED(1) · Q10 «no teu navegador» RED(1) · **Q11 «tens» num ficheiro nunca tocado
(Vitrine) RED(1)**.

## SEG5 (parte 1) — Verificação
Suíte **843/843** (+3) · **1095/1101** → **VERDE**; `vite build` ✓ (5,32 s, scratchpad); `package-lock.json` não sujado; `.bak-*` ×5 =
baseline; `EM_BREVE_MODE = true`. DEBT-021 não tocada.

## SEG4b — Validador adversarial (subagente, worktree `tmp-107g2-val` @ `c6652d2`; 115 002 tokens, 29 chamadas, 270 s)

**Veredicto: PARCIAL** — «o que mudou está certo (só texto, suíte VERDE, R-G funciona, escopo respeitado), mas o objectivo não
ficou cumprido»: **4 frases pt-PT ficaram no âmbito** e a guarda tinha uma **zona cega real**.
- ⚠️ A1 `MercadoLances.jsx:437` «Por aqui, continua a explorar a loja…» (mesmo parágrafo que corrigi) → **«continue explorando»**.
- ⚠️ A2 `useResgatarCartao.js:27` «Confere os dados de entrega» → **«Confira…»**.
- ⚠️ A3 `OfertasProgramadas.jsx:289` «Chega a N pontos para resgatar» → **«Chegue a…»** (+ testes 106f/106g).
- ⚠️ A4 `usePalpite.js:31` «Sem edição a decorrer» → **«Sem edição em andamento»**.
- ℹ️ A5 admin `Operacoes.jsx:52` «continua a responder» → **«continua respondendo»** (mesma construção; extensão declarada).
- ⚠️ **G-cega**: o `/*` de `"/.netlify/functions/*"` dentro de um comentário `//` em `main.jsx:3` abria um falso bloco até à
  linha 101 e escondia copy visível (o fallback do ErrorBoundary) → **removedor de comentários reescrito**, carácter a carácter,
  ciente de strings (' " `, template multi-linha, apóstrofo em texto JSX não abre string); `//` dentro de string já não corta.
- Lacunas G2/G7/G8/G9/G13 → **marcadores acrescentados**: `Clica|Confere|Chega a|Toca em|Partilha o|Introduz|Vê o/a`,
  `fizeste|ganhaste|perdeste|…`, `ganhas \d`, `(continua|está|estamos|…) a …r`, `a decorrer`. **FP1** «A confirmar» (pt-BR) retirado.
- ℹ️ L1 contagens do log corrigidas (acima).

**Achados MEUS na re-varredura com a guarda nova** (não estavam no veredicto): `App.jsx:355-356` (página de retorno do login)
«Está a demorar…» / «estamos a restabelecer…» → **«Está demorando… Você pode continuar…» / «estamos restabelecendo…»**;
`ChatbotWidget.jsx` cartões «🏆 Ganhaste!» → **«🏆 Você ganhou!»** e «⚠️ Perdeste exclusividade» → **«⚠️ Você perdeu a
exclusividade»**. Ficheiros declarados (copy apenas). **Páginas legais** `Privacidade.jsx`/`RegrasOficiais.jsx` ficam numa
**excepção explícita** da guarda (`EXCECOES_LEGAIS`, com a razão) — pendência, não silêncio.

**Mutação final 18/18** (11 + 7 sobreviventes do validador: G6 main.jsx, G2 «Clica», A1-A4, «Ganhaste»), md5 idêntico.
Suíte **843/843 · 1095/1101 VERDE**; `vite build` ✓. ⚠️ Correcções pós-veredicto **não re-validadas** por 2.ª ronda (provadas por
mutação; HI5 apertado).
