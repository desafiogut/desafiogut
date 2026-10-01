# UTAC105b.1 — SEG4 · Consolidação e relatório final (2026-09-30 → 2026-10-01)

Consolidação dos segmentos. Relatório de fecho: `Desktop/UTAC105b.1-RELATORIO.md`.

## 4.1..4.5 Logs do UTAC
| segmento | ficheiro | conteúdo |
|---|---|---|
| SEG-1 | `_logs/UTAC105b.1_SEG-1_MEDICAO.md` | baseline `5e7ed24` confere; suíte 535/535 · 913/919 = declarado; **P10 accionado**: o painel não envia token (medido no `apiPost`) + segundo bloqueio (`cnpj:` sem `endereco`). **PARAR e reportar.** |
| SEG0 | `_logs/UTAC105b.1_SEG0.md` | Frente A: **PoC com o handler real** — sem token → 200 **e escreveu**; token alheio → 200 **e escreveu**; fluxo documentado; 1 consumidor |
| SEG1 | `_logs/UTAC105b.1_SEG1.md` | Frente B: a correcção (2 ficheiros), **18 testes**, **10 mutantes mortos**, 2 erros meus declarados, errata de md5 |
| SEG2 | `_logs/UTAC105b.1_SEG2.md` | Frente C: A/B pareado (sem token 200→401, alheio 200→403, **dono/admin 200→200**) |
| SEG3 | `_logs/UTAC105b.1_SEG3_VALIDADOR.md` | **validador adversarial** (transcrito — ver nota) |
| SEG5 | `_logs/UTAC105b.1_SEG5_VERIFICACAO.md` (+ `_saida.txt`) | verificação ad-hoc 13/13 VERDE + verificação em produção do operador |
| SEG6 | `_logs/UTAC105b.1_SEG6_VERIFICACAO.md` | fecho |

### 📝 Nota sobre o SEG3 (transparência, R3/R8)
O validador **esgotou o orçamento de iterações antes de gravar** o ficheiro. O veredicto dele
(`APROVADO COM RESSALVAS`) foi recuperado **na íntegra** do resumo da delegação e **transcrito
verbatim** para `_logs/UTAC105b.1_SEG3_VALIDADOR.md`, com nota de atribuição no topo. **O executor
não se atribui esse veredicto.** Trabalho dele: ambiente próprio fora do repo (`tmp-utac105b1v/`),
sonda com **40 casos**, **18 mutantes**, e uma correcção à **minha régua** (md5 CRLF vs LF).

## 4.6 Relatório de fecho
`Desktop/UTAC105b.1-RELATORIO.md` — escrito.
`Desktop/UTAC105b.1-PARAGEM.txt` — o relatório da paragem (mantido: é parte da história do UTAC).

## 4.7 CLAUDE.md (P5) — actualizado
Secção `## UTAC105b.1 …` inserida antes do registo de armadilhas + prefixo novo na linha 2, em **modo
binário com `assert`** por substituição (método do MC100 — o ficheiro tem NULs e bytes de controlo).

## 4.8/4.9 Commit + push e cópias
Commit `828f719` (**já publicado** — ver SEG2). Cópias dos artefactos em `Desktop/UTAC105b.1_*.md`.

## ⚠️ Achado GRAVE fora do escopo — escalado ao operador (GATE 12 / AU3)
O validador mediu (⚠️ **F1**) que o ramo **irmão** `cotas?action=register-corporativo` **continua sem
autenticação nenhuma** e **sobrescreve a cota da vítima**: um `POST` **anónimo** com
`{endereco: <0x da vítima>, cnpj: <novo>}` devolve **201** e `upsertCota` substitui `empresa`, `cnpj`,
`email` e destrói `categoria`/`vendida`/`valor`. **Não foi corrigido aqui** — está fora do escopo
autorizado (o UTAC105b.1 autoriza só a ação `update-corporativo`, e o enunciado manda **PARAR e
reportar** antes de tocar em mais). Fica declarado como **P0 aberto**, com proposta de UTAC próprio.
Também registado (ℹ️ **N2**): o POST genérico de admin (`cotas.mjs:567-580`) constrói o registo **sem
`endereco`** → apaga essa coluna; agora que o ramo (b) do MC89.38 depende dela, essa cota perde o
vínculo e o dono levaria 403. Pré-existente, fora do escopo, registado.

## 4.x VEREDITO DO SEG4: **FECHADO COM 1 P0 ESCALADO** (fora do escopo) — o UTAC105b.1 em si fecha.
