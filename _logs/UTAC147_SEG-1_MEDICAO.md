# UTAC147 — SEG-1 MEDIÇÃO (2026-11-21, Opus 5.5)

Spec: `_logs/UTAC147.spec.yml`. Nada foi alterado neste segmento (só leitura e um SELECT em produção).

## -1.1 Estado do repo
- HEAD `9108312` (= baseline). `git log origin/main..HEAD` mostra **2 commits do UTAC146 por publicar**: `dbf3df3` (nome lido do identity token do Privy + toast «usou 1 Passe») e `9108312` (AAB v12.1). O UTAC146 estava «local até ao AUTORIZO».
- Working tree: há ficheiros alheios modificados (`.agents/skills/*`, `.gitignore`, `.mcp.json`, `desafio-gut/frontend/package-lock.json`) e muitos `??` em `_logs/`. Não são deste UTAC e não se tocam.

## -1.2 Caminhos nomeados
Existem: `_lib/fontes-lance.mjs` (293 l.), `lance-relampago.mjs` (472 l.), `registar-palpite.mjs` (105 l.), `login-diario.mjs`, `_lib/passes-inventario.mjs` (`consumirPasse`/`devolverPasse`), `docs/REGULAMENTO-v6.1.md`, `src/i18n/pt.js`, `src/components/edicao-especial/CardEdicaoEspecial.jsx`.

## -1.3 / -1.4 Medições
1. **Fontes de pontos de lance.** Login +5 (`creditarLoginDiario`, chamado por `login-diario.mjs`/`auth-user.mjs`). Missão +10 (`creditarMissaoLance`, chamada no lance). Sequência +50 (`_lib/pontuacao-store.mjs:212`). Indicação +50 de pontos de lance + ECOQUILDO +2/+1. Também existem a boas-vindas +50 (`creditarBoasVindas`, `auth-user.mjs`) e o bónus do Passe Relâmpago (+100 pontos de lance por Passe, UTAC138). Nenhum dos dois é citado no enunciado.
2. **Lance hoje** (`lance-relampago.mjs` §7): gasta **pontos de lance pelo valor do lance**. Na especial, quem tem Passe gasta também 1 Passe a cada 3 lances (RPC `registar_lance_passe`, UTAC145). O UTAC120 já tinha posto `consumirPasse` no lance e o UTAC129 retirou-o.
3. **Palpite hoje**: gratuito (UTAC136). Antes consumia 1 Passe Programado (UTAC120), com devolução quando falhava ou era idempotente.
4. **⛔ A compra PIX/saldo NÃO credita o inventário de Passes.** `comprar-passe-tipado.mjs` (PWA) credita pontos de fidelidade e ECOQUILDO, e nunca chama `passes_creditar`. O inventário só recebe Passes por: `validar-compra-google.mjs` (Play Billing) e pela conversão de 50 ECOQUILDO. **Em produção** (SELECT em `passes_inventario`): **3 linhas · 2 Passes Relâmpago no total (1 pessoa) · 9 Programados**.
   ⇒ Se o lance e o palpite exigirem Passe do inventário, **no site ninguém consegue licitar nem palpitar depois de comprar por PIX**.
5. Quantidades aceites na compra: `QUANTIDADES_PASSE = [1, 3, 5, 10]`. O enunciado diz 1, 3 ou 5.
6. Regulamento v6.1, Art. 18: «O prêmio correspondente, consistente em produto fornecido pelo patrocinador, é concedido…». O gate legal está na versão 3.5 (v6.1) e o GUTO tem uma cópia byte a byte (`GUTO-REGULAMENTO.md` + `guto-regulamento.mjs`).
7. Faixa da especial: `CartaoEdicao` mostra sempre `produto` (nome) + `tempo`. O texto «A apuração será em:» já existe.
8. Deploy: `netlify deploy --prod --build` publica o **working tree**, incluindo o UTAC146 por publicar. Um push para main também dispara build no Netlify (memória do UTAC142).

## -1.5 Disco / RAM
- Disco: 17 GB livres (≥ 5 GB, OK).
- **RAM livre: 598 MB** (< 1 500 MB). A A14 impede correr a suíte agora.

## R18 já registadas
- **R18-147-A** (operador, 2026-11-21): «não mude a parte do play billing». `validar-compra-google.mjs` e `creditarPasseGoogle` ficam intactos.

## ⚠️ Conflitos entre o enunciado e o medido (AU3, não resolvidos pelo executor)
1. **Compra PIX não credita o inventário** (§4). Sem corrigir isto, o lance e o palpite pagos por Passe ficam bloqueados no site. Corrigir mexe no fluxo de compra PIX (idempotência por `ref`, ST5) sem tocar no Play.
2. **O que acontece aos pontos de lance**: os saldos existentes, a indicação (que credita pontos de lance que deixam de servir para alguma coisa), a boas-vindas +50 e o bónus +100 do Passe Relâmpago.
3. **Quantidade 10**: retirar para ficar só 1/3/5?
4. **Especial**: «1 Passe a cada 3 lances» (UTAC142.1/145) passa a 1 Passe por lance?
5. **Deploy leva o UTAC146** (2 commits por publicar). Precisa de OK.
6. **RAM 598 MB** < 1 500 MB: a suíte não corre sem libertar RAM ou sem excepção explícita à A14.
7. Regulamento: criar o **v6.2** (gate 3.6 + cópia do GUTO) ou editar o v6.1 no sítio? O v6.1 continua a descrever pontos de lance (Arts. 6º/16º); o enunciado só pede o Art. 18.

## -1.7 Veredito
**AJUSTAR.** O conflito 1 é bloqueante: a feature não funcionaria no site. Os conflitos 2, 5 e 6 decidem o âmbito e o deploy. Parar e perguntar ao operador antes do SEG0.
