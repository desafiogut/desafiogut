# UTAC110j.5 — SEG-1 (medição)

Data: 2026-10-18 · HEAD de partida `74dd5e2` (= origin/main) · executor: Claude Code (Opus 5.5).

## A14 (RAM)
- 1.ª leitura: **636 MB** (< 1500) → trim de working sets (131 processos, **nada fechado**) → **1934 · 1876 · 1856 MB**. Portão cumprido.

## Baseline
- `node scripts/mc966-suite-harness.mjs frontend` → **VERDE 1227/1227** (5 min 23 s). Bate com o declarado.

## O que a medição diz dos 4 ficheiros
| ficheiro | estado actual (modelo antigo) |
|---|---|
| `CardLance.jsx` | Relâmpago bloqueado por **créditos** (`estadoCreditosLance`); badge «⚡ N créditos»; hint «Cada lance consome 1 crédito»; mapa de erros com `sem_creditos_lance` / `consumo_credito_falhou` (códigos que o backend **já não emite**). Não lê `pontosLanceConsumidos/Restantes`. |
| `MinhaCarteira.jsx` | card `data-saldo="creditos"` «⚡ Créditos de lance»; erro «pontos e créditos». |
| `RegrasOficiais.jsx` | publica o v5.1 INTEGRAL do `.md`. O Regulamento diz «200 pontos de lance» (Art. 17º) e 1 ponto = R$ 0,01 (Art. 18º), mas **não fixa** os valores 5 / 10 / 50 / 50 / 225 ⇒ as proporções **não estão no app**. |
| `MeusAtivos.jsx` | painel `PainelPontosLance` já diz «pontos de lance» (110j.4b), mas: sem rótulo para `passe-relampago`/`lance`/conversões (caem em «Outro»), texto «ganhos de graça» (o Passe também dá); `EstadoBonus` diz «🎟️ Bônus de senhas». |

## Acesso ao saldo de pontos no CardLance
- **Existe**: `usePontos()` já devolve `lance: {pontos, movimentos}` (`pontosLanceDaResposta`, 110j.4b). Nada a reportar como em falta.

## Contrato do backend (lido, não tocado)
- `lance-relampago.mjs:250` → 400 `saldo_pontos_insuficiente` com `error.pontosLance` e `error.pontosNecessarios`; 502 `consumo_pontos_falhou`; 409 `lance_em_processamento`.
- Resposta 201: `pontosLanceConsumidos`, `pontosLanceRestantes` (já com o +10 da missão).
- Conversões (migrações 110n/110n.1): entradas do `historico_lance` com `motivo` `conversao-creditos` / `conversao-senhas`.
- Constantes: `fontes-lance.mjs` 5/10/50/10 por mês/225/15 dias; `ledger-lance.mjs` 200 por Passe e 200 por crédito; `pontuacao-store.mjs` 50 por sequência; `passe-pontos.mjs` 10 fidelidade por Passe.

## Testes que fixam os textos antigos (vão ser actualizados e declarados)
- `src/__tests__/utac110d-front.test.mjs` (C e D: «Créditos de lance», «⚡ N créditos», `sem_creditos_lance`; A: «10 pontos + 1 lance»).
- `src/__tests__/utac110j3-gate-carteira.test.mjs` (ordem `data-saldo="creditos"`, «Créditos de lance 3 disponíveis»).
- `src/__tests__/utac110f-front-missoes.test.mjs` (`txt("creditos")`).
- `src/pages/__tests__/utac106h-regras.test.mjs` (FONTE: proíbe «R$ 2,00»/«ECOQUILDO»/«pontos de fidelidade» escritos à mão no `.jsx`; COBERTURA: palavras entre o 1.º `<section` e o fim = documento).
- possíveis: `utac106e-compra-passe` (benefício do Passe), `lib/pontosLance.test.mjs`, `MeusAtivos.test.mjs`, `componentes.test.mjs`.

## Conflitos declarados (decisão do executor, a ratificar)
1. **pt-BR:** a nota pedida diz «Os **teus** créditos…» — pt-PT, proibido pela guarda `utac107g2-pt-br`. Usa-se «Seus créditos de lance antigos foram convertidos…».
2. **Regras Oficiais × guarda FONTE do 110h:** o bloco das proporções não pode ser escrito à mão no `RegrasOficiais.jsx`. Vive em `src/lib/pontosLance.js` (fonte única do frontend, amarrada às constantes do backend por teste) e entra na página **antes** do 1.º capítulo, como resumo informativo — o texto que vincula continua a ser o Regulamento integral, intacto.
3. **Ficheiros fora da lista** (extensão declarada): `src/lib/pontosLance.js` (constantes + funções puras), `src/lib/passes.js` (benefício/sucesso do Passe Relâmpago: «+200 pontos de lance»), `src/components/meus-ativos/PainelPontosLance.jsx` (rótulos/texto). O `EstadoBonus.jsx` NÃO é tocado: o `MeusAtivos.jsx` passa a desenhar um estado do bónus em pontos e o componente MC93 fica no código (precedente do `PainelTorneio`).
