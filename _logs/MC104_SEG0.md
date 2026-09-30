# MC104 — SEG0 · FRENTE A: PROVA DO ACEITE NO SERVIDOR

## 0.1 PoC
Nenhum registo do aceite do **gate** no servidor (`TermosConsentimento.jsx:24-37` → só `localStorage`). O único registo
de consentimento no servidor é o do `comprar-senhas.mjs` (Blob `consent-log`, contexto «comprar-senhas», versão fixa
`v2026-05` ≠ `2.0` do gate). O gate corre antes do login (sem endereço) — ver SEG-1 §-1.6.

## 0.2 Correcção (decisões R18 1 e 2)
| Ficheiro | O quê |
|---|---|
| `netlify/functions/_lib/consentimento.mjs` (novo) | `validarAceite` (estrito: versão = `VERSAO_GATE`, as 4 declarações exactamente `true`, data ISO com ida-e-volta), `registrarConsentimento` (Blob `consent-log`, chave `${ts}:${endereco}` inalterada, **idempotente** por versão + hora declarada, nunca sobrescreve no mesmo ms), `lerConsentimento` (só chaves do titular, ordenado) |
| `netlify/functions/consentimento.mjs` (novo) | `POST` = **só o próprio titular** (admin incluído → 403); `GET ?endereco=` = titular ou admin. Rate-limit 10. Log com endereço **mascarado** e sem conteúdo |
| `src/components/TermosConsentimento.jsx` | +1 campo no aceite local: `aceitos: {lido, maiores, termos, privacidade}` |
| `src/lib/consentimento.js` (novo) | `consentimentoPendente` / `enviarConsentimentoPendente`: envia **uma vez por endereço**, só marca `enviadoPara` com resposta ok |
| `src/context/AppContext.jsx` (autorizado por R18) | +1 `useEffect([address, authToken])` que chama o envio |

Registo gravado: `{endereco, aceiteEm (servidor), aceiteDeclaradoEm (cliente), termoVersao, aceitos, ip, userAgent, contexto:"gate-legal"}`.
Sem tabela nova, sem migração, `conta-delete` intocado: o `consent-log` já é exportado, apagado, retido 5 anos e salvaguardado.

## 0.3 Testes + mutação
- Backend `_tests/mc104-consentimento.test.mjs` (9): aceitar → gravado; 9 formas de não-aceite → 400 sem registo; 2× o mesmo
  → 1 registo, aceite novo → 2; mesmo ms não sobrescreve; histórico só do titular e ordenado; adulteração (outro, admin,
  sem token, token falso) → sem registo; leitura owner/admin; **HARD GATE 14** (log sem endereço completo nem conteúdo);
  versão do servidor = versão do gate (lida da fonte).
- Frontend `src/lib/consentimento.test.mjs` (7): lógica pura + **cablagem** (AppContext e gate lidos sem comentários).
- **Defeito apanhado pelo próprio teste:** o V8 aceita `2026-02-31T…Z` em ISO (passa a 3 de março) → validação por ida e volta.
- **Mutação: 14/14 RED** (`scripts/mc104-prova-mutacao.mjs A`), todos confirmados a entrar (1 ocorrência exacta), restauro byte-idêntico.

## 0.4 Suíte
backend **809/815** (+9) · frontend **515/515** (+7) em 6 de 7 corridas. ⚠️ **1 corrida vermelha (1 falha) não identificada**:
não reproduziu em 6 corridas seguintes nem ficheiro a ficheiro. Candidato: o flaky conhecido `hooks-torneio.test.mjs:231`
(MC94.4.1). Registado, não declarado resolvido.

## ⚠️ Pendentes (decisão, não executados)
1. **Quem aceitou antes do MC104** tem no aparelho um aceite sem as declarações → **não é enviado** (P10: não inventar).
   Esses titulares só ficam com prova no servidor se voltarem a aceitar. Subir `VERSAO_CONSENTIMENTO` força-o — **decisão
   de produto** (MC115).
2. `comprar-senhas.mjs:41` continua com `termoVersao: "v2026-05"` fixo, dessincronizado do gate (ficheiro não autorizado).
3. `aceiteDeclaradoEm` é declarado pelo cliente; a prova forte é `aceiteEm` (servidor) + o endereço autenticado.

## Veredito SEG0: **VERDE**
