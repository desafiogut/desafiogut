# UTAC110h.1 — Pendências do 110h: gate legal + GUTO + vocabulário

Executor: Claude Code (Opus 5.5) · 2026-10-14 · baseline `ec2028d` · tipo `saneamento`
SEG-1: `_logs/UTAC110h.1_SEG-1_MEDICAO.md` (A14, inventário, 5 conflitos, decisões R18-110h.1-A..E).

## Decisões do operador (R18) — registadas em 3 lugares (este log, relatório do Desktop, R14 do CLAUDE.md)
| ID | Decisão |
|---|---|
| R18-110h.1-A | A14: fechar o necessário (MCP sem uso + Claude Desktop) → RAM 630 → 1 566-1 578 MB |
| R18-110h.1-B | Subir `VERSAO_CONSENTIMENTO` 2.0 → **3.0** + 1 linha em `_lib/consentimento.mjs` (`VERSAO_GATE`) |
| R18-110h.1-C | GUTO diz **o que o app faz** (+50 pontos de lance); ECOQUILDO do Art. 51º = pendência. **Substitui a R18-110h.1-2 do enunciado** |
| R18-110h.1-D | Corrigir também Meus Ativos («🏆 Competição de habilidade»): `pt.js`, `PainelTorneio.jsx` + guardas |
| R18-110h.1-E | Liberar `/regras-oficiais` em `Boot.jsx` (ROTAS_PUBLICAS) — sem isto o link do gate devolvia o gate |
| (executor) | Conflito 5: manter as 4 caixas e as 4 chaves `{lido, maiores, termos, privacidade}` (o backend exige-as); muda só o texto |

## FRENTE A — Gate legal (`src/components/TermosConsentimento.jsx`)
- O resumo do v4 (16 blocos: «senhas», PIX/BB, Arts. 7/8/20/21/24/26/29/37…) foi substituído por **12 blocos LITERAIS do v5.0**:
  Arts. 1º, 2º, 5º, 6º, 8º, 9º, 14º, 27º, 47º, 49º, 65º, 66º + «Regras completas (12 capítulos, 72 artigos) em [Regras Oficiais](/regras-oficiais)».
  **Zero texto jurídico novo**: um teste exige que cada bloco seja trecho literal do artigo que cita.
- Vigência: 5/10/2026 → **2 de novembro de 2026** (v5 Art. 4º / cabeçalho).
- 4 caixas, mesmas chaves e semântica; textos ao v5: «regulamento completo … (Regulamento Oficial v5.0), disponível em Regras Oficiais» (link) ·
  «18 anos ou mais (Art. 5º) … (Art. 65º)» · «cada Passe Desafio de R$ 2,00 concede 10 pontos de fidelidade (Art. 8º) e a Oferta Relâmpago
  é uma competição de habilidade — vence o menor lance único (Art. 14º)» · «… Política de Privacidade (LGPD/GDPR) e cedo minha imagem conforme Art. 66º».
- Linha da caixa com `minHeight: 44px` (alvo de toque). Estilo `lista` morto removido; `link` novo.
- `VERSAO_CONSENTIMENTO` "2.0" → **"3.0"**; `_lib/consentimento.mjs` `VERSAO_GATE` "3.0" (R18-B). `Boot.jsx`: `"/regras-oficiais"` em `ROTAS_PUBLICAS` (R18-E).
- Sem «senha», «torneio», Portaria, agência/conta (medido no código e no HTML renderizado).

## FRENTE B — GUTO (`netlify/functions/_lib/guto-perfis.mjs`, intent `indique_e_ganhe`)
- 4 perfis: «+1 senha» → **«+50 pontos de lance» para o indicante e o indicado**, «até 10 indicações (creditadas) por mês» (comum/corporativo/admin);
  saiu «senhas ganhas: N» do texto (o campo `senhas_ganhas` continua na API do `referral`, não tocada).
- Números amarrados às constantes `PONTOS_INDICACAO`/`LIMITE_INDICACOES_MES` de `_lib/fontes-lance.mjs` (lidas da fonte pelo teste).
- ⚠️ **Divergência v5 ↔ app declarada:** o v5 Art. 51º diz 2 ECOQUILDO (indicante) + 1 (indicado); o app credita pontos de lance e o
  ECOQUILDO por indicação **não está ligado** (pendência do UTAC110e). Por R18-C o GUTO não promete o que o app não dá.

## FRENTE C — Vocabulário
| sítio | antes | depois |
|---|---|---|
| `src/pages/Privacidade.jsx:77` (enunciado dizia `:125`) | plataforma de **torneio** de habilidade | plataforma de **competição** de habilidade |
| `src/i18n/pt.js:60` + `PainelTorneio.jsx:31` (Meus Ativos) | 🏆 Torneio de habilidade | 🏆 Competição de habilidade |
| `src/hooks/useResgatarCartao.js:26` (402) | 50 pontos **de compra** | 50 pontos **de fidelidade** |
| `netlify/functions/resgatar-cartao.mjs:187` (402) | pontos de compra | pontos de fidelidade |
- Restantes ocorrências = comentários/testes (BAIXA), não tocadas.
- ⚠️ Nuance declarada: o cartão conta só os pontos **de COMPRA** (R1 do UTAC106f); com a palavra «fidelidade», um titular com
  48 de compra + 2 de palpite lê «precisa de 50 pontos de fidelidade» tendo 50 no total. O v5 Art. 35º sustenta a regra
  («os pontos de fidelidade obtidos com a compra … contam para o resgate»); a copy fica como o operador decidiu (R18-110h.1-3).

## Contratos de teste actualizados (invariante preservada, texto antigo à vista no histórico)
| teste | o que fixava | agora |
|---|---|---|
| `citacoesRegulamento` | blocos do gate = v4 por palavras-chave | blocos = **trecho LITERAL** do v5 + bidireccional (blocos do gate v4 reprovados) + vigência + link nos 2 sítios + rota pública; o teste dos «outros ficheiros» (v4, P4) fica igual |
| `dadosPagamento` | PIX/agência do v4 no gate | gate **sem** dados bancários/PIX/gmail pessoal (v5 Art. 54º) + contacto = Art. 69º; guardas do suporte e do PIX dinâmico intactas |
| `artigosUI` | gate julgado contra o v4 | gate julgado contra o v5 (`EXIGIDO_V5`, mapa verificado no v5); resto da UI continua v4; «torneio de habilidade» saiu do Art. 1 |
| `mc9951` · `106b` · `106c` | «O MENOR LANCE ÚNICO GANHA» (v4 Art. 7) | «vence o menor lance único (Art. 14º)» (v5) |
| `glossario` | PT exige «torneio de habilidade» | PT exige «competição de habilidade» |
| `utac106g-resgate` | «pontos de compra» no 402 | «pontos de fidelidade» |
| `mc104-consentimento` (backend) | `versao: "2.0"` | `lib.VERSAO_GATE` (o literal "3.0" fica fixado no teste novo) |

## Testes novos
- `src/__tests__/utac110h1-gate-render.test.mjs` (4) — gate REAL no condutor de hooks: 4 caixas → botão liga → grava `versao:"3.0"` + 4 declarações; **bidireccional**: 3 de 4 ⇒ desligado e nada gravado; HTML sem vocabulário antigo.
- `src/__tests__/utac110h1-vocabulario.test.mjs` (4) — varredura de `src/` + endpoint: 0 «torneio de habilidade»/«pontos de compra» visíveis; frases antigas verbatim reprovadas; versão 3.0 nos dois lados.
- `netlify/functions/_tests/utac110h1-guto-indicacao.test.mjs` (4) — 4 perfis sem «senha», com «+50 pontos de lance», sem ECOQUILDO, limite = constante; respostas antigas verbatim reprovadas.

## Suíte (harness `mc966`, foreground, RAM ≥ 1 500)
- Baseline: **1066/1066 · 1227/1233**. Depois: **1076/1076 · 1231/1237 VERDE** (+10 / +4).

## Prova de mutação (`scripts/utac110h1-prova-mutacao.mjs`, baseline verde exigida)
- 1.ª corrida: **16/16 MORDERAM** (M1–M15 + M7b), restauro sha256 idêntico.
- Depois do SEG4: **20/20** (M16 X1 · M17 X9 · M18 X10 · M19 «funcionamento do torneio»).

## SEG4 — Validador adversarial (`_logs/UTAC110h.1_SEG4_VALIDADOR.md`): **APROVADO COM RESSALVAS, 0 bloqueantes**
Reproduziu a suíte (1076/1076 · 1231/1237) e a mutação (16/16). Os 12 blocos foram conferidos um a um contra o v5: todos são trechos literais, com o artigo certo. (a)–(d), (f), (g), (i), (j) não refutados.
Tratado depois do veredicto (**não re-validado** por 2.ª ronda):
- Mutantes sobreviventes **X1** (pontos na caixa «termos»), **X9** (+50 do GUTO corporativo) e **X10** (limite do GUTO admin) → testes novos + M16–M18.
- ℹ️ `Privacidade.jsx:126` «funcionamento do torneio» → «funcionamento da competição» (era a linha que o enunciado apontava) + M19 + guarda.
Declarado, fora do escopo autorizado:
- ⚠️ **W1:** «+1 senha» por indicação continua noutros 3 sítios, o que contradiz o GUTO novo: `PainelIndicacao.jsx:87,163` (Carteira), `ChatbotWidget.jsx:183` («Senhas ganhas»), `_lib/referral.mjs:146,148` (notificação). → **UTAC próprio.**
- **X7** (pré-existente): não há teste de comportamento do `Boot.jsx`; `rotaPublica` sempre verdadeiro passaria.
- **X11:** a caixa de contacto do gate (telefone e site, pré-existentes) não está no v5; o Art. 69º diz «exclusivamente» e-mail.
- `/privacidade` ainda diz «senhas» (:78, :99, :108); `pt.js:100` diz «regra do torneio».
- `/regras-oficiais` carrega o shell completo (Privy, navegação) sem consentimento; ao navegar dali, o gate volta (`includes` exato).
- A caixa «maiores» mantém «capacidade civil plena» (texto pré-existente, não está no v5).
- O ECOQUILDO por indicação (v5 Art. 51º) continua por ligar no backend.

## Suíte final: **frontend 1077/1077 · backend 1232/1238 VERDE**
RAM livre medida no arranque desta corrida: 1 157 MB, abaixo da A14 (declarado). O resultado é verde e coerente com as corridas anteriores feitas a ≥ 1 566 MB.
