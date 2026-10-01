# UTAC105b — Review Report (Opus)

> Revisor: Claude Opus 5.5 · Data: 2026-09-30 · Skill lida: versão 1.0 (`review/VERSAO.md`)
> Fontes lidas: `_logs/UTAC105b_*` + spec + relatório (**9 ficheiros .md/.yml**; + `_MIGRACAO.sql` e 2 saídas `.txt`) · relatório `_logs/UTAC105b-RELATORIO.md`
> (= `Desktop/UTAC105b-RELATORIO.md`) · diff `5cac238..5e7ed24` (4 commits `--grep=UTAC105b`, **29 ficheiros**, +1164/−6)

## 1. Veredicto
Seguiu a skill (spec de 41 l., SEG-1 com conflitos e paragem antes do SEG0, frentes A→B→C, mutação 27/27, validador, R18 em 3 lugares). Os custos
vieram de **instrumentos** (duplo de auth permissivo, verificador de bundle parcial, escapes em scripts gerados), não do produto. O que mais vale
aprender: **um duplo permissivo de autenticação escondeu um ramo de código morto que a decisão do operador exigia** (R18-B).

## 2. Padrões bons (manter)
- SEG-1 mediu antes de tocar e transformou 7 conflitos em perguntas ao operador antes do SEG0 — evidência: `_logs/UTAC105b_SEG-1_MEDICAO.md:20-27` (conflitos), `:31-36` (R18-A..E).
- Premissa falsa do enunciado medida e declarada, não contornada em silêncio (`_lib/voucher.mjs` não existe) — `_logs/UTAC105b_SEG-1_MEDICAO.md:7`, `_logs/UTAC105b-RELATORIO.md:18`.
- Prova de mutação num script versionado, com «ENTROU» confirmado e restauro byte a byte — `scripts/utac105b-prova-mutacao.mjs` (commit `0811c2b`); 1.ª ronda honesta 6/7 registada — `_logs/UTAC105b_SEG0.md:17`.
- Validador adversarial produziu um achado real (⛔-1) e o executor corrigiu com o módulo de auth REAL em vez de reforçar o duplo — `_logs/UTAC105b_SEG3_VALIDADOR.md:8-13`, `_logs/UTAC105b_SEG3b_CORRECCOES.md` (linha ⛔-1).
- Falha do próprio instrumento declarada e não apagada (SEG5 VERMELHO 7/9 → 2.º instrumento BFS) — `_logs/UTAC105b_SEG5_VERIFICACAO.md:8-14`.
- Concorrência testada com `Promise.all` em todas as camadas (repositório, endpoint, compra) — `_logs/UTAC105b_SEG2.md` (C6), `_logs/UTAC105b_SEG1.md` (B8).

## 3. Padrões maus (evitar)
- **Duplo permissivo de autenticação** — o teste B5 usava o token `"admin-tk"` (não-JWT) com um `autenticarAdmin` duplo que aceitava a string; o real
  `verificarUserSession` aceita `admin-access` (`netlify/functions/_lib/jwt.mjs:81`) e o ramo admin era inalcançável — `_logs/UTAC105b_SEG3_VALIDADOR.md:9-12`.
  Custo: 1 ronda do validador + reescrita do teste; a R18-B estava por cumprir com a suíte verde.
- **Verificador de produção com alcance parcial** — o 1.º script leu só o chunk de entrada `index-*.js` e acusou 2 falhas falsas — `_logs/UTAC105b_SEG5_VERIFICACAO.md:11`. Custo: 2.º instrumento.
- **Heredoc/template JS para gerar scripts** — `\n` virou quebra real 2× (SyntaxError antes de mutar) — `_logs/UTAC105b_SEG2.md:22`, `_logs/UTAC105b_SEG3b_CORRECCOES.md:13`.
  Já estava proibido em `protocol/ambiente.md:16` («Nunca usar backticks nem heredoc») — a regra existia e não foi seguida.
- **Mutante equivalente/fraco aceite na 1.ª ronda** — C-M5 «lojista fixo» só morria por C4 porque usava o mesmo lojista do teste — `_logs/UTAC105b_SEG2.md:21`; o validador mostrou-o (V7).

## 4. Novas regras sugeridas
| ID provisório | categoria | texto (1-2 linhas, imperativo) | origem (evidência) | já coberta por? |
|---|---|---|---|---|
| T-novo-1 | T | Testar autenticação/autorização com o módulo e os tokens REAIS (só a lista de admins/segredo fixados); um duplo de auth tem de recusar o que o real recusa e aceitar o que o real aceita. | UTAC105b — `_logs/UTAC105b_SEG3_VALIDADOR.md:9-12` | parcialmente T3 (fala só de duplo «mais estrito») |
| T-novo-2 | T | Verificar o bundle servido por BFS de todos os chunks a partir do `index.html`, com controlo + (string conhecida) e − (inventada); nunca só o chunk de entrada. | UTAC105b — `_logs/UTAC105b_SEG5_VERIFICACAO.md:11-14` | não (ST10 fala de mock no bundle, não de alcance) |
| A-novo-1 | A | Script gerado por ferramenta: correr `node --check` antes de executar; nunca gerar código com escapes através de heredoc/template. | UTAC105b — `_logs/UTAC105b_SEG3b_CORRECCOES.md:13` | parcialmente `protocol/ambiente.md:16` (prosa, não regra A) |

## 5. Novas lições sugeridas
| # provisório | secção de `licoes.md` | lição (1-2 linhas) | origem |
|---|---|---|---|
| L-novo-1 | Sobre o que corre mal | **Suíte verde não prova uma decisão do operador** — a R18-B tinha teste e o ramo era código morto; uma decisão nova pede um teste que a exerça pelo caminho real. | UTAC105b — `_SEG3_VALIDADOR.md:6` |
| L-novo-2 | Sobre o que corre mal | **Um mutante que coincide com o dado do teste é equivalente** — fixar o valor que o próprio teste usa não prova nada; variar o dado (2.º lojista). | UTAC105b — `_SEG2.md:21`, V7 do validador |
| L-novo-3 | Sobre como trabalhar | **Regra em prosa não é seguida** — a proibição de heredoc vivia em `ambiente.md` e foi violada 2×; o que importa vira regra com ID. | UTAC105b — `_SEG3b_CORRECCOES.md:13` |

## 6. Para o próximo UTAC
- Em qualquer endpoint com ramo admin: teste com `assinarAdminAccess` real + `autenticarAdmin` real (só `getAdminAddresses` fixado), incluindo «ex-admin → 403».
- Verificação de produção do frontend: usar `scripts/utac105b-verificacao-bundle-bfs.mjs` como molde (BFS + controlos), não o `verificacao-adhoc`.
- Gerar scripts com a ferramenta de escrita de ficheiros (não heredoc) e `node --check` antes de correr.
- ⚠️ Produto: com 0 cupons em produção toda a compra de Passe dá 409 (`_logs/UTAC105b-RELATORIO.md:28`) — o UTAC105c/d tem de contar com isso.

## 7. Notas de contexto
- **Conflito de interesse:** este review foi escrito pela mesma sessão (Claude Opus) que executou o UTAC105b — é o teste do mecanismo (UTAC000.2, Frente D), não o caso de uso alvo (executor DeepSeek/Hermes, revisor Opus). O operador deve pesar os «padrões bons» com isso em conta.
- Não lido/não medido: o código em si além do diff `--stat` e dos trechos citados nos logs; o UTAC105b.1 (em curso, outro executor); a produção.
- Numeração: o enunciado do UTAC105b chama SEG3 ao validador; `segments/` da skill chama-lhe SEG4 — divergência de nomenclatura, sem efeito no trabalho.
- Sugestões a rejeitar se o operador preferir: A-novo-1 pode ser só um reforço de `ambiente.md` em vez de regra nova.
