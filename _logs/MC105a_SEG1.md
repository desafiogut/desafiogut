# MC105a — SEG1 · Frente B: `comprar-passe.mjs` (2026-09-30)

## 1.1 Baseline
Padrão do `comprar-senhas.mjs`, pela ordem:
1. preflight CORS;
2. 405;
3. rate-limit;
4. kill switch;
5. JWT;
6. validação;
7. `debitarSaldoRs`;
8. acção;
9. `reembolsarSaldoRs` em falha, com alerta Sentry se o reembolso falhar.

## 1.2 `POST /.netlify/functions/comprar-passe`
Body `{ edicaoId, produtoId }`; header `Authorization: Bearer <user-session>`. O comprador é **sempre** o do token: um
`endereco` no body é ignorado.

| passo | resposta |
|---|---|
| OPTIONS | preflight |
| ≠ POST | 405 |
| rate-limit `comprar-passe` (5/min/IP) | 429 |
| kill switch | 503 `sistema_pausado` |
| sem token ou token inválido (inclui um `lance-auth`, que é outro tipo) | 401 |
| `edicaoId` fora de `EDICAO_ID_RE`, ou `produtoId` fora de `/^[0-9a-f-]{10,64}$/i` | 400 `params_invalidos` |
| edição inexistente | 404 · não Programada: 409 `edicao_nao_programada` · fora da janela: 409 `edicao_encerrada`/`edicao_nao_iniciada` |
| `produtoId` ≠ `meta.produtoId` | 409 `produto_nao_vinculado` · inexistente: 404 · não `ativo`: 409 · catálogo em baixo: 503 |
| **o passe já existe** | **200 `{idempotent:true, passe}`**, sem tocar no saldo |
| `debitarSaldoRs` (atómico, CAS) recusa por saldo | **402 `saldo_insuficiente`** · outra falha: 502 `debito_falhou` |
| `criarPasse` cria | **201 `{passe, saldoRsAntesCentavos, saldoRsDepoisCentavos}`** |
| perdeu a corrida (23505) | **reembolsa** → 200 `{idempotent:true, reembolsado}` |
| o INSERT falha | **reembolsa** → 502 `gravar_passe_falhou {reembolsado}`; se o reembolso falhar, alerta `comprar_passe_reembolso_falhou` (sem endereço) |

- A pré-verificação de saldo (`lerSaldoRsCentavos`) que o enunciado sugeria foi **retirada**: é redundante com a recusa
  atómica do `debitarSaldoRs` e daria um mutante equivalente.
- O kill switch não estava no enunciado. É o do `comprar-senhas`, reaproveitado para mutações financeiras.
- Códigos 404/409 para «existe/activo»: é a convenção do `pedidos.mjs`; o enunciado dizia «400 se inválidos».

## 1.3 Testes: ver SEG2 (o enunciado pôs os testes do endpoint e os E2E no mesmo ficheiro, `mc105a-e2e.test.mjs`)

## 1.4 A/B: `comprar-senhas.mjs` intacto
`git diff --quiet b31dbd8` sobre `comprar-senhas.mjs`, `_lib/saldoRs.mjs`, `_lib/saldoRs-store.mjs` e `voucher.mjs`
dá **idênticos**. Os testes existentes que exercem o `comprar-senhas` (`mc104-consentimento`, `mc39171-p0-fixes`)
dão **14/14**. A suíte completa não tem regressões.
