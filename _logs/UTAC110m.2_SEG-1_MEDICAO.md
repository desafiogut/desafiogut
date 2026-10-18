# UTAC110m.2 — SEG-1 (MEDIÇÃO)

Data: 2026-10-18 · Executor: Hermes · HEAD medido: `52c5b9d` (= `origin/main`, igual ao enunciado)

---

## -1.1 RAM (A14) — DESVIO DECLARADO, portão cumprido depois da escada

Leituras de arranque (`FreePhysicalMemory/1024`, 3× espaçadas de 3 s):

```
1112 · 1097 · 1108 MB      ← ABAIXO do portão de 1 500 MB
```

Aplicada a escada **segura** do skill `windows-memory-pressure`
(`scripts/liberar-ram-min.ps1`: fecha árvores `msedge` sem janela + `EmptyWorkingSet`, sem tocar em
apps do utilizador):

```
LIVRE_ANTES: 1160 / 1152 / 1150
CHROME_COM_JANELA: 1 (não tocado)   MSEDGE_SEM_JANELA: 0
TRIM_APLICADO: 72 processos
LIVRE_DEPOIS: 1674 · 1852 · 2028 · 2025 · 2006 · 2006   (PICO 2028 · MÍNIMO 1674)
```

Registo conforme o skill: houve **desvio** no arranque (1112/1097/1108), a escada foi aplicada, e o
portão passou a estar **cumprido**. A leitura que vale para cada corrida é a impressa pelo wrapper
imediatamente antes de arrancar (ver SEG5).

## -1.2 Estado do repositório — NÃO estava limpo (declarado)

`git status --short` tem alterações **do UTAC110i.2, ainda POR COMMITAR** (aguarda autorização do
operador): `useRecursosApp.js`, `useComprarPasse.js`, `google-play-billing.js`, o arnês, o teste do
110i.1, um teste novo, 4 scripts, `_logs/DEBT.md` e `CLAUDE.md`.

Consequência para ESTE UTAC: **os conjuntos de ficheiros são disjuntos** (`src/**` e
`_lib/google-play-billing.js` no 110i.2; `docs/**` e `_lib/guto-regulamento.mjs` aqui), logo é
possível commitar cada UTAC nomeando ficheiros — mas **nunca** `git add -A`, e o baseline da suíte
não é o do enunciado (ver -1.5).

## -1.3 Os sete artigos, texto exacto (medido)

Lidos em `docs/REGULAMENTO-v5.md` (281 linhas, 72 artigos, 12 capítulos):

| art. | linha | o que diz hoje | o que o código faz |
|---|---|---|---|
| 6º | 37 | Passe = produto digital **adquirido**, R$ 2,00 | igual |
| 9º | 43 | a cada 50 pontos o utilizador **poderá adquirir** 1 cartão | resgate **gratuito** aos 50 pontos |
| 21º | 101 | quem não vence **perde o acesso às métricas** e ao lance opcional seguinte | não existe mecanismo de perda |
| 32º | 157 | quem não acerta **perde o acesso às métricas** e ao palpite opcional seguinte | não existe mecanismo de perda |
| 48º | 215-219 | ECOQUILDO serve para I) site oficial, **II) novos Passes no aplicativo** | R18-110e-2: só no site |
| 53º | 231-233 | cartão colecionável e produto patrocinado **via PIX** | cartão é gratuito (resgate) |
| 57º | 243 | direitos LGPD pelo **Gmail** ou função de eliminação | app indica o **DPO** |
| 69º | 273 | dúvidas **exclusivamente** pelo Gmail | app indica o DPO |

Confirmação nas três cópias (mesmo texto, offsets diferentes):
`docs/REGULAMENTO-v5.md` · `docs/GUTO-REGULAMENTO.md` · `_lib/guto-regulamento.mjs`.

## -1.4 A INVARIANTE — como está imposta (medida)

`src/components/__tests__/utac110k1-conformidade-pre-aab.test.mjs:56` compara:

```js
const corpo = (md, modo) => modo === "v5"
  ? n.slice(n.indexOf("\n---\n\n") + 6)
  : n.slice(n.indexOf("\nREGULAMENTO OFICIAL DO DESAFIOGUT\n") + 1);
assert.equal(corpo(V5, "v5"), corpo(GUTO, "guto"), "os corpos têm de ser byte a byte iguais");
```

⇒ qualquer alteração de artigo tem de entrar **nos dois `.md` com o mesmo texto**, ou a suíte fica
vermelha. O `.mjs` não entra nesta comparação, mas tem o seu próprio teste (`mc963`, «cada âncora de
ARTIGOS_V4 é um excerto VERBATIM»).

O mesmo teste exige ainda: `Versão 5.1 · Vigente a partir de 02 de novembro de 2026` nos dois
ficheiros, e `VERSAO_GATE` (backend) == `VERSAO_CONSENTIMENTO` (frontend) e ≠ `"3.0"`.
Valores medidos agora: **ambos `3.2`**.

## -1.5 Baseline da suíte (medido, não presumido)

O enunciado não dá números; o último estado medido nesta máquina, com o 110i.2 por commitar, é:

```
frontend: VERDE 1203/1203     backend: VERDE 1351/1357     (RAM 1849 MB)
```

É este o baseline contra o qual o SEG5 compara.

## -1.6 ⚠️ BLOQUEIO MEDIDO NA FRENTE A (Arts. 9º e 53º) — o achado que muda o plano

A frente A **não pode** ser feita dentro das autorizações deste UTAC. A cadeia, medida:

1. O gate legal cita o Art. 9º: `src/components/TermosConsentimento.jsx:124-125` contém
   «A cada 50 (cinquenta) pontos de fidelidade acumulados, o utilizador poderá **adquirir** 1 (um)
   cartão colecionável físico da Família Quildo.»
2. `src/components/__tests__/citacoesRegulamento.test.mjs` exige que cada bloco do gate seja
   **TEXTO LITERAL** do artigo que cita (função `trechoDoArtigo`: `txtArtigo.includes(txtBloco)`).
   Verificado agora por execução própria:

   ```
   BLOCO DO GATE (Art. 9): «A cada 50 (cinquenta) pontos … poderá adquirir 1 (um) cartão … Quildo.»
   ARTIGO no v5          : o mesmo + «Esta proporção é fixa e igual para todos os utilizadores.»
   o bloco é trecho LITERAL do artigo? true
   o bloco contém a palavra que a frente A mudaria («adquirir»)? true
   ```

3. Logo, mudar o Art. 9º para «resgatar gratuitamente» **quebra** `citacoesRegulamento` — a não ser
   que se mude também o bloco do gate, em `TermosConsentimento.jsx`, que é **UI** e está
   explicitamente **fora** da lista de autorizações («NÃO pode alterar a UI»).
4. Há ainda um terceiro sítio com o Art. 9º **fora do escopo**:
   `netlify/functions/_lib/guto-perfis.mjs:164` — o dicionário de respostas do GUTO. Deixá-lo
   intacto faz o assistente continuar a dizer «adquirir» depois de o Regulamento dizer «resgatar».
5. E o Art. 53º depende do Art. 9º: dizer em 53 que o cartão «não é adquirido por PIX, é resgatado
   gratuitamente» enquanto o Art. 9º diz «poderá adquirir» cria uma contradição **dentro** do
   Regulamento. Por isso a frente A é um bloco só (9 + 53) — não se faz meia.

**Prova de que isto não é teoria:** o mutante **A1** do instrumento (`Art. 9º corrigido SEM o gate
legal`) dá **4 testes RED** — `_logs/UTAC110m.2_SEG5_MUTACAO.txt`.

⇒ **PARADO e ESCALADO** (GATE 12 / HI9): a frente A exige autorização para tocar em
`src/components/TermosConsentimento.jsx` (bloco do Art. 9º) e `_lib/guto-perfis.mjs` (string do
Art. 9º) — dois ficheiros que o enunciado proíbe. As frentes B, C e D **não** têm este problema:
nenhum dos artigos 21, 32, 48, 57, 69 é citado pelo gate (o gate cita 1,2,5,6,8,9,14,27,47,49,65,66).

## -1.7 Ficheiros que este UTAC tocou

- `docs/REGULAMENTO-v5.md` (frentes B, C, D)
- `docs/GUTO-REGULAMENTO.md` (as mesmas frases — invariante)
- `desafio-gut/frontend/netlify/functions/_lib/guto-regulamento.mjs` (as mesmas frases — runtime do GUTO)
- `desafio-gut/frontend/src/components/__tests__/utac110m2-regulamento.test.mjs` (novo, 5 testes)
- `scripts/utac110m2-prova-mutacao.mjs` (novo, 6 mutantes)
- `_logs/UTAC110m.2_*` (registos)

Não tocados (deliberadamente): `TermosConsentimento.jsx`, `guto-perfis.mjs`, `consentimento.mjs`,
o PDF, o código.
