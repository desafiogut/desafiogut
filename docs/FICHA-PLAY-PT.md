# FICHA DA PLAY STORE — PT-BR (ÚNICO IDIOMA)

**PREPARADA, NÃO COLADA.** A colagem na Play Console é o MC101.
⚠️ **Todas as contagens desta ficha são MEDIDAS por código** (`scripts/mc97-medir-ficha.mjs`),
não estimadas. O script lê este documento, mede os três campos e **recusa aprovar** se
algum exceder o limite da Play — ou se a contagem escrita no título não for a medida.

---

## Porquê PT-BR apenas (MC98 · decisão do operador, R18, 27/09/2026)

O MC97 mediu o que o produto realmente entrega: **59 de 62 ficheiros de UI escrevem
português hardcoded** e 35 das 129 chaves de i18n nunca eram usadas pela UI. O app dizia
ter 3 idiomas e falava 1.

A ficha prometia 3 idiomas; o app entregava PT. **É essa contradição que é o risco:** um
revisor que mude de idioma no selector e veja a app em português nota a promessa não
cumprida — e a contradição é visível sem se procurar muito.

O operador decidiu: **o DesafioGUT é PT-BR only.** Não é bloqueante — a Google e a Apple
não exigem múltiplos idiomas — e o mercado-alvo é o Brasil. Declarar um idioma é mais
honesto e mais simples do que manter três ficheiros que o produto não lê.

**Consequência no código (MC98):** `src/i18n/en.js` e `src/i18n/es.js` foram removidos,
`SUPPORTED` ficou fechado a `["pt"]` e o selector de idioma saiu da UI.

---

## Classificação nas lojas (realinhada à Via B pelo UTAC106x.2, 2026-10-04)

O produto é um **e-commerce por dropshipping com programa de fidelidade gamificado**. Duas modalidades:
**(a) Oferta Relâmpago** — menor lance único, jogo de **habilidade**; **(b) Oferta Programada** —
**programa de fidelidade** (o Passe de R$ 2,00 vale 1 ponto; **50 pontos = cartão colecionável físico da
Família Quildo**; o palpite é **bónus de +2 pontos** e **não decide** o prémio).

- **Google Play:** **programa de fidelidade** (*Gamified Loyalty*). **Não é** concurso de previsões, **não é**
  aposta e **não é** sorteio. **SPA/MF não se aplica** (não há concurso) — achado **R-19**, revertido pelo
  UTAC106x.1.
- **Apple:** **bem físico** (fora do IAP).
- **Vendedor legal:** **Associação Recreativa dos Nordestinos no Amazonas** — CNPJ **23.040.066/0001-00**
  (Grupo União e Trabalho).

> ⛔ **SUPERADO (UTAC106x.2, 2026-10-04):** a copy abaixo dizia «Programado: usa **senhas (tokens)** de
> R$ 2,00, compradas na sua carteira» e «operado pelo **Grupo União e Trabalho**». A definição vigente é a
> da **NORTE DO PRODUTO** (Via B). A copy foi corrigida e o texto antigo fica **anotado** aqui
> (P2 · GATE 15: não se apaga).

---
## PT-BR

**Título** (máx. 30) — **29 caracteres**
```
DesafioGUT Torneio Habilidade
```

**Descrição curta** (máx. 80) — **74 caracteres**
```
Ofereça o menor lance único e vença por estratégia. Torneio de habilidade.
```

**Descrição longa** (máx. 4000) — **1285 caracteres**
```
O DesafioGUT é um torneio de habilidade onde vence quem fizer o menor lance único.

COMO FUNCIONA
Você responde à pergunta «QUANTO VOCÊ OFERTA POR... este produto ou serviço?» e registra a sua oferta. Vence quem fizer a oferta única de menor valor. Não há sorteio, não há azar: o resultado depende da sua estratégia e da sua leitura das ofertas dos outros participantes.

DUAS MODALIDADES
• Relâmpago: usa saldo, a partir de R$ 0,01 por oferta. Sem limite de participações.
• Programado: o Passe de R$ 2,00 vale 1 ponto; 50 pontos dão direito ao cartão colecionável físico da Família Quildo. O palpite é um bónus de +2 pontos e não decide o prémio.

PONTUAÇÃO
Oferta única vale 1 ponto. Oferta única de menor valor vale 3 pontos. Sequências de acertos acumulam bónus. O ranking é público e acumulado por edição.

PRÉMIOS
Produtos e serviços anunciados em cada edição. O ganhador é apurado automaticamente e a entrega é feita pela coordenação, conforme o regulamento registrado.

SEGURANÇA E TRANSPARÊNCIA
Cadastro gratuito, exclusivo para maiores de 18 anos. O regulamento completo está disponível no aplicativo e registrado em cartório (RTD — Manaus/AM).

O DesafioGUT é operado pela Associação Recreativa dos Nordestinos no Amazonas (CNPJ 23.040.066/0001-00), Grupo União e Trabalho.
```

---

## Verificação de limites (medida por código)

| campo | limite | PT-BR |
|---|---|---|
| título | 30 | 29 ✅ |
| descrição curta | 80 | 74 ✅ |
| descrição longa | 4000 | 1285 ✅ |

> **Nota do MC97:** a 1.ª versão desta ficha tinha as contagens **escritas à mão** — e cinco
> dos nove campos **excediam o limite**, com um ✅ inventado ao lado. Os títulos PT (34) e ES
> (32) passavam dos 30; as três descrições curtas passavam dos 80. Corrigido: a copy foi
> encurtada e os números passaram a ser medidos. **Uma ficha que estoura o limite é uma
> colagem falhada no MC101 — e o ✅ era meu, não da Play Console.**

> **Nota do MC98:** a ficha perdeu as secções EN e ES. Não é uma tradução a menos — é uma
> promessa a menos que o produto não cumpria. Os três campos que ficam são os mesmos que já
> existiam em PT (nenhuma copy foi alterada); o que mudou foi o documento deixar de afirmar
> três idiomas.

⚠️ **Em falta para o MC101:** URL da política de privacidade, e-mail de contacto,
classificação etária (o app é 18+), e as capturas de ecrã (agora só em PT-BR).
