# UTAC110h.2 — SEG-1 · MEDIÇÃO
> Coerência: ECOQUILDO na indicação + 3 sítios «+1 senha».
> Executado em 2026-10-15. **Nada foi alterado neste segmento** (só leitura + medição).
> HARD GATES 1, 2, 3, 12.

---

## -1.1 Estado do repo

| item | medido | enunciado | desvio |
|---|---|---|---|
| `git rev-parse HEAD` | `3f5aac64e6ebb604d4f3cf754f191690ff6005b9` | `3f5aac6` | **nenhum** ✅ |
| `git log --oneline -5` | `3f5aac6` (110h.1 ressalvas) ← `703e78e` ← `ec2028d` ← `db10cc3` ← `649ffd1` | — | — |
| `git status --porcelain` | 5 `M` pré-existentes (`.agents/skills/aidesigner-frontend/SKILL.md` + 2 `references/`, `.gitignore`, `.mcp.json`, `desafio-gut/frontend/package-lock.json`) + `?? _logs/MC100_*.md` (13 ficheiros) | «limpo (ou só pré-existentes)» | **pré-existentes** — nenhum é meu ✅ |
| Suíte frontend | **1077/1077 pass** | 1077/1077 | nenhum ✅ |
| Suíte backend | **1232/1238 pass** | 1232/1238 | nenhum ✅ |

Comando da suíte: `cd C:/Users/Moltbot/Desktop/DESAFIOGUT && node scripts/mc966-suite-harness.mjs ambos`
(saída literal: `frontend: VERDE 1077/1077 pass` · `backend: VERDE 1232/1238 pass` · `VEREDITO: VERDE`).

### -1.1.b RAM (A14) — 3 medições concordantes
Métrica canónica `(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024` (MB):

| momento | leitura |
|---|---|
| antes (bruto) | 241 · 259 · 244 MB → **abaixo do limiar** |
| `scripts/liberar-ram.ps1` (pico) | **2093 MB** (fechados 9 `msedge` sem janela = 943 MB, 6 `msedgewebview2`; `trimmed=64`) |
| **portão (3× a seguir ao trim, imediatamente antes de arrancar)** | **1943 · 1960 · 1947 MB** |

Total da máquina: 5877 MB. Decisão: **3/3 leituras ≥ 1500 MB ⇒ portão A14 satisfeito** (mínimo da janela 1943 MB).

### -1.1.c Disco
`df -h /c` → 238G total, 223G usados, **15G disponíveis (94%)** ⇒ ≥ 5 GB ✅.

---

## -1.2 Existência dos caminhos nomeados

| caminho (enunciado) | medido | tamanho |
|---|---|---|
| `netlify/functions/_lib/eco-quildo.mjs` | **existe** | 13731 B / 259 linhas |
| `netlify/functions/_lib/referral.mjs` | **existe** | 29873 B / 670 linhas |
| `netlify/functions/_lib/guto-perfis.mjs` | **existe** | 40326 B |
| `src/components/PainelIndicacao.jsx` | **existe** | 11078 B |
| `src/components/ChatbotWidget.jsx` | **existe** | 38057 B |
| `src/pages/Privacidade.jsx` | **existe** | 19583 B |
| `src/i18n/pt.js` | **existe** | 8501 B |
| `src/components/TermosConsentimento.jsx` | **existe** | 14748 B |
| `docs/REGULAMENTO-v5.md` | **existe** | 18423 B |
| `netlify/functions/_lib/fontes-lance.mjs` | **existe** (citado na §5 do enunciado) | 6602 B / 122 linhas |
| `netlify/functions/referral.mjs` (endpoint) | **existe** | 11221 B / 246 linhas |

Raiz do frontend: `C:/Users/Moltbot/Desktop/DESAFIOGUT/desafio-gut/frontend`.

---

## -1.3 Inventário — quem credita o quê hoje

| crédito | ficheiro:linha | função | estado |
|---|---|---|---|
| **+50 pontos de lance** (indicante e indicado) | `_lib/fontes-lance.mjs:93` (`creditarIndicacao`), const. `PONTOS_INDICACAO = 50` (:23), limite `LIMITE_INDICACOES_MES = 10` (:24) | chamado por `netlify/functions/referral.mjs:171` com **endereços REAIS** | **vivo** ✅ |
| **+1 senha on-chain ao indicante** | `_lib/referral.mjs:461` (`concederBonus`) → `creditarSenhas(enderecoLower, 1)` :477 | chamado por `registrarConversao` :565 | **MORTO** ⛔ (DEBT-025) |
| **+1 senha on-chain ao indicado** | `_lib/referral.mjs:582` (`creditarSenhas(indicado, 1)`) | dentro de `registrarConversao` | **MORTO** ⛔ (DEBT-025) |
| **ECOQUILDO por indicação** | — | — | **NÃO EXISTE** ✅ (confirmado: os únicos chamadores de `creditarEcoQuildo` são `creditar-eco-quildo.mjs:109` [admin] e `_lib/comprar-passe-tipado.mjs:109` [Passe]) |

**Confirmação pedida no §6.f:** «o backend NÃO credita ECOQUILDO por indicação» → **VERDADEIRO**.
`grep -rn "creditarEcoQuildo|registarEmissaoNoLastro" netlify/functions --include=*.mjs` (fora de `_tests/`)
devolve só: `creditar-eco-quildo.mjs` (admin, motivo `indicacao` disponível mas manual) e
`_lib/comprar-passe-tipado.mjs` (Passe). Nenhum caminho de indicação automática.

### -1.3.b DEBT-025 (dívida aberta, relevante)
`_logs/DEBT.md:60` — **«Bónus de indicação ON-CHAIN morto desde o MC87»**: `referral.mjs`
(`handleUsarCodigo`) passa `mascararEndereco(r.indicador)` / `mascararEndereco(endereco)`
(**endereços MASCARADOS**, ex. `0x1234…abcd`) como ARGUMENTOS a `registrarConversao` :160-163.
`concederBonus` valida `/^0x[a-f0-9]{40}$/` ⇒ devolve `endereco_invalido` ⇒ o crédito de senha
on-chain nunca acontece. Estado: **aberta**, responsável: operador.

---

## -1.4 Medições específicas (contratos de função)

### a) `creditarEcoQuildo` — assinatura REAL (≠ enunciado)
```js
// _lib/eco-quildo.mjs:149
export function creditarEcoQuildo(endereco, valor, motivo, ref) { ... }
```
- **4 parâmetros** — o 4.º, `ref`, é **obrigatório** (`refValida` :53 → `REF_INVALIDA` se ausente);
  é a chave de **idempotência** (o histórico é varrido por `h.ref === ref` :118).
- `motivo` é **lista FECHADA** (`MOTIVOS_EMISSAO` :38):
  `["passe-relampago","passe-programado","boas-vindas","indicacao"]`.
- `valor` tem de ser **inteiro positivo** (`ehInteiroPositivo` :54).
- Lastro: `registarEmissaoNoLastro(valor)` :238 → `aplicarLastro(+valor, 0)` que **DERIVA**
  `reserva_rs_centavos = (total_emitido − total_usado) × 100` (:202-220, `CENTAVOS_POR_ECOQUILDO` = 100 :32).
  A reserva **nunca é somada à mão**.

**⚠️ DIVERGÊNCIA MEDIDA (enunciado §7-A2):** o enunciado escreve
`await creditarEcoQuildo(indicante, 2, "indicacao")` (3 args) e
`creditarEcoQuildo(indicado, 1, "indicacao-recebida")`. Com a assinatura real, a 1.ª chamada devolve
**`REF_INVALIDA`** e a 2.ª devolve **`MOTIVO_INVALIDO`** — ambas falhariam em silêncio (fail-soft),
resultando num UTAC «verde» que não credita nada. **Executar a INTENÇÃO**, não a letra:
`ref` explícita por evento e `motivo: "indicacao"` (o único motivo de indicação da lista fechada).

### b) Onde os +50 pontos são REALMENTE creditados
```js
// _lib/fontes-lance.mjs:93  (NÃO em _lib/referral.mjs)
export async function creditarIndicacao(indicante, indicado, agora = new Date()) {
  ...
  const ref = `indicacao:${b}`;                                  // :105  → indicante
  await creditarPontosLance(a, PONTOS_INDICACAO, "indicacao", ref);
  await creditarPontosLance(b, PONTOS_INDICACAO, "indicacao", REF_INDICACAO_RECEBIDA); // :118 → indicado
}
```
Chamador único: `netlify/functions/referral.mjs:171` → `await creditarIndicacao(r.indicador, endereco)`
(**endereços reais**), dentro do ramo que passa o throttle de IP (`!ipGate.ok` ⇒ não credita).

**⚠️ DIVERGÊNCIA MEDIDA (enunciado §5 e §7-A1):** o enunciado diz que `_lib/referral.mjs` tem
`creditarIndicacao()` «com +50 pontos de lance». **É FALSO.** Em `_lib/referral.mjs` a função
equivalente é `registrarConversao` (:543) e credita **+1 senha on-chain** (via `concederBonus` :565 e
`creditarSenhas` :582) — e está **morta** (DEBT-025, endereços mascarados). `creditarIndicacao`
(que o enunciado situa em `_lib/referral.mjs`) vive em
`_lib/fontes-lance.mjs`.

⇒ **O ficheiro autorizado (§4) para creditar o ECOQUILDO (`_lib/referral.mjs`) é o ficheiro errado
para o efeito querido**: `registrarConversao` recebe endereços MASCARADOS no fluxo do app (endpoint
:160-163) ⇒ `creditarEcoQuildo` devolveria `ENDERECO_INVALIDO` e o ECOQUILDO nunca seria creditado.
Os dois ficheiros onde o ECOQUILDO funcionaria (`_lib/fontes-lance.mjs` e o endpoint `referral.mjs`)
**não estão na lista de autorizações.** ⇒ **CONFLITO 1 (abaixo) — PARAR e escalar (GATE 12 / AU3).**

### c) Textos «+1 senha» / «senhas» — os 3 sítios do enunciado (§5)
| # | ficheiro:linha | texto medido |
|---|---|---|
| B1 | `src/components/PainelIndicacao.jsx:87` | `🎯 Te convido para o DesafioGUT! Use meu código ${codigo} e, no seu 1º lance, nós dois ganhamos +1 senha.` |
| B1 | `src/components/PainelIndicacao.jsx:163` | `<strong> 1º lance, vocês dois ganham +1 senha! </strong>` |
| B1 | `src/components/PainelIndicacao.jsx:4,38,51,60,227` | campo/comentário `senhas_ganhas` (nome de campo da API — **não** renomear: o produtor é o endpoint, fora do escopo) |
| B2 | `src/components/ChatbotWidget.jsx:183` | `{stat("Senhas ganhas", indicacao?.senhas_ganhas)}` (única ocorrência de «senha» no ficheiro) |
| B3 | `_lib/referral.mjs:146` | `Parabéns! ${quem} entrou no DESAFIOGUT. +1 senha creditada!` |
| B3 | `_lib/referral.mjs:148` | `${n} amigos teus entraram hoje no DESAFIOGUT! +${n} senhas creditadas.` |

Confirmação pedida no §6.f: «Há 3 sítios com «+1 senha»» → **VERDADEIRO** (3 *ficheiros*; 4 linhas).
Controlo negativo feito: as restantes ocorrências de «senha» em `src/` são o **Passe Desafio** a ser
gasto/comprado (`CardLance.jsx`, `ComprarFichasModal.jsx`, `useTrocarPorSenhas.js`, `web3.js`), que
**não** são indicação e **não se tocam**.

### d) GUTO — texto actual
`_lib/guto-perfis.mjs:371-375` (`indique_e_ganhe`, 4 perfis: visitante/comum/corporativo/admin) — todos
dizem **«+50 pontos de lance»**; comentário :367-370 declara a pendência:
> «⚠️ PENDENTE: o Regulamento v5.0, Art. 51º, fala em 2 ECOQUILDO ao indicante e 1 ao indicado;
> esse crédito ainda não está ligado no backend — quando estiver, este texto muda com ele.»

Teste que **amarra** o texto: `_tests/utac110h1-guto-indicacao.test.mjs` — reprova qualquer resposta do
GUTO que mencione `ECOQUILDO` («promete ECOQUILDO (Art. 51º ainda não ligado)»). **FRENTE C obriga a
actualizar este teste** (está em `_tests/`, autorizado ✅).

### e) Pendências menores (§5/R18-110h.2-5)
| # | ficheiro:linha | texto medido |
|---|---|---|
| D1 | `src/pages/Privacidade.jsx:78` | «…podem adquirir produtos/**senhas** mediante…» |
| D1 | `src/pages/Privacidade.jsx:99` | «Histórico de compras de **senhas** e transações de pagamento PIX…» |
| D1 | `src/pages/Privacidade.jsx:108` | «…**saldo de senhas** e visualizações.» |
| D2 | `src/i18n/pt.js:100` | `"ativos.lance.aviso": "Projeção pela regra do **torneio**. …"` |
| D3 | `src/components/TermosConsentimento.jsx:164-169` | caixa de contacto com `📧 desafiogut01@gmail.com` **·** `📞 (92) 98428-5774` **·** `🌐 www.grupouniaoetrabalho.com.br` |

Nota D2: `pt.js:60-68` usa o prefixo **`ativos.torneio.*`** em chaves i18n (7 chaves) — **renomear a
chave** partiria os consumidores; o enunciado pede só o **valor** de `:100` («regra do torneio» →
«regra da competição»).

### f) Regulamento v5.0 — as fontes de verdade citadas
- **Art. 51º** (`docs/REGULAMENTO-v5.md:225`), verbatim:
  > «O utilizador cadastrado recebe 1 (um) ECOQUILDO de boas-vindas. Cada indicação de novo cadastro,
  > após confirmação, concede **2 (dois) ECOQUILDO ao indicante e 1 (um) ECOQUILDO ao indicado**.»
  ⇒ confirma R18-110h.2-1 ✅ (+1 de boas-vindas; o motivo `boas-vindas` já existe na lista fechada).
- **Art. 69º** (`docs/REGULAMENTO-v5.md:246`), verbatim:
  > «Dúvidas, informações e sugestões deverão ser encaminhadas **exclusivamente através do e-mail
  > desafiogut01@gmail.com**.» ⇒ base legal de D3 ✅ (só e-mail na caixa de contacto).

---

## -1.5 Disco
`df -h /c` → 15G disponíveis (94% usado) ⇒ **≥ 5 GB, SEGUIR** ✅

---

## -1.6 Conflitos e ambiguidades (AU3 / HARD GATE 12) — decisões do operador necessárias

> ⚠️ **CONFLITO 1 (BLOQUEIA a FRENTE A) — o ficheiro autorizado é o ficheiro errado.**
> O enunciado (§4) autoriza editar `_lib/referral.mjs` para «creditar ECOQUILDO» e (§7-A1) manda
> localizar aí o `creditarIndicacao` «que credita os +50 pontos». Medido: os +50 estão em
> `_lib/fontes-lance.mjs::creditarIndicacao` (chamado pelo endpoint `netlify/functions/referral.mjs:171`,
> com endereços **REAIS**); `_lib/referral.mjs::registrarConversao` recebe endereços **MASCARADOS**
> (endpoint :160-163) e o seu crédito de senha está **morto** (DEBT-025). Escrever o ECOQUILDO em
> `_lib/referral.mjs` produziria código **verde e inerte** (nunca credita no fluxo real).
> **Opções ao operador:**
> **(A)** autorizar `_lib/fontes-lance.mjs::creditarIndicacao` — o ECOQUILDO nasce junto dos +50, com
> endereços reais; 1 ficheiro fora da lista actual (**recomendada**);
> **(B)** autorizar o endpoint `netlify/functions/referral.mjs`, junto da chamada :171;
> **(C)** manter-se em `_lib/referral.mjs` como está escrito, **aceitando** que o crédito só corre pelo
> caminho `comprar-senhas.mjs` (DEBT-025 aberta) — fica inerte no app.

> ⚠️ **CONFLITO 2 (assinatura) — a letra do §7-A2 não corre.** `creditarEcoQuildo` exige 4.º argumento
> `ref` (idempotência) e `motivo` da lista fechada. Proposta: `ref = "eco-indicacao:<indicado>"` (indicante,
> 1× por par) e `ref = "eco-indicacao-recebida"` (indicado, 1× por vida — a carteira só pode ser indicada
> uma vez, `ja_indicado` ⇒ 409), `motivo = "indicacao"` nos dois. **Zero alterações a
> `_lib/eco-quildo.mjs`** (Ponytail/GATE 5).

> ⚠️ **CONFLITO 3 (limite mensal) — o enunciado não diz.** O indicante só recebe os +50 (+1 senha) até
> **10 indicações/mês** (`LIMITE_INDICACOES_MES`, e o GUTO diz «até 10 por mês»). Proposta: o ECOQUILDO
> ao **indicante** respeita o MESMO limite (só quando a conversão contou); o ECOQUILDO ao **indicado** é
> independente (como os +50 e a senha). Alternativa: ECOQUILDO sem limite.

> ℹ️ **CONFLITO 4 (lastro) — §7-A3 diz «+300 centavos à mão».** O módulo do 110e **proíbe** somar a
> reserva à mão: `reserva_rs_centavos` é **derivada** em `aplicarLastro`. Proposta: chamar
> `registarEmissaoNoLastro(3)` por indicação creditada (2+1) — o resultado é `+3` emitido e `+300`
> centavos, como o enunciado quer, mas por derivação. (Ponytail: reutilizar o 110e.)

> ℹ️ **Divergência menor (B3/D1–D3):** o prefixo i18n `ativos.torneio.*` (7 chaves, `pt.js:60-68`)
> **não** se renomeia (partiria os consumidores); muda só o valor de `:100`. O campo de API
> `senhas_ganhas` (endpoint, fora do escopo) **não** se renomeia; mudam os rótulos/textos visíveis.

---

## -1.7 Veredito

**VEREDITO: PARAR** (AJUSTAR→BLOQUEADO na FRENTE A) — aguarda decisão do operador sobre o CONFLITO 1.

- SEG-1 completo: baseline confirmado (3f5aac6 · 1077/1077 · 1232/1238), RAM A14 ✅ (1943-1960 MB),
  disco ✅, inventário feito, 3 sítios confirmados, Art. 51º e 69º lidos.
- **FRENTES B, C, D** (3 sítios «+1 senha», GUTO, pendências menores): **sem ambiguidade material**,
  todos os alvos autorizados — podem executar-se assim que a FRENTE A (a primeira na ordem, GATE 6)
  for desbloqueada.
- **FRENTE A**: bloqueada pelo CONFLITO 1 (ficheiro autorizado ≠ ficheiro funcional) — HARD GATE 12 /
  R20 / ressalva §15 («se a assinatura esperada não existir → PARAR e reportar»).
