# UTAC110h.3 — SEG-1 · MEDIÇÃO
> Resolver as 6 pendências do 110h.2 (P1–P5) + o teste de comportamento do `Boot.jsx` (F). P6 = verificação do operador.
> **Nada foi alterado neste segmento** (só leitura + medição) — **com uma excepção declarada**: as 20
> substituições mecânicas do **P3 (Frente C)** foram aplicadas ainda dentro do inventário, depois de
> classificada cada ocorrência (§-1.3, tabela do P3). HARD GATES 1, 2, 3, 12.

---

## -1.1 Estado do repo

| item | medido | enunciado | desvio |
|---|---|---|---|
| `git rev-parse HEAD` | `9117402975762dd140040049375deb6112fe3995` | `9117402` | **nenhum** ✅ |
| `git status --porcelain` | 6 `M` pré-existentes (`.agents/skills/aidesigner-frontend/*` ×3, `.gitignore`, `.mcp.json`, `desafio-gut/frontend/package-lock.json`) + `?? _logs/UTAC106x.2.spec.yml` (+ `_logs/MC100_*`/`MC101_*`/`MC102_*` pré-existentes) | «limpo (ou só pré-existentes)» | **pré-existentes** ✅ |
| Suíte frontend | **1092/1092 pass** | 1092/1092 | nenhum ✅ |
| Suíte backend | **1247/1253 pass** | 1247/1253 | nenhum ✅ |

Comando: `cd C:/Users/Moltbot/Desktop/DESAFIOGUT && node scripts/mc966-suite-harness.mjs ambos`.

### -1.1.b RAM (A14) — 3 medições + trim
| momento | leitura |
|---|---|
| **antes (3×)** | **1475 · 1458 · 1463 MB** → **ABAIXO do limiar de 1500** ⚠️ |
| `scripts/liberar-ram.ps1` | pico **2269 MB** (fechados 6 `msedgewebview2` não-preservadas; `trimmed=66`; INICIO_FreeMB=1669) |
| **portão (3× a seguir ao trim)** | **2154 · 2148 · 2123 MB** ⇒ **3/3 ≥ 1500 MB, portão cumprido** ✅ |

Máquina de 5877 MB. Nenhuma app do utilizador foi fechada (o script preserva a árvore do WhatsApp e os browsers com janela).

### -1.1.c Disco
`df -h /c` → 238G total, 223G usados, **15G disponíveis (94%)** ⇒ ≥ 5 GB ✅.

---

## -1.2 Existência dos caminhos nomeados

| caminho | medido |
|---|---|
| `netlify/functions/ler-pontos.mjs` | **existe** — 101 linhas (P1) |
| `src/components/PainelIndicacao.jsx` | **existe** (P1) |
| `netlify/functions/_lib/referral.mjs` | **existe** — 670 linhas (P2/P5) |
| `netlify/functions/_lib/contract.mjs` | **existe** — 308 linhas; `creditarSenhas` em :177 (P5) |
| `netlify/functions/referral.mjs` (endpoint) | **existe** — 246 linhas (P5, **é aqui que o bug vive**) |
| `src/pages/Privacidade.jsx` | **existe** (P4) |
| `src/Boot.jsx` | **existe** (F) |
| `src/components/meus-ativos/{FeedbackLance,PainelTorneio,ProgressoBonus,_estilo}.jsx/js`, `src/hooks/useFeedback.js`, `src/i18n/pt.js` | **existem** (P3) |

---

## -1.3 Inventário por frente

### P1 — contador de recompensa na UI
- **`PainelIndicacao.jsx`**: o painel consome **só** `GET /referral?acao=meu-codigo` (`total_indicados`, `total_convertidos`, `senhas_ganhas`, `codigo`) e **não** tem nenhum contador mensal. O 3.º card mostra hoje a recompensa **em texto** («+50 pontos de lance e +2 ECOQUILDO», do 110h.2) — foi essa a decisão DEBT-028.
- **`ler-pontos.mjs`** devolve (linha 80-100): `ok, pontos, pontosCartao, bonusPalpite, pontosParaCartao, podeResgatarCartao, historico, fidelidade{total,historico}, lance{creditos,pontos,historico}, missoesHoje{dia,loginFeito,lanceFeito,pontosHoje}, palpites[]`. **Não há contador de indicações** — nem aqui nem no endpoint de referral.
- **Fonte já existente (Ponytail):** o ledger de pontos de lance guarda, no histórico, as entradas da indicação com `motivo: "indicacao"` e `ref: "indicacao:<indicado>"` — é **exactamente** o que `creditarIndicacao` (`_lib/fontes-lance.mjs:108-110`) conta para aplicar o limite mensal (`noMes`). O contador pode ser **derivado do registo já lido** por `ler-pontos` (`lerPontos` faz `select("*")`, que traz `historico_lance`) — **sem leitura nova**, o mesmo padrão do `missoesDoRegisto` do UTAC110g.

### P2 — vocabulário do relatório admin
- Ocorrências de «Senhas creditadas» (texto): **1** — `_lib/referral.mjs:266` (dentro de `gerarRelatorioIndicacoes`, relatório **admin**, não visível ao utilizador).
- Campo `senhasCreditadas` (chave da resposta): `_lib/referral.mjs:243, 271` + consumidor `notificacoes.mjs:163` + comentários `:229, :232, :241`.
- Teste que amarra o campo: `_tests/test-conversao-e2e-mc1581.mjs:102` → `assert.equal(rel.senhasCreditadas, 4)`. **Não asserta o rótulo** ⇒ mudar o texto não o quebra.
- Também há `useTrocarPorSenhas.js:72` («✓ N senhas creditadas on-chain») — **é do Passe/on-chain a sério, não do relatório de indicações** ⇒ **não se toca** (contexto diferente).

### P3 — «torneio» (classificação completa, fonte sem testes)
| classe | sítios | acção |
|---|---|---|
| **COMENTÁRIO / log interno** (vocabulário) | `exportar-dados.mjs:18` · `fila-processor-scheduled.mjs:16,28` · `pontuacao.mjs:19` · `_lib/bonus-emissao.mjs:1` · `_lib/consolidacao.mjs:143,170` · `_lib/pontuacao-store.mjs:1,111` · `_lib/pontuacao-utils.mjs:1,24` · `_lib/worker-bonus.mjs:5` · `src/pages/MeusAtivos.jsx:73,178` · `src/pages/MercadoLances.jsx:345` · `src/hooks/useFeedback.js:25` · `_lib/../meus-ativos/_estilo.js:1` · `_lib/../meus-ativos/FeedbackLance.jsx:4,11` · `_lib/../meus-ativos/PainelTorneio.jsx:4` | **20 substituições aplicadas, 20/20 âncoras casaram 1×** (13 ficheiros de produção) — script com verificação de contagem exacta por âncora; `git diff --stat` confere |
| **CHAVE de configuração/API** | `_lib/recursos-app-config.mjs:29` (`isTorneioVisivel`) · `src/hooks/useRecursosApp.js:34` | **NÃO TOCAR** (HI9 / R18-110h.3-3) |
| **CHAVE de i18n** | `src/i18n/pt.js:60-68` (`ativos.torneio.*`, 7 chaves) | **NÃO TOCAR** (R18-110h.3-3: «as chaves podem ficar»); os **valores** já dizem «Competição» (110h.1) |
| **IDENTIFICADOR de código/ficheiro** | `PainelTorneio.jsx` (componente + `import` em `MeusAtivos.jsx:12,188` + referências em `ProgressoBonus.jsx:15,93`) · `data-secao="painel-torneio"` | **NÃO TOCAR** (renomear partiria consumidores/testes) |
| **ANOTAÇÃO HISTÓRICA** (registam o termo ANTIGO) | `_lib/guto-perfis.mjs:84,109,200` («saíram «torneio» e «senhas»»; «ANTIGO — «torneio de habilidade»…») | **KEEP** — apagar seria apagar a prova do que saiu (doutrina «manter à vista») — **declarado** |
| **ficheiros de teste** (comentários/mensagens) | `_tests/mc93*.mjs`, `mc942-*`, `mc93c-*`, `mc93d-*` | **NÃO TOCAR** (GATE 15: não reescrever testes de UTACs fechados por cosmética) — **declarado** |

### P4 — data da Privacidade
- `src/pages/Privacidade.jsx:45` → `Última atualização: 15 de agosto de 2026` (formato longo «15 de agosto de 2026»). A linha `:288` fala da data em abstracto («a data da última atualização é indicada no início») — **não se toca**.

### P5 — o bug dos endereços mascarados (DEBT-025)
- **Onde o bug vive:** `netlify/functions/referral.mjs:160-163` — o **endpoint** chama
  `registrarConversao({ codigo, indicador: mascararEndereco(r.indicador), indicado: mascararEndereco(endereco) }, …)`.
  O mascaramento foi introduzido pelo commit `0ec7d13` («fix(security): … P3 logs mascarados») e **devia ter ficado só no log** (a linha 158 usa `mascararEndereco` para LOGAR, o que está certo).
- **O que quebra (cadeia medida):** `_lib/referral.mjs:565` → `concederBonus(indicador)` → teste `/^0x[a-f0-9]{40}$/` (:466) → **`endereco_invalido`** → `registrarConversao` faz `return bonus` **antes** de marcar convertido ⇒ (a) **nunca credita a senha on-chain** (a `creditarSenhas` nem chega a ser chamada), (b) **nunca grava o marcador** `referral-convertido:{codigo}:{indicado}` nesse caminho, (c) **nunca grava** o log `conversao` nem a indução agrupada do GUTO nesse caminho.
- **`_lib/contract.mjs::creditarSenhas(endereco, qtd)`** (:177): exige `getInstance()` + `verificarCoordenacao()` (a wallet tem de ser coordenação) e envia `adicionarSenhas` com retry de nonce + verificação de receipt. **Não valida o endereço** — o defeito está só no **argumento mascarado** que lhe chega. ⇒ **o contrato NÃO precisa de ser tocado** (a autorização «se necessário» não é necessária).
- **Caminho que NÃO está partido:** `comprar-senhas.mjs:353` chama `registrarConversao(vinculo, …)` com o vínculo **real** (vem de `buscarVinculoPorIndicado`, que lê o blob com os endereços verdadeiros) ⇒ o bónus on-chain **já funciona** quando o indicado compra uma senha. O que está morto é o caminho do **registo** (o caso normal).
- **Custo:** com o bug corrigido, **cada indicação confirmada** passa a gastar **2 transacções reais** (`creditarSenhas` ao indicador + ao indicado) na **Ethereum MAINNET** (activa desde o MC60), pagas pela carteira de coordenação. Não é medível sem transaccionar (proibido) ⇒ **flag ao operador** (§-1.6, conflito 2).
- **Mockável?** Sim: os testes do 110f/110h.2 já injectam `../_lib/contract.mjs` como duplo (`creditarSenhas` espiado) ⇒ a Frente E testa-se **sem gas real** ✅ (nenhum teste toca a rede).

### F — `Boot.jsx`
- Faz: decide se mostra o **gate LGPD** (`TermosConsentimento`) ou carrega a app; lê o consentimento **sincronamente** no 1.º render (`consentimentoJaAceito()` → `localStorage` e depois `sessionStorage`, exigindo `aceito && versao === VERSAO_CONSENTIMENTO`); carrega o Sentry em `requestIdleCallback` **só depois** de a app arrancar; e entrega o resto ao `lazy(() => import("./PrivyRoot.jsx"))` dentro de um `Suspense`.
- **Testes hoje: nenhum de comportamento** — o único ficheiro que toca `Boot`/`TermosConsentimento` é `src/components/__tests__/citacoesRegulamento.test.mjs` (e esse valida **texto de citações**, não o arranque). Confirma a pendência do 110h.1 (X7).

---

## -1.6 Conflitos e ambiguidades (AU3 / GATE 12)

> ⚠️ **CONFLITO 1 (declarado, executado — não bloqueia) — o ficheiro do P5 no enunciado é o errado.**
> A §4 autoriza editar `_lib/referral.mjs` «(P5 — corrigir endereços mascarados)». **Medido:** o
> `_lib/referral.mjs` **não mascara nada** — recebe o que lhe dão. O mascaramento está no **chamador**,
> `netlify/functions/referral.mjs:160-163` (endpoint). Não existe forma de corrigir o bug sem tocar no
> endpoint. Como o **R18-110h.3-5** ordena explicitamente «corrigir o bug dos endereços mascarados
> (reactiva o bónus on-chain)», executa-se a **intenção** no sítio correcto (endpoint), tocando-se também
> `_lib/referral.mjs` apenas onde o enunciado manda (vocabulário do P2). **Desvio registado no R14.**
> Precedente: R18-110h.2-A (mesma família de erro de atribuição de ficheiro).

> ⚠️ **CONFLITO 2 (flag de custo — o operador tem de confirmar) — P5 reactiva gas REAL em mainnet.**
> Com o mascaramento corrigido, cada indicação confirmada passa a submeter **2 transacções** reais
> (`adicionarSenhas` ao indicador e ao indicado) na Ethereum mainnet, pagas pela coordenação. A §11-E4
> manda **PARAR e reportar** «se o custo for significativo». Não posso medir o custo sem transaccionar
> (e é proibido) ⇒ **NÃO PARO a frente** (o R18-110h.3-5 já decidiu reactivar), mas **registro o
> alerta**: o gas por indicação passa a ser um custo variável recorrente, e o `comprar-senhas` já o pagava
> noutro caminho. Se o operador quiser limitar o gasto, as opções são um tecto mensal, um lote (batch) ou
> manter o bónus só no caminho `comprar-senhas` — **decisão dele, não minha** (GATE 12).

> ℹ️ **CONFLITO 3 (menor) — P2: o número conta «senhas on-chain», não pontos.**
> O `senhasCreditadas` do relatório conta os créditos on-chain (+1 indicado, +1 indicador por conversão).
> Como o P5 os torna **reais**, chamar-lhe «Pontos de fidelidade creditados» seria **falso**.
> Escolha: **«Recompensas on-chain creditadas»** (verdadeiro, tira o vocabulário legado do texto e mantém
> o número, o campo e a aritmética). O campo `senhasCreditadas` **fica** (é chave da resposta, consumida
> por `notificacoes.mjs` e amarrada por teste próprio — HI9 não se toca em chaves).

---

## -1.7 Veredito

**VEREDITO: SEGUIR** — 7 frentes exequíveis com as autorizações dadas, com **1 desvio declarado**
(CONFLITO 1: corrigir o P5 no **endpoint**, onde o bug vive) e **1 flag ao operador** (CONFLITO 2: gas
real recorrente em mainnet). O contrato on-chain **não** precisa de ser tocado (medido: `creditarSenhas`
não valida endereços — o defeito é só do argumento mascarado).

Riscos mapeados: P1 → o painel passa a fazer **2 pedidos** em paralelo (`/referral` + `/ler-pontos`) na
Carteira; P3 → 20 substituições em comentários, com as chaves/identificadores/históricos declarados
intocados; F → o teste de comportamento do `Boot` tem de arrancar o Vite (arnês `_servidor-teste`) e correr
os 3 estados (sem storage / aceite na versão corrente / aceite numa versão antiga).
