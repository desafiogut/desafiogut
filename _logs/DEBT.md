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
| **DEBT-004** | **Suíte do FRONTEND vermelha** — 68 → **25 falhas** (backend 967/973 VERDE). Causa medida: o `@vitejs/plugin-react` da `vite.config.js` injecta `react` no `optimizeDeps.include` e o Vite entrega ao componente uma instância de React **diferente** da do ficheiro de teste (`ReactCurrentDispatcher` a `null`). Correcção **parcial** (novo `src/__tests__/_servidor-teste.mjs` + 5 arnês; `_render.mjs`/`MeusAtivos`/`utac105b-painel` já verdes) **em working tree, não commitada**; falta o caso `Dashboard` (react-router carregado pelo Node). **Pendente de decisão do operador** (continuar ou reverter) | UTAC105b.3 (pós-fecho) | **alta** | **aberta — exige UTAC próprio (HI4/HI5)** | operador |

> **Nota de registo:** as três primeiras entradas são as pendências declaradas do UTAC105b.3, conforme
> o pedido. A **DEBT-004 foi acrescentada** pelo executor (não constava da lista) porque é dívida de
> infraestrutura de severidade **alta**, descoberta no fecho daquele UTAC, e o `DEBT.md` é exactamente
> o lugar onde HI4/HI5 mandam registá-la. **Fica sujeita a veto do operador.**
