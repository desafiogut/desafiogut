# UTAC105b.2 — SEG1 · Frente B: validação de posse (MC89.38) (2026-10-01)

## 1.1 Baseline do padrão (reconfirmado por leitura)
- **`cotas.mjs` ação `update-corporativo`** (fechada no UTAC105b.1): `resolverChamador` → **401** se anon;
  leitura em `try/catch` → **502 fail-closed**; não-admin: `ehProprio` (cliente_id == JWT, normalizado)
  **ou** `vinculado` (cota.`endereco` == JWT) → senão **403**; 401/403 **antes** do 404.
- **`produtos.mjs:296-354`**: a referência original da regra MC89.38.
- Ferramentas disponíveis no ficheiro (reutilizadas, não recriadas): `resolverChamador` (l.165-181),
  `getCota`, `jsonError`.

## 1.2 A correcção
É a **mesma guarda** do SEG0 §0.2 (as frentes A e B deste UTAC são o mesmo bloco: o enunciado separou
«não sobrescrever» de «validar a posse antes do upsert», mas em código é uma coisa só). Mapeamento
pedido pelo enunciado → implementado:
| enunciado | implementado |
|---|---|
| `chamador = await resolverChamador(req)` | ✅ idêntico |
| anon **e cota existe** → 401 | ✅ `existenteReg && chamadorReg.papel === "anon"` → 401 `token_ausente` |
| user sem prova de posse → 403 | ✅ `endereco_nao_corresponde` |
| admin → permitir | ✅ `chamadorReg.papel !== "admin"` isenta a guarda |
| não existe → permitir criação | ✅ a guarda só age quando `existenteReg` existe |
| idempotência | ⚠️ **401, não 200** — razão medida na SEG-1 §-1.7 e em SEG0 §F-2 (não distinguível sem prova de posse; o 200 exigiria escrever ou revelar o registo a um anónimo) |

**Nota de fidelidade:** a normalização é `String(clienteId).toLowerCase()` nos **dois** lados
(`ehProprio` e `enderecoDaCota`), para não bloquear o dono legítimo por causa da caixa do endereço
(payload legado em EIP-55) — a mesma lição que o validador do UTAC105b.1 deu (F2) e que aqui é
exercida por `B5`/`B12`.

## 1.3 Teste bidireccional
Cobertos por `_tests/utac105b2-register.test.mjs` — ver SEG0 §0.3 (14/14 verde). **Cada caminho tem
mutante** (SEG0 §0.4: MA1–MA4 atacam precisamente os ramos desta frente).

## 1.4 A/B
Antes/depois do mesmo pedido: anónimo com o `endereco` da vítima `201+sobrescreve` → `401+intacto`
(SEG0 §0.1). Zero regressão: o dono (`B4`), o vinculado (`B5`) e o admin (`B6`) continuam a 201.

## 1.5 Ficheiros
`desafio-gut/frontend/netlify/functions/cotas.mjs` (bloco inserido) ·
`desafio-gut/frontend/netlify/functions/_tests/utac105b2-register.test.mjs` (novo).

## 1.6 VEREDITO DO SEG1: **FECHADO** — a posse passa a ser exigida antes do upsert, sem quebrar
nenhum caminho legítimo medido.
