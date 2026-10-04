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

*(preenchido no fecho — ver §6)*

---

## §5 PENDÊNCIAS (não executadas — declaradas · GATE 11)

1. **UTAC106x.2** — corrigir a nota de precedência contrária na `ESCOPO-ALVO v6.0` (linha ~126) e alinhar
   `docs/FICHA-PLAY-PT.md` + `_logs/MC100_MATRIZ-CONFORMIDADE.md` à Via B. **Fora do escopo deste UTAC.**
2. **Parecer jurídico** (R-19/R-02) — pendente; não é deste UTAC.
3. **`docs/gabarito-play-console.md`** — o enunciado do UTAC106x pedia-o; **não** é escopo do x.1
   (o x.1 escreve só na NORTE + R14). Fica para o UTAC que o pedir.
