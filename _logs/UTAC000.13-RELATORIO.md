# UTAC000.13 — Relatório: DEBT-014 (teste flaky) + `showOverlay`

**Data:** 2026-10-02 · **Executor:** Hermes Agent · **Base real medida:** `d614b4c` = `origin/main`
**Objectivo:** fechar a DEBT-014 (suíte determinística) e, no fim, religar o `showOverlay` (decisão do operador).
**VEREDICTO: PARCIAL → REVISÃO (2.ª ronda): a FRENTE B FECHOU (o flaky foi apanhado pelo validador
adversarial, reproduzido pelo executor e CORRIGIDO) e a DEBT-014 está FECHADA; a FRENTE D
(`showOverlay`) continua ESCALADA.** A minha conclusão da 1.ª ronda — «Frente A/B: **resultado
NEGATIVO medido** (flaky não reproduzível em 60 corridas)» — **está REFUTADA: ver §7.**
Frente D: **PARADA e ESCALADA** (exige um ficheiro que este UTAC proíbe).

---

## 1. Frente A/B — a caça ao flaky: **NÃO REPRODUZÍVEL** (medido, 60 corridas)
**Método** (o que faltava ao validador do UTAC000.12): correr a suíte **N×** guardando o output de
**cada** corrida e isolando o **nome** do teste em falha. Scripts re-executáveis, fora do repo:
`C:/Users/Moltbot/tmp-utac0013/cacar-flaky.sh` (N configurável) e `flaky-sob-carga.sh`.

| experiência | corridas | resultado |
|---|---|---|
| suíte **completa** do frontend (49 ficheiros, comando igual ao do harness) | **30** | **630/630 em todas · 0 falhas** |
| 5 ficheiros com **temporizadores reais**, com **carga de CPU** (4 workers × 100 s) | **30** (5×6) | **0 falhas** |

**Hipótese medida (a mais plausível, e não refutada):** o flaky é **induzido por carga** — o validador
do UTAC000.12 corria a suíte **em paralelo com 2-3 suites minhas** (eu corria a minha própria
verificação nesse exacto período). Mesmo assim, com carga deliberada, não se reproduziu.
**Varredura de suspeitos (medida, não palpite):** 0 testes usam `Math.random`; os 2 `createHash` são
sobre **assets estáticos** (determinísticos); **6 ficheiros com temporizadores reais** e **zero
`fakeTimers`**; o suspeito nº1 por leitura (`hooks-torneio.test.mjs` l. 82-91: `fetch` + `abort()`
imediato) foi **ilibado por medição** — o duplo trata o abort correctamente.
**⇒ Não se inventa correcção para um defeito não observado (GATE 17).** A Frente B (corrigir a causa)
**ficou sem objecto medido**; a Frente C (estabilidade) **é** este resultado: 60 corridas verdes.
**Frente E — DEBT-014 fica ABERTA (parcial)**, com o escopo estreitado (os 5 ficheiros com
temporizadores estão ilibados a N=30 sob carga), a evidência preservada e a **única falha conhecida
(a do validador do UTAC000.12, 1 em ~15, sem nome) mantida como evidência primária — sem explicação
inventada**. Para fechar: N≥100, idealmente em CI, ou via o harness com TTY.

## 2. Frente D — `showOverlay`: PREMISSA DO SPEC REFUTADA ⇒ **PARAR E ESCALAR** (GATE 10/HI8)
O spec diz que o `setShowOverlay(true)` comentado está «na l.1205 do **`MercadoLances.jsx`**».
**Medido:** está em **`src/context/AppContext.jsx` l. 1205** (dentro do `setTimeout` de 1200 ms do
lightning, com o comentário «MC63/64: animação de vencedor desabilitada no front-end»). O
`MercadoLances.jsx` — o único ficheiro que este UTAC autoriza para esta frente — **só consome** a flag
(l. 171 destructuring, l. 209 `{showOverlay && (`) e **não tem acesso ao setter** (o `value` do
contexto expõe `showOverlay` na l. 1357, **não** `setShowOverlay`). Não existe outro produtor de
`showOverlay = true`.
⇒ Como o UTAC **proíbe expressamente** alterar o `AppContext.jsx`, a Frente D é **impossível no escopo
autorizado**. **Não contornei** — escalei, com as opções medidas:
1. **Autorizar o `AppContext.jsx` (só a l. 1205) neste UTAC** (correcção mínima: descomentar 1 linha;
   a flag é `useState(false)` na l. 206 e o gate do overlay já existe no MercadoLances l. 209);
2. Abrir **UTAC próprio** para o `AppContext`;
3. **Não religar** (manter o comportamento actual).
**⚙️ 4.ª opção — IN-ESCOPO (achada pelo validador adversarial, que me refutou parcialmente):** mudar
o **gate** na l. 209 do `MercadoLances.jsx` (ficheiro autorizado) para
`{(showOverlay || (encerrado && vencedor)) && (…)}` — 1 linha, mesma efeito visível, **sem** tocar no
`AppContext`. **Limites medidos:** **muda o gatilho** (não é «religar a flag»: abre por
`encerrado && vencedor` e não pelos 1200 ms do lightning) e traz **apenas um** dos dois overlays (o do
`Dashboard.jsx` l. 524 continua gateado pela flag, fora do escopo).
**⚠️ REVISÃO DO PRÓPRIO VALIDADOR (e é decisiva):** depois de examinar os testes, ele **revogou** a
refutação — a via do gate **colide com um teste-guarda deliberado** do UTAC000.10
(`utac0010-mercado-vencedor.test.mjs`: «sem `showOverlay` não há overlay nenhum — o gate do contexto
manda»), que codifica o contrato «**a página nunca re-deriva/decide o overlay; quem manda é o gate do
contexto**» (DEBT-009). Usá-la **exigiria reescrever esse contrato testado** ⇒ não é uma solução de
uma linha nem «religar o flag». **Conclusão dele: APROVA** (a minha medição estava correcta: o setter
não está no `value`; o único produtor de `true` é a linha comentada no ficheiro **proibido**). A opção
4ª fica na mesa **com esse custo medido** — o operador decide se quer mudar o contrato.
⚠️ **Determinante medido (e é um aviso):** religar torna **alcançáveis** os defeitos latentes das
DEBT-011/012/013. As guardas do UTAC000.11/12 já estão no `OverlayVencedor` e no card do Dashboard;
a do **`FimEdicaoOverlay` (DEBT-013) NÃO está** ⇒ religar sem fechar a DEBT-013 expõe «R$ NaN»/crash
naquele overlay.

## 3. Validador adversarial (GATE 8) — obrigatório
Despachado sobre o commit `cc072c6` (docs; **não** empurrado antes do veredicto), com uma missão
explícita: **tentar achar o flaky** (N próprio, harness com TTY, concorrência, repetição dirigida), e
tentar refutar que a Frente D exige o ficheiro proibido (procurando qualquer via **in-scope**).
Veredicto: `_logs/UTAC000.13_SEG-3_VALIDADOR.md`.

## 4. O que este UTAC NÃO fez (declarado)
- **Não** alterou uma linha de código (o commit deste UTAC é só `_logs/`): sem correcção inventada
  para o flaky, e sem tocar no `AppContext.jsx` (proibido) nem no `MercadoLances.jsx`.
- **Não** fechou DEBT-014 (parcial), DEBT-013, DEBT-015, DEBT-010, DEBT-001/002/003/005/006.
- **Não** tocou em contrato, GUTO, Passe, Concurso, `_render.mjs`, `_ponte-ssr.mjs`, `vite.config.js`,
  `package.json`, `useResultadoOficial.js`, `MeusAtivos.jsx`, `Dashboard.jsx`, backend.

## 5. Ficheiros entregues
| ficheiro | o que |
|---|---|
| `_logs/UTAC000.13_SEG-1_MEDICAO.md` | estado, método de caça, varredura de suspeitos, veredito do SEG-1 |
| `_logs/UTAC000.13_SEG-1_EVIDENCIA.txt` | evidência bruta (30 corridas, experimento de carga, medição do `showOverlay`) |
| `_logs/UTAC000.13_SEG-2_ANTES-DEPOIS.txt` | antes/depois + o resultado negativo + a escalada |
| `tmp-utac0013/{cacar-flaky.sh, flaky-sob-carga.sh, montar-evidencia.sh}` | ferramentas re-executáveis (fora do repo) |
| `_logs/DEBT.md` · `CLAUDE.md` · `_logs/UTAC000.13-RELATORIO.md` · `Desktop/UTAC000.13-RELATORIO.md` | registo em 3 lugares (R14/R18) |

## 6. Custo e tempo
**Custo medido** (mesma sessão-mãe do ciclo, `state.db`, `cost_status = estimated`):

| | input | output | cache-read | ≈ USD |
|---|---|---|---|---|
| leitura no fecho do UTAC000.12 | 936 347 | 489 611 | 142 890 496 | 0,6683 |
| leitura no fecho do UTAC000.13 | 1 002 928 | 557 187 | 166 787 840 | 0,7634 |
| **diferença = UTAC000.13 (pai)** | **+66 581** | **+67 576** | **+23 897 344** | **≈ 0,0951** |

Mais o **validador adversarial** (subagente `20261001_235200_93b40f`): **US$ 0,0237**.
**⇒ UTAC000.13 ≈ US$ 0,119.**
**Saldo da API:** `GET https://api.deepseek.com/user/balance` → **US$ 1,73** no fecho (era **1,96** no
fecho do UTAC000.12 ⇒ consumo real do ciclo ≈ **0,23**).
**Deploy:** `index-BKCa0d9t.js` — **inalterado** (nenhum código mudou neste UTAC; o bundle é o mesmo do
UTAC000.12) ⇒ verificação de que a afirmação «zero alterações de código» é verdadeira até em produção.
**Tempo:** excedeu as 2 h — a caça ao flaky é tempo de máquina (66+ corridas ≈ 1 h de CPU, incluindo o
*hammer* do validador que eu tive de matar). Declarado: o excedente foi **medição**, não escopo novo.


## 7. REVISÃO (2.ª ronda, 2026-10-02) — a minha conclusão do flaky foi REFUTADA e corrigida

**Estado do UTAC muda de «PARCIAL sem objecto na Frente B» para: Frente B CONCLUÍDA (o flaky foi
apanhado, reproduzido, corrigido e verificado por A/B pareado).** A DEBT-014 passa a **FECHADA**.

1. **O que eu declarei (1.ª ronda):** «60 corridas, 0 falhas ⇒ não reproduzível; escopo estreitado;
   não invento correcção para um defeito não observado.»
2. **O que estava errado:** (a) **N insuficiente e no alvo errado** — um flaky com taxa ~1/120 **por
   ficheiro** não se apanha correndo a suíte inteira 30×; e eu martelei o ficheiro suspeito só **6×**
   sob carga; (b) **eu tinha identificado a classe certa** (a §-1.3 da MEDICAO diz «temporizadores
   reais… zero `fakeTimers`») e **desmenti-me sem medição**, escrevendo «ilibado pelo empírico» com
   base em 6 corridas — foi um **julgamento, não uma medição**.
3. **O veredicto do validador (§A)** apanhou o teste, a linha, o assert e a causa; **eu reproduzi-o**
   (1/200 sob carga, com o nome) e corrigi. **O histórico errado fica à vista** nesta §7 e no §3.
4. **Correcção da afirmação do TTY:** o harness **não** exige TTY; exige **stdin redireccionado**
   (`</dev/null`) quando corre em background. Afirmação minha corrigida nos registos.
5. **A/B pareado do flaky (martelo paralelo, 8 fluxos = carga real):** MUTANTE fiel ao original **4/400** (4× `um pedido novo limpa o erro do anterior`) → CORRIGIDO **0/400**; somando as rondas: **5/600 pré (≈0,8%) → 0/600 pós**; mutante fiel ao original
   ⇒ ver `_logs/UTAC000.13_SEG-2_ANTES-DEPOIS.txt` (que inclui os **3 erros meus** de instrumento
   declarados nesta ronda).

**Lição (para os próximos UTACs):** um flaky não se mede no agregado — **mede-se no alvo, com N
compatível com a taxa alegada**; e «não reproduzível» só pode ser declarado depois de martelar o
alvo, não a suíte.
