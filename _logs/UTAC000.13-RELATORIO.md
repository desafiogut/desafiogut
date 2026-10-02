# UTAC000.13 — Relatório: DEBT-014 (teste flaky) + `showOverlay`

**Data:** 2026-10-02 · **Executor:** Hermes Agent · **Base real medida:** `d614b4c` = `origin/main`
**Objectivo:** fechar a DEBT-014 (suíte determinística) e, no fim, religar o `showOverlay` (decisão do operador).
**VEREDICTO: PARCIAL** — Frente A/B: **resultado NEGATIVO medido** (flaky não reproduzível em 60 corridas);
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
Ver a resposta final (mesma sessão do ciclo; medido por diferença no `state.db`, + **saldo da API**).
**Tempo:** excedeu as 2 h — a caça ao flaky é tempo de máquina (60 corridas ≈ 50 min). Declarado: o
excedente foi **medição**, não escopo novo.
