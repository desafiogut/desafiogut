# UTAC110h — Regulamento v5 no repo + Regras Oficiais no app

**Executor:** Claude Code (Opus 5.5) · **Baseline:** `649ffd1` · **Commit de código:** `db10cc3` · **Tipo:** publicacao
**Spec:** `_logs/UTAC110h.spec.yml` · **SEG-1:** `_logs/UTAC110h_SEG-1_MEDICAO.md`

## Decisões do operador (R18)
- **R18-110h-A** — `/regras-oficiais` publica o **Regulamento v5.0 integral**, lido de `docs/REGULAMENTO-v5.md`.
- **R18-110h-B** — «cotas» sai da lista de termos proibidos (o v5 aprovado usa «Cotas Bronze/Prata/Ouro/Diamante»).
- **R18-110h-C** — A14: «feche o necessário».

## SEG-1 (resumo)
PARADO por 3 condições do próprio enunciado: (1) `regras-oficiais.md` era um documento diferente (v1.0: 1 Passe = 1 ponto, «torneio de habilidade», sem ECOQUILDO, 9 secções); (2) «cotas» proibido mas presente no v5; (3) RAM 432/437/458 MB. Decidido pelo operador (acima). RAM depois de fechar 7 servidores MCP desta sessão: 1625/1637/1638 MB. Baseline **1059/1059 · 1227/1233 VERDE**.
⚠️ O fecho do Claude Desktop da bandeja foi recusado pelo classificador de permissões e não foi contornado.

## FRENTE A — `docs/REGULAMENTO-v5.md`
Gerado por script: cabeçalho (o do enunciado, em bloco `>`) + `---` + o corpo de `docs/GUTO-REGULAMENTO.md` a partir de «REGULAMENTO OFICIAL DO DESAFIOGUT». Asserção no script: corpo novo == corpo da fonte. 17 530 chars (< 30 000); corpo 17 064 chars, sha256 `e6163ee9…`; 72 artigos 1..72; 12 capítulos I..XII.
**Desvio declarado:** o preâmbulo da transcrição e a ERRATA DA FONTE do `GUTO-REGULAMENTO.md` **não** foram copiados — são anotações (o próprio ficheiro diz «NÃO é texto do Regulamento»). O cabeçalho do novo ficheiro aponta para lá.

## FRENTE B — página `/regras-oficiais`
- `RegrasOficiais.jsx` importa `docs/REGULAMENTO-v5.md?raw` e desenha: título + versão/vigência, **sumário** com 12 âncoras (alvos 48 px), 12 capítulos (`h2`), secções (`h3`), 72 artigos, listas, rodapé, «← Voltar ao app». **Zero texto jurídico escrito à mão** (há teste).
- Única transformação: **espaço branco** — 4 frases que o PDF partiu em dois parágrafos (Arts. 20º, 42º, 53º e o rodapé) são unidas com um espaço.
- Legibilidade: vidro `gut-glass--solid` (0,92, regra de leitura do MC25.7); corpo `#c9d3ee` em vez do cinza `#6b7db8` (≈ 4,6:1 — curto para texto legal longo).
- O build põe o texto num chunk lazy próprio (`RegrasOficiais-*.js`); verificado `vite build` para o scratchpad.
- `docs/regras-oficiais.md` marcado **SUBSTITUÍDO** (banner), texto v1.0 à vista (GATE 15).
- **B3:** os links já existem (menu «Mais», Sidebar, Ofertas Programadas, acesso rápido «Regras» do Início) — nada a acrescentar.
- **Capturas** (build local servido em `127.0.0.1:4173`, contexto de browser isolado e descartável, consentimento do gate injectado **só nesse contexto local**): `_logs/utac110h-browser/regras-375.png` e `regras-1280.png`. Overflow lateral **0** nas duas; 0 alvos < 48 px **dentro da página** (os 8 < 48 px medidos são do rodapé/barra do layout, pré-existentes). A faixa vermelha «rede Sepolia» é do servidor local sem env vars.

## FRENTE C — teste
O `netlify/functions/_tests/mc106h-regras.test.mjs` do enunciado **não existe**; o real é `desafio-gut/frontend/src/pages/__tests__/utac106h-regras.test.mjs` — reescrito (14 → 19 testes):
fonte única (corpo do repo == corpo do GUTO) · cabeçalho · página sem texto jurídico à mão · **todos os 136 parágrafos** na página (fecha o «ponto cego D» do UTAC106h, que era amostra de 21 factos) · 1 `h1` · 12 capítulos pela ordem · 72 artigos 1..72 · sumário · parser (uniões e itens) · termos proibidos/obrigatórios · **bidireccional**: o mesmo verificador reprova o `REGULAMENTO-v4.md` e as Regras v1.0 · «Cotas» não é violação (R18-110h-B) · factos Play · rota e links.
Erro do meu instrumento: estimei «> 150 parágrafos» sem medir; medido 136 → limiar `>= 130`.
**Mutação 6/6 PROVADOS** (`_logs/UTAC110h_SEG2_MUTACAO.txt`; restauro md5 idêntico): M1 texto do doc muda (1 RED) · M2 capítulo apagado (3) · M3 parser perde itens (3) · M4 sem uniões (1) · M5 página volta ao v1.0 (10) · M6 sumário sem âncoras (1).

## FRENTE D — coerência cruzada
| par | resultado |
|---|---|
| `REGULAMENTO-v5.md` ↔ `GUTO-REGULAMENTO.md` | **iguais** (corpo byte a byte; teste) |
| página ↔ `REGULAMENTO-v5.md` | **iguais** (todos os parágrafos; teste) |
| GUTO (`guto-regulamento.mjs`) ↔ `GUTO-REGULAMENTO.md` | iguais (guarda `mc963`, existente) |
| 12 capítulos / 72 artigos | batem nas 3 |

**Divergências fora do âmbito — ESCALADAS (não corrigidas):**
1. ⚠️ **GUTO** `_lib/guto-perfis.mjs:367-368` — o intent de indicação promete «**+1 senha**» por amigo; o v5 (Art. 51º) dá **ECOQUILDO** (2 + 1) e o código (110f) dá +50 pontos de lance. Contradiz o Regulamento. Proibido tocar aqui → UTAC próprio.
2. `guto-perfis.mjs:70, 338, 352-360` — perfil corporativo fala em «Painel Lojista»/«cotas comerciais» (residual já declarado no 110c-1; o lojista saiu no 108f).
3. `src/pages/Privacidade.jsx:77` — «torneio de habilidade» numa página legal.
4. `useResgatarCartao.js:26` e `resgatar-cartao.mjs:187` — «pontos **de compra**»; o v5 diz «pontos de fidelidade».
5. Factos do v5 **não implementados** que a página passa a afirmar: Passe só por **Google Play Billing** (Art. 52º → 110i); cartão «adquirido» com PIX (Arts. 9º/53º) vs resgate por débito de 50 pontos; perda de acesso às métricas (Arts. 21º/32º). O v5 diz «vigente a partir de 02/11/2026» no topo da página.
6. `App.jsx:388` — comentário ainda diz «fonte: docs/regras-oficiais.md» (App.jsx fora do AUTORIZA).

## SEG4 — verificação
Suíte **frontend VERDE 1064/1064 · backend VERDE 1227/1233** (1059 − 14 + 19 = 1064 ✓). ⚠️ A RAM tinha descido para **1128 MB** antes desta corrida (abaixo do limiar A14); o resultado é verde e fica declarado.

## Não tocado
`docs/GUTO-REGULAMENTO.md`, `_lib/guto-perfis.mjs`, `_lib/guto-regulamento.mjs`, backend, contrato, gate legal, env vars, `EM_BREVE_MODE`, `package*`.

## SEG5 — validador adversarial: APROVADO COM RESSALVAS, 0 bloqueantes
Veredicto integral: `_logs/UTAC110h_SEG5_VALIDADOR.md` (subagente independente, worktree próprio via helper A13, removido; node_modules reais intactos 498/414). Confirmou: corpo v5 == GUTO (cmp, sha256 `e6163ee9…`), página com as mesmas 2728 palavras pela ordem, nenhum ficheiro proibido tocado, texto jurídico inalterado, capturas existem.
**Ressalvas fechadas (depois do veredicto, NÃO re-validadas):**
- o teste de cobertura usava `includes` (presença) → novo teste de **igualdade da sequência de palavras** página == documento; mata texto duplicado (V-M1) e cláusula inventada (V-M3);
- alvo de toque de 16 px sobrevivia → nova guarda de 48 px (V-M5). Erro meu: a 1.ª regex atravessava o objecto e o V-M5 sobreviveu; corrigida;
- rodapé e «Voltar ao app» estavam fora do vidro (2,71:1 sobre fundo claro) → passaram para dentro de um `GlassCard` sólido.
Mutação 2.ª ronda **9/9 PROVADOS** (`_logs/UTAC110h_SEG5b_MUTACAO.txt`). Um mutante do validador (rodapé fora do vidro) não entrou na minha bateria porque a forma que escrevi deixava o JSX inválido — falharia pelo motivo errado; declarado.
⚠️ **Escalado (achado do validador, eu não o tinha visto):** o **gate legal** `TermosConsentimento.jsx` — o texto que o utilizador ACEITA — continua com o regulamento antigo («senhas» nas l. 115 e 130; Arts. 14/20/37 com numeração diferente do v5). Fora do AUTORIZA («NÃO tocar gate legal»).
Não re-capturado: o rodapé dentro do vidro não aparece nas 2 capturas (elas mostram o topo e o Cap. III).

## SEG6 — suíte final
**frontend VERDE 1066/1066 · backend VERDE 1227/1233**; RAM antes da corrida 1330 MB (< 1 500, A14 — resultado verde, declarado).
