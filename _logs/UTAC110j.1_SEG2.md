# UTAC110j.1 — SEG2: texto do ecrã de exclusão (Frente C) e página pública (Frente D)

> Executor: Hermes · 2026-10-16

## 1. O que estava errado no texto (medido)

| # | Antes | Problema |
|---|---|---|
| 1 | «todos os dados pessoais serão permanentemente removidos» (modal) | **falso**: há dados retidos e dados anonimizados |
| 2 | «Perfil, preferências e **vínculos de indicação**» na lista do que é eliminado (página) | **falso**: o backend não tocava em nenhum store do referral |
| 3 | Lista de retidos só com NF-e, pedidos, PIX e on-chain | **omissão**: `pontos`, `resgates`, `eco_quildo`, `google_play_compras` não apareciam nem nos apagados nem nos retidos |
| 4 | «a conta e todos os dados pessoais associados serão apagados permanentemente» (aviso da página) | mesma promessa absoluta e falsa |
| 6 | (depois do R18-110j.1-4b) o resgate aparecia como eliminado | **falso**: passou a ser anonimizado e retido |
| 5 | Página pública sem nome do developer e sem passos | requisito da Google Play (Account Deletion) |

## 2. O que o ecrã diz agora

**Eliminado** (modal — `APAGADOS`, exportado e testado):
saldo em R$ + registro off-chain de senhas + carteira · perfil, atividade e pontos de fidelidade ·
palpites · **código e vínculos de indicação, bónus e histórico mensal**.
(Os resgates do cartão **saíram** desta lista depois do R18-110j.1-4b: passaram a retidos.)

**Retido** (modal — `RETIDOS`): NF-e 5 anos (CTN arts. 173/174) · histórico de pedidos anonimizado ·
PIX **e compras Google Play** anonimizados, prazo fiscal · **resgates do cartão: registo da entrega
(data e produto) fica e a morada passa a «[Conta Deletada]»** (R18-110j.1-4b) · **registo do Passe e
saldo de ECOQUILDO** com identificador pseudónimo · on-chain (público, imutável) · **logs de
auditoria, incluindo indicações, 13 meses (Marco Civil — Lei 12.965/2014), sem o endereço**.

A página `/excluir-conta` repete as duas listas (com as linhas que o teste do MC104.3 já exigia,
mantidas **sem alteração de sentido**) e acrescenta:

- **App:** DesafioGUT Torneio Habilidade
- **Desenvolvedor:** Associação Recreativa dos Nordestinos no Amazonas (Grupo União e Trabalho) —
  CNPJ 23.040.066/0001-00
- **Passos para pedir a exclusão** (4 passos, incluindo a via por e-mail e o prazo de 15 dias)

## 3. Coerência texto ↔ backend (como é garantida)

Há **dois testes de deriva** e não uma promessa:

1. `_tests/utac110j1-exclusao-lgpd.test.mjs` — lê `POLITICA_EXCLUSAO` (JS), o `.sql` da migração e o
   texto dos dois `.jsx` e falha se: uma tabela da política não estiver na migração; a migração falar de
   uma tabela fora da política; as chaves de PII do SQL ≠ as do JS; o ecrã não disser, para cada alvo
   apagado/anonimizado, a frase correspondente; ou voltar a frase absoluta «todos os dados pessoais».
2. `src/components/__tests__/utac110j1-texto-exclusao.test.mjs` — **renderiza** o modal (Vite +
   react-dom/server) e verifica o texto que o utilizador lê. Inclui a guarda de LADO: o resgate não
   pode voltar à lista dos eliminados (R18-110j.1-4b) — `assert.doesNotMatch(bloco("APAGADOS"), /resgates/)`
   e `assert.match(bloco("RETIDOS"), /resgates/)`.

## 4. Frente D — link web

**Já existia** a rota pública `/excluir-conta` (`src/pages/ExcluirConta.jsx`, renderizada fora do gate
LGPD e da navegação, em `App.jsx`). Não foi criada uma segunda página: isso duplicaria o texto e
voltaria a abrir a porta à divergência. O que faltava — nomear app e developer, mostrar passos — foi
acrescentado **na mesma página**, para a app, a política de privacidade e o formulário do Data Safety
apontarem todos para o mesmo sítio.

⚠️ **Não verificado em produção**: se a rota está publicada e acessível sem sessão (é o que o Data
Safety exige). Medir depois do deploy — DEBT-047.
