# UTAC000.17bc — SEG-1 · Medição: prazo, `criarEdicao` e overlay — 2026-10-02

**Objectivo:** fechar **DEBT-016** (prazo real do relâmpago) e **DEBT-017** (edição real para a R-1) e
entregar o **overlay agregado** + `onClose` + «visto». **17b e 17c juntos** (GATE 24).

## -1.1 Estado (medido)

| item | valor |
|---|---|
| `HEAD` = `origin/main` | **`dd3f151`** ✓ (confere) |
| árvore | limpa (só o `package-lock.json` pré-existente) |
| suíte frontend | **670/670 VERDE** |
| suíte backend | **984/990 VERDE** |

## -1.2 O prazo do relâmpago — **relógio LOCAL** (a raiz da DEBT-016)

`src/context/AppContext.jsx`:
```
193  const [prazoFlash, setPrazoFlash] = useState(() =>
194    lerPrazoStorage(LS_PRAZO_FLASH) ?? (Math.floor(Date.now() / 1000) + DURACAO.flash)   ← RELÓGIO LOCAL
196  const [prazoProgramado, setPrazoProgramado] = useState(() =>
197    lerPrazoStorage(LS_PRAZO_PROG) ?? (Math.floor(Date.now() / 1000) + DURACAO.programado)
```
E o disparo do overlay (l. 1191-1212) usa `prazoTimestamp` (o local) para o `restante`:
```
const restante = Math.max(0, prazoTimestamp - Math.floor(Date.now() / 1000));
if (restante === 0) { setEncerrado(true); … setTimeout(…1200) → if (!EM_BREVE_MODE) setShowOverlay(true); }
```
⇒ com o prazo local (30 min, `DURACAO.flash`), o overlay abre **a cada 30 min** (DEBT-016) — e o
`localStorage` reaceita prazos vencidos há < 600 s, pelo que um F5 reabre (medido pelo validador do
UTAC000.14). **O servidor já chega ao `AppContext`** (l. 184: `const { edicoes, edicoesStatus, agendadas,
offsetRelogioMs } = useEdicoes();`) ⇒ há um `termino_em` **server-authoritative** disponível, e um
`offsetRelogioMs` (desvio servidor↔aparelho, `useEdicoes.js` l. 110-115) — mas **nenhum é usado** para
decidir o fim.

## -1.3 `useEdicoes` — fallback e a **impossibilidade de distinguir o sintético**

`src/hooks/useEdicoes.js`:
- l. 42-57 `sintetizarR1()`: cria a R-1 de fallback com `termino_em` = o prazo **LOCAL** persistido
  (`gut_prazo_flash`) ou `agora + 1h` — **sem qualquer marcador** de que é sintética;
- l. 69-93 `normalizarMapa()`: normaliza cada edição do servidor (id, tipo, produto, termino_em, lances,
  status, imagem_url, inicio_em) — **não passa nenhuma flag** de «sintética»;
- l. 118: o estado INICIAL é `sintetizarR1()` ⇒ antes da 1.ª resposta o cliente **já tem um prazo local**;
- l. 146-153: em erro mantém a sintética (ou os últimos dados reais).

⚠️ **E o servidor também sintetiza** (`netlify/functions/_lib/edicoes-core.mjs` l. 19-21, 117-127):
`R1_FALLBACK_SEGUNDOS = 24h` e `sintetizarR1()` devolve `{id:"R-1", tipo:"relampago", termino_em: agora+24h,
lances:0, status:"aberto"}` — **também sem marcador**. ⇒ nem o servidor nem o cliente conseguem, hoje,
distinguir «prazo real da R-1» de «prazo inventado». **Isto é o que o GATE 26 exige resolver**: sem prazo
real, o overlay **não** abre (a espera é o comportamento seguro).

## -1.4 `criarEdicao` — a R-1 é impossível de criar (DEBT-017)

`_lib/edicoes-core.mjs`:
- l. 44: `export const EDICAO_ID_RE = /^(?:(PROG|RELAMP)-\d+|ESPECIAL-[A-Z0-9]+)$/` ⇒ **`R-1` NÃO casa**;
- l. 231: `criarEdicao({ tipo, produto, duracaoSegundos, duracaoMin, criadoPor, origem, valorBaseCentavos,
  incrementoCentavos, produtoId })` ⇒ **não aceita `id`**; o id sai de `proximoId()` (l. 77:
  `tipo === "programado" ? "PROG" : "RELAMP"`) ⇒ **só `RELAMP-N`/`PROG-N`**;
- l. 320: o encerramento também valida por regex (`edicao_id_invalido`).
⇒ **Nenhum caminho de código cria a R-1** (confirmado): só uma escrita directa da chave `R-1` no Blob
`edicoes-metadata` (que é o que a própria DEBT-017 diz resolver).
**Criação em produção:** o `POST /edicoes` é **admin-gated** (`guardAdmin`, `edicoes.mjs` l. 61-67) ⇒ sem
token de admin o caminho é a escrita directa no Blob (CLI), como a DEBT-017 prescreve.

## -1.5 `FimEdicaoOverlay` — sem `onClose` (a 2.ª metade da DEBT-016)

`src/components/FimEdicaoOverlay.jsx` (84 linhas): props `{ vencedor, modalidade, onNovaRodada,
EDICAO_ATIVA }` — **não tem `onClose`**; a única saída é o botão **«⚡ NOVA RODADA»** (l. 70-80).
Renders: 🏆 EDIÇÃO ENCERRADA + «Carteira Vencedora» (endereço abreviado + valor) ou «Nenhum lance único
registado». **Montagem:** `Dashboard.jsx` l. 524-529 (`{showOverlay && <FimEdicaoOverlay …>}`).
`MercadoLances.jsx` tem um **overlay PRÓPRIO** (`OverlayVencedor`, l. 69) — dois overlays distintos a
receber o mesmo agregado (GATE 21 / decisão 3 do operador: montar em Dashboard **e** MercadoLances).

## -1.6 Saúde global (HI1)
Disco/processos OK · nenhum worktree montado · `node_modules` real intacto (505 frontend · 417 backend) ·
suíte verde no baseline · árvore limpa. Arnês de runtime presente: `src/__tests__/_arnes-provider.mjs`
(11 734 bytes, UTAC000.15) ⇒ será usado no SEG3 (GATE 23).

## -1.7 Veredito do SEG-1: **SEGUIR**
Tudo medido e coerente com o spec. O caminho mínimo é claro:
**(a)** marcar o sintético nas DUAS pontas (`edicoes-core` + `useEdicoes`) → **B**; **(b)** decidir o fim pelo
`termino_em` real do servidor (+`offsetRelogioMs`), **sem** fallback para o relógio local → **C**;
**(c)** `criarEdicao` com `id` explícito (R-1) + criação em produção → **D**; **(d)** overlay agregado +
`onClose` + «visto» nos dois sítios → **E**.
