# MC94 — RELATÓRIO

**Data:** 2026-09-25 · **Alvo:** alargar a tela "Meus Ativos" com as secções do
torneio de habilidade · **Uma só tela**, sem rota nova, sem página nova, sem tocar
na navegação.
**SEG-1: AJUSTAR** · **Validação independente (1.ª ronda): REPROVADO** ·
**Spec:** `docs/TORNEIO-HABILIDADE.md` §4f · **Logs:** `_logs/MC94_*`

---

## O que foi entregue

| ficheiro | natureza |
|---|---|
| `src/pages/MeusAtivos.jsx` | **alterado** — inserção aditiva entre estatísticas e filtros |
| `src/components/meus-ativos/_estilo.js` | novo — paleta, guardas sem coerção, caixa |
| `src/components/meus-ativos/PainelTorneio.jsx` | novo — 5 estados |
| `src/components/meus-ativos/ProgressoBonus.jsx` | novo — 4 estados |
| `src/components/meus-ativos/EstadoBonus.jsx` | novo — 4 estados |
| `src/components/meus-ativos/FeedbackLance.jsx` | novo |
| `src/components/meus-ativos/RankingCiclo.jsx` | novo |
| `src/hooks/useRanking.js` · `src/hooks/useFeedback.js` | novos — todo o I/O |
| `src/i18n/{pt,en,es}.js` | **+51 chaves `ativos.*` em cada**, paridade verificada |
| `__tests__/_render.mjs` · `__tests__/componentes.test.mjs` | arnês + 54 testes |
| `src/pages/__tests__/` (+4 duplos) | 23 testes de página, incl. cablagem |
| `src/hooks/__tests__/_hook-runner.mjs` + `hooks-torneio.test.mjs` | condutor + 24 testes |

**101 testes · 101 verdes · 0 falhas · 0 saltados.** Mutação: **39/39 mortos**, com controlo negativo verde e controlo positivo morto. Build verde. `eslint` sem erros
(1 aviso `cardPad`, **pré-existente** — está em `HEAD`).

## HARD GATES

| gate | estado | prova |
|---|---|---|
| 2 — uma só tela | ✅ | zero ficheiros novos em `pages/`, zero rotas, `App.jsx` e as três navegações intactos |
| 3 — TDD por renderização real | ✅ | `vite` + `react-dom/server`; hooks a correr num condutor de `ReactCurrentDispatcher` com `fetch` duplicado e `apiGet` **real** |
| 4 — captura em produção | ✅ | três capturas em `_logs/`: antes (defeitos visíveis), depois, e estado vazio |
| 5 — zero regressão | ✅ | 4 estatísticas, cabeçalho, rodapé (Art. 26/Art. 8), 3 filtros e o convite a entrar todos assertados na página renderizada |

## Os defeitos que a validação independente encontrou (e o que os causou)

A minha suíte tinha **35 verdes e 0 falhas** ao mesmo tempo que tudo isto era
verdade. Sexto MC seguido em que a independência encontra o que eu não vi.

| | defeito | o que o causou |
|---|---|---|
| ⛔ | `reais(null)` → **"R$ 0,00"**, e o lance nulo era eleito "menor único seu · vale 3 pontos" | `Number(null) === 0`. **A armadilha exacta do MC93-A**, reproduzida por mim na UI |
| ⛔ | `ProgressoBonus`/`EstadoBonus` sem estados: um **anónimo** lia "0 / 5 acertos seguidos · Faltam 5 acertos" e "Nenhum bónus conquistado" | escrevi os quatro estados no `PainelTorneio` e não os levei às outras duas |
| ⛔ | `ProgressoBonus` declarava "Bónus conquistado!" a partir de conta **local**, contradizendo o `EstadoBonus` ao lado | derivar do ecrã o que só o livro-razão sabe |
| ⛔ | `senhasACreditar: Infinity` → **"Infinity senhas"**; `1e21` → **"1e+21 senhas"** | `Number(x) \|\| 0` |
| ⛔ | com empate no menor valor, só **um** dos empatados era marcado | escolher um arbitrariamente em vez de marcar todos |
| ⛔ | asserções fracas (`/0/`, `/3/`, `/1/`, `/25/`) casavam em qualquer dígito | testar o número, não a frase |
| ⛔ | V22/V23/V24 — cablagem não assertada: o duplo dos hooks **ignorava os argumentos** | duplo permissivo, a 4.ª vez no projeto |

## Os defeitos que eu encontrei ao escrever os testes que ela exigiu

| | defeito | como apareceu |
|---|---|---|
| ⛔ | **o `index.html` com status 200 passava por resposta válida** nos dois hooks | escrevi o teste antes de olhar; `netlify.toml:34` reescreve `/*` → `index.html` com 200 e o `apiGet` devolve `ok:true, data:null` |
| ⛔ | `totalReal` aplicado a **metade dos ramos**: o ramo `else` (o caso comum) continuava a escrever `total` cru → "0 participantes." sob 4 linhas | a minha própria correcção anterior, incompleta |
| ⛔ | "a carregar" e "não há dados" **na mesma frase**: um `feedback` nulo mostrava "A carregar…" para sempre | `if (carregando \|\| !feedback)` |
| ⚠️ | o fundo das secções não tinha teste nenhum | só a captura o via; agora há bloco de aparência |

## ⛔ ERRATA a uma afirmação minha

`_render.mjs` afirmava que os ficheiros de teste **colidem** em paralelo
(`# fail 2`). **Falso.** Remedido: 91/91 verdes, 3 corridas de 3, sem
`--test-concurrency=1`. O `# fail 2` era real; a causa era a heap estourada pelo
`BotaoLoginPrincipal` sem duplo (2,68 MB de Privy), não colisão. Diagnostiquei de
**uma** observação — o mesmo erro que o MC93-E me apanhou a fazer com a cache do
ethers.

## Lições de método

- **Um duplo que ignora os argumentos torna a cablagem invisível.** Um componente
  correcto ligado a `undefined` renderiza o estado "sem dados" e a suíte fica
  verde. É a 4.ª forma que este projeto encontra da mesma família (MC93-B, -C, -D).
- **Um duplo de `apiGet` teria escondido o defeito do `index.html`.** Duplicar o
  `fetch` e deixar o `apiGet` real correr foi o que o expôs.
- **A sonda precisa de controlo positivo, e o condutor de hooks é uma sonda.** A
  comparação de dependências é minha, não do React; os quatro controlos positivos
  (deps `[]`, deps certas, efeito sem limpeza, `AbortSignal` honrado) são o que
  torna o instrumento defensável.
- **Um teste não vê o que uma captura vê** — mas depois de a captura ver, dá-se-lhe
  um nome e prende-se.
- ⛔ **Duas rondas de mutação em paralelo sobre a mesma árvore contaminam-se.** Eu
  lancei a segunda a julgar a primeira morta (a saída estava vazia por
  tamponamento, não por fim) e o controlo negativo falhou com um mutante da outra
  aplicado. **É textualmente a lição do MC93-C**, repetida por mim seis MCs depois.
  Sinal que enganou: `wc -c` a zero **não** significa processo morto.

## Prova de mutação

39 mutantes desenhados sobre a lógica que carrega peso, não sobre sintaxe ao acaso.
**39 mortos, 0 vivos, 0 não-aplicados**, com controlo negativo (a suíte tem de estar
verde antes de mutar) e controlo positivo (defeito trivial: tem de morrer).

O arnês traz dentro três regras que este projeto pagou:

1. **Assertar que o ficheiro mudou no disco.** No MC93-B duas mutações
   "sobreviveram" sem nunca terem sido aplicadas (delimitador do `sed`, padrão com
   LF). Aqui, se os bytes não mudarem, o resultado é `NÃO-APLICADA`, nunca `VIVO`.
2. **Critério de morte completo:** `# fail` **e** `# cancelled` **e** `^not ok` **e**
   `pass == 0`. No MC93-G o meu arnês lia só o primeiro e declarou vivo um mutante
   que tinha morrido — o 5.º falso sobrevivente dessa família no projeto.
3. **Os dois controlos.** No MC93-C um controlo positivo que não morria revelou que
   nada testava concorrência. Aqui o controlo negativo apanhou a contaminação entre
   as duas rondas paralelas, antes de qualquer resultado ser lido.

Na 1.ª ronda sobreviveram dois — **nenhum equivalente**, ambos lacunas reais dos meus
testes:

| mutante | porque sobreviveu |
|---|---|
| `reais()` a devolver `"R$ 0,00"` em vez de `"—"` | `FeedbackLance` filtra com `valorUtilizavel` **antes** de chamar `reais`, logo o ramo de recusa do `reais` nunca corria. A guarda existe em dois sítios e eu só testava o de fora. |
| `sequenciaCompleta = faltam === 0` (sem `&& feitos > 0`) | os meus casos a zero tinham sempre `faltam: 5`. Nunca testei as duas condições juntas — que é exactamente o caso que a segunda existe para travar. |

Fechados com testes novos (o contrato de `_estilo.js` testado directamente, e
`sequenciaAtual: 0` **com** `faltamParaBonus: 0`) e mortos na 2.ª ronda. **39/39.**

## Produção

Deploy automático do `68a09a5`, `state: ready`. Verificado no **DOM vivo**, não no
bundle: as cinco secções com `rgba(13, 18, 53, 0.92)` e `backdrop-filter: none`, e as
três pessoais em `data-estado="sem-sessao"`. O endpoint devolve
`200 application/json {"total":0,"ranking":[]}`.

> ⚠️ E o defeito que este MC corrigiu quase me enganou a mim durante esta própria
> verificação: pedi um chunk com o nome do **meu** build local, recebi **200 com
> `text/html`** (o fallback SPA) e quase concluí que o vidro sólido não tinha sido
> deployado. O Netlify constrói com outro env, logo outro hash. A verificação certa
> era ler o DOM.

As 4 linhas sintéticas de `rankings_ciclo` (inseridas no MC93-F para provar que o
endpoint **lê** a tabela) foram removidas depois da captura. As duas tabelas do
torneio estão a zero.

**Capturas** em `_logs/`: `MC94_captura-producao-ANTES-e3d8791.png` (os defeitos
visíveis), `MC94_captura-producao-meus-ativos.png` (corrigido, ranking com dados) e
`MC94_captura-producao-ciclo-vazio.png` (o estado vazio, que não parece avaria).
Nenhuma mostra endereço real, token, e-mail ou dado pessoal (R4).

## O que ficou por fazer, e é material

- **Nenhuma rodada real.** O leilão está travado (`EM_BREVE_MODE`) e as duas tabelas
  do torneio estão vazias. Tudo o que se viu com dados foi com linhas sintéticas.
- **O estado COM SESSÃO nunca foi observado em produção** — o login é OAuth Privy,
  não automatizável (limitação registada desde o MC39.3.1). Está coberto por testes,
  não por captura.
- **Estas correcções não passaram por uma segunda validação independente.**
- **`EvolucaoPontos` não foi entregue**: `pontuacoes` tem 0 linhas e 0 ciclos
  distintos. Não há série temporal para desenhar.
- **O resíduo visual fica registado, não alterado.** Com `rgba(13,18,53,0.92)` — o
  valor **do projeto** — os 8% restantes deixam passar a ilustração de fundo por
  baixo do ranking. O texto lê-se. Mudar o valor é identidade visual, que é o MC98 e
  não está autorizado aqui. Foi a inventar um valor novo que eu errei da 1.ª vez.

## 2.ª validação independente: REPROVADO

Dois ⛔, ambos alcançáveis em produção, ambos a **mesma** falta — afirmar um facto
sobre uma pessoa que a app não identificou — nos sítios onde a lição da 1.ª ronda
**não** tinha sido aplicada.

| | defeito | comentário |
|---|---|---|
| ⛔ | `FeedbackLance` dizia a um anónimo "Ainda não há lances seus nesta edição." | **estava na captura que eu tirei e olhei** |
| ⛔ | a janela do `authToken` (~2 s) mandava entrar quem já entrara, e mostrava-lhe os lances ao lado | o projeto já o tinha documentado e corrigido noutro sítio (MC88.39) |
| ⛔ | "Sequência completa" era código morto; quem fechava 5 acertos lia "0 / 5 · Faltam 5" | o backend nunca manda `faltam: 0` |
| ⚠️ | `inteiroSeguro` em 2 de 3 sítios · 5.º estado em 1 de 2 · `valorUtilizavel` mais frouxo | três meias correcções minhas |
| ⚠️ | o condutor de hooks engolia escritas pós-desmonte | duas asserções minhas eram **vácuas** |
| ⚠️ | dicionário ≠ fallback · chave órfã com a frase proibida · copy pt-PT num app pt-BR | os testes leem o fallback |

**137 testes · 137 verdes.** Mutação: 64 mutantes, **63 mortos**; o sobrevivente era
equivalente por redundância minha, e a redundância saiu do código.

### O que aprendi que vale para lá deste MC

- **Uma lição aplicada a alguns sítios não é uma lição aplicada.** Três instâncias
  num só MC, e a quarta secção pessoal foi para produção a mentir porque eu tinha
  corrigido as outras três e dado o assunto por fechado.
- **Olhar para a captura não é vê-la.** O ⛔1 estava visível na imagem que eu tirei,
  descrevi e commitei. Uma captura só mede alguma coisa quando é confrontada com
  uma regra escrita — foi o validador que a leu contra a regra que eu próprio
  escrevera.
- **Um instrumento pode ter um ponto cego exactamente onde promete ver.** O condutor
  engolia a fuga que os seus próprios testes diziam procurar; o controlo positivo
  cobria a metade errada da afirmação.
- **Um teste que não mata o mutante pode estar a testar a janela errada.** A minha
  primeira correcção falhou porque usava respostas lentas, que o `abort` rejeita —
  o caminho que o `catch` já tratava, não o que a guarda existe para travar.
