# UTAC151 — Especial Programada: tabela de palpites, nomes e textos do cartão — RELATÓRIO (2026-11-26, Opus 5.5)

Spec `_logs/UTAC151.spec.yml` · SEG-1 `_logs/UTAC151_SEG-1_MEDICAO.md` (veredicto AJUSTAR → R18-151-A/B/C).

## Decisões do operador
- **R18-151-A:** backend mínimo autorizado (o enunciado proibia backend, mas o nome não existia no servidor).
- **R18-151-B:** usar a `TabelaLances` oficial com uma variante opcional; a `TabelaPalpites` local sai.
- **R18-151-C:** «Seu palpite: N lances» sai do cartão. Na OP fica entre o cartão e a tabela; «Resultado no fim da edição.» sai.

## Entrega
- [x] **Tabela abaixo do cartão.** A aba OP passa a ter: cartão → «Seu palpite» → `<TabelaLances variante="palpite">` → aviso do bónus → pontos…
  - Antes, a tabela era o **último** vidro da página.
  - Sem edição, a tabela continua vazia (UTAC108e.1).
- [x] **Textos soltos fora do cartão.**
  - OP: o «Seu palpite» saiu do cartão para baixo dele; «Resultado no fim da edição.» foi removido.
  - Início: o «Seu palpite» saiu do vidro «🎫 Programada»; fica a pílula «COM PALPITE».
  - Os estados de resultado (mais próximo/perdeu) continuam no cartão, como o resultado da Relâmpago.
- [x] **Nomes «PrimeiroNome I.».**
  - Migração `20261126_utac151_palpites_nome.sql`, **aplicada em produção** e verificada (coluna + CHECK; 1 palpite, NULL).
  - `registar-palpite` aceita um `identityToken` opcional e verifica-o com o mesmo `verificarIdentidadePrivy` do `auth-lance`, contra a carteira do user-session. Guarda só `formatarNome(…)`. O `nomeExibicao` do body é ignorado e um e-mail nunca vira nome.
  - `ler-palpites` devolve `nomeExibicao`.
  - `usePalpite` envia o identity token (import dinâmico do SDK).
  - A tabela usa `formatarNomeExibicao` (UTAC142): sem nome, mostra o endereço curto.
- [x] **Suíte:**
  - backend **VERDE 1539/1628** (+4);
  - frontend **1374/1427** (52 skips) com **1 falha pré-existente de DNS**: `mc9952` «nome prefixado» `sslip.io`. O resolvedor local devolve só o A `1.1.1.1`, sem o AAAA `::1`; o ficheiro só testa o `img-proxy.mjs`, que não foi tocado.
  - Registo em `_logs/UTAC151_SUITE.txt`.
- [x] **Deploy:**
  - draft `6b0882e3` validado: contrato mainnet presente, Sepolia ausente, strings novas presentes, «Resultado no fim» ausente, `ler-palpites` 401;
  - **produção `6b088433`**: `CDN requesting 0 files and 2 functions`, bundle `index-Bg5NHT-V.js` igual ao do draft.

## Provas
- **Testes novos:**
  - `utac151-palpite-nome` N1–N4: nome reduzido, sem token/token inválido/sem nome → sem coluna, body ignorado, e-mail recusado, `ler-palpites` com nome e sem valor;
  - `utac107e2` C2b: com nome mostra «Ramon S.» e não o endereço; sem nome mostra o endereço curto.
- **Testes adaptados** ao novo contrato (mudança decidida, não regressão), em 10 ficheiros:
  - `utac106f`, `utac107e2`, `utac108e1`, `utac109g`, `utac149-val`, `utac110a` e `utac107e2-ler-palpites` deixaram de fixar o `TabelaPalpites` e passaram a fixar o novo contrato: a tabela logo abaixo do cartão, os selos da `TabelaLances`, o `nomeExibicao` e o «Seu palpite» entre o cartão e a tabela;
  - `utac106h`, `utac109e` e `utac110d` só ganharam o duplo do `dompurify`, porque a OP passou a desenhar a `TabelaLances`.
- **Mutação 4/4 RED** (`_logs/UTAC151_MUTACAO.txt`, md5 restaurado):
  - M1: body aceite;
  - M2: nome completo gravado;
  - M3: a OP perde o nome;
  - M4: palpite em R$.
- **Defeito meu apanhado pela suíte:** um comentário na mesma linha comentou o `.order("criado_em")` do `listarPalpitesDaEdicao`. Foi corrigido antes do commit.

## Desvios declarados
- **Backend alterado** apesar do enunciado (autorizado: R18-151-A).
- **HI5 (1 h) excedido:** cerca de 1 h 40 min. Pesaram a adaptação dos 10 ficheiros de teste e o deploy em dois passos.
- **Validador adversarial SEG4 não corrido** (DEBT-116 d).
- **Não observado num browser** (DEBT-116 e).
- Commit `5251a5a` **sem push**: o push faz auto-deploy e o deploy já foi feito pelo CLI.

## Para o operador validar no site
1. Abrir **Ofertas Programadas** com a conta de teste: a tabela «📋 Palpites — Edição ESPECIAL-PALPITE1» aparece logo abaixo do cartão, e «Seu palpite: N lances» aparece entre os dois.
2. O palpite da conta de teste é **anterior** ao deploy e mostra o **endereço curto** (DEBT-116 a). Os palpites novos de contas Google com nome mostram «Nome I.».
   - Se quiseres o nome no palpite já feito: um UPDATE copia o nome já verificado que essa conta tem no `ranking_especial` (só se ela deu lances na especial Relâmpago). Precisa de decisão.
3. No **Início**, o vidro «🎫 Programada» já não escreve «Seu palpite» dentro do cartão.

## Pendências
- **DEBT-116** (a–e).
- O AAB v15 tem o layout antigo da OP; a mudança entra no próximo AAB.
