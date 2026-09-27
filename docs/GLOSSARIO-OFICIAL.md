# GLOSSÁRIO OFICIAL — PT-BR (ÚNICO IDIOMA)

Referência para o texto do DesafioGUT. Decisão do operador (R18).
O DesafioGUT é um **torneio de habilidade** (Portaria SPA/MF 1.207/2024) — não é leilão,
aposta, sorteio nem jogo de azar. E, desde o MC98, o app é **PT-BR only**.

## Termos do produto

| Termo | Razão |
|-------|-------|
| Torneio de habilidade | Alinha com Apple 5.3.4 e Google Play policy |
| Menor lance único | «Lance» é o termo do regulamento e da UI |
| Lance | Termo central do produto |
| Relâmpago | Modalidade que debita **saldo** (a partir de R$ 0,01) |
| Programado | Modalidade que usa **senhas** |
| Senha | Crédito de participação (R$ 2,00). Na UI em PT nunca é «token» nem «ficha» |
| Saldo | Termo financeiro padrão |
| Edição | Ciclo do torneio |
| Prêmio | Produto ou serviço anunciado na edição |
| Participante | Neutro |
| Ganhador | Neutro |
| Apuração | Evita «sorteio»/«draw» |

## ⛔ Termos proibidos (nos VALORES do dicionário; chaves de código são identificadores e não se traduzem)

| idioma | proibidos |
|---|---|
| PT | leilão/leilões, aposta(s), sorte(s), azar, loteria(s) |

⚠️ **Os padrões cobrem SEMPRE o plural.** A 1.ª versão do teste tinha `\bsubasta\b` e a
mutação que reintroduzia «Subastas» **sobreviveu**. Ninguém escreve «Subasta» num botão.

## O que o MC98 mudou aqui

Até ao MC97 este glossário tinha **três colunas (PT / EN / ES)** e listas de proibidos em
três idiomas — porque o app dizia ter três idiomas. As traduções escolhidas existiam:
«Senha» era **Token** em EN/ES (para não evocar «ficha», de casino/leilão, nem
«password», que se lê como credencial de conta), «Menor lance único» era «Lowest unique
offer» / «Oferta única más baja», e «bid»/«puja»/«subasta» estavam proibidos.

O MC98 declarou o app **PT-BR only**: `en.js` e `es.js` foram removidos e o selector de
idioma saiu da UI. As colunas EN/ES deixaram de ter objecto — e um glossário que regula
traduções que já não existem é documentação a mentir sobre o produto. Ficam registadas
acima como nota histórica de decisão, não como fontes de tradução.

## Estado (medido, MC98)

| | PT |
|---|---|
| chaves em `src/i18n/pt.js` | 127 |
| termos proibidos | 0 |
| dicionários em `src/i18n/` | 1 (`pt.js`) |

Testes: `src/i18n/__tests__/glossario.test.mjs` (glossário PT) e
`src/i18n/__tests__/pt-only.test.mjs` (guardas da declaração PT-BR only).
