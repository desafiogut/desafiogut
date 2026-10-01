# VEREDICTO — Validação adversarial do commit `eec94b8` (UTAC000.8 / DEBT-007)

**Validador:** subagente adversarial · **Data:** 2026-10-01 · **Repo:** `C:/Users/Moltbot/Desktop/DESAFIOGUT`
**Commit alvo:** `eec94b8` — `fix(UTAC000.8): 🏆 honesto — 🏆/«Menor Lance» das MeusAtivos leem o resultado OFICIAL on-chain`
**Alegação a refutar:** «com esta correcção, o 🏆 e o cartão «Menor Lance» da página MeusAtivos passam a ir para o VENCEDOR REAL da edição (resultado oficial on-chain) e sem ela iam para o lance errado; e nada mais mudou no que o utilizador vê».

---

## VEREDICTO

# **APROVA (com ressalvas)** — 1 contra-exemplo medido que exige correcção antes do push

O núcleo da alegação **verificou-se em todas as medições**: a fonte é o resultado oficial on-chain
(`resultados()`), o 🏆/cartão seguem-no quando existe, sem ele o comportamento anterior mantém-se
bit-a-bit (o «lance errado» do defeito reproduz-se no código antigo: 5 testes RED), e nada mais
muda no que o utilizador vê (contadores, filtros, ordem idênticos).

**Mas refutei a letra da alegação num estado ALCANÇÁVEL**, medido com o condutor de hooks do próprio
projecto (`_hook-runner.mjs`) — **RESSALVA R1**: quando a edição activa muda e a leitura da edição
nova falha / fica pendente / a edição passa a vazio, o hook **serve o vencedor da edição ANTERIOR**.
Nesse estado o cartão «Menor Lance» mostra o valor de OUTRA edição (mentira visível) — precisamente
o que o UTAC existe para acabar. Se o operador exigir a alegação à letra, o veredicto é **REFUTA**;
a correcção já está escrita (não commitada) — ver §7.

---

## 0. Estado do repo durante a validação (declarado)

O `HEAD` **moveu-se durante a validação**. Medido no fim:

```
$ git log --oneline -4
e92147b test(UTAC000.8): fechar a lacuna do efeito real do hook (2.ª ronda) + evidencia
bf0bdc1 docs(UTAC000.8): OPÇÃO 2 implementada e registada — DEBT-007 fechada, DEBT-008 (resíduo) aberta (R14/R18)
eec94b8 fix(UTAC000.8): 🏆 honesto — ...        <-- ALVO
c64a5bb docs(UTAC000.8): DEBT-007 investigada ...
```

- Tudo o que é «eec94b8» foi medido num **worktree próprio, `--detach eec94b8`** (imune ao que a
  árvore principal fazia).
- A árvore principal tem, além disso, **trabalho NÃO commitado** sobre os mesmos ficheiros
  (2.ª ronda): `useResultadoOficial.js`, `MeusAtivos.jsx`, os dois ficheiros de teste e
  `package-lock.json`. Isso é medido **separadamente** em §7 e **não faz parte** do commit validado.
- ⚠️ `package-lock.json` está modificado sem commit — não é deste commit (o commit não toca em
  dependências) mas é entrada no próximo commit que alguém fizer.

---

## 1. Foco 1 — A fonte de verdade é mesmo OFICIAL? **NÃO REFUTADO**

**O que tentei:** encontrar um caminho em que a página mostre um vencedor que NÃO é o que a
consolidação publica; confirmar que `resultados()` é escrito por `consolidarResultado` e que é o
MENOR LANCE ÚNICO.

```
$ grep -rn "resultados\[" --include=*.sol .            # (só o repo, sem worktrees de agentes)
./desafio-gut/contracts/Leilao.sol:163:  require(!resultados[idEdicao].consolidado, "Resultado ja consolidado");
./desafio-gut/contracts/Leilao.sol:164:  resultados[idEdicao] = Resultado(menorUnico, vencedor, true);
```
`consolidarResultado(idEdicao, vencedor, menorUnico) public apenasCoordenacao` → **único escritor**,
**write-once** (`require(!consolidado)`), restrito à coordenação.

Fonte do que lá é escrito (`netlify/functions/_lib/consolidacao.mjs`):
```js
41: /** Menor valor que aparece EXACTAMENTE uma vez (Artigo VIII). null se não houver. */
42: export function apurarMenorUnico(lances) {
44:   for (const l of lances) cont.set(l.valorCentavos, (cont.get(l.valorCentavos) || 0) + 1);
47:     if (cont.get(l.valorCentavos) === 1 && l.valorCentavos < menor) { menor = l.valorCentavos; vencedor = l.endereco; }
83:   const apurado = apurarMenorUnico(lances);
117:   tx = await contrato.consolidarResultado(edicaoId, apurado.vencedor, apurado.menorUnico);
```
- É o **menor valor que ocorre exactamente uma vez** — o «menor único» da alegação, não outra coisa.
- Unidade: `valorCentavos`. Confirmei que o campo existe de facto nos lances persistidos:
  `_lib/data-store-supabase.mjs:124: valor_centavos: valorCentavos`, e consumidores reais usam
  `l.valorCentavos` (`notificacoes-usuario.mjs:126`). Não é um campo fantasma → não devolve `null`
  por engano de nome. A página divide por 100 (`menorUnicoCentavos/100`), consistente com o
  apuramento local (`l.valor/100`).

**Caminhos em que a página mostra um vencedor NÃO-oficial (medidos, e o que são):**
1. **Sem resultado oficial** (leilão a decorrer, RPC em baixo, env ausente) → cai no apuramento
   local. **Declarado na alegação e no código**; é o comportamento anterior. Não é refutação.
2. **Estado obsoleto ao mudar de edição** → **RESSALVA R1**, §3. **Este é o contra-exemplo real.**

**Conclusão:** a fonte de verdade é genuinamente oficial e é o menor único. Não refutado.

---

## 2. Foco 2 — O 🏆 vai mesmo para o vencedor real? **NÃO REFUTADO (com 1 assimetria latente)**

Casos adversariais inventados e medidos contra a página REAL do commit
(`src/pages/__tests__/validador-adv-page.test.mjs`, só no worktree):

```
$ node --test --test-concurrency=1 src/pages/__tests__/validador-adv-page.test.mjs
  ✔ (1) lista com endereço em CAIXA MISTA + oficial minúsculas → 🏆 na linha certa
  ✖ (2) oficial em CAIXA MISTA (EIP-55) + lista minúsculas → 🏆 na linha certa
  ✔ (3) valor em STRING na lista ("100") com oficial 100 → 🏆 na mesma linha
  ✔ (4) EMPATE de valor (dois a 100, vencedor = um deles) → 🏆 só numa linha
  ✔ (5) vencedor oficial AUSENTE da lista → nenhum 🏆, cartão com valor OFICIAL
  ✔ (7) contadores iguais com e sem oficial; só o cartão muda
  ✔ (8) prefixos iguais (…0001 vs …0002) não confundem o 🏆
ℹ tests 7 · pass 6 · fail 1
  AssertionError: ASSIMETRIA: `ehLinhaVencedora` faz toLowerCase ao endereço da LISTA mas compara com `vencedor` cru
```

Código no commit (`git diff c64a5bb eec94b8 -- .../MeusAtivos.jsx`):
```js
+      && String(lance?.endereco ?? "").toLowerCase() === resultadoOficial.vencedor;
```

**RESSALVA R2 (latente, NÃO alcançável hoje):** a comparação é **assimétrica** — baixa a caixa do
endereço da lista mas **não** a do vencedor oficial. **Não chega a morder em produção** porque o
único produtor do objecto é `normalizarResultadoOficial`, que faz `.toLowerCase()`. É um acoplamento
silencioso: qualquer fonte futura (ou uma refactorização do hook) que devolva o `vencedor` como o
ethers o dá (checksum **EIP-55**, caixa mista) faz **perder o 🏆 em silêncio**, sem teste que morda
(os testes do commit injectam sempre o vencedor em minúsculas — a assimetria nunca é exercitada).
Reprodução mínima: injectar `resultadoOficial = {consolidado:true, vencedor:"0xBbBb…0002", menorUnicoCentavos:100}`.

Os restantes casos adversariais **não refutaram**: empate de valor com endereço diferente → só a
linha do endereço oficial; vencedor ausente da lista → **nenhum** 🏆 (não assinala por aproximação);
valor em string → casa (`Number()`); prefixos iguais → não confunde. O caso de produção que mais
importa (lista só com o **meu** lance e o vencedor oficial ser OUTRO) é o teste que o commit já
cobre e que mede RED no código antigo (§6).

> Nota de honestidade do instrumento: a 1.ª versão da minha sonda deu 2 falsos negativos **meus**
> (punha a sessão no próprio utilizador e, com sessão, a lista só mostra os lances dele — a linha
> vencedora nem estava visível). Corrigido e re-corrido. O caso 2 sobreviveu à correcção.

---

## 3. Foco 3 — RESSALVA R1: o hook serve o vencedor de OUTRA edição **← o contra-exemplo**

**O que tentei:** mostrar um defeito no hook REAL que a suíte do commit não apanha. A suspeita
declarada era correcta: os testes da página injectam o resultado por um **duplo**
(`_stubs/useResultadoOficial.js`), logo o corpo do efeito (o `await`, o `setResultado`, o
`clearInterval`, o `catch` fail-soft e a limpeza do intervalo) **nunca corre** nesses testes. Só o
`normalizarResultadoOficial` (puro) é exercitado a sério.

Corri o hook **a sério**, com o condutor do próprio projecto (`_hook-runner.mjs`, o mesmo dos testes
do MC94), no commit `eec94b8`:

```
$ node --test --test-concurrency=1 src/hooks/__tests__/validador-adv-hook.test.mjs
  ✔ CONTROLO: mudar para edição que RESPONDE (não consolidada) limpa o vencedor anterior
  ✖ DEFEITO A: R-1 consolidada → muda para R-2 cuja leitura FALHA → fica com o vencedor do R-1
  ✖ DEFEITO B: R-1 consolidada → edição activa passa a "" → mantém o vencedor do R-1
  ✖ DEFEITO C: mudar para edição cuja leitura fica PENDENTE → mantém o vencedor anterior
ℹ tests 4 · pass 1 · fail 3
  AssertionError: STALE: edição activa = R-2, o hook devolve
    {"consolidado":true,"vencedor":"0xaaaa...0001","menorUnicoCentavos":700} (vencedor do R-1)
  AssertionError: STALE: sem edição activa, o hook devolve {...vencedor do R-1...}
  AssertionError: STALE: enquanto o R-2 não responde, a página mostra {...vencedor do R-1...}
```

**Causa (código do commit, `src/hooks/useResultadoOficial.js`):**
```js
const [resultado, setResultado] = useState(null);
useEffect(() => {
  if (!edicaoId) return undefined;              // ← não limpa `resultado`
  ...
  const ler = async () => {
    try { const r = normalizarResultadoOficial(await lerResultado(edicaoId));
          if (cancelado) return; setResultado(r); ... }
    catch { /* fail-soft: nada */ }             // ← engole e NÃO limpa o estado anterior
  };
  ...
}, [edicaoId, lerResultado, intervaloMs]);
return resultado;                                // ← não sabe a que edição pertence
```
O estado é guardado **sem a edição a que pertence**. Ao mudar de edição, o resultado antigo
sobrevive a todo o tempo em que a leitura nova não chegue a bom porto. **É a mesma classe de mentira
que o UTAC combate** (mostrar um vencedor que não é o da edição activa).

**Reprodução mínima:** montar com `lerResultado` que devolve `{consolidado:true, vencedor:A, menorUnicoCentavos:700}`
para `"R-1"` e lança para `"R-2"`; `actualizar(["R-2", deps])` → `resultado()` continua a ser o do
`"R-1"`. Probabilidade em produção: baixa-média (precisa de mudança de edição com a página montada
**e** leitura falhada/pendente), mas o efeito é **visível e sem prazo** — o cartão «Menor Lance»
mostra o valor da edição anterior e o intervalo continua a tentar.

**O instrumento não é cego:** o CONTROLO (edição nova que responde, não consolidada) passa — a sonda
distingue «limpa» de «não limpa». Além disso, o achado é **corroborado pela própria 2.ª ronda do
autor**, que o descreve e corrige por palavras suas (§7).

**2.ª parte do foco 3 — o teste de cablagem morde?** Sim. Sem a linha `useResultadoOficial(EDICAO_ATIVA)`
ou com outra edição, `edicoesPedidas()` deixa de ser `["R-1"]` e o teste fica vermelho (o duplo
regista o argumento de propósito, lição do MC94). Mas morde **só** a cablagem: nada do
comportamento do hook.

---

## 4. Foco 4 — Mudou mais alguma coisa visível? **NÃO REFUTADO**

- **Contadores, filtros, ordem:** medido com a página real, com e sem resultado oficial:

```
$ node src/pages/__tests__/_debug-validador.mjs
SEM OFICIAL (janela): "... 3 Total de Lances 2 Lances Únicos 1 Lances Repetidos R$ 3.00 Menor Lance ..."
COM OFICIAL (janela): "... 3 Total de Lances 2 Lances Únicos 1 Lances Repetidos R$ 1.00 Menor Lance ..."
```
`Total/Únicos/Repetidos` **idênticos**; só a 4.ª métrica (cartão «Menor Lance») muda — que é
exactamente o autorizado. `git show eec94b8:.../MeusAtivos.jsx | grep -n menorUnico` mostra que
`menorUnico` só alimenta o 🏆 (`ehLinhaVencedora`); não há outro consumidor (ordem da lista, botões,
contadores ficam nos `todosLances`/`lancesExibidos` intocados).
- **Dashboard — resíduo confessado (não é refutação, é qualificação):** o «🏆 Menor Lance Único» do
  Dashboard (`Dashboard.jsx:388-404`) usa `vencedor` do `AppContext` (`AppContext.jsx:698`:
  `[...lancesExibidos].filter(!repetido).sort(valor)[0]`), ou seja **continua a mentir em mainnet**
  pela mesma razão da DEBT-007. A árvore principal **não** toca no `AppContext`. Isto é **fora do
  escopo** que a alegação me dá (só `MeusAtivos`) e está **declarado como DEBT-008 no próprio
  `_logs/DEBT.md`**: «O `vencedor` do Dashboard … continua a ser «o menor único que este browser
  viu» … fora do escopo autorizado pelo R18-1». Ou seja: a frase «o 🏆 deixou de mentir» é verdadeira
  **por página**, não na aplicação. Fica registado; não contradiz a alegação como formulada.

---

## 5. Foco 5 — Dependência nova? **NÃO REFUTADO**

```
$ git show --name-only --format="" eec94b8
desafio-gut/frontend/src/hooks/useResultadoOficial.js
desafio-gut/frontend/src/pages/MeusAtivos.jsx
desafio-gut/frontend/src/pages/__tests__/_stubs/useResultadoOficial.js
desafio-gut/frontend/src/pages/__tests__/utac0008-resultado-oficial.test.mjs
```
4 ficheiros, **nenhum** `package.json` / `package-lock.json`. Importes do hook: `react`,
`../components/edicao-especial/useResultadoEspecial.js` (já em produção via `CardEdicaoEspecial.jsx:37`)
e `../components/edicao-especial/_estilo-especial.js`. As dependências transitivas (`ethers`,
`hash-wasm`) já constam do `package.json`. Nada novo.

---

## 6. Foco 6 — Regressão + o teste novo morde? **NÃO REFUTADO** (mas 3 testes são vácuos)

**(a) Suíte do frontend inteira no worktree (estado `eec94b8` limpo):**
```
$ node --test --test-concurrency=1 $(find src -name '*.test.mjs' -not -path '*/node_modules/*')
ℹ tests 563 · suites 32 · pass 563 · fail 0 · skipped 0        ← 563/563 VERDE, como esperado
```
Nenhum teste pré-existente mudou de estado. (Primeiro run deu 1 falha —
`src/__tests__/mc9952-seguranca-gate.test.mjs` → `Cannot find package 'undici'` — **artefacto do
meu arnês**: faltava a junction de `frontend/netlify/functions/node_modules`, onde vive o `undici`,
e o teste passava a contar como 1 em vez de 8 → 556 em vez de 563. Criada a junction: **563/563**.
Não é regressão do commit.)

**(b) Suíte do backend (junction montada):**
```
$ node --test --experimental-test-module-mocks _tests/*.test.mjs
ℹ tests 966 · pass 959 · fail 0 · skipped 7 · cancelled 0
```
(Esperado no briefing: 967/973 com 6 skipped. Zero falhas; a diferença de 1/7 é de contagem, não de
estado. O commit não toca no backend.)

**(c) A/B de mutação — o teste novo morde o código antigo?**
```
$ git checkout eec94b8~1 -- desafio-gut/frontend/src/pages/MeusAtivos.jsx   # no worktree, só
$ node --test --test-concurrency=1 src/pages/__tests__/utac0008-resultado-oficial.test.mjs
  ✖ desktop: a lista só tem o MEU lance e o resultado oficial é de OUTRO → ...
  ✔ desktop: SEM resultado oficial o apuramento local mantém-se (prova do antes; zero regressões)
  ✔ desktop: o vencedor oficial está na lista visível → o 🏆 vai para a linha DELE
  ✖ desktop: mesma linha de valor mas OUTRO endereço NÃO leva 🏆
  ✖ mobile:  a lista só tem o MEU lance ...
  ✔ mobile:  SEM resultado oficial ...
  ✔ mobile:  o vencedor oficial está na lista visível ...
  ✖ mobile:  mesma linha de valor mas OUTRO endereço ...
  ✔ sem sessão (lista de todos) com resultado oficial do OUTRO → o 🏆 vai para a linha oficial
  ✖ cablagem: a página pede o resultado da EDIÇÃO ACTIVA
ℹ tests 16 · pass 11 · fail 5
$ git checkout eec94b8 -- desafio-gut/frontend/src/pages/MeusAtivos.jsx        # restaurado
```
**Bidirecionalidade confirmada:** no código antigo, os 2 testes «SEM resultado oficial» continuam
verdes (sem regressão) e os 5 discriminantes ficam RED. Isto reproduz independentemente o mutante
«M1» que o autor declara no `DEBT.md` («a página ignora o resultado oficial → 5 RED»).

**⚠️ Mas 3 dos 10 testes da página são VÁCUOS** (passam com o código PRÉ-correcção, logo não provam
a correcção): «o vencedor oficial está na lista visível» (desktop e mobile) e «sem sessão (lista de
todos)…». Passam porque, com aqueles dados, o apuramento LOCAL coincide com o resultado oficial
(menor valor único = 100 = OUTRO). O 3.º é o que um leitor tomaria por «o teste central do vencedor
real». Um verde que não morde é uma fraqueza de prova, não um defeito de produto.

---

## 7. Trabalho em voo na árvore principal (NÃO é o commit validado) — 2 achados sérios

Enquanto eu media, `HEAD` passou a `e92147b` e ficou **trabalho não commitado** que ataca
exactamente os meus R1 e R2:

```diff
-  const [resultado, setResultado] = useState(null);
+  const [estado, setEstado] = useState({ edicaoId: null, resultado: null });
...
+  return estado.edicaoId === edicaoId ? estado.resultado : null;   // só serve o da edição PEDIDA
```
O comentário que introduz diz, textualmente: *«2.ª ronda, achado do validador adversarial … a página
continuava a mostrar o vencedor da edição ANTERIOR»*. E em `MeusAtivos.jsx` a comparação passa a
`String(lance?.endereco ?? "").toLowerCase() === String(resultadoOficial.vencedor ?? "").toLowerCase()`.

**Cross-check (medido, worktree, com o patch em voo copiado para lá):**
```
validador-adv-hook.test.mjs                          → 4/4 PASS   (DEFEITOS A/B/C fechados)
validador-adv-page.test.mjs                          → 7/7 PASS   (assimetria EIP-55 fechada)
utac0008-resultado-oficial.test.mjs (2.ª ronda)      → 20/20 PASS
```
Ou seja: **o patch em voo fecha os dois achados.** Mas **NÃO está pronto a commitar**:

**ACHADO SÉRIO (bloqueante):** o ficheiro de teste da 2.ª ronda
`src/hooks/__tests__/utac0008-resultado-oficial-hook.test.mjs` (versão **não commitada**)
**rebenta e depois pendura a suíte**:
```
$ timeout 90 node --test --test-concurrency=1 src/hooks/__tests__/utac0008-resultado-oficial-hook.test.mjs
  ✔ … (8 testes antigos)
  ✖ CONTROLO: com a edição nova a RESPONDER (não consolidada), o vencedor anterior sai
  ✔ a leitura da edição nova FALHA … / a edição activa passa a vazio … / fica PENDENTE …
ℹ tests 12 · pass 11 · fail 1
exit=124        ← o processo NUNCA termina (morto pelo timeout aos 90 s)
```
- **Causa 1 (o teste está partido):** o CONTROLO usa o helper de resposta fixa
  `leitor({consolidado:false, …})` mas asserta `CONSOLIDADO` — com um helper de resposta fixa nunca
  podia servir CONSOLIDADO no R-1 **e** «não consolidado» no R-2. O controlo não pode passar.
- **Causa 2 (porque é que pendura):** o `assert` rebenta **antes** de `c.desmontar()`, deixando vivo
  o `setInterval(ler, 1_000_000)` do hook → o `node --test` nunca sai. Experimento de 1 variável:
  corrigido o fixture do controlo (leitor por `id`) → `ℹ tests 12 · pass 12 · fail 0`, **`exit=0`**.
  (É o mesmo poço em que a minha 1.ª sonda caiu e que eu documentei.)
- **Consequência:** `_logs/utac0008-evidencia.sh` corre a suíte com
  `node --test … $(find src -name '*.test.mjs' …)`. **Commitar isto como está faz a corrida de
  evidência pendurar-se** (e ela é a evidência do próprio commit).

**Contra-critério:** no commit `e92147b` (onde o ficheiro do hook foi commitado) o ficheiro tem 8
testes e **passa 8/8**, sem controlo partido e sem pendura. O defeito está apenas nas **+57 linhas
não commitadas**.

---

## 8. O que um segundo validador deveria tentar a seguir

1. **Fechar R1 na forma commitada**, não só no patch: verificar que `eec94b8`+2.ª ronda (já
   committada) dá `4/4` nas minhas 3 sondas STALE **e** `0` de pendura na suíte inteira
   (`exit=0`), com o controlo do hook corrigido.
2. **Testar o hook contra `lerResultadoOnchain` REAL** (o `ethers.Contract`), não só contra um duplo:
   confirmar o que o ethers devolve para `vencedor` (checksum EIP-55) e que `Number.isSafeInteger`
   sobre o `uint256` não rejeita valores legítimos de produção; e o comportamento quando
   `CONTRATO_SEPOLIA` está `""` (env em falta) — hoje é fail-soft **silencioso**.
3. **Ambiente de produção (env/`NETWORK_STAGE`):** medir se `VITE_CONTRATO_SEPOLIA`/`VITE_ALCHEMY_URL`
   estão realmente injectados no build Netlify. Sem eles o `getProvider()` aponta para o default
   **Sepolia** (`utils/web3.js:122-124`) com um endereço de contrato mainnet → `null` silencioso →
   **volta-se à DEBT-007 sem ninguém dar por isso**. Não é verificável a partir do repo.
4. **Poluição de estado entre edições no lado da página** (o que não testei): com o resultado oficial
   de R-1 e a lista de R-2 já carregada, o cartão já foi apanhado (R1), mas falta medir se algum
   `useEffect` do `AppContext` reordena/recalcula antes de o hook limpar.
5. **Filtros com o vencedor fora do filtro activo** (`unicos`/`repetidos`): o 🏆 desaparece da vista
   mas o cartão mantém o valor oficial — medir se isso é aceitável para o operador (assimetria de
   expectativa, não defeito).
6. **Contadores em produção**: a página conta `lances` locais e o rótulo diz «Total de Lances» de uma
   edição — em mainnet essa lista pode estar vazia ⇒ «0 Total de Lances» com «R$ 1.00 Menor Lance» ao
   lado. Não é deste commit (é DEBT-007 no seu todo), mas é leitura confusa que sobra.

---

## 9. Arnês (deixado montado para quem repetir)

- Worktree: `C:/Users/Moltbot/tmp-utac0008-val/fe` (`--detach eec94b8`), com junctions de
  `frontend/node_modules` e `frontend/netlify/functions/node_modules` para o repo principal
  (**não** cópias).
- Sondas minhas: `src/hooks/__tests__/validador-adv-hook.test.mjs`,
  `src/pages/__tests__/validador-adv-page.test.mjs`, `src/pages/__tests__/_debug-validador.mjs`.
  O worktree contém também cópias do estado **não commitado** da 2.ª ronda (usadas em §7) — o
  veredicto de `eec94b8` foi medido **antes** dessas cópias.
- **Desmontagem (nesta ordem, senão apaga-se o `node_modules` REAL):**
  `cmd //c rmdir "...\fe\desafio-gut\frontend\node_modules"` e
  `cmd //c rmdir "...\fe\desafio-gut\frontend\netlify\functions\node_modules"`, depois
  `rm -rf C:/Users/Moltbot/tmp-utac0008-val/fe` e `git worktree prune`.
  Nota: `mklink /J` via MSYS mangla o `/J` → usar `powershell New-Item -ItemType Junction`.


---

# RESPOSTA DO EXECUTOR AO VEREDICTO (2.ª ronda) — 2026-10-01

**Veredicto recebido: APROVA (com ressalvas).** O núcleo da alegação resistiu; as ressalvas foram
atacadas e fechadas **com medição**, não com declarações.

## R1 — «o hook serve o vencedor de OUTRA edição» (contra-exemplo medido) → **FECHADA**
Causa confirmada: o resultado era guardado **sem** a edição a que pertencia. Correcção (mínima): o
estado passou a ser `{ edicaoId, resultado }` e só se serve o resultado da edição **pedida** —
`return estado.edicaoId === edicaoId ? estado.resultado : null;`. Os três casos do validador
(falha / pendente / edição vazia) foram convertidos em **testes do repo**
(`src/hooks/__tests__/utac0008-resultado-oficial-hook.test.mjs`), com **CONTROLO** (edição nova a
responder não-consolidada limpa o anterior).
Prova de que morde: mutante **M5** (voltar ao `return estado.resultado`) → **3 RED**.

## R2 — assimetria de caixa (EIP-55) → **FECHADA**
`ehLinhaVencedora` compara agora **os dois lados** em minúsculas
(`String(resultadoOficial.vencedor ?? "").toLowerCase()`). Testes novos: endereço da lista em caixa
mista **e** vencedor oficial em caixa mista (EIP-55).
Prova: mutante **M6** → **2 RED**.

## «3 testes vácuos» → **REFORÇADOS (deixaram de ser vácuos)**
O validador tinha razão: três testes passavam com o código PRÉ-correcção. Foram reconstruídos para
discriminar, com o auxiliar `enderecosVencedores()` (diz **a quem** foi dado o 🏆, não só quantos):
agora a vista local é **parcial** (lista só com os lances da pessoa, com um valor mais baixo) e no
caso sem sessão há um **empate de valor** em que o 1.º da lista ≠ vencedor oficial.
Prova: o mutante **M1** passou de **5 RED** para **8 RED** — os testes reforçados agora mordem.

## Fragilidade real: teste que rebenta deixava a suíte PENDURADA (exit=124) → **CORRIGIDA**
Um `assert` que dispara antes de `desmontar()` deixava vivo o `setInterval(1_000_000)` e o
`node --test` nunca terminava (o validador mediu-o no ficheiro em voo). Corrigido nos **12** testes do
hook: `t.after(() => c.desmontar())` — a limpeza corre **mesmo quando o teste falha**. Verificado:
com o mutante M5 aplicado, a suíte **falha e TERMINA** (antes pendurava).

## Total de mutantes que mordem nesta correcção: **6**
M1 página ignora o resultado oficial → **8 RED** · M2 aceita edição não consolidada → **1 RED** ·
M3 nunca para de reler → **1 RED** · M4 sem limpeza do intervalo → **1 RED** ·
M5 serve o resultado de outra edição → **3 RED** · M6 sem normalizar a caixa → **2 RED**.
Todos restaurados com **md5 idêntico** ao estado pré-mutação.

## Estado final da suíte
`frontend: VERDE 579/579` · `backend: VERDE 967/973` · `VEREDITO: VERDE`.

## Nota sobre o validador (crédito e limites)
O validador encontrou **um defeito real no commit** (R1) que eu não tinha visto — a validação
adversarial pagou-se. Limites declarados por ele próprio: primeiro `run` deu um falso vermelho por
falta da junction do backend (`undici`), desmontado; e a 1.ª sonda de página teve 2 falsos negativos
dele (sessão no próprio utilizador → a linha vencedora nem estava visível), corrigidos. Não chegou a
actualizar a skill `git-worktree-validation` com duas armadilhas que mediu (`mklink /J` manglado pelo
MSYS → usar `New-Item -ItemType Junction`; e o tal `assert` antes do `desmontar()` que pendura o
condutor) — fica declarado como próximo passo, **não feito por mim** (a skill não estava no escopo).
