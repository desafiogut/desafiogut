# UTAC107g — SEG7 · Validador adversarial (veredicto verbatim + tratamento)

**Despachado:** subagente independente (Claude Code, general-purpose), worktree `C:/Users/Moltbot/tmp-107g-val/wt` @ `996c4c3`
(helper A13, 4 junctions; removido no fim com `worktree-helper.mjs remover` — `node_modules` 498 · 414 intactos).
**Instrução:** a literal do operador (a)-(k) + procurar testes vácuos, efeitos do catch-all, `?rc=1`, escopo, afirmações do log.
**Custo:** 142 205 tokens, 32 chamadas, 368 s.

## Veredicto (verbatim, resumido nos achados)

**VEREDICTO: PARCIAL** — «O CÓDIGO do UTAC107g cumpre os 11 critérios do operador (a)–(k) sem defeito de produto encontrado;
PARCIAL porque a PROVA tem 2 lacunas: dois mutantes que pediste explicitamente para procurar («catch-all a engolir uma rota
viva» e «indicador fora do vidro do saldo») sobrevivem.»

| # | Resultado (validador) |
|---|---|
| a destino sem caminho | OK |
| b botão removido ainda usado | OK |
| c senhas sem casa | OK |
| d indicador com 0 | OK |
| e caminhos mortos existem | OK (só comentários) |
| f duplicações não reduzidas | OK (7 → 4) |
| g testes BottomNav/Sidebar | OK (97/97 no conjunto alvo) |
| h outra aba quebrou | OK |
| i backend alterado | OK (só `_tests/mc8843`, declarado) |
| j `.bak-*` tocado | OK (md5 = log) |
| k suíte | VERDE 836/836 · 1095/1101 |

Afirmações do log verificadas por ele: MeusAtivos 445 linhas no baseline; 84 funções; `PrivyRoot.jsx:217`; rail «🔗 N»;
818 → 836 = 6+4+3+5. Mutação do executor reproduzida 15/15 RED com md5 restaurado.

**Achados:**
- ⚠️1 **Teste vácuo — indicador fora do vidro passa verde** (V7: indicador movido para depois do `</GlassCard>` → 97/97 pass).
- ⚠️2 **O catch-all esconde rotas vivas perdidas** (V1 sem `/vitrine/:slot`, V2 sem `/seguranca`, V4 sem `admin/pedidos` →
  SOBREVIVEM). «A lacuna era pré-existente, mas o catch-all torna a regressão invisível.»
- ℹ️3 cor roxa da contagem não testada (V12 sobrevive). ℹ️4 status «stale» na Carteira não testado (V9 sobrevive).
- ℹ️5 comentários apontam para `/edicao/:id` (`EdicaoCard.jsx:8`, `EdicaoBanner.jsx:6-7`, `_tests/mc894-rotas-trabalho.test.mjs:33`
  como string de exemplo de função pura). ℹ️6 mistura pt-PT («Tens…») / pt-BR na mesma secção (declarada).
  ℹ️7 o código que lê `?rc=1` (`App.jsx` CorporativoRoute, `CorporativoDashboard.jsx:33`) ficou sem produtor.

Os seus 16 mutantes: V1 V2 V4 V7 V9 V12 sobreviveram; V3 V5 V6 V8 V10 V11 V13 V14 V15 V16 RED. **Não medido:** browser/APK real.

## Tratamento (executor)

| Achado | Tratamento | Prova |
|---|---|---|
| ⚠️1 | o teste do vidro passou a medir a **profundidade corrida** do `<div>` do vidro do saldo até ao indicador (nunca pode chegar a 0). ⚠️ A 1.ª correcção (profundidade final ≥ 1) ainda deixava passar «fechar o vidro e abrir outro» — reforçada antes de medir. | V7 (forma «`</GlassCard><GlassCard>` antes do indicador») → **RED** |
| ⚠️2 | novo teste em `utac107g-navegacao`: **todo** o destino de BottomNav, Sidebar, `adminNav` e **todo** literal/template de navegação em `src/` tem de resolver para rota própria (≠ `*`) no `matchRoutes` real; com controlos (≥30 destinos, sondas `/vitrine/…`, `/seguranca`, `/admin/pedidos`, `/corporativo/cupons`) | V1, V2, V4 → **RED** |
| ℹ️3 | asserção da cor `#a78bfa` no `<strong>` da contagem | V12 → **RED** |
| ℹ️4 | teste: com `stale` o indicador aparece (mesma regra de Meus Ativos) | V9 → **RED** |
| ℹ️5/ℹ️7 | **não corrigidos** — ficheiros fora do AUTORIZA (`EdicaoCard.jsx`, `EdicaoBanner.jsx`, `CorporativoDashboard.jsx`, teste de função pura do backend); registados como pendência | — |
| ℹ️6 | mantido: as frases são as do enunciado (declarado) | — |

**Mutação final: 21/21 PROVADOS** (15 do executor + 6 sobreviventes do validador), md5 idêntico. Suíte **838/838 · 1095/1101 VERDE**.
⚠️ **As correcções pós-veredicto NÃO foram re-validadas por uma 2.ª ronda** (declarado — GATE 11); a prova delas é a mutação acima.
