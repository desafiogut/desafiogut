# UTAC110h.1 — SEG4 Validador adversarial independente

Commit sob validação: 703e78e (baseline ec2028d). Worktree próprio: C:/Users/Moltbot/tmp-110h1-val/wt (helper A13, 4 junctions).
Estado: CONCLUÍDO. Worktree removido pelo helper (4 junctions rmdir antes; node_modules reais intactos: frontend 498 · functions 414).
RAM livre: 964 MB no arranque, 1276 MB antes da suíte (< 1500 ⇒ uma suíte vermelha seria NAO_MEDI).

## a) v4 no gate — NÃO REFUTADO
Código (TermosConsentimento.jsx, sem comentários) sem «senha», «torneio», PIX, agência, Art. 7/20/26/29, «5 de outubro».
Vigência «2 de novembro de 2026» = v5 Art. 4º. Teste de render (utac110h1-gate-render) confirma no HTML SSR.
ℹ️ O gate liga para /privacidade, que ainda diz «produtos/senhas» (Privacidade.jsx:78), «compras de senhas» (:99),
«saldo de senhas» (:108) e «funcionamento do torneio» (:126). Fora do gate, mas é a página que o gate manda ler.

## b) Literalidade dos 12 blocos — NÃO REFUTADO
Conferido à mão cada bloco contra docs/REGULAMENTO-v5.md: Arts. 1,2,5,6,8,9,14,27,47,49,65,66 — todos prefixos/trechos
literais com o número de artigo correcto (Art. 1 truncado antes de «, no âmbito do projeto…» e terminado com «.»; Arts. 5/8/9/49
truncados na 1.ª frase). Nenhum texto jurídico inventado nos blocos.
ℹ️ Caixa de contacto: «(92) 98428-5774» e «www.grupouniaoetrabalho.com.br» não estão no v5; o v5 Art. 69º diz «exclusivamente
através do e-mail». Não é bloco de artigo; sem guarda (mutante X11 sobrevive).
ℹ️ Textos das 4 caixas (não são blocos literais): «capacidade civil plena» não é texto do v5; números das caixas sem guarda literal (X1 sobrevive).

## c) 4 caixas / versão — NÃO REFUTADO
tudoAceito = 4 && ; handleAceitar guarda; aceitos {lido,maiores,termos,privacidade}; VERSAO_CONSENTIMENTO "3.0" == VERSAO_GATE "3.0";
backend DECLARACOES_GATE inalterado. Teste de render bidireccional (3 de 4 ⇒ desligado e nada gravado). Mutantes M3/M4/M5 mordem.

## d) /regras-oficiais pública — NÃO REFUTADO (ℹ️)
Boot: rotaPublica = includes(pathname) EXACTO; navegar para outra rota volta a mostrar o gate (mesmo padrão de /privacidade).
ℹ️ Diferença: /regras-oficiais está DENTRO do AppLayout (App.jsx:390), não standalone como /privacidade/excluir-conta ⇒ sem
consentimento carrega o shell completo (Privy, header, nav, chatbot). Qualquer clique de navegação devolve o gate.
ℹ️ Gap pré-existente: nenhum teste comportamental do Boot — mutante X7 («todas as rotas públicas» = gate contornado) sobrevive
a toda a suíte relevante; a única guarda é um regex sobre ROTAS_PUBLICAS.

## e) GUTO / «senha» por indicação — NÃO REFUTADO no escopo; ⚠️ resíduo fora do escopo
guto-perfis.mjs indique_e_ganhe: 4 perfis sem «senha», +50 pontos de lance, limite 10 = PONTOS_INDICACAO/LIMITE_INDICACOES_MES
(_lib/fontes-lance.mjs:23-24). Coerente com R18-110h.1-C.
⚠️ Fora do escopo autorizado mas NÃO declarado nas pendências: o app continua a prometer «+1 senha» por indicação noutros sítios
visíveis, contradizendo o GUTO na mesma sessão:
 - src/components/PainelIndicacao.jsx:87 (texto de partilha) e :163 («1º lance, vocês dois ganham +1 senha!») — renderizado na Carteira (MinhaCarteira.jsx:597);
 - src/components/ChatbotWidget.jsx:183 stat «Senhas ganhas» no cartão de indicação mostrado no próprio chat do GUTO;
 - netlify/functions/_lib/referral.mjs:146/148 notificação «+1 senha creditada!» (mensagemInducao, servida por notificacoes.mjs:207/222).
ℹ️ Testes do GUTO: «+50 para o indicado» (corporativo) e «até 10 por mês» (admin) sem guarda (X9, X10 sobrevivem).

## f) Vocabulário antigo — NÃO REFUTADO
«torneio de habilidade»/«pontos de compra»: só em comentários (MeusAtivos.jsx:178, MinhaCarteira.jsx:429).
ℹ️ «torneio» isolado ainda visível: Privacidade.jsx:126 «funcionamento do torneio» (era a linha :125 que o enunciado apontava — o
executor tratou a :77 por conter a expressão completa e deixou a :125/:126), pt.js:100 «regra do torneio» (Meus Ativos).

## g) Testes reescritos — NÃO REFUTADO
citacoesRegulamento: passou de palavras-chave a «trecho literal» + bidireccional + vigência + links + rota (mais forte).
dadosPagamento: PIX/agência v4 → ausência de dados bancários + contacto Art. 69 (invariante mantida).
artigosUI: gate excluído do mapa v4 e julgado por EXIGIDO_V5 (palavras-chave fracas: "18","10","50"), mas literalidade coberta por citacoesRegulamento.
mc9951/106b/106c: âncora v4 → v5 Art. 14º (mesma força). glossario/106g: troca de termo (mesma força).
mc104 backend: "2.0" → lib.VERSAO_GATE (literal "3.0" fixado no teste novo de vocabulário). Sem asserções vácuas encontradas.
ℹ️ Removido o check «e-mail institucional contato@grupouniaoetrabalho.com.br» (não existe no v5 — remoção legítima).

## h) Mutação — script do executor 16/16 reproduzido; mutantes próprios 7/12 mordem
Script do executor (no worktree): 16/16 MORDERAM, 0 âncoras.
Mutantes próprios (scratchpad/mut-seg4.mjs, restauro byte-a-byte confirmado, git status limpo):
| # | mutante | resultado |
|---|---|---|
| X1 | caixa «termos»: 10 → 20 pontos (Art. 8º) | SOBREVIVEU |
| X2 | bloco inventado com rótulo sem «º» (Art. 50) | MORDEU (artigosUI) |
| X3 | rótulo Art. 47º → 48º | MORDEU |
| X4 | Art. 5º truncado sem «maiores de 18» | MORDEU (artigosUI) |
| X5 | R$ 2,00 → R$ 3,00 no bloco Art. 6º | MORDEU |
| X6 | caixa privacidade cita Art. 29 (v4) | MORDEU (artigosUI) |
| X7 | Boot: todas as rotas públicas (gate contornado) | SOBREVIVEU |
| X8 | GUTO admin volta a «senhas» | MORDEU |
| X9 | GUTO corporativo +50 → +5 para o indicado | SOBREVIVEU |
| X10 | GUTO admin limite 10 → 20 | SOBREVIVEU |
| X11 | telefone do contacto trocado | SOBREVIVEU |
| X12 | caixa «maiores» 18 → 16 anos | MORDEU (mc9951) |

## i) Escopo — NÃO REFUTADO
Diff toca só: TermosConsentimento, guto-perfis, Privacidade, pt.js, PainelTorneio, useResgatarCartao, resgatar-cartao,
_lib/consentimento (1 linha), Boot (1 linha), testes, script de mutação, logs, PNG. Proibidos (REGULAMENTO-v5, GUTO-REGULAMENTO,
regras-oficiais.md, RegrasOficiais.jsx, contratos, env, EM_BREVE_MODE) intactos.
ℹ️ scripts/utac110h1-prova-mutacao.mjs não está na lista AUTORIZA listada (ferramenta de teste; padrão da série).

## j) Capturas — CONFIRMADO
_logs/utac110h.1-browser/: gate-375.png, gate-375-aberto.png, gate-1280.png, gate-1280-aberto.png (vistas: v5, vigência 2/11, 4 caixas).

## k) Suíte — REPRODUZIDA
`node scripts/mc966-suite-harness.mjs ambos < /dev/null` no worktree (foreground): frontend VERDE 1076/1076 · backend VERDE 1231/1237
· VEREDITO VERDE. RAM livre 1267 → 1251 MB (abaixo do limiar A14 de 1500, mas o resultado é verde e igual ao declarado, logo
não há suíte vermelha a classificar como NAO_MEDI).

## Veredicto: APROVADO COM RESSALVAS — 0 bloqueantes

Nenhuma alegação central refutada: o gate não diz «senha»/«torneio»/datas/PIX do v4 (código e HTML), os 12 blocos são texto literal
do v5 com o artigo certo, as 4 caixas funcionam e a versão 3.0 é igual nos dois lados, a rota pública não contorna o gate,
o GUTO diz o que o código credita, o vocabulário antigo pedido saiu do texto visível, os testes reescritos mantêm as invariantes,
16/16 do executor reproduzido, escopo respeitado, capturas existem, suíte reproduzida ao número.

### ⚠️ (grave, fora do escopo autorizado mas não declarado nas pendências)
W1. O app continua a prometer «+1 senha» por indicação noutras superfícies visíveis — contradiz a resposta nova do GUTO:
 - desafio-gut/frontend/src/components/PainelIndicacao.jsx:87 e :163 (Carteira → MinhaCarteira.jsx:597);
 - desafio-gut/frontend/src/components/ChatbotWidget.jsx:183 («Senhas ganhas» no cartão de indicação do próprio chat);
 - desafio-gut/frontend/netlify/functions/_lib/referral.mjs:146/148 (notificação «+1 senha creditada!» via notificacoes.mjs).
 Reprodução: `grep -n "senha" src/components/PainelIndicacao.jsx src/components/ChatbotWidget.jsx netlify/functions/_lib/referral.mjs`.
 Recomendação: UTAC próprio (o mesmo R18-110h.1-C aplicado à UI e à notificação).

### ℹ️ (notas)
N1. Sem teste comportamental do Boot: mutante X7 (`rotaPublica = ROTAS_PUBLICAS.length > 0`, gate contornado para todas as rotas)
    sobrevive. Pré-existente, mas a linha vizinha foi tocada.
N2. Números das caixas e do GUTO sem guarda: X1 (10→20 pontos na caixa «termos»), X9 (+5 para o indicado), X10 (admin «até 20»).
N3. Contacto do gate com telefone e site que o v5 não tem (Art. 69º diz «exclusivamente» e-mail); X11 sobrevive.
N4. /privacidade (ligada pelo gate) mantém «senhas» (:78, :99, :108) e «funcionamento do torneio» (:126 — a linha que o enunciado
    apontava como :125); pt.js:100 «regra do torneio».
N5. /regras-oficiais está dentro do AppLayout: sem consentimento carrega o shell completo (Privy, nav, chat); navegar devolve o gate.
N6. Caixa «maiores» acrescenta «capacidade civil plena», que não está no v5 (não é bloco de artigo).
N7. scripts/utac110h1-prova-mutacao.mjs fora da lista AUTORIZA literal (padrão da série; ferramenta de teste).

Instrumentos: scratchpad mut-seg4.mjs (12 mutantes; restauro byte-a-byte; `git status` limpo após a corrida).
