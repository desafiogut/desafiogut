# UTAC110k.1 — Proposta de Art. 17º para a v5.1 (NÃO aplicada)

> **Porque este ficheiro existe:** a emenda do Art. 17º foi escrita e depois **revertida**, porque o
> repo tem uma invariante testada (`utac106h-regras.test.mjs`, teste «FONTE») que exige
> `corpo(REGULAMENTO-v5.md) == corpo(GUTO-REGULAMENTO.md)`, **byte a byte** — «app e GUTO dizem o mesmo».
> Emendar só a transcrição parte essa garantia; emendar o GUTO está fora do âmbito autorizado.
> A decisão (emitir v5.1) é do operador. Este ficheiro guarda o texto exacto para que nada se perca.

## Texto proposto (substitui integralmente o Art. 17º)

```
Art. 17º — O Passe Desafio (R$ 2,00) é a transação principal que dá acesso a métricas, GUTO, ECOQUILDO e 1 crédito de lance. O crédito de lance é um benefício suplementar e subordinado à compra do Passe, não uma taxa separada.

> **EMENDA R18-110k.1 (2026-10-17) — Art. 17º.** Texto substituído. O anterior («Os pontos de lance não
> são comprados com dinheiro real — são ganhos por atividade no aplicativo») contradizia o Art. 16º, VI
> (o Passe inclui bónus de pontos de lance) e o fluxo real de compra, em que o utilizador paga R$ 2,00
> e recebe 1 crédito de lance. Razão da emenda: a Play Console lê «taxa para participar» onde o texto
> nega o pagamento que existe (política de *Gamified Loyalty Programs*: o benefício tem de ser
> suplementar e subordinado a uma transação monetária qualificada).
> **Esta emenda vive só na transcrição.** O PDF oficial v5.0 e `docs/GUTO-REGULAMENTO.md` — que é
> fonte de verdade e NÃO foi tocado (fora do âmbito do UTAC110k.1) — mantêm o texto antigo até à
> emissão da **v5.1**. A divergência está registada em `_logs/DEBT.md` (DEBT-051) e não pode ser
> silenciada: quem ler a transcrição fica a saber que ela já não é 1:1 com a fonte neste artigo.
> **Terminologia:** este artigo passa a falar de «crédito de lance» (o que o app consome); os Arts.
> 16º, 18º e 23º continuam a falar de «pontos de lance». A relação entre os dois conceitos é matéria
> da errata do v5 (DEBT-042) — não foi resolvida por interpretação neste UTAC.
```

## O que a v5.1 exige, pela ordem certa

1. Aplicar o texto acima **em `docs/GUTO-REGULAMENTO.md`** (fonte de verdade) e em `docs/REGULAMENTO-v5.md`
   (transcrição) — os dois, para a invariante voltar a valer.
2. Emitir o **PDF oficial v5.1** e actualizar `> Versão 5.0` → `5.1` nos dois ficheiros.
3. Verificar o **gate legal** (`accept-terms`): se a versão do Regulamento entra no que o utilizador
   aceita, uma versão nova implica **novo aceite**. Confirmar em `_lib/*gate*` e no `consent-log`.
4. Re-verificar o GUTO (respostas do assistente citam artigos por número).
5. Só então remover a «EXCEPÇÃO DECLARADA» do cabeçalho do v5 (que o 110k.1 chegou a acrescentar e que
   foi revertida com o resto).

## O que NÃO foi decidido por mim

Se o texto proposto é suficiente para a política de *Gamified Loyalty Programs* da Google — isso é
matéria do parecer (110k), não de engenharia.
