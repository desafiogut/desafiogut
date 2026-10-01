# UTAC105b.3 — SEG5 · Verificação e relatório de fecho (2026-10-01)

## 5.1 Verificação dos entregáveis
Todos os entregáveis existem e são legíveis; formatos válidos (`.md` UTF-8/LF, `.mjs` LF — regra A2);
o script ad-hoc do SEG6 confirma-os um a um (§6.1).

## 5.2 Suíte canónica (re-corrida após as correcções pós-veredicto)
```
frontend: VERDE 535/535 pass
backend:  VERDE 967/973 pass
VEREDITO: VERDE
```
(`node scripts/mc966-suite-harness.mjs ambos`, da raiz, foreground. 973 = 962 do baseline + 11 novos;
967 = 956 + 11. Aritmética fechada e confirmada **independentemente** pelo validador, que ainda mediu
979/985 com o PoC dele de 12 testes presente — prova de que a régua conta mesmo.)

## 5.3 Nada que não devia mudar mudou
- `cotas.mjs`: **1 hunk, aditivo puro (+32 / −0)** — o `update-corporativo` (fechado no b.1) e o POST
  genérico de admin (fechado no b.2) **não foram tocados**.
- `_tests/cotas-anti-fraude.test.mjs`: as **asserções são byte-iguais** às do baseline (comparação das
  linhas `assert.` — `diff` vazio); só o helper e os 12 call sites mudaram.
- `_logs/UTAC105b.1_*`, `_logs/UTAC105b.2_*` e `Desktop/RELATORIO-UTAC105b.3.txt`: **zero alteração**.
- `package-lock.json` (modificação **pré-existente à série**): **não commitado**.

## 5.4 Pendências declaradas (GATE 11 — declaradas, não escondidas)
1. **6 testes `skipped` do baseline (956/962) não enumerados um a um.** Conhecido: o harness conta
   `pass/tests` com 6 `skipped` e 0 `failed`. Não foram identificados pelo nome. **Declarado no SEG-1
   da passagem anterior e reconfirmado aqui.** Não é deste UTAC; fica como lacuna de medição.
2. **Achado ℹ️-1 (ordenação):** «anónimo + `endereco` de terceiros + CNPJ **já registado** noutro
   `cliente_id`» devolve **409 `cnpj_duplicado`** em vez de 401, porque o bloco anti-duplicidade do
   MC12.3 (`getCotaByCnpj`) corre antes da guarda. **Sem escrita nesse caminho** e **sem oráculo novo**
   (o mesmo 409 é alcançável anonimamente **sem** `endereco`). Documentado no código e aqui. Não parte
   nenhum caso legítimo ⇒ **não escalado**.
3. **Achado ℹ️-4 (contexto):** repetir anonimamente o cadastro **directo** (sem `endereco`) devolve
   **401** se a cota já existir — comportamento **pré-existente do UTAC105b.2**, não regressão deste
   commit; o frontend não o atinge (só posta após o GET de duplicidade dar 404).
4. **Correcções feitas DEPOIS do veredicto** (comentários/documentação/instrumento): **não re-validadas**
   por um 2.º validador independente (precedente da série). Mitigação: suíte re-corrida VERDE.
5. **Sem deploy.** Nada foi publicado no Netlify; a produção continua a servir o commit anterior até
   o auto-deploy publicar. `commit_ref` de produção **não medido** (GATE 6/G6 fica para o fecho operacional).

## 5.5 Controlo positivo
O script ad-hoc do SEG6 inclui um controlo positivo explícito: a **mesma** verificação da guarda é
aplicada ao código do baseline e **tem de falhar**. Se não falhasse, o detector seria cego e o verde
não valeria nada. Resultado: o controlo **falha como deve** (ver `_SEG6_saida.txt`).

## 5.6 VEREDITO DO SEG5: **FECHAR** (ver `Desktop/UTAC105b.3-RELATORIO.md`)
