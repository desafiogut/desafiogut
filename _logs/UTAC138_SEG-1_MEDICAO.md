# UTAC138 — SEG-1 MEDIÇÃO (Edição Especial Relâmpago, bónus 100, apuração, Top 10, AAB v12)

Enunciado: «UTAC-EDICAO-ESPECIAL-1» (Hermes → operador, 2026-11-17). Numerado UTAC138 (último fechado: UTAC137).
Só leitura neste segmento. Medido em 2026-11-17 23:36 -03:00.

## -1.1 Estado do repo
- HEAD `8d216d2` em `main` (= baseline «Regulamento v6.0» do enunciado). `origin/main..HEAD` vazio.
- Ficheiros alheios modificados: `.agents/skills/aidesigner-frontend/*`, `.gitignore`, `.mcp.json`,
  `desafio-gut/frontend/package-lock.json` + `_logs/MC100*`… por versionar → **não são meus, não tocar**.

## -1.2 Caminhos nomeados
| enunciado | medido |
|---|---|
| `closed-testing/` lista de testadores | **não existe lista de carteiras**. Os logs só têm o contrato `0x0052477a…`, bytecode e `0xfea436f7…` |
| tabela Supabase `edicoes` | **não existe**. Edições vivem no Blob Netlify `edicoes-metadata` (`_lib/edicoes-core.mjs:26`, MC94.1) |
| id `ESPECIAL-RELAMPAGO-1` | **rejeitado** por `EDICAO_ID_RE = ^(?:(PROG\|RELAMP\|R)-\d+\|ESPECIAL-[A-Z0-9]+)$` (`edicoes-core.mjs:46`): o 2.º hífen fica fora |
| `_lib/comprar-passe-tipado.mjs` | existe (332 l.). Linha 18: «⛔ SEM pontos de lance (Art. 6º v6, Google Play Gamified Loyalty)» |
| `ResultadosEdicao.jsx` | não existe. Existe `src/components/edicao-especial/` (CardEdicaoEspecial, PainelVencedorEspecial, useResultadoEspecial) |
| imagem `Desktop/EDICAO ESPECIAL.jpeg` | existe (478 740 B). A arte diz «17 a 30 de novembro/2026» → **R18-A: o operador aceita a divergência** |
| Storage | 1 bucket: `entregas-temp` (público). Não há bucket de artes |

## -1.3 Fontes
- Pontos de lance: `public.pontos.pontos_lance` + `historico_lance` (`_lib/ledger-lance.mjs`), motivos
  fechados em `MOTIVOS_PONTOS_LANCE` (sem `bonus-passe-relampago` nem `recompensa-teste`).
- Vencedor da especial hoje: **on-chain** `resultados(id)` (consolidação pela coordenação, gas mainnet).
  Os lances revelam-se só com o marcador `bid:{id}:consolidado` E a edição fechada (`lances-flash.mjs`).
- Carteiras: `atividade_utilizadores` = 28 endereços; `pontos` = 8 linhas (as 8 mais recentes;
  2 delas com compras Play: 7 e 4 compras).

## -1.4 Medições específicas
- versionCode 11 / 1.1.1 (`android/app/build.gradle:27-28`). Aceite legal 3.4.
- **RAM livre 1 144 MB < 1 500 MB** (A14) → o build do AAB fica bloqueado até haver memória.
- Hora local 23:36: as 19h-20h de hoje (17/11) já passaram.

## -1.5 Disco
16 GB livres (> 5 GB).

## ⚠️ Conflitos (R20 — não resolvidos pelo executor)
1. DATA do evento — o enunciado exige-a ao operador.
2. Testadores — não há lista; quais carteiras recebem 400?
3. Bónus +100 no Passe — o UTAC136 tirou-o por conformidade Google Play (Gamified Loyalty). Repor = decisão do operador.
4. Deploy/push não estão nas autorizações, mas o bónus e a apuração só funcionam publicados.
5. Apuração instantânea off-chain × vencedor autoritativo on-chain (consolidação com gas).
6. Id `ESPECIAL-RELAMPAGO-1` incompatível com o regex → proposta `ESPECIAL-RELAMPAGO1`.
7. «Produto a definir» → a arte nomeia «Fritadeira Elétrica Sem Óleo Quad Fry 4,2 L Elgin».
8. Tabela `edicoes` → executar a intenção no Blob `edicoes-metadata` (padrão MC94.1).

## -1.7 Veredito
**AJUSTAR** — perguntar ao operador (1-5) antes do SEG0.

## R18 — decisões do operador (2026-11-17, ~23:40)
- **R18-138-A** a divergência da arte («17 a 30 de novembro») fica: «está tudo bem quanto às divergências na arte, apenas siga».
- **R18-138-B** data: «corre apenas no dia 30 às 19h» → **30/11/2026 19:00–20:00 -03:00** (22:00Z–23:00Z).
- **R18-138-C** testadores = **as 28 carteiras de `atividade_utilizadores`**.
- **R18-138-D** repor **+100 pontos de lance** no Passe Relâmpago (PIX e Google Play), motivo `bonus-passe-relampago`, com o risco Gamified Loyalty declarado.
- **R18-138-E** push para `main` + deploy em produção autorizados, depois do validador.
- Executor (declarado, intenção do enunciado): id `ESPECIAL-RELAMPAGO1` (regex), produto = nome da arte, edição no Blob `edicoes-metadata`, resultado da apuração num Blob próprio.

**Veredito final do SEG-1: SEGUIR.**
