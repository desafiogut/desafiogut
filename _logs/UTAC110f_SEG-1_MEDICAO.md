# UTAC110f — SEG-1 MEDIÇÃO (fontes de pontos de lance: login, indicação, missão)

Skill: `desafio-gut/frontend/skills/utac/` (SKILL.md, segments/seg-1.md). Executor: Claude Code (Opus 5.5).
**Nada foi alterado neste segmento** (só leitura + este log). Excepção declarada: libertação de RAM
autorizada pelo operador («libere ram») — ver -1.6.

## -1.1 Estado do repo
- Raiz git: `C:/Users/Moltbot/Desktop/DESAFIOGUT`
- `git rev-parse HEAD` → **926c5df4ce97183e01dfb7da00ccc640a6ac703c** — bate com o baseline do enunciado («pós-110e = 926c5df»). Desvio ZERO.
- `git log --oneline origin/main..HEAD` → **vazio** (nada local por publicar; sem commits alheios).
- `git status --porcelain` → **6 ` M`** (`.agents/skills/aidesigner-frontend/*` ×3, `.gitignore`, `.mcp.json`,
  `desafio-gut/frontend/package-lock.json`) + `??` `_logs/MC100_*`/`MC101_*`/`MC102_*`/`UTAC106x.2.spec.yml`.
  **Os mesmos já declarados no 110e** — pré-existentes, não deste UTAC; nenhum será tocado (G1).

## -1.2 Caminhos nomeados
| caminho | medido |
|---|---|
| `netlify/functions/_lib/ledger-lance.mjs` | 169 l. — existe |
| `netlify/functions/_lib/referral.mjs` | **670 l. — EXISTE** (sistema «Indique e Ganhe», MC10/MC15/MC17) |
| `netlify/functions/referral.mjs` | 229 l. — endpoint `GET ?acao=meu-codigo` / `POST ?acao=usar-codigo` |
| `netlify/functions/lance-relampago.mjs` | 371 l. |
| `netlify/functions/auth-user.mjs` | 122 l. (emite o user-session; não é sítio de crédito — ver conflito 1) |
| `src/context/AppContext.jsx` | `authToken` em l.428; efeito do consentimento MC104 em l.904-911 (molde para A3) |
| `src/hooks/useMissoes.js` | **não existe** (a criar se a Frente D avançar) |
| `/login-diario`, `/indicar`, `/completar-missao`, `/missoes` | **não existem** |

## -1.3 Ledger (`_lib/ledger-lance.mjs`) — contrato medido
- Assinatura REAL: **`creditarPontosLance(endereco, quantidade, motivo, ref)`** (o enunciado escreve `creditarPontosLance(motivo)`).
- Motivos aceites (`MOTIVOS_PONTOS_LANCE`, l.36): `boas-vindas, login, missao, indicacao, sequencia` — os 3 deste UTAC existem.
- **CAS**: sim — UPDATE condicionado a `creditos_lance` + `pontos_lance` + `atualizado_em` (l.102-105), 5 tentativas.
- **Idempotência**: sim — por `ref` no array `historico_lance` (l.83). Mesmo `ref` ⇒ `{ok:true, criado:false}`, sem 2.º crédito.
- 1.ª linha: INSERT; `23505` → relê e repete (l.100).
- Consequência medida: **uma `ref` determinística por dia (`login:2026-10-13`) já garante «1×/dia» e «dois logins
  em paralelo ⇒ 1 crédito»** pelo CAS + ref, SEM coluna nova (ver conflito 2).

## -1.4 Indicação — o que JÁ existe (medido)
- Vínculo em Netlify **Blobs** (não Supabase): `referral:{codigo}:{indicado}`; código por endereço; reverso codigo→dono.
- `registrarIndicacao` (l.372): valida endereço, **auto-indicação** (l.348), **Sybil por visitorId** (l.355),
  **«uma carteira só pode ser indicada uma vez»** (`ja_indicado`, l.413-417), idempotente por chave.
- `POST /referral?acao=usar-codigo` (JWT do indicado, anti-IDOR) → após o vínculo: **throttle por IP (2/h)** e
  `registrarConversao` = **+1 senha ON-CHAIN** ao indicador (limite **10/mês**) e +1 ao indicado (`creditarSenhas`, contrato).
- HTTP já mapeado: auto-indicação 400 · `ja_indicado` **409** · código inexistente 404 · sybil 403.

### ⚠️ ACHADO PRÉ-EXISTENTE (HI — não é deste UTAC)
`referral.mjs:158-161` chama `registrarConversao({ codigo, indicador: mascararEndereco(r.indicador), indicado: mascararEndereco(endereco) })`.
`mascararEndereco` devolve `0x1234…abcd` ⇒ `concederBonus` falha a regex ⇒ `endereco_invalido` ⇒ **a conversão nunca acontece**.
Origem medida: `git log -L158,161` → commit **`0ec7d13`** («fix(security): … P3 logs mascarados») — o mascaramento destinado
aos LOGS foi aplicado aos ARGUMENTOS. **O bónus de indicação on-chain está morto desde o MC87.** Corrigir activa
`creditarSenhas` (contrato on-chain) ⇒ **fora do autorizado** («NÃO toca no contrato on-chain»). Vai para `_logs/DEBT.md`.

## -1.5 Missão / lance
- `lance-relampago.mjs`: o lance Flash consome 1 crédito (`consumirCreditoLance`, l.238-257); o lance é persistido em
  l.276-331; resposta 201 em l.358. **Ponto de inserção da missão: depois da persistência, antes do 201, fail-soft.**
- Há 2 ramos: `programado` (consome senha on-chain) e Flash/relâmpago (MLC). O enunciado fala de «lance no MLC».
- Nenhum fuso UTC-4 no código de servidor (o único utilitário de dia é `diaBRT`, UTC-3, `_lib/referral.mjs:69`).
  Manaus = UTC-4 fixo (sem horário de verão desde 2019).

## -1.6 Recursos (A14) e disco
| momento | leituras (MB) | |
|---|---|---|
| inicial | 681 · 677 · 669 | < 1 500 ⇒ SEG-1 inválido |
| fechado o Edge **sem janela** (`--no-startup-window`, árvore pid 9776, `MainWindowHandle=0` em todos) | 1 050 · 1 054 · 1 051 | ainda < 1 500 |
| + trim de working sets (`EmptyWorkingSet`, 107 processos, **nada fechado**) | **2 114 · 2 340 · 2 313** | ✅ A14 satisfeita |
Intactos: esta sessão (claude.exe 8972 + WindowsTerminal), o Claude Desktop (9436, árvore do operador), MsMpEng, explorer.
Autorização: mensagem do operador «libere ram» (2026-10-13). Disco: `df -h /c` → **15 GB livres** (> 5 GB).

## -1.7 Suíte baseline
`npm test` (harness `mc966`, ambos) no HEAD `926c5df`: **frontend VERDE 1010/1010 · backend VERDE 1152/1158** — igual ao declarado no enunciado.

## ⚠️ Conflitos entre o enunciado e o medido (AU3 / GATE 12 — NÃO resolvidos pelo executor)
1. **Regra do «dia» no login.** A2 diz «> 24 h desde o último login creditado» (janela deslizante); R18-110f-4 diz
   «reseta à meia-noite UTC-4» (dia de calendário) só para a missão; a entrega diz «1×/dia». São regras diferentes
   (login às 20:00 e às 09:00 do dia seguinte: deslizante = 0; calendário = +5). **Proposta:** dia de calendário
   UTC-4 para AMBOS.
2. **Migração com 2 colunas.** Com `ref` diária (`login:AAAA-MM-DD`, `missao-lance:AAAA-MM-DD`) o ledger já dá
   1×/dia + paralelo-seguro + estado legível do histórico. Colunas novas seriam uma 2.ª escrita fora do CAS do ledger
   (risco de divergência). **Proposta:** SEM migração.
3. **Indicação.** O enunciado propõe `/indicar` + tabela `indicacoes`; já existe `/referral?acao=usar-codigo` com
   todas as validações pedidas (B3). **Proposta:** creditar +50 pontos de lance DENTRO do `usar-codigo`, no ramo que
   passa o throttle de IP, com `ref` `indicacao:<indicado>` (idempotente). Perguntas: indicado recebe +50 ou 0?
   o indicante respeita o limite de 10/mês? (crédito no registo de carteira grátis = vector de farming).
4. **Missão.** C2/C3 propõem endpoint público `/completar-missao` chamado após o lance: o cliente poderia reclamar a
   missão sem lance. **Proposta:** crédito do lado do servidor dentro do `lance-relampago` (só Flash/MLC, após lance
   persistido, fail-soft), sem endpoint público de escrita. (C2 também tem gralha: «NULL ou < 24h → creditar».)
5. **Frente D** (opcional) — fazer agora ou adiar para 110f-front.

## Veredito
**AJUSTAR** — perguntados os conflitos 1-5 ao operador antes do SEG0.

## Decisões do operador (R18, 2026-10-13) — respostas aos conflitos
- **R18-110f-A (conflitos 1+2):** dia de calendário **UTC-4 (Manaus) para login E missão** + `ref` diária no ledger;
  **SEM migração** (o estado «hoje feito» lê-se do `historico_lance`).
- **R18-110f-B (conflito 3):** **+50 ao indicante e +50 ao indicado**, DENTRO do `usar-codigo` existente, só no ramo
  que passa o throttle de IP; o indicante respeita o limite de **10/mês**. Sem endpoint `/indicar` nem tabela nova.
- **R18-110f-C (conflito 4):** missão creditada **pelo servidor dentro do `lance-relampago`** (só Flash/MLC, depois do
  lance persistido, fail-soft); **sem** endpoint público `/completar-missao`.
- **R18-110f-D (conflito 5):** **Frente D adiada** para UTAC próprio (110f-front).

**Veredito final do SEG-1: SEGUIR** com o escopo ajustado acima.
