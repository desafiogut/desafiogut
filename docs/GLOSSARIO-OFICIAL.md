# GLOSSÁRIO OFICIAL — PT / EN / ES

Referência para todas as traduções do DesafioGUT. Decisão do operador (R18, 26/09/2026).
O DesafioGUT é um **torneio de habilidade** (Portaria SPA/MF 1.207/2024). Não é leilão,
aposta, sorteio nem jogo de azar — em **nenhum** idioma.

## Termos do produto

| PT | EN | ES | Razão |
|----|----|----|-------|
| Torneio de habilidade | Skill-based tournament | Torneo de habilidad | Alinha com Apple 5.3.4 e Google Play policy |
| Menor lance único | Lowest unique offer | Oferta única más baja | "Offer/oferta" — evita "bid/puja" (leilão) |
| Lance | Offer | Oferta | Neutro, não "bid" |
| Relâmpago | Flash | Relámpago | Já é o termo do código |
| Programado | Scheduled | Programado | Neutro |
| Senha | **Token** | **Token** | Evita "ficha"/"password" (conotação casino/leilão) |
| Saldo | Balance | Saldo | Termo financeiro padrão |
| Edição | Edition | Edición | Próximo do PT |
| Prémio | Prize | Premio | Universal |
| Participante | Participant | Participante | Neutro |
| Ganhador | Winner | Ganador | Neutro |
| Apuração | Tally / Result | Recuento / Resultado | Evita "draw" (sorteio) |

## ⛔ Termos proibidos (nos VALORES; chaves de código são identificadores e não se traduzem)

| idioma | proibidos |
|---|---|
| PT | leilão/leilões, aposta(s), sorte(s), azar, loteria(s) |
| EN | auction(s), bet(s), bid(s)/bidding, gambling, lottery/lotteries, raffle(s), chance(s), luck, **password(s)** |
| ES | subasta(s), apuesta(s), puja(s), lotería(s), sorteo(s), azar, suerte(s), **contraseña(s)** |

⚠️ **`password`/`contraseña` estão na lista** por decisão do operador: "Senha" traduz-se por
**Token**. *Password* sugere credencial de conta, não o crédito de participação — é um termo
que confunde e que a revisão das lojas lê como outra coisa.

⚠️ **Os padrões cobrem SEMPRE o plural.** A 1.ª versão do teste tinha `\bsubasta\b` e a mutação
que reintroduzia «Subastas» **sobreviveu**. Ninguém escreve «Subasta» num botão.

## Estado (medido, MC97)

| | PT | EN | ES |
|---|---|---|---|
| chaves | 129 | 129 | 129 |
| termos proibidos | 0 | 0 | 0 |
| termo central | «torneio de habilidade» | «skill-based tournament» | «torneo de habilidad» |

Teste: `src/i18n/__tests__/glossario.test.mjs` (5 asserções + 3 mutações).
