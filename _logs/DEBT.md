# DÍVIDA TÉCNICA — registo único

**Auto-contido.** Este ficheiro é o registo de tudo o que ficou por fazer e **não se pode perder num
relatório**. Cada UTAC **lê-o antes de começar** (trigger no `SKILL.md`) e cada pendência declarada no
fecho entra aqui em vez de morrer no histórico.

**Regras de uso**
- Uma linha por dívida; o **ID é estável** (nunca se reutiliza, nunca se renumera).
- `Estado`: `aberta` · `aceite` (não se corrige de propósito, com motivo) · `fechada` (com o UTAC que a fechou).
- `Severidade`: `alta` · `média` · `baixa`.
- **Fechar uma dívida não apaga a linha** — muda o estado e cita o UTAC que a fechou (GATE 15).

| ID | Descrição | Origem (UTAC) | Severidade | Estado | Responsável |
|---|---|---|---|---|---|
| **DEBT-001** | 6 testes `skipped` do baseline do backend (956/962) **não enumerados um a um** — sabe-se que são `skipped` (não `failed`), não quais | UTAC105b.3 | baixa | aberta | executor |
| **DEBT-002** | «anónimo + `endereco` de terceiros + CNPJ **já registado** noutro `cliente_id`» devolve **409 `cnpj_duplicado`** em vez de **401** (o bloco anti-duplicidade do MC12.3 corre antes da guarda de posse). **Sem escrita** nesse caminho e **sem oráculo novo** (o mesmo 409 é alcançável anonimamente sem `endereco`) | UTAC105b.3 | baixa | aceite — documentada no código e no relatório; corrigir exige reordenar o ramo (produto) | operador |
| **DEBT-003** | Repetir **anonimamente** o cadastro directo devolve **401** quando a cota já existe (comportamento **pré-existente** do UTAC105b.2); o frontend não o atinge (só posta após o GET de duplicidade dar 404) | UTAC105b.3 | baixa | aceite | operador |
| **DEBT-004** | **Suíte do FRONTEND vermelha** — **FECHADA no UTAC000.6** (2026-10-01). Histórico: 68 falhas (baseline) → 25 (correcção parcial do UTAC000.4) → 19 → **0 (VERDE 535/535)**. Causa final medida: o runner SSR do Vite 8 serve a módulos carregados mais tarde uma instância de React diferente da do primeiro (`ReactCurrentDispatcher` a null). Correcção: `src/__tests__/_ponte-ssr.mjs` é o PRIMEIRO módulo que o servidor de testes carrega e importa react/react-dom/server/react-router-dom/framer-motion — passando todos os seguintes a receber a mesma instância. PoC do `vite@7.3.6` foi medido e **refutado** (152 falhas) — o downgrade NÃO é a solução. Prova: mutação no load da ponte → 0/15; com ele → 15/15. **Backend 967/973 intacto; zero código de produção tocado** | UTAC105b.3 → UTAC000.4 → UTAC000.5 → **UTAC000.6 (fecho)** | alta | **fechada** | — |

## Histórico — texto da DEBT-004 tal como estava antes do fecho (arquivado, não apagado)

> **DEBT-004** (redacção anterior, substituída no fecho pelo UTAC000.6) — «**Suíte do FRONTEND vermelha** —
> 68 → 25 falhas (UTAC000.4). Causa medida: o `@vitejs/plugin-react` da `vite.config.js` injecta `react`
> no `optimizeDeps.include` e o Vite entrega ao componente uma instância de React diferente da do
> ficheiro de teste (`ReactCurrentDispatcher` a `null`). **PARCIALMENTE CORRIGIDA** (novo
> `src/__tests__/_servidor-teste.mjs` + 5 arnês): já verdes `_render.mjs`, `utac105b-painel`,
> `MeusAtivos`, `mc102-recebi`. **Resistem:** `Dashboard` (react-router, 10), `mc1021a-timeline` (6),
> `mc1043-retencao` (1), `especial-i18n` (interferência). Produção **intacta**»
>
> *Motivo do arquivo: o validador adversarial (UTAC000.6/SEG-3) assinalou que a linha anterior tinha
> sido substituída em vez de arquivada à vista (GATE 14). O texto acima preserva-a.*

| **DEBT-005** | `skills/utac/protocol/regras-legado.md` (linha 45) declara **«61 regras em 9 categorias»** e **`A8`** — obsoleto desde o v1.0 (hoje: **75 regras em 10 categorias**, A1-A12). Lacuna **pré-existente** do v1.1 (o UTAC000.3 também não a corrigiu); apanhada pelo validador do UTAC000.7. Os outros 2 sítios (`SKILL.md`) foram corrigidos nesse UTAC porque o `SKILL.md` estava no escopo autorizado; **este ficheiro não estava** (GATE 2/HI4 — o executor não estende o próprio escopo) | UTAC000.3 (origem) / UTAC000.7 (deteção) | baixa | **aberta** — precisa de autorização para tocar em `regras-legado.md` | operador |
| **DEBT-006** | Suíte do **backend** dá **959/966** num worktree limpo (com junctions A9) e **967/973** na árvore partilhada — 7 testes a menos, **0 falhas** nas duas; os `_tests/` são iguais. Causa não investigada (ambiente: ficheiros ignorados/variáveis/caches) | UTAC105c | baixa | aberta | executor |
| **DEBT-007** | O `lances` do `AppContext` só tem os eventos `LanceDado` vistos em tempo real + os lances do próprio utilizador — **não** o histórico da edição. «Menor lance único da edição» (🏆 do `MeusAtivos`, cartão «Menor Lance», vencedor do Dashboard) é, na prática, «o menor único que este browser viu desde que abriu». Pré-existente; corrigir é no contexto/backend (UTAC próprio) | UTAC105c (validador SEG4) | média | aberta | operador **UTAC000.8 (2026-10-01):** investigada e com **abordagem decidida** (parou por orçamento, GATE 4) — o defeito está SÓ no modo **on-chain** (`lances`); o `lancesFlash` já carrega a lista completa do blob (AppContext l.768-770). Fix mínimo: endpoint com **`getLanceDadoEvents`** (já em `_lib/contract.mjs`, modelo de paginação em `monitor-onchain.mjs`) + **carga inicial** em `AppContext` para `setLances`, espelhando o `lancesFlash`. **Nota:** o spec do UTAC000.8 declarava severidade **ALTA**; aqui está **média** — divergência declarada, não corrigida (prioridade é decisão do operador). |
> **Nota de registo:** as três primeiras entradas são as pendências declaradas do UTAC105b.3, conforme
> o pedido. A **DEBT-004 foi acrescentada** pelo executor (não constava da lista) porque é dívida de
> infraestrutura de severidade **alta**, descoberta no fecho daquele UTAC, e o `DEBT.md` é exactamente
> o lugar onde HI4/HI5 mandam registá-la. **Fica sujeita a veto do operador.**
