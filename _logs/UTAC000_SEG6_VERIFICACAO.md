# UTAC000 — SEG6 · Verificação ad-hoc e fecho (2026-09-30)

## 6.1 Script ad-hoc
`C:/Users/Moltbot/tmp-utac000/utac000-seg6-verificacao.mjs` — **nome único, corre UMA VEZ**, fora do
repo (não versionado, declarado). Saída real: `_logs/UTAC000_SEG6_saida.txt`.

## 6.2 Verificações (saída real, 11 verificações)
```
VERDE  entregaveis da skill (30)
VERDE  substituidos ja ausentes (protocol/regras.md)
VERDE  caminhos citados dentro do pacote existem
VERDE  spec-template.yml: YAML com campos obrigatorios
VERDE  exemplo.spec.yml: YAML com campos obrigatorios
VERDE  exemplo.UTAC.md: 8 seccoes
VERDE  nenhum ficheiro fora do escopo no commit
VERDE  _logs/MC* e Desktop sem modificacao
VERDE  disco >= 5 GB  [13 GB livres]
VERDE  [CONTROLO+] entregaveis -> caminho errado da FALHA
VERDE  [CONTROLO+] secao inexistente e' detectada
VEREDITO: VERDE  (11 verificacoes)
```
Suíte (`node scripts/mc966-suite-harness.mjs ambos`, **da raiz do repo**):
```
frontend: VERDE 530/530 pass
backend:  VERDE 885/891 pass
VEREDITO: VERDE
```
→ **nada quebrou**: idêntico ao baseline `160bf09` (885/891 é o número do fecho do MC105a.1; o 874/880
do enunciado era do MC105a, logo desactualizado — ver SEG-1 §-1.4b).

## 6.3 Controlo positivo
O script inclui 2 controlos embutidos e ambos VERDE, mais as provas de mutação dos testes ad-hoc:
- `utac000-valida-spec.mjs` → `caso1` VÁLIDO; M1 (sem `baseline`), M2 (`type` inventado), M3 (sem
  `proibe`), **M5 (`regras_activas:[Z]`)** → todos detectados.
- `utac000-teste-gates.mjs` → VERDE; com o mutante `types/produto.md` → `HG13 (concorrência)` dá
  **VERMELHO (2)**; restaurado (md5 `8f694bd1bd0a27f62e9816fb68ebc5ce` idêntico) → VERDE.
Sem estes controlos, um «VERDE» seria indistinguível de um medidor que não mede nada.

## 6.4 Artefactos copiados para `Desktop/UTAC000_*.md`
`UTAC000_SEG-1_MEDICAO.md` · `UTAC000_SEG0.md` · `UTAC000_SEG1.md` · `UTAC000_SEG2.md` ·
`UTAC000_SEG3.md` · `UTAC000_SEG4_VALIDADOR.md` · `UTAC000_SEG4b_VALIDADOR.md` ·
`UTAC000_SEG4c_VALIDADOR.md` · `UTAC000_SEG5_VERIFICACAO.md` · `UTAC000_SEG6_VERIFICACAO.md` ·
`UTAC000_REGISTO-CLAUDE.md` — e o relatório `Desktop/UTAC000-RELATORIO.md`.

## 6.5 Consolidação
Logs consolidados no SEG5 §5.1-5.6.

## 6.6 P4/R18 — decisões em 3 lugares
1. `_logs/UTAC000_SEG0.md` (incl. §A.4 do adendo) · 2. `Desktop/UTAC000-RELATORIO.md` ·
3. `_logs/UTAC000_REGISTO-CLAUDE.md` (o `CLAUDE.md` está **proibido** neste UTAC — o registo fica lá
   para aplicação futura, com o texto pronto a colar).

## 6.7 Confirmação de fecho
30 ficheiros da skill · validador em 3 rondas · verificação ad-hoc VERDE · suíte VERDE ·
UTACs fechados intactos · código de produção intacto · push em foreground.

## 6.8 Commit final
Ver `git log --oneline -1` no fecho (mensagem `chore(UTAC000): SEG5/SEG6`).

## 6.9 O UTAC105b pode arrancar com a skill?
**SIM.** A composição está provada por execução (`utac000-valida-spec.mjs caso1-valido.yml → VALIDO`,
com a lista de alvos já a apontar para `protocol/regras/`). O próximo UTAC escreve-se como
`UTAC105b.spec.yml` (menos de 60 linhas) e corre-se com `/utac-run UTAC105b.spec.yml`.

## VEREDITO DO SEG6: **FECHADO.**
