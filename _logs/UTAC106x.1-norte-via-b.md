# UTAC106x.1 — NORTE VIA B + REVERSÕES FORMAIS (logs)

**Tipo:** consolidação documental (Frente 1) · **Skill UTAC** (protocolo) · **Data:** 2026-10-04 ·
**Modelo:** deepseek-v4-flash (Hermes Agent) · **Estado:** em curso (aguarda validador + commit)

> **Relação com o UTAC106x:** o UTAC106x parou no SEG-1 com 3 conflitos
> (`_logs/UTAC106x-consolidacao.md`). O operador decidiu **R18-C = «re-alinhamento total»** e partiu-o em
> dois UTACs sequenciais: **x.1** (esta NORTE + reversões formais) e **x.2** (ESCOPO-ALVO / FICHA-PLAY-PT /
> MC100_MATRIZ). Este log é o do **x.1**.

---

## §1 BASELINE (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| `HEAD` | `483576f605c05f559424dd75c26254ec7e3d821b` | `git rev-parse HEAD` |
| `origin/main` | `483576f605c05f559424dd75c26254ec7e3d821b` (== HEAD, 0/0) | `git rev-parse origin/main` |
| Localização da secção `NORTE DO PRODUTO` | **linhas 238–468** (corpo 238–467; `---` de fecho na 468) | `grep -an '^## '` + índice |
| Bloco de registo (R14) | série de blockquotes `> <emoji> **UTAC<NNN> …**` no **fim** do ficheiro (últimas linhas) | `tail` |
| 4 bytes de controlo | **linhas 2125–2126** (`0x00`, `0x1F` em cada; `0x7F` também presente) — confirmado com bytes crus | `python -c "…"` (não a ferramenta de leitura — A10) |
| Suíte (antes) | **frontend VERDE 694/694 · backend VERDE 992/998** | `node scripts/mc966-suite-harness.mjs ambos` |
| Suíte (depois da alteração) | **frontend VERDE 694/694 · backend VERDE 992/998** (inalterada — alteração só documental) | idem |
| Disco | 19 GB livres | `df -h /c` |

**Desvios do enunciado:** nenhum (o enunciado deu a secção em «~238-468» e os bytes em «2125-2126» — ambos
confirmados). ✅ **RESSALVA 4 satisfeita** (suíte 694/694 + 992/998).

**Preservação antes de substituir (RESSALVA 2):** o corpo **integral** da NORTE anterior (linhas 238–467 no
`483576f`) foi guardado **byte a byte** em `_logs/UTAC106x_NORTE-ANTERIOR.md` **antes** da substituição, e
resumido na §11 da nova secção. Nada foi apagado (P2 · GATE 15).

---

## §2 SEG0 — NORTE VIA B ESCRITA

**Ficheiro alterado: `CLAUDE.md`, e SÓ ele.** Método: reconstrução em bytes (A11) — lido o `HEAD` (= ficheiro
limpo), substituído o corpo da secção NORTE pelo conteúdo Via B, **sem tocar em mais nada**.

**O que a nova secção contém (a definição consolidada):**
1. **Produto** — e-commerce por dropshipping, 2 modalidades; o que **não** é (leilão/aposta/sorteio/azar/
   mercado de previsão/concurso de previsões); o que **é** (jogo de habilidade + programa de fidelidade).
2. **Passe Desafio** — R$ 2,00 = 1 ponto; componentes (ponto + palpite bónus + dados + GUTO); 50 pontos =
   cartão colecionável físico da **Família Quildo**; palpite = **bónus (+2)**, **não decide**.
3. **Vendedor legal** — **Associação Recreativa dos Nordestinos no Amazonas**, CNPJ 23.040.066/0001-00,
   associação recreativa sem fins lucrativos (União e Trabalho); isenção **IR/CSLL/Cofins**.
4. **Modelo de negócio** — receitas (Passes + valor do lance); **custos zero** (produto patrocinado);
   patrocínio (lojista fornece → visibilidade + leads; **não vende, não entra no app**).
5. **Estrutura fiscal** — NF-e **CFOP 5.910** (patrocínio) + **5.102** (venda); NF-e automática por e-mail
   (**a implementar**, UTAC106g).
6. **Enquadramento legal** — cumpre: Dec. 7.962/2013, CDC, LGPD, Lei 9.532/1997, Lei 9.249/1995; evita:
   Lei 5.768/1971, Dec. 70.951/1972, Lei 14.790/2023, DL 3.688/1941, Res. CMN 5.100/2026; **SPA/MF não se
   aplica** (sem concurso).
7. **Plataformas** — Google Play (loyalty program); Apple (bem físico, sem IAP).
8. **Fluxos** — financeiro (PIX → Saldo → Passe/Lance → NF-e → Entrega) e logístico (morada → NF-e →
   rastreio → entrega).
9. **Navegação alvo** — Carteira → Menor Lance Único → Início → Ofertas Programadas → Mais.
10. **UTAC106 (a-h)** — ordem; **LACUNA declarada**: o enunciado só fixa a ordem, não escopo/deps/estimativas.
11. **Histórico** — definição anterior, marcada SUPERADA e mantida à vista.

**Nota de precedência** (no cabeçalho da secção, literal): *«ESTA SECÇÃO PREVALECE SOBRE «ESCOPO-ALVO v6.0»
(linha ~126) E DEMAIS DOCUMENTOS REFERENCIADOS.»* — com nota de que a correcção da nota contrária da
`ESCOPO-ALVO` é o **UTAC106x.2**.

**Prova de escopo (GATE 3 · HARD GATE 10):** `git status --porcelain` → **só ` M CLAUDE.md`** (além dos
`??` pré-existentes). Verificação byte a byte (script ad-hoc): **tudo antes da NORTE (237 linhas) e tudo
depois (4037 linhas) é byte-idêntico ao `HEAD`**; as únicas linhas novas são a NORTE (238–391) + o bloco R14
(2 linhas no fim). **Bytes de controlo:** multiset `{0x00,0x00,0x1F,0x1F,0x7F,0x7F}` **idêntica antes e
depois** (intactos — só mudam de número de linha, 2125-2126 → 2047-2048, porque a secção NORTE encolheu).

### Ficheiros revertidos (nota de execução)
Sob a autorização anterior («Opção C»), o executor havia marcado `ESCOPO-ALVO` (no `CLAUDE.md`),
`docs/FICHA-PLAY-PT.md` e `_logs/MC100_MATRIZ-CONFORMIDADE.md`. Com o novo escopo do **UTAC106x.1** (que
reserva esses ficheiros para o **UTAC106x.2**), **as 3 alterações foram revertidas** e provadas:
`docs/FICHA-PLAY-PT.md` restaurado com `git checkout --` (era limpo no HEAD → `git status` vazio);
`_logs/MC100_MATRIZ-CONFORMIDADE.md` restaurado por patch inverso (EOL CRLF puro, sem mistura);
a `ESCOPO-ALVO` restaurada reconstruindo o `CLAUDE.md` a partir do backup.

---

## §3 SEG1 — REVERSÕES REGISTADAS

**Bloco R14 acrescentado no fim do `CLAUDE.md`** (mesma convenção da série: blockquote `> <emoji> **UTAC…**`),
com as **duas reversões formais**:

1. **R-19** (`_logs/MC100_MATRIZ-CONFORMIDADE.md` linha ~24 — «Gamified Loyalty exige *não estar sujeita a
   licenciamento de jogo*; a Programada exigia SPA/MF ⇒ parecer obrigatório») → **REVERTIDA**: a Via B
   **elimina o concurso**, logo não há licenciamento de jogo a exigir.
2. **DEC-09** («titular Ruan/MEI») → **REVERTIDA**: o titular é a **Associação Recreativa dos Nordestinos no
   Amazonas (Marinho)**.

⚠️ **Declarado:** a reversão é **documental**, **não jurídica** — o **parecer** (R-19/R-02) **continua
pendente** (o próprio repositório exige-o). A correcção dos documentos-fonte dessas reversões
(`ESCOPO-ALVO`, `FICHA-PLAY-PT`, `MC100_MATRIZ`) é o **UTAC106x.2**.

**Registo em 3 lugares (R18):** este log (`_logs/`) + bloco R14 no `CLAUDE.md` + relatório em `Desktop/`.

---

## §4 VALIDADOR ADVERSARIAL (SEG2)

**Subagente independente, em worktree próprio** (`C:/Users/Moltbot/tmp-utac106x1-val/wt`, detached em
`fddf626`, com junctions de `node_modules` — A9). Instrução: **TENTAR REFUTAR** (não confirmar). Duração
691 s. **Não alterou nada** (só leitura/medição).

### Veredicto (verbatim do subagente)

> # VEREDICTO ADVERSARIAL — UTAC106x.1 (`fddf626`) vs baseline `483576f`
> ## **APROVADO** (com notas ℹ️ — nenhum achado ⚠️)
> A alteração **resistiu a todas as tentativas de refutação (a)–(e)**. Faz exactamente o que declara,
> respeita o escopo, preserva os bytes e a suíte está verde como afirmado. Nenhum defeito grave.

**Alegações centrais confirmadas por medição:** NORTE reescrita (238–469 → 238–391) ✅ · R14 no FIM
(linha 4429) ✅ · prefixo `[0:63460]` idêntico byte-a-byte e sufixo (base 470→EOF) = (nova 392→R14), única
diferença o `\n`+R14 ✅ · bytes de controlo `{0x00×2,0x1F×2,0x7F×2}` idênticos (mesmos contextos; NORTE e
R14 **sem** control bytes) ✅ · suíte **694/694 · 992/998** no repo principal ✅ · escopo = só `CLAUDE.md` +
3 logs, **0** ficheiros de código ✅ · «0 ocorrências antes» de `5.910/5.102/9.532/Quildo/colecion` ✅ ·
snapshot da NORTE anterior **verbatim** ✅ · Via B completa (todas as 10 rubricas presentes) ✅.

### Achados ℹ️ e tratamento

| # | Achado | Tratamento |
|---|---|---|
| **ℹ️1** | Contradição de precedência **mútua** (`CLAUDE.md:133-134` «prevalece esta» vs `:240` «ESTA SECÇÃO PREVALECE») — o Conflito-A, **declarado** e reservado ao x.2 | **Declarado** (§3 e `_logs/UTAC106x-consolidacao.md §3.1`); fora do escopo do x.1 (ESCOPO-ALVO é do x.2) |
| **ℹ️2** | Refs obsoletas a MEI/DEC-09 **fora** das secções diferidas (`CLAUDE.md` §MC102.1b) | **CORRIGIDO** (pós-veredicto): o R14 passou a nomear também essas refs como diferidas ao x.2 |
| **ℹ️3** | Citação imprecisa: o texto «Gamified Loyalty» está na **linha 32** (row #24), não «linha 24» | **CORRIGIDO** (pós-veredicto) na NORTE §6.3 e no R14 («linha 32 (row #24)») |
| **ℹ️4** | Cross-ref nova para ficheiro **NÃO-rastreado** (`_logs/MC100_MATRIZ-CONFORMIDADE.md`, `git ls-files` vazio) | **Declarado** — fragilidade de proveniência; commitá-lo é do x.2 |
| **ℹ️5** | No **worktree** o backend dá **984/991**, não 992/998 | **Declarado** — é a dívida **DEBT-006** (worktree ≠ árvore partilhada, 0 falhas nas duas); a medição canónica do enunciado é no **repo principal** (992/998 ✅) |
| **ℹ️6** | Cabeçalho `CLAUDE.md:2` («Atualizado em: 2026-10-01») não menciona o x.1 | **Declarado** — fora do escopo (só NORTE + R14) |
| **ℹ️7** | `docs/gabarito-play-console.md` sem dono no split x.1/x.2 | **Declarado** em §5 (abaixo) |

> ⚠️ **As 2 correcções (ℹ️2, ℹ️3) foram feitas DEPOIS do veredicto** ⇒ ficam **declaradas como não
> re-validadas** (regra do SEG4). São edições de texto dentro da própria secção NORTE/R14; o commit
> validado (`fddf626`) mantém-se no histórico e a correcção é um commit separado.
> As restantes 5 notas ℹ️ ficam **declaradas** (não escondidas), sem correcção neste UTAC (fora do escopo).

---

## §5 PENDÊNCIAS (não executadas — declaradas · GATE 11)

1. **UTAC106x.2** — corrigir a nota de precedência contrária na `ESCOPO-ALVO v6.0` (linha ~126) e alinhar
   `docs/FICHA-PLAY-PT.md` + `_logs/MC100_MATRIZ-CONFORMIDADE.md` à Via B. **Fora do escopo deste UTAC.**
2. **Parecer jurídico** (R-19/R-02) — pendente; não é deste UTAC.
3. **`docs/gabarito-play-console.md`** — o enunciado do UTAC106x pedia-o; **não** é escopo do x.1
   (o x.1 escreve só na NORTE + R14). **Sem dono atribuído** no split x.1/x.2 — fica por atribuir.
4. **Notas ℹ️ do validador não corrigidas aqui** (fora do escopo): ℹ️4 (cross-ref para
   `_logs/MC100_MATRIZ-CONFORMIDADE.md`, que é **untracked** → o x.2 deve commitá-lo), ℹ️6 (cabeçalho
   «Atualizado em: 2026-10-01» desactualizado), ℹ️1 (precedência mútua — é o x.2). ℹ️5 é a dívida
   **DEBT-006** (worktree 984/991 vs árvore 992/998).

---

## §6 INCIDENTE DECLARADO — `git worktree remove` apagou o `node_modules` REAL via junctions (A9)

**O que aconteceu (medido):** na limpeza do SEG3, `git worktree remove C:/Users/Moltbot/tmp-utac106x1-val/wt`
falhou com **«Filename too long»** — mas **já tinha seguido as junctions de `node_modules`** (A9) e apagou
conteúdo dos `node_modules` **reais** do repo principal:
- `desafio-gut/frontend/netlify/functions/node_modules` → **417 → 0** itens (ficou **vazio**;
  `@netlify/blobs` desapareceu);
- `desafio-gut/frontend/node_modules` → **505 → 498** itens (7 em falta).

A regra **A9** avisa sobre `rm -rf`; **medido agora: `git worktree remove` faz o mesmo** (é um delete
recursivo e segue o reparse point). A ordem correcta é: **junctions fora (`rmdir`) ANTES** de
`git worktree remove`.

**Detecção:** verificação imediata após a limpeza (contagem de itens por `listdir`) — detectado **antes**
do fecho do UTAC. **Não ficou escondido.**

**Reparação (medida):**
1. `npm ci` em `desafio-gut/frontend/netlify/functions` (560 pacotes) → `@netlify/blobs` restaurado.
2. `npm install` em `desafio-gut/frontend` → restaurou, **mas alterou `package-lock.json` (ficheiro
   rastreado!)**. ⇒ `git checkout -- desafio-gut/frontend/package-lock.json` (lock reposto ao `HEAD`) e
   `npm ci` (1011 pacotes) a partir do lock **canónico**.

**Estado final verificado:** `git status` → **só `??` pré-existentes** (repo limpo); suíte
**VERDE 694/694 · 992/998**; deps-chave confirmadas (`vite`, `react`, `@privy-io/react-auth`,
`@netlify/blobs`); worktree órfão removido; `git worktree list` sem entradas minhas.

**Resíduo declarado:** o `node_modules` foi reinstalado a partir do **lock commitado** (`npm ci`) — é o
estado canónico; se a árvore do operador tivesse *drift* manual, esse *drift* perdeu-se.

**Lição (candidata a regra nova na skill: `A13`):** *nunca correr `git worktree remove` (nem `rm -rf`)
enquanto existirem junctions de `node_modules` dentro do worktree — remover os links com `rmdir` primeiro;
e invocar o `.bat` de remoção de forma a que o `rmdir` corra de facto (a forma `cmd /c 'a & b'` do git-bash
falhou em silêncio).* **Não se corrige a skill neste UTAC** (escopo = NORTE + R14) — fica recomendado.

---

## §7 FECHO

| Critério (GATE 11) | Estado |
|---|---|
| Entregáveis presentes | `CLAUDE.md` (NORTE Via B + R14) · log · snapshot · relatório em `Desktop/` |
| Validador adversarial lido | **APROVADO** (§4), 2 correcções pós-veredicto declaradas |
| Bytes de controlo | intactos (§2) |
| Escopo | só `CLAUDE.md` + logs; 3 ficheiros diferidos revertidos |
| Suíte | **VERDE 694/694 · 992/998** |
| Commit + push foreground | `fddf626` (validado) + `9cbf184` (correcções, não re-validado) → `origin/main` **0/0** |
| Incidente | declarado e reparado (§6) |
| Pendências | declaradas (§5) |

**UTAC106x.1: FECHADO** (com o incidente de `node_modules` declarado e reparado). Próximo: **UTAC106x.2**.
