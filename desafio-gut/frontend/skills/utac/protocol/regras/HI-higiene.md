# HI — Higiene de Infraestrutura

**Auto-contido.** 10 regras (**HI1-HI10**). Departamento criado pelo operador em **2026-10-01**, a
partir das lições do **UTAC105b.3**.

**Porque existe:** o UTAC105b.3 levou a suíte do **frontend** de 535/535 para **68 falhas** sem que
nenhuma alteração do UTAC tocasse em `desafio-gut/frontend/src/**` — e a investigação consumiu metade
do UTAC antes de se perceber que o problema era da *infraestrutura de testes* (o Vite entregava ao
componente uma instância de React diferente da do ficheiro de teste), não do trabalho em curso.
Sem um departamento para isto, cada UTAC volta a pagar o mesmo pedágio.

**Fronteira:** HI trata *infraestrutura* (ambiente, testes, build, configuração). **Bug de produto é
outro UTAC** (HI4).

| regra | tema |
|---|---|
| HI1 | Deteção obrigatória |
| HI2 | Confirmação por baseline |
| HI3 | Correcção mínima (Ponytail) |
| HI4 | Limite de escopo |
| HI5 | Limite de tempo |
| HI6 | Registo em 3 lugares (R18) |
| HI7 | Testes + mutação |
| HI8 | Escalada obrigatória |
| HI9 | Não tocar em contratos |
| HI10 | Preservação de evidência |

---

## HI1 — Deteção obrigatória
**Todo SEG-1 mede a saúde GLOBAL da infraestrutura, não só o alvo.** No mínimo: a suíte (frontend e
backend, com o número medido), o build, o disco, os warnings do reporter, as **junctions/symlinks** de
`node_modules` e as **caches** das ferramentas.
*Como se verifica:* secção «Saúde da infraestrutura» no `_logs/UTAC<NNN>_SEG-1_MEDICAO.md`.
**Origem:** op: 2026-10-01 (UTAC105b.3) · **Cross-ref:** AU1, E9.

## HI2 — Confirmação por baseline
**Antes de corrigir, provar que o problema NÃO é do UTAC actual.** Reproduzir o sintoma no **baseline**
(`git worktree add <sha> --detach`, árvore isolada, com as junctions necessárias — ver A9) e/ou por A/B
do mesmo ficheiro. Sem isto **não há causalidade** — só correlação com o momento em que se olhou.
*Como se verifica:* log com a reprodução no baseline e o veredicto «é meu / não é meu».
**Origem:** op: 2026-10-01 (UTAC105b.3) · **Cross-ref:** E8, HI10.

## HI3 — Correcção mínima (Ponytail)
**A solução mínima que resolve é a certa.** Nada de refactor, nada de «aproveitar para arrumar», nada
de abstrair para o futuro. Uma regressão de infraestrutura corrige-se com a linha que a desfaz.
*Como se verifica:* diff do fix justificado linha a linha; zero alterações cosméticas.
**Origem:** op: 2026-10-01 · **Cross-ref:** E6, AU1.

## HI4 — Limite de escopo
**Só infraestrutura**: ambiente, ferramentas de teste, build, configuração. **Código de produto exige
UTAC próprio** — não se corrige um bug de produto «de passagem» só porque se estava ali ao lado.
*Como se verifica:* lista de ficheiros tocados contra a fronteira declarada no spec.
**Origem:** op: 2026-10-01 · **Cross-ref:** E2, GATE 3.

## HI5 — Limite de tempo
**Se a correcção excede 1 hora de trabalho, PARAR e abrir UTAC próprio.** A dívida regista-se em
`_logs/DEBT.md` (`HI5`) e a investigação fica documentada — não se continua a cavar dentro do UTAC em
curso, porque o orçamento dele não é ilimitado.
*Como se verifica:* se durou mais de 1 h, existe entrada em `DEBT.md` e/ou um UTAC novo aberto.
**Origem:** op: 2026-10-01 (UTAC105b.3 — a regressão consumiu metade do UTAC) · **Cross-ref:** AU4, ST.

## HI6 — Registo em 3 lugares (R18)
Toda decisão e toda dívida desta natureza registam-se em **três** lugares: `_logs/`, `CLAUDE.md` e
`Desktop/RELATORIO.md`. Um sítio só é um boato; três é um registo.
*Como se verifica:* presença nos três, com o mesmo ID.
**Origem:** op: 2026-10-01 · **Cross-ref:** P4, R18.

## HI7 — Testes + mutação
**Toda correcção HI segue T1/T4 — sem excepções.** Um teste que nasce verde precisa de mutação (repõe
o defeito → RED → restaura); e prova bidireccional: com o fix passa, sem o fix falha.
*Como se verifica:* mutante RED + `md5` restaurado; A/B pareado antes/depois.
**Origem:** op: 2026-10-01 · **Cross-ref:** T1, T4, GATE 7, GATE 8.

## HI8 — Escalada obrigatória
**Ambíguo, grande ou perigoso → PARAR e reportar** ao operador com as opções medidas. O executor de um
UTAC de saneamento não ganha autoridade sobre a infraestrutura só porque tropeçou nela.
*Como se verifica:* secção de conflitos do SEG-1 e as opções apresentadas.
**Origem:** op: 2026-10-01 · **Cross-ref:** AU3, AU4, GATE 12.

## HI9 — Não tocar em contratos
Uma correcção HI **nunca** altera API pública, schema, formato de dados ou interface do utilizador.
Se resolver o problema exige mudar um contrato, então **não é uma correcção HI** — é um UTAC de
produto, com o seu próprio A/B e validador.
*Como se verifica:* o fix não toca em contratos; se tocar, foi escalado.
**Origem:** op: 2026-10-01 · **Cross-ref:** E5, GATE 4.

## HI10 — Preservação de evidência
**Guardar a evidência ANTES de corrigir**: logs, stack traces, saídas do reporter, screenshots. A
evidência de um defeito é **perecível** — depois da correcção já não se reproduz, e sem ela o
relatório passa a ser uma afirmação sem prova.
*Como se verifica:* existem `_logs/UTAC<NNN>_*` com a saída do estado avariado, datados antes do fix.
**Origem:** op: 2026-10-01 · **Cross-ref:** GATE 2, HI2.
