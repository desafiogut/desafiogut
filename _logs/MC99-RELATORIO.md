# MC99 — RELATÓRIO FINAL

**Data:** 2026-09-27 · **Modo:** COMPLETO (SEG-1 → SEG6) · **Base:** `ce6fbd3` (pós-MC98)
**Commit das alterações:** `5550537` · **Produção:** https://silly-stardust-ca71bc.netlify.app
(`CDN requesting 36 files`, *Deploy is live!*)
**Foco (HARD GATE 8):** → `docs/MC99-CAMINHOS-CLICAVEIS.md` + §5 deste relatório
**Segmentos:** `_logs/MC99_RELATORIO-SEGMENTOS.md` · **Mutação:** `_logs/MC99_PROVA-MUTACAO.txt`
· **Caminhos (bruto):** `_logs/MC99_CAMINHOS-BRUTO.txt`

---

## 1. Sumário executivo

7 alterações de UI/UX feitas, **8 mutações provadas** contra 14 testes novos, suite de
**411/411** (era 396) com o backend intacto em 680/686, 0 erros de ESLint nos ficheiros
tocados, e deploy validado. A Carteira passou de 479 para ~290 linhas.

⚠️ **O validador independente REFUTOU a minha alegação de que nada se perdeu** (§8). Tinha
razão em três pontos: o email de pagamento `desafiogut@gmail.com` desapareceu por completo do
frontend, o botão «↻ Atualizar saldo» não tinha substituto nenhum, e «Sidebar em todos os
ecrãs» era falso no telemóvel. **As três estão corrigidas** (commit `2867cad`).

E a análise de caminhos clicáveis entregue como **análise** (6 sugestões priorizadas), com uma
**hipótese minha refutada** pelo próprio método antes de virar código.

## 2. O que foi alterado (registo — não é análise)

| # | ecrã | alteração | guarda |
|---|---|---|---|
| 1 | Início | «Outras Edições» empilhada → **scroll lateral** com `scroll-snap` (1 visível, resto por swipe) | 1 teste + MUT1 |
| 2 | Barra inferior | Início · **Carteira** · **Lances** · Mais (era …· Lances · Carteira · …) | 1 teste + MUT2 |
| 3 | Carteira | **5 blocos removidos** + vidro de saldo padronizado + «Minha Carteira» incorporado | 4 testes + MUT3/4/5 |
| 4 | Indique e Ganhe | saiu o rótulo técnico «MC10 · Growth» | 1 teste + MUT5 |
| 5 | Lances | saiu o **banner** (2.º vidro) e o código que só o alimentava | 1 teste + MUT6 |
| 6 | Seja Nosso Parceiro | os **dois** heroes ganharam `.gut-glass-standard` | 1 teste + MUT7 |
| 7 | Vitrine | saiu o rodapé **técnico** | 1 teste + MUT8 |

### HARD GATE 2 (vidro padrão)

`.gut-glass-standard` = `rgba(13,18,53,0.88)` — confirmado em `globals.css:406`, e já
protegido pelo teste existente `src/lib/padraoVidro.test.mjs` (que trava o bug do hover
transparente). O cartão de saldo da Carteira era o **único** vidro fora do padrão (gradiente
`0.6 → 0.06` inline); passou a padrão puro.

### HARD GATE 4 — o que foi removido e onde a informação vive (medido)

| removido | informação | onde continua |
|---|---|---|
| glass de cabeçalho | nome da página | barra inferior («Carteira»), item activo + o título agora no cartão de saldo |
| «🔗 Saldo de Senhas» | saldo on-chain | ⚠️ **CORRIGIDO:** o indicador do Sidebar **não é renderizado no telemóvel** (`Layout.jsx:84`: `{!isMobile && <Sidebar />}`). No mobile a cobertura é o **KPI "Senhas" do Dashboard**. A minha 1.ª frase ("em todos os ecrãs") era falsa. |
| «🏦 Dados para Pagamento (Art. 21)» | R$ 2,00/senha | botão «Trocar R$ 2,00 → 1 Senha» + Configurações «Art. 20» |
| | dados bancários/PIX | regulamento (`TermosConsentimento.jsx:128`). ⚠️ **Ressalva do validador:** vive no ecrã de ACEITAÇÃO — o utilizador não o volta a ver na Carteira, onde está quando vai pagar. |
| — | **email de pagamento** | ❌ **NÃO EXISTIA EM LADO NENHUM.** `grep -rn "desafiogut@gmail.com" src/` → **0 resultados**. Removido com o card e perdido. **CORRIGIDO** em `2867cad`: voltou como nota de uma linha sob o botão de depósito. |
| «📋 Meus Lances» | lances do utilizador | **/ativos**, que os classifica (único/repetido/pontos) — melhor que a lista crua |
| «Carteira Conectada» | endereço | **Sidebar** (truncado) + Configurações (completo) |

**Duas coisas NÃO estavam cobertas — e eu declarei que estavam.** Foi essa medição (a minha) que
autorizou remover; o validador independente provou que ela estava incompleta:

- **o email de pagamento** (desafiogut@gmail.com) desapareceu por completo do frontend;
- **a acção «↻ Atualizar saldo»** (refresh manual do saldo on-chain) ficou **sem substituto**:
  o Sidebar não chama `refetchSaldo`, os `StatTile` do Dashboard só navegam, e o
  auto-refresh é de 30 s (`AppContext`: `setInterval(refetchSaldo, 30000)`).

Ambas repostas em `2867cad`, com guarda cada uma. **A lição não é «faltou medir»: é que medi
contra a minha hipótese, e não contra o que o utilizador perde.**

## 3. Testes e mutação (R16 / HARD GATE 5)

**8 mutações, 8 confirmadas a ENTRAR, 8 mortas** (`scripts/mc99-prova-mutacao.mjs`), com
restauração por snapshot binário e md5 idêntico nos 7 ficheiros.

| | antes | depois |
|---|---|---|
| frontend | 396/396 VERDE | **411/411 VERDE** |
| backend | 680/686 VERDE | **680/686 VERDE** |
| ESLint (ficheiros tocados) | — | **0 erros** · 9 warnings, todas **pré-existentes** (confirmadas em `ce6fbd3`) |

Um teste pré-existente teve de ser **actualizado**, não removido: `vocabularioUI.test.mjs`
exigia a frase «participar da edição» na Carteira — que vivia no botão do card removido.
A guarda passou a exigir o **par de modalidades** («Lance Relâmpago» … «Lance Programado»),
que é vocabulário aprovado presente. *Motivo registado no próprio teste: a guarda existe
para que não baste apagar o ecrã para passar.*

## 4. Validação em produção — com uma limitação declarada honestamente

Instrumento: percurso do **mapa de chunks** (as páginas são lazy — lição do MC98), 129 chunks.

**CONFIRMADO em produção:**
- chunk `MinhaCarteira-D3rcqiJP.js`: contém «Minha Carteira» e a etiqueta «Saldo Disponível»,
  e **não contém** «Saldo de Senhas», «Dados para Pagamento», «Meus Lances», «Carteira Conectada».
- «MC10 · Growth» **ausente de toda a produção**.
- chunk `MercadoLances-CWv-AHFz.js`: sem o banner («Banner App (800×200)» ausente).
- «Pipeline de lance» e «validada em produção» **ausentes de toda a produção**.
- Contra-prova de que a app é a mesma: texto PT do torneio presente; «Meus Ativos» continua
  na navegação.

**NÃO MEDIDO (o meu instrumento falhou, não o produto):**
- **SEG0 (scroll lateral)** e **SEG1 (ordem das tabs)**: as duas verificações deram FALHA, e
  **a falha é do medidor, não do bundle**. Duas razões medidas:
  1. seleccionei os chunks por CONTEÚDO (`t.includes("Outras Edições")`), e isso apanhou o
     `PrivyRoot` e o `IdiomaContext` (onde a string existe como **chave de dicionário**) em
     vez do chunk do Dashboard;
  2. a ordem das strings dentro de um bundle **minificado** é a ordem de uma tabela de
     strings, não a ordem do código — `Início@130 Carteira@176 Lances@152` não diz nada sobre
     a ordem de `MAIN_TABS`.

Ou seja: o SEG0 e o SEG1 estão provados **em código e por mutação** (testes + MUT1/MUT2), mas
o instrumento de produção não os sabe medir. **Prefiro declarar isto do que apresentar os dois
verdes que eu queria ver.** Correcção fica como pendência (ver §6).

## 5. Análise dos caminhos clicáveis (FOCO do relatório)

`docs/MC99-CAMINHOS-CLICAVEIS.md` — inventário medido: **15 rotas**, **33 navegações**,
**19 `<a href>`**, **112 botões com `onClick`** em 44 ficheiros.

**Problemas identificados:** cinismo nenhum — **um** problema real (P6: «Meus Ativos» a dois
toques de distância, sendo a informação mais consultada) e **uma hipótese refutada**:

> O extractor acusou `<Link to="/vitrine">` **dentro de Vitrine.jsx** → «link para si própria,
> caminho órfão». **Falso.** Está no sub-componente `VitrineDetalhe` (rota `/vitrine/:slot`) e
> é a migalha «← Voltar à Vitrine». A hipótese caiu ao ler 10 linhas à volta.
> **A medição estava certa; a interpretação estava errada** — e é por isso que este documento
> não executou nada. O erro ficou registado em vez de apagado.

**Sugestões priorizadas (nenhuma executada):** (1) «Meus Ativos» na barra e «Configurações»
para «Mais»; (2) cruzar rotas referenciadas × registadas em `App.jsx`; (3) confirmar se os 2
CTAs de `EdicaoDetalhe` (70/142) se sobrepõem; (4) `irParaPainel()` em `SejaNossoParceiro`;
(5) uniformizar links «voltar ao app»; (6) varrer rodapés técnicos.

## 6. Pendências

1. **Instrumento de produção para SEG0/SEG1** — seleccionar o chunk pelo `data-testid`
  (que sobrevive à minificação) em vez de por conteúdo, e não inferir ordem de strings.
2. **Análise de caminhos**: 6 sugestões aguardam decisão do operador. Execução = MC futuro.
3. **Rotas referenciadas × registadas** (`App.jsx`) — não cruzadas. Próximo passo barato.
4. **112 `<button onClick>`** classificados mas não auditados um a um.
5. **`Info` «Cotas disponíveis»/«Exclusividade»** na Vitrine: possível vocabulário de lojista
   exposto ao comum — **ambíguo, não removido**.
6. Herdadas: 8 worktrees antigos · chave Alchemy por rotacionar (R5) · auto-deploy ligado ·
   testes do frontend fora do CI.

## 7. Lições aprendidas

1. **Um guarda que verifica «o primeiro» quando existem DOIS é meio guarda.** O hero de
   SejaNossoParceiro tem dois ramos de render; a minha 1.ª correcção glazou um só, e foi o
   **meu próprio teste** (olhava apenas o primeiro `<motion.header`) que o deixou passar. Só
   quando o teste passou a exigir TODOS é que a correcção incompleta apareceu. **O guarda e o
   defeito nasceram da mesma leitura parcial.**
2. **Documentar a remoção contamina os greps.** Os comentários que registam o que saiu
   («Saldo de Senhas», «MC10 · Growth», «Pipeline de lance») são encontrados por qualquer
   guarda que leia o ficheiro — e o stripper do MC98 não bastava, porque um comentário JSX
   ocupa várias linhas e as continuações não começam por `//`/`*`. Passou a remover-se o BLOCO
   `{/* … */}` inteiro.
3. **`grep` sem contexto produz hipóteses, não conclusões** (§5).
4. **Ao mutar ficheiros CRLF, normalize na leitura.** O mutador abortava com «a mutação não
   alterou nada», que à pressa se confunde com «a guarda não a apanhou».
5. **Prefiro um NÃO MEDIDO declarado a um verde que eu queria ver** (§4).

---

## 8. Veredicto do validador independente (HARD GATE 6)

Validador em worktree próprio, instruído a **TENTAR REFUTAR**. **Não conseguiu refutar A1
(zero regressão), A3 (lint/órfãos) nem A7 (copy intacta) — e refutou A2, A4 e A5.** Sete
defeitos, todos corrigidos no commit `2867cad`:

| # | refutação | o que era | correcção |
|---|---|---|---|
| 1 | **A2 — dado PERDIDO** | `desafiogut@gmail.com` (pagamento Mercado Pago) não existia em sítio nenhum: `grep -rn ... src/` → **0** | nota de uma linha sob o botão de depósito + guarda |
| 2 | **A2 — ACÇÃO perdida** | «↻ Atualizar saldo» **sem substituto** (auto-refresh de 30 s; Sidebar e StatTile não chamam `refetchSaldo`) | botão ↻ compacto no cartão de saldo + guarda |
| 3 | **A2 — alegação falsa** | eu escrevi «Sidebar em todos os ecrãs»; `Layout.jsx:84` faz `{!isMobile && <Sidebar />}` | tabela e sumário corrigidos |
| 4 | **A5 — guarda VÁCUA** | o guarda que substituí em `vocabularioUI` lia o ficheiro **cru**: passava com o par de modalidades **só num comentário** | passa a medir sobre código, com os blocos JSX removidos |
| 5 | **A5 — falso-vermelho** | um `// ...` de **fim de linha** a nomear o que saiu dava RED num ficheiro correcto | stripper passou a cortar `//` de fim de linha (sem comer `://` de URLs) + controlo positivo |
| 6 | **A4 — guarda do cabeçalho** | o revert fiel era morto **por acidente** (contagem de vidros); e um título escrito `{"💰 Minha Carteira"}` — ou posto **depois** do cartão de saldo — passava VERDE | guarda por **contagem**: «Minha Carteira» só pode existir 1× em código, e sem `<h1>` |
| 7 | **A3 — excepção morta** | `buscarClienteDoLeilaoAtivo` continuava na lista `EXCEPCOES` de `vocabularioUI`, protegendo um símbolo que já não existe | removida da lista |

**Um defeito que o validador apontou e NÃO corrigi (declarado):** `docs/validacao-final.md:1150`
continua a descrever «Banner do cliente da cota ativa aparece em /mercado» — **drift de
documentação** criado pelo MC99. Não reescrevi um documento de validação histórico; fica
registado aqui.

> O validador fez o trabalho que a série lhe pede: não confirmou, mediu contra o código, e
> encontrou **dois falsos verdes meus** (a alegação do HARD GATE 4 e um guarda vácuo) mais
> um falso vermelho. Todos os sete achados tinham comando e saída.
> escreve «aprovado» antes de ler o veredicto.
