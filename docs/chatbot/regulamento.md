# Regulamento DESAFIOGUT — Base de Conhecimento para IA Cognitiva

> Documento de referência consolidado para o chatbot RAG (Mega Comando 9).
> Compilado a partir de `DESAFIOGUT-MASTER.md` e `ESPECIFICACAO-TECNICA-DEFINITIVA.md`.
> Use linguagem direta e factual — o LLM responde **apenas** com base neste conteúdo.

---

## 1. O que é o DESAFIOGUT

O DESAFIOGUT é uma plataforma híbrida operada pelo Grupo União e Trabalho (CNPJ 23.040.066/0001-00, Manaus/AM). Combina publicidade rotativa por cotas (banners no site e no app) com leilões pelo critério "Menor Lance Único" (Artigo VIII do regulamento). Vence o participante que registrar o menor valor que aparece exatamente uma vez entre todos os lances da rodada. Cada lance custa de R$ 0,01 até R$ 9.999,99 e é tokenizado por uma senha de R$ 2,00 (Artigo 20).

Endereço do contrato em produção (Ethereum Sepolia testnet): `0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5`. Edição ativa: `R-1`. Deploy em produção: https://silly-stardust-ca71bc.netlify.app.

## 2. Regras de Leilão

### 2.1 Critério de vitória (Artigo VIII)

Vence o **menor valor monetário** que aparece **exatamente 1 vez** na lista de lances da rodada. Lances repetidos (mesmo valor enviado por duas ou mais pessoas) são marcados como `repetido: true` e ficam fora do cálculo do vencedor. O sistema apura o vencedor automaticamente ao final do prazo via `apurarVencedor(idEdicao)` no contrato.

### 2.2 Valores permitidos (Artigo XXIII)

- **Lance mínimo:** R$ 0,01 (1 centavo).
- **Lance máximo:** R$ 9.999,99 (999.999 centavos).
- Valores inteiros em centavos. Casas decimais inválidas são rejeitadas no frontend (sanitização) e no contrato.

### 2.3 Modalidades

| Modalidade | Tier | Duração | Onde roda | Custo por lance |
|---|---|---|---|---|
| **Relâmpago (Flash)** | Bronze, Prata | 30 minutos a 1 hora (configurável) | Off-chain (Netlify Blob `lances-relampago:{idEdicao}`) | R$ 0,02 (debita saldo R$ off-chain) |
| **Programado** | Ouro, Diamante | 24 horas, reset automático às 00:00 | On-chain (contrato `LeilaoGUT`) | 1 senha (R$ 2,00) consumida on-chain |

### 2.4 Liberação de senhas (Artigos XVII e XXI)

A coordenação é a única autorizada a chamar `adicionarSenhas(endereco, qtd)` no contrato. Após confirmação do pagamento (PIX/Mercado Pago) ou aplicação de Voucher/Bônus, o saldo de senhas é creditado on-chain. O usuário enxerga o saldo em tempo real via listener `SenhasCreditadas` no frontend.

### 2.5 Hash off-chain e assinatura (anti-fraude)

Cada lance gera um hash **Argon2id** off-chain (via `hash-wasm`) como prova de intenção imutável. Antes da transação on-chain, o usuário assina a mensagem `DESAFIOGUT-AUTH:{ts}:{endereco}` no padrão EIP-191 (popup da Privy Embedded Wallet). O hash e a assinatura entram no JWT `lance-auth` que autoriza o backend a chamar `darLance` na coordenação.

### 2.6 Rate limit e cooldown

Limite de 5 lances por minuto por carteira e cooldown de 3 segundos entre lances consecutivos (token bucket client-side em `utils/rateLimiter.js`). Limite complementar server-side: 5 lances/minuto por IP em `/comprar-senhas`.

## 3. Cotas Comerciais

| Categoria | Cotas | Exclusividade | Valor Contrato | Valor Mín. Produto | Banner Vitrine | Banners App | Bônus |
|---|---|---|---|---|---|---|---|
| **Bronze** | 27 | Não | R$ 2.640,00 | R$ 660,00 | 1 banner vitrine | 8 banners | — |
| **Prata** | 81 | Sim | R$ 5.600,00 | R$ 1.350,00 | 1 banner fixo | 12 banners | — |
| **Ouro** | 1 | Sim | R$ 11.000,00 | R$ 2.250,00 | 2 banners rotativos | 20 banners | — |
| **Diamante** | 1 | Sim | R$ 18.000,00 | R$ 4.500,00 | 2 banners rotativos | 28 banners | 10 vouchers de networking |

### 3.1 Vale-Crédito Automático (REQ-17, Artigo §4)

Se o valor do produto cadastrado pelo cliente é menor que o valor mínimo da categoria, a diferença é creditada automaticamente na Wallet Digital com origem `cotas-vale-credito-automatico`. Fórmula:

```
diferenca = Valor_Min_Cota - Valor_Produto
if (diferenca > 0): wallet:{cliente_id} += diferenca em centavos
```

Esse crédito **não** é resgatável em dinheiro — abate renovações futuras de adesão ou solicitações de arte premium dentro do ecossistema.

### 3.2 Visibilidade na Vitrine

- **Desktop:** grid com 4 slots simultâneos (Diamante / Ouro / Prata / Bronze).
- **Mobile (<768px):** Diamante e Ouro ficam sticky no topo; Prata e Bronze rodam em carrossel horizontal.
- **Domingos:** Bronze e Ouro ficam ocultos automaticamente — só Prata e Diamante aparecem (REQ-29).

## 4. Pagamentos

### 4.1 Taxa de Adesão (Consultoria)

- Pagamento via **PIX direto** para `familiaquildo@gmail.com` (Banco do Brasil).
- Aprovação manual pelo Admin no painel `/admin`.
- Validade: 30 dias. Renovação avisada com 7 dias de antecedência.
- Valores: R$ 660 (Bronze) até R$ 18.000 (Diamante), conforme tabela de cotas.

### 4.2 Compra de Senhas (Fichas)

- Pagamento via **Mercado Pago** (PIX automatizado).
- Conta destino: `desafiogut@gmail.com`.
- Custo por senha: **R$ 2,00** (Artigo 20).
- Quantidade por pedido: 1 a 100 senhas.
- Fluxo: usuário gera pedido → paga PIX → webhook do Mercado Pago confirma → coordenação chama `adicionarSenhas` on-chain.

### 4.3 Lance Relâmpago

- Debita diretamente o saldo R$ off-chain (Blob `saldo-rs:{endereco}`).
- Custo: o próprio valor do lance (em centavos).
- Sem gas — operação interna ao Netlify.

### 4.4 Wallet Digital (Vale-Crédito)

- Saldo em BRL persistido em Blob `wallet:{cliente_id}`.
- Mutações **apenas pelo Admin** (`x-admin-token` ou JWT admin) ou via fluxos automáticos (REQ-17, REQ-23).
- Histórico de transações limitado às últimas 50 entradas.

## 5. Vouchers de Networking (Bônus Diamante)

### 5.1 Geração

Cada cliente Diamante recebe 10 códigos únicos no formato `GUT-XXXXXXXX` (8 caracteres hexadecimais maiúsculos), gerados via `POST /voucher` com `acao=gerar` (admin-only).

### 5.2 Resgate (REQ-26)

O indicado usa o código no fluxo de compra de fichas (`POST /comprar-senhas` com campo `voucherCodigo`). Efeito: **isenção total** da taxa de compra de fichas na primeira participação Bronze/Prata. O valor cobrado vira R$ 0,00 (subsidiado pelo emissor).

### 5.3 Restrições

- Cada código só pode ser resgatado **uma vez**.
- O emissor **não pode resgatar o próprio voucher**.
- Resgate só é marcado como consumido **após** sucesso on-chain da compra.
- Em caso de falha on-chain, o voucher permanece ativo para nova tentativa.

## 6. Sistema "Indique e Ganhe" (Mega Comando 10)

### 6.1 Como funciona

Todo usuário recebe automaticamente um código pessoal no formato `IND-XXXXXX` (6 caracteres alfanuméricos). Compartilhe o código com amigos. A cada amigo que comprar uma senha usando seu código, você ganha **+1 senha bônus** creditada on-chain pela coordenação.

### 6.2 Limites

- Máximo de **10 indicações convertidas por mês** por indicador.
- Apenas a **primeira compra** de cada indicado conta como conversão.

### 6.3 Anti-fraude

- Não se pode indicar a si mesmo (mesmo endereço).
- Não se pode usar um código já vinculado ao mesmo dispositivo (FingerprintJS).
- Padrão Sybil (3+ endereços no mesmo dispositivo em 24h) é rejeitado.

## 7. Segurança e Conformidade

### 7.1 Autenticação

- **Privy Embedded Wallets:** login via Google, E-mail ou Apple. Sem extensão, sem QR code, sem seed phrase.
- A carteira Ethereum (Sepolia) é criada automaticamente no primeiro login.
- Endereço da coordenação: `0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E` (admin automático).

### 7.2 LGPD (Lei Geral de Proteção de Dados)

- Gate de consentimento obrigatório (`TermosConsentimento.jsx`) antes de qualquer interação.
- Versão atual do termo: `v2026-05`.
- Direitos do titular (Art. 18 LGPD): acesso via `/exportar-dados`, eliminação via `suporte@desafiogut.com.br`, portabilidade via JSON estruturado.
- Política de retenção em `docs/lgpd-politica-retencao.md` (audit logs 13 meses, pedidos PIX 10 anos, consent log 5 anos, fingerprint 24h).

### 7.3 Auditoria do Contrato

Contrato `LeilaoGUT` revisado em 7 ondas com 4 findings críticos resolvidos. Constantes anti-DoS: `MAX_LANCES_UNICOS = 10.000`. Transferência de coordenação em duas etapas (`iniciarTransferenciaCoordenacao` + `aceitar`).

## 8. FAQ — Perguntas Frequentes

### 8.1 Como participo do leilão?
1. Faça login com Google/E-mail/Apple (Privy cria sua carteira automaticamente).
2. Aceite os termos LGPD.
3. Para Lance Relâmpago: deposite via PIX (Mercado Pago) e use o saldo R$.
4. Para Lance Programado: compre senhas (R$ 2,00 cada) e use no Mercado de Lances.

### 8.2 Como ganho? Qual o critério?
Vence o **menor valor que aparece exatamente uma vez** (Artigo VIII). Se você der lance de R$ 0,07 e ninguém mais der R$ 0,07, e R$ 0,07 for o menor valor único, você ganha.

### 8.3 Quanto custa uma senha?
R$ 2,00 (Artigo 20). Cada senha vale 1 lance no Leilão Programado.

### 8.4 Qual a diferença entre Relâmpago e Programado?
Relâmpago dura 30 minutos a 1 hora (off-chain, debita saldo R$). Programado dura 24 horas (on-chain, consome senha). Relâmpago é para Bronze/Prata; Programado para Ouro/Diamante.

### 8.5 Como compro senhas?
No painel "Minha Carteira" → Depositar PIX → após confirmação use "Trocar R$ → Senha". O sistema debita R$ 2,00 e a coordenação credita a senha on-chain.

### 8.6 Como funciona o Voucher de Networking?
Clientes Diamante geram 10 códigos `GUT-XXXXXXXX`. Quem usa o código tem **isenção total** da taxa na primeira compra de fichas Bronze/Prata.

### 8.7 Como funciona o "Indique e Ganhe"?
Você recebe um código `IND-XXXXXX` automaticamente. Compartilhe. Cada amigo que comprar uma senha usando seu código te dá +1 senha bônus. Máximo 10 conversões/mês.

### 8.8 Quanto tempo dura uma rodada?
- Relâmpago: 30 minutos a 1 hora.
- Programado: 24 horas, reset automático às 00:00.

### 8.9 Como vejo meu saldo de senhas?
On-chain via `saldoSenhas(seu_endereco)` no contrato. No app, painel "Minha Carteira" mostra automaticamente (status: on-chain).

### 8.10 Posso recuperar o dinheiro depositado se desistir?
O saldo R$ off-chain pode ser usado para Lance Relâmpago ou trocado por senhas. Para reembolso, contate `suporte@desafiogut.com.br` (processo manual conforme política).

### 8.11 Lances repetidos contam?
Não vencem. Se dois ou mais participantes mandam exatamente o mesmo valor, esses lances são marcados como `repetido: true` e excluídos do cálculo do vencedor.

### 8.12 E se ninguém der lance único?
Não há vencedor naquela rodada. O contrato retorna `(0, address(0))` em `apurarVencedor`. A rodada simplesmente encerra sem prêmio.

### 8.13 Quando o leilão Programado é resetado?
Todo dia às 00:00 (horário de São Paulo) pelo cron `cron-reset-programado`. O timer é absoluto (calculado em `prazo - now`), portanto imune a refresh da página.

### 8.14 Qual rede blockchain é usada?
Ethereum Sepolia testnet (chainId 11155111). Contrato em `0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5`.

### 8.15 Preciso de MetaMask ou outra carteira?
Não. A Privy cria uma Embedded Wallet automaticamente no seu navegador a partir do login Google/E-mail/Apple. Você não precisa de extensão, QR code ou seed phrase.

### 8.16 O que é Vale-Crédito?
Crédito virtual em BRL na sua Wallet Digital. Gerado automaticamente quando o produto que você cadastrou tem valor menor que o mínimo da cota — a diferença vira crédito. Abate renovações futuras ou solicitações de banner premium. Não é resgatável em dinheiro.

### 8.17 Como vejo os domingos?
Aos domingos, apenas Prata e Diamante ficam visíveis na Vitrine (REQ-29). Bronze e Ouro são ocultados automaticamente.

### 8.18 É seguro? O código é auditado?
A infraestrutura passou por 7 Mega Comandos de blindagem cobrindo APIs, supply chain (Dependabot, npm audit, Socket), detecção (Sentry, FingerprintJS, monitor on-chain), análise estática (Slither), fuzzing (Echidna), testes (Foundry com 16 testes + 6 invariants), WAF Cloudflare, backup diário e Disaster Recovery. Auditoria externa formal está no roadmap 2027-Q1 (OpenZeppelin/Trail of Bits/Cantina).

### 8.19 Que dados meus o sistema guarda?
Endereço da carteira Privy, IP, user-agent, fingerprint do dispositivo (anti-Sybil, 24h), histórico de operações (auditoria, 13 meses) e consentimento LGPD (5 anos). Política completa em `docs/lgpd-politica-retencao.md`. Você pode exportar tudo via `/exportar-dados`.

### 8.20 Como contato o suporte?
Para questões gerais: `suporte@desafiogut.com.br`. Para emergências de segurança: canal `#incidentes` no Slack/Discord interno. Para LGPD/eliminação de dados: solicitar por e-mail com prova de identidade.

### 8.21 Posso participar de mais de um leilão ao mesmo tempo?
Sim. Relâmpago e Programado rodam em paralelo e usam saldos distintos (R$ off-chain vs senhas on-chain). Você pode ter lances ativos nos dois ao mesmo tempo.

### 8.22 Quanto tempo demora a confirmação de PIX?
Mercado Pago confirma normalmente em segundos. O webhook do MP credita o saldo R$ automaticamente. PIX para Adesão (familiaquildo@gmail.com) requer aprovação manual do Admin — pode levar algumas horas em horário comercial.

### 8.23 O contrato pode ser pausado?
Sim, pela coordenação via transferência em duas etapas. Nunca foi exercido em produção até a presente data. Em caso de incidente crítico, o playbook `docs/incident-response.md` detalha o procedimento.

### 8.24 Onde encontro meus lances anteriores?
Na rota `/carteira` → seção "Meus Lances" lista os últimos lances feitos com a carteira conectada. Para o histórico on-chain completo, consulte Etherscan em `https://sepolia.etherscan.io/address/0x59A73Acc8E8B210C874B0E3A9eC9B8B64847F6D5`.

### 8.25 Posso transferir senhas para outra carteira?
Não. As senhas são vinculadas ao endereço que comprou e só podem ser usadas pelo próprio endereço via `darLance`. Não há função de transferência implementada no contrato.

---

> Última atualização: 2026-05-18. Em conflito com outros docs, `DESAFIOGUT-MASTER.md` é a fonte oficial.
