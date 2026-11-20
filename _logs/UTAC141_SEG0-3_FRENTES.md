# UTAC141 · SEG0–SEG3 — as quatro frentes (o que mudou e porquê)

Baseline `3bbdebe`. Cada frente foi feita e medida isoladamente; a suíte canónica correu no fim.

## FRENTE A — o layout da edição (sub-cartão para fora, «Dar Palpite» para dentro)

**Ficheiros**: `src/components/_formAcaoEdicao.jsx` (novo), `src/components/CardLance.jsx`,
`src/components/CartaoEdicao.jsx`, `src/pages/OfertasProgramadas.jsx`, `src/pages/MercadoLances.jsx`.

O padrão canónico da acção **existia, mas copiado à mão** dentro de `OfertasProgramadas.jsx` (um
`<label>` + `<div display:flex>` com input e botão). Foi extraído para `FormularioAcao` + `ESTILO_ACAO`
(objecto congelado, um só para os dois ecrãs) e a Programada passou a consumi-lo — sem mudar um valor de
estilo (48 px, `flex: 1 1 120px`, dourado `#f5a623`, `borderRadius 10px`).

`CardLance` ganhou `variante`:
- `"cartao"` (omissão) — o Relâmpago do MLC, **intocado** na estrutura (cabeçalho, barra de carteira,
  pipeline, rodapé, botão largo);
- `"embutida"` — a acção dentro do `CartaoEdicao`, sem nada disso, com o botão **na linha do campo**.
  É a que a Edição Especial usa (`MercadoLances.jsx`, `renderLance`).

O esqueleto de conformidade (MC29.1, `isLeilaoAtivo === false` no APK) corre **antes** das duas variantes:
na embutida é um esqueleto de duas barras, não um formulário — a regra de conformidade não foi contornada.

Texto: `Seu lance (em pontos)` e `Ex.: 40` e pré-visualização «N pontos» no Relâmpago; o ramo Programado
LEGADO mantém `(em centavos)` / `Ex: 5 = R$ 0,05` / `R$ 0,05` (lá o valor ainda é lido em R$).
`ACOES.lance.rotulo` (cartão vazio, Dashboard e MLC) passou também a `(em pontos)`.

## FRENTE B — o saldo de pontos no ecrã

**Ficheiros**: `src/context/AppContext.jsx`, `src/components/CardLance.jsx`.

O servidor já debitava (medido no SEG-1: `delta: -1, motivo: "lance"` na BD de produção). O que faltava era
o ecrã: `CardLance` chamava `refetchPontosLance()` — o `refetch` da **sua** instância de `usePontos`. A
Carteira e o Início são outras instâncias, que só releem quando muda `pontosNonce`.

`AppContext` já tinha o contador (`refetchPontosAgora`) mas **não o punha no `value`**. Passou a pôr, e o
`CardLance` chama-o no sucesso do lance e no 400 `saldo_pontos_insuficiente`. Efeito: todas as instâncias
de `usePontos` releem o `ler-pontos` e o número desce no instante do lance.

## FRENTE C — a tabela ao vivo e o selo

**Ficheiros**: `src/components/edicao-especial/_estilo-especial.js`, `src/components/edicao-especial/CardEdicaoEspecial.jsx`,
`src/components/TabelaLances.jsx`, `src/hooks/useRankingEspecial.js`, `src/pages/MercadoLances.jsx`.

1. **Selo**: existiam duas fontes para o mesmo facto — a `BADGE` local do cartão (pela edição) e o
   `getEstadoEdicao` global da tabela (que segue `EM_BREVE_MODE`). A tabela passou a aceitar `selo={{texto, cor}}`
   e o `MercadoLances` passa-lhe `SELO_ESPECIAL[estadoEspecial(edicao, agoraServidor)]` — a MESMA tabela que o
   cartão usa (movida para `_estilo-especial.js`). Com a especial aberta, cartão e tabela dizem «🟢 Aberta».
   Sem `selo` (R-1 e OP) a tabela continua exactamente como era.
2. **`encerrado` da tabela**: com a especial no ecrã passou a vir do estado da especial (`ESTADO_ESPECIAL.ENCERRADA`)
   em vez do `encerrado` da R-1 — era a R-1 a decidir a divulgação de valores da especial.
3. **Releitura**: `useRankingEspecial` ganhou `nonce` (o `MercadoLances` incrementa-o no sucesso do lance),
   recarga de 20 s só com a aba visível e releitura em `visibilitychange`. A limpeza remove o intervalo, o
   listener e o canal. Uma leitura a mais, nenhuma escrita.

## FRENTE D — a skill oficial

- `C:\Users\Moltbot\Desktop\DESAFIOGUT\.agents\skills\utac-edicoes\SKILL.md` — documento completo (onde vive o
  cartão, o formulário, a tabela, os quatro estados, a linguagem, o checklist, os ficheiros-fonte da verdade).
- Skill Hermes `software-development/utac-edicoes` — resumo com o gatilho para futuros UTACs de edições e o
  diagnóstico do débito já feito (para ninguém voltar a «corrigir» o backend).

## Provas

- `_logs/UTAC141_SUITE.txt` — `frontend VERDE 1370/1370` · `backend VERDE 1519/1525` · `LIVRE_ANTES_SUITE_MB: 1533`
  (portão A14 cumprido). Baseline do UTAC140: 1362 frontend; +8 testes novos = 1370.
- `src/__tests__/utac141-edicao-padrao.test.mjs` — **9/9** (verde).
- Testes existentes ajustados (todos com o motivo declarado em comentário): `utac109e-cartao-unico`,
  `utac107d-mlc`, `utac106f-ofertas`, `utac108e1-mlc-op`, `Dashboard`, `utac110a-selo-contraste`,
  `utac129-front`, `especial-i18n`, `utac140-especial-aberta`.
- `especial-i18n`: o extractor passou a ler também `_estilo-especial.js` (as 4 chaves do selo mudaram de
  ficheiro, não desapareceram — controlo positivo mantido: ≥ 20 chaves).

## Pendente neste UTAC

- **Mutação** (GATE 7): **7 mutantes, 7 mortos**, md5 restaurado (`M1..M7`; ver relatório).
- **Validador adversarial** (GATE 9): lançado em contexto separado, veredicto em falta.
- **Deploy**: em curso (`netlify deploy --build --prod`), verificação no DOM real pendente.
- **AAB v13**: fica para UTAC próprio (o AAB v12 em produção não tem estas correcções).
