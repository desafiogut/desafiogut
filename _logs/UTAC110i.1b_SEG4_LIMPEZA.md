# UTAC110i.1b — SEG4 (LIMPEZA) — TEMPORÁRIOS, WRAPPER E WORKTREE

**Auto-contido.** Arrumação do que ficou de fora do repo. Nada aqui altera produto.

Executor: Hermes (deepseek-v4-flash) · Data: 2026-10-16

---

## 4.1 `C:\Users\Moltbot\tmp-utac110i1-sonda\` — REMOVIDO

Era a pasta de sondas do UTAC110i.1 (fora do repo), com 3 ficheiros. **Registado antes de remover**
(há coisas que não se apagam sem deixar rasto):

| ficheiro | bytes | md5 |
|---|---|---|
| `sonda-api-cdv-purchase.mjs` | 2 421 | `55431037266dc8da0106a9c8a1621f14` |
| `sonda2.mjs` | 2 654 | `7ea80164638b73b0c576d4a4e968ca99` |
| `sonda3.mjs` | 2 075 | `41fc9cff9fd56b19a95206ce0609b79d` |

O que elas mediram está preservado em `_logs/UTAC110i.1_SEG0_FRENTE-B.md` (factos medidos contra o
pacote instalado). Removido com `rm -rf` sobre um caminho **sem junctions** (verificado: é pasta
simples, não há `node_modules` dentro).

## 4.2 `scripts/run-mut110i1d.sh` — **MANTIDO** (e com guarda de backup nova)

**Decisão: manter.** É útil para retomar (é o único caminho que corre a prova de mutação da FRENTE D
em foreground com TTY próprio — a armadilha «stdin is not a tty → log de 26 bytes = falso verde»).
**Documentado no próprio ficheiro.**

**Alteração acrescentada (justificada pela causa raiz deste UTAC, medida — não por precaução):** o
wrapper passa a tirar uma cópia `.bak` **fora do repo** antes de arrancar e a conferir o md5 no fim,
**restaurando** se divergir. Motivo: o instrumento restaura o alvo **dentro** do processo, pelo que
uma corrida **morta a meio** de um mutante deixa o ficheiro mutado — foi assim que o UTAC110i.1 fechou
com `useComprarPasse.js` no estado do mutante D3. Ver `UTAC110i.1b_SEG0_FRENTE-A-DIAGNOSTICO.md` §0.3.

**Medido (o wrapper novo, corrido uma vez):** `9/9 RED` · `md5 depois: 7bbc1625… (== .bak, intacto)` ·
`EXIT=0`. Saída: `_logs/UTAC110i.1b_SEG4_WRAPPER.txt`.

**Resíduo declarado (não fechado aqui):** os OUTROS `*-prova-mutacao.mjs` da série continuam sem
guarda — e a guarda certa é no instrumento, não no wrapper. Registado em **DEBT-041**.

## 4.3 Worktree do validador adversarial (SEG3) — removido no fim do segmento

`C:/Users/Moltbot/tmp-utac110i1b-val/wt` (detached em `49eca17`), criado com
`node scripts/worktree-helper.mjs criar … 49eca17` (regra A13 — junctions de `node_modules`).
Removido com `node scripts/worktree-helper.mjs remover …` **depois** de copiar o veredicto para o
repo (a ordem importa: apagar um worktree sem `rmdir` das junctions primeiro esvazia o
`node_modules` REAL — regra medida).

## 4.4 Temporários do executor — removidos no fecho

`C:\Users\Moltbot\tmp-utac110i1b-31066\` (nome com o PID 31066) continha: os scripts de medição
(`seg1-repro-hang.sh`, `seg0-ficheiro-antes.sh`, `seg1-depois.sh`, `seg1-mutacao.sh`,
`seg2-verificacao.sh`), a sonda do ramo (`sonda-ramo.mjs`), a prova dirigida do D7 (`prova-d7.mjs`),
o script ad-hoc do SEG6, o `.bak` do hook e os logs intermédios. **Os artefactos que importam foram
copiados para `_logs/` antes da remoção** (é para isso que eles existem) e a pasta é apagada no
fecho. `.bak` do `/tmp` do wrapper também removido.
