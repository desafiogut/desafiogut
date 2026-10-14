# BRIEF — FRENTE B do UTAC110g.1 (executor: Opus 5.5, via Claude Code)

> ⚠️ **RESULTADO DA DELEGAÇÃO (2026-10-14) — o executor designado NÃO correu.** Este brief foi
> enviado ao Opus 5.5 por stdin (`claude -p --model opus --permission-mode bypassPermissions`). A
> conta devolveu **HTTP 429 `usage_limit_reached`** («You've hit your session limit · resets 2:30am
> America/Sao_Paulo») ao 10.º turno, com ~3,27 USD gastos e **nenhuma alteração de ficheiro**. O
> mesmo teste com `--model sonnet` deu o **mesmo 429** (é limite de CONTA, não de modelo). A Frente B
> foi então executada pelo **Hermes**, como **substituição declarada** — ver
> `_logs/UTAC110g.1-front-frenteB.md` §1. O brief fica aqui como estava escrito, porque é a
> especificação vinculativa da Frente B e é ele que descreve o que foi (e o que não foi) feito.

Você é o executor da **FRENTE B** de um UTAC (unidade de trabalho auto-contida) do projeto
DESAFIOGUT. Trabalhe em português (PT-BR) nos comentários e relatórios.

## 0. Onde

- Repo: `C:\Users\Moltbot\Desktop\DESAFIOGUT`
- Frontend (raiz de trabalho): `C:\Users\Moltbot\Desktop\DESAFIOGUT\desafio-gut\frontend`
- Baseline git: `a78626f` (= origin/main). **Não faça git add/commit/push** — o fecho é de outro
  agente (Hermes), que fará o commit dos ficheiros individualmente. Deixe a árvore de trabalho com
  as suas alterações.

## 1. Missão (decisão do operador R18-110g.1-2)

O botão «Resgatar cartão» (resgate do cartão colecionável, 50 pontos) **muda de casa**:

- **Sai** de `src/pages/OfertasProgramadas.jsx` (hoje: linhas ~326-346, dentro do vidro do cartão).
- **Entra** em `src/pages/MinhaCarteira.jsx`, **com o mesmo visual**, a seguir ao bloco dos saldos e
  ao bloco «Missões de hoje», e **antes** da grelha dos botões de compra
  (`💰 Depositar PIX` / `Comprar Passe Desafio` / `⚡ Menor Lance Único` / `🎫 Ofertas Programadas`).

O ecrã das Ofertas Programadas **continua a existir e continua a mostrar** os pontos, a barra, o
cartão (nome+descrição), o palpite, o histórico e o link das Regras. Só o BOTÃO de resgate sai de lá.

## 2. Especificação do botão (na Carteira)

- **Visível e activo** apenas quando o servidor diz que pode: use `podeResgatarCartao` do hook
  `src/hooks/usePontos.js`. Esse campo é a verdade do servidor e vale `pontosCartao >= 50`
  (só pontos de COMPRA). **NÃO use `pontos`** (o total inclui o bónus do palpite e não decide nada).
- Quando **não** pode: o botão **não aparece** (não faça botão `disabled` na Carteira — a Carteira é
  um ecrã de saldos; o lugar do «faltam N pontos» continua a ser a barra de progresso já existente).
- Texto visível: `🎁 Resgatar cartão colecionável`
- `aria-label="Resgatar cartão"` (nome acessível — mantenha-o para não partir as consultas dos testes).
- `type="button"`, `onClick` abre o `ResgatarCartaoModal` já existente
  (`src/components/ResgatarCartaoModal.jsx`) — **não altere esse componente**.
- Estilo: o MESMO do botão que sai das Ofertas — `width:"100%"`, `minHeight:"48px"`,
  `padding:"0.75rem 1rem"`, `borderRadius:"12px"`, `border: 1px solid ${COR.gold}`,
  `background: COR.gold`, `color:"#0a0f1a"`, `fontWeight:800`, `fontSize:"0.9rem"`.
  Na Carteira `COR.gold` já existe e é `#f5a623` (R18-109h.2: **uma só cor de destaque** — não
  introduza outra cor nem outro tom).
- Deixe uma âncora de teste: `data-acao="resgatar-cartao"`.
- O resgate na Carteira tem de usar o hook `useResgatarCartao` (o mesmo do 106g) e reler os pontos
  (`refetch` do `usePontos`) depois de um resgate com sucesso.

## 3. O que sai das Ofertas Programadas

Remova, de `src/pages/OfertasProgramadas.jsx`: o par de botões (activo/desactivado), o parágrafo de
apoio «Você vai trocar N pontos…», o estado `resgateAberto`, o render do `ResgatarCartaoModal` e os
imports que ficarem sem uso (`useResgatarCartao`, `ResgatarCartaoModal`, `CARTAO_ID`). Confirme com
`npm run lint` (ou `npx eslint src/pages/OfertasProgramadas.jsx`) que não fica variável/import morto.
**Não toque** em `CartaoEdicao.jsx`, `GlassHeader.jsx`, `CardLance.jsx` (proibido por este UTAC).

## 4. Testes (obrigatório)

Os ficheiros que hoje assertam o botão nas Ofertas têm de **mover a asserção de LOCAL, sem a
enfraquecer**:

- `src/pages/__tests__/utac106f-ofertas.test.mjs` (linhas ~162, 167-174, 190, 311)
- `src/pages/__tests__/utac106g-resgate.test.mjs` (linhas ~3, 12, 61, 100, 116-130, 136-174)

Regras: **não apagar asserções** — reescrever as que passam a ser falsas («o botão está nas
Ofertas») para a verdade nova («o botão NÃO está nas Ofertas»), e mover o teste de FLUXO
(clique → abre o balão) para a Carteira. Mantenha o que continua verdadeiro (o cartão é só por
pontos de compra; 48 de compra + 2 de palpite NÃO desbloqueia).

Crie um ficheiro novo de testes da Carteira, nesta casa e neste padrão:
`src/pages/__tests__/utac110g1-carteira-resgate.test.mjs`, cobrindo os **4 estados**:

1. `podeResgatarCartao:true` (≥ 50) → o botão **aparece**, com o texto «Resgatar cartão colecionável»,
   e o clique **abre** o `ResgatarCartaoModal`;
2. `podeResgatarCartao:false` (< 50) → o botão **não aparece** (`data-acao="resgatar-cartao"` ausente);
3. **carregando** (`loading:true`) → não se afirma nada (sem botão);
4. **erro** (`erro` preenchido) → sem botão (não se inventa estado).
   E ainda: `pontos:50, pontosCartao:48` → **sem** botão (prova de que não usa `pontos`).

**Bidirecional obrigatório:** cada guarda tem de MORDER. Prove-o (p. ex. com um controlo negativo
que reconstrua o comportamento antigo, ou apagando mentalmente o `if`): registe no log a prova de
que o teste fica VERMELHO se o botão voltar às Ofertas / se aparecer com < 50 pontos.

Siga o padrão do arnês já usado nesses ficheiros (leia-os primeiro; eles montam o componente com um
duplo de fetch e leem o markup).

## 5. Verificação obrigatória

1. Suíte frontend (do repo raiz):
   `node scripts/mc966-suite-harness.mjs frontend` → tem de dar **VERDE ≥ 1049/1049 + os novos**.
   ⚠️ O portão de RAM deste projeto (A14) pede ≥ 1 500 MB livres: **meça** antes com
   `powershell -NoProfile -Command "[int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024)"`
   e registe o número. A máquina é pequena (≈ 5,9 GB) e oscila — se ler abaixo de 1 500 MB, diga-o
   e corra na mesma em foreground, registando o desvio e o número medido.
2. `npm run build` tem de passar (sem ficheiro novo em `dist/` a ser commitado).
3. Screenshots: `_logs/utac110g.1-browser/` com, no mínimo,
   `carteira-com-resgate-{375,1280}.png` e `carteira-sem-resgate-{375,1280}.png`.
   Use playwright (já é dependência do frontend). O padrão da série é um **arnês TEMPORÁRIO** que monta
   a `MinhaCarteira` REAL com o CSS real e um `ler-pontos` sintético (não há sessão Privy real), tira
   as capturas e é **APAGADO no fim** (não deixe o arnês no repo). Verifique em cada ecrã:
   **overflow lateral = 0** e **0 erros de página** (console). Diga no relatório o que as capturas NÃO
   provam (ex.: não é produção com sessão real).
4. Rode `npx eslint src/pages/MinhaCarteira.jsx src/pages/OfertasProgramadas.jsx` sem erros novos.

## 6. Proibido (deste UTAC)

- Tocar no backend (`netlify/functions/**`) — é da Frente A, já feita.
- Tocar em `CartaoEdicao.jsx`, `GlassHeader.jsx`, `CardLance.jsx`.
- Tocar em `ResgatarCartaoModal.jsx` e em `useResgatarCartao.js` (já existem e funcionam).
- Alterar env vars; desligar `EM_BREVE_MODE` (`src/lib/leilaoLock.js`).
- `git add -A`; `git add`; `git commit`; `git push` — **nada de git de escrita**.
- Deploy.

## 7. Entrega

Escreva `_logs/UTAC110g.1-front-frenteB.md` (PT-BR, secções numeradas) com:
1. o que mudou, ficheiro a ficheiro (com as linhas);
2. a medição da suíte ANTES e DEPOIS (números reais), e a leitura de RAM;
3. a prova bidirecional (como cada guarda morde);
4. as capturas (caminhos, overflow, erros de consola) e o que NÃO provam;
5. erros dos SEUS próprios instrumentos, se os houver (obrigatório se houver);
6. pendências/riscos declarados.

No fim, responda com um resumo curto: ficheiros tocados, números da suíte, caminhos das capturas,
e qualquer coisa que tenha ficado por fazer.
