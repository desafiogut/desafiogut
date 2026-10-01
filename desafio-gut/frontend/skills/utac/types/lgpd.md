# TIPO: `lgpd` — UTAC de conformidade LGPD

**Auto-contido.** UTACs que tratam dados pessoais: exportação, exclusão, consentimento, retenção.
O risco é legal e irreversível (apagar o que devia ser retido).

## HARD GATES extra
- **Exportação só do titular** — `exportar-dados` devolve **só** os dados do `endereco` autenticado;
  pedido de terceiro → recusa (nunca 200 com dados alheios).
- **Sem dados pessoais em logs** — endereço, nome, CPF e morada nunca em `console.*`; mascarar.
- **Anonimizar ≠ apagar** *(MC104.2/104.3)* — substituir por `anon:<sha256>` é **pseudonimização**;
  o número de chaves mantém-se. **Nunca** escrever «anónimo» quando é pseudónimo.
- **Dados fiscais preservados** *(MC104.x)* — NF-e, `txHash`, `commitmentHash`, rastreio: **nunca**
  anonimizados nem apagados. Prova: teste literal + `deepEqual` do resto do registo.
- **Hard-delete só o que já era hard-delete** *(MC72)* — não alargar apagamentos existentes.
- **Texto de retenção coerente** — o que a UI promete tem de bater com o código *(MC104.3: o
  `conta-delete` apaga o `consent-log`, logo a frase «consentimento — 5 anos» era falsa)*.
- **A/B pareado** dos fluxos de conta — terceiros intactos, contagem de chaves preservada.

## Segmentos típicos
`SEG-1` (medir onde vivem os dados) → `SEG0-2` (frentes: exportar / excluir / consentir) →
`SEG3` (validador) → `SEG5` (verificar) → `SEG6` (fecho).

## Autorizações típicas
- AUTORIZA alterar `_lib/conta-delete.mjs`, `exportar-dados.mjs`, textos de retenção nomeados.
- NÃO AUTORIZA tocar em NF-e, Supabase (escrita), nem apagar dados de terceiros.

## Ficheiros típicos afectados
- `_lib/conta-delete.mjs` · `netlify/functions/exportar-dados.mjs` · `src/pages/ExcluirConta.jsx` ·
  `src/components/ExcluirContaModal.jsx` · `_lib/notificacoes-usuario.mjs`.

## Exemplos
**UTAC104** (LGPD técnico: gate + exportação) · **UTAC104.2** (conta-delete anonimiza pedidos) ·
**UTAC104.3** (índice/notificações/lances → `anon:<sha256>`; NF-e preservada; «pseudónimo»).

## Prompt de arranque (para o executor)
> Torne [FLUXO] conforme à LGPD. Exportação só do titular; zero dados pessoais em logs; anonimizar
> ≠ apagar; NF-e e dados fiscais intactos. Prove com A/B e mutação (mutante «apaga em vez de
> anonimizar» tem de ficar RED).
