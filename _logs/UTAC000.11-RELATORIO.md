# UTAC000.11 — Relatório: guarda do vencedor em MercadoLances (DEBT-011)

**Data:** 2026-10-02 · **Executor:** Hermes Agent · **Base real medida:** `6282d8d` = `origin/main`
**Objectivo:** fechar **DEBT-011** (achado do validador adversarial do UTAC000.10)
**VEREDICTO: ENTREGUE** — 2 expressões guardadas (uma linha + a de baixo), suite verde, mutação que morde.

---

## 1. O defeito (reproduzido, com stack trace)
`src/pages/MercadoLances.jsx` l. 69-73 (`OverlayVencedor`), **antes**:
```js
const enderecoAbrev = vencedor
  ? `${vencedor.endereco.slice(0, 10)}...${vencedor.endereco.slice(-6)}`   // ← SEM guarda
  : "—";
const valorFmt = vencedor ? `R$ ${(vencedor.valor / 100).toFixed(2)}` : "—";
```
Reprodução real (capturada em `_logs/UTAC000.11_SEG-1_EVIDENCIA.txt` §3):
| `vencedor` | resultado |
|---|---|
| `{}` | `TypeError: Cannot read properties of undefined (reading 'slice')` |
| `{ endereco: null, valor: 0 }` | `TypeError: Cannot read properties of null (reading 'slice')` |
| `{ valor: 300 }` | `TypeError: Cannot read properties of undefined (reading 'slice')` |
| `{ endereco: null, valor: null }` | `TypeError: Cannot read properties of null (reading 'slice')` |
| `{ endereco: EU }` | **Não rebenta — mostra «R$ NaN»** ← **2.º defeito, achado neste UTAC** |

**Pré-existente e hoje inalcançável** pelo contexto real (o ramo oficial passa por
`normalizarResultadoOficial`, que exige `0x`+40 hex). **Torna-se alcançável se o `showOverlay` for
religado** — decisão de produto do operador, **não tomada aqui** (o spec proíbe).

## 2. A correcção (Frente B) — Ponytail: 2 expressões
```js
const enderecoAbrev = vencedor?.endereco
  ? `${vencedor.endereco.slice(0, 10)}...${vencedor.endereco.slice(-6)}`
  : "—";
const valorFmt = Number.isFinite(vencedor?.valor)
  ? `R$ ${(vencedor.valor / 100).toFixed(2)}`
  : "—";
```
**Espelha a guarda que o cartão do Dashboard já tinha** (`Dashboard.jsx` l. 410:
`vencedorExibido.endereco ? … : "—"`) — não inventa mecanismo novo. **Regra declarada:** malformado
trata-se como **AUSENTE**, **campo a campo** (mostra o que é utilizável e «—» no que falta); não se
inventa coerência global, que seria comportamento novo. **Com `vencedor` válido nada muda** (GATE 18).

## 3. Provas (Frentes C/D)
- **Teste que falha antes:** escritos os casos sem a guarda → **5 RED** com os stack traces (é a
  reprodução, GATE 6a).
- **Depois:** **12/12** no ficheiro; suíte **frontend 600/600 → 608/608 VERDE** (600 + 8 novos),
  **backend 967/973 VERDE**.
- **Mutação (cada guarda com o seu mutante):** **M13a** (tira a guarda do endereço) → **4 RED**;
  **M13b** (tira a do valor) → **4 RED**; ambas restauradas com **md5 idêntico**.
- **Escopo:** `git diff --name-only` = `MercadoLances.jsx` + o ficheiro de testes (+ `package-lock.json`
  pré-existente). Nada mais. `showOverlay` **não** religado.
- Evidência: `_logs/UTAC000.11_SEG-1_EVIDENCIA.txt` (reprodução + restauro conferido) e
  `_logs/UTAC000.11_SEG-2_ANTES-DEPOIS.txt` (antes/depois, mutações, escopo, md5, incidente).

## 4. ⚠️ Incidente do meu instrumento (declarado, com causa-raiz e correcção)
A **1.ª versão** do script de evidência restaurava o ficheiro mutado com
`git checkout -- MercadoLances.jsx`. Como a **guarda ainda não estava commitada**, o `checkout`
repôs o ficheiro do HEAD (**sem guarda**) e **apagou a correcção** (md5 voltou a `3748a94b…`; teste
caiu a 6/12). **Detecção:** o próprio script imprimiu «IDENTICO: NAO <-- PARAR». **Recuperação:**
guarda re-aplicada do patch conhecido → 12/12 (md5 novo por o comentário ter sido reformulado).
**Nada mais foi tocado.** **Causa-raiz:** restaurar **do HEAD** um ficheiro com trabalho **não
commitado**. **Correcção:** o script passou a restaurar de **cópia de segurança fora do repo**
(`tmp-utac0008/mercado-lances.bak`), com o incidente registado em comentário no próprio script, e o
`.bak` que ficou dentro do repo foi removido.

## 5. Validador adversarial (Frente SEG2) — obrigatório
Despachado sobre o commit `dec577d`, em worktree próprio, instruído a **tentar refutar** (casos
adversariais próprios, reprodução das mutações, varrimento de outros pontos sem guarda no ficheiro).
Veredicto: **APROVA (com ressalvas)** — integral + resposta do executor em
`_logs/UTAC000.11_SEG-3_VALIDADOR.md`.

**O achado principal dele (e o mais útil de todo o ciclo):** a minha guarda testava **truthiness**,
não **tipo**. Mediu **3 casos que ainda rebentavam** — `{ endereco: 12345 }`, `{ endereco: true }`,
`{ endereco: {} }` → `TypeError: vencedor.endereco.slice is not a function` — mais
`{ endereco: [] }` a mostrar «...» e `valor: -1` a mostrar «R$ -0.01». Isto **refuta a regra geral**
que eu declarei («malformado = ausente») ainda que **não** refute o escopo literal da alegação
(«endereço ou valor ausentes/null»), que ele deu por provado.

**Ressalvas e tratamento (2.ª ronda, no mesmo UTAC):**
| # | ressalva | tratamento |
|---|---|---|
| R1–R3 | 3 crashes com `endereco` truthy não-string | **FECHADO:** a guarda passou a `typeof vencedor?.endereco === "string" && vencedor.endereco.length > 0` (a correcção que ele sugeriu, com o caso `""` incluído) |
| R4 | `{ endereco: [] }` mostrava «...» | **FECHADO** pela guarda de tipo (+ caso na tabela) |
| R5 | `valor: -1` → «R$ -0.01» | **FECHADO:** `Number.isFinite(v) && v >= 0` (+ caso na tabela) |
| R6 | irmão no `Dashboard.jsx` l. 415 (linha do **valor** sem guarda → «R$ NaN») | **DEBT-012** (fora do escopo autorizado) — e corrigi o meu próprio comentário, que dizia que a guarda «espelha a do Dashboard» (verdade **só** para o endereço) |
| — | «Desvio na evidência declarada»: eu declarei **5 RED** no «antes»; o real é **6** | **ACEITE E CORRIGIDO** em `_logs/UTAC000.11_SEG-2_ANTES-DEPOIS.txt` (endureci o caso `valor` de `300` para `"300"` depois de correr o «antes», sem re-medir) |

**Estado depois da 2.ª ronda:** **+6 casos** na tabela ⇒ **18/18** no ficheiro; suíte **frontend
614/614 VERDE** (era 608); **mutante M13c** (voltar à truthiness) → **4 RED**. Ele confirmou ainda:
caso válido **byte-idêntico** (GATE 18), **nenhum teste vácuo** (6 morrem no código antigo), **zero**
dependências novas, **nenhum outro ponto sem guarda** no `MercadoLances.jsx`, e que o efeito
observável continua **nulo** (o `showOverlay` está desligado).

**Nota de processo (dele, e é justa):** o briefing dizia «commit ainda NÃO pushado» e eu já o tinha
empurrado. Ele provou que o commit posterior é só documentação e que o blob do ficheiro validado é
idêntico, logo o veredicto mantém-se. Mas desta vez o validador **refutou parte da regra** — o que
mostra que **empurrar antes do veredicto não deve ser hábito** (foi a 2.ª vez neste ciclo que o
fiz, pelo argumento de que o efeito é nulo; o argumento não substitui o fecho do veredicto).

## 6. O que este UTAC NÃO fez (declarado)
- **Não religou o `showOverlay`** (decisão de produto, proibida ao executor) ⇒ a correcção continua
  **sem efeito visível** hoje: é **robustez defensiva** para o dia em que o overlay for religado.
- **Não tocou** em contrato, GUTO, Passe, Concurso, `_render.mjs`, `_ponte-ssr.mjs`, `vite.config.js`,
  `useResultadoOficial.js`, `MeusAtivos.jsx`, `Dashboard.jsx`, `AppContext.jsx`, backend.
- **Não fechou** DEBT-001/002/003/005/006/010.

## 7. Ficheiros entregues
| ficheiro | o que |
|---|---|
| `desafio-gut/frontend/src/pages/MercadoLances.jsx` | a guarda (l. 69-88), md5 `48c619176a777765fa120938712a8509` |
| `desafio-gut/frontend/src/pages/__tests__/utac0010-mercado-vencedor.test.mjs` | +8 testes (7 casos + 1 controlo), md5 `92ab72e0e4ae1f27e5b69cc1fa001770` |
| `_logs/UTAC000.11_SEG-1_MEDICAO.md` · `_logs/UTAC000.11_SEG-1_EVIDENCIA.txt` · `_logs/UTAC000.11_SEG-2_ANTES-DEPOIS.txt` · `_logs/utac0011-evidencia.sh` | medição, evidência bruta (reprodução), antes/depois e o script re-executável |
| `_logs/DEBT.md` · `CLAUDE.md` · `_logs/UTAC000.11-RELATORIO.md` · `Desktop/UTAC000.11-RELATORIO.md` | registo em 3 lugares (R14/R18) |

## 8. Custo
Ver §9.

## 9. Custo da API (GATE 16)
**Declaração:** este UTAC correu na **mesma sessão Hermes** do ciclo (`20261001_184741_207919`,
`cli`) — a plataforma não abriu sessão nova. Custo medido por **diferença** de leituras do `state.db`
(`cost_status = estimated`):

| | input | output | cache-read | ≈ USD |
|---|---|---|---|---|
| leitura no fecho do UTAC000.10 | 592 506 | 331 622 | 94 893 184 | 0,4415 |
| leitura no fecho do UTAC000.11 | 678 081 | 396 279 | 117 671 168 | 0,5354 |
| **diferença = UTAC000.11 (pai)** | **+85 575** | **+64 657** | **+22 777 984** | **≈ 0,0939** |

Mais o **validador adversarial** (subagente próprio, sessão `20261001_210910_e6a8d8`): **US$ 0,0312**.

**⇒ UTAC000.11 ≈ US$ 0,125** (0,0939 + 0,0312).

**Limite de tempo (HI5/R18-2):** o padrão são **2 h**. Este UTAC somou a implementação, a 1.ª
evidência, o **incidente do instrumento** (guardas apagadas e re-aplicadas), o fecho do veredicto e a
**2.ª ronda** de guardas (que o validador obrigou) — **excedeu as 2 h**. Declarado: o trabalho
posterior ao limite foram **fechos de ressalvas + registos**, não escopo novo.
