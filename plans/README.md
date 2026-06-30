# Implementation Plans

Gerados pela skill `improve` (variante `plan`) em 2026-06-30 (MC39.23), no commit `e842d4b`.
Cada plano é **autocontido**: um executor sem contexto desta sessão consegue executá-lo só com
o arquivo do plano + o repo. Leia o plano inteiro antes de começar, honre as STOP conditions, e
atualize a sua linha de status aqui ao concluir.

> ⚠️ Muitos passos são `[OPERADOR]` (segredos, serviços externos, dinheiro real, contas Google/
> Meta/AWS). Um agente prepara e valida o que é código/config; não executa ações outward-facing
> nem manuseia segredos (R9/R10).

## Execution order & status

| Plan | Title | Priority | Effort | Risk | Depends on | Status |
|------|-------|----------|--------|------|------------|--------|
| 001  | MC40 — Deploy do LeilaoGUT na mainnet + transferência da coordenação (KMS) | P1 | L | HIGH | — | IN PROGRESS — pré-reqs CI ✅ (#124 Foundry+Echidna, #125 AgentShield); aguarda auditoria externa + deploy on-chain |
| 002  | Playstore — empacotar como app Android (Capacitor/AAB) e submeter | P2 | L | MED | 001 (build de produção aponta mainnet) | TODO |
| 003  | Campanha de lançamento (E-mail + WhatsApp) | P2 | M | MED | 001 (produto em produção); 002 p/ link da loja | TODO |

Status: TODO | IN PROGRESS | DONE | BLOCKED (motivo) | REJECTED (motivo).

## Dependency notes
- **001 é a raiz.** Sem o contrato em mainnet + coordenação na Smart Account, nada a jusante é "lançamento real".
- **002** pode COMEÇAR em paralelo (closed testing aponta staging/Sepolia), mas o **build de produção** só deve apontar mainnet **depois do 001**.
- **003** só dispara a fase de "Lançamento" (Semana 3) com o produto em produção (001); o CTA para a Play Store depende do 002 estar publicado.

## Ordem recomendada
1. **001** (auditoria externa → deploy → two-step → flip + validação).
2. **002** em paralelo até o closed testing; finalizar produção após 001.
3. **003** alinhado à data de produção do 001 (com link da loja do 002, se pronto).

## Qualidade / próximo passo recomendado
Os 3 planos foram autorados nesta sessão. Antes de executar o de maior risco (001),
recomenda-se uma passada `improve review-plan plans/001-mc40-mainnet-deploy.md` com um
**executor de contexto fresco** (a autocrítica do mesmo autor não pega lacunas que ele preenche
mentalmente). Igual para 002 se for executado por outro agente.

## Findings considered and rejected
- *(nenhum)* — esta foi uma invocação `plan <descrição>` (o operador já sabia o que queria);
  não houve auditoria aberta com findings a aceitar/rejeitar.
