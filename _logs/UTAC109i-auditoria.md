# UTAC109i -- AUDITORIA FINAL DA SERIE 109 + RELATORIO DE FECHO PRE-AAB

**Tipo:** AUDITORIA + RELATORIO (nao corrige codigo). **Owner:** Hermes (DeepSeek) · **Data:** 2026-10-09
**HI5:** 1h30. **Baseline:** `a9feb9b` (= HEAD = origin/main, fecho do 109h.3).
**Pedido do operador (verbatim):** «antes de fecharmos o app no AAB, quero um relatorio no Desktop que
certifique tudo o que temos, e que diga se ha pendencias bloqueantes ou nao». **Regra absoluta: NAO
INVENTAR** -- onde nao houver certeza no repo ou nos logs, escreve-se «LACUNA -- perguntar ao Opus».

**Ampliacoes pedidas pelo operador durante a execucao (3 mensagens out-of-band):**
1. «leve em consideracao tbm o RAG precisamos melhorar ele tbm ... agregue a sua analise do que temos ao
   relatorio» -> §SEG6 (analise nova do motor RAG, com medicao ao vivo).
2. «leve em consideracao as regras oficiais da play console na web» -> §SEG7 (politicas oficiais lidas
   na web, citadas).
3. «a conformidade juridica no brasil ... cruze com o que temos e ateste ou nao isso tbm no relatorio»
   -> §SEG8 (conformidade BR, cruzamento + atestacao).

---

## §SEG-1 -- MEDICAO + INVENTARIO (baseline)

| Item | Medido | Comando |
|---|---|---|
| HEAD | `a9feb9bd94bd9a69b44e0335e56b8b1fc31753f6` | `git rev-parse HEAD` |
| origin/main | `a9feb9bd...` (**igual** a HEAD) | `git rev-parse origin/main` |
| `git status --porcelain` | 29 ficheiros `??` (todos `_logs/MC100_*`, `MC101_*`, `MC102_*` e `_logs/UTAC106x.2.spec.yml`) -- **nenhum ficheiro de codigo modificado**; nenhum `M`/`A`/`D` | `git status --porcelain` |
| `git log 1a41cf7..HEAD` | **9 commits**, todos de 2026-10-09 (93e17ac -> a9feb9b) | `git log --oneline` |
| RAM livre | **799 MB** -- **A14 DECLARADA: suite NAO corrida** (limite 1500 MB) | `powershell (Win32_OperatingSystem).FreePhysicalMemory/1024` |
| Harness | `scripts/mc966-suite-harness.mjs` existe | `ls scripts/` |
| Ultima suite medida (109h.3) | frontend **970/970** · backend **1095/1101** | log do 109h.3 §-1.5 |

**A14 (nao bloqueante para a auditoria):** RAM livre 799 MB < 1500 MB => a suite canonica **nao foi
corrida neste UTAC**. A auditoria assenta nas suites ja medidas por cada UTAC da serie (todas as
medicoes da serie 109 reportam VERDE). **Nao re-medido aqui** -- declarado.

**Commits inesperados:** nenhum. Os 9 commits de `1a41cf7..HEAD` sao os do 109h, 109h.2 e 109h.3,
todos com autor/committer `DESAFIOGUT` ou `Claude Code`, coerentes com os logs. **Nada fora do que se
sabia.**

### Inventario bruto dos ficheiros da serie

`_logs/` (24 ficheiros `UTAC109*`): 109a-inventario.md · 109b-limpeza-geral.md ·
109b_SEG11_VALIDADOR.md · 109c-diagnostico-videos.md · 109d-remover-fundo.md ·
109d.1-mobile.md · 109d.1_SEG6_VALIDADOR.md · 109e-padronizar-edicoes.md ·
109e_SEG6_VALIDADOR.md · 109f.spec.yml · 109f_SEG-1_MEDICAO.md · 109f_SEG3_VALIDADOR.md ·
109f-inicio.md · 109g.spec.yml · 109g_SEG-1_MEDICAO.md · 109g_SEG3_VALIDADOR.md ·
109g-op-alinhamento.md · 109h.spec.yml · 109h_SEG-1_MEDICAO.md · 109h_RETOMADA_SEG-1.md ·
109h_SEG4_VALIDADOR.md · 109h-carteira.md · 109h.2.spec.yml · 109h.2_SEG-1.md ·
109h.2_SEG4_VALIDADOR.md · 109h.2_SEG4b_VALIDADOR.md · 109h.3.spec.yml · 109h.3_SEG-1.md ·
109h.3_SEG4_VALIDADOR.md (+ 3 pastas `utac109*-browser/`).

`Desktop/`: RELATORIO-109a.txt · RELATORIO-UTAC109b-LIMPEZA.txt · RELATORIO-UTAC109c-DIAGNOSTICO.txt ·
RELATORIO-UTAC109d-REMOVER-FUNDO.txt · RELATORIO-UTAC109d.1-MOBILE.txt ·
RELATORIO-UTAC109e-PADRONIZAR.txt · RELATORIO-UTAC109f-INICIO.txt · RELATORIO-UTAC109g-OP.txt ·
RELATORIO-UTAC109h-CARTEIRA.txt · RELATORIO-UTAC109h.2-CARTEIRA-REVERT.txt ·
RELATORIO-UTAC109h.3-BOTOES.txt. **Cobertura completa 109a -> 109h.3** (sem lacuna de artefacto).

**Nota de desvio (declarado):** o enunciado do 109i falava de `_logs/UTAC109*.spec.yml` (todos). Na
realidade **so 5 existem** (`109f`, `109g`, `109h`, `109h.2`, `109h.3`) -- os UTACs 109a-109e nao
tinham spec em ficheiro. **Nao e lacuna**: o log faz de spec. Declarado, nao inventado.

### Grep de «a frent» / «frente» / «front» (LACUNA declarada pelo operador)

`grep -rniE "a frent|frente|front" _logs/UTAC109*.md` + `Desktop/RELATORIO-UTAC109*.txt`:

- **`a frent`** -> **0 ocorrencias como expressao**. As unicas linhas com «a frente» sao prosa
  normal: `UTAC109a-inventario.md:150` («volume/queda para a frente» -- descricao do cabelo do GUTO),
  `UTAC109b-limpeza-geral.md:122` («nao abrir nova frente» -- regra GATE 5),
  `UTAC109h.2_SEG-1.md:100` / `RELATORIO-UTAC109h.2-CARTEIRA-REVERT.txt:101` («nao houve medicao no
  browser nesta frente»).
- **`frente`** -> sempre o sentido tecnico do protocolo (Frente A/B/C dos SEG, «3 commits a frente»).
- **`front`** (palavra) -> 2: `UTAC109a-inventario.md:97` (prompt em ingles, «front-load washing
  machine») e `UTAC109f_SEG-1_MEDICAO.md:16` («o mesmo desvio do 107a-front», nome de ficheiro).

⇒ **LACUNA confirmada: «a frent que nao terminamos» NAO existe em nenhum ficheiro da serie 109 nem nos
relatorios do Desktop.** Nao ha contexto no repo. Pergunta 1 ao Opus. **Nao se inventa.**

### DEBT.md (ledo integralmente -- 104 linhas)

Dividas **abertas** relevantes: DEBT-016 (overlay reabre ao desligar EM_BREVE_MODE) · DEBT-017 (R-1 sem
prazo real) · DEBT-019 (`solc` fora do package-lock de `desafio-gut`) · DEBT-020 (lacuna do gabarito
Play: «transacao separada e genuina» nao nomeada) · DEBT-021 (residuo `?rc=1`) · DEBT-022 (texto legal
desactualizado em `Privacidade.jsx:91`) · DEBT-023 (residuos do 109b: 3 comentarios «Outras Edicoes»,
docs a citar scripts removidos, inexactidao em `mc8843-estado-edicao.test.mjs:194`). **Nenhuma delas e
da serie 109** -- o DEBT.md nao regista nenhuma pendencia nova do 109a-h.3 (as pendencias da serie
vivem nos logs).

---

## §SEG0 -- INVENTARIO POR UTAC (109a -> 109h.3)

| UTAC | Data | Executor | Commit(s) de fecho | Suite (medida no UTAC) | Validador | Pendencias |
|---|---|---|---|---|---|---|
| **109a** | 2026-10-06/07 | Hermes (deepseek-v4-flash) | 44b92cc -> 25359fb -> 08f78b3 | n/a (READ-ONLY) | APROVADO (V2 **refutou** «LANÇE com cedilha») | L-1 imagem de referencia ausente · L-2 simbolo do medalhao ilegivel · L-3 Soul ID vs cartoon |
| **109b** | 2026-10-09 | Hermes | 67b7e34 -> cb095cd -> 6bd8e93 -> 04a07e7 | 904/904 -> **910/910** · 1095/1101 | **APROVADO -- 0 bloqueantes** | DEBT-022/023 · 5 `.bak-*` · docs a citar scripts mortos |
| **109c** | 2026-10-09 | Hermes | 3ba5d2e | 910/910 · 1095/1101 | **sem validador** (diagnostico puro) -- **PARADO/escalado** | fundo branco nos 8 videos + 16 PNG (alfa 0,0) |
| **109d** | 2026-10-09 | Hermes | dd01f50 -> 2c2b31d | 910/910 · 1095/1101 | APROVADO -- 0 bloqueantes (11 angulos) | `white_thr` 232 -> 185 (calibrado) |
| **109d.1** | 2026-10-09 | Claude Code (Opus 5.5) | ea857c6 -> 2e40488 | **917/917** · 1095/1101 | APROVADO COM RESSALVAS (2 rondas) | branco residual pequeno no v4 |
| **109e** | 2026-10-09 | Opus 5.5 | dcf8460 -> 0daf3af -> 731ec28 | **917/917** | **APROVADO -- 0 bloqueantes** | V5 `role=status` (pre-existente) · V11 `size={0}` · faixa da OP a 375px -> 109g |
| **109f** | 2026-10-09 | Opus 5.5 | f8c622e -> dec1050 -> fee1609 | **935/935** · 1095/1101 | APROVADO COM RESSALVAS | **LACUNA**: sem fonte publica de vencedores (bloco 6 = placeholder) · evidencia P4 nao commitada |
| **109g** | 2026-10-09 | Opus 5.5 | 1fc7321 -> 12a2731 -> 1a41cf7 | **958/958** · 1095/1101 | **PARCIAL -- 0 bloqueantes** | P-a botao login 33px · P-b selo de estado < AA (corrigido na OP, **mantido no MLC**) · 3 lacunas de teste (V5/V6/V7) |
| **109h** | 2026-10-09 | Opus 5.5 -> **Hermes** (HANDOFF 429) | 93e17ac -> 6c0b33a -> 6d62637 | **974/974** · 1095/1101 | APROVADO COM RESSALVAS (validador do Hermes) | **custo do Opus NAO MEDIDO** (ele nao mediu) · A5 refutada (letra) |
| **109h.2** | 2026-10-09 | Hermes | 11f6416 -> f509e21 -> e35f138 -> e48acf6 | **970/970** · 1095/1101 | APROVADO (2 rondas; 1 bloqueante fechado) | P-109h.2-1 modais · .gitattributes sem `*.jsx/.css` · P-109h.2-2 worktrees orfaos · P-109h.2-3 botoes sem minHeight · P-109h.2-4 RAM por execucao |
| **109h.3** | 2026-10-09 | Hermes | bcbeeba -> a9feb9b | **970/970** · 1095/1101 | APROVADO COM RESSALVAS | **F6** «Copiar codigo» = «Compartilhar» (sem hierarquia) · F4 `ON_GOLD` morto · F7 tingidos nao uniformes · F5 `botaoPrimario` latente solido |

**Cobertura:** 11 UTACs, 11 logs, 11 relatorios no Desktop, 10 veredictos de validador (o 109c nao tem,
por desenho). **Sem lacuna de artefacto.**

**Padrao de autor (nota):** 109d.1, 109e, 109f, 109g, 109h (codigo) foram feitos por **Claude Code /
Opus 5.5**; 109a, 109b, 109c, 109d, 109h (fecho), 109h.2, 109h.3 e este 109i, por **Hermes/DeepSeek**.

---

## §SEG1 -- FRENTE B: AUDITORIA DE PENDENCIAS (consolidada, 5 fontes)

Fontes cruzadas: (1) os 11 relatorios de fecho; (2) `_logs/DEBT.md`; (3) grep de LACUNA/pendencia/
bloqueante/TODO/FIXME nos ficheiros da serie; (4) handoff do Opus no `UTAC109h-carteira.md` §HANDOFF;
(5) grep especifico de «a frent».

### BLOQUEANTE (por criterio do enunciado: viola WCAG AA | viola Google Play | quebra visivel | falha de seguranca)

| # | Pendencia | Origem (ficheiro:linha) | Criterio | Impacto |
|---|---|---|---|---|
| **B-1** | **Selo de estado da tabela de lances (MLC) reprova WCAG AA.** Texto `#fff` a `0.7rem` (11,2 px) sobre as cores de estado: `#ff6b35` = **2,84:1**, `#10b981` = **2,54:1**, `#ef4444` = **3,76:1** -- todos < 4,5:1 (WCAG 2.1 AA 1.4.3, texto normal) | `components/TabelaLances.jsx:317` (`statusBadge`), medido pelo validador do 109g (`_logs/UTAC109g_SEG3_VALIDADOR.md` §11). **A OP ja foi corrigida** (`OfertasProgramadas.jsx:411` -> texto navy `#0a0f1a`, 6,76/7,55/5,09/4,79) | Viola WCAG AA | Simbolos de estado (EM BREVE/ATIVA/ENCERRADA) ilegiveis para baixa visao |
| **B-2** | **Relampago (lances com dinheiro real para ganhar premio fisico) sem parecer que o exonere** na politica de jogos com dinheiro real da Play | `docs/gabarito-play-console.md:104` (R-02) e `:110` (row #31, Apple 5.3.4) -- **divida aberta, dono = Jur** | Viola Google Play (risco) | Reprovar na revisao da Play / remocao |
| **B-3** | **Passe vendido por PIX dentro do app e um «produto digital»** -> a Payments policy exige o Faturamento Google Play para conteudo digital (R-01/DEC-01) | `docs/gabarito-play-console.md:90` (row #29) e `:112` (DEC-01) -- **divida aberta, dono = Cli + Jur** | Viola Google Play (risco) | Reprovar na revisao da Play |
| **B-4** | **GUTO (chatbot) degradado em producao: responde em modo `template`/`textual` e despeja o excerto bruto do regulamento** -- MEDIDO ao vivo neste UTAC (§SEG6) | `https://silly-stardust-ca71bc.netlify.app/.netlify/functions/chatbot` (POST `{"pergunta":...}`) devolveu `modoBusca:"textual"`, `modoResposta:"template"` | Quebra de funcionalidade visivel + informacao potencialmente errada | O assistente do app responde com texto cru e pode repetir um modelo desactualizado |

### NAO-BLOQUEANTE

| # | Pendencia | Origem | Quando |
|---|---|---|---|
| N-1 | Botao de login com ~33 px de altura a <=414 px (alvo 44 px) | `components/glass/AuthArea.jsx:22`; `UTAC109g_SEG3_VALIDADOR.md` §11 | UTAC proprio -- **ver correcao de premissa em §SEG2(b)** |
| N-2 | Modais da Carteira mantem as cores retiradas (`linear-gradient(135deg,#f5a623,#e89400)`; `#a78bfa`) | P-109h.2-1: `ComprarFichasModal.jsx:266`, `ComprarPasseModal.jsx:77` | UTAC proprio (decisao do operador) |
| N-3 | `.gitattributes` sem `*.jsx`/`*.tsx`/`*.css text eol=lf` -- a guarda do 109h.2 ficou EOL-tolerante no leitor, nao na causa-raiz | P-109h.2 (R1 do validador 2.a ronda) | higiene de repo -- UTAC proprio |
| N-4 | Tingidos nao uniformes entre Cartacarteira e PainelIndicacao (0.14/0.4 vs 0.12/0.35) | F7 do 109h.3 | opcional |
| N-5 | «Copiar codigo» e «Compartilhar» visualmente identicos (perde-se a hierarquia) | F6 do 109h.3 | **decisao do operador** |
| N-6 | `ON_GOLD` morto e `botaoPrimario` latente solido (nenhum botao renderiza o par) | F4/F5 do 109h.3 | UTAC proprio (mexe em guarda da serie 106c) |
| N-7 | Botoes do painel da Carteira sem `minHeight` | P-109h.2-3 | opcional |
| N-8 | 2 worktrees orfaos de outros executores (nao limpos) | P-109h.2-2 -- `git worktree list`: `.../Temp/claude/.../wt-94` (`e3d8791`) e `C:/Users/Moltbot/tmp-109h-val/wt` (`93e17ac`) | saneamento -- **nao tocado** (fora da autorizacao) |
| N-9 | 1 `.bak` no repo (`capacitor.config.ts.bak-20260725182152`) + residuos de comentarios «Outras Edicoes» | DEBT-023 · `find *.bak-*` | UTAC proprio |
| N-10 | `solc` fora do lockfile de `desafio-gut` -> 1 teste on-chain salta | DEBT-019 | decisao do operador (a/b/c) |
| N-11 | Texto legal desactualizado (`Privacidade.jsx:91` fala do «fluxo corporativo» que saiu) | DEBT-022 | revisao legal |
| N-12 | Custo do Opus no 109h **nao medido** | `UTAC109h-carteira.md` §HANDOFF | irreversivel (declarado) |

### LACUNA (nao sei -- perguntar ao Opus)

| # | Lacuna | Origem |
|---|---|---|
| L-1 | **«a frent que nao terminamos»** -- nao existe em nenhum ficheiro da serie nem nos relatorios | pedido do operador; grep §SEG-1 = 0 |
| L-2 | Fonte publica de vencedores (o bloco 6 do Inicio e **placeholder**) -- falta backend | `UTAC109f-inicio.md:81`, `UTAC109f_SEG-1_MEDICAO.md:48` |
| L-3 | Causa-raiz do modo `textual` do RAG em producao (HF_API_TOKEN? endpoint?) -- exige ler o ambiente do Netlify | **medido neste UTAC** (§SEG6) |
| L-4 | Causa do modo `template` (LLM indisponivel) -- idem: exige o ambiente | idem |
| L-5 | O indice RAG **vivo** corresponde ao fonte do repo? (o excerto servido mostrou lixo de markdown cru: `--- ## 1.`) | idem |
| L-6 | Soul ID para cartoon (treino) -- decisao pendente desde o 109a | `UTAC109a-inventario.md:231,253` |
| L-7 | Imagem de referencia do ComfyUI (`0539243f...915e.png`) ausente do disco | `UTAC109a-inventario.md:104` (L-1 do 109a) |

---

## §SEG2 -- FRENTE C: COERENCIA CRUZADA (cita ficheiro:linha)

**(a) Inicio vs MLC vs OP vs Carteira -- mesma paleta?**
- Carteira: so `#f5a623` no ecra (2 pecas); as **modais** mantem `#f5a623->#e89400` e `#a78bfa`
  (`ComprarFichasModal.jsx:266`, `ComprarPasseModal.jsx:77`). Provado no chunk servido: `#ff6b35` 2 -> 0.
- Inicio (`Dashboard.jsx`): usa `#ff6b35`/`#f97316` **apenas no painel DEV** (`:554` `import.meta.env.DEV`)
  e em `COR.warning` (`:42`) -- **nao vai a producao**. **Nao e incoerencia visivel.**
- OP (`OfertasProgramadas.jsx`): **AINDA RENDERIZA LARANJA** -- `COR.primary:"#ff6b35"` (`:48`) e usado
  na barra de progresso (`:284`, gradiente `gold -> primary`) e no botao do estado vazio «Ir para a
  Carteira» (`:358`, `background: COR.primary`). **Este botao laranja contradiz «uma so cor de destaque».**
  -> incoerencia real, nao declarada por nenhum UTAC da serie.
- MLC (`MercadoLances.jsx`): `COR.gold` 8x + `#f5a623` 1x; sem laranja.
- ⇒ **Paleta coerente em Carteira/Inicio/MLC; a OP tem 1 botao e 1 barra ainda em `#ff6b35`.**

**(b) Botao de login (P-a) -- em que ecras?**
`AuthArea.jsx` (usado por `GlassHeader.jsx` -> MLC + OP) e `BotaoLoginPrincipal.jsx` (importado por
`Configuracoes.jsx`, `Dashboard.jsx`, `ExcluirConta.jsx`, `MercadoLances.jsx`, `MeusAtivos.jsx`,
`MinhaCarteira.jsx`). O botao do `AuthArea` usa `padding: compact ? "0.45rem 0.9rem" : "0.6rem 1.4rem"`
(`AuthArea.jsx:22`) **sem `minHeight`** -> altura calculada ~33 px a <=414 px.
**⚠️ CORRECAO DE PREMISSA (instrumento meu):** a rotulagem «33px (< 44px WCAG)» esta **mal atribuida**.
A **WCAG 2.2 AA (2.5.8 Target Size Minimum) exige 24x24 px** -- 33 px **passa AA**. Os 44 px sao da
**WCAG 2.5.5 (AAA) / Apple HIG / Material**. ⇒ P-a **nao viola WCAG AA**; e uma falha de *guideline* de
toque (nao de criterio AA). Classificado **NAO-BLOQUEANTE**, com a rotulagem corrigida a vista.

**(c) Selo de estado (P-b) -- em que ecras?**
`TabelaLances.jsx:317` (MLC) `color:"#fff"` 0.7rem -> **reprova** (B-1). `OfertasProgramadas.jsx:411`
(OP) `color:"#0a0f1a"` -> **passa** (6,76-7,55:1). `CardLance.jsx:494-496` usa `#ef4444` sobre `#1f0a0a`
(texto 0.9rem = 14,4 px) ~ 4,3:1 -> **limítrofe**. `getEstadoEdicao` (`utils/edicao.js:156`) fornece a
cor por estado.

**(d) Ecras que quebram a 320 px (P-c) -- lista completa**
O validador do 109g mediu, no browser, **overflow lateral = 0 em 320-1280 px** (com e sem edicao).
Os defeitos a 320 px sao de **quebra de linha / truncagem**, nao de layout:
- `GlassHeader` partilha o titulo: «DesafioGUT» **truncado para «D.»** a 320 px (igual no MLC).
- Titulo «Palpites -- Edicao PROG-1» parte o id («PROG-» / «1»).
- A frase R18-D da OP quebra em 2 linhas (43 px).
⇒ **P-c NAO e «quebra de funcionalidade»: e cosmetico.** Classificado **NAO-BLOQUEANTE** (mas a
truncagem do nome da marca no cabecalho merece UTAC cosmetico).

**(e) Modais com cores antigas (P-109h.2-1) -- lista**
`components/ComprarFichasModal.jsx:266` e `components/ComprarPasseModal.jsx:77`
(`linear-gradient(135deg,#f5a623,#e89400)`); `COR` local com `#fbbf24`/`#10b981`/`#a78bfa`.
Tokens globais fora do ambito: `components/glass/glassTokens.js:7` (`primary:"#ff6b35"`) e
`globals.css` (tokens laranja). **Sobreviveram `#10b981`/`#fbbf24` no chunk servido** -- confirmacao
independente de que as modais nao foram tocadas.

**(f) Numero de cores de destaque por ecra** (medido por contagem de literais nos ficheiros)
Carteira `MinhaCarteira.jsx`: `#f5a623` x10 + `COR.gold` x6 + `COR.pix` x1 -> **1 familia (amarelo)**.
MLC: `COR.gold` x8 -> **1**. OP: `COR.gold` x12 + `#ff6b35` x1 -> **2** (o botao/barra de (a)).
Inicio: `COR.gold` x6 + `#ff6b35` x2 + `#f97316` x1 -> **2, mas os laranja sao DEV-only**.
CartaoEdicao: `COR.gold` x6 -> **1**.

**(g) CartaoEdicao + GlassHeader sao partilhados -- usados onde?**
`CartaoEdicao.jsx` <- `Dashboard.jsx` (Inicio), `MercadoLances.jsx` (MLC), `OfertasProgramadas.jsx` (OP).
`glass/GlassHeader.jsx` <- `MercadoLances.jsx` (MLC) + `OfertasProgramadas.jsx` (OP).
⇒ Mudar qualquer deles afecta 2-3 ecras (foi a decisao R18-C do 109g: 9rem -> 12,5rem do nome).

**(h) `EM_BREVE_MODE` -- ainda ligado? Impacto?**
**SIM, LIGADO** (`lib/leilaoLock.js:10` `export const EM_BREVE_MODE = true`). Impacto: **todos os
cronometros do app mostram «EM BREVE»** em vez da contagem viva; o overlay de fim **nao abre**
(`AppContext.jsx:1160` `if (!EM_BREVE_MODE && ...)`). **Consequencia para o AAB:** o Relampago **nao
esta ao vivo** -- o que *reduz* hoje o risco da politica Play, mas o codigo e a ficha descrevem a
modalidade. Desligar a trava reabre DEBT-016 (overlay ciclico de 30 min) -- **nao se desliga sem o prazo
real** (DEBT-017).

---

## §SEG6 -- ANALISE DO RAG (pedida pelo operador) -- MEDIDA

**Componentes (repo):** `desafio-gut/frontend/netlify/functions/_lib/rag.mjs` (315 linhas, o motor) ·
`scripts/build-rag-index.mjs` (141 linhas, o build) · `netlify/functions/chatbot.mjs` (1514 linhas, o
endpoint) · fonte de conteudo `docs/RAG-GUTO-v2.md` -> derivada `docs/chatbot/regulamento.md` (guardada
pelo teste `_tests/mc967-fontes-rag.test.mjs`) · `_lib/guto-perfis.mjs` (prompt de sistema + palavras
proibidas). Store: Netlify **Blobs** `rag` (`rag:meta` + `rag:{n}`). TOP_K = 3 (`chatbot.mjs:45`).

### R-1 [MEDIDO AO VIVO] O RAG esta DEGRADADO em producao

POST a `https://silly-stardust-ca71bc.netlify.app/.netlify/functions/chatbot`
`{"pergunta":"Quanto custa participar e como funciona a modalidade Programada?"}` (2026-10-09)

```json
{"resposta":"Encontrei isto no regulamento: «--- ## 1. O que e o DesafioGUT ... \u2026».",
 "fontes":[{"id":"rag:0","score":0.2864},{"id":"rag:1","score":0.1419}],
 "modoBusca":"textual","modoResposta":"template","perfil":"visitante"}
```

- **`modoBusca:"textual"`** => o caminho de **embeddings FALHOU** e caiu no fallback TF-IDF
  (`buscarChunksTextual`, `rag.mjs:258`). Os scores ~0,14-0,29 sao de contagem de termos, nao de cosseno.
- **`modoResposta:"template"`** => o **LLM nao foi alcancado**; a resposta e o **excerto bruto**,
  embrulhado em «Encontrei isto no regulamento: «...»» (`obterResposta("fallback_rag", ...)`,
  `chatbot.mjs:1502`). O assistente **nao esta a conversar**.
- O excerto servido **comeca com `---`** (o separador de markdown, resto do cabecalho HTML do doc) --
  sinal de que o **indice indexado contem lixo de markdown** que o `mc967` so proibe **no FICHEIRO**
  (`mc967-fontes-rag.test.mjs:39`), **nao no indice vivo**.
- **⚠️ Contradiz o proprio codigo:** `guto-perfis.mjs:355` diz «MC96.2 -- HARD GATE 4: NUNCA despejar o
  chunk bruto». Em producao, **e exatamente isso que se ve**.
- A pergunta sobre «o Passe e os pontos» devolveu o chunk da **tabela de pagamentos** (`rag:2`) -- a
  busca **nao encontra** o assunto, porque o modelo Passe/pontos/cartao **nao existe** no documento
  RAG (ver R-3).

### R-2 [ESTATICO] Fraquezas tecnicas do motor (a melhorar)

1. **1 leitura de Blob POR CHUNK, em serie.** `buscarChunksRelevantes` (`rag.mjs:123`) e
   `buscarChunksTextual` (`rag.mjs:267`) fazem `await store.get('rag:'+i)` num `for` sequencial ate
   `meta.totalChunks`. Sem store vetorial, sem ANN, sem paralelismo. Cada mensagem de chat paga
   N round-trips de rede (N = nº de chunks). **Nao escala** e soma latencia ao chat.
2. **Comentarios de cabecalho MENTEM sobre o modelo.** `rag.mjs:9-11` diz «endpoint compativel com
   OpenAI Embeddings (default: `text-embedding-3-small`). Retorna `float[1536]`» e
   `build-rag-index.mjs:5-6` diz «OpenAI text-embedding-3-small, 1536 dim» -- mas o **codigo real e
   MiniLM-L6-v2, 384 dim** (`rag.mjs:28`, `build-rag-index.mjs:89-90`). **Armadilha medida:** um dev que
   siga o cabecalho constroi um indice a 1536 dim; o `buscarChunksRelevantes:129` faz
   `if (chunk.embedding.length !== embedding.length) continue;` -> **salta TODOS os chunks em silencio**
   -> zero resultados, sem erro.
3. **Chunking por palavras (`splitIntoChunks`, 500 palavras / overlap 50, `rag.mjs:45`) sem respeitar a
   estrutura de seccoes.** O proprio doc diz «cada seccao tem de responder sozinha» -- mas um corte a meio
   de uma seccao quebra isso. O doc tem ~1100 palavras => ~3-5 chunks, recuperacao grossa.
4. **Sem re-ranking, topK fixo = 3, contexto maximo 4000 car. (`montarContexto`, `rag.mjs:299`).** Nao ha
   limiar de score: devolve 3 chunks mesmo que todos sejam irrelevantes.
5. **O indice e construido A MAO, fora do repo, e NADA garante que corresponde ao fonte actual.** O
   teste `mc967` compara os **2 FICHEIROS** entre si -- **nao** compara o ficheiro com o **indice
   servido**. O `reindexar_rag` no endpoint (`chatbot.mjs:534`) apenas responde «o indice e construido
   fora do repositorio pelo operador». => risco de indice STALE, e a evidencia da R-1 sugere que esta.
   Nota de custo/operacao: construir o indice no CLI exige `NETLIFY_SITE_ID` + `NETLIFY_AUTH_TOKEN`
   (`build-rag-index.mjs:68-72`) -- **nao esta ligado a CI/CD**.

### R-3 [CONTEUDO] O RAG descreve o modelo ANTIGO do produto

`docs/RAG-GUTO-v2.md` (fonte da verdade do chatbot; substitui `DESAFIOGUT-MASTER.md` /
`ESPECIFICACAO-TECNICA-DEFINITIVA.md`) descreve, na seccao 3/4/5:
- Programado = **«1 SENHA por lance (R$ 2,00 cada)»**, custo independente do valor ofertado
  (`RAG-GUTO-v2.md:44-54`); vence = **menor lance unico** (`:76-78`).
- Fundamento citado: **«Portaria SPA/MF n.o 1.207/2024 (Art. 38)»** (`:26-27`).
- Vendedor: **«Grupo Uniao e Trabalho (GUT)»** (`:21-22`) -- **sem** «Assoc. Recreativa dos Nordestinos».

A **definicao vigente** (CLAUDE.md:4-11, util. 2026-10-04) e a Via B: Programado = **Passe R$ 2,00 -> 1
ponto; 50 pontos = cartao colecionavel fisico; o palpite e bonus e NAO decide**; **SPA/MF nao se
aplica**; vendedor = **Associação Recreativa dos Nordestinos no Amazonas**. ⇒ **o chatbot ensina um
preco/mecanica/lei que a fonte de verdade vigente ja substituiu.** `FICHA-PLAY-PT.md:63-64` mostra que o
texto antigo foi anotado como **SUPERADO** na ficha -- mas **o RAG ficou para tras**.

### R-4 [CONFORMIDADE] O prompt de sistema tem as palavras certas (bom)

`_lib/guto-perfis.mjs:103-106`: «O DesafioGUT e um TORNEIO DE HABILIDADE ... **NUNCA** o chames leilao.
**PALAVRAS PROIBIDAS: "leilao", "leiloes", "jogo de azar", "aposta", "bet", "sorte"** ... se o
utilizador disser "leilao", corrige com naturalidade». Isto esta **implementado** -- e o nucleo da
conformidade vocabular (§SEG8).

### Resumo executivo do RAG
**Status: DEGRADADO e DESACTUALIZADO.** Tres camadas independentes falham: (1) a recuperacao usa o
fallback textual; (2) a geracao nao chega ao LLM (template); (3) o conteudo indexado descreve o modelo
antigo. Somam-se fraquezas estruturais (N leituras por pergunta, cabecalhos que mentem sobre a
dimensao, indice manual sem guarda de sincronizacao).

---

## §SEG7 -- CONFORMIDADE GOOGLE PLAY CONSOLE (regras oficiais, lidas na web)

Fontes citadas (consultadas em 2026-10-09, `support.google.com/googleplay/android-developer/answer/...`):
- **9877032** -- «Jogos de azar com dinheiro real, jogos e concursos» (pt-BR).
- **10281818** -- «Noções básicas sobre a política de pagamentos do Google Play» (pt-BR).
Cruzadas com os documentos internos `docs/gabarito-play-console.md` e `docs/FICHA-PLAY-PT.md`.

### O que a politica diz (verbatim, pt-BR) e como o produto se situa

**(i) Exemplo de violacao nomeado pela Play:** «**Jogos que aceitam dinheiro em troca de uma
oportunidade de ganhar um prémio físico ou monetário**» e «Apps que aceitam ou gerenciam apostas,
moedas no app, ganhos ou **depósitos** para apostar em ou ganhar um prémio físico ou monetário».
A seccao «Outros apps de jogos com dinheiro real, concursos e torneios» proibe, para apps que **nao**
qualificam como jogos de azar, usar **dinheiro real** para receber **prémio de valor real** --
**excepto** os programas de fidelidade gamificados permitidos.

**(ii) A excepcao (o caminho do DesafioGUT) -- «Programas de fidelidade gamificados»:** permitidos
«**Quando for permitido por lei e não houver requisitos adicionais de licenciamento de jogos ou jogos
de azar**», com **estes requisitos de qualificacao**:
- beneficios «**claramente complementares e subordinados** a qualquer transacao monetaria qualificada»,
  que tem de ser «uma **transacao separada real** para fornecer produtos ou servicos independentes do
  programa», e **nao pode** representar «uma tarifa ou um premio para participar do programa» nem resultar
  em compra «acima do preco normal»;
- **publicar as regras oficiais para o programa no app**;
- se houver «sistemas de recompensas variaveis, aleatorias ou baseadas em probabilidades», **divulgar nos
  termos oficiais**: (1) as **probabilidades/chances** e (2) o **metodo de selecao**;
- **especificar um número fixo de vencedores, prazo fixo de inscricao e data de concessao do premio**,
  por promoção;
- **documentar todas as proporções fixas de acrescimo e resgate de pontos/recompensas** de forma visivel
  no app **e** nos termos oficiais.

**(iii) Apps de jogos de azar (se se qualificasse como tal):** exigiriam **inscricao no processo de apps
de jogos de azar**, licenca valida por pais, **download gratuito**, **sem Faturamento no app**,
classificacao **«AO»** pela IARC e bloqueio de menores e de locais nao autorizados. O DesafioGUT **nao**
se inscreve aqui (nao e jogo de azar) -- mas a **Relampago** (lance pago -> premio fisico) e o que
**aproxima** o produto desse regime.

**(iv) Pagamentos (10281818):** o Faturamento Google Play «e obrigatorio para os desenvolvedores que
oferecem compras no app de **produtos, softwares e servicos digitais**». Excepcoes citadas na errata
interna (`CLAUDE.md:225-227`): **bens físicos, peer-to-peer, online auctions (leiloes online),
doacoes**. ⇒ **Um Passe «produto digital» vendido por PIX dentro do app nao cai numa excepcao =>
risco de loja (R-01/DEC-01).**

### Cruzamento com o estado do repo (o que ja esta feito x o que falta)

| Requisito da Play | Estado no repo | Evidencia |
|---|---|---|
| Regras oficiais **publicadas no app** | **FEITO** | `src/pages/RegrasOficiais.jsx` (com «Declaracao expressa: nao e concurso, sorteio, loteria, aposta...», `:237-238`); `docs/regras-oficiais.md` |
| Proporcao fixa de acrescimo/resgate visivel no app **e** nos termos | **PARCIAL (LACUNA de consistencia)** | O **app** diz «50 pontos = cartao»; o **RAG** diz «1 senha por lance, menor lance unico» (§SEG6 R-3) -- as duas superficies nao dizem o mesmo |
| Beneficio complementar/subordinado, transacao separada e genuina | **A PROVAR (juridico)** | R-02 aberto (`gabarito-play-console.md:104`); DEBT-020 nota que a expressao «transacao separada e genuina» **nao esta nomeada** no §6 do gabarito |
| Nº fixo de vencedores / prazo / data de entrega | **DEC-04 aberta** | `gabarito-play-console.md:118` |
| Sem Faturamento para o Passe digital | **NAO RESOLVIDO** | DEC-01/R-01 (`:90`, `:112`) |
| URL da politica de privacidade | **EM FALTA** | `gabarito-play-console.md:99`; `FICHA-PLAY-PT.md:105` |
| E-mail de contacto / capturas de ecra | **EM FALTA** | `gabarito-play-console.md:100-101` |
| **Data Safety** refeito (morada/CPF, leads, analytics) | **EM FALTA** | rows #25 e #41 (`:55-56`, `:102`) |
| **Financial features** refeito | **EM FALTA** | row #27 (`:103`) |
| Questionario **IARC** refeito (coerente com a Via B) | **EM FALTA** | row #26 (`:104`); R-17 (`:106`) -- «AO» **nao** e classificacao IARC/Play (no BR e **ClassInd 18**) |
| Classificacao etaria | **18+** declarado | `FICHA-PLAY-PT.md:47-49`; `gabarito-play-console.md:35-38` |

**Atestacao (Play):** **NAO ATESTO conformidade completa com a Play Console.** O bloco de **politicas**
(R-02 / DEC-01) esta **aberto** e as **declaracoes de consola** (Data Safety, Financial features, IARC,
URL de privacidade, e-mail, capturas) **estao em falta**. O que **atesTO** e que o **caminho escolhido**
(programa de fidelidade gamificado, 18+, sem SPA/MF, bens fisicos fora do IAP) e **coerente com a
politica lida** -- **desde que** os requisitos de qualificacao da seccao «Programas de fidelidade
gamificados» sejam cumpridos e documentados, e que a Relampago seja objecto de parecer (R-02).

---

## §SEG8 -- CONFORMIDADE JURIDICA NO BRASIL (cruzamento + atestacao)

**Aviso de escopo:** isto e uma **auditoria de coerencia documental** (o que o repo diz vs o que o repo
diz noutro sitio vs o que a lei exige). **NAO e parecer juridico** -- o proprio repo o declara
(`gabarito-play-console.md:13`; «Nada juridico ou fiscal aqui e parecer» na MATRIZ). Onde ha risco
juridico, o encaminhamento e **advogado**.

### J-1 Leis/plataformas que o proprio repo declara (`CLAUDE.md:199-206`)
Lei 5.768/1971 (autorizacao previa; **premio nao convertivel em dinheiro**) · Dec. 70.951/1972 ·
**CDC art. 49** (7 dias, botao no app, estorno MP) · Dec. 7.962/2013 (arts. 2 e 5) · **LGPD** (arts. 7,
8, 18) · **nao aplicaveis:** Lei 14.790/2023 (bets), DL 3.688/1941 (jogo de azar), Res. CMN 5.100/2026.

### J-2 Vocabulario -- o que TEM de ser usado (pedido explicito do operador)
**Obrigatorio (implementado):** «**torneio de habilidade**», «**lance**», «**oferta**», «**estrategia**»,
«**menor lance unico**», «**compra inteligente com beneficios**» (`CLAUDE.md:173`).
**Proibido (implementado no prompt do GUTO):** `guto-perfis.mjs:104` -- «**leilao, leiloes, jogo de azar,
aposta, bet, sorte**»; e o teste `mc967-fontes-rag.test.mjs:40` proibe «leilao» na fonte derivada do RAG.
**Atestacao do vocabulario:** **ATESTO que a copy visivel ao utilizador esta conforme.**
`grep` por essas palavras em `src/**/*.jsx` (excluindo comentarios/testes) **nao encontrou nenhuma em
texto de produto**; todas as ocorrencias sao **identificadores internos** (`isLeilaoAtivo`,
`tipoLeilao`, `Leilao.sol`) e as frases de **negacao expressa** em `RegrasOficiais.jsx:96,147,237-241,258`
(«nao e concurso, ... sorteio, loteria, aposta ... jogo de azar»), que **reforçam** a conformidade.
**Uma unica fuga visivel:** `pages/Privacidade.jsx:125` mostra ao utilizador a string «smart contract
**LeilaoGUT**» -- nome interno do contrato exposto ao publico. **Corrigir (cosmetico, 1 linha).**

### J-3 Divergencias e riscos encontrados (por gravidade)

| # | Achado | Evidencia | Gravidade |
|---|---|---|---|
| **J-3.1** | **O RAG (superficie publica do GUTO) descreve um modelo e uma base legal SUPERADOS** -- «1 senha por lance, menor lance unico» e «Portaria SPA/MF 1.207/2024» -- enquanto a fonte de verdade vigente diz «Passe -> pontos -> cartao» e «SPA/MF nao se aplica» | `docs/RAG-GUTO-v2.md:26,44-54,76-78` vs `CLAUDE.md:4-11` | **ALTA** -- informacao ao consumidor divergente das regras oficiais publicadas |
| **J-3.2** | **Contradicao INTERNA no Regulamento que vai a cartorio:** Art. 14 «nao sendo admitida a sua conversao ou substituicao por dinheiro» **vs** Art. 18 «caso o contemplado seja de outra localidade afora Manaus/AM, recebera respectivo valor integral ... em dinheiro». O premio convertivel em dinheiro **contraria a Lei 5.768/1971** e a propria posicao do app («Premio nao convertivel em dinheiro») | `docs/REGULAMENTO-v4.md` Art. 14 vs Art. 18 | **ALTA** -- auto-contradicao num documento registado |
| **J-3.3** | **O Regulamento (v4) descreve a Programada no modelo antigo** («senhas ... 1 senha por lance ... menor lance unico», Arts. 6/8/20/26/27) -- **nao** o modelo Via B (Passe -> 1 ponto; 50 pontos = cartao). O app publica o modelo Via B (`RegrasOficiais.jsx`) | `REGULAMENTO-v4.md` Arts. 6,8,20,26,27 vs `RegrasOficiais.jsx` | **ALTA** -- **regras oficiais registadas ≠ regras publicadas no app** (contraria a exigenza da Play «publicar as regras oficiais» de forma exacta) |
| **J-3.4** | **Duas contas de recebimento diferentes dentro do mesmo Regulamento:** Art. 21 -> PIX chave CNPJ + BB ag. 198627 cc 847534; Art. 27 -> **Bradesco ag. 0320 cc 0812782-4, PIX `renascendoam@gmail.com`** (conta pessoal, gmail) | `REGULAMENTO-v4.md` Art. 21 vs Art. 27 | **MEDIA/ALTA** -- risco de desvio/opacidade; um PIX pessoal num documento oficial e um sinal de alerta |
| **J-3.5** | **Nome do vendedor inconsistente:** Regulamento e RAG dizem «Grupo Uniao e Trabalho -- GUT»; o app/Play dizem «**Associação Recreativa dos Nordestinos no Amazonas** (CNPJ 23.040.066/0001-00)». Mesmo CNPJ, **razao social diferente** -- e quem emite NF-e e a Associacao | `REGULAMENTO-v4.md:3` e `RAG-GUTO-v2.md:21` vs `RegrasOficiais.jsx:56,64,321` e `FICHA-PLAY-PT.md:40` | **MEDIA** -- emissao de NF-e e identificacao legal devem usar a razao social registada |
| **J-3.6** | **LGPD: implementada tecnicamente** (gate de aceite no servidor `consent-log`, `exportar-dados` so do titular, `conta-delete` a anonimizar) -- mas com **texto legal desactualizado** | `CLAUDE.md:2` (MC104…) + DEBT-022 (`Privacidade.jsx:91`) | **BAIXA/MEDIA** -- o texto legal deve reflectir o fluxo actual |
| **J-3.7** | **CDC art. 49 (7 dias de arrependimento)** implementado com estorno MP; **7.962/2013** (e-commerce) -- a loja precisa de identificacao clara do fornecedor e do direito de arrependimento | `CLAUDE.md:180,202` | OK -- manter |
| **J-3.8** | **Classificacao 18+** coerente com a Via B; o **IARC** tem de ser refeito (R-17: «AO» nao e IARC) | `gabarito-play-console.md:35-38,104` | **MEDIA** -- declaracao de consola |

### J-4 Atestacao (Brasil)
**NAO ATESTO conformidade juridica completa.** Atesto **positivamente** que (a) o **vocabulario
obrigatorio** esta implementado e a copy visivel esta limpa (§J-2, com 1 fuga); (b) as **leis declaradas**
sao as correctas para um e-commerce de habilidade **sem** SPA/MF; (c) a **LGPD esta implementada a
nivel tecnico**. **NAO atesto** porque ha **tres divergencias de gravidade ALTA** que tem de ser
resolvidas **antes** de o documento ir a cartorio / de o app publicar o modelo:
**J-3.1** (RAG desactualizado), **J-3.2** (Art. 14 vs Art. 18 -- premio convertivel em dinheiro),
**J-3.3** (Regulamento vs app -- modelo da Programada). Some-se **J-3.4** (contas duplas). Todas exigem
**decisao do operador + advogado** -- nao sao corrigiveis por codigo neste UTAC.

---

## §SEG3/§SEG4 -- ENTREGA + VALIDADOR ADVERSARIAL

**D1** `Desktop/RELATORIO-109-FINAL-PRE-AAB.txt` (linguagem simples, PT-BR, secoes numeradas).
**D2** `_logs/UTAC109i_PERGUNTAS-OPUS.md` (perguntas numeradas, respondiveis em <30 s).

**Validador adversarial (SEG4):** despachado sobre estes 3 ficheiros, instruido a **TENTAR REFUTAR**
(pendencias omitidas, classificacao errada, citacoes ficheiro:linha invalidas, inventario com lacunas,
conclusoes nao suportadas, perguntas inventadas, GO/NO-GO injustificado, relatorio nao nos 3 lugares).
**Veredicto integro registado no fim deste log (§SEG4-VEREDICTO).**

---

## EVIDENCIA BRUTA (comandos usados)

```
git rev-parse HEAD / origin/main            -> a9feb9bd... (iguais)
git status --porcelain                      -> 29 ?? em _logs/, 0 codigo modificado
git log --oneline 1a41cf7..HEAD             -> 9 commits (93e17ac..a9feb9b, 2026-10-09)
powershell FreePhysicalMemory/1024          -> 799 MB  (A14: suite NAO corrida)
grep -rniE "a frent|frente|front" _logs/UTAC109* Desktop/RELATORIO-UTAC109*   -> 0 "a frent"
grep -rniE "LACUNA|bloqueante|TODO|FIXME"   -> ver §SEG1
git worktree list                           -> 2 worktrees orfaos (P-109h.2-2) + main
curl -X POST .../chatbot {"pergunta":...}   -> modoBusca=textual, modoResposta=template  (R-1)
curl https://support.google.com/.../9877032  -> politica de jogos de azar/concursos (pt-BR)
curl https://support.google.com/.../10281818 -> politica de pagamentos (pt-BR)
grep -rniE "leil[ãa]o|aposta|sorteio" src/**/*.jsx -> so identificadores + negacoes em RegrasOficiais
```

**Erros dos meus proprios instrumentos (declarados, nao escondidos):**
1. A rotulagem «P-a = 33px (< 44px WCAG)» estava **mal atribuida**: 44 px **nao** e o limiar AA (AA =
   24 px, WCAG 2.2 2.5.8). Corrigido em §SEG2(b).
2. O enunciado dizia «_logs/UTAC109*.spec.yml (todos)»; so existem 5. Nao e lacuna -- declarado.
3. A primeira tentativa de `grep` largo (todo o repo) estourou o tempo limite; foi estreitada por
   caminho. Nao afecta resultados (as varreduras finais correram completas).

**Estado:** sem correccao de codigo (o UTAC e so auditoria). Zero ficheiros de `src/`, `netlify/`,
`contracts/`, `package*` ou `.gitattributes` tocados.
