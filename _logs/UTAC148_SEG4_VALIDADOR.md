# UTAC148 — SEG4 VALIDADOR ADVERSARIAL (2026-11-21, Opus 5.5)

Commit validado: `316d190` (base `41de5d6`). Worktree próprio: `C:/Users/Moltbot/tmp-utac148-val/wt`. Fica lá, destacado, com 1 commit meu. As junctions de node_modules já foram removidas com `rmdir` sem `/s` e o node_modules real continua intacto.

## Veredicto: **APROVADO COM RESSALVAS**

O que foi pedido explicitamente está feito e confere:
- v7 só nos 7 artigos;
- gate 3.6, com 3.4 e 3.5 em legado;
- GUTO byte a byte;
- 50 ECOQUILDO idempotentes e com lastro;
- vc 14 / 1.3.0;
- Play Billing intocado.

Não encontrei pagamento a dobrar nem emissão silenciosa de ECOQUILDO sem lastro depois da minha correcção. Fica por resolver o resto do modelo de pontos fora dos ficheiros do diff. Esse resto contradiz o v7 em ecrãs vivos (a Carteira, o cartão do lance e o GUTO) e no backend da indicação.

## O que confirmei (com evidência)
- **v7 contra v6.1**: um `diff` mostra que só mudam o título e os Arts. 3º, 5º, 6º, 7º, 12, 15 e 18.
- **GUTO**:
  - `REGULAMENTO_TEXTO === docs/GUTO-REGULAMENTO.md` dá true;
  - o corpo do md é igual a `docs/REGULAMENTO-v7.md` (true, sem CR);
  - as 16 âncoras `ARTIGOS_V4` são todas substring verbatim do v7 (script próprio, 0 falhas);
  - a prosa do «MODELO DE HOJE» já não diz que o palpite não exige Passe nem que o lance gasta pontos.
- **Gate**:
  - os 13 artigos do resumo em `TermosConsentimento.jsx` batem verbatim com as linhas do v7 (script próprio, 0 diferenças);
  - `VERSAO_CONSENTIMENTO` = `VERSAO_GATE` = "3.6";
  - o servidor (`consentimento.mjs:39`) aceita 3.6, 3.4 e 3.5 e recusa o resto. A mutação V1 retira o 3.4 e é morta por `mc104`.
- **1 Passe = 1 acção**: `registar-palpite.mjs:85` consome um Passe Programado (`consumirPasse`) e `lance-relampago.mjs` devolve `sem_passes_disponiveis`.
- **Play Billing**: o diff tem 0 ocorrências de `validar-compra-google`/`creditarPasseGoogle`, e `comprar-passe-tipado.mjs` não foi tocado.
- **`VERSAO_REGULAMENTO`**: o único consumidor é o teste `utac106h` (passa). Nada mais o lê, por isso a regex nova não partiu ninguém.
- **Testes dirigidos** (todos verdes):

| Grupo | Ficheiros |
|---|---|
| Backend | `palpite` 25/25 (com os meus 3), `mc104` 10, `mc963` 10, `utac137-seg3` 3, `utac110e` 24, `utac110n` 30 |
| Frontend | os 12 ficheiros de teste alterados pelo diff (`MeusAtivos` 20, mais 14 em skip) |

  Os 10 skips do `utac110n` já existiam na base (10 → 10).

## Achados ⚠️

**⚠️1 — ECOQUILDO sem lastro em silêncio (CORRIGIDO no meu worktree, `604c31e`)**
- Em `apurarPalpite`, se o lastro falhasse e a reversão do ECOQUILDO também falhasse, a reversão era engolida por `.catch(() => {})`, sem alerta. Os irmãos `comprar-passe-tipado.mjs:151` e `creditar-eco-quildo.mjs` alertam.
- Os 50 ECOQUILDO ficavam emitidos sem lastro. Um retry vê `criado:false` e **nunca** regista o lastro (Art. 21 violado, sem ninguém saber).
- No `desfazerCredito`, uma reversão falhada também era silenciosa.
- Correcção: `alertarReversaoEcoFalhou` (import preguiçoso de `sentry-server.mjs`, fail-soft) nos dois caminhos, mais `ecoDesfeito` no retorno.
- Residual, por desenho: o retry continua sem registar o lastro em falta, como em `garantirEcoDoPasse`. Fechar isto exige um marcador de lastro por ref, que deve ser um UTAC próprio.

**⚠️2 — Indicação ainda emite 50 pontos de lance, e a Carteira e o GUTO anunciam-nos (contradiz o v7)**
- `_lib/fontes-lance.mjs:259,264` (`creditarIndicacao`) credita `PONTOS_INDICACAO = 50` pontos de lance ao indicante e ao indicado.
- O v7 e o próprio prompt do GUTO dizem «NÃO existem pontos de lance». O Art. 24 só fala de 2 e 1 ECOQUILDO.
- Na Carteira (`MinhaCarteira.jsx:714` → `PainelIndicacao.jsx:103,179,243`), o painel diz «+50 pontos de lance e +2 ECOQUILDO».
- A frase também aparece em:
  - `ChatbotWidget.jsx:191`;
  - nas respostas fixas do GUTO `indique_e_ganhe` (`guto-perfis.mjs:463-466`).
- A frente C dizia «Carteira sem Pontos de Lance», e o UTAC148 não tocou em `MinhaCarteira.jsx` nem no `PainelIndicacao`.
- Não corrigi: os textos estão amarrados por teste à constante do backend (`utac110h2-*`). A correcção certa é o operador decidir retirar os pontos da indicação no backend e depois limpar os textos.

**⚠️3 — «Lance em pontos» continua nos ecrãs vivos (contradiz o Art. 12 do v7, «expresso em reais»)**
- `CartaoEdicao.jsx:25`: «Seu lance (em pontos)» no layout oficial do Relâmpago (Início/MLC).
- `guto-perfis.mjs:270`, `BOAS_VINDAS_PADRAO`: «Dê o seu menor lance único em pontos».
- O v7 retirou «1 ponto equivale a R$ 0,01», por isso «pontos» deixou de ter definição no Regulamento. O input continua a ser em centavos (`CardLance.jsx:223-225`).
- Também `OfertasProgramadas.jsx` («Você ainda não tem pontos. Compre o seu primeiro Passe…») e as mensagens de `lib/pontosLance.js:197,201` («login diário», «missão do dia»), se esse ramo ainda for alcançável.

**⚠️4 — O v7 contradiz-se a si próprio (Art. 19/20 contra os Arts. 5º/6º/18) — risco jurídico, não de código**
- Pelos Arts. 5º e 6º, o Passe (R$ 2,00) é consumido por cada palpite.
- O Art. 19 diz que o perdedor «não perde os valores investidos em passes». Com o v7, perde o Passe consumido.
- O Art. 20 («afasta qualquer caracterização como aposta») apoia-se nisso. Com «pago R$ 2,00 → ganho 50 ECOQUILDO (R$ 25,00) se acertar», a estrutura parece-se com um prognóstico pago e premiado.
- Os Arts. 19 e 20 não estavam na lista de mudança. Recomendo revisão jurídica antes do registo no RTD.

**⚠️5 — Art. 10 (30 dias de aviso prévio) — classificação: risco jurídico, decisão do operador**
- O Art. 10 do v6.1, ainda em vigor, exige 30 dias de aviso prévio na interface para alterar as regras de pontuação.
- O v7 (e já o UTAC147, em produção desde 21/11) retira os pontos de lance gratuitos e torna a participação paga. Não há aviso prévio: o gate 3.6 força o reaceite imediato.
- Há precedente no projecto: o UTAC110m.2 tratou o aviso prévio como obrigatório.

## Achados ℹ️
- ℹ️1 — **Art. 25 «exclusivamente Google Billing» contra o PIX do site**: já existia no v6.1 e não foi pedido. Com o v7 o Passe passa a ser obrigatório para participar, por isso a venda por PIX no site contradiz o Art. 25 de forma mais material. Classificação: fora de escopo, para um UTAC próprio.
- ℹ️2 — **Aceite 3.5 vindo do site**: o servidor aceita-o de qualquer origem. Não é problema:
  - o cliente web compara com a sua própria constante (3.6), por isso um utilizador legítimo do site reaceita (`Boot.jsx:35`, `lib/consentimento.js:17`);
  - um POST forjado com 3.5 fica registado como 3.5, que é a versão que a pessoa declarou;
  - nenhum endpoint de acção exige a versão vigente.
  Retirar 3.4 e 3.5 quando o v13 estiver aprovado (DEBT-092).
- ℹ️3 — **O código faz coisas que o v7 não prevê** (já existiam antes, não são do UTAC148):
  - +2 pontos de fidelidade ao vencedor do palpite (`PONTOS_POR_PALPITE_CERTO`);
  - +1 ECOQUILDO por Passe comprado (`ECOQUILDO_POR_PASSE`).
  O v7 só atribui ao Passe 1 ponto de fidelidade (Art. 7º).
- ℹ️4 — **O motivo `palpite-certo` entrou em `MOTIVOS_EMISSAO`**, a única lista fechada de motivos de emissão. O `ledger-lance.mjs:50` é outra lista (pontos de lance) e não precisa dele.
  - Efeito lateral: o endpoint de admin `creditar-eco-quildo.mjs` passa a aceitar `motivo=palpite-certo` (ref própria `refCreditoAdmin`, sem colisão), e o comentário dele (linha 17) ficou desactualizado.
  - O `palpite.test` simula o `eco-quildo.mjs`. A mutação V2 (tirar o motivo da lista) sobrevive no palpite e só é morta por `utac110e`, que fixa a lista.
- ℹ️5 — **Corrida entre 2 apurações**: medida no meu teste novo. Paga uma única vez (ECOQUILDO 1×, lastro 50, pontos 2). Resta um caso teórico de subpagamento: se a marcação de uma apuração falhar enquanto a outra a conclui, a falhada desfaz o ECOQUILDO de uma edição já marcada, e o vencedor fica por pagar sem retry possível. É a mesma doutrina dos +2 pontos (UTAC106g) e o endpoint é de admin.
- ℹ️6 — **Os 14 `test.skip` [UTAC148] em `MeusAtivos.test.mjs` medem painéis removidos**, por isso não escondem regressão dos painéis. Perdeu-se cobertura lateral:
  - a asserção «o erro do feedback não contamina o ranking» (no skip da l.341);
  - o laço `for (const secao of [])` vazio no teste da JANELA DO TOKEN (l.524), que agora é vácuo.
  Recomendo apagar os testes mortos e reescrever estas duas asserções para `feedback-lance`.
- ℹ️7 — **Conversão em Passe**: corre só quando `eco.criado`, depois da marcação, com `converterEcoEmPassesSeguro` (try/catch e alerta). É fail-soft. O meu teste confirma que não converte numa apuração falhada.

## Mutações próprias (cópia fora do repo, na pasta de rascunho `bak/`; restauro com md5 IDÊNTICO em todas)

| # | Mutação | Resultado |
|---|---|---|
| V1 | `VERSOES_GATE_LEGADO` sem «3.4» | morta (`mc104` 1 fail) |
| V2 | `palpite-certo` fora de `MOTIVOS_EMISSAO` | morta por `utac110e` (1 fail); **sobrevive** no `palpite` (simulação) |
| V3 | ref do ECOQUILDO não idempotente (`+Math.random()`) | morta (`palpite` 2 fail) |
| V4b | `desfazerCredito` deixa de reverter o ECOQUILDO | **sobreviveu à suíte do UTAC148**; morta pelo meu teste novo (1 fail) |
| V5 | sem o alerta da reversão falhada (= código original) | morta pelo meu teste novo (1 fail) |

## Os meus commits (só no worktree, sem push)
- `604c31e` — fix(UTAC148-val): alerta quando a reversão do ECOQUILDO do vencedor do palpite falha, mais testes de corrida e de marcação falhada (`_lib/passe-pontos.mjs`, `_tests/palpite.test.mjs`; 25/25).

## O que NÃO verifiquei
- O conteúdo do PDF `Desktop/REGULAMENTO-DesafioGUT-v7.pdf` (sem pypdf nesta máquina) nem o QR.
- A suíte completa (RAM curta): só os ficheiros dirigidos.
- O build Android / AAB, produção, Supabase e Netlify.
- O `apurarPalpite` contra o `eco-quildo.mjs` REAL: o teste simula-o. A integração motivo↔lista só está coberta por `utac110e`.
- Se o ramo «sem pontos de lance» de `lib/pontosLance.js` / `CardLance` ainda é alcançável com `MOSTRAR_PONTOS_ENGAJAMENTO=false`.
